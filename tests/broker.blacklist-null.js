(function (global) {
  global.onmessage = function (e) {
    var blacklisted = e.data.reduce(function (result, key) {
      result[key] = true;
      return result;
    }, {});

    var failed = [];
    var success = true;
    function walk(obj, debug) {
      var proto = Object.getPrototypeOf(obj);
      var prototype = obj.constructor.prototype;

      Object.getOwnPropertyNames(obj).forEach(function (name) {
        if (blacklisted.hasOwnProperty(name) && blacklisted[name]) {
          if (obj[name] !== null) {
            success = false;
            failed.push(name);
          }
        }
      });

      if (prototype && prototype !== obj) {
        walk(prototype);
      }

      if (proto && proto !== obj) {
        walk(proto, true);
      }
    }

    walk(global);
    postMessage(success || failed);
  };
}(this));
