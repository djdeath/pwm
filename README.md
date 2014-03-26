# pwm - API to use PWM gpio through /sys

Derived from https://github.com/EnotionZ/GpiO

##### Standard setup

```js
var pwm = require("pwm");

// Calling export with a chip number and a pin number will export that
// header and return a pwm header instance
var pwm5 = pwm.export(0, 5, function() {
    console.log("Ready!");
});
```
##### API Methods

```js
// Enable pin
pwm5.setEnable(1, function() {
    console.log("Enabled!");
});
```
```js
// Set pin period
pwm5.setPeriod(1000000, function() {
    console.log("Period set!");
});
```
```js
// Set pin duty cycle
pwm5.setDutyCycle(500000, function() {
    console.log("Duty cycle set!");
});
```
```js
// Reset
pwm5.reset();
```
```js
// unexport program when done
pwm5.unexport();
```
