const { env } = require('../constants');
const { hasValue } = require('../helpers/utils');
const nodemailer = require('nodemailer');
const mjml = require('mjml');
const User = require('../models/User');
const ErrorResponse = require('../components/ErrorResponse');

// Not a public method, so we don't need to export it
// This is the mailer transport that will be used to send emails
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

async function loginUser({ email, password }, next) {
  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
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

async function getResetPasswordTokenByEmail(email, next) {
  const user = await User.findOne({ email }, { _id: 1, email: 1 });
  const token = user?.getResetPasswordJwtToken();

  if (!token) {
    const message = 'Unable to get token';
    return next(new ErrorResponse(message, 400));
  }
  return token;
}

async function updateUserResetPasswordToken({ email, token }, next) {
  let user;
  try {
    user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          resetPasswordToken: token,
        },
      },
      { new: true },
    );
  } catch (err) {
    return next(new ErrorResponse('Unable to update user', 400));
  }
  return user;
}

async function sendResetPasswordEmail({ email, token }, next) {
  const resetPasswordUrl = `${env.DEV_FRONTEND_URL}/resetpassword?token=${token}`;
  const passwordResetEmailTemplate = `
  <mjml>
    <mj-body>
      <mj-section>
        <mj-column>
          <mj-text align="center" font-size="24px" color="#333333" font-weight="bold">Password Reset Request</mj-text>
          <mj-text align="center" font-size="16px" color="#555555">${email},</mj-text>
          <mj-text align="center" font-size="16px" color="#555555">We have received a request to reset the password for your account. If you did not initiate this request, please disregard this email.</mj-text>
          <mj-button href="${resetPasswordUrl}" background-color="#007bff" color="#ffffff" font-size="16px" font-weight="bold" align="center">Reset Password</mj-button>
          <mj-divider border-color="#cccccc"></mj-divider>
          <mj-text align="center" font-size="14px" color="#888888">If you did not request a password reset, no further action is required on your part.</mj-text>
          <mj-text align="center" font-size="14px" color="#888888">If you have any questions or need assistance, please don't hesitate to contact our support team at <a href="mailto:support@${env.DEV_FRONTEND_URL}">support@${env.DEV_FRONTEND_URL}</a>.</mj-text>
          <mj-text align="center" font-size="14px" color="#888888">Thank you,<br/>The Onboarding Team</mj-text>
        </mj-column>
      </mj-section>
    </mj-body>
  </mjml>
`;

  const passwordResetText = `
    Password Reset Request

    ${email},

    We have received a request to reset the password for your account. If you did not initiate this request, please disregard this email.

    To reset your password, please click the following link:
    ${resetPasswordUrl}

    This link will expire in [expiration period]. If you did not request a password reset, no further action is required on your part.

    If you have any questions or need assistance, please don't hesitate to contact our support team at support@${env.DEV_FRONTEND_URL}.

    Thank you,
    The Onboarding Team
`;

  const compileTemplate = mjml(passwordResetEmailTemplate);
  const htmlOutput = compileTemplate.html;

  const mailOptions = {
    from: `support@${env.DEV_FRONTEND_URL}`,
    to: email,
    subject: 'Registration confirmation - Onboarding',
    text: passwordResetText,
    html: htmlOutput,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email:', error);
      return next(new ErrorResponse('Error sending email!', 400, error));
    }
    console.log('Email sent:', info.messageId);
  });
}

async function updatePassword(user, password, next) {
  // Set new password
  // user.password = password;
  // user.resetPasswordToken = undefined;
  // user.resetPasswordExpire = undefined;
  // await user.save();
  // return user;
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
  getResetPasswordTokenByEmail,
  updateUserResetPasswordToken,
  sendResetPasswordEmail,
  loginUser,
  sendTokenResponse,
};
