const { body, validationResult } = require('express-validator');

const validate = (checks) => {
  return [
    ...checks,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    }
  ];
};

const registerValidation = [
  body('name').isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/(?=.*[a-z])/).withMessage('Password must contain at least one lowercase letter')
    .matches(/(?=.*[A-Z])/).withMessage('Password must contain at least one uppercase letter')
    .matches(/(?=.*\d)/).withMessage('Password must contain at least one number')
    .matches(/(?=.*[\W_])/).withMessage('Password must contain at least one special character')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const transactionValidation = [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('category').notEmpty().trim().withMessage('Category is required'),
  body('date').optional().isISO8601().withMessage('Valid date is required'),
  body('merchant').optional().trim(),
  body('description').optional().trim(),
  body('paymentMethod').optional().isIn(['cash', 'upi', 'card', 'bank_transfer', 'wallet', 'other']).withMessage('Invalid payment method'),
  body('source').optional().isIn(['manual', 'receipt', 'receipt_scan', 'screenshot_scan', 'recurring', 'imported', 'sms']).withMessage('Invalid source')
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  transactionValidation
};
