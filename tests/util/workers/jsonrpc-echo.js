self.addEventListener('message', function (e) {
  self.postMessage({
    jsonrpc: '2.0',
    id: e.data.id,
    result: e.data
  });
});
