class ErrorResponse extends Error {
  constructor(message, statusCode, error) {
    super(message);
    this.statusCode = statusCode;
    if (error) {
      Object.assign(this, error);
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ErrorResponse;