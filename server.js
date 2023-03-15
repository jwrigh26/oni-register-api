const colors = require('colors');
const connectDB = require('./config/db');
const cors = require('cors');
const errorHandler = require('./middleware/error');
const express = require('express');
const helmet = require('helmet');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');

const { env } = require('./constants');

// eslint-disable-next-line no-process-env
process.env.TZ = 'UTC';

// Connect to database
connectDB();

// TODO: Create routes

// Initialize express app
const app = express();

// Dev logging middleware
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser
app.use(express.json());

// Sanitize data
app.use(mongoSanitize());

// Set security headers
app.use(helmet());

// Prevent XSS attacks
app.use(xss());

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 100,
});
app.use(limiter);

// Prevent http param pollution
app.use(hpp());

// Enable CORS
app.use(cors());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

app.use(errorHandler);

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `Server running in ${env.NODE_ENV} mode on port ${PORT}`.yellow.bold,
  );
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`.red);
  // close server & exit process
  server.close(() => process.exit(1));
});