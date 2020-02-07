import sinon from 'sinon';
import { expect } from 'chai';
import { withComputed } from '../../computed';
import { Model, Collection } from '../../nextbone';

describe('nextbone/computed', function() {
  describe('when ComputedFields initialized', function() {
    let model;

    beforeEach(function() {
      @withComputed
      class TestModel extends Model {
        static computed = {
          grossPrice: {
            get: function() {
              return 100;
            }
          }
        };
      }

      model = new TestModel({ netPrice: 100, vatRate: 5 });
    });

    it('should be initialized', function() {
      expect(model.computedFields).to.exist;
    });

    it('should access model attributes', function() {
      expect(model.get('netPrice')).to.equal(100);
      expect(model.get('vatRate')).to.equal(5);
    });

    describe('when initialize an empty model', function() {
      let getSpy;

      beforeEach(function() {
        getSpy = sinon.spy();
        @withComputed
        class TestModel extends Model {
          static computed = {
            grossPrice: {
              get: getSpy
            }
          };
        }

        model = new TestModel();
      });

      it('should not call computed field getter', function() {
        sinon.assert.notCalled(getSpy);
      });
    });
  });

  describe('when ComputedFields are used', function() {
    let model;

    beforeEach(function() {
      @withComputed
      class TestModel extends Model {
        static computed = {
          grossPrice: {
            get: function() {
              return 105;
            }
          }
        };

        defaults() {
          return {
            netPrice: 0.0,
            vatRate: 0.0
          };
        }
      }

      model = new TestModel({ netPrice: 100, vatRate: 5 });
    });

    it('should calculate grossPrice', function() {
      expect(model.get('grossPrice')).to.equal(105);
    });
  });

  describe('when dependent fields are used', function() {
    var model;

    beforeEach(function() {
      @withComputed
      class TestModel extends Model {
        static computed = {
          grossPrice: {
            depends: ['netPrice', 'vatRate'],
            get: function(fields) {
              return fields.netPrice * (1 + fields.vatRate / 100);
            }
          }
        };

        defaults() {
          return {
            netPrice: 0.0,
            vatRate: 0.0
          };
        }
      }

      model = new TestModel({ netPrice: 100, vatRate: 20 });
    });

    it('should used dependent fields for calculation', function() {
      expect(model.get('grossPrice')).to.equal(120);
    });
  });

  describe('when dependent field is changed', function() {
    let model;

    beforeEach(function() {
      @withComputed
      class TestModel extends Model {
        static computed = {
          grossPrice: {
            depends: ['netPrice', 'vatRate'],
            get: function(fields) {
              return fields.netPrice * (1 + fields.vatRate / 100);
            }
          }
        };

        defaults() {
          return {
            netPrice: 0.0,
            vatRate: 0.0
          };
        }
      }
      model = new TestModel({ netPrice: 100, vatRate: 20 });
    });

    describe('vatRate changed', function() {
      beforeEach(function() {
        model.set({ vatRate: 5 });
      });

      it('should calculate field value updated', function() {
        expect(model.get('grossPrice')).to.equal(105);
      });

      it('dependent field remains the same', function() {
        expect(model.get('netPrice')).to.equal(100);
      });
    });

    describe('netPrice changed', function() {
      beforeEach(function() {
        model.set({ netPrice: 200 });
      });

      it('should calculate field value updated', function() {
        expect(model.get('grossPrice')).to.equal(240);
      });

      it('dependent field remains the same', function() {
        expect(model.get('vatRate')).to.equal(20);
      });
    });
  });

  describe('when calculated field is changed', function() {
    var model;

    beforeEach(function() {
      @withComputed
      class TestModel extends Model {
        static computed = {
          grossPrice: {
            depends: ['netPrice', 'vatRate'],
            get: function(fields) {
              return fields.netPrice * (1 + fields.vatRate / 100);
            },
            set: function(value, fields) {
              fields.netPrice = value / (1 + fields.vatRate / 100);
            }
          }
        };

        defaults() {
          return {
            netPrice: 0.0,
            vatRate: 0.0
          };
        }
      }

      model = new TestModel({ netPrice: 100, vatRate: 20 });

      model.set({ grossPrice: 80 });
    });

    it('should update dependent field', function() {
      expect(model.get('netPrice')).to.equal(80 / (1 + 20 / 100));
    });
  });

  describe('when model changing', function() {
    let model;

    beforeEach(function() {
      @withComputed
      class TestModel extends Model {
        static computed = {
          grossPrice: {
            depends: ['netPrice', 'vatRate'],
            get: function(fields) {
              return fields.netPrice * (1 + fields.vatRate / 100);
            },
            set: function(value, fields) {
              fields.netPrice = value / (1 + fields.vatRate / 100);
            }
          }
        };

        defaults() {
          return {
            netPrice: 0.0,
            vatRate: 0.0
          };
        }
      }

      model = new TestModel({ vatRate: 20 });
      sinon.spy(model, 'trigger');
    });

    describe('when changing dependent field', function() {
      beforeEach(function() {
        model.set({ netPrice: 100 });
      });

      it('should netPrice change event trigger', function() {
        expect(model.trigger.calledWith('change:netPrice')).to.equal(true);
      });

      it('should grossPrice change event trigger', function() {
        expect(model.trigger.calledWith('change:grossPrice')).to.equal(true);
      });

      it('should vatRate be silent', function() {
        expect(model.trigger.calledWith('change:vatRate')).to.equal(false);
      });

      it('should model change event triggered', function() {
        expect(model.trigger.calledWith('change')).to.equal(true);
      });

      describe('when changing dependent field', function() {
        beforeEach(function() {
          model.trigger.resetHistory();
          model.set({ vatRate: 5 });
        });

        it('should netPrice be silent', function() {
          expect(model.trigger.calledWith('change:netPrice')).to.equal(false);
        });
      });
    });

    describe('when changing calculated field', function() {
      beforeEach(function() {
        model.set({ grossPrice: 80 });
      });

      it('should grossPrice change event trigger', function() {
        expect(model.trigger.calledWith('change:grossPrice')).to.equal(true);
      });

      it('should netPrice change event trigger', function() {
        expect(model.trigger.calledWith('change:netPrice')).to.equal(true);
      });

      it('should vatRate field remains silent', function() {
        expect(model.trigger.calledWith('change:vatRate')).to.equal(false);
      });

      it('should model change event triggered', function() {
        expect(model.trigger.calledWith('change')).to.equal(true);
      });
    });

    describe('when changing ordinar field', function() {
      beforeEach(function() {
        model.set({ name: 'Super Product' });
      });

      it('should not grossPrice change event trigger', function() {
        expect(model.trigger.calledWith('change:grossPrice')).to.equal(false);
      });

      it('should not netPrice change event trigger', function() {
        expect(model.trigger.calledWith('change:netPrice')).to.equal(false);
      });

      it('should not vatRate field remains silent', function() {
        expect(model.trigger.calledWith('change:vatRate')).to.equal(false);
      });

      it('should model change event triggered', function() {
        expect(model.trigger.calledWith('change')).to.equal(true);
      });
    });
  });

  describe('when model serialized to JSON', function() {
    var json, model;

    beforeEach(function() {
      @withComputed
      class TestModel extends Model {
        static computed = {
          grossPrice: {
            depends: ['netPrice', 'vatRate'],
            get: function(fields) {
              return fields.netPrice * (1 + fields.vatRate / 100);
            },
            set: function(value, fields) {
              fields.netPrice = value / (1 + fields.vatRate / 100);
            }
          }
        };
        defaults() {
          return {
            netPrice: 0.0,
            vatRate: 0.0
          };
        }
      }

      model = new TestModel({ netPrice: 100, vatRate: 20 });
      json = model.toJSON();
    });

    it('should computed field stripped out of JSON by default', function() {
      expect(json.grossPrice).to.not.be.ok;
    });

    describe('when toJSON is true', function() {
      beforeEach(function() {
        @withComputed
        class TestModel extends Model {
          static computed = {
            grossPrice: {
              depends: ['netPrice', 'vatRate'],
              get: function(fields) {
                return fields.netPrice * (1 + fields.vatRate / 100);
              },
              set: function(value, fields) {
                fields.netPrice = value / (1 + fields.vatRate / 100);
              },
              toJSON: true
            }
          };

          defaults() {
            return {
              netPrice: 0.0,
              vatRate: 0.0
            };
          }
        }

        model = new TestModel({ netPrice: 100, vatRate: 20 });

        json = model.toJSON();
      });

      it('should computed field be part of JSON', function() {
        expect(json.grossPrice).to.be.ok;
      });
    });

    describe('when computed is overriden by computed option', function() {
      beforeEach(function() {
        @withComputed
        class TestModel extends Model {
          static computed = {
            grossPrice: {
              depends: ['netPrice', 'vatRate'],
              get: function(fields) {
                return fields.netPrice * (1 + fields.vatRate / 100);
              },
              set: function(value, fields) {
                fields.netPrice = value / (1 + fields.vatRate / 100);
              },
              toJSON: false
            }
          };

          defaults() {
            return {
              netPrice: 0.0,
              vatRate: 0.0
            };
          }
        }

        model = new TestModel({ netPrice: 100, vatRate: 20 });
        json = model.toJSON({ computed: true });
      });

      it('should computed field be part of JSON', function() {
        expect(json.grossPrice).to.be.ok;
      });
    });
  });

  describe('when ComputedFields initialized in Backbone.Model via Backbone.Collection', function() {
    var model, collection;

    beforeEach(function() {
      @withComputed
      class TestModel extends Model {
        static computed = {
          grossPrice: {
            depends: ['netPrice'],
            get: function(fields) {
              return fields.netPrice * 2;
            }
          }
        };

        defaults() {
          return {
            netPrice: 100
          };
        }
      }

      class TestCollection extends Collection {
        static model = TestModel;
      }

      collection = new TestCollection();
      collection.push({ netPrice: 100 }, { wait: true });
      model = collection.at(0);
    });

    it('should be initialized', function() {
      expect(model.computedFields).to.exist;
    });

    it('should get value of computed field', function() {
      expect(model.get('grossPrice')).to.equal(200);
    });
  });

  describe('when computed model is validating', function() {
    var model;

    beforeEach(function() {
      @withComputed
      class TestModel extends Model {
        static computed = {
          grossPrice: {
            depends: ['netPrice', 'vatRate'],
            get: function(fields) {
              return fields.netPrice * (1 + fields.vatRate / 100);
            },
            set: function(value, fields) {
              fields.netPrice = value / (1 + fields.vatRate / 100);
            }
          }
        };

        defaults() {
          return {
            netPrice: 0.0,
            vatRate: 0.0
          };
        }

        validate() {
          var errors = [];
          if ((attrs.netPrice && !_.isNumber(attrs.netPrice)) || attrs.netPrice < 0) {
            errors.push('netPrice is invalid');
          }

          if ((attrs.grossPrice && !_.isNumber(attrs.grossPrice)) || attrs.grossPrice < 0) {
            errors.push('grossPrice is invalid');
          }

          return errors.length > 0 ? errors : false;
        }
      }

      model = new TestModel({ netPrice: 100, vatRate: 20 });
    });

    it('it should be initially in correct state', function() {
      expect(model.get('netPrice')).to.equal(100);
      expect(model.get('grossPrice')).to.equal(120);
    });
  });

  describe('when depends on external', function() {
    let model, getSpy, callback;

    beforeEach(function() {
      getSpy = sinon.spy(function() {
        return this.external.get('value');
      });
      callback = function(callback) {
        this.external.on('change:value', callback);
      };

      @withComputed
      class TestModel extends Model {
        static computed = {
          grossPrice: {
            depends: ['netPrice', 'vatRate', callback],
            get: getSpy
          }
        };

        defaults() {
          return {
            name: null,
            netPrice: 0.0,
            vatRate: 0.0
          };
        }

        initialize() {
          this.external = new Model({ value: 0 });
        }
      }

      model = new TestModel({ netPrice: 100, vatRate: 20 });
    });

    it('should have correct external value', function() {
      expect(model.get('grossPrice')).to.equal(0);
    });

    describe('and external changed', function() {
      beforeEach(function() {
        model.external.set({ value: 1 });
      });

      it('should computed field updated', function() {
        expect(model.get('grossPrice')).to.equal(1);
      });
    });

    it('should not pass the depends function as a field', function() {
      model.set('netPrice', '100');
      expect(getSpy.firstCall.args[0]).to.not.contain.key(callback.toString());
    });
  });

  describe('when using shorthand syntax', function() {
    describe('and dependent field is changed', function() {
      let model;

      beforeEach(function() {
        @withComputed
        class TestModel extends Model {
          static computed = {
            grossPrice: [
              'netPrice',
              'vatRate',
              function(fields) {
                return fields.netPrice * (1 + fields.vatRate / 100);
              }
            ]
          };

          defaults() {
            return {
              netPrice: 0.0,
              vatRate: 0.0
            };
          }
        }
        model = new TestModel({ netPrice: 100, vatRate: 20 });
      });

      describe('vatRate changed', function() {
        beforeEach(function() {
          model.set({ vatRate: 5 });
        });

        it('should calculate field value updated', function() {
          expect(model.get('grossPrice')).to.equal(105);
        });

        it('dependent field remains the same', function() {
          expect(model.get('netPrice')).to.equal(100);
        });
      });

      describe('netPrice changed', function() {
        beforeEach(function() {
          model.set({ netPrice: 200 });
        });

        it('should calculate field value updated', function() {
          expect(model.get('grossPrice')).to.equal(240);
        });

        it('dependent field remains the same', function() {
          expect(model.get('vatRate')).to.equal(20);
        });
      });
    });

    describe('and calculated field is changed', function() {
      var model;

      beforeEach(function() {
        @withComputed
        class TestModel extends Model {
          static computed = {
            grossPrice: [
              'netPrice',
              'vatRate',
              function(fields) {
                return fields.netPrice * (1 + fields.vatRate / 100);
              },
              function(value, fields) {
                fields.netPrice = value / (1 + fields.vatRate / 100);
              }
            ]
          };

          defaults() {
            return {
              netPrice: 0.0,
              vatRate: 0.0
            };
          }
        }

        model = new TestModel({ netPrice: 100, vatRate: 20 });

        model.set({ grossPrice: 80 });
      });

      it('should update dependent field', function() {
        expect(model.get('netPrice')).to.equal(80 / (1 + 20 / 100));
      });
    });
  });
});
