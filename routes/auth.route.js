const { env } = require('../constants');
const { hasValue } = require('../helpers/utils');
const asyncHandler = require('../middleware/async');
const express = require('express');
const { csrf, csrfCheck } = require('../middleware/csrf');
const passport = require('passport');
const router = express.Router();
const User = require('../models/User');

// When a user is created, the password is hashed and stored in the database
// along side the email and other user details.
// const passwordHashed = await argon2.hash(password);

// Get the token from the cookie
// const token = req.cookies.token;

// import helper components
const ErrorResponse = require('../components/ErrorResponse');
const { set } = require('date-fns');

// @desc      Login in a user via email and password
// @route     POST /api/v1/auth/login
// @access    Public
router.post(
  '/login',
  csrf,
  asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    // Validate email & password
    if (!email || !password) {
      return next(
        new ErrorResponse('Please provide an email and password', 400),
      );
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(user.password, password);

    if (!isMatch) {
      console.log('Invalid credentials', user.password, password);
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    console.log('User logged in successfully');

    // Send a payload with the user object
    sendTokenResponse(user, 200, res, {
      email: user.email,
      csrf: req?.local?.csrf,
    });
  }),
);

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }),
);

// @desc     Ligin in / Register with Google.
//           If user exists, login, otherwise register
// @route    GET /api/v1/auth/google
// @access   Public
router.get(
  '/google/callback',
  csrf,
  passport.authenticate('google', {
    failureRedirect: '/login',
    scope: ['profile', 'email'],
    session: false,
  }),
  (req, res) => {
    // send redirect instead of json payload
    sendTokenResponse(req.user, 200, res, {
      redirect: '/api/v1/auth/google/protected',
      csrf: req.local.csrf,
    });
  },
);

// No csrf check here because we're redirecting to a protected route
// but don't have a csrf token yet
// One idea is to get the csrf token from the login OG screen
// and pass squirrel it away in memory. Then when can use it after the redirect
router.get(
  '/google/protected',
  passport.authenticate('jwt', { session: false }),
  asyncHandler(async (req, res) => {
    const { expires } = req.cookies._csrf;

    res.json({
      message: `Hello Google User: ${req?.user?.email}. Welcome from the server!`,
    });
  }),
);

// @desc      Show current user
// @route     GET /api/v1/auth/me
// @access    Private
router.get(
  '/me',
  csrfCheck,
  passport.authenticate('jwt', { session: false }),
  asyncHandler(async (req, res) => {
    // user is already available in req due to the passport.js middleware
    const user = req.user;
    res.status(200).json({
      success: true,
      email: user.email,
    });
  }),
);

module.exports = router;

// ----------------------- HELPER METHODS ----------------------- //

/**
 * sendTokenResponse:
 * Sends a JWT token as a cookie and/or JSON response.
 *
 * @param {Object} user - The user object to generate the token for.
 * @param {number} statusCode - The HTTP status code to send in the response.
 * @param {Object} res - The Express response object.
 * @param {Object} [options] - Optional parameters for the response.
 * @param {string} [options.redirect] - The URL to redirect to after setting the cookie.
 * @param {Object} [payload] - Optional payload to include in the JSON response.
 * @returns {Object} The Express response object.
 */
const sendTokenResponse = async (user, statusCode, res, payload = {}) => {
  // Create token
  const token = await user.getSignedJwtToken();

  // Set cookie to expire in 30 days
  // Same as token expiration
  const options = {
    // Expires is deprecated, use maxAge instead
    // https://mrcoles.com/blog/cookies-max-age-vs-expires/
    // expires: new Date(Date.now() + env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    maxAge: 60 * 1000,
    httpOnly: true,
  };

  if (env.NODE_ENV === 'production') {
    options.secure = true;
  }

  // If a redirect is provided, send the token as a cookie and redirect
  if (hasValue(payload.redirect)) {
    // Get the CSRF token from the request
    return res
      .status(statusCode)
      .cookie('oni-token', token, options)
      .redirect(payload.redirect);
  }

  // Send back the token as a cookie with options httpOnly and secure
  // This is so that the cookie cannot be accessed via javascript
  // When production secure should be set to true to only allow
  // over https.
  return res
    .status(statusCode)
    .cookie('oni-token', token, options)
    .json({
      success: true,
      csrf: payload.csrf, // calling this out specifically so that we know we're passing it back
      ...payload,
    });
};
