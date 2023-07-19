/* eslint-disable valid-jsdoc */

// Import and use like:
//    import { hasValue } from 'helpers/utils';

/**
 * Checks to see if your value has a truthy value. This is especially useful in
 * React.js code. Instead of needing to worry about the type of value you're
 * checking, you can simply use `hasValue`. Not to mention, you might forget to
 * check null or undefined in some cases.
 *
 * Quite often, you're writing code like:
 *
 * @example
 * <div>
 *   {data && (
 *     <div>{data.name}</div>
 *   )}
 * </div>
 *
 * This can instead be changed to:
 * @example
 * <div>
 *   {hasValue(data) && (
 *     <div>{data.name}</div>
 *   )}
 * </div>
 *
 * @param {any} value to check.
 *
 * @returns {boolean} Whether the `value` has a value.
 */
function hasValue(value) {
  if (isDate(value)) {
    return true;
  }

  if (isObject(value) || Array.isArray(value)) {
    return !isEmpty(value);
  }

  // guards against blank and white spaces
  if (isString(value)) {
    const isEmptyString = !value || value.trim().length === 0;
    const isUndefinedString = value === 'undefined' || value === 'null';
    return !isEmptyString && !isUndefinedString;
  }

  if (isNumeric(value)) {
    return true;
  }

  return false;
}

const isEmpty = (obj) => {
  if ([Object, Array].includes((obj ?? {}).constructor)) {
    return !Object.entries(obj ?? {}).length;
  }

  if (isString(obj)) {
    return !hasValue(obj);
  }

  return false;
};

function isNil(value) {
  // eslint-disable-next-line no-eq-null, eqeqeq
  return value == null;
}

function isFunction(func) {
  return typeof func === 'function';
}

function isNumeric(num) {
  return !Number.isNaN(parseFloat(num)) && Number.isFinite(num);
}

function isObject(obj) {
  return obj?.constructor === Object;
}

function isString(str) {
  return typeof str === 'string' || str instanceof String;
}

function trimSpaces(value) {
  return isString(value) ? value.trim() : value;
}

function isDate(value) {
  return (
    !isNil(value) && value instanceof Date && !Number.isNaN(value.valueOf())
  );
}

function isValidSearchParam(value) {
  return (
    value !== undefined &&
    value !== 'undefined' &&
    value !== null &&
    value !== 'null'
  );
}

function paramsToObject(entries) {
  const result = {};
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of entries) {
    result[key] = value;
  }
  return result;
}

// Helper for cleaning objects before sending to API
function removeEmpty(obj) {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([_, v]) => !isNil(v))
      .map(([k, v]) => [k, v === Object(v) ? removeEmpty(v) : v]),
  );
}

/* eslint-disable no-unused-vars */
// one line solution to delete using destructuring
const removeItem = (key, { [key]: _, ...obj }) => obj;
/* eslint-enable no-unused-vars */

/**
 * Sorts an array by a property.
 *
 * @example
 * [{ name: 'a' }, { name: 'b'}].sort(sortBy(x => x.name))
 *
 * @param propertyAccessor {func} Function to access property of object.
 * @param isAsc {boolean} Sort by ascending order or not.
 *
 * @returns {func} Sort function to pass to Array.prototype.sort
 */
function sortBy(propertyAccessor, isAsc = true) {
  const direction = isAsc ? 1 : -1;

  function getProperty(obj) {
    if (isFunction(propertyAccessor)) {
      return propertyAccessor(obj);
    }
    if (isString(propertyAccessor)) {
      return obj[propertyAccessor];
    }

    throw new Error('Unsupported sort propertyAccessor in sortBy');
  }

  return (a, b) => {
    const aProp = getProperty(a);
    const bProp = getProperty(b);

    if (isString(aProp) && isString(bProp)) {
      return aProp.localeCompare(bProp) * direction;
    }

    return (aProp - bProp) * direction;
  };
}

/* eslint-disable no-promise-executor-return */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getKeyByValue(object, value) {
  return Object.keys(object).find((key) => object[key] === value);
}

function trimSpaceCharacters(str) {
  return str.replace(/\s/g, '');
}

function sanitize(string) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  const reg = /[&<>"'/]/gi;
  return string.replace(reg, (match) => map[match]);
}

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
 function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 * https://stackoverflow.com/questions/1527803/generating-random-whole-numbers-in-javascript-in-a-specific-range
 */
 function getRandomInt(min, max) {
  const minValue = Math.ceil(min);
  const maxValue = Math.floor(max);
  return Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
}

module.exports = {
  hasValue,
  isEmpty,
  isNil,
  isFunction,
  isNumeric,
  isObject,
  isString,
  trimSpaces,
  isDate,
  isValidSearchParam,
  paramsToObject,
  removeEmpty,
  removeItem,
  sortBy,
  sleep,
  getKeyByValue,
  getRandomArbitrary,
  getRandomInt,
  trimSpaceCharacters,
  sanitize,
};
