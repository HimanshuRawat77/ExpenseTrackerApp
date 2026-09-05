const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const auth = require('../middleware/auth');
const { validate, transactionValidation } = require('../middleware/validate');

router.post('/', auth, validate(transactionValidation), transactionController.create);
router.get('/', auth, transactionController.getAll);
router.get('/:id', auth, transactionController.getOne);
router.put('/:id', auth, transactionController.update);
router.delete('/:id', auth, transactionController.remove);
router.post('/bulk', auth, transactionController.bulkCreate);
router.post('/sms', auth, transactionController.processSmsTransactions);
router.post('/process-sms', auth, transactionController.processSmsTransactions);

module.exports = router;
