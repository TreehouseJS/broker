define([
  'node_modules/lodash/lodash',
  'intern!tdd',
  'intern/chai!expect',
  'dist/broker'
], function (_, tdd, expect, sandbox) {
  tdd.suite('Sandbox', function () {
    var worker;

    tdd.suite('provides the Worker interface', function () {
      tdd.test('addEventListener', function () {
        var dfd = this.async(5000);
        var worker = new Worker('/tests/util/workers/echo.js');
        var broker = new sandbox.Sandbox(worker);

        broker.addEventListener('message', dfd.callback(function (e) {
          expect(e.data).to.eql('marco');
        }));

        worker.postMessage('marco');
      });

      tdd.test('onmessage', function () {
        var dfd = this.async(5000);
        var worker = new Worker('/tests/util/workers/echo.js');
        var broker = new sandbox.Sandbox(worker);

        broker.onmessage = dfd.callback(function (e) {
          expect(e.data).to.eql('marco');
        });

        worker.postMessage('marco');
      });

      tdd.test('onerror', function () {
        var dfd = this.async(5000);
        var worker = new Worker('/tests/util/workers/error.js');
        var broker = new sandbox.Sandbox(worker);

        broker.onerror = dfd.callback(function (e) {
          expect(e.message).to.contain('OHNOES');
          e.preventDefault();
          return true;
        });

        worker.postMessage('OHNOES');
      });

      tdd.test('removeEventListener', function () {
        var dfd = this.async(5000);
        var worker = new Worker('/tests/util/workers/echo.js');
        var broker = new sandbox.Sandbox(worker);
        var calledBack = false;
        var callback = function (e) {
          calledBack = true;
        };

        worker.addEventListener('message', callback);
        broker.removeEventListener('message', callback);

        worker.postMessage('marco');
        _.delay(dfd.callback(function () {
          expect(calledBack).to.be.false;
        }), 200);
      });

      tdd.test('postMessage', function () {
        var dfd = this.async(5000);
        var worker = new Worker('/tests/util/workers/echo.js');
        var broker = new sandbox.Sandbox(worker);

        worker.addEventListener('message', dfd.callback(function (e) {
          expect(e.data).to.eql('marco');
        }));

        broker.postMessage('marco');
      });

      tdd.test('terminate', function () {
        var dfd = this.async(5000);
        var worker = new Worker('/tests/util/workers/echo.js');
        var broker = new sandbox.Sandbox(worker);
        var calledBack = false;
        var callback = function (e) {
          calledBack = true;
        };

        worker.addEventListener('message', callback);
        broker.terminate();

        worker.postMessage('marco');
        _.delay(dfd.callback(function () {
          expect(calledBack).to.be.false;
        }), 200);
      });
    });

    tdd.suite('implements tinyJsonRpc.Client', function () {
      tdd.test('notify', function () {
        var dfd = this.async(5000);
        var p = sandbox.create({
          scripts: ['/tests/util/workers/echo.js']
        });

        p.then(function (broker) {
          broker.addEventListener('message', dfd.callback(function (e) {
            expect(e.data.jsonrpc).to.equal('2.0');
            expect(e.data.method).to.equal('marco');
            expect(e.data.params).to.eql(['polo!', 'bro']);
          }));

          broker.notify('marco', 'polo!', 'bro');
        });
      });

      tdd.suite('request', function () {
        tdd.test('returns a promise', function () {
          var dfd = this.async(5000);
          var p = sandbox.create({
            scripts: ['/tests/util/workers/echo.js']
          });

          p.then(dfd.callback(function (broker) {
            var request = broker.request('marco');

            expect(request.then).to.be.a('function');
          }));
        });

        tdd.test('makes the request', function () {
          var dfd = this.async(5000);
          var p = sandbox.create({
            scripts: ['/tests/util/workers/jsonrpc-echo.js']
          });

          p.then(function (broker) {
            broker.request('marco', 'polo!', 'bro').
              then(dfd.callback(function (result) {
                expect(result.jsonrpc).to.equal('2.0');
                expect(result.id).to.exist;
                expect(result.method).to.equal('marco');
                expect(result.params).to.eql(['polo!', 'bro']);
              }));
          });
        });
      });

      tdd.test('provides', function () {
        var dfd = this.async(5000);
        var p = sandbox.create({
          scripts: ['/tests/util/workers/jsonrpc-echo.js']
        });

        p.then(function (broker) {
          broker.provides().
            then(dfd.callback(function (result) {
              expect(result.jsonrpc).to.equal('2.0');
              expect(result.id).to.exist;
              expect(result.method).to.equal('provides');
              expect(result.params).to.eql([]);
            }));
        });
      });
    });

    tdd.suite('implements tinyJsonRpc.Server', function () {
      tdd.test('provide', function () {
        var dfd = this.async(5000);
        var p = sandbox.create({
          scripts: ['/tests/util/workers/echo.js']
        });

        // provide an echo function on the sandbox and then post what we want to
        // hear to the worker, which just echoes our requests
        p.then(function (broker) {
          var request = {
            jsonrpc: '2.0',
            id: 0,
            method: 'echo',
            params: ['marco', 'polo']
          };

          broker.provide(function echo() {
            // listen for the echoed reply
            broker.onmessage = dfd.callback(function (e) {
              broker.onmessage = null;
              broker.terminate();

              expect(e.data.jsonrpc).to.equal('2.0');
              expect(e.data.id).to.exist;
              expect(e.data.result).to.eql(request.params);
            });

            return _.toArray(arguments);
          });

          // bounce the request off the worker
          broker.postMessage(request);
        });
      });

      // XXX: not sure about provides
    });
  });
});

