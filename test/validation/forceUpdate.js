
module.exports = {
	"forceUpdate": {
		beforeEach: function () {
            @validation({
                name: {
                    required: true
                }
            })
            class Model extends Backbone.Model {}

            this.model = new Model();
        },

		"default behaviour": {
			"invalid values are not set on model": function () {
				refute(this.model.set({ name: '' }, { validate: true }));
			}
		},

		"forcing update when setting attribute": {
			"invalid values are set on model": function () {
				assert(this.model.set({ name: '' }, { forceUpdate: true, validate: true }));
			}
		},

		"forcing update globally": {
			beforeEach: function () {
			  Backbone.Validation.options.forceUpdate = true;
			},

			afterEach: function () {
        Backbone.Validation.options.forceUpdate = false;				
			},

			"invalid values are set on model": function () {
				assert(this.model.set({ name: '' }, { validate: true }));
			}
		}
	}
}