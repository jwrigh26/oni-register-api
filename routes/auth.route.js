const { env } = require('../constants');
const { hasValue } = require('../helpers/utils');
const { sendEmailTest } = require('../helpers/email');
const asyncHandler = require('../middleware/async');
const express = require('express');
const { csrf, csrfCheck } = require('../middleware/csrf');
const authServices = require('../services/auth.service');
const registerService = require('../services/register.service');
const passport = require('passport');
const router = express.Router();
const User = require('../models/User');
const WhitelistAccount = require('../models/WhitelistAccount');
const ErrorResponse = require('../components/ErrorResponse');

// LOGIN
// @desc      Login in a user via email and password
// @route     POST /api/v1/auth/login
// @access    Public
router.post(
  '/login',
  csrf,
  asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Find and login the user ( Confirm user exists and password is correct )
    const user = await authServices.loginUser({ email, password }, next);

    // Last check to see if the user is registered
    const isRegistered = await registerService.checkUserRegistration(email);

    // Send a payload with the user object
    authServices.sendTokenResponse(user, 200, res, {
      email: user.email,
      registered: isRegistered,
    });
  }),
);

// LOGOUT
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

// REGISTER
// @desc      Register a new user. The user account is created.
//            But then we need to send a confirmation email along with a
//            notification email to the admin, but if the user is whitelisted
//            we can skip this step and just send the response back.
// @route     POST /api/v1/auth/register
// @access    Public
router.post(
  '/register',
  csrf,
  asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Create the user
    // Pass in the email and password as an object
    // At this stage they are not yet registered
    const user = await registerService.createUser({ email, password });
    const isWhitelisted = await registerService.checkWhitelist(email);

    // by setting the register.registered to true
    if (isWhitelisted) {
      // Update the user account to be active
      await registerService.updateUserRegistration(email);
    }

    // Check if email is in out whitelist
    // If not found then proceed with sending two emails
    // 1. Send a confirmation email to the user stating they are in review
    // 2. Send a notification email to the admin
    // These will happen asynchronously to not block the request
    if (!isWhitelisted) {
      registerService.sendRegistrationPendingEmail(email);
      registerService.sendRegistrationRequestToAdminEmail(email);
    }

    authServices.sendTokenResponse(user, 201, res, {
      email: user.email,
    });
  }),
);

// REGISTER CONFIRM
// @desc      As a user I use this to login after registration via url with token query param
// @route     GET /api/v1/auth/register/confirm?token=TOKEN
// @access    Public
router.get(
  '/register/confirm',
  passport.authenticate('register', { session: false }),
  asyncHandler(async (req, res) => {
    // Need to do some clean up here.

    res.status(200).json({
      success: true,
      Greeting: `Hello Confirmed User: ${req?.user?.email}. Welcome from the server!`,
      user: req.user,
    });
  }),
);

// REGISTER CONFIRM ( USED BY ADMIN )
// @desc     As an Admin send a registration confirmation email to a user
//           that has a url to click on containing a token
// @route    POST /api/v1/auth/register/confirm
// @access   Private
router.post(
  '/register/confirm',
  // passport.authenticate('jwt', { session: false }),
  // csrfCheck,
  asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    // Check if the user is already registered
    const isRegistered = await registerService.checkUserRegistration(
      email,
      next,
    );
    // If the user is already registered then send a message back
    if (isRegistered) {
      console.log('isRegistered', isRegistered);
      return res.status(200).json({
        success: true,
        message: `User ${email} is already registered.`,
      });
    }

    // If the user is not registered let's register them
    // Update the user account to be active
    await registerService.updateUserRegistration({email}, next);

    // Make a signed JWT token with the email sigend by the public secret key
    const token = await registerService.getSignedToken(email, next);
    // Send the email
    // registerService.sendRegistrationCompleteEmail(email, token);
    // Send a success response
    res.status(200).json({
      success: true,
      message: `Registration confirmation email sent to ${email}`,
      token,
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

// ----------------------- NOT USED -------------------------- //
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
    authServices.sendTokenResponse(req.user, 200, res, {
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

module.exports = router;
