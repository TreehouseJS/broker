(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    //Allow using this built library as an AMD module
    //in another project. That other project will only
    //see this AMD call, not the internal modules in
    //the closure below.

    // We have to pass an array so that intern's define doesn't scan the fucking
    // source of this library for require calls, because THAT makes fucking
    // sense.
    define([], factory);
  } else {
    //Browser globals case. Just assign the
    //result to a property on the global.
    root.Treehouse = root.Treehouse || {};
    root.treehouse.broker = factory();
  }
}(this, function () {
