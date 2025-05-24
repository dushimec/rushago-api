/**
 * Helper class to standardize API responses.
 */
class Response {
    /**
     * Sends a success response with a message and optional data.
     * @param {Object} res - Express response object.
     * @param {string} message - Success message.
     * @param {Object|Array|null} data - Response data.
     * @param {number} statusCode - HTTP status code.
     * @returns {Object} - JSON response.
     */
    static successMessage(res, message, data = null, statusCode = 200) {
      const response = {
        results: Array.isArray(data) ? data.length : data ? 1 : 0,
        status: statusCode,
        message,
        data,
      };
      return res.status(statusCode).json(response);
    }
  
    /**
     * Sends an error response with a message.
     * @param {Object} res - Express response object.
     * @param {string} message - Error message.
     * @param {number} statusCode - HTTP status code.
     * @returns {Object} - JSON response.
     */
    static errorMessage(res, message, statusCode = 400) {
      const response = {
        status: statusCode,
        message,
      };
      return res.status(statusCode).json(response);
    }
  }
  
  export default Response;