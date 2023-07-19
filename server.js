// Bring in environment variables first thing
const { env } = require('./constants');

// Import dependencies
const colors = require('colors');
const connectDB = require('./config/db');
const cors = require('cors');
const errorHandler = require('./middleware/error');
const express = require('express');
const helmet = require('helmet');
const hpp = require('hpp');
const jwt = require('jsonwebtoken');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');

// Load in passport strategies
require('./strategies/passport.jwt');


// eslint-disable-next-line no-process-env
process.env.TZ = 'UTC';

// Connect to database
connectDB();

// Route files
const auth = require('./routes/auth.route');

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

// Mount routes
app.use('/api/v1/auth', auth);

app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  console.log(
    `Server running in ${env.NODE_ENV} mode on port ${env.PORT}`.yellow.bold,
  );
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`Unhandled Rejection Error: ${err.message}`.red);
  // close server & exit process
  server.close(() => process.exit(1));
});


