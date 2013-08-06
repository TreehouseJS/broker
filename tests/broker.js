define([
  'node_modules/lodash/lodash',
  'intern!tdd',
  'intern/chai!expect'
], function (_, tdd, expect) {
  tdd.suite('broker', function () {
    var ignore = [
      'Array', 'ArrayBuffer', 'Boolean', 'DataView', 'Date', 'Error',
      'EvalError', 'EventSource', 'FileError', 'FileException', 'Float32Array',
      'Float64Array', 'Function', 'Infinity', 'Int16Array', 'Int32Array',
      'Int8Array', 'JSON', 'Math', 'MessageEvent', 'NaN', 'Number', 'Object',
      'PERSISTENT', 'RangeError', 'ReferenceError', 'RegExp', 'String',
      'SyntaxError', 'TEMPORARY', 'TypeError', 'URIError', 'Uint16Array',
      'Uint32Array', 'Uint8Array', 'WebKitBlobBuilder', 'WebKitFlags',
      'WorkerLocation',
      
      'atob', 'btoa', 'clearInterval', 'clearTimeout', 'close', 'decodeURI',
      'decodeURIComponent', 'dispatchEvent', 'encodeURI', 'encodeURIComponent',
      'escape', 'eval', 'isFinite', 'isNaN', 'location', 'navigator', 'onclose',
      'onerror', 'parseFloat', 'parseInt', 'removeEventListener', 'self',
      'setInterval', 'setTimeout', 'undefined', 'unescape', 'webkitURL',

      // these are required by the broker
      'postMessage', 'onmessage', 'addEventListener', 'removeEventListener',

      // Firefox
      'uneval',

      // Safari 6.0.4
      'webkitNotifications'
    ];
    var worker;

    tdd.test('waits for a config message and posts "ready"', function () {
      var dfd = this.async(1000);
      var configPosted = false;

      worker = new Worker('/lib/broker.js');

      worker.onmessage = dfd.callback(function (e) {
        expect(configPosted).to.be.true;
        expect(e.data).to.eql('ready');
      });

      _.delay(function () {
        worker.postMessage({
          properties: {
            ignore: ignore.slice()
          }
        });
        configPosted = true;
      }, 200);
    });

    tdd.suite('config message', function () {
      function beforeAndAfter() {
        tdd.beforeEach(function () {
          worker = new Worker('/lib/broker.js');
        });

        tdd.afterEach(function () {
          worker.terminate();
          worker = null;
        });
      }

      tdd.suite('.scripts', function () {
        beforeAndAfter();

        tdd.test('members are run in order', function () {
          var dfd = this.async();

          worker.onmessage = function (e) {
            expect(e.data).to.eql('ready');

            worker.onmessage = function (e) {
              expect(e.data).to.eql('first!');

              worker.onmessage = dfd.callback(function (e) {
                expect(e.data).to.eql('next');
              });
            };
          };

          worker.postMessage({
            properties: {
              ignore: ignore.slice()
            },
            scripts: [
              '/tests/broker.scripts.first.js',
              '/tests/broker.scripts.next.js'
            ]
          });
        });

        tdd.test('members observe importScripts to be null', function () {
          var dfd = this.async();

          worker.onmessage = function (e) {
            expect(e.data).to.eql('ready');

            worker.onmessage = dfd.callback(function (e) {
              expect(e.data).to.be.true;
            });
          };

          worker.postMessage({
            properties: {
              ignore: ignore.slice()
            },
            scripts: [
              '/tests/broker.scripts.cannot-import-scripts.js'
            ]
          });
        });
      });

      tdd.suite('.properties', function () {
        tdd.suite('.ignore', function () {
          beforeAndAfter();

          tdd.test('unlisted globals cannot be deleted', function () {
            var dfd = this.async();

            worker.onmessage = function (e) {
              expect(e.data).to.eql('ready');

              worker.postMessage(ignore);

              worker.onmessage = dfd.callback(function (e) {
                if (e.data !== true) {
                  console.dir(e.data);
                }
                expect(e.data).to.be.true;
              });
            };

            worker.postMessage({
              properties: {
                ignore: ignore.slice()
              },
              scripts: [
                '/tests/broker.ignore-delete.js'
              ]
            });
          });

          tdd.test('unlisted globals are null', function () {
            var dfd = this.async();

            worker.onmessage = function (e) {
              expect(e.data).to.eql('ready');

              worker.postMessage(ignore);

              worker.onmessage = dfd.callback(function (e) {
                if (e.data !== true) {
                  console.dir(e.data);
                }
                expect(e.data).to.be.true;
              });
            };

            worker.postMessage({
              properties: {
                ignore: ignore.slice()
              },
              scripts: [
                '/tests/broker.should-replace-globals.js'
              ]
            });
          });
        });

        tdd.suite('.retain', function () {
          var retain = ['XMLHttpRequest', 'importScripts'];

          beforeAndAfter();

          tdd.test('retained globals cannot be deleted', function () {
            var dfd = this.async();

            worker.onmessage = function (e) {
              expect(e.data).to.eql('ready');

              worker.postMessage(retain);

              worker.onmessage = dfd.callback(function (e) {
                if (e.data !== true) {
                  console.dir(e.data);
                }
                expect(e.data).to.be.true;
              });
            };

            worker.postMessage({
              properties: {
                ignore: ignore.slice(),
                retain: retain.slice()
              },
              scripts: [
                '/tests/broker.retain-delete.js'
              ]
            });
          });

          tdd.test('retained globals are not clobbered', function () {
            var dfd = this.async();

            worker.onmessage = function (e) {
              expect(e.data).to.eql('ready');

              worker.postMessage(retain);

              worker.onmessage = dfd.callback(function (e) {
                if (e.data !== true) {
                  console.dir(e.data);
                }
                expect(e.data).to.be.true;
              });
            };

            worker.postMessage({
              properties: {
                ignore: ignore.slice(),
                retain: retain.slice()
              },
              scripts: [
                '/tests/broker.retain-not-clobbered.js'
              ]
            });
          });
        });
      });
    });
  });
});

