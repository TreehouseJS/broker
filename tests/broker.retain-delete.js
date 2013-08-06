(function (global) {
  global.onmessage = function (e) {
    var retained = e.data;
    var result = {
      failed: []
    };
    var success = true;

    function walk(obj, debug) {
      var proto = Object.getPrototypeOf(obj);
      var prototype = obj.constructor.prototype;

      retained.forEach(function (name) {
        if (obj.hasOwnProperty(name)) {
          var value = obj[name];
          var deleted = delete obj[name];
          if (deleted || obj[name] !== value) {
            success = false;
            result.failed.push(name);
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
