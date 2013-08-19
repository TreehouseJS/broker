self.addEventListener('message', function (e) {
  throw new Error(e.data);
});
