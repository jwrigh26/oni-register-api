/* eslint-disable */
require('dotenv').config();

const env = Object.freeze({
  JWT_COOKIE_EXPIRE: process.env.JWT_COOKIE_EXPIRE,
  JWT_EXPIRE: process.env.JWT_EXPIRE,
  JWT_SECRET: process.env.JWT_SECRET,
  MONGO_URI: process.env.MONGO_URI,
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT || 5000,
  POSTMARK_TOKEN: process.env.POSTMARK_TOKEN,
  FROM_NAME: process.env.FROM_NAME,
  FROM_EMAIL: process.env.FROM_EMAIL,
});

module.exports = {
  env,
};
