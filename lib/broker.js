// MDN polyfill of Function.prototype.bind (http://mzl.la/1aeMvnG)
// FIXME: remove when PhantomJS 2.0 ships
if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== 'function') {
      // closest thing possible to the ES5 internal IsCallable function
      throw new TypeError('Function.prototype.bind - ' +
        'what is trying to be bound is not callable');
    }

    var aArgs = Array.prototype.slice.call(arguments, 1), 
      fToBind = this, 
      fNOP = function () {},
      fBound = function () {
        return fToBind.apply(this instanceof fNOP && oThis ?
                             this :
                             oThis, aArgs.concat(
                               Array.prototype.slice.call(arguments)));
      };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}

// Tiny JSON-RPC Client
;(function (root, factory) {
    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(factory);
    } else {
        // Browser globals
        root.tinyJsonRpc = root.tinyJsonRpc || {};
        root.tinyJsonRpc.util = factory();
    }
}(this, function () {
    function defaults(a, b) {
        for (var key in b) {
            if (!a.hasOwnProperty(key)) {
                a[key] = b[key];
            }
        }

        return a;
    }

    function merge(a, b) {
        for (var key in b) {
            a[key] = b[key];
        }

        return a;
    }

    function clone(o) {
        return defaults({}, o);
    }

    function toArray(x) {
        return Array.prototype.slice.call(x);
    }

    function isNumber(x) { return typeof x === 'number'; }
    function isString(x) { return typeof x === 'string'; }
    function isFunction(x) { return typeof x === 'function'; }
    function isArray(x) { return x instanceof Array; }
    function isObject(x) { return typeof x === 'object'; }
    function isNull(x) { return x === null; }
    function isUndefined(x) { return x === void undefined; }

    return {
        defaults: defaults,
        merge: merge,
        clone: clone,
        toArray: toArray,
        isNumber: isNumber,
        isString: isString,
        isFunction: isFunction,
        isArray: isArray,
        isObject: isObject,
        isNull: isNull,
        isUndefined: isUndefined
    };
}));

;(function (root, factory) {
    var requireBase = '.';

    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.

        // PhantomJS support
        requireBase = typeof phantom !== 'undefined' && phantom.requireBase ?
            phantom.requireBase + '/tiny-jsonrpc/lib/tiny-jsonrpc' :
            requireBase;

        module.exports = factory(require(requireBase + '/util'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['./util'], factory);
    } else {
        // Browser globals
        root.tinyJsonRpc = root.tinyJsonRpc || {};
        root.tinyJsonRpc.Client = factory(tinyJsonRpc.util);
    }
}(this, function (util) {
    var defaultConfig = {};

    function Client(options) {
        this.options = options =
            util.clone(util.defaults(options || {}, defaultConfig));

        if (!options.server) {
            throw 'The server config option is required';
        }

        this._server = options.server;
        this._nextId = 0;
    }

    Client.prototype._makeRequest = function () {
        var method, params, callback, id;
        var args = Array.prototype.slice.call(arguments);
        var lastArg = args.length - 1;
        var request = {
            jsonrpc: '2.0'
        };

        if (util.isObject(args[0]) &&
            !util.isUndefined(args[0]) && !util.isNull(args[0])
        ) {
            // called with a config object
            method = args[0].method;
            params = args[0].params;
            request.callback = args[0].callback;
        } else {
            // called with a method name and optional params and callback
            method = args[0];
            params = args.slice(1);
        }

        if (!util.isString(method)) {
            throw 'Method must be a string';
        }

        if (params === null ||
            (!util.isArray(params) && !util.isObject(params))
        ) {
            throw 'Params must be an object or array';
        }

        request.method = method;
        if (params) {
            request.params = params;
        }

        return request;
    };

    Client.prototype._send = function (request) {
        try {
            request = JSON.stringify(request);
        } catch (e) {
            throw 'Could not serialize request to JSON';
        }

        return JSON.parse(this._server.respond(request));
    };

    Client.prototype.request = function () {
        var request = this._makeRequest.apply(this, arguments);
        var callback;
        var response;

        request.id = this._nextId++;

        if (request.callback) {
            callback = request.callback;
            delete request.callback;
        } else if (util.isArray(request.params) &&
            util.isFunction(request.params[request.params.length - 1])
        ) {
            callback = request.params.pop();
        }

        response = this._send(request);

        if (callback) {
            callback(response.error || null, response.result || null);
        }
    };

    Client.prototype.notify = function () {
        var request = this._makeRequest.apply(this, arguments);

        delete request.callback;

        this._send(request);
    };

    function parseArgs(args) {
        args = args.split(/,\s*/);
        var result = {};

        for (var i = 0; i < args.length; i++) {
            result[args[i]] = i;
        }

        return result;
    }

    function keys(o) {
        if (Object.prototype.keys) {
            return o.keys();
        }

        var result = [];
        for (var k in o) {
            if (o.hasOwnProperty(k)) {
                result.push(k);
            }
        }

        return result;
    }

    return Client;
}));

;(function (root, factory) {
    var requireBase = '.';

    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.

        // PhantomJS support
        requireBase = typeof phantom !== 'undefined' && phantom.requireBase ?
            phantom.requireBase + '/tiny-jsonrpc/lib/tiny-jsonrpc' :
            requireBase;

        module.exports = factory(require(requireBase + '/client'),
            require(requireBase + '/util'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['./client', './util'], factory);
    } else {
        // Browser globals
        root.tinyJsonRpc = root.tinyJsonRpc || {};
        root.tinyJsonRpc.PostMessageClient =
            factory(tinyJsonRpc.Client, tinyJsonRpc.util);
    }
}(this, function (Client, util) {
    var global = this;

    function PostMessageClient(options) {
        options.server = 'none';
        Client.apply(this, arguments);

        this._callbacks = {};
    }

    PostMessageClient.prototype = new Client({
        server: true
    });
    PostMessageClient.prototype.constructor = PostMessageClient;

    PostMessageClient.prototype._send = function (request) {
        var success;

        try {
            JSON.stringify(request);
        } catch (e) {
            throw 'Could not serialize request to JSON';
        }

        global.postMessage(request);
    };

    PostMessageClient.prototype.request = function () {
        var request = this._makeRequest.apply(this, arguments);
        var callback;
        var response;

        request.id = this._nextId++;

        if (request.callback) {
            callback = request.callback;
            delete request.callback;
        } else if (util.isArray(request.params) &&
            util.isFunction(request.params[request.params.length - 1])
        ) {
            callback = request.params.pop();
        }

        this._send(request);

        if (callback && util.isNumber(request.id)) {
            this._callbacks[request.id] = callback;
        }
    };

    PostMessageClient.prototype._onMessage = function (e) {
        var response = e.data;

        if (!util.isUndefined(response.id) && this._callbacks[response.id]) {
            this._callbacks[response.id](response.error || null,
                response.result || null);
            delete this._callbacks[response.id];
        }
    };

    return PostMessageClient;
}));

(function (global) {
  var rpcClient = new tinyJsonRpc.PostMessageClient({});

  function sendConsoleMessage() {
    var args = Array.prototype.slice.call(arguments);
    var i;

    rpcClient.notify({
      method: 'console',
      params: args
    });
  }

  var console = [
      'log', 'debug', 'info', 'warn', 'error', 'assert', 'dir'
    ].reduce(function (result, method) {
      result[method] = sendConsoleMessage.bind(console, method);
      return result;
    }, {});

  rpcClient.notify('emit', 'ready');
}(this));
