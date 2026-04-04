---
outline: deep
---

# Schema Validation Alternatives

This document captures the two alternative designs that were evaluated for nested Zod validation support in `schema.js`, but not selected for the current implementation.

The current implementation keeps the public contract flat, validates the real nested object, and maps Zod issue paths back to dot-path keys such as `person.address.street`. The alternatives below describe the other viable directions and the tradeoffs attached to each one.

## Alternative 1: Return genuinely nested error objects

### Summary

Instead of returning a flat error object like this:

```js
{
  'person.name': 'Name is required',
  'person.address.street': 'Street is required'
}
```

the schema mixin would preserve the original nested structure and return errors like this:

```js
{
  person: {
    name: 'Name is required',
    address: {
      street: 'Street is required'
    }
  }
}
```

### How it would work

The implementation would validate the entire nested model object once with Zod and then rebuild a nested error tree from each `issue.path` array.

The rest of the validation pipeline would need to become nested-aware as well:

- `validationError` would store a nested object.
- `validated` and `invalid` event consumers would receive a nested error structure.
- `options.invalid(attr, message, model)` would no longer map cleanly to a single flat key unless it were redesigned.
- `isValid` and `preValidate` would need nested path lookups instead of direct key checks.

### Pros

- The error shape matches the shape of the validated data, which is easier to reason about for nested forms and nested model editors.
- It aligns naturally with Zod's own path-based error model, since there is no lossy conversion into flat strings.
- Consumers that already work with nested UI state could bind errors directly without re-expanding dot paths.
- Object-level validation becomes more expressive because parent objects can hold their own errors without competing with descendant dot-path keys.
- It is a cleaner conceptual model for future features such as grouped error summaries, nested touched state, or tree-based form rendering.

### Cons

- It is a breaking API change for `validationError`, which currently behaves like a flat object keyed by dot paths.
- Existing consumers of `invalid` and `validated` events would need to change if they expect flat keys.
- `options.invalid(attr, message, model)` becomes awkward because there may no longer be a single string key or a single leaf-level message for the requested attribute.
- `isValid('person.address.street')` and `preValidate('person.address.street', value)` would require additional traversal helpers anyway, so the change does not actually remove all path-handling complexity.
- Mixed cases such as object-level refinements plus leaf-level field errors become harder to normalize for callers that want one consistent error access pattern.

### Compatibility impact

This option would be the most disruptive one.

The following surfaces would change materially:

- `model.validationError`
- return values from `validate`
- payloads passed to `invalid` listeners
- callback behavior for `options.invalid`
- any external code using dot-path lookups such as `errors['person.address.street']`

### When this option makes sense

This is the right direction if the library decides that nested object validation should be a first-class API and backward compatibility with the flat error contract is no longer a hard requirement.

It is especially attractive if future work includes richer nested form primitives or view helpers that expect error trees rather than flat maps.

## Alternative 2: Keep top-level callbacks only and validate the whole object once

### Summary

This option would still validate the full nested object with Zod in one pass, but it would stop trying to expose nested paths in the callback layer.

Validation would effectively remain top-level from the public API point of view. Nested failures such as `person.address.street` would be treated as failures of `person`, and the callback layer would only report `person` as invalid.

### How it would work

The model would call `schema.safeParse` on the entire object and then use Zod issues only to determine whether a top-level attribute is valid or invalid.

A nested issue like `['person', 'address', 'street']` would be reduced to the top-level key `person` for callback dispatch. The implementation would likely keep a flat or semi-flat `validationError`, but callbacks and attribute filtering would remain top-level only.

In practice:

- `validate` would become simpler because there would be one full-object validation pass.
- `options.valid` and `options.invalid` would only receive top-level attributes.
- nested path requests like `person.address.street` would not be supported as first-class validation targets.

### Pros

- The implementation is simpler than full nested-path support because validation happens once and callback dispatch only needs top-level grouping.
- It avoids deep schema-path introspection and most of the path filtering logic.
- It preserves a familiar Backbone-style mental model where validation is centered on top-level model attributes.
- It is easier to reason about for models whose nested objects are treated as opaque blobs rather than editable sub-fields.
- It avoids a breaking change to the overall flat error contract if the returned error object remains keyed by flattened paths.

### Cons

- It loses useful nested-path behavior such as `preValidate('person.address.street', value)`.
- It also loses precise `isValid('person.address.street')` semantics, which makes nested field-level checks much less useful in forms.
- `options.attributes` can no longer target nested paths in a meaningful way.
- `options.valid` and `options.invalid` callbacks become too coarse for views that update nested fields independently.
- It creates a mismatch between the precision of Zod issue paths and the reduced precision of the public callback API.
- It would still leave consumers doing extra work if they need field-level feedback for nested editors.

### Compatibility impact

This option is less disruptive than nested error trees, but it still changes expectations for nested validation behavior.

The main compatibility risk is semantic rather than structural:

- callers may expect nested path callbacks once nested validation exists
- callers cannot target nested fields through `isValid`, `preValidate`, or `options.attributes`
- nested forms would need additional custom logic outside the schema mixin

### When this option makes sense

This is a reasonable choice if the goal is only to simplify the schema implementation and keep nested validation as an internal correctness improvement, not as a field-level API.

It fits codebases where nested objects are validated as a unit and not edited incrementally by field-specific UI bindings.

## Comparison

### Alternative 1: nested error objects

- Best conceptual model for nested data.
- Best long-term fit for tree-shaped form APIs.
- Highest implementation and migration cost.
- Breaking change for current flat consumers.

### Alternative 2: top-level callbacks only

- Simplest internal model.
- Lowest implementation cost among the non-selected options.
- Preserves more of the existing top-level validation contract.
- Too limited for nested field workflows.

## Why they were not selected

The current direction was chosen because it preserves the flat public contract while still adding real nested-path support.

That gives the library most of the practical benefits of nested validation without forcing a breaking migration and without reducing nested validation back down to top-level-only semantics.
