const { env } = require('../constants');
const nodemailer = require('nodemailer');
const mjml = require('mjml');
const User = require('../models/User');
const WhitelistAccount = require('../models/WhitelistAccount');
const ErrorResponse = require('../components/ErrorResponse');

/*
 * This file contains the `checkWhitelist` and `createUser` methods for registering new users.
 *
 * `checkWhitelist(email)`: This method checks if the specified email is whitelisted.
 *                          It takes an email address as a parameter and returns a Promise that resolves with a
 *                          boolean value indicating whether the email is whitelisted.
 *
 * `createUser(options)`: This method creates a new user with the specified email and password.
 *                        It takes an options object as a parameter that contains the email and password properties.
 *                        It returns a Promise that resolves with the newly created user object. If there was an error
 *                        creating the user, it throws an `ErrorResponse` with a 400 status code.
 */

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
 * @returns {Promise<boolean>} A Promise that resolves with a boolean value indicating whether the email is whitelisted.
 */
async function checkWhitelist(email) {
  const foundInWhitelist = await WhitelistAccount.isWhitelisted(email);
  return foundInWhitelist;
}

/**
 * Checks if a user is registered.
 *
 * @param {string} email - The email address of the user.
 * @returns {Promise<boolean>} A Promise that resolves with a boolean indicating if the user is registered.
 * @throws {ErrorResponse} If there was an error checking the user's registration.
 */
async function checkUserRegistration(email) {
  let user;
  try {
    user = await User.findOne({ email }, { 'registration.registered': 1 });
  } catch (err) {
    const message = 'Unable to check user registration';
    throw new ErrorResponse(message, 400);
  }

  if (!user) {
    const message = 'User not found';
    throw new ErrorResponse(message, 404);
  }

  // If not registered, then return false
  // But also throw an error if the user is not registered
  if (!user.registration.registered) {
    const message = 'User is not registered';
    throw new ErrorResponse(message, 400);
  }

  return user.registration.registered;
}

/**
 * Creates a new user with the specified email and password.
 *
 * @param {Object} options - The options object.
 * @param {string} options.email - The email address of the user.
 * @param {string} options.password - The password of the user.
 * @returns {Promise<Object>} A Promise that resolves with the newly created user object.
 * @throws {ErrorResponse} If there was an error creating the user.
 */
async function createUser({ email, password }) {
  let user;
  try {
    user = await User.create({
      email,
      password,
    });
  } catch (err) {
    const message = 'Unable to create user';
    throw new ErrorResponse(message, 400);
  }

  return user;
}

/**
 * Sends a registration pending email to the specified email address.
 *
 * @param {string} email - The email address to send the email to.
 * @throws {ErrorResponse} If there was an error sending the email.
 */
function sendRegistrationPendingEmail(email) {
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
      throw new ErrorResponse('Error sending email!', 400, error);
      // You might want to handle errors here and respond to the client accordingly
    }
    console.log('Email sent:', info.messageId);
  });
}

function sendRegistrationCompleteEmail(email) {
  // TODO: Send registration complete email
}

/**
 * Sends a registration request email to the admin.
 *
 * @param {string} email - The email address of the user.
 * @throws {ErrorResponse} If there was an error sending the email.
 */
function sendRegistrationRequestToAdminEmail(email) {
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
      throw new ErrorResponse('Error sending email!', 400, error);
      // You might want to handle errors here and respond to the client accordingly
    }
    console.log('Email sent:', info.messageId);
  });
}

/**
 * Updates a user's registration.
 *
 * @param {string} email - The email address of the user.
 * @param {boolean} [registered=true] - The registration status of the user. Defaults to true.
 * @returns {Promise<Object>} A Promise that resolves with the updated user object.
 * @throws {ErrorResponse} If there was an error updating the user.
 */
async function updateUserRegistration(email, registered = true) {
  const date = new Date();
  let user;
  try {
    user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          'registration.registered': registered,
          'registration.date': date,
        },
      },
      { new: true },
    );
  } catch (err) {
    const message = 'Unable to update user registration';
    throw new ErrorResponse(message, 400);
  }

  return user;
}

module.exports = {
  checkWhitelist,
  checkUserRegistration,
  createUser,
  sendRegistrationPendingEmail,
  sendRegistrationCompleteEmail,
  sendRegistrationRequestToAdminEmail,
  updateUserRegistration,
};
