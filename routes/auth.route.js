const { env } = require('../constants');
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
      // Register the user
      // It will call under the hood the register strategy
      // 1. getRegistrationTokenByEmail
      // 2. updateUserRegistration ( status: 'pending' )
      // 3. sendRegistrationConfirmationEmail
      console.log('User is whitelisted. Registering user.');
      token = await registerService.registerUser(email, next);
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

    console.log('Sending response back to client.');
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
  passport.authenticate('jwt', { session: false }),
  csrfCheck,
  checkAdminRole,
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

    // Register the user
    // It will call under the hood the register strategy
    // 1. getRegistrationTokenByEmail
    // 2. updateUserRegistration ( status: 'pending' )
    // 3. sendRegistrationConfirmationEmail
    const token = await registerService.registerUser(email, next);

    // Send a success response
    res.status(200).json({
      success: true,
      message: `Registration confirmation email sent to ${email}`,
      token,
    });
  }),
);

// REGISTER CONFIRM
// @desc      As a user I use this to login after registration via url with token query param/.
//            This is important and is the last stage of the registration process.
//            It updates the user account to be registered by setting status to approved,
//            and as a sid-effect it sets the user.registration.registered to true.
//            Finaly, It redirects to the login page with a query param of register=confirmed
//            Resets the token to null
// @route     GET /api/v1/auth/register/confirm?token=TOKEN
// @access    Public
router.get(
  '/register/confirm',
  passport.authenticate('register', { session: false }),
  asyncHandler(async (req, res, next) => {
    // Update the user account to be registered
    // This will set the user.registration.registered to true
    console.log('Updating user registration to approved.');
    await registerService.updateUserRegistration(
      { email: req?.user?.email, token: null, status: 'approved' },
      next,
    );
    console.log('Redirecting to login page.');
    res.redirect(`${env.DEV_FRONTEND_URL}/login?register=confirmed`);
  }),
);

// ----------------------- PASSWORD RESET ROUTES ----------------------- //

router.post('/forgotpassword', asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const token = await authServices.getResetPasswordTokenByEmail(email, next);
  await authServices.updateUserResetPasswordToken({email, token}, next);
  authServices.sendResetPasswordEmail({email, token}, next);

  res.status(200).json({
    success: true,
    email,
    message: `Reset password email sent to ${email}`,
    token,
  });
}));

router.get(
  '/resetpassword',
  passport.authenticate('resetpassword', { session: false }),

  asyncHandler(async (req, res) => {
    const user = req.user;
    // authServices.sendTokenResponse(user, 200, res);
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
