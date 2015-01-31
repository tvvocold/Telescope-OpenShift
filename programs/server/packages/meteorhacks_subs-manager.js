(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var _ = Package.underscore._;
var EJSON = Package.ejson.EJSON;

/* Package-scope variables */
var SubsManager;

(function () {

///////////////////////////////////////////////////////////////////////////////////
//                                                                               //
// packages/meteorhacks:subs-manager/lib/sub_manager.js                          //
//                                                                               //
///////////////////////////////////////////////////////////////////////////////////
                                                                                 //
SubsManager = function (options) {                                               // 1
  var self = this;                                                               // 2
  self.options = options || {};                                                  // 3
  // maxiumum number of subscriptions are cached                                 // 4
  self.options.cacheLimit = self.options.cacheLimit || 10;                       // 5
  // maximum time, subscription stay in the cache                                // 6
  self.options.expireIn = self.options.expireIn || 5;                            // 7
                                                                                 // 8
  self._cacheMap = {};                                                           // 9
  self._cacheList = [];                                                          // 10
  self.ready = false;                                                            // 11
  self.dep = new Deps.Dependency();                                              // 12
                                                                                 // 13
  self.computation = self._registerComputation();                                // 14
};                                                                               // 15
                                                                                 // 16
SubsManager.prototype.subscribe = function() {                                   // 17
  var self = this;                                                               // 18
  if(Meteor.isClient) {                                                          // 19
    this._addSub(arguments);                                                     // 20
                                                                                 // 21
    return {                                                                     // 22
      ready: function() {                                                        // 23
        self.dep.depend();                                                       // 24
        return self.ready;                                                       // 25
      }                                                                          // 26
    };                                                                           // 27
  } else {                                                                       // 28
    // to support fast-render                                                    // 29
    if(Meteor.subscribe) {                                                       // 30
      return Meteor.subscribe.apply(Meteor, arguments);                          // 31
    }                                                                            // 32
  }                                                                              // 33
};                                                                               // 34
                                                                                 // 35
SubsManager.prototype._addSub = function(args) {                                 // 36
  var self = this;                                                               // 37
  var hash = EJSON.stringify(args);                                              // 38
  if(!self._cacheMap[hash]) {                                                    // 39
    var sub = {                                                                  // 40
      args: args,                                                                // 41
      hash: hash                                                                 // 42
    };                                                                           // 43
                                                                                 // 44
    self._cacheMap[hash] = sub;                                                  // 45
    self._cacheList.push(sub);                                                   // 46
                                                                                 // 47
    self.ready = false;                                                          // 48
    // no need to interfere with the current computation                         // 49
    if(Deps.currentComputation) {                                                // 50
      Deps.afterFlush(function() {                                               // 51
        self.computation.invalidate();                                           // 52
      });                                                                        // 53
    } else {                                                                     // 54
      self.computation.invalidate();                                             // 55
    }                                                                            // 56
  }                                                                              // 57
                                                                                 // 58
  // add the current sub to the top of the list                                  // 59
  var sub = self._cacheMap[hash];                                                // 60
  sub.updated = (new Date).getTime();                                            // 61
                                                                                 // 62
  var index = self._cacheList.indexOf(sub);                                      // 63
  self._cacheList.splice(index, 1);                                              // 64
  self._cacheList.push(sub);                                                     // 65
};                                                                               // 66
                                                                                 // 67
SubsManager.prototype._applyCacheLimit = function () {                           // 68
  var self = this;                                                               // 69
  var overflow = self._cacheList.length - self.options.cacheLimit;               // 70
  if(overflow > 0) {                                                             // 71
    var removedSubs = self._cacheList.splice(0, overflow);                       // 72
    _.each(removedSubs, function(sub) {                                          // 73
      delete self._cacheMap[sub.hash];                                           // 74
    });                                                                          // 75
  }                                                                              // 76
};                                                                               // 77
                                                                                 // 78
SubsManager.prototype._applyExpirations = function() {                           // 79
  var self = this;                                                               // 80
  var newCacheList = [];                                                         // 81
                                                                                 // 82
  var expirationTime = (new Date).getTime() - self.options.expireIn * 60 * 1000; // 83
  _.each(self._cacheList, function(sub) {                                        // 84
    if(sub.updated >= expirationTime) {                                          // 85
      newCacheList.push(sub);                                                    // 86
    } else {                                                                     // 87
      delete self._cacheMap[sub.hash];                                           // 88
    }                                                                            // 89
  });                                                                            // 90
                                                                                 // 91
  self._cacheList = newCacheList;                                                // 92
};                                                                               // 93
                                                                                 // 94
SubsManager.prototype._registerComputation = function() {                        // 95
  var self = this;                                                               // 96
  var computation = Deps.autorun(function() {                                    // 97
    self._applyExpirations();                                                    // 98
    self._applyCacheLimit();                                                     // 99
                                                                                 // 100
    var ready = true;                                                            // 101
    _.each(self._cacheList, function(sub) {                                      // 102
      sub.ready = Meteor.subscribe.apply(Meteor, sub.args).ready();              // 103
      ready = ready && sub.ready;                                                // 104
    });                                                                          // 105
                                                                                 // 106
    if(ready) {                                                                  // 107
      self.ready = true;                                                         // 108
      self.dep.changed();                                                        // 109
    }                                                                            // 110
  });                                                                            // 111
                                                                                 // 112
  return computation;                                                            // 113
};                                                                               // 114
                                                                                 // 115
SubsManager.prototype.reset = function() {                                       // 116
  var self = this;                                                               // 117
  var oldComputation = self.computation;                                         // 118
  self.computation = self._registerComputation();                                // 119
                                                                                 // 120
  // invalidate the new compuation and it will fire new subscriptions            // 121
  self.computation.invalidate();                                                 // 122
                                                                                 // 123
  // after above invalidation completed, fire stop the old computation           // 124
  // which then send unsub messages                                              // 125
  // mergeBox will correct send changed data and there'll be no flicker          // 126
  Deps.afterFlush(function() {                                                   // 127
    oldComputation.stop();                                                       // 128
  });                                                                            // 129
};                                                                               // 130
///////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['meteorhacks:subs-manager'] = {
  SubsManager: SubsManager
};

})();

//# sourceMappingURL=meteorhacks_subs-manager.js.map
