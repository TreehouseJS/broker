define([
  'node_modules/lodash/lodash',
  'intern!tdd',
  'intern/chai!assert'
], function (_, tdd, assert) {
  tdd.suite('broker', function () {
    var whitelist = [
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
      'webkitNotifications',

      // Safari 7.1
      'onoffline', 'ononline', 'DedicatedWorkerGlobalScope',

      // Chrome
      'Intl'
    ];
    var worker;

    tdd.test('waits for a config message and posts "ready"', function () {
      var dfd = this.async(5000);
      var configPosted = false;

      worker = new Worker('/lib/broker.js');

      worker.onmessage = dfd.callback(function (e) {
        assert.isTrue(configPosted);
        assert.strictEqual(e.data, 'ready');
      });

      _.delay(function () {
        worker.postMessage({
          properties: {
            whitelist: whitelist.slice()
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
            assert.strictEqual(e.data, 'ready');

            worker.onmessage = function (e) {
              assert.strictEqual(e.data, 'first!');

              worker.onmessage = dfd.callback(function (e) {
                assert.strictEqual(e.data, 'next');
              });
            };
          };

          worker.postMessage({
            properties: {
              whitelist: whitelist.slice()
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
            assert.strictEqual(e.data, 'ready');

            worker.onmessage = dfd.callback(function (e) {
              assert.isTrue(e.data);
            });
          };

          worker.postMessage({
            properties: {
              whitelist: whitelist.slice()
            },
            scripts: [
              '/tests/broker.scripts.cannot-import-scripts.js'
            ]
          });
        });
      });

      tdd.suite('.properties', function () {
        tdd.suite('.whitelist', function () {
          beforeAndAfter();

          tdd.test('unlisted globals cannot be deleted', function () {
            var dfd = this.async();

            worker.onmessage = function (e) {
              assert.strictEqual(e.data, 'ready');

              worker.postMessage(whitelist);

              worker.onmessage = dfd.callback(function (e) {
                if (e.data !== true) {
                  console.dir(e.data);
                }
                assert.isTrue(e.data);
              });
            };

            worker.postMessage({
              properties: {
                whitelist: whitelist.slice()
              },
              scripts: [
                '/tests/broker.whitelist-delete.js'
              ]
            });
          });

          tdd.test('unlisted globals are null', function () {
            var dfd = this.async();

            worker.onmessage = function (e) {
              assert.strictEqual(e.data, 'ready');

              worker.postMessage(whitelist);

              worker.onmessage = dfd.callback(function (e) {
                if (e.data !== true) {
                  console.dir(e.data);
                }
                assert.isTrue(e.data);
              });
            };

            worker.postMessage({
              properties: {
                whitelist: whitelist.slice()
              },
              scripts: [
                '/tests/broker.should-replace-globals.js'
              ]
            });
          });
        });

        tdd.suite('.blacklist', function () {
          var blacklist = ['XMLHttpRequest', 'importScripts'];
          beforeAndAfter();

          tdd.test('blacklisted globals cannot be deleted', function () {
            var dfd = this.async();

            worker.onmessage = function (e) {
              assert.strictEqual(e.data, 'ready');

              worker.postMessage(blacklist);

              worker.onmessage = dfd.callback(function (e) {
                if (e.data !== true) {
                  console.dir(e.data);
                }
                assert.isTrue(e.data);
              });
            };

            worker.postMessage({
              properties: {
                whitelist: blacklist.concat(whitelist.slice()),
                blacklist: blacklist.slice()
              },
              scripts: [
                '/tests/broker.blacklist-delete.js'
              ]
            });
          });

          tdd.test('blacklisted globals are null', function () {
            var dfd = this.async();

            worker.onmessage = function (e) {
              assert.strictEqual(e.data, 'ready');

              worker.postMessage(blacklist);

              worker.onmessage = dfd.callback(function (e) {
                if (e.data !== true) {
                  console.dir(e.data);
                }
                assert.isTrue(e.data);
              });
            };

            worker.postMessage({
              properties: {
                whitelist: blacklist.concat(whitelist.slice()),
                blacklist: blacklist.slice()
              },
              scripts: [
                '/tests/broker.blacklist-null.js'
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
              assert.strictEqual(e.data, 'ready');

              worker.postMessage(retain);

              worker.onmessage = dfd.callback(function (e) {
                if (e.data !== true) {
                  console.dir(e.data);
                }
                assert.isTrue(e.data);
              });
            };

            worker.postMessage({
              properties: {
                whitelist: whitelist.slice(),
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
              assert.strictEqual(e.data, 'ready');

              worker.postMessage(retain);

              worker.onmessage = dfd.callback(function (e) {
                if (e.data !== true) {
                  console.dir(e.data);
                }
                assert.isTrue(e.data);
              });
            };

            worker.postMessage({
              properties: {
                whitelist: whitelist.slice(),
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

