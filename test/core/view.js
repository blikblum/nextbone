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

  QUnit.test('decorated class name', assert => {
    assert.expect(1);

    @Backbone.view
    class Test extends HTMLElement {}

    assert.equal(Test.name, 'Test');
  });

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

    QUnit.test(`event subclassing${suffix}`, async function(assert) {
      assert.expect(7);
      let subEl, otherSubEl;
      let eventCounter = 0;
      let subEventCounter = 0;
      let eventThis;
      let subEventThis;

      @classDecorator
      class Test extends HTMLElement {
        connectedCallback() {
          render(elHTML, this);
        }

        @Backbone.event('my-event')
        selfClick(e) {
          eventThis = this;
          eventCounter++;
        }
      }

      class SubTest extends Test {
        @Backbone.event('my-sub-event')
        selfClick(e) {
          subEventThis = this;
          subEventCounter++;
        }
      }

      class OtherSubTest extends Test {}

      const subTag = defineCE(SubTest);
      const otherSubTag = defineCE(OtherSubTest);
      subEl = await fixture(`<${subTag}></${subTag}>`);
      otherSubEl = await fixture(`<${otherSubTag}></${otherSubTag}>`);

      subEl.dispatchEvent(new CustomEvent('my-event'));
      assert.equal(eventCounter, 1, 'counter should be incremented.');
      subEl.dispatchEvent(new CustomEvent('my-sub-event'));
      assert.equal(subEventCounter, 1, 'sub class counter should be incremented.');
      assert.equal(eventThis, subEl, 'event this should be object instance.');
      assert.equal(subEventThis, subEl, 'sub class event this should be object instance.');

      otherSubEl.dispatchEvent(new CustomEvent('my-event'));
      assert.equal(eventCounter, 2, 'counter should be incremented.');
      assert.equal(eventThis, otherSubEl, 'event this should be other object instance.');
      otherSubEl.dispatchEvent(new CustomEvent('my-sub-event'));
      assert.equal(
        subEventCounter,
        1,
        'sub class counter should not be incremented on other sub class.'
      );
    });

    QUnit.test(`state${suffix}`, async function(assert) {
      assert.expect(21);
      let enqueueUpdateCount = 0;
      let createPropertyCount = 0;
      let el;
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

        @Backbone.state({
          proxyEvents: true,
          events: {
            'the:event': 'onEvent',
            'other:event': function(params) {
              assert.equal(params, 2);
              assert.equal(this, el);
            }
          }
        })
        collection = new Backbone.Collection();

        @Backbone.state({ copy: true })
        copyModel = new Backbone.Model();

        @Backbone.state({ copy: true })
        unitializedCopyModel;

        _enqueueUpdate(...args) {
          enqueueUpdateCount++;
          super._enqueueUpdate(...args);
        }

        onEvent(params) {
          assert.equal(params, 1);
          assert.equal(this, el);
        }
      }

      const tag = defineCE(Test);
      el = await fixture(`<${tag}></${tag}>`);
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

      // update property defined with copy: true should trigger element update
      // but should not change element instance
      const originalCopyModel = el.copyModel;
      el.copyModel = new Backbone.Model({ foo: 'bar' });
      assert.equal(originalCopyModel, el.copyModel);
      assert.equal(el.copyModel.get('foo'), 'bar');
      assert.equal(enqueueUpdateCount, 4);
      await el.updateComplete;

      // update property defined with copy: true with plain object should trigger element update
      // and should update the model
      el.copyModel = { x: 'y' };
      assert.equal(el.copyModel.get('x'), 'y');
      assert.equal(enqueueUpdateCount, 5);
      await el.updateComplete;

      // setting the same instance should not trigger element update
      el.model = newModel;
      el.collection = newCollection;
      assert.equal(enqueueUpdateCount, 5);
      await el.updateComplete;

      // but changes to model/collection should trigger element update but not doubled
      el.model.set('test', 3);
      el.collection.reset([]);
      assert.equal(enqueueUpdateCount, 6);
      await el.updateComplete;

      // when disconnected no update should be triggered
      el.remove();
      el.model.set('test', 4);
      el.collection.reset([{ test: 'x' }]);
      assert.equal(enqueueUpdateCount, 6);
      await el.updateComplete;

      // when reconnected should be trigger element update
      parentEl.appendChild(el);
      el.model.set('test', 5);
      el.collection.reset([{ test: 4 }]);
      assert.equal(enqueueUpdateCount, 7);
      await el.updateComplete;

      // unitialized copy model should clone passed model
      el.unitializedCopyModel = newModel;
      assert.ok(el.unitializedCopyModel instanceof Backbone.Model);
      assert.ok(_.isEqual(el.unitializedCopyModel.attributes, newModel.attributes));
      assert.notEqual(el.unitializedCopyModel, newModel);

      el.unitializedCopyModel.set('test', 'x');
      assert.equal(enqueueUpdateCount, 8);

      // state with events option listen to event and trigger callback
      el.collection.trigger('the:event', 1);
      el.collection.trigger('other:event', 2);

      assert.equal(createPropertyCount, 4);
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

  QUnit.test('on decorator', async function(assert) {
    var counter = 0;
    var eventThis;
    assert.expect(3);
    @Backbone.view
    class Test extends LitElement {
      @Backbone.on('event')
      eventHandler() {
        eventThis = this;
        counter++;
      }

      render() {
        return elHTML;
      }
    }

    const tag = defineCE(Test);
    const el = await fixture(`<${tag}></${tag}>`);

    el.trigger('event');
    assert.equal(counter, 1, 'counter should be incremented.');
    el.trigger('event');
    el.trigger('event');
    el.trigger('event');
    el.trigger('event');
    assert.equal(counter, 5, 'counter should be incremented five times.');
    assert.equal(eventThis, el, 'event this should be element instance.');
  });
})(QUnit);
