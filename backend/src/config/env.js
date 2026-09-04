require('dotenv').config();

const config = {
  PORT: process.env.PORT || 5001,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '15m',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',
  AI_API_KEY: process.env.AI_API_KEY,
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
