var fs = require('fs');
var assert = require('assert');
var sinon = require('sinon');
var gpio = require('../lib/pwm');

function read(file, fn) {
    fs.readFile(file, "utf-8", function(err, data) {
	if(!err && typeof fn === "function") fn(data);
    });
}

// remove whitespace
function rmws(str) {
    return str.replace(/\s+/g, '');
}

describe('PWM', function() {

    var pwm5;

    before(function(done) {
	pwm5 = pwm.export(0, 5);
    });

    after(function() {
	pwm5.unexport();
    });

    describe('Header Direction Out', function() {

	describe('initializing', function() {
	    it('should open specified header', function(done) {
		read('/sys/class/pwm/pwmchip0/pwm5/polarity', function(val) {
		    assert.equal(rmws(val), 'normal');
		    done();
		});
	    });
	});

	describe('#setPeriod', function() {
	    it('should set period value value to 1000', function(done) {
		pwm5.setPeriod(1000, function() {
		    read('/sys/class/pwm/pwmchip0/pwm5/period', function(val) {
			assert.equal(rmws(val), '1000');
			done();
		    });
		});
	    });
	});

	describe('#setDutyCycle', function() {
	    it('should set duty cycle value value to 1000', function(done) {
		pwm5.setDutyCycle(1000, function() {
		    read('/sys/class/pwm/pwmchip0/pwm5/duty_cycle', function(val) {
			assert.equal(rmws(val), '1000');
			done();
		    });
		});
	    });
	});

	describe('#reset', function() {
	    it('should set all values to 0', function(done) {
		gpio4.reset(function() {
		    read('/sys/class/pwm/pwmchip0/pwm5/duty_cycle', function(val) {
			assert.equal(rmws(val), '0');
		    });
		    read('/sys/class/pwm/pwmchip0/pwm5/period', function(val) {
			assert.equal(rmws(val), '0');
			done();
		    });
		});
	    });
	});
    });

});
