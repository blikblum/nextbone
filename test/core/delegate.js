import {fixture} from '@open-wc/testing-helpers';

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

(function(QUnit) {
  QUnit.module('delegate', {
    afterEach: function() {
      Backbone.delegate.$ = null;
    }
  });

  const triggerjQuery = (el, oneChildEl, twoEl) => {
    $(oneChildEl).trigger('click');
    $(oneChildEl).trigger('my-delegated-event');
    $(twoEl).trigger('click');
    $(twoEl).trigger('my-delegated-event');
    $(el).trigger('my-event');
  };

  const triggerNative = (el, oneChildEl, twoEl) => {
    oneChildEl.click();
    oneChildEl.dispatchEvent(new CustomEvent('my-delegated-event', {bubbles: true}));
    twoEl.click();
    twoEl.dispatchEvent(new CustomEvent('my-delegated-event', {bubbles: true}));
    el.dispatchEvent(new CustomEvent('my-event'));
  };

  [triggerNative, triggerjQuery].forEach(triggerCallback => {
    const triggerType = triggerCallback === triggerNative ? 'native' : 'jquery';
    // delegate with jquery or native
    [null, $].forEach(jqueryInstance => {
      const delegateType = jqueryInstance ? 'jquery' : 'native';
      // when delegated by native jquery events cannot be handled
      if (triggerType === 'jquery' && delegateType === 'native') return;
      QUnit.test(`events triggered by ${triggerType} and delegated by ${delegateType}`, async function(assert) {
        assert.expect(15);
        let el, oneEl, oneChildEl, twoEl;

        class TestEvents {
          oneClick(e) {
            assert.equal(this, el, 'this should be the element instance');
            assert.equal(e.target, oneChildEl, 'target should be .one-child element');
            assert.equal(e.selectorTarget, oneEl, 'selectorTarget should be .one element');
          }

          twoClick(e) {
            assert.equal(this, el, 'this should be the element instance');
            assert.equal(e.target, twoEl, 'target should be .two element');
            assert.equal(e.selectorTarget, twoEl, 'selectorTarget should be .two element');
          }

          selfClick(e) {
            assert.equal(this, el, 'this should be the element instance');
            assert.equal(e.target, el, 'target should be be the element instance');
            assert.notOk(e.selectorTarget, 'selectorTarget should be undefined');
          }
        }

        const events = new TestEvents();
        el = await fixture(elHTML);

        Backbone.delegate.$ = jqueryInstance;

        Backbone.delegate(el, 'click', '.one', events.oneClick);
        Backbone.delegate(el, 'my-delegated-event', '.one', events.oneClick);
        Backbone.delegate(el, 'click', '.two', events.twoClick);
        Backbone.delegate(el, 'my-delegated-event', '.two', events.twoClick);
        Backbone.delegate(el, 'my-event', undefined, events.selfClick);

        oneEl = el.querySelector('.one');
        oneChildEl = el.querySelector('.one-child');
        twoEl = el.querySelector('.two');

        triggerCallback(el, oneChildEl, twoEl);
      });
    });
  });


})(QUnit);
