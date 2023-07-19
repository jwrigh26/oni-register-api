const ErrorResponse = require('../components/ErrorResponse');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };

  error.message = err.message; // pull out default message to be used if falls through all ifs

  if (err.name === 'TokenExpiredError') {
    const message = 'Session expired, please login again to start a new session';
    error = new ErrorResponse(message, 401);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    console.log('Possible Mongoose bad ObjectId', err);
    const message = `Resource not found`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Mongoose Duplicate field value entered';
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    console.log('Mongoose ValidationError', err);
    const message = Object.values(err.errors).map(val => val.message);
    error = new ErrorResponse(message, 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
  });
};

module.exports = errorHandler;
