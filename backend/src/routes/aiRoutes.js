const express = require('express');
const router = express.Router();
const multer = require('multer');
const aiController = require('../controllers/aiController');
const auth = require('../middleware/auth');

// Multer memory storage (5MB max, image only)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

router.get('/insights', auth, aiController.getInsights);
router.post('/receipt', auth, upload.single('receipt'), aiController.scanReceipt);

module.exports = router;

