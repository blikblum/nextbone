import { fixture, defineCE } from '@open-wc/testing-helpers';

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

(function(QUnit) {
  const elShadowTag = 'delegate-shadow-el';
  customElements.define(elShadowTag, TestShadowDOM);

  QUnit.module('delegate', {
    afterEach: function() {
      Backbone.delegate.$ = null;
    }
  });

  const triggerEvent = (el, oneChildEl, twoEl) => {
    oneChildEl.click();
    oneChildEl.dispatchEvent(new CustomEvent('my-delegated-event', { bubbles: true }));
    twoEl.click();
    twoEl.dispatchEvent(new CustomEvent('my-delegated-event', { bubbles: true }));
    el.dispatchEvent(new CustomEvent('my-event'));
  };

  const triggerType = 'native';
  const delegateType = 'native';

  QUnit.test(`events triggered by ${triggerType} and delegated by ${delegateType}`, async function(
    assert
  ) {
    assert.expect(21);
    let el, oneEl, oneChildEl, twoEl;

    function oneClick(e) {
      assert.equal(this, el, 'this should be the element instance');
      assert.equal(e.target, oneChildEl, 'target should be .one-child element');
      assert.equal(e.selectorTarget, oneEl, 'selectorTarget should be .one element');
    }

    function twoClick(e) {
      assert.equal(this, el, 'this should be the element instance');
      assert.equal(e.target, twoEl, 'target should be .two element');
      assert.equal(e.selectorTarget, twoEl, 'selectorTarget should be .two element');
    }

    function selfClick(e) {
      assert.equal(this, el, 'this should be the element instance');
      assert.equal(e.target, el, 'target should be be the element instance');
      assert.notOk(e.selectorTarget, 'selectorTarget should be undefined');
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
    // the below handlers should fire again
    // Backbone.undelegate(el, handler3);
    // Backbone.undelegate(el, handler4);
    Backbone.undelegate(el, handler5);

    triggerEvent(el, oneChildEl, twoEl);
  });

  QUnit.test(
    `context option triggered by ${triggerType} and delegated by ${delegateType}`,
    async function(assert) {
      assert.expect(5);
      let el, oneEl, oneChildEl, twoEl;
      const customContext1 = {};
      const customContext2 = { foo: 'bar' };

      function oneClick(e) {
        assert.equal(this, customContext1, 'this should be the the passed context');
      }

      function twoClick(e) {
        assert.equal(this, customContext2, 'this should be the passed context');
      }

      function selfClick(e) {
        assert.equal(this, customContext1, 'this should be the the passed context');
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
    }
  );

  QUnit.test(
    `non bubbable events triggered by ${triggerType} and delegated by ${delegateType}`,
    async function(assert) {
      assert.expect(6);
      let el, oneEl, twoEl;

      function oneBlur(e) {
        assert.equal(this, el, 'this should be the element instance');
        assert.equal(e.target, oneEl, 'target should be .one element');
        assert.equal(e.selectorTarget, oneEl, 'selectorTarget should be .one element');
      }

      function twoFocus(e) {
        assert.equal(this, el, 'this should be the element instance');
        assert.equal(e.target, twoEl, 'target should be .two element');
        assert.equal(e.selectorTarget, twoEl, 'selectorTarget should be .two element');
      }

      el = await fixture('<div><input class="one"/><input class="two"/></div>');
      oneEl = el.querySelector('.one');
      twoEl = el.querySelector('.two');
      oneEl.focus();

      Backbone.delegate(el, 'blur', '.one', oneBlur);
      Backbone.delegate(el, 'focus', '.two', twoFocus);
      twoEl.focus();
    }
  );

  QUnit.test(
    `events triggered by ${triggerType} and delegated by ${delegateType} in a element with shadowDOM`,
    async function(assert) {
      assert.expect(21);
      let el, oneEl, oneChildEl, twoEl;

      function oneClick(e) {
        assert.equal(this, el.shadowRoot, 'this should be the element shadowRoot');
        assert.equal(e.target, oneChildEl, 'target should be .one-child element');
        assert.equal(e.selectorTarget, oneEl, 'selectorTarget should be .one element');
      }

      function twoClick(e) {
        assert.equal(this, el.shadowRoot, 'this should be the element shadowRoot');
        assert.equal(e.target, twoEl, 'target should be .two element');
        assert.equal(e.selectorTarget, twoEl, 'selectorTarget should be .two element');
      }

      function selfClick(e) {
        assert.equal(this, el, 'this should be the element instance');
        assert.equal(e.target, el, 'target should be be the element instance');
        assert.notOk(e.selectorTarget, 'selectorTarget should be undefined');
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
      // the below handlers should fire again
      // Backbone.undelegate(el, handler3);
      // Backbone.undelegate(el, handler4);
      Backbone.undelegate(el, handler5);

      triggerEvent(el, oneChildEl, twoEl);
    }
  );
})(QUnit);
