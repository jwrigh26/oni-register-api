const { env } = require('../constants');
const nodemailer = require('nodemailer');
const mjml = require('mjml');

const imagePublicUrl = `${env.DEV_BACKEND_URL}/assets/logo.png`;

// If we want an image: <mj-image width="100" src="${imagePublicUrl}" alt="Company Logo"></mj-image>
// A button:  <mj-button background-color="#007bff" color="white" href="https://yourwebsite.com">Visit Our Website</mj-button>
const confirmationEmailTemplateString = (email) => `
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
              If you have any questions or need assistance, please don't hesitate to contact us at <a href="mailto:support@justinwright.io">support@justinwright.io</a>.
            </mj-text>
          </mj-column>
        </mj-section>
      </mj-container>
    </mj-body>
  </mjml>
`;

// Create the Nodemailer transporter (assuming it's properly configured)
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

// Middleware for sending an email
const sendEmailTest = async (emailData) => {
  const { to } = emailData ?? {};

  const url = 'https://www.google.com';
  const compileTemplate = mjml(confirmationEmailTemplateString(to));
  const htmlOutput = compileTemplate.html;

  const mailOptions = {
    from: 'oni-register@oni.com',
    to,
    subject: 'Confirmation Email',
    text: `Please confirm your email address by clicking on the following link: ${url}`,
    html: htmlOutput,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email:', error);
      // You might want to handle errors here and respond to the client accordingly
    } else {
      console.log('Email sent:', info.messageId);
      // Move to the next middleware/route handler after sending the email
    }
  });
  console.log('--- Email sent ---');
};

module.exports = { sendEmailTest };
