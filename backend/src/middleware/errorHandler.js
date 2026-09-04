const { error } = require('../utils/apiResponse');
const config = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let message = err.message || 'Internal Server Error';
  let statusCode = err.statusCode || 500;
  let errors = null;

  console.error(err);

  if (err.name === 'ValidationError') {
    message = 'Validation Error';
    statusCode = 400;
    errors = Object.values(err.errors).map((val) => val.message);
  }

  if (err.name === 'CastError') {
    message = 'Invalid ID format';
    statusCode = 400;
  }

  if (err.code === 11000) {
    message = 'Duplicate field value entered';
    statusCode = 409;
    errors = Object.keys(err.keyValue);
  }

  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token';
    statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    message = 'Token expired';
    statusCode = 401;
  }

  if (config.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
  }

  if (config.NODE_ENV === 'development') {
    errors = errors || err.stack;
  }

  return error(res, statusCode, message, errors);
};

module.exports = errorHandler;
