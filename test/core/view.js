import {fixtureSync, defineCE} from '@open-wc/testing-helpers';

const elHTML = `<h1>Test</h1>        
<div class="one">
  <div class="one-child">          
  </div>
</div>
<div class="two"></div>
<div class="one"></div>`;

(function(QUnit) {
  QUnit.module('Backbone.view');

  QUnit.test('event - child delegation', function(assert) {
    assert.expect(6);
    let el, oneEl, oneChildEl, twoEl;
    @Backbone.view
    class Test extends HTMLElement {
      connectedCallback() {
        this.innerHTML = elHTML;
      }

      @Backbone.event('click', '.one')
      oneClick(e) {
        assert.equal(this, el, 'this should be the element instance');
        assert.equal(e.target, oneChildEl, 'target should be .one-child element');
        assert.equal(e.delegateTarget, oneEl, 'delegateTarget should be .one element');
      }

      @Backbone.event('click', '.two')
      twoClick(e) {
        assert.equal(this, el, 'this should be the element instance');
        assert.equal(e.target, twoEl, 'target should be .two element');
        assert.equal(e.delegateTarget, twoEl, 'delegateTarget should be .two element');
      }
    }

    const tag = defineCE(Test);
    el = fixtureSync(`<${tag}></${tag}>`);
    oneEl = el.querySelector('.one');
    oneChildEl = el.querySelector('.one-child');
    twoEl = el.querySelector('.two');
    oneChildEl.click();
    twoEl.click();
    el.click();
  });

  QUnit.test('event - no delegation', function(assert) {
    assert.expect(3);
    let el;
    @Backbone.view
    class Test extends HTMLElement {
      connectedCallback() {
        this.innerHTML = elHTML;
      }

      @Backbone.event('click')
      selfClick(e) {
        assert.equal(this, el, 'this should be the element instance');
        assert.equal(e.target, el, 'target should be be the element instance');
        assert.notOk(e.delegateTarget, 'delegateTarget should be undefined');
      }
    }

    const tag = defineCE(Test);
    el = fixtureSync(`<${tag}></${tag}>`);
    el.click();
  });

  QUnit.test('state', function(assert) {
    assert.expect(2);
    let updateCallCount = 0;
    @Backbone.view
    class Test extends HTMLElement {

      @Backbone.state
      model = new Backbone.Model();

      @Backbone.state
      collection = new Backbone.Collection();

      requestUpdate() {
        updateCallCount++;
      }
    }

    const tag = defineCE(Test);
    const el = fixtureSync(`<${tag}></${tag}>`);
    el.model.set('test', 1);
    el.collection.reset([]);
    assert.equal(updateCallCount, 2);
    el.model = new Backbone.Model();
    el.collection = new Backbone.Collection();
    assert.equal(updateCallCount, 4);
  });

})(QUnit);
