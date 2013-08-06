(function (global) {
  global.onmessage = function (e) {
    var config = e.data || {};
    var importScripts = global.importScripts;
    config.properties = config.properties || [];
    config.properties.ignore = config.properties.ignore || [];
    config.properties.retain = config.properties.retain || [];

    global.onmessage = function () { /* NOPE */ };

    var whitelisted = config.properties.ignore.reduce(function (result, key) {
        result[key] = true;
        return result;
      }, {});

    var retained = config.properties.retain.reduce(function (result, key) {
        result[key] = true;
        return result;
      }, {});

    var failed = [];
    /**
     * Walk all properties of an object, including those on its prototype chain
     */
    function walk(obj) {
      Object.getOwnPropertyNames(obj).forEach(function (name) {
        var descriptor;

        if (!whitelisted[name]) {
          descriptor = Object.getOwnPropertyDescriptor(obj, name);

          try {
            Object.defineProperty(obj, name, {
              configurable: false,
              writable: descriptor.writable,
              enumerable: descriptor.enumerable,
              value: retained[name] ? obj[name] : null
            });
          } catch (e) {
            failed.push('could not clobber "' + name + '": ' + e.message);
          }
        }
      });

      var prototype = obj.constructor.prototype;
      if (prototype && prototype !== obj) {
        walk(prototype);
      }

      var proto = Object.getPrototypeOf(obj);
      if (proto && proto !== obj) {
        walk(proto);
      }
    }

    walk(global);

    global.postMessage('ready');

    /**
     * config.scripts is an array of scripts to run
     *
     * Scripts are run in order. Before they run, importScripts is set to null.
     */
    importScripts.apply(global, config.scripts || []);
  };
}(this));
