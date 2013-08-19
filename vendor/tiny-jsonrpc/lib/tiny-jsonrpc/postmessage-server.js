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
        this._client = options.client || global;
        this._client.addEventListener('message', this._onMessage.bind(this));
    }

    PostMessageServer.prototype = new Server();
    PostMessageServer.prototype.constructor = PostMessageServer;

    PostMessageServer.prototype._onMessage = function (e) {
        if (!e.data || !e.data.method) {
            // ignore obviously invalid messages: they're not for us
            return;
        }

        var result = this.respond(JSON.stringify(e.data));

        if (typeof result === 'string') {
            this._client.postMessage(JSON.parse(result));
        }
    };

    return PostMessageServer;
}));
