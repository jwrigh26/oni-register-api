const { env } = require('../constants');
const nodemailer = require('nodemailer');
const mjml = require('mjml');
const User = require('../models/User');
const WhitelistAccount = require('../models/WhitelistAccount');
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

/**
 * Checks if the specified email is whitelisted.
 *
 * @param {string} email - The email address to check.
 * @param {function} next - The next middleware function to call.
 * @returns {Promise<boolean>} A Promise that resolves with a boolean value indicating whether the email is whitelisted.
 */
async function checkWhitelist(email, next) {
  try {
    const foundInWhitelist = await WhitelistAccount.isWhitelisted(email);
    return foundInWhitelist;
  } catch (err) {
    return next(new ErrorResponse('Unable to check whitelist', 401));
  }
}

/**
 * Checks if a user is registered.
 *
 * @param {string} email - The email address of the user.
 * @param {function} next - The next middleware function to call.
 * @returns {Promise<boolean>} A Promise that resolves with a boolean indicating if the user is registered.
 */
async function checkUserRegistration(email, next) {
  let user;
  try {
    user = await User.findOne({ email }, { 'registration.registered': 1 });
  } catch (err) {
    return next(new ErrorResponse('Unable to check user registration', 401));
  }

  if (!user) {
    const message = 'User not found';
    console.log(message);
    return next(new ErrorResponse(message, 404));
  }

  return user.registration.registered;
}

/**
 * CREATE USER
 * Creates a new user with the specified email and password.
 *
 * @param {Object} user - The user object.
 * @param {string} user.email - The email address of the user.
 * @param {string} user.password - The password of the user.
 * @param {function} next - The next middleware function to call.
 * @returns {Promise<Object>} A Promise that resolves with the newly created user object.
 */
async function createUser({ email, password }, next) {
  let user;
  try {
    user = await User.create({
      email,
      password,
    });
  } catch (err) {
    const message = 'Unable to create user';
    return next(new ErrorResponse(message, 400));
  }

  return user;
}

/**
 * GET SIGNED TOKEN FOR REGISTRATION
 * Gets a signed JWT token for the specified email address.
 *
 * @param {string} email - The email address of the user.
 * @returns {Promise<string>} A Promise that resolves with the signed JWT token.
 * @param {function} next - The next middleware function to call.
 */
async function getRegistrationTokenByEmail(email, next) {
  const user = await User.findOne({ email }, { _id: 1, email: 1 });
  const token = user?.getRegisteredJwtToken();
  if (!token) {
    const message = 'Unable to get token';
    console.log(message);
    return next(new ErrorResponse(message, 400));
  }
  return token;
}

/**
 * SEND REGISTRATION EMAIL CONFIRMATION
 * Sends a registration confirmation email to the specified email address.
 *
 * @param {Object} registration - The registration object containing the email and registration status of the user. Registration is true by default.
 * @param {string} registration.email - The email address of the user.
 * @param {string} registration.token - The registration token for the user.
 * @param {function} next - The next middleware function to call.
 */
function sendRegistrationConfirmationEmail({ email, token }, next) {
  const registrationCompleteUrl = `${env.DEV_FRONTEND_URL}/registration/complete?token=${token}`;

  const emailTemplateString = `
    <mjml>
      <mj-body>
        <mj-container>
          <mj-section>
            <mj-column>
              <mj-text align="center" font-size="24px" color="#333333" font-weight="bold">Welcome to Onboarding!</mj-text>
              <mj-text align="center" font-size="16px" color="#555555">${email},</mj-text>
              <mj-text align="center" font-size="16px" color="#555555">
                Your account has been successfully registered. Please click the button below to complete your registration.
              </mj-text>
              <mj-button href="${registrationCompleteUrl}" background-color="#007bff" color="#ffffff" font-size="16px" font-weight="bold" align="center">Complete Registration</mj-button>
              <mj-divider border-color="#cccccc"></mj-divider>
              <mj-text align="center" font-size="14px" color="#888888">
                If you have any questions or need assistance, please don't hesitate to contact us at <a href="mailto:support@${env.DEV_FRONTEND_URL}">support@${env.DEV_FRONTEND_URL}</a>.
              </mj-text>
            </mj-column>
          </mj-section>
        </mj-container>
      </mj-body>
    </mjml>
  `;
  const emailText = `
    Your account has been successfully registered. 
    Please click the following link to complete your registration: ${registrationCompleteUrl}
    If you have any questions or need assistance, please don't hesitate to contact us at support@${env.DEV_FRONTEND_URL}.
  `;

  const compileTemplate = mjml(emailTemplateString);
  const htmlOutput = compileTemplate.html;

  const mailOptions = {
    from: `support@${env.DEV_FRONTEND_URL}`,
    to: email,
    subject: 'Registration confirmation - Onboarding',
    text: emailText,
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

/**
 * SEND REGISTRATION EMAIL PENDING
 * Sends a registration pending email to the specified email address.
 * @param {string} email - The email address to send the email to.
 * @param {function} next - The next middleware function to call.
 */
function sendRegistrationPendingEmail(email, next) {
  const emailTemplateString = `
    <mjml>
      <mj-body>
        <mj-container>
          <mj-section>
            <mj-column>
              <mj-text align="center" font-size="24px" color="#333333" font-weight="bold">Welcome to Onboarding!</mj-text>
              <mj-text align="center" font-size="16px" color="#555555">${email},</mj-text>
              <mj-text align="center" font-size="16px" color="#555555">
                Thank you for signing up with our website. Your account is currently in review by our admin team.
                You will receive another email once your account is approved. We appreciate your patience.
              </mj-text>
              <mj-divider border-color="#cccccc"></mj-divider>
              <mj-text align="center" font-size="14px" color="#888888">
                If you have any questions or need assistance, please don't hesitate to contact us at <a href="mailto:support@${env.DEV_FRONTEND_URL}">support@${env.DEV_FRONTEND_URL}</a>.
              </mj-text>
            </mj-column>
          </mj-section>
        </mj-container>
      </mj-body>
    </mjml>
  `;
  const emailText = `
    Thank you for signing up with our website. 
    Your account is currently in review by our admin team. 
    You will receive another email once your account is approved. We appreciate your patience. 
    If you have any questions or need assistance, please don't hesitate to contact us at support@${env.DEV_FRONTEND_URL}.
  `;

  const compileTemplate = mjml(emailTemplateString);
  const htmlOutput = compileTemplate.html;

  const mailOptions = {
    from: `support@${env.DEV_FRONTEND_URL}`,
    to: email,
    subject: 'Thank you for signing up! - Onboarding',
    text: emailText,
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

/**
 * SEND REGISTRATION REQUEST TO ADMIN EMAIL
 * Sends a registration request email to the admin.
 *
 * @param {string} email - The email address of the user.
 * @param {function} next - The next middleware function to call.
 */
function sendRegistrationRequestToAdminEmail(email, next) {
  const loginUrl = `${env.DEV_FRONTEND_URL}/admin/login`;

  const emailTemplateString = `
    <mjml>
      <mj-body>
        <mj-container>
          <mj-section>
            <mj-column>
              <mj-text align="center" font-size="24px" color="#333333" font-weight="bold">New User Registration Request</mj-text>
              <mj-text align="center" font-size="16px" color="#555555">
                A new user has registered with the following email address:
              </mj-text>
              <mj-text align="center" font-size="16px" color="#555555">${email}</mj-text>
              <mj-text align="center" font-size="16px" color="#555555">
                Please review their account and approve or reject the registration request.
              </mj-text>
              <mj-button href="${loginUrl}" align="center" font-size="16px" background-color="#007bff" color="#ffffff" padding="16px 32px" border-radius="4px">Go to Login</mj-button>
              <mj-divider border-color="#cccccc"></mj-divider>
              <mj-text align="center" font-size="14px" color="#888888">
                If you have any questions or need assistance, please don't hesitate to contact us at <a href="mailto:support@${env.DEV_FRONTEND_URL}">support@${env.DEV_FRONTEND_URL}</a>.
              </mj-text>
            </mj-column>
          </mj-section>
        </mj-container>
      </mj-body>
    </mjml>
  `;
  const emailText = `
    A new user has registered with the following email address: ${email}.
    Please review their account and approve or reject the registration request.
    If you have any questions or need assistance, please don't hesitate to contact us at support@${env.DEV_FRONTEND_URL}.
    Go to login: ${loginUrl}
  `;

  const compileTemplate = mjml(emailTemplateString);
  const htmlOutput = compileTemplate.html;

  const mailOptions = {
    from: `support@${env.DEV_FRONTEND_URL}`,
    to: 'admin@example.com', // Replace with the admin's email address
    subject: 'New User Registration Request - Onboarding',
    text: emailText,
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

/**
 * UPDATE USER REGISTRATION
 * Updates a user's registration.
 *
 * @param {Object} registration - The registration object containing the email and registration status of the user.
 * @param {string} registration.email - The email address of the user.
 * @param {string} [registration.token] - The registration token of the user.
 * @param {boolean} [registration.registered] - The registration status of the user. Defaults to true.
 * @param {function} next - The next middleware function to call.
 * @returns {Promise<Object>} A Promise that resolves with the updated user object.
 */
async function updateUserRegistration(
  { email, token, registered = true },
  next,
) {
  const date = new Date();
  let user;
  try {
    user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          'registration.registered': registered,
          'registration.date': date,
          'registration.token': token,
        },
      },
      { new: true },
    );
  } catch (err) {
    console.log('Error updating user registration:', err);
    const message = 'Unable to update user registration';
    return next(new ErrorResponse(message, 400));
  }

  return user;
}

module.exports = {
  checkWhitelist,
  checkUserRegistration,
  createUser,
  getRegistrationTokenByEmail,
  sendRegistrationConfirmationEmail,
  sendRegistrationPendingEmail,
  sendRegistrationRequestToAdminEmail,
  updateUserRegistration,
};

/**
 * Steps for user registration that happen if whitelist is enabled
 * Or if whitelist is disabled and user is not already registered
 * and the admin APPROVES the user
 *
 * getRegistrationTokenByEmail -- makes a signed token with the user's email
 * updateUserRegistration -- sets user.registration with the token and registered = true
 *                           along with the current date
 *
 * sendRegistrationConfirmationEmail -- Takes email and token
 *
 * When the user clicks the link in the email it calls /register/confirm
 * At the point middleware for passport.authenticate('register', { session: false })
 * is called.
 *
 * Extracts the token forom the url and validates it
 * Finds user from the payload.email
 * If not user is found then it returns a 400 error
 * If user is not registered then it returns a 400 error
 * If the token from the url doesn't match eht user.registraction.token then it returns a 400 error
 * If it passes all of this stuff then...
 *
 * Remove token from user registration object
 * Save the user
 * Send the user object along the middleware chain
 */
