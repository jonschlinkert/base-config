'use strict';

require('mocha');
var assert = require('assert');
var minimist = require('minimist');
var base = require('base');
var store = require('base-store');
var data = require('base-data');
var plugins = require('base-plugins');
var options = require('base-option');
var expandArgs = require('expand-args');
var config = require('..');
var app;

function expand(argv) {
  return expandArgs(minimist(argv));
}

describe('base-config', function() {
  beforeEach(function() {
    app = base();
    app.use(plugins());
    app.use(store('base-config-tests'));
    app.use(config());
  });

  describe('methods', function() {
    it('should expose a "config" function on app:', function() {
      assert(app.config);
      assert.equal(typeof app.config, 'function');
    });

    it('should expose a "process" method on app.config:', function() {
      assert.equal(typeof app.config.process, 'function');
    });

    it('should expose a "map" method on app.config:', function() {
      assert.equal(typeof app.config.map, 'function');
    });
  });

  describe('config mapping', function() {
    it('should expose the config object from app.config', function() {
      assert(app.config.config);
      assert.equal(typeof app.config.config, 'object');
    });

    it('should add a set method to config', function() {
      assert.equal(typeof app.config.config.set, 'function');
    });
    it('should add a del method to config', function() {
      assert.equal(typeof app.config.config.del, 'function');
    });
  });

  describe('config function', function() {
    it('should map over an object', function(cb) {
      var keys = [];
      app.on('set', function(key) {
        keys.push(key);
      });

      app.config({foo: 'set', bar: 'set'});

      app.config.process({foo: 'b', bar: 'd'}, function(err) {
        if (err) cb(err);
        assert.equal(keys.length, 2);
        assert.equal(keys[0], 'b');
        assert.equal(keys[1], 'd');
        cb();
      });
    });
  });

  describe('cwd', function() {
    beforeEach(function() {
      app = base();
      app.use(plugins());
      app.use(store('base-config-tests'));
      app.use(config());
    });

    it('should set a cwd on app', function(cb) {
      app.on('set', function(key, val) {
        assert(key);
        assert.equal(key, 'options.cwd');
        assert.equal(val, process.cwd());
        cb();
      });

      app.config.process({cwd: process.cwd()}, function(err) {
        if (err) return cb(err);
      });
    });
  });

  describe('use', function() {
    beforeEach(function() {
      app = base();
      app.use(plugins());
      app.use(store('base-config-tests'));
      app.use(config());
    });

    it('should use a plugin', function(cb) {
      app.once('use', function() {
        cb();
      });

      app.config.process({use: 'test/fixtures/plugins/a'}, function(err) {
        if (err) return cb(err);
      });
    });

    it('should use a plugin from a cwd', function(cb) {
      app.once('use', function(key, val) {
        cb();
      });

      app.config.process({
        cwd: 'test/fixtures/plugins',
        use: ['a', 'b']
      }, function(err) {
        if (err) return cb(err);
      });
    });

    it('should use an array of plugins from a cwd', function(cb) {
      var arr = [];
      // test plugins emit `test`
      app.on('test', function(key) {
        arr.push(key);
      });

      app.config.process({
        cwd: 'test/fixtures/plugins',
        use: 'a,b,c'
      }, function(err) {
        if (err) return cb(err);
        assert.equal(arr.length, 3);
        assert.deepEqual(arr, ['AAA', 'BBB', 'CCC']);
        cb();
      });
    });
  });

  describe('map', function() {
    beforeEach(function() {
      app = base();
      app.use(plugins());
      app.use(options());
      app.use(store('base-config-tests'));
      app.use(config());
    });

    it('should process an object of flags', function(cb) {
      app.on('option', function(key, val) {
        assert(key);
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        cb();
      });

      app.config.process({option: {a: 'b'}}, function(err) {
        if (err) return cb(err);
      });
    });

    it('should be chainable', function(cb) {
      app.config.alias('a', 'b')
        .alias('b', 'c')
        .alias('c', 'set')
        .map('set')

      app.on('set', function(key, val) {
        assert(key);
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        cb();
      });

      app.config.process({c: {a: 'b'}}, function(err) {
        if (err) return cb(err);
      });
    });

    it('should add properties to app.config', function(cb) {
      app.config.map('foo', 'set');
      app.config.map('bar', 'get');
      var called = 0;

      app.on('set', function(key, val) {
        assert(key);
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        called++;
      });

      app.config.process({set: {a: 'b'}, get: 'a'}, function(err) {
        if (err) return cb(err);
        cb();
      });
    });
  });

  describe('store.map', function() {
    beforeEach(function() {
      app = base();
      app.use(plugins());
      app.use(options());
      app.use(store('base-config-tests'));
      app.use(config());
    });

    it('should expose `store.config', function() {
      assert(app.store.config);
      assert.equal(typeof app.store.config, 'function');
    });

    it('should not blow up if store plugin is not used', function() {
      var foo = base();
      foo.use(config());
      assert.equal(typeof foo.store, 'undefined');
    });

    it('should add properties to app.store.config.config', function(cb) {
      app.store.config.alias('foo', 'set');
      app.store.config.alias('bar', 'get');
      var called = 0;

      app.store.on('set', function(key, val) {
        assert(key);
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        called++;
      });

      app.store.on('get', function(key, val) {
        assert(key);
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        called++;
        assert.equal(called, 2);
        cb();
      });

      app.store.config.process({
        foo: {
          a: 'b'
        },
        bar: 'a'
      }, function(err) {
        if (err) return cb(err);
      });
    });

    it('should work as a function', function(cb) {
      app.store.config({
        foo: 'set',
        bar: 'get'
      });

      var called = 0;

      app.store.on('set', function(key, val) {
        assert(key);
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        called++;
      });

      app.store.on('get', function(key, val) {
        assert(key);
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        called++;

        assert.equal(called, 2);
        cb();
      });

      app.store.config.process({
        foo: {a: 'b'},
        bar: 'a'
      }, function(err) {
        if (err) return cb(err);
      });
    });
  });

  describe('process', function() {
    it('should process an object of flags', function(cb) {
      app.on('set', function(key, val) {
        assert(key);
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        cb();
      });

      app.config.process({
        set: {
          a: 'b'
        }
      }, function(err) {
        if (err) return cb(err);
      });
    });
  });
});

describe('should handle methods added by other plugins', function() {
  beforeEach(function() {
    app = base();
    app.use(plugins());
    app.use(options());
    app.use(store('base-config-tests'));
    app.use(data());
    app.use(config());
  });

  afterEach(function() {
    app.store.del({
      force: true
    });
  });

  describe('store', function() {
    it('should add a store method to config', function() {
      assert.equal(typeof app.config.config.store, 'function');
    });
  });

  describe('option', function() {
    it('should add an option method to config', function() {
      assert.equal(typeof app.config.config.option, 'function');
    });
  });

  describe('data', function() {
    it('should add a data method to config', function() {
      assert.equal(typeof app.config.config.data, 'function');
    });
  });
});

describe('events', function() {
  beforeEach(function() {
    app = base();
    app.use(plugins());
    app.use(options());
    app.use(store('base-config-tests'));
    app.use(data());
    app.use(config());
  });

  afterEach(function() {
    app.store.del({
      force: true
    });
  });

  describe('set', function() {
    it('should emit a set event', function(cb) {
      var argv = expand(['--set=a:b']);

      app.on('set', function(key, val) {
        assert(key);
        assert(val);
        assert.equal(app.a, 'b');
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        cb();
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
      });
    });
  });

  describe('get', function() {
    it('should emit a get event', function(cb) {
      var argv = expand(['--get=a']);
      app.set('a', 'b');

      app.on('get', function(key, val) {
        assert(key);
        assert(val);
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        cb();
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
      });
    });

    it('should emit multiple get events', function(cb) {
      var argv = expand(['--get=a,b,c']);
      app.set('a', 'aaa');
      app.set('b', 'bbb');
      app.set('c', 'ccc');
      var keys = [];

      app.on('get', function(key, val) {
        if (key === 'a') assert.equal(val, 'aaa');
        if (key === 'b') assert.equal(val, 'bbb');
        if (key === 'c') assert.equal(val, 'ccc');
        keys.push(key);
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
        assert.equal(keys.length, 3);
        cb();
      });
    });
  });

  describe('has', function() {
    it('should emit a has event', function(cb) {
      var argv = expand(['--has=a']);
      app.set('a', 'b');

      app.on('has', function(key, val) {
        assert.equal(key, 'a');
        assert.equal(val, true)
        cb();
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
      });
    });

    it('should emit multiple has events', function(cb) {
      var argv = expand(['--has=a,b,c']);
      app.set('a', 'aaa');
      app.set('b', 'bbb');
      app.set('c', 'ccc');
      var keys = [];

      app.on('has', function(key, val) {
        assert.equal(val, true);
        keys.push(key);
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
        assert.equal(keys.length, 3);
        cb();
      });
    });
  });

  describe('del', function() {
    it('should emit a del event', function(cb) {
      var argv = expand(['--del=a']);
      app.set('a', 'b');

      app.on('del', function(key) {
        assert(key);
        assert.equal(key, 'a');
        assert.equal(typeof app.a, 'undefined');
        cb();
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
      });
    });
  });

  describe('option', function() {
    it('should emit an option event', function(cb) {
      var argv = expand(['--option=a:b']);

      app.on('option', function(key, val) {
        assert(key);
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        cb();
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
      });
    });
  });

  describe('data', function() {
    it('should emit a data event', function(cb) {
      var argv = expand(['--data=a:b']);

      app.on('data', function(args) {
        assert(Array.isArray(args));
        assert.equal(args.length, 1);
        assert.equal(args[0].a, 'b');
        cb();
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
      });
    });
  });

  describe('store', function() {
    it('should emit a store.set event', function(cb) {
      var argv = expand(['--store.set=a:b']);
      app.store.on('set', function(key, val) {
        assert(key);
        assert(val);
        assert.equal(app.store.data.a, 'b');
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        cb();
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
      });
    });

    it('should emit a store.get event', function(cb) {
      var argv = expand(['--store.get=a']);
      app.store.set('a', 'b');

      app.store.on('get', function(key, val) {
        assert(key);
        assert(val);
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        cb();
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
      });
    });

    it('should emit a store.del event', function(cb) {
      var argv = expand(['--store.del=a,b']);
      app.store.set('a', 'aaa');
      app.store.set('b', 'bbb');
      var keys = [];

      app.store.on('del', function(key) {
        keys.push(key);
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
        assert.equal(keys.length, 2);
        process.nextTick(function() {
          assert.equal(Object.keys(app.store.data).length, 2);
        });
        cb();
      });
    });

    it('should delete the entire store', function(cb) {
      var argv = expand(['--store.del=force:true']);
      app.store.set('a', 'aaa');
      app.store.set('b', 'bbb');
      var keys = [];

      app.store.on('del', function(key) {
        keys.push(key);
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
        assert.equal(keys.length, 2);
        process.nextTick(function() {
          assert.equal(Object.keys(app.store.data).length, 0);
        });
        cb();
      });
    });
  });
});

describe('aliases', function() {
  beforeEach(function() {
    app = base();
    app.use(plugins());
    app.use(options());
    app.use(store('base-config-tests'));
    app.use(data());
    app.use(config());
  });

  afterEach(function() {
    app.store.del({
      force: true
    });
  });

  describe('options', function() {
    it('should emit an option event', function(cb) {
      var argv = expand(['--options=a:b']);

      app.on('option', function(key, val) {
        assert(key);
        assert(val);
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        cb();
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
      });
    });
  });

  describe('option', function() {
    it('should emit an option event', function(cb) {
      var argv = expand(['--option=a:b']);

      app.on('option', function(key, val) {
        assert(key);
        assert(val);
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        cb();
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
      });
    });
  });

  describe('config', function() {
    beforeEach(function() {
      app = base();
      app.use(plugins());
      app.use(options());
      app.use(store('base-config-tests'));
      app.use(data());
      app.use(config());
    });

    afterEach(function() {
      app.store.del({
        force: true
      });
    });

    it('should map an object to methods', function(cb) {
      var argv = expand(['--set=a:b']);
      app.config({
        set: 'set'
      });

      app.on('set', function(key, val) {
        assert(key);
        assert(val);
        assert.equal(app.a, 'b');
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        cb();
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
      });
    });

    it('should use custom functions', function(cb) {
      var argv = expand(['--foo=a:b']);
      app.config({
        set: 'set',
        foo: function(key, val) {
          app.set(key, val);
        }
      });

      app.on('set', function(key, val) {
        assert(key);
        assert(val);
        assert.equal(app.a, 'b');
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        cb();
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
      });
    });

    it('should use alias mappings', function(cb) {
      var argv = expand(['--foo=a:b']);
      app.config({
        set: 'set',
        foo: 'set'
      });

      app.on('set', function(key, val) {
        assert(key);
        assert(val);
        assert.equal(app.a, 'b');
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        cb();
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
      });
    });

    it('should expose config.map', function(cb) {
      var argv = expand(['--set=a:b']);
      app.config.map('set');

      app.on('set', function(key, val) {
        assert(key);
        assert(val);
        assert.equal(app.a, 'b');
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        cb();
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
      });
    });

    it('should expose config.alias', function(cb) {
      var argv = expand(['--set=a:b']);
      app.config.alias('foo', 'set');

      app.on('set', function(key, val) {
        assert(key);
        assert(val);
        assert.equal(app.a, 'b');
        assert.equal(key, 'a');
        assert.equal(val, 'b');
        cb();
      });

      app.config.process(argv, function(err) {
        if (err) return cb(err);
      });
    });

    it('should throw if args are invalid', function(cb) {
      try {
        app.config([]);
        cb(new Error('expected an error'));
      } catch (err) {
        assert(err);
        assert(err.message);
        assert.equal(err.message, 'expected key to be a string or object');
        cb();
      }
    });
  });
});