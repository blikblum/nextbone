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

```Javascript
import { LitElement, html} from 'lit-element'
import { state, event } from 'nextbone'

class TasksView extends LitElement {
  @state
  tasks = new Tasks()
  
  @event('click', '#fetch')
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

TBD

### Related projects

Copyright © 2019 Luiz Américo Pereira Câmara