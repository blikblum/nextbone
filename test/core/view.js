import { fixture, defineCE } from '@open-wc/testing-helpers';
import { LitElement, html } from 'lit-element';
import { render } from 'lit-html';

const elHTML = html`
  <h1>Test</h1>
  <div class="one">
    <div class="one-child"></div>
  </div>
  <div class="two"></div>
  <div class="one"></div>
`;

(function(QUnit) {
  QUnit.module('Backbone.view');

  // test the possibility to use field/method decorators without view decorator
  [Backbone.view, _.noop].forEach(classDecorator => {
    const suffix = classDecorator === Backbone.view ? '' : ' - without class decorator';
    QUnit.test(`event${suffix}`, async function(assert) {
      assert.expect(9);
      let el, oneEl, oneChildEl, twoEl;
      @classDecorator
      class Test extends LitElement {
        createRenderRoot() {
          return this;
        }

        render() {
          return elHTML;
        }

        @Backbone.event('click', '.one')
        oneClick(e) {
          assert.equal(this, el, 'this should be the element instance');
          assert.equal(e.target, oneChildEl, 'target should be .one-child element');
          assert.equal(e.selectorTarget, oneEl, 'selectorTarget should be .one element');
        }

        @Backbone.event('click', '.two')
        twoClick(e) {
          assert.equal(this, el, 'this should be the element instance');
          assert.equal(e.target, twoEl, 'target should be .two element');
          assert.equal(e.selectorTarget, twoEl, 'selectorTarget should be .two element');
        }

        @Backbone.event('my-event')
        selfClick(e) {
          assert.equal(this, el, 'this should be the element instance');
          assert.equal(e.target, el, 'target should be be the element instance');
          assert.notOk(e.selectorTarget, 'selectorTarget should be undefined');
        }
      }

      const tag = defineCE(Test);
      el = await fixture(`<${tag}></${tag}>`);
      oneEl = el.querySelector('.one');
      oneChildEl = el.querySelector('.one-child');
      twoEl = el.querySelector('.two');
      oneChildEl.click();
      twoEl.click();
      el.dispatchEvent(new CustomEvent('my-event'));
    });

    QUnit.test(`event - with shadowDOM${suffix}`, async function(assert) {
      assert.expect(9);
      let el, oneEl, oneChildEl, twoEl;
      @classDecorator
      class Test extends LitElement {
        render() {
          return elHTML;
        }

        @Backbone.event('click', '.one')
        oneClick(e) {
          assert.equal(this, el, 'this should be the element instance');
          assert.equal(e.target, oneChildEl, 'target should be .one-child element');
          assert.equal(e.selectorTarget, oneEl, 'selectorTarget should be .one element');
        }

        @Backbone.event('click', '.two')
        twoClick(e) {
          assert.equal(this, el, 'this should be the element instance');
          assert.equal(e.target, twoEl, 'target should be .two element');
          assert.equal(e.selectorTarget, twoEl, 'selectorTarget should be .two element');
        }

        @Backbone.event('my-event')
        selfClick(e) {
          assert.equal(this, el, 'this should be the element instance');
          assert.equal(e.target, el, 'target should be be the element instance');
          assert.notOk(e.selectorTarget, 'selectorTarget should be undefined');
        }
      }

      const tag = defineCE(Test);
      el = await fixture(`<${tag}></${tag}>`);
      oneEl = el.shadowRoot.querySelector('.one');
      oneChildEl = el.shadowRoot.querySelector('.one-child');
      twoEl = el.shadowRoot.querySelector('.two');
      oneChildEl.click();
      twoEl.click();
      el.dispatchEvent(new CustomEvent('my-event'));
    });

    QUnit.test(`event - with HTMLElement${suffix}`, async function(assert) {
      assert.expect(9);
      let el, oneEl, oneChildEl, twoEl;
      @classDecorator
      class Test extends HTMLElement {
        connectedCallback() {
          render(elHTML, this);
        }

        @Backbone.event('click', '.one')
        oneClick(e) {
          assert.equal(this, el, 'this should be the element instance');
          assert.equal(e.target, oneChildEl, 'target should be .one-child element');
          assert.equal(e.selectorTarget, oneEl, 'selectorTarget should be .one element');
        }

        @Backbone.event('click', '.two')
        twoClick(e) {
          assert.equal(this, el, 'this should be the element instance');
          assert.equal(e.target, twoEl, 'target should be .two element');
          assert.equal(e.selectorTarget, twoEl, 'selectorTarget should be .two element');
        }

        @Backbone.event('my-event')
        selfClick(e) {
          assert.equal(this, el, 'this should be the element instance');
          assert.equal(e.target, el, 'target should be be the element instance');
          assert.notOk(e.selectorTarget, 'selectorTarget should be undefined');
        }
      }

      const tag = defineCE(Test);
      el = await fixture(`<${tag}></${tag}>`);
      oneEl = el.querySelector('.one');
      oneChildEl = el.querySelector('.one-child');
      twoEl = el.querySelector('.two');
      oneChildEl.click();
      twoEl.click();
      el.dispatchEvent(new CustomEvent('my-event'));
    });

    QUnit.test(`state${suffix}`, async function(assert) {
      assert.expect(8);
      let enqueueUpdateCount = 0;
      let createPropertyCount = 0;
      @classDecorator
      class Test extends LitElement {
        static createProperty(...args) {
          createPropertyCount++;
          super.createProperty(...args);
        }

        render() {
          return elHTML;
        }

        @Backbone.state
        model = new Backbone.Model();

        @Backbone.state
        collection = new Backbone.Collection();

        _enqueueUpdate(...args) {
          enqueueUpdateCount++;
          super._enqueueUpdate(...args);
        }
      }

      const tag = defineCE(Test);
      const el = await fixture(`<${tag}></${tag}>`);
      const parentEl = el.parentNode;
      assert.equal(enqueueUpdateCount, 1);

      // changes to model/collection should trigger element update
      el.model.set('test', 1);
      el.collection.reset([]);
      assert.equal(enqueueUpdateCount, 2);
      await el.updateComplete;

      // update property instance should trigger element update
      const newModel = new Backbone.Model();
      const newCollection = new Backbone.Collection();
      el.model = newModel;
      el.collection = newCollection;
      assert.equal(enqueueUpdateCount, 3);
      await el.updateComplete;

      // setting the same instance should not trigger element update
      el.model = newModel;
      el.collection = newCollection;
      assert.equal(enqueueUpdateCount, 3);
      await el.updateComplete;

      // but changes to model/collection should trigger element update but not doubled
      el.model.set('test', 3);
      el.collection.reset([]);
      assert.equal(enqueueUpdateCount, 4);
      await el.updateComplete;

      // when disconnected no update should be triggered
      el.remove();
      el.model.set('test', 4);
      el.collection.reset([{ test: 'x' }]);
      assert.equal(enqueueUpdateCount, 4);
      await el.updateComplete;

      // when reconnected should be trigger element update
      parentEl.appendChild(el);
      el.model.set('test', 5);
      el.collection.reset([{ test: 4 }]);
      assert.equal(enqueueUpdateCount, 5);
      await el.updateComplete;

      assert.equal(createPropertyCount, 2);
    });

    QUnit.test(`isView${suffix}`, async function(assert) {
      assert.expect(1);
      @classDecorator
      class Test extends LitElement {
        render() {
          return elHTML;
        }
      }

      const tag = defineCE(Test);
      const el = await fixture(`<${tag}></${tag}>`);

      assert.equal(!!Backbone.isView(el), classDecorator === Backbone.view);
    });
  });
})(QUnit);
