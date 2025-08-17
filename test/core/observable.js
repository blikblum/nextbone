import * as Backbone from 'nextbone';
import * as _ from 'lodash-es';
import chaiAsPromised from 'chai-as-promised';

import { use, expect } from 'chai';

use(chaiAsPromised);

describe('Nexbone.observable', function () {
  it('trigger "change" events', function () {
    class WithObservable extends Backbone.Events {
      @Backbone.observable
      prop;
    }
    var obj = new WithObservable();
    obj.on('change', function () {
      expect(true).to.be.true;
    });
    obj.on('change:prop', function () {
      expect(true).to.be.true;
    });
    obj.prop = 3;

    expect(obj.prop).to.equal(3);
  });

  it('pass instance and value to change events', function () {
    class WithObservable extends Backbone.Events {
      @Backbone.observable
      prop;
    }
    var obj = new WithObservable();
    obj.prop = 3;

    obj.on('change', function (instance) {
      expect(instance).to.equal(obj);
    });
    obj.on('change:prop', function (instance, value, oldValue) {
      expect(instance).to.equal(obj);
      expect(value).to.equal(5);
      expect(oldValue).to.equal(3);
    });
    obj.prop = 5;
  });
});
