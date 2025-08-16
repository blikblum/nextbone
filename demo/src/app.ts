import { LitElement, css, html } from 'lit';
import { customElement, state as litState } from 'lit/decorators.js';

// Import example views so they can be used by tag name
import './home-view';
import './examples/counter/counter-view';
import './examples/events/events-view';

type ExampleConfig = {
  id: string;
  label: string;
  tag: string; // custom element tag to render
};

const EXAMPLES: ExampleConfig[] = [
  { id: 'home', label: 'Home', tag: 'demo-home-view' },
  { id: 'counter', label: 'Counter', tag: 'demo-counter-view' },
  { id: 'events', label: 'Events', tag: 'demo-events-view' }
];

@customElement('nextbone-demo-app')
export class NextboneDemoApp extends LitElement {
  @litState()
  private route: string = this.getRouteFromLocation();

  static styles = css`
    :host {
      display: grid;
      grid-template-columns: 240px 1fr;
      grid-template-rows: 100vh;
      gap: 0;
    }

    aside {
      border-right: 1px solid rgba(128, 128, 128, 0.2);
      padding: 1rem;
      box-sizing: border-box;
      background: rgba(0, 0, 0, 0.03);
    }

    h1 {
      font-size: 1.1rem;
      margin: 0 0 0.75rem;
    }

    nav ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    nav a {
      display: block;
      padding: 0.5rem 0.25rem;
      color: inherit;
    }

    nav a.active {
      font-weight: 600;
      color: #646cff;
    }

    main {
      padding: 1rem 2rem;
      box-sizing: border-box;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('hashchange', this.onHashChange);
    // Normalize missing hash to first entry (Home)
    if (!location.hash) this.navigate(EXAMPLES[0].id);
  }

  disconnectedCallback(): void {
    window.removeEventListener('hashchange', this.onHashChange);
    super.disconnectedCallback();
  }

  private onHashChange = () => {
    this.route = this.getRouteFromLocation();
  };

  private getRouteFromLocation(): string {
    const route = location.hash.replace(/^#\/?/, '');
    // Fallback to home if unknown route
    return EXAMPLES.some(x => x.id === route) ? route : EXAMPLES[0].id;
  }

  private navigate(id: string) {
    location.hash = `#/${id}`;
  }

  private renderSidebar() {
    return html`
      <aside>
        <h1>Nextbone Examples</h1>
        <nav>
          <ul>
            ${EXAMPLES.map(
              x => html`
                <li>
                  <a
                    href="#/${x.id}"
                    class=${this.route === x.id ? 'active' : ''}
                    @click=${(e: Event) => {
                      e.preventDefault();
                      this.navigate(x.id);
                    }}
                    >${x.label}</a
                  >
                </li>
              `
            )}
          </ul>
        </nav>
      </aside>
    `;
  }

  private renderMain() {
    const id = this.route;
    return html`
      <main>
        ${id === 'events'
          ? html`
              <demo-events-view></demo-events-view>
            `
          : id === 'counter'
          ? html`
              <demo-counter-view></demo-counter-view>
            `
          : html`
              <demo-home-view></demo-home-view>
            `}
      </main>
    `;
  }

  render() {
    return html`
      ${this.renderSidebar()}${this.renderMain()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nextbone-demo-app': NextboneDemoApp;
  }
}
