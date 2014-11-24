(function (global) {
  'use strict';

  /**
   * Convert an array of property names to a hash
   *
   * Given an array of string property names, return an object whose keys are
   * the names, each with value `true`.
   */
  function propertyArrayToHash(a) {
    return a.reduce(function (result, key) {
        result[key] = true;
        return result;
      }, {});
  }

  global.onmessage = function (e) {
    var config = e.data || {};
    var importScripts = global.importScripts;
    config.properties = config.properties || [];
    config.properties.whitelist = config.properties.whitelist || [];
    config.properties.blacklist = config.properties.blacklist || [];
    config.properties.retain = config.properties.retain || [];

    global.onmessage = function () { /* NOPE */ };

    var whitelisted = propertyArrayToHash(config.properties.whitelist);
    var blacklisted = propertyArrayToHash(config.properties.blacklist);
    var retained = propertyArrayToHash(config.properties.retain);

    var failed = [];

    /**
     * Make a property unconfigurable and set its value to null if not retained
     */
    function clobber(obj, name) {
      var descriptor = Object.getOwnPropertyDescriptor(obj, name);

      Object.defineProperty(obj, name, {
        configurable: false,
        writable: descriptor.writable,
        enumerable: descriptor.enumerable,
        value: retained[name] ? obj[name] : null
      });

      if (!retained[name]) {
        // If we can delete an unretained clobbered property, we need to crash,
        // as we will not be able to enforce our security guarantees.
        //
        // Some browsers will throw on attempts to delete certain properties of
        // particular objects. We swallow those errors, as the thing we actually
        // care about is the `delete` succeeding.
        try {
          delete obj[name];
        } catch (e) { /* intentionally empty */ }

        if (obj[name] !== null) {
          // the delete worked, so close the worker and throw an error
          self.close();
          throw new Error('Could not clobber ' + name);
        }
      }

      return true;
    }

    /**
     * Walk all properties of an object, including those on its prototype chain
     */
    function walk(obj) {
      Object.getOwnPropertyNames(obj).forEach(function (name) {
        if (!whitelisted[name]) {
          if (!clobber(obj, name)) {
            // FIXME: this is lame
            failed.push('could not clobber "' + name + '": ' + e.message);
          }
        }
      });

      for (var name in blacklisted) {
        if (obj.hasOwnProperty(name) && !clobber(obj, name)) {
          // FIXME: this is lame
          failed.push('could not clobber "' + name + '": ' + e.message);
        }
      }

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
