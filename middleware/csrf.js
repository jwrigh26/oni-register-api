const crypto = require('crypto');
const { isBefore } = require('date-fns');

const csrf = (req, res, next) => {
  // Create req.local as an empty object if it's undefined
  req.local = req.local || {};
  // Set CSRF token in a cookie if not already present
  if (!req.cookies._csrf) {
    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 1000);
    res.cookie(
      '_csrf',
      { token, expires },
      { httpOnly: true, maxAge: 60 * 1000 },
    );

    // Set the CSRF token in the request
    req.local.csrf = token;
    console.log('--- CSRF token set ---', req.local.csrf);
  } else {
    // Set the CSRF token in the request
    req.local.csrf = req.cookies._csrf.token;
  }
  return next();
};

const csrfCheck = (req, res, next) => {
  // Get the CSRF token from the request
  const { token, expires } = req.cookies._csrf ?? {};
  // Get the CSRF token from the request header
  const csrfHeader = req.headers['x-csrf-token'];

  // Check if the CSRF token is valid and not expired
  if (!token || csrfHeader !== token) {
    // If not valid, return an error
    const error = new Error('Invalid CSRF token');
    error.statusCode = 403;
    return next(error);
  }

  // Not sure this is needed for _csrf cookie has a maxAge of 60 seconds
  if (isBefore(new Date(expires), new Date())) {
    // If expired, remove the _csrf cookie from req.cookies
    delete req.cookies._csrf;
    console.log(req.cookies);
    // Return an error
    const error = new Error('CSRF token has expired');
    error.statusCode = 403;
    return next(error);
  }

  console.log('--- CSRF token is valid ---');

  // If valid and not expired, continue on to the next middleware
  return next();
};

module.exports = { csrf, csrfCheck };
