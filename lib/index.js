"use strict";

var timeoutReached = function timeoutReached(startTime, timeout) {
  return startTime + timeout < Date.now();
};

/*
  Receives a condition and returns a Promise.
    - `condition` should be a function that returns falsy or an object like:
      {
        done: <boolean>,
        value: <anything>,
      }

      The condition is considered met when the `done` property is `true`.

  Checks continously for the condition and:
    - resolves the Promise with the `value` property of `condition` result, if condition is met before timeout
    - rejects the Promise if the condition is not met before timeout, or when an error occurs while evaluating the condition
*/

var waitCondition = function waitCondition(condition) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$initialInterval = _ref.initialInterval,
      initialInterval = _ref$initialInterval === undefined ? 100 : _ref$initialInterval,
      _ref$attemptsBeforeSl = _ref.attemptsBeforeSlowing,
      attemptsBeforeSlowing = _ref$attemptsBeforeSl === undefined ? 20 : _ref$attemptsBeforeSl,
      _ref$timeout = _ref.timeout,
      timeout = _ref$timeout === undefined ? 60000 : _ref$timeout;

  var startTime = Date.now();

  var attempts = 0;
  var currentInterval = initialInterval;
  var intervalId = void 0;
  var conditionResult = void 0;

  // check whether condition is immediately met
  try {
    conditionResult = condition();
  } catch (e) {
    // error in condition
    return Promise.reject(new Error("[waitCondition] error on condition:\n " + condition));
  }

  // immediately success in condition
  if (conditionResult && conditionResult.done) {
    return Promise.resolve(conditionResult.value);
  }

  // condition is not immediately met
  return new Promise(function (resolve, reject) {
    var scheduleRun = function scheduleRun(time) {
      return setInterval(function () {
        try {
          conditionResult = condition();
        } catch (e) {
          // error in condition
          clearInterval(intervalId);
          reject(new Error("[waitCondition] error on condition:\n " + condition));
          return;
        }

        // success
        if (conditionResult && conditionResult.done) {
          clearInterval(intervalId);
          resolve(conditionResult.value);
          return;
        }

        // timeout
        if (timeoutReached(startTime, timeout)) {
          clearInterval(intervalId);
          reject(new Error("[waitCondition] timeout on condition:\n " + condition));
          return;
        }

        // slowing down
        if (attempts > attemptsBeforeSlowing) {
          attempts = 0;
          currentInterval *= 2;
          clearInterval(intervalId);
          intervalId = scheduleRun(currentInterval);
          return;
        }

        attempts += 1;
      }, time);
    };

    intervalId = scheduleRun(currentInterval);
  });
};

module.exports = waitCondition;