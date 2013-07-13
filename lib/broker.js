(function (global) {
  var whitelist = [
    // FIXME: organize by domain and comment
    'Array', 'ArrayBuffer', 'Boolean', 'DataView', 'Date', 'Error', 'EvalError',
    'EventSource', 'FileError', 'FileException', 'Float32Array', 'Float64Array',
    'Function', 'Infinity', 'Int16Array', 'Int32Array', 'Int8Array', 'JSON',
    'Math', 'MessageEvent', 'NaN', 'Number', 'Object', 'PERSISTENT',
    'RangeError', 'ReferenceError', 'RegExp', 'String', 'SyntaxError',
    'TEMPORARY', 'TypeError', 'URIError', 'Uint16Array', 'Uint32Array',
    'Uint8Array', 'WebKitBlobBuilder', 'WebKitFlags', 'WorkerLocation',
    'clearInterval', 'clearTimeout', 'close', 'decodeURI', 'decodeURIComponent',
    'dispatchEvent', 'encodeURI', 'encodeURIComponent', 'escape', 'eval',
    'isFinite', 'isNaN', 'location', 'navigator', 'onerror', 'parseFloat',
    'parseInt', 'removeEventListener', 'self', 'setInterval', 'setTimeout',
    'undefined', 'unescape', 'webkitURL',

    // these are required by the broker
    'importScripts', 'postMessage', 'onmessage', 'addEventListener',
    'removeEventListener',

    // Firefox
    'uneval',

    // Safari 6.0.4
    'webkitNotifications'
  ];

  var whitelisted = whitelist.reduce(function (result, key) {
      result[key] = true;
      return result;
    }, {});
  var failed = [];

  function walk(obj) {
    var prototype = obj.constructor.prototype;

    Object.getOwnPropertyNames(obj).forEach(function (name) {
      var descriptor;

      if (!whitelisted[name]) {
        descriptor = Object.getOwnPropertyDescriptor(obj, name);

        try {
          Object.defineProperty(obj, name, {
            configurable: false,
            writable: descriptor.writable,
            enumerable: descriptor.enumerable,
            value: null
          });
        } catch (e) {
          failed.push('could not clobber "' + name + '": ' + e.message);
        }
      }
    });

    if (prototype && prototype !== obj) {
      walk(prototype);
    }
  }

  walk(global);

  global.treehouse = {
    whitelist: whitelist.concat(['treehouse', 'tinyJsonRpc']),
    failed: failed
  };
}(this));

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
        global.addEventListener('message', this._onMessage.bind(this));
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
        root.tinyJsonRpc.Server = factory(tinyJsonRpc.util);
    }
}(this, function (util) {
    var defaultConfig = {};

    function Server(options) {
        this.options = options =
            util.clone(util.defaults(options || {}, defaultConfig));

        this._methods = {};
    }

    Server.prototype.errors = {
        PARSE_ERROR: -32700,
        INVALID_REQUEST: -32600,
        METHOD_NOT_FOUND: -32601,
        INVALID_PARAMS: -32602,
        INTERNAL_ERROR: -32603
    };

    // TODO: real error messages here
    Server.prototype.errorMessages = (function () {
        var msgs = {};
        var errs = Server.prototype.errors;
        for (var k in errs) {
            msgs[errs[k]] = k;
        }
        return msgs;
    }());

    function parseArgs(args) {
        args = args.split(/,\s*/);
        var result = {};

        for (var i = 0; i < args.length; i++) {
            result[args[i]] = i;
        }

        return result;
    }

    function functionSnippet(fn) {
        return fn.toString().slice(0, 20) + '...';
    }

    function parseFunction(fn) {
        var parsed = fn.toString().match(/function\s+(\w+)?\((.*)\)/);

        if (!parsed) {
            throw 'Cannot parse function: ' + functionSnippet(fn);
        }

        return {
            fn: fn,
            name: parsed[1],
            args: parseArgs(parsed[2])
        };
    }

    Server.prototype._provide = function (toProvide, fn, name) {
        var fnRecord = parseFunction(fn);

        fnRecord.name = name || fnRecord.name;

        if (!fnRecord.name) {
            throw 'Cannot provide anonymous function: ' + functionSnippet(fn);
        }

        if (this._methods[fnRecord.name] || toProvide[fnRecord.name]) {
            throw 'Cannot provide duplicate function ' + fnRecord.name;
        }

        toProvide[fnRecord.name] = fnRecord;
    };

    Server.prototype.provide = function () {
        var args = util.toArray(arguments);
        var toProvide = {};
        var method;

        args.forEach(function (x) {
            if (util.isFunction(x)) {
                method = this._provide(toProvide, x);
            } else if (util.isObject(x)) {
                for (var k in x) {
                    if (util.isFunction(x[k])) {
                        this._provide(toProvide, x[k], k);
                    }
                }
            } else {
                throw 'Cannot provide illegal argument: ' + x;
            }
        }, this);

        util.merge(this._methods, toProvide);
    };

    Server.prototype.revoke = function () {
        var args = util.toArray(arguments);

        for (var i = 0; i < args.length; i++) {
            delete this._methods[args[i]];
        }
    };

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

    Server.prototype.provides = function (method) {
        if (util.isUndefined(method)) {
            return keys(this._methods);
        }

        return this._methods.hasOwnProperty(method);
    };

    Server.prototype.makeError = function(id, message, code, data) {
        var error;
        var response;

        if (util.isNumber(message)) {
            data = code;
            code = message;
            message = this.errorMessages[code];
        }

        if (!util.isNumber(code)) {
            code = this.errors.INTERNAL_ERROR;
        }

        error = { id: id, code: code, message: message };

        if (!util.isUndefined(data)) {
            error.data = data;
        }

        if (util.isNumber(id) || util.isString(id) || id === null) {
            response = {
                jsonrpc: '2.0',
                id: id
            };
            response.error = error;
            return response;
        } else {
            response = new Error(message);
            response.code = code;

            if (!util.isUndefined(data)) {
                response.data = data;
            }

            return response;
        }
    };

    Server.prototype.makeResponse = function (id, result) {
        var response = {
            jsonrpc: '2.0',
            id: id,
            result: result
        };

        return util.isString(id) || util.isNumber(id) || id === null ?
            response : null;
    };

    /**
     * Transform named arguments to an args array
     *
     * Missing args are undefined.
     */
    function marshal(params, method) {
        var result = [];

        if (util.isArray(params)) {
            result = params;
        } else if (params) {
            for (var k in params) {
                if (util.isNumber(method.args[k])) {
                    result[method.args[k]] = params[k];
                }
            }
        }

        return result;
    }

    Server.prototype.respond = function (request) {
        var code, response, results;

        // parse the payload
        try {
            request = JSON.parse(request, this.options.reviver);
        } catch (e) {
            return JSON.stringify(
                this.makeError(null, this.errors.PARSE_ERROR, e));
        }

        // is it a batch request?
        if (util.isArray(request)) {
            if (request.length < 1) {
                // empty batch requests are invalid
                return JSON.stringify(
                    this.makeError(null, this.errors.INVALID_REQUEST));
            }

            results = [];
            for (var i = 0; i < request.length; i++) {
                response = this._respond(request[i]);

                if (response !== null && !(response instanceof Error)) {
                    // if it's an actual response, send it
                    results.push(response);
                }
            }

            if (results.length < 1) {
                // don't respond if everything was notifications
                results = null;
            }
        } else {
            results = this._respond(request);
        }

        return results !== null && !(results instanceof Error) ?
            JSON.stringify(results) : results;
    };

    Server.prototype._respond = function (request) {
        var code;

        if (!util.isUndefined(request.id) &&
            !util.isNull(request.id) &&
            !util.isString(request.id) &&
            !util.isNumber(request.id)
        ) {
            return this.makeError(null, this.errors.INVALID_REQUEST);
        }

        // is it a valid request?
        if (request.jsonrpc !== '2.0' ||
            !util.isString(request.method) ||
            (
                !util.isUndefined(request.params) &&
                !util.isArray(request.params) &&
                !util.isObject(request.params)
            )
        ) {
            return this.makeError(util.isUndefined(request.id) ?
                null : request.id,
                this.errors.INVALID_REQUEST);
        }

        // coolbro. handle it.
        var method = this._methods[request.method];
        if (!method) {
            return this.makeError(request.id, this.errors.METHOD_NOT_FOUND);
        }

        try {
            return this.makeResponse(request.id,
                method.fn.apply(null, marshal(request.params, method))
            );
        } catch (e) {
            code = util.isNumber(e.code) ? e.code : this.errors.INTERNAL_ERROR;

            return this.makeError(request.id, e.message || e, e.code, e.data);
        }
    };

    return Server;
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

        module.exports = factory(require(requireBase + '/server'),
            require(requireBase + '/util'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['./server', './util'], factory);
    } else {
        // Browser globals
        root.tinyJsonRpc = root.tinyJsonRpc || {};
        root.tinyJsonRpc.PostMessageServer =
            factory(tinyJsonRpc.Server, tinyJsonRpc.util);
    }
}(this, function (Server, util) {
    var global = this;

    function PostMessageServer(options) {
        Server.apply(this, arguments);
        global.addEventListener('message', this._onMessage.bind(this));
    }

    PostMessageServer.prototype = new Server();
    PostMessageServer.prototype.constructor = PostMessageServer;

    PostMessageServer.prototype._onMessage = function (e) {
        var result = this.respond(JSON.stringify(e.data));

        if (typeof result === 'string') {
            postMessage(JSON.parse(result));
        }
    };

    return PostMessageServer;
}));

// XXX: You are here.
// 
// - move postmessage client/server to another repo
// - implement a simple worker proxy that is an eventemitter (install
//   eventemitter2)
// - proxy methods should return promises if a reply is expected
// - implement util support to spin one up

(function (global) {
  var rpcClient = new tinyJsonRpc.PostMessageClient({});
  var rpcServer = new tinyJsonRpc.PostMessageServer({});

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

  rpcServer.provide(function importScripts() {
    global.importScripts.apply(global, arguments);
  });

  self.onerror = function (e) {
    console.log('Error:', e.message, 'on', e.lineno, 'in', e.filename);
  };
  rpcClient.notify('emit', 'ready');
}(this));
