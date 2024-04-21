import { fixture, defineCE } from '@open-wc/testing-helpers';
import { LitElement, html } from 'lit-element';
import { render } from 'lit-html';
import { spy } from 'sinon';

import * as Backbone from 'nextbone';
import * as _ from 'lodash-es';

import 'chai/chai.js';

const { expect } = window.chai;

const elHTML = html`
  <h1>Test</h1>
  <div class="one">
    <div class="one-child"></div>
  </div>
  <div class="two"></div>
  <div class="one"></div>
`;

describe('Backbone.view', function() {
  it('decorated class name', () => {
    class Test extends HTMLElement {}

    expect(Test.name).to.equal('Test');
  });

  [Backbone.view, _.noop].forEach(classDecorator => {
    const suffix = classDecorator === Backbone.view ? '' : ' - without class decorator';

    it(`event${suffix}`, async function() {
      let el, oneEl, oneChildEl, twoEl;
      @classDecorator
      class TestEvent extends LitElement {
        createRenderRoot() {
          return this;
        }
        render() {
          return elHTML;
        }
        @Backbone.eventHandler('click', '.one')
        oneClick(e) {
          expect(this).to.equal(el, 'this should be the element instance');
          expect(e.target).to.equal(oneChildEl, 'target should be .one-child element');
          expect(e.selectorTarget).to.equal(oneEl, 'selectorTarget should be .one element');
        }
        @Backbone.eventHandler('click', '.two')
        twoClick(e) {
          expect(this).to.equal(el, 'this should be the element instance');
          expect(e.target).to.equal(twoEl, 'target should be .two element');
          expect(e.selectorTarget).to.equal(twoEl, 'selectorTarget should be .two element');
        }
        @Backbone.eventHandler('my-event')
        selfClick(e) {
          expect(this).to.equal(el, 'this should be the element instance');
          expect(e.target).to.equal(el, 'target should be be the element instance');
          expect(e.selectorTarget, 'selectorTarget should be undefined').to.be.undefined;
        }
      }
      const tag = defineCE(TestEvent);
      el = await fixture(`<${tag}></${tag}>`);
      oneEl = el.querySelector('.one');
      oneChildEl = el.querySelector('.one-child');
      twoEl = el.querySelector('.two');
      oneChildEl.click();
      twoEl.click();
      el.dispatchEvent(new CustomEvent('my-event'));
    });

    it(`event - with shadowDOM${suffix}`, async function() {
      let el, oneEl, oneChildEl, twoEl;
      @classDecorator
      class TestEventShadowDOM extends LitElement {
        render() {
          return elHTML;
        }
        @Backbone.eventHandler('click', '.one')
        oneClick(e) {
          expect(this).to.equal(el, 'this should be the element instance');
          expect(e.target).to.equal(oneChildEl, 'target should be .one-child element');
          expect(e.selectorTarget).to.equal(oneEl, 'selectorTarget should be .one element');
        }
        @Backbone.eventHandler('click', '.two')
        twoClick(e) {
          expect(this).to.equal(el, 'this should be the element instance');
          expect(e.target).to.equal(twoEl, 'target should be .two element');
          expect(e.selectorTarget).to.equal(twoEl, 'selectorTarget should be .two element');
        }
        @Backbone.eventHandler('my-event')
        selfClick(e) {
          expect(this).to.equal(el, 'this should be the element instance');
          expect(e.target).to.equal(el, 'target should be be the element instance');
          expect(e.selectorTarget, 'selectorTarget should be undefined').to.be.undefined;
        }
      }
      const tag = defineCE(TestEventShadowDOM);
      el = await fixture(`<${tag}></${tag}>`);
      oneEl = el.shadowRoot.querySelector('.one');
      oneChildEl = el.shadowRoot.querySelector('.one-child');
      twoEl = el.shadowRoot.querySelector('.two');
      oneChildEl.click();
      twoEl.click();
      el.dispatchEvent(new CustomEvent('my-event'));
    });

    it(`event - with HTMLElement${suffix}`, async function() {
      let el, oneEl, oneChildEl, twoEl;
      @classDecorator
      class TestEvent extends HTMLElement {
        connectedCallback() {
          render(elHTML, this);
        }
        @Backbone.eventHandler('click', '.one')
        oneClick(e) {
          expect(this).to.equal(el, 'this should be the element instance');
          expect(e.target).to.equal(oneChildEl, 'target should be .one-child element');
          expect(e.selectorTarget).to.equal(oneEl, 'selectorTarget should be .one element');
        }
        @Backbone.eventHandler('click', '.two')
        twoClick(e) {
          expect(this).to.equal(el, 'this should be the element instance');
          expect(e.target).to.equal(twoEl, 'target should be .two element');
          expect(e.selectorTarget).to.equal(twoEl, 'selectorTarget should be .two element');
        }
        @Backbone.eventHandler('my-event')
        selfClick(e) {
          expect(this).to.equal(el, 'this should be the element instance');
          expect(e.target).to.equal(el, 'target should be be the element instance');
          expect(e.selectorTarget, 'selectorTarget should be undefined').to.be.undefined;
        }
      }
      const tag = defineCE(TestEvent);
      el = await fixture(`<${tag}></${tag}>`);
      oneEl = el.querySelector('.one');
      oneChildEl = el.querySelector('.one-child');
      twoEl = el.querySelector('.two');
      oneChildEl.click();
      twoEl.click();
      el.dispatchEvent(new CustomEvent('my-event'));
    });

    it(`event subclassing${suffix}`, async function() {
      let subEl, otherSubEl;
      let eventCounter = 0;
      let subEventCounter = 0;
      let eventThis;
      let subEventThis;
      @classDecorator
      class TestEventSubclassing extends HTMLElement {
        connectedCallback() {
          render(elHTML, this);
        }
        @Backbone.eventHandler('my-event')
        selfClick(e) {
          eventThis = this;
          eventCounter++;
        }
      }
      class SubTest extends TestEventSubclassing {
        @Backbone.eventHandler('my-sub-event')
        selfClick(e) {
          subEventThis = this;
          subEventCounter++;
        }
      }
      class OtherSubTest extends TestEventSubclassing {}
      const subTag = defineCE(SubTest);
      const otherSubTag = defineCE(OtherSubTest);
      subEl = await fixture(`<${subTag}></${subTag}>`);
      otherSubEl = await fixture(`<${otherSubTag}></${otherSubTag}>`);
      subEl.dispatchEvent(new CustomEvent('my-event'));
      expect(eventCounter).to.equal(1, 'counter should be incremented.');
      subEl.dispatchEvent(new CustomEvent('my-sub-event'));
      expect(subEventCounter).to.equal(1, 'sub class counter should be incremented.');
      expect(eventThis).to.equal(subEl, 'event this should be object instance.');
      expect(subEventThis).to.equal(subEl, 'sub class event this should be object instance.');
      otherSubEl.dispatchEvent(new CustomEvent('my-event'));
      expect(eventCounter).to.equal(2, 'counter should be incremented.');
      expect(eventThis).to.equal(otherSubEl, 'event this should be other object instance.');
      otherSubEl.dispatchEvent(new CustomEvent('my-sub-event'));
      expect(subEventCounter, 1, 'sub class counter should not be incremented on other sub class.');
    });

    it(`state${suffix}`, async function() {
      let enqueueUpdateCount = 0;
      let createPropertyCount = 0;
      let el;
      let updateChangeMap;
      @classDecorator
      class TestState extends LitElement {
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
          events: {
            'the:event': 'onEvent',
            'other:event': function(params) {
              expect(params).to.equal(2);
              expect(this).to.equal(el);
            }
          }
        })
        collection = new Backbone.Collection();

        @Backbone.state({ copy: true })
        copyModel = new Backbone.Model();

        @Backbone.state({ copy: true })
        unitializedCopyModel;

        update(changed) {
          updateChangeMap = changed;
          return super.update(changed);
        }

        _enqueueUpdate(...args) {
          enqueueUpdateCount++;
          super._enqueueUpdate(...args);
        }

        onEvent(params) {
          expect(params).to.equal(1);
          expect(this).to.equal(el);
        }
      }
      const tag = defineCE(TestState);
      el = await fixture(`<${tag}></${tag}>`);
      const parentEl = el.parentNode;
      expect(enqueueUpdateCount).to.equal(1);
      // changes to model/collection should trigger element update
      el.model.set('test', 1);
      el.collection.reset([]);
      expect(enqueueUpdateCount).to.equal(2);
      await el.updateComplete;
      // property name must be passed to update changed map
      expect(updateChangeMap.has('model')).to.be.true;
      expect(updateChangeMap.has('collection')).to.be.true;
      // update property instance should trigger element update
      const newModel = new Backbone.Model();
      const newCollection = new Backbone.Collection();
      el.model = newModel;
      el.collection = newCollection;
      expect(enqueueUpdateCount).to.equal(3);
      await el.updateComplete;
      // update property defined with copy: true should trigger element update
      // but should not change element instance
      const originalCopyModel = el.copyModel;
      el.copyModel = new Backbone.Model({ foo: 'bar' });
      expect(originalCopyModel).to.equal(el.copyModel);
      expect(el.copyModel.get('foo')).to.equal('bar');
      expect(enqueueUpdateCount).to.equal(4);
      await el.updateComplete;
      // update property defined with copy: true with plain object should trigger element update
      // and should update the model
      el.copyModel = { x: 'y' };
      expect(el.copyModel.get('x')).to.equal('y');
      expect(enqueueUpdateCount).to.equal(5);
      await el.updateComplete;
      // setting the same instance should not trigger element update
      el.model = newModel;
      el.collection = newCollection;
      expect(enqueueUpdateCount).to.equal(5);
      await el.updateComplete;
      // but changes to model/collection should trigger element update but not doubled
      el.model.set('test', 3);
      el.collection.reset([]);
      expect(enqueueUpdateCount).to.equal(6);
      await el.updateComplete;
      // when disconnected no update should be triggered
      el.remove();
      el.model.set('test', 4);
      el.collection.reset([{ test: 'x' }]);
      expect(enqueueUpdateCount).to.equal(6);
      await el.updateComplete;
      // when reconnected should be trigger element update
      parentEl.appendChild(el);
      el.model.set('test', 5);
      el.collection.reset([{ test: 4 }]);
      expect(enqueueUpdateCount).to.equal(7);
      await el.updateComplete;
      // unitialized copy model should clone passed model
      el.unitializedCopyModel = newModel;
      expect(el.unitializedCopyModel).to.be.an.instanceof(Backbone.Model);
      expect(_.isEqual(el.unitializedCopyModel.attributes, newModel.attributes)).to.be.true;
      expect(el.unitializedCopyModel).to.not.equal(newModel);
      el.unitializedCopyModel.set('test', 'x');
      expect(enqueueUpdateCount).to.equal(8);
      // state with events option listen to event and trigger callback
      el.collection.trigger('the:event', 1);
      el.collection.trigger('other:event', 2);
      expect(createPropertyCount).to.equal(4);
      await el.updateComplete;
    });

    it(`state subclassing${suffix}`, async function() {
      let subEl, otherSubEl;
      let eventCounter = 0;
      let subEventCounter = 0;
      let eventThis;
      let subEventThis;
      @classDecorator
      class TestStateSubclassing extends LitElement {
        render() {
          return elHTML;
        }
        @Backbone.state({
          events: {
            'the:event': 'onEvent'
          }
        })
        model = new Backbone.Model();
        onEvent() {
          eventThis = this;
          eventCounter++;
        }
      }
      class SubTest extends TestStateSubclassing {
        @Backbone.state({
          events: {
            'the:sub:event': 'onSubEvent'
          }
        })
        subModel = new Backbone.Model();
        onSubEvent() {
          subEventThis = this;
          subEventCounter++;
        }
      }
      class OtherSubTest extends TestStateSubclassing {
        subModel = new Backbone.Model();
        onSubEvent() {
          subEventThis = this;
          subEventCounter++;
        }
      }
      const subTag = defineCE(SubTest);
      const otherSubTag = defineCE(OtherSubTest);
      subEl = await fixture(`<${subTag}></${subTag}>`);
      otherSubEl = await fixture(`<${otherSubTag}></${otherSubTag}>`);
      subEl.model.trigger('the:event');
      expect(eventCounter).to.equal(1, 'counter should be incremented.');
      subEl.subModel.trigger('the:sub:event');
      expect(subEventCounter).to.equal(1, 'sub class counter should be incremented.');
      expect(eventThis).to.equal(subEl, 'event this should be object instance.');
      expect(subEventThis).to.equal(subEl, 'sub class event this should be object instance.');
      otherSubEl.model.trigger('the:event');
      expect(eventCounter).to.equal(2, 'counter should be incremented.');
      expect(eventThis).to.equal(otherSubEl, 'event this should be other object instance.');
      otherSubEl.subModel.trigger('the:sub:event');
      expect(subEventCounter, 1, 'sub class counter should not be incremented on other sub class.');
    });

    it(`isView${suffix}`, async function() {
      @classDecorator
      class Test extends LitElement {
        render() {
          return elHTML;
        }
      }
      const tag = defineCE(Test);
      const el = await fixture(`<${tag}></${tag}>`);
      expect(!!Backbone.isView(el)).to.equal(classDecorator === Backbone.view);
    });
  });

  it('on decorator', async () => {
    let counter = 0;
    let eventThis;
    @Backbone.view
    class TestOn extends LitElement {
      @Backbone.on('event')
      eventHandler() {
        eventThis = this;
        counter++;
      }
      render() {
        return elHTML;
      }
    }
    const tag = defineCE(TestOn);
    const el = await fixture(`<${tag}></${tag}>`);
    el.trigger('event');
    expect(counter).to.equal(1, 'counter should be incremented.');
    el.trigger('event');
    el.trigger('event');
    el.trigger('event');
    el.trigger('event');
    expect(counter).to.equal(5, 'counter should be incremented five times.');
    expect(eventThis).to.equal(el, 'event this should be element instance.');
  });

  it('state defined in static states', async () => {
    const modelChangeSpy = spy();
    const copyModelChangeSpy = spy();
    const requestUpdateSpy = spy();
    class TestStatesProperty extends Backbone.view(LitElement) {
      static states = {
        model: {},
        copyModel: { copy: true }
      };
      constructor() {
        super();
        this.model = new Backbone.Model();
        this.copyModel = new Backbone.Model();
      }
      requestUpdate(...args) {
        requestUpdateSpy();
        return super.requestUpdate(...args);
      }
      willUpdate(changed) {
        if (changed.has('model')) {
          modelChangeSpy();
        }
        if (changed.has('copyModel')) {
          copyModelChangeSpy();
        }
      }
      update(changed) {
        if (changed.has('model')) {
          modelChangeSpy();
        }
        if (changed.has('copyModel')) {
          copyModelChangeSpy();
        }
        return super.update(changed);
      }
      render() {
        return elHTML;
      }
    }
    const tag = defineCE(TestStatesProperty);
    const el = await fixture(`<${tag}></${tag}>`);
    expect(modelChangeSpy.callCount).to.equal(1, 'initial model change');
    expect(copyModelChangeSpy.callCount).to.equal(1, 'initial copyModel change');
    requestUpdateSpy.resetHistory();
    el.model.set('x', 'y');
    el.copyModel.set('x', 'y');
    expect(requestUpdateSpy.callCount).to.equal(2, 'requestUpdate called');
    await el.updateComplete;
    expect(modelChangeSpy.callCount).to.equal(2, 'model change');
    expect(copyModelChangeSpy.callCount).to.equal(2, 'copyModel change');
    const originalCopyModel = el.copyModel;
    el.copyModel = new Backbone.Model({ foo: 'bar' });
    expect(originalCopyModel).to.equal(el.copyModel);
    expect(el.copyModel.get('foo')).to.equal('bar');
    await el.updateComplete;
  });

  it('state defined in ReactiveElement property', async () => {
    const modelChangeSpy = spy();
    const copyModelChangeSpy = spy();
    const collectionChangeSpy = spy();
    const requestUpdateSpy = spy();
    class TestPropertyType extends Backbone.view(LitElement) {
      static properties = {
        model: { type: Backbone.Model },
        copyModel: { type: Backbone.Model, copy: true },
        collection: { type: Backbone.Collection }
      };
      constructor() {
        super();
        this.model = new Backbone.Model();
        this.copyModel = new Backbone.Model();
        this.collection = new Backbone.Collection();
      }
      requestUpdate(...args) {
        requestUpdateSpy();
        return super.requestUpdate(...args);
      }
      willUpdate(changed) {
        if (changed.has('model')) {
          modelChangeSpy();
        }
        if (changed.has('copyModel')) {
          copyModelChangeSpy();
        }
        if (changed.has('collection')) {
          collectionChangeSpy();
        }
      }
      update(changed) {
        if (changed.has('model')) {
          modelChangeSpy();
        }
        if (changed.has('copyModel')) {
          copyModelChangeSpy();
        }
        if (changed.has('collection')) {
          collectionChangeSpy();
        }
        return super.update(changed);
      }
      render() {
        return elHTML;
      }
    }
    const tag = defineCE(TestPropertyType);
    const el = await fixture(`<${tag}></${tag}>`);
    expect(modelChangeSpy.callCount).to.equal(1, 'initial model change');
    expect(copyModelChangeSpy.callCount).to.equal(1, 'initial copyModel change');
    expect(collectionChangeSpy.callCount).to.equal(1, 'initial collection change');
    requestUpdateSpy.resetHistory();
    el.model.set('x', 'y');
    el.copyModel.set('x', 'y');
    el.collection.reset([{ x: 'y' }]);
    expect(requestUpdateSpy.callCount).to.equal(3, 'requestUpdate called');
    await el.updateComplete;
    expect(modelChangeSpy.callCount).to.equal(2, 'model change');
    expect(copyModelChangeSpy.callCount).to.equal(2, 'copyModel change');
    expect(collectionChangeSpy.callCount).to.equal(2, 'collection change');
    const originalCopyModel = el.copyModel;
    el.copyModel = new Backbone.Model({ foo: 'bar' });
    expect(originalCopyModel).to.equal(el.copyModel);
    expect(el.copyModel.get('foo')).to.equal('bar');
    await el.updateComplete;
  });
});
