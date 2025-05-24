/**
 * Custom error class for handling API errors.
 */
class AppError extends Error {
    /**
     * Creates an instance of AppError.
     * @param {number} statusCode - HTTP status code.
     * @param {string} message - Error message.
     */
    constructor(statusCode, message) {
      super(message);
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
  
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  export default AppError;