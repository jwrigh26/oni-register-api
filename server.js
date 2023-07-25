// Bring in environment variables first thing
const { env } = require('./constants');

// Import dependencies
const colors = require('colors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const cors = require('cors');
const csrf = require('./middleware/csrf').csrf;
const errorHandler = require('./middleware/error');
const express = require('express');
const helmet = require('helmet');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const passport = require('passport');
const path = require('path');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');

// Load in passport strategies
require('./strategies/passport.jwt');
require('./strategies/passport.google');


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
// Cookies
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
// Passport middleware
app.use(passport.initialize());

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
app.use(cors({
  origin: env.DEV_FRONTEND_URL, // url of the client making the http requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true, // allow session cookies to be sent to/from client
  // some legacy browsers (IE11, various SmartTVs) choke on 204
  // if so uncomment and set to 200
  // optionsSuccessStatus: 200,
}));


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


