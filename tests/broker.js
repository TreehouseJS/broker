define([
  'intern!bdd',
  'intern/chai!expect',
  'tests/broker/import-scripts'
], function (bdd, expect) {
  bdd.describe('broker', function () {
    var worker;

    bdd.beforeEach(function () {
      worker = new Worker('/lib/broker.js');
    });

    bdd.afterEach(function () {
      worker.terminate();
      worker = null;
    });

    bdd.it('should load the worker', function () {
      var dfd = this.async(1000);

      worker.onmessage = dfd.callback(function (e) {
        expect(e.data).to.eql({
          jsonrpc: '2.0',
          method: 'emit',
          params: ['ready']
        });
      });
    });

    bdd.it('should replace global symbols not on the whitelist with null',
      function () {
        var dfd = this.async(1000);

        worker.onmessage = function (e) {
          worker.postMessage({
            jsonrpc: '2.0',
            method: 'importScripts',
            params: ['/tests/broker.should-replace-globals.js']
          });

          worker.onmessage = dfd.callback(function (e) {
            expect(e.data).to.eql([]);
          });
        };
      });

    bdd.it('should prevent global symbols from being deleted', function () {
      var dfd = this.async(1000);

      worker.onmessage = function (e) {
        worker.postMessage({
          jsonrpc: '2.0',
          method: 'importScripts',
          params: ['/tests/broker.protects-against-delete.js']
        });

        worker.onmessage = dfd.callback(function (e) {
          expect(e.data).to.eql([]);
        });
      };
    });
  });
});

