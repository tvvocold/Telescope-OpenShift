(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var Accounts = Package['accounts-base'].Accounts;
var check = Package.check.check;
var Match = Package.check.Match;
var _ = Package.underscore._;
var Router = Package['iron:router'].Router;
var RouteController = Package['iron:router'].RouteController;
var ReactiveVar = Package['reactive-var'].ReactiveVar;
var Iron = Package['iron:core'].Iron;

/* Package-scope variables */
var AccountsTemplates, Field, STATE_PAT, ERRORS_PAT, INFO_PAT, INPUT_ICONS_PAT, ObjWithStringValues, TEXTS_PAT, CONFIG_PAT, FIELD_SUB_PAT, FIELD_PAT, AT;

(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/useraccounts:core/lib/field.js                                                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
// ---------------------------------------------------------------------------------                                // 1
                                                                                                                    // 2
// Field object                                                                                                     // 3
                                                                                                                    // 4
// ---------------------------------------------------------------------------------                                // 5
                                                                                                                    // 6
                                                                                                                    // 7
Field = function(field){                                                                                            // 8
    check(field, FIELD_PAT);                                                                                        // 9
    _.defaults(this, field);                                                                                        // 10
                                                                                                                    // 11
    this.validating = new ReactiveVar(false);                                                                       // 12
    this.status = new ReactiveVar(null);                                                                            // 13
};                                                                                                                  // 14
                                                                                                                    // 15
if (Meteor.isClient)                                                                                                // 16
    Field.prototype.clearStatus = function(){                                                                       // 17
        return this.status.set(null);                                                                               // 18
    };                                                                                                              // 19
if (Meteor.isServer)                                                                                                // 20
    Field.prototype.clearStatus = function(){                                                                       // 21
        // Nothing to do server-side                                                                                // 22
        return                                                                                                      // 23
    };                                                                                                              // 24
                                                                                                                    // 25
Field.prototype.fixValue = function(value){                                                                         // 26
    if (this.type === "checkbox")                                                                                   // 27
        return !!value;                                                                                             // 28
    if (this.type === "select")                                                                                     // 29
        // TODO: something working...                                                                               // 30
        return value;                                                                                               // 31
    if (this.type === "radio")                                                                                      // 32
        // TODO: something working...                                                                               // 33
        return value;                                                                                               // 34
    // Possibly applies required transformations to the input value                                                 // 35
    if (this.trim)                                                                                                  // 36
        value = value.trim();                                                                                       // 37
    if (this.lowercase)                                                                                             // 38
        value = value.toLowerCase();                                                                                // 39
    if (this.uppercase)                                                                                             // 40
        value = value.toUpperCase();                                                                                // 41
    return value;                                                                                                   // 42
};                                                                                                                  // 43
                                                                                                                    // 44
if (Meteor.isClient)                                                                                                // 45
    Field.prototype.getDisplayName = function(state){                                                               // 46
        var dN = this.displayName;                                                                                  // 47
        if (_.isObject(dN))                                                                                         // 48
            dN = dN[state] || dN["default"];                                                                        // 49
        if (!dN)                                                                                                    // 50
            dN = this._id;                                                                                          // 51
        return dN;                                                                                                  // 52
    };                                                                                                              // 53
                                                                                                                    // 54
if (Meteor.isClient)                                                                                                // 55
    Field.prototype.getPlaceholder = function(state){                                                               // 56
        var placeholder = this.placeholder;                                                                         // 57
        if (_.isObject(placeholder))                                                                                // 58
            placeholder = placeholder[state] || placeholder["default"];                                             // 59
        if (!placeholder)                                                                                           // 60
            placeholder = this._id;                                                                                 // 61
        return placeholder;                                                                                         // 62
    };                                                                                                              // 63
                                                                                                                    // 64
Field.prototype.getStatus = function(){                                                                             // 65
    return this.status.get();                                                                                       // 66
};                                                                                                                  // 67
                                                                                                                    // 68
if (Meteor.isClient)                                                                                                // 69
    Field.prototype.getValue = function(tempalteInstance){                                                          // 70
        if (this.type === "checkbox")                                                                               // 71
            return !!(tempalteInstance.$("#at-field-" + this._id + ":checked").val());                              // 72
        if (this.type === "radio")                                                                                  // 73
            return tempalteInstance.$("[name=at-field-"+ this._id + "]:checked").val();                             // 74
        return tempalteInstance.$("#at-field-" + this._id).val();                                                   // 75
    };                                                                                                              // 76
                                                                                                                    // 77
if (Meteor.isClient)                                                                                                // 78
    Field.prototype.hasError = function() {                                                                         // 79
        return this.negativeValidation && this.status.get();                                                        // 80
    };                                                                                                              // 81
                                                                                                                    // 82
if (Meteor.isClient)                                                                                                // 83
    Field.prototype.hasIcon = function(){                                                                           // 84
        if (this.showValidating && this.isValidating())                                                             // 85
            return true;                                                                                            // 86
        if (this.negativeFeedback && this.hasError())                                                               // 87
            return true;                                                                                            // 88
        if (this.positiveFeedback && this.hasSuccess())                                                             // 89
            return true;                                                                                            // 90
    };                                                                                                              // 91
                                                                                                                    // 92
if (Meteor.isClient)                                                                                                // 93
    Field.prototype.hasSuccess = function() {                                                                       // 94
        return this.positiveValidation && this.status.get() === false;                                              // 95
    };                                                                                                              // 96
                                                                                                                    // 97
if (Meteor.isClient)                                                                                                // 98
    Field.prototype.iconClass = function(){                                                                         // 99
        if (this.isValidating())                                                                                    // 100
            return AccountsTemplates.texts.inputIcons["isValidating"];                                              // 101
        if (this.hasError())                                                                                        // 102
            return AccountsTemplates.texts.inputIcons["hasError"];                                                  // 103
        if (this.hasSuccess())                                                                                      // 104
            return AccountsTemplates.texts.inputIcons["hasSuccess"];                                                // 105
    };                                                                                                              // 106
                                                                                                                    // 107
if (Meteor.isClient)                                                                                                // 108
    Field.prototype.isValidating = function(){                                                                      // 109
        return this.validating.get();                                                                               // 110
    };                                                                                                              // 111
                                                                                                                    // 112
if (Meteor.isClient)                                                                                                // 113
    Field.prototype.setError = function(err){                                                                       // 114
        check(err, Match.OneOf(String, undefined));                                                                 // 115
        return this.status.set(err || true);                                                                        // 116
    };                                                                                                              // 117
if (Meteor.isServer)                                                                                                // 118
    Field.prototype.setError = function(err){                                                                       // 119
        // Nothing to do server-side                                                                                // 120
        return;                                                                                                     // 121
    };                                                                                                              // 122
                                                                                                                    // 123
if (Meteor.isClient)                                                                                                // 124
    Field.prototype.setSuccess = function(){                                                                        // 125
        return this.status.set(false);                                                                              // 126
    };                                                                                                              // 127
if (Meteor.isServer)                                                                                                // 128
    Field.prototype.setSuccess = function(){                                                                        // 129
        // Nothing to do server-side                                                                                // 130
        return;                                                                                                     // 131
    };                                                                                                              // 132
                                                                                                                    // 133
                                                                                                                    // 134
if (Meteor.isClient)                                                                                                // 135
    Field.prototype.setValidating = function(state){                                                                // 136
        check(state, Boolean);                                                                                      // 137
        return this.validating.set(state);                                                                          // 138
    };                                                                                                              // 139
if (Meteor.isServer)                                                                                                // 140
    Field.prototype.setValidating = function(state){                                                                // 141
        // Nothing to do server-side                                                                                // 142
        return;                                                                                                     // 143
    };                                                                                                              // 144
                                                                                                                    // 145
if (Meteor.isClient)                                                                                                // 146
    Field.prototype.setValue = function(tempalteInstance, value){                                                   // 147
        if (this.type === "checkbox") {                                                                             // 148
            tempalteInstance.$("#at-field-" + this._id).prop('checked', true);                                      // 149
            return;                                                                                                 // 150
        }                                                                                                           // 151
        if (this.type === "radio") {                                                                                // 152
            tempalteInstance.$("[name=at-field-"+ this._id + "]").prop('checked', true);                            // 153
            return;                                                                                                 // 154
        }                                                                                                           // 155
        tempalteInstance.$("#at-field-" + this._id).val(value);                                                     // 156
    };                                                                                                              // 157
                                                                                                                    // 158
Field.prototype.validate = function(value, strict) {                                                                // 159
    check(value, Match.OneOf(undefined, String, Boolean));                                                          // 160
    this.setValidating(true);                                                                                       // 161
    this.clearStatus();                                                                                             // 162
    if (!value){                                                                                                    // 163
        if (!!strict){                                                                                              // 164
            if (this.required) {                                                                                    // 165
                this.setError("Required Field");                                                                    // 166
                this.setValidating(false);                                                                          // 167
                return "Required Field";                                                                            // 168
            }                                                                                                       // 169
            else {                                                                                                  // 170
                this.setSuccess();                                                                                  // 171
                this.setValidating(false);                                                                          // 172
                return false;                                                                                       // 173
            }                                                                                                       // 174
        }                                                                                                           // 175
        else {                                                                                                      // 176
            this.clearStatus();                                                                                     // 177
            this.setValidating(false);                                                                              // 178
            return null;                                                                                            // 179
        }                                                                                                           // 180
    }                                                                                                               // 181
    var valueLength = value.length;                                                                                 // 182
    var minLength = this.minLength;                                                                                 // 183
    if (minLength && valueLength < minLength) {                                                                     // 184
        this.setError("Minimum required length: " + minLength);                                                     // 185
        this.setValidating(false);                                                                                  // 186
        return "Minimum required length: " + minLength;                                                             // 187
    }                                                                                                               // 188
    var maxLength = this.maxLength;                                                                                 // 189
    if (maxLength && valueLength > maxLength) {                                                                     // 190
        this.setError("Maximum allowed length: " + maxLength);                                                      // 191
        this.setValidating(false);                                                                                  // 192
        return "Maximum allowed length: " + maxLength;                                                              // 193
    }                                                                                                               // 194
    if (this.re && valueLength && !value.match(this.re)) {                                                          // 195
        this.setError(this.errStr);                                                                                 // 196
        this.setValidating(false);                                                                                  // 197
        return this.errStr;                                                                                         // 198
    }                                                                                                               // 199
    if (this.func && valueLength){                                                                                  // 200
        var result = this.func(value);                                                                              // 201
        var err = result === true ? this.errStr || true : result;                                                   // 202
        if (result === undefined)                                                                                   // 203
            return err;                                                                                             // 204
        this.status.set(err);                                                                                       // 205
        this.setValidating(false);                                                                                  // 206
        return err;                                                                                                 // 207
    }                                                                                                               // 208
    this.setSuccess();                                                                                              // 209
    this.setValidating(false);                                                                                      // 210
    return false;                                                                                                   // 211
};                                                                                                                  // 212
                                                                                                                    // 213
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/useraccounts:core/lib/core.js                                                                           //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
// ---------------------------------------------------------------------------------                                // 1
                                                                                                                    // 2
// Patterns for methods" parameters                                                                                 // 3
                                                                                                                    // 4
// ---------------------------------------------------------------------------------                                // 5
                                                                                                                    // 6
STATE_PAT = {                                                                                                       // 7
    changePwd: Match.Optional(String),                                                                              // 8
    enrollAccount: Match.Optional(String),                                                                          // 9
    forgotPwd: Match.Optional(String),                                                                              // 10
    resetPwd: Match.Optional(String),                                                                               // 11
    signIn: Match.Optional(String),                                                                                 // 12
    signUp: Match.Optional(String),                                                                                 // 13
};                                                                                                                  // 14
                                                                                                                    // 15
ERRORS_PAT = {                                                                                                      // 16
    mustBeLoggedIn: Match.Optional(String),                                                                         // 17
    pwdMismatch: Match.Optional(String),                                                                            // 18
};                                                                                                                  // 19
                                                                                                                    // 20
INFO_PAT = {                                                                                                        // 21
    emailSent: Match.Optional(String),                                                                              // 22
    emailVerified: Match.Optional(String),                                                                          // 23
    pwdChanged: Match.Optional(String),                                                                             // 24
    pwdReset: Match.Optional(String),                                                                               // 25
    pwdSet: Match.Optional(String),                                                                                 // 26
    signUpVerifyEmail: Match.Optional(String),                                                                      // 27
};                                                                                                                  // 28
                                                                                                                    // 29
INPUT_ICONS_PAT = {                                                                                                 // 30
    isValidating: Match.Optional(String),                                                                           // 31
    hasError: Match.Optional(String),                                                                               // 32
    hasSuccess: Match.Optional(String),                                                                             // 33
};                                                                                                                  // 34
                                                                                                                    // 35
ObjWithStringValues = Match.Where(function (x) {                                                                    // 36
    check(x, Object);                                                                                               // 37
    _.each(_.values(x), function(value){                                                                            // 38
        check(value, String);                                                                                       // 39
    });                                                                                                             // 40
    return true;                                                                                                    // 41
});                                                                                                                 // 42
                                                                                                                    // 43
TEXTS_PAT = {                                                                                                       // 44
    button: Match.Optional(STATE_PAT),                                                                              // 45
    errors: Match.Optional(ERRORS_PAT),                                                                             // 46
    navSignIn: Match.Optional(String),                                                                              // 47
    navSignOut: Match.Optional(String),                                                                             // 48
    info: Match.Optional(INFO_PAT),                                                                                 // 49
    inputIcons: Match.Optional(INPUT_ICONS_PAT),                                                                    // 50
    optionalField: Match.Optional(String),                                                                          // 51
    pwdLink_pre: Match.Optional(String),                                                                            // 52
    pwdLink_link: Match.Optional(String),                                                                           // 53
    pwdLink_suff: Match.Optional(String),                                                                           // 54
    sep: Match.Optional(String),                                                                                    // 55
    signInLink_pre: Match.Optional(String),                                                                         // 56
    signInLink_link: Match.Optional(String),                                                                        // 57
    signInLink_suff: Match.Optional(String),                                                                        // 58
    signUpLink_pre: Match.Optional(String),                                                                         // 59
    signUpLink_link: Match.Optional(String),                                                                        // 60
    signUpLink_suff: Match.Optional(String),                                                                        // 61
    socialAdd: Match.Optional(String),                                                                              // 62
    socialConfigure: Match.Optional(String),                                                                        // 63
    socialIcons: Match.Optional(ObjWithStringValues),                                                               // 64
    socialRemove: Match.Optional(String),                                                                           // 65
    socialSignIn: Match.Optional(String),                                                                           // 66
    socialSignUp: Match.Optional(String),                                                                           // 67
    socialWith: Match.Optional(String),                                                                             // 68
    termsPreamble: Match.Optional(String),                                                                          // 69
    termsPrivacy: Match.Optional(String),                                                                           // 70
    termsAnd: Match.Optional(String),                                                                               // 71
    termsTerms: Match.Optional(String),                                                                             // 72
    title: Match.Optional(STATE_PAT),                                                                               // 73
};                                                                                                                  // 74
                                                                                                                    // 75
// Configuration pattern to be checked with check                                                                   // 76
CONFIG_PAT = {                                                                                                      // 77
    // Behaviour                                                                                                    // 78
    confirmPassword: Match.Optional(Boolean),                                                                       // 79
    defaultState: Match.Optional(String),                                                                           // 80
    enablePasswordChange: Match.Optional(Boolean),                                                                  // 81
    enforceEmailVerification: Match.Optional(Boolean),                                                              // 82
    forbidClientAccountCreation: Match.Optional(Boolean),                                                           // 83
    overrideLoginErrors: Match.Optional(Boolean),                                                                   // 84
    sendVerificationEmail: Match.Optional(Boolean),                                                                 // 85
    socialLoginStyle: Match.Optional(Match.OneOf("popup", "redirect")),                                             // 86
                                                                                                                    // 87
    // Appearance                                                                                                   // 88
    defaultLayout: Match.Optional(String),                                                                          // 89
    showAddRemoveServices: Match.Optional(Boolean),                                                                 // 90
    showForgotPasswordLink: Match.Optional(Boolean),                                                                // 91
    showLabels: Match.Optional(Boolean),                                                                            // 92
    showPlaceholders: Match.Optional(Boolean),                                                                      // 93
    hideSignInLink: Match.Optional(Boolean),                                                                        // 94
    hideSignUpLink: Match.Optional(Boolean),                                                                        // 95
                                                                                                                    // 96
    // Client-side Validation                                                                                       // 97
    continuousValidation: Match.Optional(Boolean),                                                                  // 98
    negativeFeedback: Match.Optional(Boolean),                                                                      // 99
    negativeValidation: Match.Optional(Boolean),                                                                    // 100
    positiveValidation: Match.Optional(Boolean),                                                                    // 101
    positiveFeedback: Match.Optional(Boolean),                                                                      // 102
    showValidating: Match.Optional(Boolean),                                                                        // 103
                                                                                                                    // 104
    // Privacy Policy and Terms of Use                                                                              // 105
    privacyUrl: Match.Optional(String),                                                                             // 106
    termsUrl: Match.Optional(String),                                                                               // 107
                                                                                                                    // 108
    // Redirects                                                                                                    // 109
    homeRoutePath: Match.Optional(String),                                                                          // 110
    redirectTimeout: Match.Optional(Number),                                                                        // 111
                                                                                                                    // 112
    // Hooks                                                                                                        // 113
    onSubmitHook: Match.Optional(Function),                                                                         // 114
    onLogoutHook: Match.Optional(Function),                                                                         // 115
                                                                                                                    // 116
    texts: Match.Optional(TEXTS_PAT),                                                                               // 117
};                                                                                                                  // 118
                                                                                                                    // 119
                                                                                                                    // 120
FIELD_SUB_PAT = {                                                                                                   // 121
    "default": Match.Optional(String),                                                                              // 122
    changePwd: Match.Optional(String),                                                                              // 123
    enrollAccount: Match.Optional(String),                                                                          // 124
    forgotPwd: Match.Optional(String),                                                                              // 125
    resetPwd: Match.Optional(String),                                                                               // 126
    signIn: Match.Optional(String),                                                                                 // 127
    signUp: Match.Optional(String),                                                                                 // 128
};                                                                                                                  // 129
                                                                                                                    // 130
                                                                                                                    // 131
// Field pattern                                                                                                    // 132
FIELD_PAT = {                                                                                                       // 133
    _id: String,                                                                                                    // 134
    type: String,                                                                                                   // 135
    required: Match.Optional(Boolean),                                                                              // 136
    displayName: Match.Optional(Match.OneOf(String, FIELD_SUB_PAT)),                                                // 137
    placeholder: Match.Optional(Match.OneOf(String, FIELD_SUB_PAT)),                                                // 138
    select: Match.Optional([{text: String, value: Match.Any}]),                                                     // 139
    minLength: Match.Optional(Match.Integer),                                                                       // 140
    maxLength: Match.Optional(Match.Integer),                                                                       // 141
    re: Match.Optional(RegExp),                                                                                     // 142
    func: Match.Optional(Match.Where(_.isFunction)),                                                                // 143
    errStr: Match.Optional(String),                                                                                 // 144
                                                                                                                    // 145
    // Client-side Validation                                                                                       // 146
    continuousValidation: Match.Optional(Boolean),                                                                  // 147
    negativeFeedback: Match.Optional(Boolean),                                                                      // 148
    negativeValidation: Match.Optional(Boolean),                                                                    // 149
    positiveValidation: Match.Optional(Boolean),                                                                    // 150
    positiveFeedback: Match.Optional(Boolean),                                                                      // 151
                                                                                                                    // 152
    // Transforms                                                                                                   // 153
    trim: Match.Optional(Boolean),                                                                                  // 154
    lowercase: Match.Optional(Boolean),                                                                             // 155
    uppercase: Match.Optional(Boolean),                                                                             // 156
};                                                                                                                  // 157
                                                                                                                    // 158
// Route configuration pattern to be checked with check                                                             // 159
var ROUTE_PAT = {                                                                                                   // 160
    name: Match.Optional(String),                                                                                   // 161
    path: Match.Optional(String),                                                                                   // 162
    template: Match.Optional(String),                                                                               // 163
    layoutTemplate: Match.Optional(String),                                                                         // 164
    redirect: Match.Optional(Match.OneOf(String, Match.Where(_.isFunction))),                                       // 165
};                                                                                                                  // 166
                                                                                                                    // 167
                                                                                                                    // 168
// -----------------------------------------------------------------------------                                    // 169
                                                                                                                    // 170
// AccountsTemplates object                                                                                         // 171
                                                                                                                    // 172
// -----------------------------------------------------------------------------                                    // 173
                                                                                                                    // 174
                                                                                                                    // 175
                                                                                                                    // 176
// -------------------                                                                                              // 177
// Client/Server stuff                                                                                              // 178
// -------------------                                                                                              // 179
                                                                                                                    // 180
// Constructor                                                                                                      // 181
AT = function() {                                                                                                   // 182
                                                                                                                    // 183
};                                                                                                                  // 184
                                                                                                                    // 185
                                                                                                                    // 186
                                                                                                                    // 187
                                                                                                                    // 188
/*                                                                                                                  // 189
    Each field object is represented by the following properties:                                                   // 190
        _id:         String   (required)  // A unique field"s id / name                                             // 191
        type:        String   (required)  // Displayed input type                                                   // 192
        required:    Boolean  (optional)  // Specifies Whether to fail or not when field is left empty              // 193
        displayName: String   (optional)  // The field"s name to be displayed as a label above the input element    // 194
        placeholder: String   (optional)  // The placeholder text to be displayed inside the input element          // 195
        minLength:   Integer  (optional)  // Possibly specifies the minimum allowed length                          // 196
        maxLength:   Integer  (optional)  // Possibly specifies the maximum allowed length                          // 197
        re:          RegExp   (optional)  // Regular expression for validation                                      // 198
        func:        Function (optional)  // Custom function for validation                                         // 199
        errStr:      String   (optional)  // Error message to be displayed in case re validation fails              // 200
*/                                                                                                                  // 201
                                                                                                                    // 202
                                                                                                                    // 203
                                                                                                                    // 204
/*                                                                                                                  // 205
    Routes configuration can be done by calling AccountsTemplates.configureRoute with the route name and the        // 206
    following options in a separate object. E.g. AccountsTemplates.configureRoute("gingIn", option);                // 207
        name:           String (optional). A unique route"s name to be passed to iron-router                        // 208
        path:           String (optional). A unique route"s path to be passed to iron-router                        // 209
        template:       String (optional). The name of the template to be rendered                                  // 210
        layoutTemplate: String (optional). The name of the layout to be used                                        // 211
        redirect:       String (optional). The name of the route (or its path) where to redirect after form submit  // 212
*/                                                                                                                  // 213
                                                                                                                    // 214
                                                                                                                    // 215
// Allowed routes along with theirs default configuration values                                                    // 216
AT.prototype.ROUTE_DEFAULT = {                                                                                      // 217
    changePwd:      { name: "atChangePwd",      path: "/change-password"},                                          // 218
    enrollAccount:  { name: "atEnrollAccount",  path: "/enroll-account"},                                           // 219
    ensureSignedIn: { name: "atEnsureSignedIn", path: null},                                                        // 220
    forgotPwd:      { name: "atForgotPwd",      path: "/forgot-password"},                                          // 221
    resetPwd:       { name: "atResetPwd",       path: "/reset-password"},                                           // 222
    signIn:         { name: "atSignIn",         path: "/sign-in"},                                                  // 223
    signUp:         { name: "atSignUp",         path: "/sign-up"},                                                  // 224
    verifyEmail:    { name: "atVerifyEmail",    path: "/verify-email"},                                             // 225
};                                                                                                                  // 226
                                                                                                                    // 227
                                                                                                                    // 228
                                                                                                                    // 229
// Allowed input types                                                                                              // 230
AT.prototype.INPUT_TYPES = [                                                                                        // 231
    "checkbox",                                                                                                     // 232
    "email",                                                                                                        // 233
    "hidden",                                                                                                       // 234
    "password",                                                                                                     // 235
    "radio",                                                                                                        // 236
    "select",                                                                                                       // 237
    "tel",                                                                                                          // 238
    "text",                                                                                                         // 239
    "url",                                                                                                          // 240
];                                                                                                                  // 241
                                                                                                                    // 242
// Current configuration values                                                                                     // 243
AT.prototype.options = {                                                                                            // 244
    // Appearance                                                                                                   // 245
    //defaultLayout: undefined,                                                                                     // 246
    showAddRemoveServices: false,                                                                                   // 247
    showForgotPasswordLink: false,                                                                                  // 248
    showLabels: true,                                                                                               // 249
    showPlaceholders: true,                                                                                         // 250
                                                                                                                    // 251
    // Behaviour                                                                                                    // 252
    confirmPassword: true,                                                                                          // 253
    defaultState: "signIn",                                                                                         // 254
    enablePasswordChange: false,                                                                                    // 255
    forbidClientAccountCreation: false,                                                                             // 256
    overrideLoginErrors: true,                                                                                      // 257
    sendVerificationEmail: false,                                                                                   // 258
    socialLoginStyle: "popup",                                                                                      // 259
                                                                                                                    // 260
    // Client-side Validation                                                                                       // 261
    //continuousValidation: false,                                                                                  // 262
    //negativeFeedback: false,                                                                                      // 263
    //negativeValidation: false,                                                                                    // 264
    //positiveValidation: false,                                                                                    // 265
    //positiveFeedback: false,                                                                                      // 266
    //showValidating: false,                                                                                        // 267
                                                                                                                    // 268
    // Privacy Policy and Terms of Use                                                                              // 269
    privacyUrl: undefined,                                                                                          // 270
    termsUrl: undefined,                                                                                            // 271
                                                                                                                    // 272
    // Redirects                                                                                                    // 273
    homeRoutePath: "/",                                                                                             // 274
    redirectTimeout: 2000, // 2 seconds                                                                             // 275
                                                                                                                    // 276
    // Hooks                                                                                                        // 277
    onSubmitHook: undefined,                                                                                        // 278
};                                                                                                                  // 279
                                                                                                                    // 280
AT.prototype.SPECIAL_FIELDS = [                                                                                     // 281
    "password_again",                                                                                               // 282
    "username_and_email",                                                                                           // 283
];                                                                                                                  // 284
                                                                                                                    // 285
// SignIn / SignUp fields                                                                                           // 286
AT.prototype._fields = [                                                                                            // 287
    new Field({                                                                                                     // 288
        _id: "email",                                                                                               // 289
        type: "email",                                                                                              // 290
        required: true,                                                                                             // 291
        lowercase: true,                                                                                            // 292
        trim: true,                                                                                                 // 293
        func: function(email){                                                                                      // 294
            return !_.contains(email, '@');                                                                         // 295
        },                                                                                                          // 296
        errStr: 'Invalid email',                                                                                    // 297
    }),                                                                                                             // 298
    new Field({                                                                                                     // 299
        _id: "password",                                                                                            // 300
        type: "password",                                                                                           // 301
        required: true,                                                                                             // 302
        minLength: 6,                                                                                               // 303
        displayName: {                                                                                              // 304
            "default": "password",                                                                                  // 305
            changePwd: "newPassword",                                                                               // 306
            resetPwd: "newPassword",                                                                                // 307
        },                                                                                                          // 308
        placeholder: {                                                                                              // 309
            "default": "password",                                                                                  // 310
            changePwd: "newPassword",                                                                               // 311
            resetPwd: "newPassword",                                                                                // 312
        },                                                                                                          // 313
    }),                                                                                                             // 314
];                                                                                                                  // 315
                                                                                                                    // 316
// Configured routes                                                                                                // 317
AT.prototype.routes = {};                                                                                           // 318
                                                                                                                    // 319
AT.prototype._initialized = false;                                                                                  // 320
                                                                                                                    // 321
// Input type validation                                                                                            // 322
AT.prototype._isValidInputType = function(value) {                                                                  // 323
    return _.indexOf(this.INPUT_TYPES, value) !== -1;                                                               // 324
};                                                                                                                  // 325
                                                                                                                    // 326
AT.prototype.addField = function(field) {                                                                           // 327
    // Fields can be added only before initialization                                                               // 328
    if (this._initialized)                                                                                          // 329
        throw new Error("AccountsTemplates.addField should strictly be called before AccountsTemplates.init!");     // 330
    field = _.pick(field, _.keys(FIELD_PAT));                                                                       // 331
    check(field, FIELD_PAT);                                                                                        // 332
    // Checks there"s currently no field called field._id                                                           // 333
    if (_.indexOf(_.pluck(this._fields, "_id"), field._id) !== -1)                                                  // 334
        throw new Error("A field called " + field._id + " already exists!");                                        // 335
    // Validates field.type                                                                                         // 336
    if (!this._isValidInputType(field.type))                                                                        // 337
        throw new Error("field.type is not valid!");                                                                // 338
    // Checks field.minLength is strictly positive                                                                  // 339
    if (typeof field.minLength !== "undefined" && field.minLength <= 0)                                             // 340
        throw new Error("field.minLength should be greater than zero!");                                            // 341
    // Checks field.maxLength is strictly positive                                                                  // 342
    if (typeof field.maxLength !== "undefined" && field.maxLength <= 0)                                             // 343
        throw new Error("field.maxLength should be greater than zero!");                                            // 344
    // Checks field.maxLength is greater than field.minLength                                                       // 345
    if (typeof field.minLength !== "undefined" && typeof field.minLength !== "undefined" && field.maxLength < field.minLength)
        throw new Error("field.maxLength should be greater than field.maxLength!");                                 // 347
                                                                                                                    // 348
    if (!(Meteor.isServer && _.contains(this.SPECIAL_FIELDS, field._id)))                                           // 349
        this._fields.push(new Field(field));                                                                        // 350
    return this._fields;                                                                                            // 351
};                                                                                                                  // 352
                                                                                                                    // 353
AT.prototype.addFields = function(fields) {                                                                         // 354
    var ok;                                                                                                         // 355
    try { // don"t bother with `typeof` - just access `length` and `catch`                                          // 356
        ok = fields.length > 0 && "0" in Object(fields);                                                            // 357
    } catch (e) {                                                                                                   // 358
        throw new Error("field argument should be an array of valid field objects!");                               // 359
    }                                                                                                               // 360
    if (ok) {                                                                                                       // 361
        _.map(fields, function(field){                                                                              // 362
            this.addField(field);                                                                                   // 363
        }, this);                                                                                                   // 364
    } else                                                                                                          // 365
        throw new Error("field argument should be an array of valid field objects!");                               // 366
    return this._fields;                                                                                            // 367
};                                                                                                                  // 368
                                                                                                                    // 369
AT.prototype.configure = function(config) {                                                                         // 370
    // Configuration options can be set only before initialization                                                  // 371
    if (this._initialized)                                                                                          // 372
        throw new Error("Configuration options must be set before AccountsTemplates.init!");                        // 373
                                                                                                                    // 374
    // Updates the current configuration                                                                            // 375
    check(config, CONFIG_PAT);                                                                                      // 376
    var options = _.omit(config, "texts");                                                                          // 377
    this.options = _.defaults(options, this.options);                                                               // 378
                                                                                                                    // 379
    if (Meteor.isClient){                                                                                           // 380
        // Possibly sets up client texts...                                                                         // 381
        if (config.texts){                                                                                          // 382
            var texts = config.texts;                                                                               // 383
            var simpleTexts = _.omit(texts, "button", "errors", "info", "inputIcons", "socialIcons", "title");      // 384
            this.texts = _.defaults(simpleTexts, this.texts);                                                       // 385
                                                                                                                    // 386
            if (texts.button) {                                                                                     // 387
                // Updates the current button object                                                                // 388
                this.texts.button = _.defaults(texts.button, this.texts.button);                                    // 389
            }                                                                                                       // 390
            if (texts.errors) {                                                                                     // 391
                // Updates the current errors object                                                                // 392
                this.texts.errors = _.defaults(texts.errors, this.texts.errors);                                    // 393
            }                                                                                                       // 394
            if (texts.info) {                                                                                       // 395
                // Updates the current info object                                                                  // 396
                this.texts.info = _.defaults(texts.info, this.texts.info);                                          // 397
            }                                                                                                       // 398
            if (texts.inputIcons) {                                                                                 // 399
                // Updates the current inputIcons object                                                            // 400
                this.texts.inputIcons = _.defaults(texts.inputIcons, this.texts.inputIcons);                        // 401
            }                                                                                                       // 402
            if (texts.socialIcons) {                                                                                // 403
                // Updates the current socialIcons object                                                           // 404
                this.texts.socialIcons = _.defaults(texts.socialIcons, this.texts.socialIcons);                     // 405
            }                                                                                                       // 406
            if (texts.title) {                                                                                      // 407
                // Updates the current title object                                                                 // 408
                this.texts.title = _.defaults(texts.title, this.texts.title);                                       // 409
            }                                                                                                       // 410
        }                                                                                                           // 411
    }                                                                                                               // 412
};                                                                                                                  // 413
                                                                                                                    // 414
AT.prototype.configureRoute = function(route, options) {                                                            // 415
    check(route, String);                                                                                           // 416
    check(options, Match.OneOf(undefined, ROUTE_PAT));                                                              // 417
    options = _.clone(options);                                                                                     // 418
    // Route Configuration can be done only before initialization                                                   // 419
    if (this._initialized)                                                                                          // 420
        throw new Error("Route Configuration can be done only before AccountsTemplates.init!");                     // 421
    // Only allowed routes can be configured                                                                        // 422
    if (!(route in this.ROUTE_DEFAULT))                                                                             // 423
        throw new Error("Unknown Route!");                                                                          // 424
                                                                                                                    // 425
    // Possibly adds a initial / to the provided path                                                               // 426
    if (options && options.path && options.path[0] !== "/")                                                         // 427
        options.path = "/" + options.path;                                                                          // 428
    // Updates the current configuration                                                                            // 429
    options = _.defaults(options || {}, this.ROUTE_DEFAULT[route]);                                                 // 430
    this.routes[route] = options;                                                                                   // 431
};                                                                                                                  // 432
                                                                                                                    // 433
AT.prototype.hasField = function(fieldId) {                                                                         // 434
    return !!this.getField(fieldId);                                                                                // 435
};                                                                                                                  // 436
                                                                                                                    // 437
AT.prototype.getField = function(fieldId) {                                                                         // 438
    var field = _.filter(this._fields, function(field){                                                             // 439
        return field._id == fieldId;                                                                                // 440
    });                                                                                                             // 441
    return (field.length === 1) ? field[0] : undefined;                                                             // 442
};                                                                                                                  // 443
                                                                                                                    // 444
AT.prototype.getFields = function() {                                                                               // 445
    return this._fields;                                                                                            // 446
};                                                                                                                  // 447
                                                                                                                    // 448
AT.prototype.getFieldIds = function() {                                                                             // 449
    return _.pluck(this._fields, "_id");                                                                            // 450
};                                                                                                                  // 451
                                                                                                                    // 452
AT.prototype.getRouteName = function(route) {                                                                       // 453
    if (route in this.routes)                                                                                       // 454
        return this.routes[route].name;                                                                             // 455
    return null;                                                                                                    // 456
};                                                                                                                  // 457
                                                                                                                    // 458
AT.prototype.getRoutePath = function(route) {                                                                       // 459
    if (route in this.routes)                                                                                       // 460
        return this.routes[route].path;                                                                             // 461
    return "#";                                                                                                     // 462
};                                                                                                                  // 463
                                                                                                                    // 464
AT.prototype.oauthServices = function(){                                                                            // 465
    // Extracts names of available services                                                                         // 466
    var names;                                                                                                      // 467
    if (Meteor.isServer)                                                                                            // 468
        names = (Accounts.oauth && Accounts.oauth.serviceNames()) || [];                                            // 469
    else                                                                                                            // 470
        names = (Accounts.oauth && Accounts.loginServicesConfigured() && Accounts.oauth.serviceNames()) || [];      // 471
    // Extracts names of configured services                                                                        // 472
    var configuredServices = [];                                                                                    // 473
    if (Accounts.loginServiceConfiguration)                                                                         // 474
        configuredServices = _.pluck(Accounts.loginServiceConfiguration.find().fetch(), "service");                 // 475
                                                                                                                    // 476
    // Builds a list of objects containing service name as _id and its configuration status                         // 477
    var services = _.map(names, function(name){                                                                     // 478
        return {                                                                                                    // 479
            _id : name,                                                                                             // 480
            configured: _.contains(configuredServices, name),                                                       // 481
        };                                                                                                          // 482
    });                                                                                                             // 483
                                                                                                                    // 484
    // Checks whether there is a UI to configure services...                                                        // 485
    // XXX: this only works with the accounts-ui package                                                            // 486
    var showUnconfigured = typeof Accounts._loginButtonsSession !== "undefined";                                    // 487
                                                                                                                    // 488
    // Filters out unconfigured services in case they"re not to be displayed                                        // 489
    if (!showUnconfigured){                                                                                         // 490
        services = _.filter(services, function(service){                                                            // 491
            return service.configured;                                                                              // 492
        });                                                                                                         // 493
    }                                                                                                               // 494
                                                                                                                    // 495
    // Sorts services by name                                                                                       // 496
    services = _.sortBy(services, function(service){                                                                // 497
        return service._id;                                                                                         // 498
    });                                                                                                             // 499
                                                                                                                    // 500
    return services;                                                                                                // 501
};                                                                                                                  // 502
                                                                                                                    // 503
AT.prototype.removeField = function(fieldId) {                                                                      // 504
    // Fields can be removed only before initialization                                                             // 505
    if (this._initialized)                                                                                          // 506
        throw new Error("AccountsTemplates.removeField should strictly be called before AccountsTemplates.init!");  // 507
    // Tries to look up the field with given _id                                                                    // 508
    var index = _.indexOf(_.pluck(this._fields, "_id"), fieldId);                                                   // 509
    if (index !== -1)                                                                                               // 510
        return this._fields.splice(index, 1)[0];                                                                    // 511
    else                                                                                                            // 512
        if (!(Meteor.isServer && _.contains(this.SPECIAL_FIELDS, fieldId)))                                         // 513
            throw new Error("A field called " + fieldId + " does not exist!");                                      // 514
};                                                                                                                  // 515
                                                                                                                    // 516
AT.prototype.setupRoutes = function() {                                                                             // 517
    if (Meteor.isServer){                                                                                           // 518
        // Possibly prints a warning in case showForgotPasswordLink is set to true but the route is not configured  // 519
        if (AccountsTemplates.options.showForgotPasswordLink && !("forgotPwd" in  AccountsTemplates.routes))        // 520
            console.warn("[AccountsTemplates] WARNING: showForgotPasswordLink set to true, but forgotPwd route is not configured!");
        // Configures "reset password" email link                                                                   // 522
        if ("resetPwd" in AccountsTemplates.routes){                                                                // 523
            var resetPwdPath = AccountsTemplates.routes["resetPwd"].path.substr(1);                                 // 524
            Accounts.urls.resetPassword = function(token){                                                          // 525
                return Meteor.absoluteUrl(resetPwdPath + "/" + token);                                              // 526
            };                                                                                                      // 527
        }                                                                                                           // 528
        // Configures "enroll account" email link                                                                   // 529
        if ("enrollAccount" in AccountsTemplates.routes){                                                           // 530
            var enrollAccountPath = AccountsTemplates.routes["enrollAccount"].path.substr(1);                       // 531
            Accounts.urls.enrollAccount = function(token){                                                          // 532
                return Meteor.absoluteUrl(enrollAccountPath + "/" + token);                                         // 533
            };                                                                                                      // 534
        }                                                                                                           // 535
        // Configures "verify email" email link                                                                     // 536
        if ("verifyEmail" in AccountsTemplates.routes){                                                             // 537
            var verifyEmailPath = AccountsTemplates.routes["verifyEmail"].path.substr(1);                           // 538
            Accounts.urls.verifyEmail = function(token){                                                            // 539
                return Meteor.absoluteUrl(verifyEmailPath + "/" + token);                                           // 540
            };                                                                                                      // 541
        }                                                                                                           // 542
    }                                                                                                               // 543
                                                                                                                    // 544
    // Determines the default layout to be used in case no specific one is specified for single routes              // 545
    var defaultLayout = AccountsTemplates.options.defaultLayout || Router.options.layoutTemplate;                   // 546
                                                                                                                    // 547
    _.each(AccountsTemplates.routes, function(options, route){                                                      // 548
        if (route === "ensureSignedIn")                                                                             // 549
            return;                                                                                                 // 550
        if (route === "changePwd" && !AccountsTemplates.options.enablePasswordChange)                               // 551
            throw new Error("changePwd route configured but enablePasswordChange set to false!");                   // 552
        if (route === "forgotPwd" && !AccountsTemplates.options.showForgotPasswordLink)                             // 553
            throw new Error("forgotPwd route configured but showForgotPasswordLink set to false!");                 // 554
        if (route === "signUp" && AccountsTemplates.options.forbidClientAccountCreation)                            // 555
            throw new Error("signUp route configured but forbidClientAccountCreation set to true!");                // 556
        // Possibly prints a warning in case the MAIL_URL environment variable was not set                          // 557
        if (Meteor.isServer && route === "forgotPwd" && (!process.env.MAIL_URL || ! Package["email"])){             // 558
            console.warn("[AccountsTemplates] WARNING: showForgotPasswordLink set to true, but MAIL_URL is not configured!");
        }                                                                                                           // 560
                                                                                                                    // 561
        var name = options.name; // Default provided...                                                             // 562
        var path = options.path; // Default provided...                                                             // 563
        var template = options.template || "fullPageAtForm";                                                        // 564
        var layoutTemplate = options.layoutTemplate || defaultLayout;                                               // 565
                                                                                                                    // 566
        // Possibly adds token parameter                                                                            // 567
        if (_.contains(["enrollAccount", "resetPwd", "verifyEmail"], route)){                                       // 568
            path += "/:paramToken";                                                                                 // 569
            if (route === "verifyEmail")                                                                            // 570
                Router.route(path, {                                                                                // 571
                    name: name,                                                                                     // 572
                    template: template,                                                                             // 573
                    layoutTemplate: layoutTemplate,                                                                 // 574
                    onBeforeAction: function() {                                                                    // 575
                        AccountsTemplates.setState(route);                                                          // 576
                        this.next();                                                                                // 577
                    },                                                                                              // 578
                    onAfterAction: function() {                                                                     // 579
                        AccountsTemplates.setDisabled(true);                                                        // 580
                        var token = this.params.paramToken;                                                         // 581
                        Accounts.verifyEmail(token, function(error){                                                // 582
                            AccountsTemplates.setDisabled(false);                                                   // 583
                            AccountsTemplates.submitCallback(error, route, function(){                              // 584
                                AccountsTemplates.state.form.set("result", AccountsTemplates.texts.info.emailVerified);
                            });                                                                                     // 586
                        });                                                                                         // 587
                    },                                                                                              // 588
                    onStop: function() {                                                                            // 589
                        AccountsTemplates.clearState();                                                             // 590
                    },                                                                                              // 591
                });                                                                                                 // 592
            else                                                                                                    // 593
                Router.route(path, {                                                                                // 594
                    name: name,                                                                                     // 595
                    template: template,                                                                             // 596
                    layoutTemplate: layoutTemplate,                                                                 // 597
                    onRun: function() {                                                                             // 598
                        AccountsTemplates.paramToken = this.params.paramToken;                                      // 599
                        this.next();                                                                                // 600
                    },                                                                                              // 601
                    onBeforeAction: function() {                                                                    // 602
                        AccountsTemplates.setState(route);                                                          // 603
                        this.next();                                                                                // 604
                    },                                                                                              // 605
                    onStop: function() {                                                                            // 606
                        AccountsTemplates.clearState();                                                             // 607
                        AccountsTemplates.paramToken = null;                                                        // 608
                    }                                                                                               // 609
                });                                                                                                 // 610
        }                                                                                                           // 611
        else                                                                                                        // 612
            Router.route(path, {                                                                                    // 613
                name: name,                                                                                         // 614
                template: template,                                                                                 // 615
                layoutTemplate: layoutTemplate,                                                                     // 616
                onBeforeAction: function() {                                                                        // 617
                    if(Meteor.user() && route != 'changePwd')                                                       // 618
                        AccountsTemplates.postSubmitRedirect(route);                                                // 619
                    else                                                                                            // 620
                        AccountsTemplates.setState(route);                                                          // 621
                    this.next();                                                                                    // 622
                },                                                                                                  // 623
                onStop: function() {                                                                                // 624
                    AccountsTemplates.clearState();                                                                 // 625
                }                                                                                                   // 626
            });                                                                                                     // 627
    });                                                                                                             // 628
};                                                                                                                  // 629
                                                                                                                    // 630
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/useraccounts:core/lib/server.js                                                                         //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
// Initialization                                                                                                   // 1
                                                                                                                    // 2
AT.prototype.init = function() {                                                                                    // 3
    console.warn("[AccountsTemplates] There is no more need to call AccountsTemplates.init()! Simply remove the call ;-)");
};                                                                                                                  // 5
                                                                                                                    // 6
AT.prototype._init = function() {                                                                                   // 7
    if (this._initialized)                                                                                          // 8
        return;                                                                                                     // 9
                                                                                                                    // 10
    // Checks there is at least one account service installed                                                       // 11
    if (!Package["accounts-password"] && (!Accounts.oauth || Accounts.oauth.serviceNames().length === 0))           // 12
        throw Error("AccountsTemplates: You must add at least one account service!");                               // 13
                                                                                                                    // 14
    // A password field is strictly required                                                                        // 15
    var password = this.getField("password");                                                                       // 16
    if (!password)                                                                                                  // 17
        throw Error("A password field is strictly required!");                                                      // 18
    if (password.type !== "password")                                                                               // 19
        throw Error("The type of password field should be password!");                                              // 20
                                                                                                                    // 21
    // Then we can have "username" or "email" or even both of them                                                  // 22
    // but at least one of the two is strictly required                                                             // 23
    var username = this.getField("username");                                                                       // 24
    var email = this.getField("email");                                                                             // 25
    if (!username && !email)                                                                                        // 26
        throw Error("At least one field out of username and email is strictly required!");                          // 27
    if (username && !username.required)                                                                             // 28
        throw Error("The username field should be required!");                                                      // 29
    if (email){                                                                                                     // 30
        if (email.type !== "email")                                                                                 // 31
            throw Error("The type of email field should be email!");                                                // 32
        if (username){                                                                                              // 33
            // username and email                                                                                   // 34
            if (username.type !== "text")                                                                           // 35
                throw Error("The type of username field should be text when email field is present!");              // 36
        }else{                                                                                                      // 37
            // email only                                                                                           // 38
            if (!email.required)                                                                                    // 39
                throw Error("The email field should be required when username is not present!");                    // 40
        }                                                                                                           // 41
    }                                                                                                               // 42
    else{                                                                                                           // 43
        // username only                                                                                            // 44
        if (username.type !== "text" && username.type !== "tel")                                                    // 45
            throw Error("The type of username field should be text or tel!");                                       // 46
    }                                                                                                               // 47
                                                                                                                    // 48
    // Possibly publish more user data in order to be able to show add/remove                                       // 49
    // buttons for 3rd-party services                                                                               // 50
    if (this.options.showAddRemoveServices){                                                                        // 51
        // Publish additional current user info to get the list of registered services                              // 52
        // XXX TODO:                                                                                                // 53
        // ...adds only user.services.*.id                                                                          // 54
        Meteor.publish("userRegisteredServices", function() {                                                       // 55
            var userId = this.userId;                                                                               // 56
            return Meteor.users.find(userId, {fields: {services: 1}});                                              // 57
            /*                                                                                                      // 58
            if (userId){                                                                                            // 59
                var user = Meteor.users.findOne(userId);                                                            // 60
                var services_id = _.chain(user.services)                                                            // 61
                    .keys()                                                                                         // 62
                    .reject(function(service){return service === "resume";})                                        // 63
                    .map(function(service){return "services." + service + ".id";})                                  // 64
                    .value();                                                                                       // 65
                var projection = {};                                                                                // 66
                _.each(services_id, function(key){projection[key] = 1;});                                           // 67
                return Meteor.users.find(userId, {fields: projection});                                             // 68
            }                                                                                                       // 69
            */                                                                                                      // 70
        });                                                                                                         // 71
    }                                                                                                               // 72
                                                                                                                    // 73
    // Security stuff                                                                                               // 74
    if (this.options.overrideLoginErrors){                                                                          // 75
        Accounts.validateLoginAttempt(function(attempt){                                                            // 76
            if (attempt.error){                                                                                     // 77
                var reason = attempt.error.reason;                                                                  // 78
                if (reason === "User not found" || reason === "Incorrect password")                                 // 79
                    throw new Meteor.Error(403, "Login forbidden");                                                 // 80
            }                                                                                                       // 81
            return attempt.allowed;                                                                                 // 82
        });                                                                                                         // 83
    }                                                                                                               // 84
                                                                                                                    // 85
    if (this.options.sendVerificationEmail && this.options.enforceEmailVerification){                               // 86
        Accounts.validateLoginAttempt(function(info){                                                               // 87
            if (info.type !== "password" || info.methodName !== "login")                                            // 88
                return true;                                                                                        // 89
            var user = info.user;                                                                                   // 90
            if (!user)                                                                                              // 91
                return true;                                                                                        // 92
            var ok = true;                                                                                          // 93
            var loginEmail = info.methodArguments[0].user.email;                                                    // 94
            if (loginEmail){                                                                                        // 95
              var email = _.filter(user.emails, function(obj){                                                      // 96
                  return obj.address === loginEmail;                                                                // 97
              });                                                                                                   // 98
              if (!email.length || !email[0].verified)                                                              // 99
                  ok = false;                                                                                       // 100
            }                                                                                                       // 101
            else {                                                                                                  // 102
              // we got the username, lets check there's at lease one verified email                                // 103
              var emailVerified = _.chain(user.emails)                                                              // 104
                .pluck('verified')                                                                                  // 105
                .any()                                                                                              // 106
                .value();                                                                                           // 107
              if (!emailVerified)                                                                                   // 108
                ok = false;                                                                                         // 109
            }                                                                                                       // 110
            if (!ok)                                                                                                // 111
              throw new Meteor.Error(401, "Please verify your email first. Check the email and follow the link!" ); // 112
            return true;                                                                                            // 113
        });                                                                                                         // 114
    }                                                                                                               // 115
                                                                                                                    // 116
    // ------------                                                                                                 // 117
    // Server-Side Routes Definition                                                                                // 118
    //                                                                                                              // 119
    //   this allows for server-side iron-router usage, like, e.g.                                                  // 120
    //   Router.map(function(){                                                                                     // 121
    //       this.route("fullPageSigninForm", {                                                                     // 122
    //           path: "*",                                                                                         // 123
    //           where: "server"                                                                                    // 124
    //           action: function() {                                                                               // 125
    //               this.response.statusCode = 404;                                                                // 126
    //               return this.response.end(Handlebars.templates["404"]());                                       // 127
    //           }                                                                                                  // 128
    //       });                                                                                                    // 129
    //   })                                                                                                         // 130
    // ------------                                                                                                 // 131
    AccountsTemplates.setupRoutes();                                                                                // 132
                                                                                                                    // 133
    // Marks AccountsTemplates as initialized                                                                       // 134
    this._initialized = true;                                                                                       // 135
};                                                                                                                  // 136
                                                                                                                    // 137
AccountsTemplates = new AT();                                                                                       // 138
                                                                                                                    // 139
                                                                                                                    // 140
// Client side account creation is disabled by default:                                                             // 141
// the methos ATCreateUserServer is used instead!                                                                   // 142
// to actually disable client side account creation use:                                                            // 143
//                                                                                                                  // 144
//    AccountsTemplates.config({                                                                                    // 145
//        forbidClientAccountCreation: true                                                                         // 146
//    });                                                                                                           // 147
Accounts.config({                                                                                                   // 148
    forbidClientAccountCreation: true                                                                               // 149
});                                                                                                                 // 150
                                                                                                                    // 151
                                                                                                                    // 152
// Initialization                                                                                                   // 153
Meteor.startup(function(){                                                                                          // 154
    AccountsTemplates._init();                                                                                      // 155
});                                                                                                                 // 156
                                                                                                                    // 157
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/useraccounts:core/lib/methods.js                                                                        //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
                                                                                                                    // 1
Meteor.methods({                                                                                                    // 2
    ATRemoveService: function(service_name){                                                                        // 3
        var userId = this.userId;                                                                                   // 4
        if (userId){                                                                                                // 5
            var user = Meteor.users.findOne(userId);                                                                // 6
            var numServices = _.keys(user.services).length; // including "resume"                                   // 7
            if (numServices === 2)                                                                                  // 8
                throw new Meteor.Error(403, "Cannot remove the only active service!", {});                          // 9
            var unset = {};                                                                                         // 10
            unset["services." + service_name] = "";                                                                 // 11
            Meteor.users.update(userId, {$unset: unset});                                                           // 12
        }                                                                                                           // 13
    },                                                                                                              // 14
});                                                                                                                 // 15
                                                                                                                    // 16
                                                                                                                    // 17
if (Meteor.isServer) {                                                                                              // 18
    Meteor.methods({                                                                                                // 19
        ATCreateUserServer: function(options){                                                                      // 20
            if (AccountsTemplates.options.forbidClientAccountCreation)                                              // 21
                throw new Meteor.Error(403, "Client side accounts creation is disabled!!!");                        // 22
            // createUser() does more checking.                                                                     // 23
            check(options, Object);                                                                                 // 24
            var allFieldIds = AccountsTemplates.getFieldIds();                                                      // 25
            // Picks-up whitelisted fields for profile                                                              // 26
            var profile = options.profile;                                                                          // 27
            profile = _.pick(profile, allFieldIds);                                                                 // 28
            profile = _.omit(profile, "username", "email", "password");                                             // 29
            // Validates fields" value                                                                              // 30
            var signupInfo = _.clone(profile);                                                                      // 31
            if (options.username)                                                                                   // 32
                signupInfo.username = options.username;                                                             // 33
            if (options.email)                                                                                      // 34
                signupInfo.email = options.email;                                                                   // 35
            if (options.password)                                                                                   // 36
                signupInfo.password = options.password;                                                             // 37
            var validationErrors = {};                                                                              // 38
            var someError = false;                                                                                  // 39
                                                                                                                    // 40
            // Validates fields values                                                                              // 41
            _.each(AccountsTemplates.getFields(), function(field){                                                  // 42
                var fieldId = field._id;                                                                            // 43
                var value = signupInfo[fieldId];                                                                    // 44
                if (fieldId === "password"){                                                                        // 45
                    // Can"t Pick-up password here                                                                  // 46
                    // NOTE: at this stage the password is already encripted,                                       // 47
                    //       so there is no way to validate it!!!                                                   // 48
                    check(value, Object);                                                                           // 49
                    return;                                                                                         // 50
                }                                                                                                   // 51
                var validationErr = field.validate(value, "strict");                                                // 52
                if (validationErr) {                                                                                // 53
                    validationErrors[fieldId] = validationErr;                                                      // 54
                    someError = true;                                                                               // 55
                }                                                                                                   // 56
            });                                                                                                     // 57
            if (someError)                                                                                          // 58
                throw new Meteor.Error(403, "Validation Errors", validationErrors);                                 // 59
                                                                                                                    // 60
            // Possibly removes the profile field                                                                   // 61
            if (_.isEmpty(options.profile))                                                                         // 62
                delete options.profile;                                                                             // 63
                                                                                                                    // 64
            // Create user. result contains id and token.                                                           // 65
            var userId = Accounts.createUser(options);                                                              // 66
            // safety belt. createUser is supposed to throw on error. send 500 error                                // 67
            // instead of sending a verification email with empty userid.                                           // 68
            if (! userId)                                                                                           // 69
                throw new Error("createUser failed to insert new user");                                            // 70
                                                                                                                    // 71
            // Send a email address verification email in case the context permits it                               // 72
            // and the specific configuration flag was set to true                                                  // 73
            if (options.email && AccountsTemplates.options.sendVerificationEmail)                                   // 74
                Accounts.sendVerificationEmail(userId, options.email);                                              // 75
        },                                                                                                          // 76
    });                                                                                                             // 77
}                                                                                                                   // 78
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['useraccounts:core'] = {
  AccountsTemplates: AccountsTemplates
};

})();

//# sourceMappingURL=useraccounts_core.js.map
