(function(QUnit) {
  QUnit.module('Nexbone.observable');

  QUnit.test('trigger "change" events', function(assert) {
    assert.expect(3);
    class WithObservable extends Backbone.Events {
      @Backbone.observable
      prop;
    }
    var obj = new WithObservable();
    obj.on('change', function() {
      assert.ok(true);
    });
    obj.on('change:prop', function() {
      assert.ok(true);
    });
    obj.prop = 3;

    assert.equal(obj.prop, 3);
  });

  QUnit.test('pass instance and value to change events', function(assert) {
    assert.expect(4);
    class WithObservable extends Backbone.Events {
      @Backbone.observable
      prop;
    }
    var obj = new WithObservable();
    obj.prop = 3;

    obj.on('change', function(instance) {
      assert.equal(instance, obj);
    });
    obj.on('change:prop', function(instance, value, oldValue) {
      assert.equal(instance, obj);
      assert.equal(value, 5);
      assert.equal(oldValue, 3);
    });
    obj.prop = 5;
  });
})(QUnit);
