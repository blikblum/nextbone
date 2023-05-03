# Get started

## Install

Use your favorite node package manager to install `nextbone` and its only dependency, `lodash-es`

::: code-group

```bash [npm]
npm install nextbone lodash-es
```

```bash [yarn]
yarn add nextbone lodash-es
```

:::

## Usage

Declare a model and collection

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

Define a web component using LitElement / [lit](https://lit.dev)

```Javascript
import { LitElement, html } from 'lit'
import { state, eventHandler } from 'nextbone'

class TasksView extends LitElement {
  @state
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

## More

Check out the documentation for [Events](events.md), [Model](model.md) and [Collection](collection.md).
