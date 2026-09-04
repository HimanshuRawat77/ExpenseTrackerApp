/**
 * Consistent API response helpers.
 * 
 * Signature: (res, statusCode, message, data/errors)
 * This matches how controllers call these functions.
 */

const success = (res, statusCode = 200, message = 'Success', data = null) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    errors: null,
  });
};

const error = (res, statusCode = 500, message = 'Internal Server Error', errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors,
  });
};

const paginated = (res, statusCode = 200, message = 'Success', data = [], pagination = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination,
    errors: null,
  });
};

module.exports = {
  success,
  error,
  paginated,
};
