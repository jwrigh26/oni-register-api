const { env } = require('../constants');
const { hasValue } = require('../helpers/utils');
const asyncHandler = require('../middleware/async');
const express = require('express');
const { csrf, csrfCheck } = require('../middleware/csrf');
const passport = require('passport');
const router = express.Router();
const User = require('../models/User');
const ErrorResponse = require('../components/ErrorResponse');

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

    // Send a payload with the user object
    sendTokenResponse(user, 200, res, {
      email: user.email,
    });
  }),
);

// @desc     Logout a user
// @route    GET /api/v1/auth/logout
// @access   Public
router.get(
  '/logout',
  asyncHandler(async (req, res) => {
    // expire the cookies
    res.cookie('oni-token', '', {
      expires: new Date(Date.now() + 3 * 1000),
      httpOnly: true,
    });
    res.cookie('oni-public-token', '', {
      expires: new Date(Date.now() + 3 * 1000),
      httpOnly: true,
    });
    res.cookie('_csrf', '', {
      expires: new Date(Date.now() + 3 * 1000),
      httpOnly: true,
    });

    // return a success response with generic logout message
    res
      .status(200)
      .json({ success: true, message: 'User logged out successfully.' });
  }),
);

// @desc      Register a new user. The user account is created. But then we need to send a confirmation email
// @route     POST /api/v1/auth/register
// @access    Public
router.post(
  '/register',
  csrf,
  asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    const user = await User.create({
      email,
      password,
    });

    // TODO: Send registration notification email or check whitelist

    sendTokenResponse(user, 200, res, {
      email: user.email,
    });
  }),
);

// ----------------------- GOOGLE AUTH ----------------------- //

// @desc      Register or login a new user via google
// @route     POST /api/v1/auth/google
// @access    Public
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
    // TODO: Send registration notification email or check whitelist

    // send redirect instead of json payload
    sendTokenResponse(req.user, 200, res, {
      redirect: '/api/v1/auth/google/protected',
    });
  },
);

// @desc      The redirect site for google login
//            Note: No csrf check here because we're redirecting to a protected route
// @route     GET /api/v1/auth/google/protected
// @access    Private
router.get(
  '/google/protected',
  passport.authenticate('jwt', { session: false }),
  asyncHandler(async (req, res) => {
    res.json({
      message: `Hello Google User: ${req?.user?.email}. Welcome from the server!`,
    });
  }),
);

// ----------------------- USER ROUTES ----------------------- //

// @desc      CSRF token request. This should be made after successfully logging in
//            CSRF token will be needed for all subsequent requests to the server
// @route     POST /api/v1/auth/request-csrftoken
// @access    Private
router.post(
  '/request-csrftoken',
  passport.authenticate('jwt', { session: false }),
  asyncHandler(async (req, res) => {
    console.log('--- CSRF token requested ---');
    console.log('req', req.cookies?._csrf?.token);
    res.status(200).json({
      success: true,
      csrf: req.cookies?._csrf?.token,
    });
  }),
);

// @desc      Show current user
// @route     GET /api/v1/auth/me
// @access    Private with CSRF
router.get(
  '/me',
  passport.authenticate('jwt', { session: false }),
  csrfCheck,
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
  const publicToken = await user.getPublicSignedJwtToken();

  // Set cookie options for both public and private cookies
  // private cookies are server read only
  const privateOptions = {
    // Expires is deprecated, use maxAge instead
    // https://mrcoles.com/blog/cookies-max-age-vs-expires/
    // expires: new Date(Date.now() + env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true,
    maxAge: env.JWT_COOKIE_EXPIRE * 60 * 1000,
  };

  const publicOptions = {
    maxAge: env.JWT_COOKIE_EXPIRE * 60 * 1000,
    domain: env.DEV_DOMAIN, // host (NOT DOMAIN, NOT HTTP:// OR HTTPS://)!
    sameSite: 'strict',
  };

  if (env.NODE_ENV === 'production') {
    privateOptions.secure = true;
    publicOptions.secure = true;
  }

  // If a redirect is provided, send the token as a cookie and redirect
  if (hasValue(payload.redirect)) {
    // Get the CSRF token from the request
    return res
      .status(statusCode)
      .cookie('oni-token', token, privateOptions)
      .cookie('oni-public-token', publicToken, publicOptions)
      .redirect(payload.redirect);
  }

  // Send back the token as a cookie with options httpOnly and secure
  // This is so that the cookie cannot be accessed via javascript
  // When production secure should be set to true to only allow
  // over https.
  return res
    .status(statusCode)
    .cookie('oni-token', token, privateOptions)
    .cookie('oni-public-token', publicToken, publicOptions)
    .json({
      success: true,
      ...payload,
    });
};
