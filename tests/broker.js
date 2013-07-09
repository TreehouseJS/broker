define([
  'intern!bdd',
  'intern/chai!expect'
], function (bdd, expect) {
  bdd.describe('broker', function () {
    var worker;

    bdd.beforeEach(function () {
      worker = new Worker('/lib/broker.js');
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

    bdd.afterEach(function () {
      worker.terminate();
      worker = null;
    });
  });
});

