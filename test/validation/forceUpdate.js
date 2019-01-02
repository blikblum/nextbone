
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
			beforeEach: function () {
				
			},

			"invalid values are not set on model": function () {
				refute(this.model.set({ name: '' }, { validate: true }));
			}
		},

		"forcing update when setting attribute": {
			beforeEach: function () {
				
			},

			"invalid values are set on model": function () {
				assert(this.model.set({ name: '' }, { forceUpdate: true, validate: true }));
			}
		},

		"forcing update globally": {
			beforeEach: function () {
				Backbone.Validation.configure({
					forceUpdate: true
				});
				
			},

			afterEach: function () {
				Backbone.Validation.configure({
					forceUpdate: false
				});
			},

			"invalid values are set on model": function () {
				assert(this.model.set({ name: '' }, { validate: true }));
			}
		}
	}
}