# Nextbone

Nextbone is a conversion of venerable [Backbone](http://backbonejs.org/) using modern Javascript features. It also replaces the View layer by a set of utilities to integrate with Web Components.

### Features

- Keeps Backbone features / behavior with minimal changes. _In fact, most of the code is untouched_
- Uses EcmaScript Modules and Classes
- Fully tree shackable
- Seamless integration with Web Components (specially [LitElement](https://lit-element.polymer-project.org/))

### Install

    $ npm install nextbone

To take fully advantage of nextbone is necessary to use Typescript or Babel configured with `@babel/plugin-proposal-decorators` and `@babel/plugin-proposal-class-properties` plugins

### Usage

> Examples uses language features (class properties and decorators) that needs transpiling with Babel or Typescript

Define models

```Javascript
import { Model, Collection } from 'nextbone'

class Task extends Model {
  static defaults  = {
    title: '',
    done: false
  }
}

class Tasks extends Collection {
  static model = Task
}

const tasks = new Tasks()
tasks.fetch()
```

Define a web component using LitElement

Without decorators

```Javascript
import { LitElement, html} from 'lit'
import { view, delegate } from 'nextbone'

class TasksView extends view(LitElement) {
  static properties = {
    // set type hint to `Collection` or `Model` to enable update on property mutation
    tasks: { type: Collection }
  }

  constructor() {
    super()
    this.tasks = new Tasks()
    delegate(this, 'click', '#fetch', this.fetchTasks)
  }

  fetchTasks() {
    this.tasks.fetch()
  }

  render() {
    return html`
    <h2>Tasks</h2>
    <ul>
      ${tasks.map(task => {
        html`<li>${task.get('title')}</li>`
      })}
    </ul>
    <button id="fetch">Fetch data</button>
    `
  }
}

customElements.define('tasks-view', TasksView)

document.body.innerHTML = '<tasks-view></tasks-view>'
```

With decorators

```Javascript
import { LitElement, html, property } from 'lit'
import { state, eventHandler } from 'nextbone'

@view
class TasksView extends LitElement {
  // use specialized `state` decorator
  @state
  tasks = new Tasks()

  // or use `property` decorator with type hint = `Collection` or `Model`
  @property({ type: Collection })
  tasks = new Tasks()

  @eventHandler('click', '#fetch')
  fetchTasks() {
    this.tasks.fetch()
  }

  render() {
    return html`
    <h2>Tasks</h2>
    <ul>
      ${tasks.map(task => {
        html`<li>${task.get('title')}</li>`
      })}
    </ul>
    <button id="fetch">Fetch data</button>
    `
  }
}

customElements.define('tasks-view', TasksView)

document.body.innerHTML = '<tasks-view></tasks-view>'
```

### Documentation

[WIP](https://blikblum.github.io/nextbone/)

### Related projects

Copyright © 2019-2024 Luiz Américo Pereira Câmara
