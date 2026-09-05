const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const { validate, registerValidation, loginValidation } = require('../middleware/validate');
const authController = require('../controllers/authController');

const authLimiter = (rateLimiter && rateLimiter.authLimiter) ? rateLimiter.authLimiter : (req, res, next) => next();

router.post('/register', authLimiter, validate(registerValidation), authController.register);
router.post('/login', authLimiter, validate(loginValidation), authController.login);
router.get('/me', auth, authController.getMe);
router.put('/me', auth, authController.updateMe);
router.patch('/financial-profile', auth, authController.updateFinancialProfile);
router.post('/refresh', authController.refreshToken);
router.post('/logout', auth, authController.logout);
router.post('/change-password', auth, authController.changePassword);
router.delete('/account', auth, authController.deleteAccount);

module.exports = router;
