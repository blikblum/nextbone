import sinon from 'sinon';
import * as _ from 'lodash-es';
import { fixture, defineCE } from '@open-wc/testing-helpers';
import { LitElement } from 'lit';
import { Collection } from '../../nextbone';
import { virtualState, VirtualCollection } from '../../virtualcollection';

import { expect } from 'chai';

describe('virtualState', () => {
  it('should preserve decorated class name', async () => {
    class Test extends LitElement {
      @virtualState
      virtualProp;
    }

    expect(Test.name).to.equal('Test');
  });

  it('should call createProperty', async () => {
    const createPropSpy = sinon.spy();

    class Test extends LitElement {
      static createProperty() {
        createPropSpy();
      }
      @virtualState
      virtualProp;
    }

    const tag = defineCE(Test);
    const el = await fixture(`<${tag}></${tag}>`);
    sinon.assert.calledOnce(createPropSpy);
  });

  it('should set the assigned value to the parent of the VirtualCollection property', async () => {
    const vc = new VirtualCollection();
    class Test extends LitElement {
      @virtualState
      virtualProp = vc;
    }

    const tag = defineCE(Test);
    const el = await fixture(`<${tag}></${tag}>`);

    const collection = new Collection();
    el.virtualProp = collection;
    expect(el.virtualProp).to.eql(vc);
    expect(el.virtualProp.parent).to.eql(collection);
  });

  it('should call requestUpdate when content changes', async () => {
    class Test extends LitElement {
      @virtualState
      virtualProp = new VirtualCollection(null, {
        filter: { foo: 'bar' }
      });
    }

    const tag = defineCE(Test);
    const el = await fixture(`<${tag}></${tag}>`);

    const collection = new Collection();
    el.virtualProp = collection;
    const requestSpy = sinon.spy(el, 'requestUpdate');

    collection.add({ foo: 'baz' });
    sinon.assert.notCalled(requestSpy);
    collection.add({ foo: 'bar' });
    sinon.assert.calledOnce(requestSpy);
  });

  it('should accept a filter option', async () => {
    const filterSpy = sinon.spy();
    class Test extends LitElement {
      @virtualState({
        filter: function(model, index) {
          filterSpy.call(this, model, index);
        }
      })
      virtualProp = new VirtualCollection();
    }

    const tag = defineCE(Test);
    const el = await fixture(`<${tag}></${tag}>`);

    const collection = new Collection();
    el.virtualProp = collection;
    collection.add({ foo: 'baz' });
    sinon.assert.calledOnce(filterSpy);
    sinon.assert.calledOn(filterSpy, el);
  });

  it('should create a virtual collection for unitialized property', async () => {
    class Test extends LitElement {
      @virtualState
      virtualProp;
    }

    const tag = defineCE(Test);
    const el = await fixture(`<${tag}></${tag}>`);

    const collection = new Collection();
    el.virtualProp = collection;
    expect(el.virtualProp).to.be.instanceOf(VirtualCollection);
    expect(el.virtualProp.parent).to.eql(collection);
  });

  it('should stop listening to parent when disconnected', async () => {
    class Test extends LitElement {
      @virtualState
      virtualProp;
    }

    const tag = defineCE(Test);
    const el = await fixture(`<${tag}></${tag}>`);

    const collection = new Collection();
    el.virtualProp = collection;
    const requestSpy = sinon.spy(el, 'requestUpdate');

    el.remove();

    collection.add({ foo: 'baz' });
    sinon.assert.notCalled(requestSpy);
    expect(el.virtualProp.length).to.equal(0);
  });

  it('should listen to parent changes when disconnected and reconnected', async () => {
    class Test extends LitElement {
      @virtualState
      virtualProp;
    }

    const tag = defineCE(Test);
    const el = await fixture(`<${tag}></${tag}>`);

    const collection = new Collection();
    el.virtualProp = collection;

    const parentEl = el.parentElement;
    el.remove();
    parentEl.appendChild(el);

    const requestSpy = sinon.spy(el, 'requestUpdate');

    collection.add({ foo: 'baz' });
    sinon.assert.calledOnce(requestSpy);
    expect(el.virtualProp.length).to.equal(1);
  });

  it('should accept parent property', async () => {
    class Test extends LitElement {
      @virtualState({
        parent: 'parentProp'
      })
      virtualProp;
    }

    const tag = defineCE(Test);
    const el = await fixture(`<${tag}></${tag}>`);

    const collection = new Collection();
    el.parentProp = collection;
    expect(el.parentProp).to.eql(collection);
    expect(el.virtualProp.parent).to.eql(collection);
  });

  it('should allow to share same parent property', async () => {
    class Test extends LitElement {
      @virtualState({
        parent: 'parentProp'
      })
      virtualProp;

      @virtualState({
        parent: 'parentProp'
      })
      otherVirtualProp;
    }

    const tag = defineCE(Test);
    const el = await fixture(`<${tag}></${tag}>`);

    const collection = new Collection();
    el.parentProp = collection;
    expect(el.parentProp).to.eql(collection);
    expect(el.virtualProp.parent).to.eql(collection);
    expect(el.otherVirtualProp.parent).to.eql(collection);
  });
});
