module.exports = {
	"forceUpdate": {
		beforeEach: function () {
			var Model = Backbone.Model.extend({
				validation: {
					name: {
						required: true
					}
				}
			});
			this.model = new Model();			
		},

		"default behaviour": {
			beforeEach: function () {
				_.extend(this.model, Backbone.Validation.mixin);
			},

			"invalid values are not set on model": function () {
				refute(this.model.set({ name: '' }, { validate: true }));
			}
		},

		"forcing update when setting attribute": {
			beforeEach: function () {
				_.extend(this.model, Backbone.Validation.mixin);
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
				_.extend(this.model, Backbone.Validation.mixin);
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