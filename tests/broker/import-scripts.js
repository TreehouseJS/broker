define([
  'intern!bdd',
  'intern/chai!expect',
  'node_modules/intern/node_modules/dojo/Deferred'
], function (bdd, expect, Deferred) {
  bdd.describe('importScripts', function () {
    var worker;

    bdd.beforeEach(function () {
      var dfd = new Deferred();
      worker = new Worker('/lib/broker.js');

      worker.onmessage = function (e) {
        expect(e.data).to.eql({
          jsonrpc: '2.0',
          method: 'emit',
          params: ['ready']
        });

        dfd.resolve();

      };

      return dfd.promise;
    });

    bdd.it('should run a single script', function () {
      var dfd = this.async(1000);

      worker.onmessage = dfd.callback(function (e) {
        expect(e.data).to.eql('script 1 ran');
      });

      worker.postMessage({
        jsonrpc: '2.0',
        method: 'importScripts',
        params: ['/tests/broker/import-scripts.script-1.js']
      });
    });

    bdd.it('should run multiple scripts in order', function () {
      var dfd = this.async(1000);

      worker.onmessage = function (e) {
        expect(e.data).to.eql('script 1 ran');
        worker.onmessage = dfd.callback(function (e) {
          expect(e.data).to.eql('script 2 ran');
        });
      };

      worker.postMessage({
        jsonrpc: '2.0',
        method: 'importScripts',
        params: [
          '/tests/broker/import-scripts.script-1.js',
          '/tests/broker/import-scripts.script-2.js'
        ]
      });
    });

    bdd.afterEach(function () {
      worker.terminate();
      worker = null;
    });
  });
});
