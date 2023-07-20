const { env } = require('../constants');
const asyncHandler = require('../middleware/async');
const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../models/User');

// When a user is created, the password is hashed and stored in the database
// along side the email and other user details.
// const passwordHashed = await argon2.hash(password);

// import helper components
const ErrorResponse = require('../components/ErrorResponse');

// @desc      Sign in aka login a user
// @route     POST /api/v1/auth/login
// @access    Public
router.post(
  '/login',
  asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    // Validate email & password
    if (!email || !password) {
      return next(
        new ErrorResponse('Please provide an email and password', 400),
      );
    }

    // const passwordHashed = await argon2.hash(password);

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

    sendTokenResponse(user, 200, res);
  }),
);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    scope: ['profile', 'email'],
    session: false,
  }),
  (req, res) => {
    // sendTokenResponse(req.user, 200, res);
    // TODO: Make this work
    console.log('User logged in successfully');
    // res.status(200).json({
    //   success: true,
    //   user: req.user,
    // });
    // Need to come up with a JWT token for the user
    res.redirect(302, '/api/v1/auth/test');
  },
);

// create a route to show a simple message
router.get('/test', (req, res) => {
  res.json({
    message: 'Hello World',
  });
});

// @desc      Show current user
// @route     GET /api/v1/auth/me
// @access    Private
router.get(
  '/me',
  passport.authenticate('jwt', { session: false }),
  asyncHandler(async (req, res, next) => {
    // user is already available in req due to the passport.js middleware
    const user = req.user;
    res.status(200).json({
      success: true,
      user,
    });
  }),
);

module.exports = router;

// ----------------------- HELPER METHODS ----------------------- //

// Get token from model, create cookie and send response
const sendTokenResponse = async (user, statusCode, res) => {
  // Create token
  const token = await user.getSignedJwtToken();

  const options = {
    expires: new Date(Date.now() + env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };

  if (env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
  });
};
