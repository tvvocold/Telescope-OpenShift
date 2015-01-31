(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var DDP = Package.ddp.DDP;
var DDPServer = Package.ddp.DDPServer;
var EJSON = Package.ejson.EJSON;
var _ = Package.underscore._;
var WebApp = Package.webapp.WebApp;
var main = Package.webapp.main;
var WebAppInternals = Package.webapp.WebAppInternals;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var Accounts = Package['accounts-base'].Accounts;

/* Package-scope variables */
var FastRender, EncodeEJSON, DecodeEJSON, AddedToChanged, ApplyDDP, DeepExtend, Utils, paramParts, PublishContext, Context;

(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/meteorhacks:fast-render/lib/utils.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
EncodeEJSON = function(ejson) {                                                                                        // 1
  var ejsonString = EJSON.stringify(ejson);                                                                            // 2
  return encodeURI(ejsonString);                                                                                       // 3
};                                                                                                                     // 4
                                                                                                                       // 5
DecodeEJSON = function(encodedEjson) {                                                                                 // 6
  var decodedEjsonString = decodeURI(encodedEjson);                                                                    // 7
  return EJSON.fromJSONValue(JSON.parse(decodedEjsonString));                                                          // 8
};                                                                                                                     // 9
                                                                                                                       // 10
AddedToChanged = function(localCopy, added) {                                                                          // 11
  added.msg = "changed";                                                                                               // 12
  added.cleared = [];                                                                                                  // 13
  added.fields = added.fields || {};                                                                                   // 14
                                                                                                                       // 15
  _.each(localCopy, function(value, key) {                                                                             // 16
    if(key != '_id') {                                                                                                 // 17
      if(typeof added.fields[key] == "undefined") {                                                                    // 18
        added.cleared.push(key);                                                                                       // 19
      }                                                                                                                // 20
    }                                                                                                                  // 21
  });                                                                                                                  // 22
};                                                                                                                     // 23
                                                                                                                       // 24
ApplyDDP = function(existing, message) {                                                                               // 25
  var newDoc = (!existing)? {}: _.clone(existing);                                                                     // 26
  if(message.msg == 'added') {                                                                                         // 27
    _.each(message.fields, function(value, key) {                                                                      // 28
      newDoc[key] = value;                                                                                             // 29
    });                                                                                                                // 30
  } else if(message.msg == "changed") {                                                                                // 31
    _.each(message.fields, function(value, key) {                                                                      // 32
      newDoc[key] = value;                                                                                             // 33
    });                                                                                                                // 34
    _.each(message.cleared, function(key) {                                                                            // 35
      delete newDoc[key];                                                                                              // 36
    });                                                                                                                // 37
  } else if(message.msg == "removed") {                                                                                // 38
    newDoc = null;                                                                                                     // 39
  }                                                                                                                    // 40
                                                                                                                       // 41
  return newDoc;                                                                                                       // 42
};                                                                                                                     // 43
                                                                                                                       // 44
// source: https://gist.github.com/kurtmilam/1868955                                                                   // 45
//  modified a bit to not to expose this as an _ api                                                                   // 46
DeepExtend = function deepExtend (obj) {                                                                               // 47
  var parentRE = /#{\s*?_\s*?}/,                                                                                       // 48
      slice = Array.prototype.slice,                                                                                   // 49
      hasOwnProperty = Object.prototype.hasOwnProperty;                                                                // 50
                                                                                                                       // 51
  _.each(slice.call(arguments, 1), function(source) {                                                                  // 52
    for (var prop in source) {                                                                                         // 53
      if (hasOwnProperty.call(source, prop)) {                                                                         // 54
        if (_.isUndefined(obj[prop]) || _.isFunction(obj[prop]) || _.isNull(source[prop]) || _.isDate(source[prop])) { // 55
          obj[prop] = source[prop];                                                                                    // 56
        }                                                                                                              // 57
        else if (_.isString(source[prop]) && parentRE.test(source[prop])) {                                            // 58
          if (_.isString(obj[prop])) {                                                                                 // 59
            obj[prop] = source[prop].replace(parentRE, obj[prop]);                                                     // 60
          }                                                                                                            // 61
        }                                                                                                              // 62
        else if (_.isArray(obj[prop]) || _.isArray(source[prop])){                                                     // 63
          if (!_.isArray(obj[prop]) || !_.isArray(source[prop])){                                                      // 64
            throw 'Error: Trying to combine an array with a non-array (' + prop + ')';                                 // 65
          } else {                                                                                                     // 66
            obj[prop] = _.reject(DeepExtend(obj[prop], source[prop]), function (item) { return _.isNull(item);});      // 67
          }                                                                                                            // 68
        }                                                                                                              // 69
        else if (_.isObject(obj[prop]) || _.isObject(source[prop])){                                                   // 70
          if (!_.isObject(obj[prop]) || !_.isObject(source[prop])){                                                    // 71
            throw 'Error: Trying to combine an object with a non-object (' + prop + ')';                               // 72
          } else {                                                                                                     // 73
            obj[prop] = DeepExtend(obj[prop], source[prop]);                                                           // 74
          }                                                                                                            // 75
        } else {                                                                                                       // 76
          obj[prop] = source[prop];                                                                                    // 77
        }                                                                                                              // 78
      }                                                                                                                // 79
    }                                                                                                                  // 80
  });                                                                                                                  // 81
  return obj;                                                                                                          // 82
};                                                                                                                     // 83
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/meteorhacks:fast-render/lib/server/utils.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/*                                                                                                                     // 1
  stolen from express: http://goo.gl/qgarJu                                                                            // 2
  some parts has been changed to deal with our api                                                                     // 3
*/                                                                                                                     // 4
                                                                                                                       // 5
Utils = {};                                                                                                            // 6
                                                                                                                       // 7
Utils._pathRegexp = function _pathRegexp(path, keys, sensitive, strict) {                                              // 8
  if (toString.call(path) == '[object RegExp]') return path;                                                           // 9
  if (Array.isArray(path)) path = '(' + path.join('|') + ')';                                                          // 10
  path = path                                                                                                          // 11
    .replace(/(.)\/$/, '$1')                                                                                           // 12
    .concat(strict ? '' : '/?')                                                                                        // 13
    .replace(/\/\(/g, '(?:/')                                                                                          // 14
    .replace(/#/, '/?#')                                                                                               // 15
    .replace(                                                                                                          // 16
      /(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g,                                                                          // 17
    function(match, slash, format, key, capture, optional){                                                            // 18
      keys.push({ name: key, optional: !! optional });                                                                 // 19
      slash = slash || '';                                                                                             // 20
      return ''                                                                                                        // 21
        + (optional ? '' : slash)                                                                                      // 22
        + '(?:'                                                                                                        // 23
        + (optional ? slash : '')                                                                                      // 24
        + (format || '')                                                                                               // 25
        + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')'                                                     // 26
        + (optional || '');                                                                                            // 27
    })                                                                                                                 // 28
    .replace(/([\/.])/g, '\\$1')                                                                                       // 29
    .replace(/\*/g, '(.*)');                                                                                           // 30
  return new RegExp('^' + path + '$', sensitive ? '' : 'i');                                                           // 31
};                                                                                                                     // 32
                                                                                                                       // 33
Utils._pathMatch = function _pathMatch(uri, route){                                                                    // 34
  uri = decodeURI(uri);                                                                                                // 35
                                                                                                                       // 36
  var params = [];                                                                                                     // 37
  var uriParts2 = uri.split('?');                                                                                      // 38
  var path = uriParts2[0];                                                                                             // 39
  var queryString = uriParts2[1];                                                                                      // 40
                                                                                                                       // 41
  if(queryString) {                                                                                                    // 42
    _.each(queryString.split('&'), function (paramString) {                                                            // 43
      paramParts = paramString.split('=');                                                                             // 44
      params[paramParts[0]] = decodeURIComponent(paramParts[1]);                                                       // 45
    });                                                                                                                // 46
  }                                                                                                                    // 47
                                                                                                                       // 48
  var keys = route.keys                                                                                                // 49
    , m = route.regexp.exec(path);                                                                                     // 50
                                                                                                                       // 51
  if (!m) return false;                                                                                                // 52
                                                                                                                       // 53
  for (var i = 1, len = m.length; i < len; ++i) {                                                                      // 54
    var key = keys[i - 1];                                                                                             // 55
                                                                                                                       // 56
    try {                                                                                                              // 57
      var val = 'string' == typeof m[i]                                                                                // 58
        ? decodeURIComponent(m[i])                                                                                     // 59
        : m[i];                                                                                                        // 60
    } catch(e) {                                                                                                       // 61
      var err = new Error("Failed to decode param '" + m[i] + "'");                                                    // 62
      err.status = 400;                                                                                                // 63
      throw err;                                                                                                       // 64
    }                                                                                                                  // 65
                                                                                                                       // 66
    if (key) {                                                                                                         // 67
      params[key.name] = val;                                                                                          // 68
    } else {                                                                                                           // 69
      params.push(val);                                                                                                // 70
    }                                                                                                                  // 71
  }                                                                                                                    // 72
                                                                                                                       // 73
  return params;                                                                                                       // 74
};                                                                                                                     // 75
                                                                                                                       // 76
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/meteorhacks:fast-render/lib/server/fast_render.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Fiber = Npm.require('fibers');                                                                                     // 1
                                                                                                                       // 2
FastRender = {                                                                                                         // 3
  _routes: [],                                                                                                         // 4
  _onAllRoutes: []                                                                                                     // 5
};                                                                                                                     // 6
                                                                                                                       // 7
FastRender.route = function route(path, callback) {                                                                    // 8
  var keys = [];                                                                                                       // 9
  FastRender._routes.push({                                                                                            // 10
    regexp: Utils._pathRegexp(path, keys, false, false),                                                               // 11
    callback: callback,                                                                                                // 12
    keys: keys                                                                                                         // 13
  });                                                                                                                  // 14
};                                                                                                                     // 15
                                                                                                                       // 16
FastRender.onAllRoutes = function onAllRoutes(callback) {                                                              // 17
  FastRender._onAllRoutes.push(callback);                                                                              // 18
};                                                                                                                     // 19
                                                                                                                       // 20
FastRender._processRoutes = function _processRoutes(path, loginToken, headers, callback) {                             // 21
  callback = callback || function() {};                                                                                // 22
  var selectedRoute;                                                                                                   // 23
  var params;                                                                                                          // 24
                                                                                                                       // 25
  for(var lc=0; lc<FastRender._routes.length; lc++) {                                                                  // 26
    var route = FastRender._routes[lc];                                                                                // 27
    params = Utils._pathMatch(path, route);                                                                            // 28
    if(params) {                                                                                                       // 29
      selectedRoute = route;                                                                                           // 30
      break;                                                                                                           // 31
    }                                                                                                                  // 32
  }                                                                                                                    // 33
                                                                                                                       // 34
  Fiber(function() {                                                                                                   // 35
    var context = new Context(loginToken, { headers: headers });                                                       // 36
    try {                                                                                                              // 37
                                                                                                                       // 38
      //run onAllRoutes callbacks if provided                                                                          // 39
      FastRender._onAllRoutes.forEach(function(callback) {                                                             // 40
        callback.call(context, path);                                                                                  // 41
      });                                                                                                              // 42
                                                                                                                       // 43
      if(selectedRoute) {                                                                                              // 44
        selectedRoute.callback.call(context, params, path);                                                            // 45
      }                                                                                                                // 46
                                                                                                                       // 47
      callback(context.getData());                                                                                     // 48
    } catch(err) {                                                                                                     // 49
      console.error('error on fast-rendering path: ' + path + " ; error: " + err.stack);                               // 50
      callback(null);                                                                                                  // 51
    }                                                                                                                  // 52
  }).run();                                                                                                            // 53
};                                                                                                                     // 54
                                                                                                                       // 55
// adding support for null publications                                                                                // 56
FastRender.onAllRoutes(function() {                                                                                    // 57
  var context = this;                                                                                                  // 58
  var nullHandlers = Meteor.default_server.universal_publish_handlers;                                                 // 59
                                                                                                                       // 60
  if(nullHandlers && nullHandlers) {                                                                                   // 61
    nullHandlers.forEach(function(publishHandler) {                                                                    // 62
      var publishContext = new PublishContext(context, null);                                                          // 63
      var params = [];                                                                                                 // 64
      context.processPublication(publishHandler, publishContext, params);                                              // 65
    });                                                                                                                // 66
  }                                                                                                                    // 67
});                                                                                                                    // 68
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/meteorhacks:fast-render/lib/server/publish_context.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
PublishContext = function PublishContext(context, subscription) {                                                      // 1
  this.userId = context.userId;                                                                                        // 2
  this.unblock = function() {};                                                                                        // 3
  this._subscription = subscription;                                                                                   // 4
  this._context = context;                                                                                             // 5
  this._collectionData = {};                                                                                           // 6
  this._onStop = [];                                                                                                   // 7
  this._stopped = false;                                                                                               // 8
                                                                                                                       // 9
  // connection object                                                                                                 // 10
  this.connection = {                                                                                                  // 11
    _id: Meteor.uuid(),                                                                                                // 12
    close: function() {},                                                                                              // 13
    onClose: function() {},                                                                                            // 14
    // fake value, will be supported later on                                                                          // 15
    clientAddress: "127.0.0.1",                                                                                        // 16
    httpHeaders: context.headers                                                                                       // 17
  };                                                                                                                   // 18
                                                                                                                       // 19
  // we won't be supporting all the other fields of the Meteor's                                                       // 20
  // Subscription class since they are private variables                                                               // 21
};                                                                                                                     // 22
                                                                                                                       // 23
PublishContext.prototype._ensureCollection = function(collection) {                                                    // 24
  if (!this._collectionData[collection]) {                                                                             // 25
    this._collectionData[collection] = [];                                                                             // 26
                                                                                                                       // 27
    //put this collection data in the parent context                                                                   // 28
    this._context._ensureCollection(collection);                                                                       // 29
    this._context._collectionData[collection].push(this._collectionData[collection]);                                  // 30
  }                                                                                                                    // 31
};                                                                                                                     // 32
                                                                                                                       // 33
PublishContext.prototype.added = function(collection, id, fields) {                                                    // 34
  this._ensureCollection(collection);                                                                                  // 35
  var doc = _.clone(fields);                                                                                           // 36
  doc._id = id;                                                                                                        // 37
  this._collectionData[collection].push(doc);                                                                          // 38
};                                                                                                                     // 39
                                                                                                                       // 40
PublishContext.prototype.changed = function(collection, id, fields) {                                                  // 41
  var collectionData = this._collectionData;                                                                           // 42
                                                                                                                       // 43
  collectionData[collection] = collectionData[collection].map(function(doc) {                                          // 44
    if (doc._id === id) {                                                                                              // 45
      return _.extend(doc, fields);                                                                                    // 46
    }                                                                                                                  // 47
                                                                                                                       // 48
    return doc;                                                                                                        // 49
  });                                                                                                                  // 50
};                                                                                                                     // 51
                                                                                                                       // 52
PublishContext.prototype.removed = function(collection, id) {                                                          // 53
  var collectionData = this._collectionData;                                                                           // 54
                                                                                                                       // 55
  collectionData[collection] = collectionData[collection].filter(function(doc) {                                       // 56
    return doc._id !== id;                                                                                             // 57
  });                                                                                                                  // 58
};                                                                                                                     // 59
                                                                                                                       // 60
PublishContext.prototype.onStop = function(cb) {                                                                       // 61
  if (this._stopped) {                                                                                                 // 62
    cb();                                                                                                              // 63
  } else {                                                                                                             // 64
    this._onStop.push(cb);                                                                                             // 65
  }                                                                                                                    // 66
};                                                                                                                     // 67
                                                                                                                       // 68
PublishContext.prototype.ready = function() {                                                                          // 69
  this._stopped = true;                                                                                                // 70
                                                                                                                       // 71
  //make the subscription be marked as ready                                                                           // 72
  if(this._subscription) {                                                                                             // 73
    //don't do this for null subscriptions                                                                             // 74
    this._context.completeSubscriptions(this._subscription);                                                           // 75
  }                                                                                                                    // 76
                                                                                                                       // 77
  //make sure that any observe callbacks are cancelled                                                                 // 78
  this._onStop.forEach(function(cb) {                                                                                  // 79
    cb();                                                                                                              // 80
  });                                                                                                                  // 81
};                                                                                                                     // 82
                                                                                                                       // 83
PublishContext.prototype.error = function() {};                                                                        // 84
PublishContext.prototype.stop = function() {};                                                                         // 85
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/meteorhacks:fast-render/lib/server/context.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Fibers = Npm.require('fibers');                                                                                    // 1
var Future = Npm.require('fibers/future');                                                                             // 2
                                                                                                                       // 3
Context = function Context(loginToken, otherParams) {                                                                  // 4
  this._collectionData = {};                                                                                           // 5
  this._subscriptions = {};                                                                                            // 6
  this._subscriptionFutures = [];                                                                                      // 7
  this._loginToken = loginToken;                                                                                       // 8
                                                                                                                       // 9
  _.extend(this, otherParams);                                                                                         // 10
                                                                                                                       // 11
  // get the user                                                                                                      // 12
  if(Meteor.users) {                                                                                                   // 13
    // check to make sure, we've the loginToken,                                                                       // 14
    // otherwise a random user will fetched from the db                                                                // 15
    if(loginToken) {                                                                                                   // 16
      var hashedToken = loginToken && Accounts._hashLoginToken( loginToken );                                          // 17
      var query = {'services.resume.loginTokens.hashedToken': hashedToken };                                           // 18
      var options = {fields: {_id: 1}};                                                                                // 19
      var user = Meteor.users.findOne(query, options);                                                                 // 20
    }                                                                                                                  // 21
                                                                                                                       // 22
    //support for Meteor.user                                                                                          // 23
    Fibers.current._meteor_dynamics = {};                                                                              // 24
    Fibers.current._meteor_dynamics[DDP._CurrentInvocation.slot] = this;                                               // 25
                                                                                                                       // 26
    if(user) {                                                                                                         // 27
      this.userId = user._id;                                                                                          // 28
    }                                                                                                                  // 29
  }                                                                                                                    // 30
};                                                                                                                     // 31
                                                                                                                       // 32
Context.prototype.subscribe = function(subscription /*, params */) {                                                   // 33
  var self = this;                                                                                                     // 34
                                                                                                                       // 35
  var publishHandler = Meteor.default_server.publish_handlers[subscription];                                           // 36
  if(publishHandler) {                                                                                                 // 37
    var publishContext = new PublishContext(this, subscription);                                                       // 38
    var params = Array.prototype.slice.call(arguments, 1);                                                             // 39
                                                                                                                       // 40
    this.processPublication(publishHandler, publishContext, params);                                                   // 41
  } else {                                                                                                             // 42
    console.warn('There is no such publish handler named:', subscription);                                             // 43
  }                                                                                                                    // 44
};                                                                                                                     // 45
                                                                                                                       // 46
Context.prototype.processPublication = function(publishHandler, publishContext, params) {                              // 47
  var self = this;                                                                                                     // 48
                                                                                                                       // 49
  var future = new Future;                                                                                             // 50
  this._subscriptionFutures.push(future);                                                                              // 51
  //detect when the context is ready to be sent to the client                                                          // 52
  publishContext.onStop(function() {                                                                                   // 53
    if(!future.isResolved()) {                                                                                         // 54
      future.return();                                                                                                 // 55
    }                                                                                                                  // 56
  });                                                                                                                  // 57
                                                                                                                       // 58
  try {                                                                                                                // 59
    var cursors = publishHandler.apply(publishContext, params);                                                        // 60
  } catch(ex) {                                                                                                        // 61
    console.warn('error caught on publication: ', publishContext._subscription, ': ', ex.message);                     // 62
    // since, this subscription caught on an error we can't proceed.                                                   // 63
    // but we can't also throws an error since other publications might have something useful                          // 64
    // So, it's not fair to ignore running them due to error of this sub                                               // 65
    // this might also be failed due to the use of some private API's of Meteor's Susbscription class                  // 66
    publishContext.ready();                                                                                            // 67
  }                                                                                                                    // 68
                                                                                                                       // 69
  if(cursors) {                                                                                                        // 70
    //the publish function returned a cursor                                                                           // 71
    if(cursors.constructor != Array) {                                                                                 // 72
      cursors = [cursors];                                                                                             // 73
    }                                                                                                                  // 74
                                                                                                                       // 75
    //add collection data                                                                                              // 76
    cursors.forEach(function(cursor) {                                                                                 // 77
      cursor.rewind();                                                                                                 // 78
      var collectionName =                                                                                             // 79
        (cursor._cursorDescription)? cursor._cursorDescription.collectionName: null || //for meteor-collections        // 80
        (cursor._collection)? cursor._collection._name: null; //for smart-collections                                  // 81
                                                                                                                       // 82
      self._ensureCollection(collectionName);                                                                          // 83
      self._collectionData[collectionName].push(cursor.fetch());                                                       // 84
    });                                                                                                                // 85
                                                                                                                       // 86
    //the subscription is ready                                                                                        // 87
    publishContext.ready();                                                                                            // 88
  } else if(cursors === null) {                                                                                        // 89
    //some developers send null to indicate they are not using the publication                                         // 90
    //this is not the way to go, but meteor's accounts-base also does this                                             // 91
    //so we need some special handling on this                                                                         // 92
    publishContext.ready();                                                                                            // 93
  }                                                                                                                    // 94
                                                                                                                       // 95
  if (!future.isResolved()) {                                                                                          // 96
    //don't wait forever for handler to fire ready()                                                                   // 97
    Meteor.setTimeout(function() {                                                                                     // 98
      if (!future.isResolved()) {                                                                                      // 99
        //publish handler failed to send ready signal in time                                                          // 100
        console.warn('Publish handler for', publishContext._subscription, 'sent no ready signal');                     // 101
        future.return();                                                                                               // 102
      }                                                                                                                // 103
    }, 500);  //arbitrarially set timeout to 500ms, should probably be configurable                                    // 104
  }                                                                                                                    // 105
};                                                                                                                     // 106
                                                                                                                       // 107
Context.prototype.completeSubscriptions = function(subscriptions) {                                                    // 108
  var self = this;                                                                                                     // 109
  if(typeof subscriptions == 'string') {                                                                               // 110
    subscriptions = [subscriptions];                                                                                   // 111
  } else if(!subscriptions || subscriptions.constructor != Array) {                                                    // 112
    throw new Error('subscriptions params should be either a string or array of strings');                             // 113
  }                                                                                                                    // 114
                                                                                                                       // 115
  subscriptions.forEach(function(subscription) {                                                                       // 116
    self._subscriptions[subscription] = true;                                                                          // 117
  });                                                                                                                  // 118
};                                                                                                                     // 119
                                                                                                                       // 120
Context.prototype._ensureCollection = function(collectionName) {                                                       // 121
  if(!this._collectionData[collectionName]) {                                                                          // 122
    this._collectionData[collectionName] = [];                                                                         // 123
  }                                                                                                                    // 124
};                                                                                                                     // 125
                                                                                                                       // 126
Context.prototype.getData = function() {                                                                               // 127
  // Ensure that all of the subscriptions are ready                                                                    // 128
  this._subscriptionFutures.forEach(function(future) {                                                                 // 129
    future.wait();                                                                                                     // 130
  });                                                                                                                  // 131
                                                                                                                       // 132
  return {                                                                                                             // 133
    collectionData: this._collectionData,                                                                              // 134
    subscriptions: this._subscriptions,                                                                                // 135
    loginToken: this._loginToken                                                                                       // 136
  };                                                                                                                   // 137
};                                                                                                                     // 138
                                                                                                                       // 139
FastRender._Context = Context;                                                                                         // 140
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/meteorhacks:fast-render/lib/server/inject.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
//When a HTTP Request comes, we need to figure out is it a proper request                                              // 1
//then get some query data                                                                                             // 2
//then hijack html return by meteor                                                                                    // 3
//code below, does that in abstract way                                                                                // 4
                                                                                                                       // 5
var http = Npm.require('http');                                                                                        // 6
                                                                                                                       // 7
var injectDataTemplate;                                                                                                // 8
Assets.getText('lib/server/inject_data.html', function(err, text) {                                                    // 9
  if(err) {                                                                                                            // 10
    console.error('Error reading fast-render inject_data.html: ', err.message);                                        // 11
  } else {                                                                                                             // 12
    injectDataTemplate = _.template(text.trim());                                                                      // 13
  }                                                                                                                    // 14
});                                                                                                                    // 15
                                                                                                                       // 16
var originalWrite = http.OutgoingMessage.prototype.write;                                                              // 17
http.OutgoingMessage.prototype.write = function(chunk, encoding) {                                                     // 18
  //prevent hijacking other http requests                                                                              // 19
  if(this.queryData && !this.injected &&                                                                               // 20
    encoding === undefined && /<!DOCTYPE html>/.test(chunk)) {                                                         // 21
                                                                                                                       // 22
    //if cors headers included if may cause some security holes. see more:                                             // 23
    //so we simply turn off fast-render if we detect an cors header                                                    // 24
    //read more: http://goo.gl/eGwb4e                                                                                  // 25
    if(this._headers['access-control-allow-origin']) {                                                                 // 26
      var warnMessage =                                                                                                // 27
        'warn: fast-render turned off due to CORS headers. read more: http://goo.gl/eGwb4e';                           // 28
      console.warn(warnMessage);                                                                                       // 29
      originalWrite.call(this, chunk, encoding);                                                                       // 30
      return;                                                                                                          // 31
    }                                                                                                                  // 32
                                                                                                                       // 33
    //inject data                                                                                                      // 34
    if(injectDataTemplate) {                                                                                           // 35
      var payload = {                                                                                                  // 36
        subscriptions: this.queryData.subscriptions,                                                                   // 37
        data: this.queryData.collectionData,                                                                           // 38
        loginToken: this.queryData.loginToken                                                                          // 39
      }                                                                                                                // 40
      var data = EncodeEJSON(payload);                                                                                 // 41
      var injectHtml = injectDataTemplate({data: data});                                                               // 42
      chunk = chunk.replace('</head>', injectHtml + '\n</head>');                                                      // 43
    } else {                                                                                                           // 44
      console.warn('injectDataTemplate is not ready yet!');                                                            // 45
    }                                                                                                                  // 46
                                                                                                                       // 47
    this.injected = true;                                                                                              // 48
  }                                                                                                                    // 49
                                                                                                                       // 50
  originalWrite.call(this, chunk, encoding);                                                                           // 51
};                                                                                                                     // 52
                                                                                                                       // 53
//meteor algorithm to check if this is a meteor serving http request or not                                            // 54
//add routepolicy package to the fast-render                                                                           // 55
function appUrl(url) {                                                                                                 // 56
  if (url === '/favicon.ico' || url === '/robots.txt')                                                                 // 57
    return false;                                                                                                      // 58
                                                                                                                       // 59
  // NOTE: app.manifest is not a web standard like favicon.ico and                                                     // 60
  // robots.txt. It is a file name we have chosen to use for HTML5                                                     // 61
  // appcache URLs. It is included here to prevent using an appcache                                                   // 62
  // then removing it from poisoning an app permanently. Eventually,                                                   // 63
  // once we have server side routing, this won't be needed as                                                         // 64
  // unknown URLs with return a 404 automatically.                                                                     // 65
  if (url === '/app.manifest')                                                                                         // 66
    return false;                                                                                                      // 67
                                                                                                                       // 68
  // Avoid serving app HTML for declared routes such as /sockjs/.                                                      // 69
  try {                                                                                                                // 70
    // If url is a absolute URL with http:// this throws and error and                                                 // 71
    // kill the app. Sometimes intruders will do this                                                                  // 72
    // and that causes DOS for us.                                                                                     // 73
    if (typeof(RoutePolicy) != 'undefined' && RoutePolicy.classify(url))                                               // 74
      return false;                                                                                                    // 75
  } catch(ex) {                                                                                                        // 76
    console.error(ex.stack);                                                                                           // 77
    return false;                                                                                                      // 78
  }                                                                                                                    // 79
                                                                                                                       // 80
  // we currently return app HTML on all URLs by default                                                               // 81
  return true;                                                                                                         // 82
};                                                                                                                     // 83
                                                                                                                       // 84
//check page and add queries                                                                                           // 85
WebApp.connectHandlers.use(Npm.require('connect').cookieParser());                                                     // 86
WebApp.connectHandlers.use(function(req, res, next) {                                                                  // 87
  if(appUrl(req.url)) {                                                                                                // 88
    var loginToken = req.cookies['meteor_login_token'];                                                                // 89
    FastRender._processRoutes(req.url, loginToken, req.headers, function(queryData) {                                  // 90
      res.queryData = queryData;                                                                                       // 91
      if(res.queryData) {                                                                                              // 92
        // encode the url and assign it. This is to prevent XSS                                                        // 93
        // some browsers like Chrome does the URL encoding manually                                                    // 94
        // So, we need to clear that and encode ourselves                                                              // 95
        res.queryData.serverRoutePath = encodeURI(decodeURI(req.url));                                                 // 96
      }                                                                                                                // 97
      next();                                                                                                          // 98
    });                                                                                                                // 99
    //run our route handlers and add proper queryData                                                                  // 100
  } else {                                                                                                             // 101
    next();                                                                                                            // 102
  }                                                                                                                    // 103
});                                                                                                                    // 104
                                                                                                                       // 105
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/meteorhacks:fast-render/lib/server/iron_router_support.js                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
if(!Package['iron:router']) return;                                                                                    // 1
                                                                                                                       // 2
var RouteController = Package['iron:router'].RouteController;                                                          // 3
var Router = Package['iron:router'].Router;                                                                            // 4
                                                                                                                       // 5
var currentSubscriptions = [];                                                                                         // 6
Meteor.subscribe = function(subscription) {                                                                            // 7
  currentSubscriptions.push(arguments);                                                                                // 8
};                                                                                                                     // 9
                                                                                                                       // 10
//assuming, no runtime routes will be added                                                                            // 11
Meteor.startup(function() {                                                                                            // 12
  // this is trick to run the processRoutes at the                                                                     // 13
  // end of all Meteor.startup callbacks                                                                               // 14
  Meteor.startup(processRoutes);                                                                                       // 15
});                                                                                                                    // 16
                                                                                                                       // 17
function processRoutes() {                                                                                             // 18
  Router.routes.forEach(function(route) {                                                                              // 19
    route.options = route.options || {};                                                                               // 20
    if(route.options.fastRender) {                                                                                     // 21
      handleRoute(route);                                                                                              // 22
    } else if(                                                                                                         // 23
        getController(route) &&                                                                                        // 24
        getController(route).prototype &&                                                                              // 25
        getController(route).prototype.fastRender                                                                      // 26
    ) {                                                                                                                // 27
      handleRoute(route);                                                                                              // 28
    }                                                                                                                  // 29
  });                                                                                                                  // 30
                                                                                                                       // 31
  // getting global waitOns                                                                                            // 32
  var globalWaitOns = [];                                                                                              // 33
  if(Router._globalHooks && Router._globalHooks.waitOn && Router._globalHooks.waitOn.length > 0) {                     // 34
    Router._globalHooks.waitOn.forEach(function(waitOn) {                                                              // 35
      globalWaitOns.push(waitOn.hook);                                                                                 // 36
    });                                                                                                                // 37
  }                                                                                                                    // 38
                                                                                                                       // 39
  FastRender.onAllRoutes(function(path) {                                                                              // 40
    var self = this;                                                                                                   // 41
                                                                                                                       // 42
    currentSubscriptions = [];                                                                                         // 43
    globalWaitOns.forEach(function(waitOn) {                                                                           // 44
      waitOn.call({path: path});                                                                                       // 45
    });                                                                                                                // 46
                                                                                                                       // 47
    currentSubscriptions.forEach(function(args) {                                                                      // 48
      self.subscribe.apply(self, args);                                                                                // 49
    });                                                                                                                // 50
  });                                                                                                                  // 51
};                                                                                                                     // 52
                                                                                                                       // 53
function handleRoute(route) {                                                                                          // 54
  var subscriptionFunctions = [];                                                                                      // 55
                                                                                                                       // 56
  // get potential subscription handlers from the route options                                                        // 57
  ['waitOn', 'subscriptions'].forEach(function(funcName) {                                                             // 58
    var handler = route.options[funcName];                                                                             // 59
    if(typeof handler == 'function') {                                                                                 // 60
      subscriptionFunctions.push(handler);                                                                             // 61
    } else if (handler instanceof Array) {                                                                             // 62
      handler.forEach(function(func) {                                                                                 // 63
        if(typeof func == 'function') {                                                                                // 64
          subscriptionFunctions.push(func);                                                                            // 65
        }                                                                                                              // 66
      });                                                                                                              // 67
    }                                                                                                                  // 68
  });                                                                                                                  // 69
                                                                                                                       // 70
  FastRender.route(getPath(route), onRoute);                                                                           // 71
                                                                                                                       // 72
  function onRoute(params, path) {                                                                                     // 73
    var self = this;                                                                                                   // 74
    var context = {                                                                                                    // 75
      params: params,                                                                                                  // 76
      path: path                                                                                                       // 77
    };                                                                                                                 // 78
                                                                                                                       // 79
    //reset subscriptions;                                                                                             // 80
    currentSubscriptions = [];                                                                                         // 81
    subscriptionFunctions.forEach(function(func) {                                                                     // 82
      func.call(context);                                                                                              // 83
    });                                                                                                                // 84
                                                                                                                       // 85
    // if there is a controller, try to initiate it and invoke potential                                               // 86
    // methods which could give us subscriptions                                                                       // 87
    var controller = getController(route);                                                                             // 88
    if(controller && controller.prototype) {                                                                           // 89
      if(typeof controller.prototype.lookupOption == 'function') {                                                     // 90
        // for IR 1.0                                                                                                  // 91
        // it is possible to create a controller invoke methods on it                                                  // 92
        var controllerInstance = new controller();                                                                     // 93
        controllerInstance.params = params;                                                                            // 94
        controllerInstance.path = path;                                                                                // 95
                                                                                                                       // 96
        ['waitOn', 'subscriptions'].forEach(function(funcName) {                                                       // 97
          if(controllerInstance[funcName]) {                                                                           // 98
            controllerInstance[funcName].call(controllerInstance);                                                     // 99
          }                                                                                                            // 100
        });                                                                                                            // 101
      } else {                                                                                                         // 102
        // IR 0.9                                                                                                      // 103
        // hard to create a controller instance                                                                        // 104
        // so this is the option we can take                                                                           // 105
        var waitOn = controller.prototype.waitOn;                                                                      // 106
        if(waitOn) {                                                                                                   // 107
          waitOn.call(context);                                                                                        // 108
        }                                                                                                              // 109
      }                                                                                                                // 110
    }                                                                                                                  // 111
                                                                                                                       // 112
    currentSubscriptions.forEach(function(args) {                                                                      // 113
      self.subscribe.apply(self, args);                                                                                // 114
    });                                                                                                                // 115
  }                                                                                                                    // 116
}                                                                                                                      // 117
                                                                                                                       // 118
function getPath(route) {                                                                                              // 119
  if(route._path) {                                                                                                    // 120
    // for IR 1.0                                                                                                      // 121
    return route._path;                                                                                                // 122
  } else {                                                                                                             // 123
    // for IR 0.9                                                                                                      // 124
    var name = (route.name == "/")? "" : name;                                                                         // 125
    return route.options.path || ("/" + name);                                                                         // 126
  }                                                                                                                    // 127
}                                                                                                                      // 128
                                                                                                                       // 129
function getController(route) {                                                                                        // 130
  if(route.findControllerConstructor) {                                                                                // 131
    // for IR 1.0                                                                                                      // 132
    return route.findControllerConstructor();                                                                          // 133
  } else if(route.findController) {                                                                                    // 134
    // for IR 0.9                                                                                                      // 135
    return route.findController();                                                                                     // 136
  } else {                                                                                                             // 137
    // unsupported version of IR                                                                                       // 138
    return null;                                                                                                       // 139
  }                                                                                                                    // 140
}                                                                                                                      // 141
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['meteorhacks:fast-render'] = {
  FastRender: FastRender
};

})();

//# sourceMappingURL=meteorhacks_fast-render.js.map
