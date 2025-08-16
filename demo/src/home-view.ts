import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('demo-home-view')
export class DemoHomeView extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    header {
      margin-bottom: 1rem;
    }
    .muted {
      color: rgba(127, 127, 127, 0.9);
      font-size: 0.95rem;
    }
    ul {
      margin: 0.25rem 0 1rem;
    }
    li {
      margin: 0.125rem 0;
    }
    code {
      background: rgba(127, 127, 127, 0.15);
      padding: 0.1rem 0.3rem;
      border-radius: 0.25rem;
    }
  `;

  render() {
    return html`
      <header>
        <h2>Nextbone Demo</h2>
        <p class="muted">
          A small Vite + Lit app showcasing Nextbone models, collections, and view integration.
        </p>
      </header>

      <section>
        <h3>What is this?</h3>
        <p>
          This demo uses a simple sidebar and hash routing to switch between example views. Each
          example keeps data (Model/Collection) in separate files from the UI component, using
          Nextbone's <code>view()</code> mixin and <code>@state</code> for reactive updates.
        </p>
      </section>

      <section>
        <h3>Try the examples</h3>
        <ul>
          <li><a href="#/counter">Counter</a> — a minimal counter backed by a Nextbone Model</li>
          <li>
            <a href="#/events">Events</a> — mutate a Model and a Collection and see emitted events
          </li>
        </ul>
      </section>

      <section>
        <h3>Useful links</h3>
        <ul>
          <li>
            <a href="https://github.com/blikblum/nextbone" target="_blank" rel="noopener"
              >Nextbone on GitHub</a
            >
          </li>
          <li><a href="https://lit.dev" target="_blank" rel="noopener">Lit</a></li>
          <li><a href="https://vite.dev" target="_blank" rel="noopener">Vite</a></li>
        </ul>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-home-view': DemoHomeView;
  }
}
