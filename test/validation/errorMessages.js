module.exports = {
    "Specifying error messages": {
        beforeEach: function () {
            this.model = new Backbone.Model();
            this.invalid = sinon.spy();
            _.extend(this.model, Backbone.Validation.mixin);
        },

        "per validator": {
            beforeEach: function () {
                this.model.validation = {
                    email: [{
                        required: true,
                        msg: 'required'
                    }, {
                        pattern: 'email',
                        msg: function () {
                            return 'pattern';
                        }
                    }]
                };
            },

            "and violating first validator returns msg specified for first validator": function () {
                this.model.set({ email: '' }, { validate: true, invalid: this.invalid });

                assert(this.invalid.calledWith('email', 'required'));
            },

            "and violating second validator returns msg specified for second validator": function () {
                this.model.set({ email: 'a' }, { validate: true, invalid: this.invalid });

                assert(this.invalid.calledWith('email', 'pattern'));
            }
        },

        "per attribute": {
            beforeEach: function () {
                this.model.validation = {
                    email: {
                        required: true,
                        pattern: 'email',
                        msg: 'error'
                    }
                };
            },

            "and violating first validator returns msg specified for attribute": function () {
                this.model.set({ email: '' }, { validate: true, invalid: this.invalid });

                assert(this.invalid.calledWith('email', 'error'));
            },

            "and violating second validator returns msg specified for attribute": function () {
                this.model.set({ email: 'a' }, { validate: true, invalid: this.invalid });

                assert(this.invalid.calledWith('email', 'error'));
            }
        }
    }
}
