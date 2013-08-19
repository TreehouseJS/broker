define([
  'node_modules/lodash/lodash',
  'intern!tdd',
  'intern/chai!expect',
  'dist/broker',
  'tests/sandbox'
], function (_, tdd, expect, sandbox) {
  tdd.suite('public interface to the broker', function () {
    var worker;

    tdd.suite('sandbox.create', function () {
      tdd.test('returns a promise', function () {
        var p = sandbox.create();

        expect(p).to.be.a('object');
        expect(p.then).to.be.a('function');
      });

      tdd.test('resolves with a Sandbox instance', function () {
          var dfd = this.async(1000);
          var p = sandbox.create();

          return p.then(function (broker) {
            expect(broker).to.be.an.instanceof(sandbox.Sandbox);
          });
        });
    });
  });
});

