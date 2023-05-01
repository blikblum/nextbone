import { Model } from '../../nextbone';
import { form, FormState, registerFormat, registerInput } from '../../form';
import { withValidation } from '../../validation';
import { fixture, defineCE } from '@open-wc/testing-helpers';
import { LitElement, html, property } from 'lit-element';

import 'chai/chai.js';
import { spy, assert } from 'sinon';

const { expect } = window.chai;

registerFormat('bracket', value => `[${value}]`);

registerInput('registered-input', ['change']);

function renderForm() {
  return html`
    <input type="text" name="textProp" />
    <input type="text" name="nested.textProp" />
    <input type="text" name="noBind" no-form-bind />
    <input type="number" name="numberProp" />
    <input id="data-number" data-format="number" name="numberProp" />
    <input id="custom-format" data-format="bracket" name="bracketProp" />
    <input type="radio" name="radioProp" value="a" />
    <input type="radio" name="radioProp" value="b" checked />
    <input type="checkbox" name="checkProp" />
    <input id="check-group-1" type="checkbox" name="checkGroup" value="jim" />
    <input id="check-group-2" type="checkbox" name="checkGroup" value="3" data-format="number" />
    <select name="selectProp">
      <option value="xx">XX</option>
      <option selected value="yy">YY</option>
    </select>
    <custom-input name="customInputBind" form-bind></custom-input>
    <custom-input name="customInput"></custom-input>
    <registered-input name="registeredInput"></registered-input>
    <lazy-input name="lazyInput"></lazy-input>
  `;
}

@form
class TestDefaultInputs extends LitElement {
  createRenderRoot() {
    return this;
  }

  render() {
    return renderForm();
  }
}

const defaultsTag = defineCE(TestDefaultInputs);

@form({ model: 'otherModel', updateMethod: 'forceUpdate' })
class TestModelOption extends LitElement {
  createRenderRoot() {
    return this;
  }

  forceUpdate() {}

  render() {
    return html`
      <input id="default" name="textProp" />
    `;
  }
}

const modelOptionTag = defineCE(TestModelOption);

class CustomInput extends LitElement {
  @property({ type: String })
  name;

  createRenderRoot() {
    return this;
  }

  render() {
    return html``;
  }
}

const customInputTag = defineCE(CustomInput);

class NestedCustomInput extends LitElement {
  @property({ type: String })
  name;

  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <input type="text" name="x" />
    `;
  }
}

const nestedCustomInputTag = defineCE(NestedCustomInput);

@form({ inputs: { [`${nestedCustomInputTag}`]: ['change'], input: ['change'] } })
class TestNestedInput extends HTMLElement {
  model = new Model();

  connectedCallback() {
    this.innerHTML = `
    <${nestedCustomInputTag} name="y"></${nestedCustomInputTag}>
  `;
  }

  requestUpdate() {}
}
const testNestedTag = defineCE(TestNestedInput);

@form
class TestNoNameInputs extends LitElement {
  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <input type="text" name="textProp" />
      <input type="text" />
    `;
  }
}

const testNoNameTag = defineCE(TestNoNameInputs);

class CustomFormState extends FormState {
  acceptInput(prop) {
    return prop !== 'textProp';
  }
}

class TestFormState extends LitElement {
  form = new FormState(this);

  customOptionsForm = new FormState(this, {
    model: 'otherModel',
    inputs: { 'custom-input': ['change'] }
  });

  customForm = new CustomFormState(this, { model: 'customModel' });

  model = new Model();

  otherModel = new Model();

  customModel = new Model();

  createRenderRoot() {
    return this;
  }

  render() {
    return renderForm();
  }
}

const formStateTag = defineCE(TestFormState);

describe('form', function() {
  let myModel;
  let setSpy;

  beforeEach(function() {
    myModel = new Model();
    setSpy = spy(myModel, 'set');
  });

  afterEach(function() {
    myModel = null;
  });

  describe('with default options', function() {
    let el;
    beforeEach(async function() {
      el = await fixture(`<${defaultsTag}></${defaultsTag}>`);
      el.model = myModel;
    });

    it('should handle input event for generic input', async function() {
      const inputEl = el.renderRoot.querySelector('input[name="textProp"]');
      inputEl.value = 'zzz';
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'textProp', 'zzz');
    });

    it('should handle input event change with form-bind attribute', async function() {
      const inputEl = el.renderRoot.querySelector('[name="customInputBind"]');
      inputEl.value = 'zzz';
      inputEl.dispatchEvent(new InputEvent('change', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'customInputBind', 'zzz');
    });

    it('should not handle input event input with no-form-bind attribute', async function() {
      const inputEl = el.renderRoot.querySelector('input[name="noBind"]');
      inputEl.value = 'zzz';
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
      assert.notCalled(setSpy);
    });

    it('should handle input event for select', async function() {
      const inputEl = el.renderRoot.querySelector('select');
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'selectProp', 'yy');
      setSpy.resetHistory();

      const optionEl = el.renderRoot.querySelector('option:first-child');
      optionEl.selected = true;
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'selectProp', 'xx');
    });

    it('should handle change event for radio input', async function() {
      let inputEl = el.renderRoot.querySelector('input[type="radio"][checked]');
      inputEl.dispatchEvent(new InputEvent('change', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'radioProp', 'b');
      setSpy.resetHistory();

      inputEl = el.renderRoot.querySelector('input[type="radio"]:not([checked])');
      inputEl.dispatchEvent(new InputEvent('change', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'radioProp', 'a');
    });

    it('should handle change event for checkbox input', async function() {
      const inputEl = el.renderRoot.querySelector('input[type="checkbox"]');
      inputEl.dispatchEvent(new InputEvent('change', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'checkProp', false);
      setSpy.resetHistory();
      inputEl.checked = true;
      inputEl.dispatchEvent(new InputEvent('change', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'checkProp', true);
    });

    it('should handle change event for checkbox input with value attribute', async function() {
      let inputEl = el.renderRoot.querySelector('#check-group-1');
      inputEl.checked = true;
      inputEl.dispatchEvent(new InputEvent('change', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'checkGroup', ['jim']);
      setSpy.resetHistory();

      inputEl = el.renderRoot.querySelector('#check-group-2');
      inputEl.checked = true;
      inputEl.dispatchEvent(new InputEvent('change', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'checkGroup', ['jim', 3]);
      setSpy.resetHistory();

      inputEl.checked = false;
      inputEl.dispatchEvent(new InputEvent('change', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'checkGroup', ['jim']);
    });

    it('should convert value to number for number input', async function() {
      const inputEl = el.renderRoot.querySelector('input[type="number"]');
      inputEl.value = '3';
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'numberProp', 3);

      setSpy.resetHistory();

      inputEl.value = 'a';
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'numberProp', null);
    });

    it('should convert value to number for input with data-format = "number"', async function() {
      let inputEl = el.renderRoot.querySelector('#data-number');
      inputEl.value = '3';
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'numberProp', 3);

      setSpy.resetHistory();

      inputEl.value = 'a';
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'numberProp', 'a');
    });

    it('should listen to events registered through registerInput', async function() {
      let inputEl = el.renderRoot.querySelector('[name="registeredInput"]');
      inputEl.value = 'xxx';
      inputEl.dispatchEvent(new InputEvent('change', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'registeredInput', 'xxx');

      registerInput('lazy-input', ['change']);
      el = await fixture(`<${defaultsTag}></${defaultsTag}>`);
      el.model = myModel;
      setSpy.resetHistory();

      inputEl = el.renderRoot.querySelector('[name="lazyInput"]');
      inputEl.value = 'xxx';
      inputEl.dispatchEvent(new InputEvent('change', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'lazyInput', 'xxx');
    });

    it('should convert value using custom format registered through registerFormat', async function() {
      const inputEl = el.renderRoot.querySelector('#custom-format');
      inputEl.value = 'xxx';
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'bracketProp', '[xxx]');
    });

    it('should call "requestUpdate" when a change occurs', async function() {
      const inputEl = el.renderRoot.querySelector('input[name="textProp"]');
      inputEl.value = 'zzz';
      spy(el, 'requestUpdate');
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
      assert.calledOnce(el.requestUpdate);
      el.requestUpdate.restore();
    });

    it('should stop propagation of handled input events', async function() {
      const parentEl = document.createElement('div');
      const inputSpy = spy();
      const inputEl = el.renderRoot.querySelector('input[name="textProp"]');

      parentEl.addEventListener('input', inputSpy);
      parentEl.appendChild(el);
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
      assert.notCalled(inputSpy);
    });

    describe('form state', () => {
      class ValidatedModel extends withValidation(Model) {
        static validation = {
          textProp: function(value) {
            if (value === 'danger') return 'error';
          },
          'nested.textProp': function(value) {
            if (value === 'danger') return 'error';
          },
          numberProp: function(value) {
            if (typeof value === 'number' && value > 100) return 'tooBig';
          },
          strangeProp: function(value) {
            if (value === 'danger') return 'error';
          }
        };
      }
      beforeEach(() => {
        myModel = new ValidatedModel();
        el.model = myModel;
      });

      it('should create a "form" property holding form state', async function() {
        expect(el.form).to.be.instanceOf(Object);
        expect(el.form.errors).to.be.instanceOf(Object);
        expect(el.form.touched).to.be.instanceOf(Object);
      });

      it('should set error on form state when validation fails with an object', async function() {
        const inputEl = el.renderRoot.querySelector('input[name="textProp"]');
        inputEl.value = 'danger';
        inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
        expect(el.form.errors).to.deep.equal({ textProp: 'error' });
      });

      it('should set error on form state when validation fails with an string', async function() {
        const inputEl = el.renderRoot.querySelector('input[name="textProp"]');
        inputEl.value = 'danger';
        inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
        expect(el.form.errors).to.deep.equal({ textProp: 'error' });
      });

      it('should remove error on form state when validation succeeds', async function() {
        const inputEl = el.renderRoot.querySelector('input[name="textProp"]');
        inputEl.value = 'danger';
        inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
        expect(el.form.errors).to.deep.equal({ textProp: 'error' });

        inputEl.value = 'safe';
        inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
        expect(el.form.errors).to.deep.equal({});
      });

      it('should mark as touched after the first time exits from input', function() {
        const inputEl = el.renderRoot.querySelector('input[name="textProp"]');
        inputEl.focus();
        inputEl.value = 'danger';
        inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
        expect(el.form.touched.textProp).to.equal(undefined);

        inputEl.blur();
        expect(el.form.touched.textProp).to.be['true'];
      });

      it('should call requestUpdate when marked as touched', function() {
        const inputEl = el.renderRoot.querySelector('input[name="textProp"]');
        inputEl.focus();
        inputEl.value = 'danger';
        inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));

        spy(el, 'requestUpdate');
        inputEl.blur();
        assert.calledOnce(el.requestUpdate);
        el.requestUpdate.restore();
      });

      describe('getValue', () => {
        it('should return value from the model', () => {
          myModel.set({ x: 'y' });
          expect(el.form.getValue('x')).to.equal('y');
        });

        it('should return falsy value from the model', () => {
          myModel.set({ x: 0 });
          expect(el.form.getValue('x')).to.equal(0);
        });
      });

      describe('setValue', () => {
        it('should set value to the model', () => {
          myModel.set({ x: 'y' });
          el.form.setValue('x', 'b');
          expect(myModel.get('x')).to.equal('b');
        });

        it('should set nested value', () => {
          myModel.set({ inner: { x: 'y' }, x: 'y' }, { reset: true });
          el.form.setValue('inner.x', 'b');
          expect(myModel.attributes).to.deep.equal({ inner: { x: 'b' }, x: 'y' });
          expect(myModel.get('inner')).to.deep.equal({ x: 'b' });
          expect(myModel.changed).to.deep.equal({ inner: { x: 'b' } });

          // same value
          myModel.set({ inner: { x: 'y' }, x: 'y' }, { reset: true });
          el.form.setValue('inner.x', 'y');
          expect(myModel.attributes).to.deep.equal({ inner: { x: 'y' }, x: 'y' });
          expect(myModel.get('inner')).to.deep.equal({ x: 'y' });
          expect(myModel.changed).to.deep.equal({});

          // overwrite non object in path
          myModel.set({ inner: [{ x: 'y' }] }, { reset: true });
          el.form.setValue('inner.x', 'b');
          expect(myModel.get('inner')).to.deep.equal({ x: 'b' });
          expect(myModel.changed).to.deep.equal({ inner: { x: 'b' } });

          // create path
          myModel.set({ x: 'y' }, { reset: true });
          el.form.setValue('inner.x', 'b');
          expect(myModel.attributes).to.deep.equal({ inner: { x: 'b' }, x: 'y' });
          expect(myModel.get('inner')).to.deep.equal({ x: 'b' });
          expect(myModel.changed).to.deep.equal({ inner: { x: 'b' } });

          // deep path
          myModel.set({ x: 'y' }, { reset: true });
          el.form.setValue('inner.x.y.z', 'b');
          expect(myModel.attributes).to.deep.equal({ inner: { x: { y: { z: 'b' } } }, x: 'y' });
          expect(myModel.get('inner')).to.deep.equal({ x: { y: { z: 'b' } } });
          expect(myModel.changed).to.deep.equal({ inner: { x: { y: { z: 'b' } } } });
        });

        it('should call updateMethod', () => {
          const updateMethodSpy = spy(el, 'requestUpdate');
          el.form.setValue('x', 'b');
          assert.calledOnce(updateMethodSpy);
        });

        it('should reset form state when called with reset: true', async function() {
          const inputEl = el.renderRoot.querySelector('input[name="textProp"]');
          const nestedInputEl = el.renderRoot.querySelector('input[name="nested.textProp"]');
          const numberInputEl = el.renderRoot.querySelector('input[type="number"]');
          inputEl.focus();
          inputEl.value = 'danger';
          inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
          nestedInputEl.focus();
          nestedInputEl.value = 'danger';
          nestedInputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
          numberInputEl.focus();
          numberInputEl.value = '1000';
          numberInputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
          // force touched
          inputEl.focus();
          expect(el.form.errors).to.deep.equal({
            textProp: 'error',
            'nested.textProp': 'error',
            numberProp: 'tooBig'
          });
          expect(el.form.touched).to.deep.equal({
            textProp: true,
            'nested.textProp': true,
            numberProp: true
          });
          expect(el.form.getDirtyAttributes()).to.deep.equal([
            'textProp',
            'nested.textProp',
            'numberProp'
          ]);

          el.form.set('textProp', 'new', { reset: true });
          el.form.set('nested.textProp', 'new', { reset: true });
          expect(el.form.errors).to.deep.equal({ numberProp: 'tooBig' });
          expect(el.form.touched).to.deep.equal({ numberProp: true });
          expect(el.form.getDirtyAttributes()).to.deep.equal(['numberProp']);
        });
      });

      describe('setData', () => {
        it('should store form metadata', () => {
          el.form.setData('x', 'b');
          expect(el.form.getData('x')).to.equal('b');
        });

        it('should call updateMethod', () => {
          const updateMethodSpy = spy(el, 'requestUpdate');
          el.form.setData('x', 'b');
          assert.calledOnce(updateMethodSpy);
        });
      });

      describe('isValid', () => {
        it('should return validity state', async function() {
          myModel.set({ textProp: 'danger' });
          expect(el.form.isValid()).to.be['false'];

          myModel.set({ textProp: 'safe' });
          expect(el.form.isValid()).to.be['true'];
        });

        it('should update errors on form state', async function() {
          myModel.set({ textProp: 'danger' });
          el.form.isValid();
          expect(el.form.errors).to.deep.equal({ textProp: 'error' });

          myModel.set({ textProp: 'safe' });
          el.form.isValid();
          expect(el.form.errors).to.deep.equal({});
        });

        it('should set errors only from attributes passed in options', async function() {
          myModel.set({ textProp: 'danger', strangeProp: 'danger' });
          el.form.isValid({ attributes: ['strangeProp'] });
          expect(el.form.errors).to.deep.equal({ strangeProp: 'error' });
        });

        it('should set errors only from attributes present in markup when no option is specified', async function() {
          myModel.set({ textProp: 'danger', strangeProp: 'danger' });
          el.form.isValid();
          expect(el.form.errors).to.deep.equal({ textProp: 'error' });
        });

        it('should call "requestUpdate" when update option is true', function() {
          spy(el, 'requestUpdate');
          el.form.isValid({ update: true });
          assert.calledOnce(el.requestUpdate);
        });

        it('should not call "requestUpdate" when update option is ommited', function() {
          spy(el, 'requestUpdate');
          el.form.isValid();
          assert.notCalled(el.requestUpdate);
        });

        it('should mark invalid attributes as touched when touch option is true', function() {
          myModel.set({ textProp: 'danger' });
          el.form.isValid({ touch: true });
          expect(el.form.touched).to.deep.equal({ textProp: true });
        });
      });

      describe('isDirty', () => {
        it('should return false when no form interaction is done', async function() {
          myModel.set({ textProp: 'danger' });
          expect(el.form.isDirty()).to.be['false'];
        });

        it('should return false when value changed and then reverted back', async function() {
          myModel.set({ textProp: 'danger' });
          const inputEl = el.renderRoot.querySelector('input[name="textProp"]');
          inputEl.value = 'hello';
          inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));

          inputEl.value = 'danger';
          inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
          expect(el.form.isDirty()).to.be['false'];
        });

        it('should return true when value changed after first form interation', async function() {
          myModel.set({ textProp: 'danger' });
          const inputEl = el.renderRoot.querySelector('input[name="textProp"]');
          inputEl.value = 'hello';
          inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
          expect(el.form.isDirty()).to.be['true'];
        });

        it('should return true when no form interaction is done but after loading initial data', async function() {
          el.form.loadInitialData();
          myModel.set({ textProp: 'danger' });
          expect(el.form.isDirty()).to.be['true'];
        });

        it('should return true when setValue is called', async function() {
          el.form.setValue('testProp', 'Hello');
          expect(el.form.isDirty()).to.be['true'];
        });
      });

      describe('reset', () => {
        it('should reset form state', () => {
          const inputEl = el.renderRoot.querySelector('input[name="textProp"]');
          inputEl.focus();
          inputEl.value = 'danger';
          inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
          inputEl.blur();
          expect(el.form.errors).to.not.be.empty;
          expect(el.form.touched).to.not.be.empty;
          expect(el.form.isDirty()).to.be['true'];

          el.form.reset();
          expect(el.form.errors).to.be.empty;
          expect(el.form.touched).to.be.empty;
          expect(el.form.isDirty()).to.be['false'];
        });
      });

      describe('getAttributes', () => {
        it('should return an array with the name of the inputs excluding no bind', () => {
          expect(el.form.getAttributes()).to.deep.equal([
            'textProp',
            'nested.textProp',
            'numberProp',
            'bracketProp',
            'radioProp',
            'checkProp',
            'checkGroup',
            'selectProp',
            'customInputBind',
            'registeredInput',
            'lazyInput'
          ]);
        });

        it('should omit inputs with no name', async () => {
          el = await fixture(`<${testNoNameTag}></${testNoNameTag}>`);
          expect(el.form.getAttributes()).to.deep.equal(['textProp']);
        });

        it('should return name of properties set through setValue', async () => {
          el.form.setValue('dynProp', 'x');
          expect(el.form.getAttributes()).to.deep.equal([
            'dynProp',
            'textProp',
            'nested.textProp',
            'numberProp',
            'bracketProp',
            'radioProp',
            'checkProp',
            'checkGroup',
            'selectProp',
            'customInputBind',
            'registeredInput',
            'lazyInput'
          ]);
        });
      });

      describe('getDirtyAttributes', () => {
        it('should return empty array by default', async () => {
          expect(el.form.getDirtyAttributes()).to.deep.equal([]);
        });

        it('should return an array with the name of the inputs with dirty value', () => {
          let inputEl = el.renderRoot.querySelector('input[name="textProp"]');
          inputEl.value = 'zzz';
          inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
          inputEl = el.renderRoot.querySelector('input[name="nested.textProp"]');
          inputEl.value = 'zzz';
          inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
          expect(el.form.getDirtyAttributes()).to.deep.equal(['textProp', 'nested.textProp']);
        });

        it('should not return attributes changed but with equal values to pristine data', () => {
          el.model.set({ textProp: 'x', nested: { textProp: 'y' } });
          let inputEl = el.renderRoot.querySelector('input[name="textProp"]');
          inputEl.value = 'zzz';
          inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
          inputEl.value = 'x';
          inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));

          inputEl = el.renderRoot.querySelector('input[name="nested.textProp"]');
          inputEl.value = 'zzz';
          inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
          inputEl.value = 'y';
          inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
          expect(el.form.getDirtyAttributes()).to.deep.equal([]);
        });

        it('should return name of properties set through set', async () => {
          el.form.set('dynProp', 'x');
          expect(el.form.getDirtyAttributes()).to.deep.equal(['dynProp']);
        });

        it('should return attribute name when setting a deep nested property', async () => {
          el.model.set({ x: { y: { z: 'a' } } });
          el.form.set('x.y.z', 'b');
          expect(el.form.getDirtyAttributes()).to.deep.equal(['x.y.z']);
        });

        it('should not return attributes different reference but deep equal', () => {
          el.model.set({ textProp: 'x', complex: { textProp: 'y' } });
          el.form.set('complex', { textProp: 'x' });
          expect(el.form.getDirtyAttributes()).to.deep.equal(['complex']);
          el.form.set('complex', { textProp: 'y' });
          expect(el.form.getDirtyAttributes()).to.deep.equal([]);
        });
      });
    });

    describe('with nested path', () => {
      it('should update the attributes correctly', () => {
        const inputEl = el.renderRoot.querySelector('input[name="nested.textProp"]');
        inputEl.value = 'zzz';
        inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
        assert.calledOnce(setSpy);
        expect(myModel.attributes.nested).to.eql({ textProp: 'zzz' });
      });

      it('should trigger change event when path is empty', () => {
        const changeSpy = spy();
        const inputEl = el.renderRoot.querySelector('input[name="nested.textProp"]');
        myModel.on('change', changeSpy);
        inputEl.value = 'zzz';
        inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
        assert.calledOnce(changeSpy);
      });

      it('should trigger change event when path is already set', () => {
        myModel.set({ nested: { textProp: 1 } });
        const changeSpy = spy();
        const inputEl = el.renderRoot.querySelector('input[name="nested.textProp"]');
        myModel.on('change', changeSpy);
        inputEl.value = 'zzz';
        inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
        assert.calledOnce(changeSpy);
      });

      it('should trigger change:attr event when path is already set', () => {
        myModel.set({ nested: { textProp: 1 } });
        const changeSpy = spy();
        const inputEl = el.renderRoot.querySelector('input[name="nested.textProp"]');
        myModel.on('change:nested', changeSpy);
        inputEl.value = 'zzz';
        inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
        assert.calledOnce(changeSpy);
      });
    });
  });

  describe('with custom options', function() {
    let el, otherModelSetSpy, yetAnotherModelSetSpy, forceUpdateSpy;
    beforeEach(async function() {
      el = await fixture(`<${modelOptionTag}></${modelOptionTag}>`);
      el.model = myModel;
      el.otherModel = new Model();
      el.yetAnotherModel = new Model();
      otherModelSetSpy = spy(el.otherModel, 'set');
      yetAnotherModelSetSpy = spy(el.yetAnotherModel, 'set');
      forceUpdateSpy = spy(el, 'forceUpdate');
    });

    it('should update the model defined by model option by default', async function() {
      const inputEl = el.renderRoot.querySelector('#default');
      inputEl.value = 'zzz';
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
      assert.notCalled(setSpy);
      assert.notCalled(yetAnotherModelSetSpy);

      assert.calledOnce(otherModelSetSpy);
      assert.calledWith(otherModelSetSpy, 'textProp', 'zzz');
    });

    it('should call the method passed in update option', function() {
      const inputEl = el.renderRoot.querySelector('input[name="textProp"]');
      inputEl.value = 'zzz';
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
      assert.calledOnce(forceUpdateSpy);
    });
  });

  describe('with nested input', () => {
    let el;
    beforeEach(async function() {
      el = await fixture(`<${testNestedTag}></${testNestedTag}>`);
      el.model = new Model();
    });

    it.skip('should call "requestUpdate" once when a change occurs', async function() {
      const customInput = el.querySelector(customInputTag);
      await customInput.updateComplete;
      const inputEl = customInput.querySelector('input');
      inputEl.value = 'zzz';
      spy(el, 'requestUpdate');
      inputEl.dispatchEvent(new InputEvent('change', { bubbles: true }));
      assert.calledOnce(el.requestUpdate);
      el.requestUpdate.restore();
    });
  });

  describe('with FormState instance', () => {
    let el;
    beforeEach(async function() {
      el = await fixture(`<${formStateTag}></${formStateTag}>`);
    });

    it('should use default options by default', () => {
      let inputEl = el.renderRoot.querySelector('input[name="textProp"]');
      inputEl.value = '---';
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));

      inputEl = el.renderRoot.querySelector('input[name="noBind"]');
      inputEl.value = 'aaa';
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));

      inputEl = el.renderRoot.querySelector('[name="customInput"]');
      inputEl.value = 'bbb';
      inputEl.dispatchEvent(new InputEvent('change', { bubbles: true }));

      inputEl = el.renderRoot.querySelector('[name="customInputBind"]');
      inputEl.value = 'ccc';
      inputEl.dispatchEvent(new InputEvent('change', { bubbles: true }));

      expect(el.model.attributes).to.be.deep.equal({ textProp: '---', customInputBind: 'ccc' });
    });

    it('should accept custom options', () => {
      let inputEl = el.renderRoot.querySelector('input[name="textProp"]');
      inputEl.value = '---';
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));

      inputEl = el.renderRoot.querySelector('input[name="noBind"]');
      inputEl.value = 'aaa';
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));

      inputEl = el.renderRoot.querySelector('[name="customInput"]');
      inputEl.value = 'bbb';
      inputEl.dispatchEvent(new InputEvent('change', { bubbles: true }));

      inputEl = el.renderRoot.querySelector('[name="customInputBind"]');
      inputEl.value = 'ccc';
      inputEl.dispatchEvent(new InputEvent('change', { bubbles: true }));

      expect(el.otherModel.attributes).to.be.deep.equal({
        textProp: '---',
        customInput: 'bbb',
        customInputBind: 'ccc'
      });
    });

    it('should allow to select input event by overriding acceptInput', () => {
      let inputEl = el.renderRoot.querySelector('input[name="textProp"]');
      inputEl.value = '---';
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));

      inputEl = el.renderRoot.querySelector('input[name="noBind"]');
      inputEl.value = 'aaa';
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));

      inputEl = el.renderRoot.querySelector('[name="customInput"]');
      inputEl.value = 'bbb';
      inputEl.dispatchEvent(new InputEvent('change', { bubbles: true }));

      inputEl = el.renderRoot.querySelector('[name="customInputBind"]');
      inputEl.value = 'ccc';
      inputEl.dispatchEvent(new InputEvent('change', { bubbles: true }));

      expect(el.customModel.attributes).to.be.deep.equal({
        customInputBind: 'ccc'
      });
    });
  });
});
