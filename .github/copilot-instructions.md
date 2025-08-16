# GitHub Copilot Instructions for Nextbone

## Project Overview
Nextbone is a modern ES6 conversion of Backbone.js that integrates seamlessly with Web Components, particularly LitElement. It maintains Backbone's familiar patterns while adding decorator support and reactive state management.

## Core Architecture

### Module Structure
- **nextbone.js**: Main library containing Model, Collection, Events, Router, and View utilities (~2400 lines)
- **Modular addons**: `computed.js`, `form.js`, `validation.js`, `localstorage.js`, `virtualcollection.js`, `class-utils.js`
- **Types**: Auto-generated TypeScript definitions in `types/` from JSDoc comments except nextbone.d.ts

### Key Patterns

#### Web Components Integration
Use the `view()` mixin/decorator to integrate Nextbone models/collections with Web Components:

```javascript
// Function style
class TaskView extends view(LitElement) {
  static states = { tasks: {} }

  tasks = new Collection()
}

// Decorator style  
@view
class TaskView extends LitElement {
  @state model = new Model({ count: 0 })
}
```

##### State Management

Ways to automatically triggers component updates when Nextbone models/collections change:
- `@state` decorator 
- Use Lit `@property` with `type` set to Model / Collection: `property({ type: Collection })` or `property({ type: Model })`
- Use `states` static property: `static states = {model: {}}`

##### Event Handling
- `@eventHandler('click', '#selector')` decorator: Declarative DOM event binding

#### Computed Fields
Decorate Model with withComputed mixin/decorator and define reactive computed properties using dependency arrays:
```javascript
class UserModel extends withComputed(Model) {
  static computed = {
    fullName: ['firstName', 'lastName', (fields) => `${fields.firstName} ${fields.lastName}`]
  }
}
```

#### Validation
Decorate Model with withValidation mixin/decorator and define validation rules using validation rules:

```javascript
class UserModel extends withValidation(Model) {
  static validation = {
    firstName: {required: true, minLength: 2},
    lastName: {required: true, minLength: 2},
    email: {pattern: 'email'}
  }
}
```

## Development Workflow

### Testing
- **Core tests**: `npm run test` (Web Test Runner + Puppeteer)
- **Module tests**: `npm run test:computed`, `npm run test:validation`, etc.
- **All tests**: `npm run test:all`
- Validation tests use Mocha with CommonJS exports pattern (`test/validation/`)

### Build & Type Generation
- `npm run types` - Generate TypeScript definitions from JSDoc
- Uses Babel with decorators support (`@babel/plugin-proposal-decorators`)
- ES modules only (`"type": "module"` in package.json)

### Code Standards
- Modern ES6+ classes instead of Backbone's extend pattern
- JSDoc comments for TypeScript generation
- Lodash-ES for utilities (tree-shakeable)
- Web Components standards compliance

## Critical Dependencies
- **lodash-es**: Core utilities (tree-shakeable)
- **Babel**: Decorator and class property transforms
- **Web Test Runner**: Modern testing without Node.js overhead
- **LitElement**: Primary Web Component target (optional)

## File Conventions
- Tests mirror source structure: `test/core/model.js` tests Model from `nextbone.js`
- Validation tests use `.cjs` extension and CommonJS exports
- TypeScript definitions auto-generated, don't edit manually
- Demo uses Vite + TypeScript for development

## Integration Points
- Form utilities in `form.js` handle nested object paths and model binding
- `class-utils.js` provides async method decorators for service classes
- LocalStorage sync adapter in `localstorage.js` 
- Virtual collection for performance with large datasets

## Migration Notes
When updating from Backbone.js:
- Replace `Backbone.Model.extend()` with `class extends Model`
- Use `defaults` methods instead of `defaults` property
- Use `view()` wrapper for Web Component integration
