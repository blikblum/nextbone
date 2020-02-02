import { Model } from '../../nextbone';
import { formBind } from '../../formbind';
import { validation } from '../../validation';
import { fixture, defineCE } from '@open-wc/testing-helpers';
import { LitElement, html } from 'lit-element';

import { expect } from 'chai';
import { spy, assert } from 'sinon';

@formBind
class TestDefaultInputs extends LitElement {
  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <input type="text" name="textProp" />
      <input type="text" name="nested.textProp" />
      <input type="text" name="noBind" no-bind />
      <input type="number" name="numberProp" />
      <input id="data-number" data-prop-type="number" name="numberProp" />
      <input type="radio" name="radioProp" value="a" />
      <input type="radio" name="radioProp" value="b" checked />
      <input type="checkbox" name="checkProp" />
      <select name="selectProp">
        <option value="xx">XX</option>
        <option selected value="yy">YY</option>
      </select>
    `;
  }
}

const defaultsTag = defineCE(TestDefaultInputs);

@formBind({ model: 'otherModel' })
class TestModelOption extends LitElement {
  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <input id="default" name="textProp" />
      <input id="other" data-model="yetAnotherModel" name="textProp" />
    `;
  }
}

const modelOptionTag = defineCE(TestModelOption);

describe('formBind', function() {
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

    it('should not handle input event input with no-bind attribute', async function() {
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
      let inputEl = el.renderRoot.querySelector('input[type="checkbox"]');
      inputEl.dispatchEvent(new InputEvent('change', { bubbles: true }));
      assert.calledOnce(setSpy);
      assert.calledWith(setSpy, 'checkProp', false);
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

    it('should convert value to number for input with data-prop-type = "number"', async function() {
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

    describe('form state', () => {
      @validation({
        textProp: function(value) {
          if (value === 'danger') return 'error';
        },
        strangeProp: function(value) {
          if (value === 'danger') return 'error';
        }
      })
      class ValidatedModel extends Model {}
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
        expect(el.form.touched.textProp).to.be.true;
      });

      describe('getValue', () => {
        it('should return value from the default model', () => {
          myModel.set({ x: 'y' });
          expect(el.form.getValue('x')).to.equal('y');
        });

        it('should return value from el property when passing a string as model option', () => {
          el.anotherModel = new Model({ a: 'b' });
          expect(el.form.getValue('a', 'anotherModel')).to.equal('b');
        });

        it('should return value from passed model option when is a model instance', () => {
          const anotherModel = new Model({ foo: 'bar' });
          expect(el.form.getValue('foo', anotherModel)).to.equal('bar');
        });
      });

      describe('isValid', () => {
        it('should return validity state', async function() {
          myModel.set({ textProp: 'danger' });
          expect(el.form.isValid()).to.be.false;

          myModel.set({ textProp: 'safe' });
          expect(el.form.isValid()).to.be.true;
        });

        it('should update errors on form state', async function() {
          myModel.set({ textProp: 'danger' });
          el.form.isValid();
          expect(el.form.errors).to.deep.equal({ textProp: 'error' });

          myModel.set({ textProp: 'safe' });
          el.form.isValid();
          expect(el.form.errors).to.deep.equal({});
        });

        it('should set errors only from fields present in markup when not specified', async function() {
          myModel.set({ textProp: 'danger', strangeProp: 'danger' });
          el.form.isValid();
          expect(el.form.errors).to.deep.equal({ textProp: 'error' });
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
    });
  });

  describe('with custom model name', function() {
    let el, otherModelSetSpy, yetAnotherModelSetSpy;
    beforeEach(async function() {
      el = await fixture(`<${modelOptionTag}></${modelOptionTag}>`);
      el.model = myModel;
      el.otherModel = new Model();
      el.yetAnotherModel = new Model();
      otherModelSetSpy = spy(el.otherModel, 'set');
      yetAnotherModelSetSpy = spy(el.yetAnotherModel, 'set');
    });

    it('should update the model defined by modelName option by default', async function() {
      const inputEl = el.renderRoot.querySelector('#default');
      inputEl.value = 'zzz';
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
      assert.notCalled(setSpy);
      assert.notCalled(yetAnotherModelSetSpy);

      assert.calledOnce(otherModelSetSpy);
      assert.calledWith(otherModelSetSpy, 'textProp', 'zzz');
    });

    it('should update the model defined by data-model', async function() {
      const inputEl = el.renderRoot.querySelector('#other');
      inputEl.value = 'zzz';
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
      assert.notCalled(setSpy);
      assert.notCalled(otherModelSetSpy);

      assert.calledOnce(yetAnotherModelSetSpy);
      assert.calledWith(yetAnotherModelSetSpy, 'textProp', 'zzz');
    });
  });
});
