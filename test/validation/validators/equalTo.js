module.exports = {"equalTo validator": {
    beforeEach: function() {
        var that = this;
        var Model = Backbone.Model.extend({
            validation: {
                password: {
                    required: true
                },
                passwordRepeat: {
                    equalTo: 'password'
                }
            }
        });

        this.model = new Model();
        _.extend(this.model, Backbone.Validation.mixin);

        this.model.set({password: 'password'});
    },

    "has default error message": function(done) {
        this.model.on('validated:invalid', function(model, error){
            assert.equals({passwordRepeat: 'Password repeat must be the same as Password'}, error);
            done();
        });
        this.model.set({passwordRepeat:'123'}, {validate: true});
    },

    "value equal to (===) the specified attribute is valid": function(){
        assert(this.model.set({
            passwordRepeat: 'password'
        }, {validate: true}));
    },

    "value not equal to (!==) the specified attribute is invalid": function(){
        refute(this.model.set({
            passwordRepeat: 'error'
        }, {validate: true}));
    },

    "is case sensitive": function(){
        refute(this.model.set({
            passwordRepeat: 'Password'
        }, {validate: true}));
    },

    "setting both at the same time to the same value is valid": function() {
        assert(this.model.set({
            password: 'a',
            passwordRepeat: 'a'
        }, {validate: true}));
    }
}
}
