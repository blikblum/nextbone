module.exports = {
    "Backbone.Validation events": {
        beforeEach: function () {
            var Model = Backbone.Model.extend({
                validation: {
                    age: function (val) {
                        if (!val) {
                            return 'age';
                        }
                    },
                    name: function (val) {
                        if (!val) {
                            return 'name';
                        }
                    }
                }
            });

            this.model = new Model();
            _.extend(this.model, Backbone.Validation.mixin);
        },

        "model is updated before the events are raised": function () {
            this.model.on('change', function () {
                assert.equals(1, this.model.get('age'));
            }, this);

            this.model.on('validated', function () {
                assert.equals(1, this.model.get('age'));
            }, this);

            this.model.on('validated:valid', function () {
                assert.equals(1, this.model.get('age'));
            }, this);

            this.model.set({
                age: 1,
                name: 'name'
            }, { validate: true });
        },

        "when model is valid": {
            "validated event is triggered with true and model": function (done) {
                this.model.on('validated', function (valid, model) {
                    assert(valid);
                    assert.same(this.model, model);
                    done();
                }, this);

                this.model.set({
                    age: 1,
                    name: 'name'
                }, { validate: true });
            },

            "validated:valid event is triggered with model": function (done) {
                this.model.on('validated:valid', function (model) {
                    assert.same(this.model, model);
                    done();
                }, this);

                this.model.set({
                    age: 1,
                    name: 'name'
                }, { validate: true });
            }
        },

        "when one invalid value is set": {
            "validated event is triggered with false, model and an object with the names of the attributes with error": function (done) {
                this.model.on('validated', function (valid, model, attr) {
                    refute(valid);
                    assert.same(this.model, model);
                    assert.equals({ age: 'age', name: 'name' }, attr);
                    done();
                }, this);

                this.model.set({ age: 0 }, { validate: true });
            },

            "validated:invalid event is triggered with model and an object with the names of the attributes with error": function (done) {
                this.model.on('validated:invalid', function (model, attr) {
                    assert.same(this.model, model);
                    assert.equals({ age: 'age', name: 'name' }, attr);
                    done();
                }, this);

                this.model.set({ age: 0 }, { validate: true });
            },

            "invalid event is triggered with model and an object with the names of the attributes with error": function (done) {
                this.model.on('invalid', function (model, attr) {
                    assert.same(this.model, model);
                    assert.equals({ age: 'age', name: 'name' }, attr);
                    done();
                }, this);

                this.model.set({ age: 0 }, { validate: true });
            }
        },

        "when one valid value is set": {
            "validated event is triggered with false, model and an object with the names of the attributes with error": function (done) {
                this.model.on('validated', function (valid, model, attrs) {
                    refute(valid);
                    assert.same(this.model, model);
                    assert.equals({ name: 'name' }, attrs);
                    done();
                }, this);

                this.model.set({
                    age: 1
                }, { validate: true });
            },

            "validated:invalid event is triggered with model and an object with the names of the attributes with error": function (done) {
                this.model.on('validated:invalid', function (model, attrs) {
                    assert.same(this.model, model);
                    assert.equals({ name: 'name' }, attrs);
                    done();
                }, this);

                this.model.set({
                    age: 1
                }, { validate: true });
            }
        }
    }
}