define([
  'lodash',
  'rsvp',
  'tiny-jsonrpc-postmessage'
],
function (
  _,
  rsvp,
  tinyJsonRpcPostMessage
) {
  var PostMessageClient = tinyJsonRpcPostMessage.Client;
  var PostMessageServer = tinyJsonRpcPostMessage.Server;

  function Sandbox(worker) {
    this._worker = worker;

    // set up a PostMessageClient
    this._client = new PostMessageClient({ server: worker });
    this.notify = this._client.notify.bind(this._client);

    // set up a PostMessageServer
    this._server = new PostMessageServer({ client: worker });
    this.provide = this._server.provide.bind(this._server);

    // provide the worker API
    this.addEventListener = worker.addEventListener.bind(worker);
    this.removeEventListener = worker.removeEventListener.bind(worker);
    this.postMessage = worker.postMessage.bind(worker);
    this.terminate = worker.terminate.bind(worker);

    Object.defineProperty(this, 'onmessage', {
      configurable: true,
      get: function () {
        return this._worker.onmessage;
      },
      set: function (fn) {
        this._worker.onmessage = fn;
      }
    });

    Object.defineProperty(this, 'onerror', {
      configurable: true,
      get: function () {
        return this._worker.onerror;
      },
      set: function (fn) {
        this._worker.onerror = fn;
      }
    });
  }

  Sandbox.defaultConfig = {
    properties: {
      whitelist: [
        'Array', 'ArrayBuffer', 'Boolean', 'DataView', 'Date', 'Error',
        'EvalError', 'EventSource', 'FileError', 'FileException',
        'Float32Array', 'Float64Array', 'Function', 'Infinity', 'Int16Array',
        'Int32Array', 'Int8Array', 'JSON', 'Math', 'MessageEvent', 'NaN',
        'Number', 'Object', 'PERSISTENT', 'RangeError', 'ReferenceError',
        'RegExp', 'String', 'SyntaxError', 'TEMPORARY', 'TypeError', 'URIError',
        'Uint16Array', 'Uint32Array', 'Uint8Array', 'WebKitBlobBuilder',
        'WebKitFlags', 'WorkerLocation',

        'atob', 'btoa', 'clearInterval', 'clearTimeout', 'close', 'decodeURI',
        'decodeURIComponent', 'dispatchEvent', 'encodeURI',
        'encodeURIComponent', 'escape', 'eval', 'isFinite', 'isNaN', 'location',
        'navigator', 'onclose', 'onerror', 'parseFloat', 'parseInt',
        'removeEventListener', 'self', 'setInterval', 'setTimeout', 'undefined',
        'unescape', 'webkitURL',

        // these are required by the broker
        'postMessage', 'onmessage', 'addEventListener', 'removeEventListener',

        // Firefox
        'uneval',

        // Safari 6.0.4
        'webkitNotifications'
      ],
      blacklist: []
    }
  };

  /**
   * Make a JSON-RPC request to the worker
   *
   * This delegates to _client.request and accepts either method signature, but
   * does not accept a callback. Instead, this returns a promise.
   */
  Sandbox.prototype.request = function request() {
    var first = _.first(arguments);
    var req = {};

    if (_.isString(first)) {
      req.method = first;
      req.params = _.rest(arguments);
    } else {
      req = first;
    }

    return new rsvp.Promise((function (resolve, reject) {
      req.callback = function (error, result) {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      };

      this._client.request(req);
    }).bind(this));
  };

  Sandbox.prototype.provides = function provides() {
    return this.request('provides');
  };

  function create(config) {
    return new rsvp.Promise(function (resolve, reject) {
      var worker = new Worker('/lib/broker.js');

      worker.postMessage(_.merge(config || {}, Sandbox.defaultConfig));
      worker.onmessage = onReady.bind(worker, resolve, reject);
    });
  }

  function onReady(resolve, reject, e) {
    if (e.data === 'ready') {
      this.onmessage = null;
      resolve(new Sandbox(this));
    }
  }

  return {
    create: create,
    Sandbox: Sandbox
  };
});
