const { env } = require('../constants');
const { hasValue } = require('../helpers/utils');
const { sendEmailTest } = require('../helpers/email');
const { csrf, csrfCheck } = require('../middleware/csrf');
const { checkAdminRole } = require('../middleware/permissions');
const asyncHandler = require('../middleware/async');
const authServices = require('../services/auth.service');
const express = require('express');
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
    const isRegistered = await registerService.checkUserRegistration(
      email,
      next,
    );

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
    // Pass in the email and password as a user object.
    // At this stage they are not yet registered
    const user = await registerService.createUser({ email, password }, next);
    // Check if email is in out whitelist to short circuit the process
    const isWhitelisted = await registerService.checkWhitelist(email, next);

    let token = null;

    if (isWhitelisted) {
      // Need to generate a token for registration confirmation
      // Make a signed JWT token with the email sigend by the public secret key
      // Side-effect: This will update the user object with a registration token
      token = await registerService.getRegistrationTokenByEmail(
        email,
        next,
      );

      // Update the user account to be registered
      // This will set the user.registration.registered to true
      await registerService.updateUserRegistration({ email, token }, next);

      // Send the email to the user.
      // They will use this email token to confirm their registration
      // This will happen asynchronously to not block the request
      registerService.sendRegistrationConfirmationEmail({ email, token }, next);
    }

    // Check if email is in out whitelist
    // If not found then proceed with sending two emails
    // 1. Send a confirmation email to the user stating they are in review
    // 2. Send a notification email to the admin
    // These will happen asynchronously to not block the request
    if (!isWhitelisted) {
      registerService.sendRegistrationPendingEmail(email, next);
      registerService.sendRegistrationRequestToAdminEmail(email, next);
    }

    authServices.sendTokenResponse(user, 201, res, {
      email: user.email,
      token,
    });
  }),
);

// REGISTER Approve ( USED BY ADMIN )
// @desc     As an Admin send a registration confirmation email to a user
//           that has a url to click on containing a token
// @route    POST /api/v1/auth/register/confirm
// @access   Private
router.post(
  '/register/approve',
  // passport.authenticate('jwt', { session: false }),
  // csrfCheck,
  // checkAdminRole,
  asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    // Check if the user is already registered
    const isRegistered = await registerService.checkUserRegistration(
      email,
      next,
    );
    // If the user is already registered then send a message back
    if (isRegistered) {
      return res.status(200).json({
        success: true,
        message: `User ${email} is already registered.`,
      });
    }

    // Need to generate a token for registration confirmation
    // Make a signed JWT token with the email sigend by the public secret key
    const token = await registerService.getRegistrationTokenByEmail(
      email,
      next,
    );

    // If the user is not registered let's register them
    // Update the user account to be registered
    // This will set the user.registration.registered to true
    await registerService.updateUserRegistration({ email, token }, next);

    // Send the email to the user.
    // They will use this email token to confirm their registration
    // This will happen asynchronously to not block the request
    registerService.sendRegistrationConfirmationEmail({ email, token }, next);

    // Send a success response
    res.status(200).json({
      success: true,
      message: `Registration confirmation email sent to ${email}`,
      token,
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
    // The token has already been removed.
    // Need to login and stuff.
    res.status(200).json({
      success: true,
      Greeting: `Hello Confirmed User: ${req?.user?.email}. Welcome from the server!`,
      user: req.user,
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

module.exports = router;
