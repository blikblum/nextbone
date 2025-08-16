import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { view, state } from 'nextbone';
import { CounterModel } from './counter-model.ts';

@customElement('demo-counter-view')
export class DemoCounterView extends view(LitElement) {
  @state
  model = new CounterModel();

  static styles = css`
    :host {
      display: block;
    }
  `;

  private onInc = () => this.model.set('count', (this.model.get('count') ?? 0) + 1);
  private onDec = () => this.model.set('count', (this.model.get('count') ?? 0) - 1);
  private onReset = () => this.model.set('count', 0);

  render() {
    const count = this.model.get('count') ?? 0;
    return html`
      <h2>Counter</h2>
      <p>Model-backed counter using Nextbone + Lit.</p>
      <div class="row" style="display:flex; gap:.5rem; align-items:center;">
        <button @click=${this.onDec}>-</button>
        <strong>count: ${count}</strong>
        <button @click=${this.onInc}>+</button>
        <button @click=${this.onReset}>Reset</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-counter-view': DemoCounterView;
  }
}
