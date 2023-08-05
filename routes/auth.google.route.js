const { csrf, csrfCheck } = require('../middleware/csrf');
const asyncHandler = require('../middleware/async');
const authServices = require('../services/auth.service');
const express = require('express');
const passport = require('passport');
const router = express.Router();

/**
 * ----------------------- NOT USED -------------------------- //
 *
 * The following functionality is currently not being used and is reserved for future use.
 * It may be implemented at a later time based on considerations and requirements.
 *
 * ----------------------- GOOGLE AUTH ----------------------- //
 *
 * The Google Authentication functionality is not being used at this time. The decision to avoid using
 * single sign-on via Google is based on considerations regarding potential costs in a production environment.
 * While Google Authentication offers convenient integration and user experience, it is important to note that
 * there might be associated costs, particularly in high-traffic or enterprise scenarios. As of now, the
 * application has opted for alternative authentication methods to avoid incurring unnecessary expenses.
 *
 * Further evaluation will be conducted before deciding to implement Google Authentication, taking into account
 * the potential benefits and costs for the specific use case.
 */


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
