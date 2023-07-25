/* eslint-disable */
require('dotenv').config();

const env = Object.freeze({
  DEV_FRONTEND_URL: process.env.DEV_FRONTEND_URL,
  DEV_DOMAIN: process.env.DEV_DOMAIN,
  JWT_COOKIE_EXPIRE: process.env.JWT_COOKIE_EXPIRE,
  JWT_EXPIRE: process.env.JWT_EXPIRE,
  JWT_SECRET: process.env.JWT_SECRET,
  MONGO_URI: process.env.MONGO_URI,
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  POSTMARK_TOKEN: process.env.POSTMARK_TOKEN,
  FROM_NAME: process.env.FROM_NAME,
  FROM_EMAIL: process.env.FROM_EMAIL,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_EMAIL: process.env.SMTP_EMAIL,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
});

module.exports = {
  env,
};
