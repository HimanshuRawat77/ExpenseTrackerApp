const rateLimit = require('express-rate-limit');
const { error } = require('../utils/apiResponse');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window`
  handler: (req, res, next, options) => {
    return error(res, options.statusCode, 'Too many requests, please try again later.');
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Limit each IP to 10 requests per `window`
  handler: (req, res, next, options) => {
    return error(res, options.statusCode, 'Too many authentication attempts, please try again later.');
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
};
