const { csrfCheck } = require('../middleware/csrf');
const asyncHandler = require('../middleware/async');
const express = require('express');
const passport = require('passport');
const router = express.Router();

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
