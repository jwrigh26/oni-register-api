const { env } = require('../constants');
const email = 'foo@foo.com';
const registrationCompleteUrl = 'https://foo.com';
const loginUrl = 'https://foo.com/login';

const emailTemplateString = `
  <mjml>
    <mj-body>
      <mj-section>
        <mj-column>
          <mj-text align="center" font-size="24px" color="#333333" font-weight="bold">New User Registration Request</mj-text>
          <mj-text align="center" font-size="16px" color="#555555">A new user has registered with the following email address:</mj-text>
          <mj-text align="center" font-size="16px" color="#555555">${email}</mj-text>
          <mj-text align="center" font-size="16px" color="#555555">Please review their account and approve or reject the registration request.</mj-text>
          <mj-button href="${loginUrl}" align="center" font-size="16px" background-color="#007bff" color="#ffffff" padding="16px 32px" border-radius="4px">Go to Login</mj-button>
          <mj-divider border-color="#cccccc"></mj-divider>
          <mj-text align="center" font-size="14px" color="#888888">If you have any questions or need assistance, please don't hesitate to contact us at <a href="mailto:support@${env.DEV_FRONTEND_URL}">support@${env.DEV_FRONTEND_URL}</a>.</mj-text>
        </mj-column>
      </mj-section>
    </mj-body>
  </mjml>
`;
