# GitHub Copilot Instructions for Nextbone Demo

## Purpose
These instructions guide Copilot to work specifically within the `demo/` app of the Nextbone repo. The demo is a Vite + TypeScript + Lit app showcasing Nextbone examples.

## Demo Architecture
- Entry: `demo/index.html` loads `src/app.ts` which defines `<nextbone-demo-app>`.
- App shell: `src/app.ts`
  - Sidebar lists examples, hash routing (`#/<exampleId>`) swaps the main view.
- Examples live in `src/examples/<name>/`
  - Model and/or Collection in separate files from the component view.
  - View is a LitElement wrapped with `view()` from Nextbone and uses `@state` for reactive models/collections.

## Coding Standards
- Language: TypeScript (ES modules).
- Decorators: enabled (experimentalDecorators true).
- Use Lit for components, Nextbone for state.
- Keep models/collections strongly typed via Nextbone generics.
- Do not import with `.ts` extensions when importing within the demo code (bundler resolves automatically).
- Keep public APIs minimal; prefer small, focused examples.

## Patterns to Follow
- Folder layout for a new example `foo`:
  - `src/examples/foo/foo-model.ts` (and/or `foo-collection.ts` as needed)
  - `src/examples/foo/foo-view.ts` (register custom element, e.g., `demo-foo-view`)
- In `foo-view.ts`:
  - `export class DemoFooView extends view(LitElement)`
  - Use `@state model = new FooModel()` (and/or `@state collection = new FooCollection()`)
  - If listening to events, you can use `this.listenTo(obj, 'all', cb)` inside `connectedCallback()` and call `this.stopListening()` in `disconnectedCallback()`.
  - If TS complains about `listenTo/stopListening`, add method declarations:
    ```ts
    declare listenTo: (object: any, events: string, callback: Function) => this;
    declare stopListening: (object?: any, events?: string, callback?: Function) => this;
    ```
- Wire the new example into the sidebar:
  - Import the view in `src/app.ts` (no `.ts` suffix): `import './examples/foo/foo-view'`
  - Add to `EXAMPLES` list: `{ id: 'foo', label: 'Foo', tag: 'demo-foo-view' }`
  - In `renderMain()`, render via a conditional (keep it simple; no dynamic tag directive required).

## Testing & Running
- Type-check the demo:
  - From repo root: `npx tsc -p demo/tsconfig.json --noEmit`
- Run the demo locally:
  - From repo root: `npm run demo:start`
  - Open the served URL (default http://localhost:5173).

## Do/Don’t
- Do keep examples small, clear, and self-contained.
- Do separate data (Model/Collection) from view components.
- Do use `@state` with Nextbone instances so Lit updates automatically.
- Don’t modify library source (`nextbone.js`, etc.) when changing the demo.
- Don’t introduce additional build steps for the demo; use Vite in dev mode.

## Example Snippets
- Counter view increment (safe with strict null checks):
  ```ts
  private onInc = () => this.model.set('count', (this.model.get('count') ?? 0) + 1);
  ```
- Collection max id (typed):
  ```ts
  const maxId = this.people.reduce<number>((max: number, m: PersonModel) => {
    const id = (m.get('id') ?? 0) as number;
    return id > max ? id : max;
  }, 0);
  ```

## PR Expectations
- Keep scope limited to `demo/` unless otherwise requested.
- If adding an example, update `src/app.ts` and include a brief note in `demo/README.md`.
