(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var _ = Package.underscore._;
var EJSON = Package.ejson.EJSON;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;

/* Package-scope variables */
var CollectionHooks, docIds;

(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/matb33:collection-hooks/collection-hooks.js                                                            //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
// Relevant AOP terminology:                                                                                       // 1
// Aspect: User code that runs before/after (hook)                                                                 // 2
// Advice: Wrapper code that knows when to call user code (aspects)                                                // 3
// Pointcut: before/after                                                                                          // 4
                                                                                                                   // 5
var advices = {};                                                                                                  // 6
var Tracker = Package.tracker && Package.tracker.Tracker || Package.deps.Deps;                                     // 7
// XXX this only used on the server; should it really be here?                                                     // 8
var publishUserId = new Meteor.EnvironmentVariable();                                                              // 9
                                                                                                                   // 10
var directEnv = new Meteor.EnvironmentVariable();                                                                  // 11
var directOp = function (func) {                                                                                   // 12
  return directEnv.withValue(true, func);                                                                          // 13
};                                                                                                                 // 14
                                                                                                                   // 15
function getUserId() {                                                                                             // 16
  var userId;                                                                                                      // 17
                                                                                                                   // 18
  if (Meteor.isClient) {                                                                                           // 19
    Tracker.nonreactive(function () {                                                                              // 20
      userId = Meteor.userId && Meteor.userId();                                                                   // 21
    });                                                                                                            // 22
  }                                                                                                                // 23
                                                                                                                   // 24
  if (Meteor.isServer) {                                                                                           // 25
    try {                                                                                                          // 26
      // Will throw an error unless within method call.                                                            // 27
      // Attempt to recover gracefully by catching:                                                                // 28
      userId = Meteor.userId && Meteor.userId();                                                                   // 29
    } catch (e) {}                                                                                                 // 30
                                                                                                                   // 31
    if (!userId) {                                                                                                 // 32
      // Get the userId if we are in a publish function.                                                           // 33
      userId = publishUserId.get();                                                                                // 34
    }                                                                                                              // 35
  }                                                                                                                // 36
                                                                                                                   // 37
  return userId;                                                                                                   // 38
}                                                                                                                  // 39
                                                                                                                   // 40
CollectionHooks = {                                                                                                // 41
  defaults: {                                                                                                      // 42
    before: { insert: {}, update: {}, remove: {}, find: {}, findOne: {}, all: {}},                                 // 43
    after: { insert: {}, update: {}, remove: {}, find: {}, findOne: {}, all: {}},                                  // 44
    all: { insert: {}, update: {}, remove: {}, find: {}, findOne: {}, all: {}}                                     // 45
  }                                                                                                                // 46
};                                                                                                                 // 47
                                                                                                                   // 48
CollectionHooks.extendCollectionInstance = function (self) {                                                       // 49
  var collection = Meteor.isClient ? self : self._collection;                                                      // 50
                                                                                                                   // 51
  // Offer a public API to allow the user to define aspects                                                        // 52
  // Example: collection.before.insert(func);                                                                      // 53
  _.each(["before", "after"], function (pointcut) {                                                                // 54
    _.each(advices, function (advice, method) {                                                                    // 55
      Meteor._ensure(self, pointcut, method);                                                                      // 56
      Meteor._ensure(self, "_hookAspects", method);                                                                // 57
                                                                                                                   // 58
      self._hookAspects[method][pointcut] = [];                                                                    // 59
      self[pointcut][method] = function (aspect, options) {                                                        // 60
        var len = self._hookAspects[method][pointcut].push({                                                       // 61
          aspect: aspect,                                                                                          // 62
          options: CollectionHooks.initOptions(options, pointcut, method)                                          // 63
        });                                                                                                        // 64
                                                                                                                   // 65
        return {                                                                                                   // 66
          replace: function (aspect, options) {                                                                    // 67
            self._hookAspects[method][pointcut].splice(len - 1, 1, {                                               // 68
              aspect: aspect,                                                                                      // 69
              options: CollectionHooks.initOptions(options, pointcut, method)                                      // 70
            });                                                                                                    // 71
          },                                                                                                       // 72
          remove: function () {                                                                                    // 73
            self._hookAspects[method][pointcut].splice(len - 1, 1);                                                // 74
          }                                                                                                        // 75
        };                                                                                                         // 76
      };                                                                                                           // 77
    });                                                                                                            // 78
  });                                                                                                              // 79
                                                                                                                   // 80
  // Offer a publicly accessible object to allow the user to define                                                // 81
  // collection-wide hook options.                                                                                 // 82
  // Example: collection.hookOptions.after.update = {fetchPrevious: false};                                        // 83
  self.hookOptions = EJSON.clone(CollectionHooks.defaults);                                                        // 84
                                                                                                                   // 85
  // Wrap mutator methods, letting the defined advice do the work                                                  // 86
  _.each(advices, function (advice, method) {                                                                      // 87
    // Store a reference to the mutator method in a publicly reachable location                                    // 88
    var _super = collection[method];                                                                               // 89
                                                                                                                   // 90
    Meteor._ensure(self, "direct", method);                                                                        // 91
    self.direct[method] = function () {                                                                            // 92
      var args = _.toArray(arguments);                                                                             // 93
      return directOp(function () {                                                                                // 94
        return _super.apply(collection, args);                                                                     // 95
      });                                                                                                          // 96
    };                                                                                                             // 97
                                                                                                                   // 98
    collection[method] = function () {                                                                             // 99
      if (directEnv.get() === true) {                                                                              // 100
        return _super.apply(collection, arguments);                                                                // 101
      }                                                                                                            // 102
                                                                                                                   // 103
      return advice.call(this,                                                                                     // 104
        getUserId(),                                                                                               // 105
        _super,                                                                                                    // 106
        self,                                                                                                      // 107
        self._hookAspects[method] || {},                                                                           // 108
        function (doc) {                                                                                           // 109
          return  _.isFunction(self._transform)                                                                    // 110
                  ? function (d) { return self._transform(d || doc); }                                             // 111
                  : function (d) { return d || doc; };                                                             // 112
        },                                                                                                         // 113
        _.toArray(arguments)                                                                                       // 114
      );                                                                                                           // 115
    };                                                                                                             // 116
  });                                                                                                              // 117
};                                                                                                                 // 118
                                                                                                                   // 119
CollectionHooks.defineAdvice = function (method, advice) {                                                         // 120
  advices[method] = advice;                                                                                        // 121
};                                                                                                                 // 122
                                                                                                                   // 123
CollectionHooks.initOptions = function (options, pointcut, method) {                                               // 124
  return CollectionHooks.extendOptions(CollectionHooks.defaults, options, pointcut, method);                       // 125
};                                                                                                                 // 126
                                                                                                                   // 127
CollectionHooks.extendOptions = function (source, options, pointcut, method) {                                     // 128
  options = _.extend(options || {}, source.all.all);                                                               // 129
  options = _.extend(options, source[pointcut].all);                                                               // 130
  options = _.extend(options, source.all[method]);                                                                 // 131
  options = _.extend(options, source[pointcut][method]);                                                           // 132
  return options;                                                                                                  // 133
};                                                                                                                 // 134
                                                                                                                   // 135
CollectionHooks.getDocs = function (collection, selector, options) {                                               // 136
  var self = this;                                                                                                 // 137
                                                                                                                   // 138
  var findOptions = {transform: null, reactive: false}; // added reactive: false                                   // 139
                                                                                                                   // 140
  /*                                                                                                               // 141
  // No "fetch" support at this time.                                                                              // 142
  if (!self._validators.fetchAllFields) {                                                                          // 143
    findOptions.fields = {};                                                                                       // 144
    _.each(self._validators.fetch, function(fieldName) {                                                           // 145
      findOptions.fields[fieldName] = 1;                                                                           // 146
    });                                                                                                            // 147
  }                                                                                                                // 148
  */                                                                                                               // 149
                                                                                                                   // 150
  // Bit of a magic condition here... only "update" passes options, so this is                                     // 151
  // only relevant to when update calls getDocs:                                                                   // 152
  if (options) {                                                                                                   // 153
    // This was added because in our case, we are potentially iterating over                                       // 154
    // multiple docs. If multi isn't enabled, force a limit (almost like                                           // 155
    // findOne), as the default for update without multi enabled is to affect                                      // 156
    // only the first matched document:                                                                            // 157
    if (!options.multi) {                                                                                          // 158
      findOptions.limit = 1;                                                                                       // 159
    }                                                                                                              // 160
  }                                                                                                                // 161
                                                                                                                   // 162
  // Unlike validators, we iterate over multiple docs, so use                                                      // 163
  // find instead of findOne:                                                                                      // 164
  return collection.find(selector, findOptions);                                                                   // 165
};                                                                                                                 // 166
                                                                                                                   // 167
CollectionHooks.reassignPrototype = function (instance, constr) {                                                  // 168
  var hasSetPrototypeOf = typeof Object.setPrototypeOf === "function";                                             // 169
                                                                                                                   // 170
  if (!constr) constr = typeof Mongo !== "undefined" ? Mongo.Collection : Meteor.Collection;                       // 171
                                                                                                                   // 172
  // __proto__ is not available in < IE11                                                                          // 173
  // Note: Assigning a prototype dynamically has performance implications                                          // 174
  if (hasSetPrototypeOf) {                                                                                         // 175
    Object.setPrototypeOf(instance, constr.prototype);                                                             // 176
  } else if (instance.__proto__) {                                                                                 // 177
    instance.__proto__ = constr.prototype;                                                                         // 178
  }                                                                                                                // 179
};                                                                                                                 // 180
                                                                                                                   // 181
CollectionHooks.wrapCollection = function (ns, as) {                                                               // 182
  if (!as._CollectionConstructor) as._CollectionConstructor = as.Collection;                                       // 183
  if (!as._CollectionPrototype) as._CollectionPrototype = new as.Collection(null);                                 // 184
                                                                                                                   // 185
  var constructor = as._CollectionConstructor;                                                                     // 186
  var proto = as._CollectionPrototype;                                                                             // 187
                                                                                                                   // 188
  ns.Collection = function () {                                                                                    // 189
    var ret = constructor.apply(this, arguments);                                                                  // 190
    CollectionHooks.extendCollectionInstance(this);                                                                // 191
    return ret;                                                                                                    // 192
  };                                                                                                               // 193
                                                                                                                   // 194
  ns.Collection.prototype = proto;                                                                                 // 195
                                                                                                                   // 196
  for (var prop in constructor) {                                                                                  // 197
    if (constructor.hasOwnProperty(prop)) {                                                                        // 198
      ns.Collection[prop] = constructor[prop];                                                                     // 199
    }                                                                                                              // 200
  }                                                                                                                // 201
};                                                                                                                 // 202
                                                                                                                   // 203
if (typeof Mongo !== "undefined") {                                                                                // 204
  CollectionHooks.wrapCollection(Meteor, Mongo);                                                                   // 205
  CollectionHooks.wrapCollection(Mongo, Mongo);                                                                    // 206
} else {                                                                                                           // 207
  CollectionHooks.wrapCollection(Meteor, Meteor);                                                                  // 208
}                                                                                                                  // 209
                                                                                                                   // 210
if (Meteor.isServer) {                                                                                             // 211
  var _publish = Meteor.publish;                                                                                   // 212
  Meteor.publish = function (name, func) {                                                                         // 213
    return _publish.call(this, name, function () {                                                                 // 214
      // This function is called repeatedly in publications                                                        // 215
      var ctx = this, args = arguments;                                                                            // 216
      return publishUserId.withValue(ctx && ctx.userId, function() {                                               // 217
        return func.apply(ctx, args);                                                                              // 218
      });                                                                                                          // 219
    });                                                                                                            // 220
  };                                                                                                               // 221
                                                                                                                   // 222
  // Make the above available for packages with hooks that want to determine                                       // 223
  // whether they are running inside a publish function or not.                                                    // 224
  CollectionHooks.isWithinPublish = function () {                                                                  // 225
    return publishUserId.get() !== undefined;                                                                      // 226
  };                                                                                                               // 227
}                                                                                                                  // 228
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/matb33:collection-hooks/insert.js                                                                      //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
CollectionHooks.defineAdvice("insert", function (userId, _super, instance, aspects, getTransform, args) {          // 1
  var self = this;                                                                                                 // 2
  var ctx = {context: self, _super: _super, args: args};                                                           // 3
  var callback = _.last(args);                                                                                     // 4
  var async = _.isFunction(callback);                                                                              // 5
  var abort, ret;                                                                                                  // 6
                                                                                                                   // 7
  // args[0] : doc                                                                                                 // 8
  // args[1] : callback                                                                                            // 9
                                                                                                                   // 10
  // before                                                                                                        // 11
  _.each(aspects.before, function (o) {                                                                            // 12
    var r = o.aspect.call(_.extend({transform: getTransform(args[0])}, ctx), userId, args[0]);                     // 13
    if (r === false) abort = true;                                                                                 // 14
  });                                                                                                              // 15
                                                                                                                   // 16
  if (abort) return false;                                                                                         // 17
                                                                                                                   // 18
  function after(id, err) {                                                                                        // 19
    var doc = args[0];                                                                                             // 20
    if (id) {                                                                                                      // 21
      doc = EJSON.clone(args[0]);                                                                                  // 22
      doc._id = id;                                                                                                // 23
    }                                                                                                              // 24
    var lctx = _.extend({transform: getTransform(doc), _id: id, err: err}, ctx);                                   // 25
    _.each(aspects.after, function (o) {                                                                           // 26
      o.aspect.call(lctx, userId, doc);                                                                            // 27
    });                                                                                                            // 28
    return id;                                                                                                     // 29
  }                                                                                                                // 30
                                                                                                                   // 31
  if (async) {                                                                                                     // 32
    args[args.length - 1] = function (err, obj) {                                                                  // 33
      after(obj && obj[0] && obj[0]._id || obj, err);                                                              // 34
      return callback.apply(this, arguments);                                                                      // 35
    };                                                                                                             // 36
    return _super.apply(self, args);                                                                               // 37
  } else {                                                                                                         // 38
    ret = _super.apply(self, args);                                                                                // 39
    return after(ret && ret[0] && ret[0]._id || ret);                                                              // 40
  }                                                                                                                // 41
});                                                                                                                // 42
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/matb33:collection-hooks/update.js                                                                      //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
CollectionHooks.defineAdvice("update", function (userId, _super, instance, aspects, getTransform, args) {          // 1
  var self = this;                                                                                                 // 2
  var ctx = {context: self, _super: _super, args: args};                                                           // 3
  var callback = _.last(args);                                                                                     // 4
  var async = _.isFunction(callback);                                                                              // 5
  var docs, docsIds, fields, abort, prev = {};                                                                     // 6
  var collection = _.has(self, "_collection") ? self._collection : self;                                           // 7
                                                                                                                   // 8
  // args[0] : selector                                                                                            // 9
  // args[1] : mutator                                                                                             // 10
  // args[2] : options (optional)                                                                                  // 11
  // args[3] : callback                                                                                            // 12
                                                                                                                   // 13
  if (_.isFunction(args[2])) {                                                                                     // 14
    callback = args[2];                                                                                            // 15
    args[2] = {};                                                                                                  // 16
  }                                                                                                                // 17
                                                                                                                   // 18
  if (aspects.before || aspects.after) {                                                                           // 19
    fields = getFields(args[1]);                                                                                   // 20
    docs = CollectionHooks.getDocs.call(self, collection, args[0], args[2]).fetch();                               // 21
    docIds = _.map(docs, function (doc) { return doc._id; });                                                      // 22
  }                                                                                                                // 23
                                                                                                                   // 24
  // copy originals for convenience for the "after" pointcut                                                       // 25
  if (aspects.after) {                                                                                             // 26
    if (_.some(aspects.after, function (o) { return o.options.fetchPrevious !== false; }) &&                       // 27
        CollectionHooks.extendOptions(instance.hookOptions, {}, "after", "update").fetchPrevious !== false) {      // 28
      prev.mutator = EJSON.clone(args[1]);                                                                         // 29
      prev.options = EJSON.clone(args[2]);                                                                         // 30
      prev.docs = {};                                                                                              // 31
      _.each(docs, function (doc) {                                                                                // 32
        prev.docs[doc._id] = EJSON.clone(doc);                                                                     // 33
      });                                                                                                          // 34
    }                                                                                                              // 35
  }                                                                                                                // 36
                                                                                                                   // 37
  // before                                                                                                        // 38
  _.each(aspects.before, function (o) {                                                                            // 39
    _.each(docs, function (doc) {                                                                                  // 40
      var r = o.aspect.call(_.extend({transform: getTransform(doc)}, ctx), userId, doc, fields, args[1], args[2]); // 41
      if (r === false) abort = true;                                                                               // 42
    });                                                                                                            // 43
  });                                                                                                              // 44
                                                                                                                   // 45
  if (abort) return false;                                                                                         // 46
                                                                                                                   // 47
  function after(affected, err) {                                                                                  // 48
    var fields = getFields(args[1]);                                                                               // 49
    var docs = CollectionHooks.getDocs.call(self, collection, {_id: {$in: docIds}}, args[2]).fetch();              // 50
                                                                                                                   // 51
    _.each(aspects.after, function (o) {                                                                           // 52
      _.each(docs, function (doc) {                                                                                // 53
        o.aspect.call(_.extend({                                                                                   // 54
          transform: getTransform(doc),                                                                            // 55
          previous: prev.docs && prev.docs[doc._id],                                                               // 56
          affected: affected,                                                                                      // 57
          err: err                                                                                                 // 58
        }, ctx), userId, doc, fields, prev.mutator, prev.options);                                                 // 59
      });                                                                                                          // 60
    });                                                                                                            // 61
  }                                                                                                                // 62
                                                                                                                   // 63
  if (async) {                                                                                                     // 64
    args[args.length - 1] = function (err, affected) {                                                             // 65
      after(affected, err);                                                                                        // 66
      return callback.apply(this, arguments);                                                                      // 67
    };                                                                                                             // 68
    return _super.apply(this, args);                                                                               // 69
  } else {                                                                                                         // 70
    var affected = _super.apply(self, args);                                                                       // 71
    after(affected);                                                                                               // 72
    return affected;                                                                                               // 73
  }                                                                                                                // 74
});                                                                                                                // 75
                                                                                                                   // 76
// This function contains a snippet of code pulled and modified from:                                              // 77
// ~/.meteor/packages/mongo-livedata/collection.js:632-668                                                         // 78
// It's contained in these utility functions to make updates easier for us in                                      // 79
// case this code changes.                                                                                         // 80
var getFields = function (mutator) {                                                                               // 81
  // compute modified fields                                                                                       // 82
  var fields = [];                                                                                                 // 83
  _.each(mutator, function (params, op) {                                                                          // 84
    _.each(_.keys(params), function (field) {                                                                      // 85
      // treat dotted fields as if they are replacing their                                                        // 86
      // top-level part                                                                                            // 87
      if (field.indexOf('.') !== -1)                                                                               // 88
        field = field.substring(0, field.indexOf('.'));                                                            // 89
                                                                                                                   // 90
      // record the field we are trying to change                                                                  // 91
      if (!_.contains(fields, field))                                                                              // 92
        fields.push(field);                                                                                        // 93
    });                                                                                                            // 94
  });                                                                                                              // 95
                                                                                                                   // 96
  return fields;                                                                                                   // 97
};                                                                                                                 // 98
                                                                                                                   // 99
// This function contains a snippet of code pulled and modified from:                                              // 100
// ~/.meteor/packages/mongo-livedata/collection.js                                                                 // 101
// It's contained in these utility functions to make updates easier for us in                                      // 102
// case this code changes.                                                                                         // 103
var getFields = function (mutator) {                                                                               // 104
  // compute modified fields                                                                                       // 105
  var fields = [];                                                                                                 // 106
                                                                                                                   // 107
  _.each(mutator, function (params, op) {                                                                          // 108
    //====ADDED START=======================                                                                       // 109
    if (_.contains(["$set", "$unset", "$inc", "$push", "$pull", "$pop", "$rename", "$pullAll", "$addToSet", "$bit"], op)) {
    //====ADDED END=========================                                                                       // 111
      _.each(_.keys(params), function (field) {                                                                    // 112
        // treat dotted fields as if they are replacing their                                                      // 113
        // top-level part                                                                                          // 114
        if (field.indexOf('.') !== -1)                                                                             // 115
          field = field.substring(0, field.indexOf('.'));                                                          // 116
                                                                                                                   // 117
        // record the field we are trying to change                                                                // 118
        if (!_.contains(fields, field))                                                                            // 119
          fields.push(field);                                                                                      // 120
      });                                                                                                          // 121
    //====ADDED START=======================                                                                       // 122
    } else {                                                                                                       // 123
      fields.push(op);                                                                                             // 124
    }                                                                                                              // 125
    //====ADDED END=========================                                                                       // 126
  });                                                                                                              // 127
                                                                                                                   // 128
  return fields;                                                                                                   // 129
};                                                                                                                 // 130
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/matb33:collection-hooks/remove.js                                                                      //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
CollectionHooks.defineAdvice("remove", function (userId, _super, instance, aspects, getTransform, args) {          // 1
  var self = this;                                                                                                 // 2
  var ctx = {context: self, _super: _super, args: args};                                                           // 3
  var callback = _.last(args);                                                                                     // 4
  var async = _.isFunction(callback);                                                                              // 5
  var docs, abort, prev = [];                                                                                      // 6
  var collection = _.has(self, "_collection") ? self._collection : self;                                           // 7
                                                                                                                   // 8
  // args[0] : selector                                                                                            // 9
  // args[1] : callback                                                                                            // 10
                                                                                                                   // 11
  if (aspects.before || aspects.after) {                                                                           // 12
    docs = CollectionHooks.getDocs.call(self, collection, args[0]).fetch();                                        // 13
  }                                                                                                                // 14
                                                                                                                   // 15
  // copy originals for convenience for the "after" pointcut                                                       // 16
  if (aspects.after) {                                                                                             // 17
    _.each(docs, function (doc) {                                                                                  // 18
      prev.push(EJSON.clone(doc));                                                                                 // 19
    });                                                                                                            // 20
  }                                                                                                                // 21
                                                                                                                   // 22
  // before                                                                                                        // 23
  _.each(aspects.before, function (o) {                                                                            // 24
    _.each(docs, function (doc) {                                                                                  // 25
      var r = o.aspect.call(_.extend({transform: getTransform(doc)}, ctx), userId, doc);                           // 26
      if (r === false) abort = true;                                                                               // 27
    });                                                                                                            // 28
  });                                                                                                              // 29
                                                                                                                   // 30
  if (abort) return false;                                                                                         // 31
                                                                                                                   // 32
  function after(err) {                                                                                            // 33
    _.each(aspects.after, function (o) {                                                                           // 34
      _.each(prev, function (doc) {                                                                                // 35
        o.aspect.call(_.extend({transform: getTransform(doc), err: err}, ctx), userId, doc);                       // 36
      });                                                                                                          // 37
    });                                                                                                            // 38
  }                                                                                                                // 39
                                                                                                                   // 40
  if (async) {                                                                                                     // 41
    args[args.length - 1] = function (err) {                                                                       // 42
      after(err);                                                                                                  // 43
      return callback.apply(this, arguments);                                                                      // 44
    };                                                                                                             // 45
    return _super.apply(self, args);                                                                               // 46
  } else {                                                                                                         // 47
    var result = _super.apply(self, args);                                                                         // 48
    after();                                                                                                       // 49
    return result;                                                                                                 // 50
  }                                                                                                                // 51
});                                                                                                                // 52
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/matb33:collection-hooks/find.js                                                                        //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
CollectionHooks.defineAdvice("find", function (userId, _super, instance, aspects, getTransform, args) {            // 1
  var self = this;                                                                                                 // 2
  var ctx = {context: self, _super: _super, args: args};                                                           // 3
  var ret, abort;                                                                                                  // 4
                                                                                                                   // 5
  // args[0] : selector                                                                                            // 6
  // args[1] : options                                                                                             // 7
                                                                                                                   // 8
  // before                                                                                                        // 9
  _.each(aspects.before, function (o) {                                                                            // 10
    var r = o.aspect.call(ctx, userId, args[0], args[1]);                                                          // 11
    if (r === false) abort = true;                                                                                 // 12
  });                                                                                                              // 13
                                                                                                                   // 14
  if (abort) return false;                                                                                         // 15
                                                                                                                   // 16
  function after(cursor) {                                                                                         // 17
    _.each(aspects.after, function (o) {                                                                           // 18
      o.aspect.call(ctx, userId, args[0], args[1], cursor);                                                        // 19
    });                                                                                                            // 20
  }                                                                                                                // 21
                                                                                                                   // 22
  ret = _super.apply(self, args);                                                                                  // 23
  after(ret);                                                                                                      // 24
                                                                                                                   // 25
  return ret;                                                                                                      // 26
});                                                                                                                // 27
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/matb33:collection-hooks/findone.js                                                                     //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
CollectionHooks.defineAdvice("findOne", function (userId, _super, instance, aspects, getTransform, args) {         // 1
  var self = this;                                                                                                 // 2
  var ctx = {context: self, _super: _super, args: args};                                                           // 3
  var ret, abort;                                                                                                  // 4
                                                                                                                   // 5
  // args[0] : selector                                                                                            // 6
  // args[1] : options                                                                                             // 7
                                                                                                                   // 8
  // before                                                                                                        // 9
  _.each(aspects.before, function (o) {                                                                            // 10
    var r = o.aspect.call(ctx, userId, args[0], args[1]);                                                          // 11
    if (r === false) abort = true;                                                                                 // 12
  });                                                                                                              // 13
                                                                                                                   // 14
  if (abort) return false;                                                                                         // 15
                                                                                                                   // 16
  function after(doc) {                                                                                            // 17
    _.each(aspects.after, function (o) {                                                                           // 18
      o.aspect.call(ctx, userId, args[0], args[1], doc);                                                           // 19
    });                                                                                                            // 20
  }                                                                                                                // 21
                                                                                                                   // 22
  ret = _super.apply(self, args);                                                                                  // 23
  after(ret);                                                                                                      // 24
                                                                                                                   // 25
  return ret;                                                                                                      // 26
});                                                                                                                // 27
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/matb33:collection-hooks/users-compat.js                                                                //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
if (Meteor.users) {                                                                                                // 1
  // If Meteor.users has been instantiated, attempt to re-assign its prototype:                                    // 2
  CollectionHooks.reassignPrototype(Meteor.users);                                                                 // 3
                                                                                                                   // 4
  // Next, give it the hook aspects:                                                                               // 5
  CollectionHooks.extendCollectionInstance(Meteor.users);                                                          // 6
}                                                                                                                  // 7
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['matb33:collection-hooks'] = {
  CollectionHooks: CollectionHooks
};

})();

//# sourceMappingURL=matb33_collection-hooks.js.map
