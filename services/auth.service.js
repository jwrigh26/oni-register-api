const { env } = require('../constants');
const { hasValue } = require('../helpers/utils');
const User = require('../models/User');
const ErrorResponse = require('../components/ErrorResponse');

async function loginUser({ email, password }, next) {
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

  return user;
}

/**
 * SEND TOKEN RESPONSE
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
async function sendTokenResponse(user, statusCode, res, payload = {}) {
  // Create token
  const token = await user.getSignedJwtToken();
  const publicToken = await user.getPublicSignedJwtToken();

  // Set cookie options for both public and private cookies
  // private cookies are server read only
  const privateOptions = {
    // Expires is deprecated, use maxAge instead
    // https://mrcoles.com/blog/cookies-max-age-vs-expires/
    // expires: new Date(Date.now() + env.JWT_EXPIRE_COOKIE * 24 * 60 * 60 * 1000),
    httpOnly: true,
    maxAge: env.JWT_EXPIRE_COOKIE * 60 * 1000,
  };

  const publicOptions = {
    maxAge: env.JWT_EXPIRE_COOKIE * 60 * 1000,
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
}

module.exports = {
  loginUser,
  sendTokenResponse,
};
