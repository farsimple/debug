var moment = require('moment');
var util = require('util');

/**
 * Detect Electron renderer process, which is node, but we should
 * treat as a browser.
 */

var debugLogger;
if (typeof process === 'undefined' || process.type === 'renderer') {
  debugLogger = require('./browser.js');
} else {
  debugLogger = require('./node.js');
}

function logger(namespace) {
  var logger = {
    name: namespace
  };
  logger.timers = {};
  debugLogger.formatArgs = formatArgs;

  logger.trace = debugLogger(namespace + ':trace');
  debugLogger[logger.trace] = console.log.bind(console);
  logger.trace.color = 'cyan';
  debugLogger.enable(namespace + ':trace');

  logger.debugLogger = debugLogger(namespace + ':debugLogger');
  debugLogger[logger.debugLogger] = console.log.bind(console);
  logger.debugLogger.color = 'blue';
  debugLogger.enable(namespace + ':debugLogger');

  logger.info = debugLogger(namespace + ':info');
  debugLogger[logger.info] = console.log.bind(console);
  logger.info.color = 'green';
  debugLogger.enable(namespace + ':info');

  logger.warn = debugLogger(namespace + ':warn');
  debugLogger[logger.warn] = console.log.bind(console);
  logger.warn.color = 'orange';
  debugLogger.enable(namespace + ':warn');

  logger.error = debugLogger(namespace + ':error');
  debugLogger[logger.error] = console.log.bind(console);
  logger.error.color = 'red';
  debugLogger.enable(namespace + ':error');

  logger.time = function(label) {
    this.timers[label] = now();
  }

  logger.timeEnd = function(label, level) {
    level = level || 'trace';
    var diff = (now() - this.timers[label]).toFixed(3);
    this[level]('(%sms) ' + label, diff);
    delete this.timers[label];
    return diff;
  }

  logger.enter = function(name, args) {
    this.timers[name] = now();
    var msg = '';
    var msgArgs = [];
    if (args) {
      for (var key in args) {
        if (args.hasOwnProperty(key)) {
          if (isObject(args[key]))
            msg += key + ': %O, ';
          else
            msg += key + ': %s, ';
          msgArgs.push(args[key]);
        }
      }
      msg = msg.slice(0, -2);
    }
    if (msgArgs.length > 0) {
      msg = 'ENTER: ' + name + '(' + msg + ')';
      msgArgs.unshift(msg);
      this['trace'].apply(this, msgArgs);
    } else this['trace']('ENTER: ' + name);
  }

  logger.exit = function(name) {
    var diff = (now() - this.timers[name]).toFixed(3);
    this['trace']('EXIT: (%sms) ' + name, diff);
    delete this.timers[name];
    return diff;
  }

  logger.return = function(name, value) {
    var diff = (now() - this.timers[name]).toFixed(3);
    if (isObject(value)) {
      this['trace']('RETURN: (%sms) ' + name + ' > %O', diff, value);
    } else {
      this['trace']('RETURN: (%sms) ' + name + ' > %s', diff, value);
    }
    delete this.timers[name];
    return diff;
  }

  logger.arg = function(name, value, level) {
    level = level || 'trace';
    if (isObject(value))
      this[level](name + ': %O', value);
    else
      this[level](name + ': %s', value);
  }

  console.log(logger)

  return logger;
}

function formatArgs(args) {
  var color = this.useColors ? '%c' : '';
  var namespace = this.namespace.split(':').slice(1, -1).join(':');
  var level = this.namespace.split(':').slice(-1)[0].toUpperCase();
  args[0] = color + moment().format('YYYY-MM-DD HH:mm:ss') + ' ' + color + level + '[' + namespace + '] ' + color + args[0] + ' ' + color + '(+' + debugLogger.humanize(this.diff) + ')';
  var c = 'color: ' + this.color;
  args.splice(1, 0, 'color: inherit', c, 'color: inherit');
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-zA-Z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      lastC = index;
    }
  });
  args.splice(lastC, 0, c);
}

function serialize(value) {
  var objectClass = Object.prototype.toString.call(value);
  if (objectClass.substring(1, 7) === 'object') {
    var objectTag = objectClass.substring(8, objectClass.length - 1);
    if (objectTag.toLowerCase().endsWith('event')) {
      // EVENT OBJECT
      return JSON.stringify({
        type: objectTag + ':' + value.type,
        target: value.target.outerHTML
      });
    } else {
      return util.inspect(value, {
        depth: 1,
        maxArrayLength: 0
      });
    }
  } else return JSON.stringify(value);
}

function isObject(value) {
  var objectClass = Object.prototype.toString.call(value);
  if (objectClass.substring(1, 7) === 'object') {
    var objectTag = objectClass.substring(8, objectClass.length - 1).toLowerCase();
    if (objectTag === 'null') return false;
    if (objectTag === 'undefined') return false;
    if (objectTag === 'string') return false;
    if (objectTag === 'boolean') return false;
    if (objectTag === 'number') return false;
    return true;
  }
}

function now() {
  if (typeof window != "undefined" && window.performance)
    return window.performance.now();
  else
    return Date.now();
}

module.exports = logger;
