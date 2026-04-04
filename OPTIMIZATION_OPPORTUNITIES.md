# Schema Validation — Optimization Opportunities

## Context

The most common validation call site is in `form.js` (`inputEventHandler`):

```js
const modelErrors = model.validate(model.attributes, { attributes: [prop] });
```

This fires on **every input event** (keystroke / change) for form-bound inputs. Performance here directly impacts UI responsiveness.

---

## Current Code Path: `validate(model.attributes, { attributes: ['firstName'] })`

When called from `form.js`, the `validate()` method executes these steps:

| # | Code | Operation | Allocations |
|---|------|-----------|-------------|
| 1 | `getSchema(this.constructor)` | Cached schema lookup | none |
| 2 | `extend({}, defaultOptions, setOptions)` | Merge options | 1 object |
| 3 | `getValidationPaths(model, attrs, ['firstName'], schema)` | Returns `['firstName'].slice()` (fast: hits first branch) | 1 array (1 element) |
| 4 | `getDefaultAttrs(['firstName'], schema)` | Creates `{ firstName: undefined }` via Set + reduce | 1 Set, 1 object |
| 5 | `extend({}, getDefaultAttrs(...), model.attributes, attrs)` | Shallow-merges all model attributes — **attrs === model.attributes**, so merges twice | 1 object (N keys) |
| 6 | **`schema.safeParse(allAttrs)`** | **Full Zod schema parse of ALL fields** | Zod internals |
| 7 | `formatZodErrors(result.error)` | Formats errors if any | 1 object (if errors) |
| 8 | `pickMatchingErrors(allErrors, ['firstName'])` | Filters to related paths | 1 object |
| 9 | `getMatchingError(invalidAttrs, 'firstName')` | Finds error message for callbacks | none |
| 10 | `model.trigger('validated', ...)` | Event emission | event args |

**The dominant cost is step 6** — Zod parses _every_ field in the schema even though `attributes: ['firstName']` means we only care about one field's errors. Everything else is sub-microsecond overhead.

---

## Optimization Opportunity 1: Fast-Path Single-Field Validation in `validate()`

**Impact: HIGH** — eliminates full-schema parse for the most common call pattern.

### Problem

`preValidate()` already has a fast path (`validateAttrFast`) that validates a single top-level field via `shape[attr].safeParse(value)` when the schema has no object-level refinements. But `validate()` — the method actually called by `form.js` — always does `schema.safeParse(allAttrs)`.

### Proposed Change

When all conditions are met:
- `opt.attributes` has exactly 1 entry
- That entry is a top-level key (no dots)
- `isSimpleObjectSchema(schema)` is true (no refinements/superRefine)
- Default callbacks are used (`valid` and `invalid` are `Function.prototype`)

Then call `shape[attr].safeParse(attrs[attr])` instead of `schema.safeParse(allAttrs)`.

```js
// Inside validate(), after computing requestedPaths:
if (
  requestedPaths.length === 1 &&
  !requestedPaths[0].includes('.') &&
  isSimpleObjectSchema(schema) &&
  opt.valid === Function.prototype &&
  opt.invalid === Function.prototype
) {
  var attr = requestedPaths[0];
  var error = validateAttrFast(attr, (attrs || model.attributes)[attr], schema);
  var result = error ? { [attr]: error } : null;
  model.trigger('validated', model, result, setOptions);
  return result || undefined;
}
```

### Estimated Impact

Based on benchmarks of the existing `preValidate` fast path vs full parse:
- Valid model: ~3µs → ~0.7µs (**~4x faster**)
- Invalid model: ~24µs → ~18µs (**~25% faster**, Zod error creation dominates)

### Caveats

- Cannot be used when `valid`/`invalid` callbacks are provided (they expect to be called for each path, and skipping breaks the contract)
- Cannot be used with schemas that have `.refine()`, `.superRefine()`, or `.transform()` at the object level
- The `form.js` call site never passes callbacks, so it always qualifies

---

## Optimization Opportunity 2: Use `preValidate` from `form.js` Instead of `validate`

**Impact: HIGH** — avoids all the ceremony of `validate()` (callbacks, events, path matching).

### Problem

`form.js` calls `model.validate()` but doesn't use any of the features unique to `validate()`:
- It doesn't pass `valid`/`invalid` callbacks
- It ignores the `validated` event
- It only cares about the returned error object

This means `form.js` could call `preValidate()` instead, which already has the fast path.

### Proposed Change

In `form.js`, `inputEventHandler`:

```js
// Before:
const modelErrors = model.validate(model.attributes, { attributes: [prop] });

// After:
const modelErrors = model.preValidate
  ? model.preValidate({ [prop]: getPath(model.attributes, prop) })
  : model.validate(model.attributes, { attributes: [prop] });
```

Or, if `preValidate` always exists on schema models:

```js
const modelErrors = model.preValidate({ [prop]: getPath(model.attributes, prop) });
```

### Estimated Impact

- For simple schemas (most forms): **4-30x faster** per keystroke depending on valid/invalid
- Eliminates: `extend` for options, `getValidationPaths`, `getDefaultAttrs`, `trigger('validated')`, `pickMatchingErrors`, `getMatchingError`, `hasMatchingPaths`

### Caveats

- `preValidate` returns `undefined` when valid, `validate` returns `undefined` when valid — compatible
- `preValidate` returns error object when invalid — compatible with `form.js`'s `isPlainObject(modelErrors)` check
- `form.js` should handle models that don't have `preValidate` (i.e., not using `withSchema`)
- `validate()` would need to be called separately if someone listens to the `validated` event in conjunction with form state

---

## Optimization Opportunity 3: Avoid Redundant Object Spread When `attrs === model.attributes`

**Impact: LOW-MEDIUM** — reduces allocations on every call.

### Problem

In the `form.js` call pattern, `attrs` is literally `model.attributes`:

```js
model.validate(model.attributes, { attributes: [prop] })
```

Inside `validate()`:
```js
allAttrs = extend({}, getDefaultAttrs(opt.attributes, schema), model.attributes, attrs);
```

This merges `model.attributes` twice (since `attrs === model.attributes`). It also creates a `getDefaultAttrs` object that's immediately overwritten by the model's actual attributes.

### Proposed Change

Detect `attrs === model.attributes` or `!attrs` and skip the merge:

```js
var allAttrs = attrs === model.attributes
  ? extend({}, model.attributes)
  : extend({}, getDefaultAttrs(opt.attributes, schema), model.attributes, attrs);
```

Or even more aggressively — when `attrs` is present and `opt.attributes` restricts to specific paths, we don't need default attrs at all.

### Estimated Impact

Saves 1 intermediate object allocation + N property copies per call. Marginal improvement (~0.1-0.3µs) but multiplied by every keystroke.

---

## Optimization Opportunity 4: Cache `isSimpleObjectSchema` Result

**Impact: LOW** — avoids re-checking `_def.checks` on every call.

### Problem

`isSimpleObjectSchema(schema)` is called on every `preValidate()` and could be called on every `validate()` if Opportunity 1 is implemented. The schema doesn't change between calls.

### Proposed Change

Cache the result alongside the schema:

```js
const getSchema = (ctor) => {
  if (ctor.hasOwnProperty('__schemaInstance')) {
    return ctor.__schemaInstance;
  }
  var schema = ctor.schema;
  if (schema) {
    schema.__isSimple = isSimpleObjectSchema(schema);
  }
  return (ctor.__schemaInstance = schema);
};
```

Then replace `isSimpleObjectSchema(schema)` with `schema.__isSimple`.

### Estimated Impact

Negligible per-call savings (~0.05µs), but establishes a pattern for caching more schema metadata.

---

## Optimization Opportunity 5: Avoid `requestedPaths.slice()` When Not Mutated

**Impact: NEGLIGIBLE** — micro-optimization.

### Problem

```js
var getValidationPaths = function (model, attrs, requestedPaths, schema) {
  if (requestedPaths && requestedPaths.length) {
    return requestedPaths.slice();  // defensive copy
  }
  ...
};
```

The returned array is never mutated by any caller. The `.slice()` is a defensive copy that creates garbage.

### Proposed Change

Return the array directly:

```js
return requestedPaths;
```

### Estimated Impact

Saves one array allocation per call. Negligible but zero-cost to implement.

---

## Optimization Opportunity 6: Skip `trigger('validated')` When No Listeners

**Impact: LOW-MEDIUM** — avoids event dispatch overhead on the hot path.

### Problem

`model.trigger('validated', model, reportedErrors, setOptions)` runs on every `validate()` call. In the `form.js` use case, nothing listens for this event — the form state manages its own error tracking.

### Proposed Change

Option A — check for listeners before triggering:
```js
if (model._events && model._events.validated) {
  model.trigger('validated', model, reportedErrors, setOptions);
}
```

Option B — make `validate()` accept an option to skip events:
```js
if (!opt.silent) {
  model.trigger('validated', model, reportedErrors, setOptions);
}
```

Option C — use `preValidate` from form.js (Opportunity 2) which never triggers events.

### Estimated Impact

`trigger()` with no listeners is already fast (~0.1µs) due to the early return in the Events mixin. But avoiding the function call overhead and argument creation has marginal benefit at scale.

---

## Summary: Recommended Priority

| # | Opportunity | Impact | Effort | Risk |
|---|-----------|--------|--------|------|
| 2 | Use `preValidate` from `form.js` | **HIGH** | Low | Low — behavior is equivalent for the form.js use case |
| 1 | Fast-path single-field in `validate()` | **HIGH** | Medium | Medium — must preserve callback/event contracts |
| 3 | Avoid redundant spread | **LOW-MEDIUM** | Low | None |
| 6 | Skip trigger when no listeners | **LOW-MEDIUM** | Low | Low |
| 4 | Cache `isSimpleObjectSchema` | **LOW** | Low | None |
| 5 | Skip `.slice()` on requestedPaths | **NEGLIGIBLE** | Trivial | None |

**Recommendation:** Start with Opportunity 2 (switch `form.js` to use `preValidate`). It's the lowest-risk, highest-impact change and requires no modifications to `schema.js`. If broader `validate()` performance is needed (e.g., for `model.set({...}, { validate: true })` paths), then implement Opportunity 1.
