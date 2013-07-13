(function (global) {
  function getAllPropertyNames(obj) {
    var result = Object.getOwnPropertyNames(obj);
    var prototype = obj.constructor.prototype;

    if (!prototype || prototype === obj) {
      return result;
    }

    return result.concat(getAllPropertyNames(prototype));
  }

  var whitelisted = treehouse.whitelist.reduce(function (result, key) {
      result[key] = true;
      return result;
    }, {});

  var unprotectedProperties = Object.keys(
    getAllPropertyNames(self).reduce(function (result, name) {
      if (!result.hasOwnProperty(name) && !whitelisted[name]) {
        try {
          delete global[name];
          if (global[name] !== null) {
            result[name] = true;
          }
        } catch (e) {
          postMessage('Could not delete "' + name + '": ' + e.message);
        }
      }
      return result;
    }, {}));
  postMessage(unprotectedProperties);
}(this));
