const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  PORT: process.env.PORT || 5001,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '30d',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '90d',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || null,
  CLIENT_URL: process.env.CLIENT_URL || '*',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

const requiredVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
for (const reqVar of requiredVars) {
  if (!config[reqVar]) {
    throw new Error(`Missing required environment variable: ${reqVar}`);
  }
}

module.exports = config;
