var fs = require('fs');
var util = require('util');
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var exists = fs.exists || path.exists;

var pwmpath = '/sys/class/pwm/';

var getChipPath = function(chipNum) {
    return pwmpath + '/pwmchip' + this.chipNum;
};
var getPinPath = function(chipNum, pinNum) {
    return getChipPath(chipNum) + '/pwm' + this.pinNum;
};

var logError = function(e) { if (e) console.log(e.code, e.action, e.path); };
var logMessage = function() { if (exports.logging) console.log.apply(console, arguments) };

var _write = function(str, file, fn, override) {
    if (typeof fn !== "function") fn = logError;
    fs.writeFile(file, str, function(err) {
	if (err && !override) {
	    err.path = file;
	    err.action = 'write';
	    logError(err);
	} else {
	    if (typeof fn === "function") fn();
	}
    });
};
var _read = function(file, fn) {
    fs.readFile(file, "utf-8", function(err, data) {
	if (err) {
	    err.path = file;
	    err.action = 'read';
	    logError(err);
	} else {
	    if (typeof fn === "function") fn(data);
	    else logMessage("value: ", data);
	}
    });
};

var _unexport = function(chipNum, pinNum, fn) {
    _write(pinNum, getChipPath(chipNum) + '/unexport', function(err) {
	if (err) return logError(err);
	if (typeof fn === 'function') fn();
    }, 1);
};
var _export = function(chipNum, pinNum, fn) {
    if (exists(getPinPath(chipNum, pinNum))) {
	// already exported, unexport and export again
	logMessage('Header already exported');
	_unexport(chipNum, pinNum, function() { _export(chipNum, pinNum, fn); });
    } else {
	logMessage('Exporting pwm' + pinNum);
	_write(pinNum, getChipPath(chipNum) + '/export', function(err) {
	    // if there's an error when exporting, unexport and repeat
	    if (err) _unexport(chipNum, pinNum, function() { _export(chipNum, pinNum, fn); });
	    else if (typeof fn === 'function') fn();
	}, 1);
    }
};

// fs.watch doesn't get fired because the file never
// gets 'accessed' when setting header via hardware
// manually watching value changes
var FileWatcher = function(path, interval, fn) {
    if (typeof fn === 'undefined') {
	fn = interval;
	interval = 100;
    }
    if (typeof interval !== 'number') return false;
    if (typeof fn !== 'function') return false;

    var value;
    var readTimer = setInterval(function() {
	_read(path, function(val) {
	    if (value !== val) {
		if (typeof value !== 'undefined') fn(val);
		value = val;
	    }
	});
    }, interval);

    this.stop = function() { clearInterval(readTimer); };
};

var PWM = function(chipNum, pinNum, fn) {
    this.chipNum = chipNum;
    this.pinNum = pinNum;

    this.cache = {};
    this.ready = false

    this.PATH = {};
    this.PATH.PIN        = pwmpath + '/pwmchip' + this.chipNum + '/pwm' + this.pinNum;
    this.PATH.DUTY_CYCLE = this.PATH.PIN + '/duty_cycle';
    this.PATH.ENABLE     = this.PATH.PIN + '/enable';
    this.PATH.PERIOD     = this.PATH.PIN + '/period';

    this.export(this.chipNum, this.pinNum, function() {
        this.ready = true;
        if (typeof fn === "function") fn();
        for (var i in this.cache.value) {
            this._set(i, this.cache[i].value, this.cache[i].callback);
        }
    }.bind(this));
};

util.inherits(PWM, EventEmitter);


/**
 * Export and unexport gpio#, takes callback which fires when operation is completed
 */
PWM.prototype.export = function(fn) { _export(this.headerNum, fn); };
PWM.prototype.unexport = function(fn) {
    if (this.valueWatcher) this.valueWatcher.stop();
    _unexport(this.headerNum, fn);
};

/**
 * Gets/Sets enable
 */
PWM.prototype.getEnable = function(callback) {
    this._get(this.PATH.ENABLE, callback);
};
PWM.prototype.setEnable = function(value, callback) {
    this._set(this.PATH.ENABLE, value, callback);
};

/**
 * Gets/Sets period
 */
PWM.prototype.getPeriod = function(callback) {
    this._get(this.PATH.PERIOD, callback);
};
PWM.prototype.setPeriod = function(value, callback) {
    this._set(this.PATH.PERIOD, value, callback);
};

/**
 * Gets/Sets duty cycle
 */
PWM.prototype.getDutyCycle = function(callback) {
    this._get(this.PATH.DUTY_CYCLE, callback);
};
PWM.prototype.setDutyCycle = function(value, callback) {
    this._set(this.PATH.DUTY_CYCLE, value, callback);
};

/**
 * Internal getter/setter
 */
PWM.prototype._get = function(path, fn) {
    if (!this.ready) {
        if (typeof fn === "function") fn.call(this, undefined);
        return;
    }

    _read(path, function(val) {
	val = parseInt(val, 10);
	if (val !== currVal) {
	    if (typeof fn === "function") fn.call(this, val);
	}
    }.bind(this));
};

PWM.prototype._set = function(path, value, callback) {
    if (!this.ready) {
        this.cache[path] = {
            value: value,
            callback: callback,
        };
        return;
    }

    _write(v, path, function() {
	this.emit('valueChange', v);
	this.emit('change', v);
	if (typeof callback === 'function') callback();
    }.bind(this));
};

PWM.prototype.reset = function() {
    for (var i in this.PATH) {
        this._set(this.PATH[i], 0);
    }
};

exports.logging = false;
exports.export = function(chipNum, pinNum, fn) { return new PWM(chipNum, pinNum, fn); };
exports.unexport = _unexport;
