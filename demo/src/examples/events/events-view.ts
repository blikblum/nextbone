import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { view, state, Model, Collection } from 'nextbone';
import { PersonModel, PeopleCollection } from './events-model.ts';

@customElement('demo-events-view')
export class DemoEventsView extends view(LitElement) {
  // Declarations for Events mixin methods provided by view()
  declare listenTo: (object: any, events: string, callback: Function) => this;
  declare stopListening: (object?: any, events?: string, callback?: Function) => this;
  @state
  person = new PersonModel({ id: 1, name: 'Alice' });

  @state
  people = new PeopleCollection([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ]);

  private logs: string[] = [];

  static styles = css`
    :host {
      display: block;
    }
    .row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .panel {
      border: 1px solid rgba(128, 128, 128, 0.3);
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      max-height: 220px;
      overflow: auto;
      width: 100%;
      max-width: 100%;
      background: rgba(0, 0, 0, 0.03);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }
    pre {
      margin: 0;
      white-space: pre-wrap; /* allow wrapping to avoid horizontal expansion */
      word-break: break-word;
      overflow-wrap: anywhere;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.listenTo(this.person, 'all', this.onModelEvent);
    this.listenTo(this.people, 'all', this.onCollectionEvent);
  }

  disconnectedCallback(): void {
    this.stopListening();
    super.disconnectedCallback();
  }

  private onModelEvent = (eventName: string, ...args: unknown[]) => {
    this.pushLog(`[Model] ${eventName} ${this.formatArgs(args)}`);
  };

  private onCollectionEvent = (eventName: string, ...args: unknown[]) => {
    this.pushLog(`[Collection] ${eventName} ${this.formatArgs(args)}`);
  };

  private formatArgs(args: unknown[]): string {
    return args
      .map(a => {
        if (a instanceof Model || a instanceof Collection) {
          return `(${a.constructor.name} instance)`;
        } else if (a && typeof a === 'object') {
          try {
            return JSON.stringify(a);
          } catch {
            return '[object]';
          }
        }
        return String(a);
      })
      .join(' ');
  }

  private pushLog(line: string) {
    this.logs = [line, ...this.logs].slice(0, 200);
    this.requestUpdate();
  }

  private clearLogs = () => {
    this.logs = [];
    this.requestUpdate();
  };

  private mutateModel = () => {
    const name = this.person.get('name');
    this.person.set('name', name + '!');
  };

  private resetModel = () => {
    this.person.set(this.person.defaults());
  };

  private addPerson = () => {
    const maxId = this.people.reduce<number>((max: number, m: PersonModel) => {
      const id = (m.get('id') ?? 0) as number;
      return id > max ? id : max;
    }, 0);
    const id = maxId + 1;
    this.people.add({ id, name: `Person ${id}` });
  };

  private removeLast = () => {
    const last = this.people.at(this.people.length - 1);
    if (last) this.people.remove(last);
  };

  private resetPeople = () => {
    this.people.reset([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]);
  };

  render() {
    return html`
      <h2>Events</h2>
      <p>Interact with a model and a collection. All events are logged.</p>

      <div class="grid">
        <section>
          <h3>Model</h3>
          <div class="row">
            <span>Name: <strong>${this.person.get('name')}</strong></span>
            <button @click=${this.mutateModel}>Mutate</button>
            <button @click=${this.resetModel}>Reset</button>
          </div>
        </section>

        <section>
          <h3>Collection</h3>
          <div class="row">
            <span>Count: <strong>${this.people.length}</strong></span>
            <button @click=${this.addPerson}>Add</button>
            <button @click=${this.removeLast}>Remove last</button>
            <button @click=${this.resetPeople}>Reset</button>
          </div>
        </section>
      </div>

      <section>
        <div class="row" style="justify-content: space-between;">
          <h3 style="margin: 0;">Event log</h3>
          <button @click=${this.clearLogs}>Clear</button>
        </div>
        <div class="panel" aria-live="polite">
          ${this.logs.length === 0
            ? html`
                <em>No events yet. Try the buttons above.</em>
              `
            : html`
                <pre>${this.logs.join('\n')}</pre>
              `}
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-events-view': DemoEventsView;
  }
}
