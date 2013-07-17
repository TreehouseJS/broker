(function (global) {
  global.onmessage = function (e) {
    var whitelisted = e.data.reduce(function (result, key) {
      result[key] = true;
      return result;
    }, {});

    var result = {
      failed: [],
      stillNull: []
    };
    var success = true;
    function walk(obj, debug) {
      var proto = Object.getPrototypeOf(obj);
      var prototype = obj.constructor.prototype;

      Object.getOwnPropertyNames(obj).forEach(function (name) {
        if (!whitelisted[name]) {
          var deleted = delete obj[name];
          if (deleted) {
            success = false;
            result.failed.push(name);

            if (obj[name] === null) {
              result.stillNull.push(name);
            }
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
    postMessage(success || result);
  };
}(this));
