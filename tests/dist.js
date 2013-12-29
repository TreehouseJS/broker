define([
  'node_modules/lodash/lodash',
  'intern!tdd',
  'intern/chai!assert',
  'dist/broker',
  'tests/sandbox'
], function (_, tdd, assert, sandbox) {
  tdd.suite('public interface to the broker', function () {
    var worker;

    tdd.suite('sandbox.create', function () {
      tdd.test('returns a promise', function () {
        var p = sandbox.create();

        assert.typeOf(p, 'object');
        assert.typeOf(p.then, 'function');
      });

      tdd.test('resolves with a Sandbox instance', function () {
          var dfd = this.async(1000);
          var p = sandbox.create();

          return p.then(function (broker) {
            assert.instanceOf(broker, sandbox.Sandbox);
          });
        });
    });
  });
});

