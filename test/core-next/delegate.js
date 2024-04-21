import { fixture } from '@open-wc/testing-helpers';

import * as Backbone from 'nextbone';
import * as _ from 'lodash-es';

import 'chai/chai.js';

const { expect } = window.chai;

const elHTML = `
<div id="container">
  <h1>Test</h1>        
  <div class="one">
    <div class="one-child">          
    </div>
  </div>
  <div class="two"></div>
  <div class="one"></div>
</div>
`;

class TestShadowDOM extends HTMLElement {
  constructor() {
    super();
    this.renderRoot = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.renderRoot.innerHTML = elHTML;
  }
}

const elShadowTag = 'delegate-shadow-el';
customElements.define(elShadowTag, TestShadowDOM);

describe('delegate', () => {
  afterEach(() => {
    Backbone.delegate.$ = null;
  });

  const triggerEvent = (el, oneChildEl, twoEl) => {
    oneChildEl.click();
    oneChildEl.dispatchEvent(new CustomEvent('my-delegated-event', { bubbles: true }));
    twoEl.click();
    twoEl.dispatchEvent(new CustomEvent('my-delegated-event', { bubbles: true }));
    el.dispatchEvent(new CustomEvent('my-event'));
  };

  it('should listen to events triggered in element and its children', async () => {
    let el, oneEl, oneChildEl, twoEl;
    function oneClick(e) {
      expect(this).to.equal(el, 'this should be the element instance');
      expect(e.target).to.equal(oneChildEl, 'target should be .one-child element');
      expect(e.selectorTarget).to.equal(oneEl, 'selectorTarget should be .one element');
    }
    function twoClick(e) {
      expect(this).to.equal(el, 'this should be the element instance');
      expect(e.target).to.equal(twoEl, 'target should be .two element');
      expect(e.selectorTarget).to.equal(twoEl, 'selectorTarget should be .two element');
    }
    function selfClick(e) {
      expect(this).to.equal(el, 'this should be the element instance');
      expect(e.target).to.equal(el, 'target should be be the element instance');
      expect(e.selectorTarget, 'selectorTarget should be undefined').to.be.undefined;
    }
    el = await fixture(elHTML);
    const handler1 = Backbone.delegate(el, 'click', '.one', oneClick);
    const handler2 = Backbone.delegate(el, 'my-delegated-event', '.one', oneClick);
    const handler3 = Backbone.delegate(el, 'click', '.two', twoClick);
    const handler4 = Backbone.delegate(el, 'my-delegated-event', '.two', twoClick);
    const handler5 = Backbone.delegate(el, 'my-event', undefined, selfClick);
    oneEl = el.querySelector('.one');
    oneChildEl = el.querySelector('.one-child');
    twoEl = el.querySelector('.two');
    triggerEvent(el, oneChildEl, twoEl);
    Backbone.undelegate(el, handler1);
    Backbone.undelegate(el, handler2);
    Backbone.undelegate(el, handler3);
    Backbone.undelegate(el, handler4);
    Backbone.undelegate(el, handler5);
    triggerEvent(el, oneChildEl, twoEl);
  });

  it('should allow to configure the context option', async () => {
    let el, oneEl, oneChildEl, twoEl;
    const customContext1 = {};
    const customContext2 = { foo: 'bar' };
    function oneClick(e) {
      expect(this).to.equal(customContext1, 'this should be the the passed context');
    }
    function twoClick(e) {
      expect(this).to.equal(customContext2, 'this should be the passed context');
    }
    function selfClick(e) {
      expect(this).to.equal(customContext1, 'this should be the the passed context');
    }
    el = await fixture(elHTML);
    Backbone.delegate(el, 'click', '.one', oneClick, customContext1);
    Backbone.delegate(el, 'my-delegated-event', '.one', oneClick, customContext1);
    Backbone.delegate(el, 'click', '.two', twoClick, customContext2);
    Backbone.delegate(el, 'my-delegated-event', '.two', twoClick, customContext2);
    Backbone.delegate(el, 'my-event', undefined, selfClick, customContext1);
    oneEl = el.querySelector('.one');
    oneChildEl = el.querySelector('.one-child');
    twoEl = el.querySelector('.two');
    triggerEvent(el, oneChildEl, twoEl);
  });

  it('should support non bubbable events', async () => {
    let el, oneEl, twoEl;
    function oneBlur(e) {
      expect(this).to.equal(el, 'this should be the element instance');
      expect(e.target).to.equal(oneEl, 'target should be .one element');
      expect(e.selectorTarget).to.equal(oneEl, 'selectorTarget should be .one element');
    }
    function twoFocus(e) {
      expect(this).to.equal(el, 'this should be the element instance');
      expect(e.target).to.equal(twoEl, 'target should be .two element');
      expect(e.selectorTarget).to.equal(twoEl, 'selectorTarget should be .two element');
    }
    el = await fixture('<div><input class="one"/><input class="two"/></div>');
    oneEl = el.querySelector('.one');
    twoEl = el.querySelector('.two');
    oneEl.focus();
    Backbone.delegate(el, 'blur', '.one', oneBlur);
    Backbone.delegate(el, 'focus', '.two', twoFocus);
    twoEl.focus();
  });

  it('should support events triggered in a element with shadowDOM', async () => {
    let el, oneEl, oneChildEl, twoEl;

    function oneClick(e) {
      expect(this).to.equal(el.shadowRoot, 'this should be the element shadowRoot');
      expect(e.target).to.equal(oneChildEl, 'target should be .one-child element');
      expect(e.selectorTarget).to.equal(oneEl, 'selectorTarget should be .one element');
    }

    function twoClick(e) {
      expect(this).to.equal(el.shadowRoot, 'this should be the element shadowRoot');
      expect(e.target).to.equal(twoEl, 'target should be .two element');
      expect(e.selectorTarget).to.equal(twoEl, 'selectorTarget should be .two element');
    }

    function selfClick(e) {
      expect(this).to.equal(el, 'this should be the element instance');
      expect(e.target).to.equal(el, 'target should be be the element instance');
      expect(e.selectorTarget, 'selectorTarget should be undefined').to.be.undefined;
    }

    el = await fixture(`<${elShadowTag}></${elShadowTag}>`);
    const handler1 = Backbone.delegate(el.shadowRoot, 'click', '.one', oneClick);
    const handler2 = Backbone.delegate(el.shadowRoot, 'my-delegated-event', '.one', oneClick);
    const handler3 = Backbone.delegate(el.shadowRoot, 'click', '.two', twoClick);
    const handler4 = Backbone.delegate(el.shadowRoot, 'my-delegated-event', '.two', twoClick);
    const handler5 = Backbone.delegate(el, 'my-event', undefined, selfClick);
    oneEl = el.renderRoot.querySelector('.one');
    oneChildEl = el.renderRoot.querySelector('.one-child');
    twoEl = el.renderRoot.querySelector('.two');
    triggerEvent(el, oneChildEl, twoEl);
    Backbone.undelegate(el.shadowRoot, handler1);
    Backbone.undelegate(el.shadowRoot, handler2);
    Backbone.undelegate(el, handler3);
    Backbone.undelegate(el, handler4);
    Backbone.undelegate(el, handler5);
    triggerEvent(el, oneChildEl, twoEl);
  });
});
