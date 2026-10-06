const express = require('express');
const router = express.Router();
const { getOptions, predictYield } = require('../controllers/yieldController');

// GET /api/yield/options - dynamic dropdown values from CSV
router.get('/options', getOptions);

// POST /api/yield/predict - regression prediction in tonnes/hectare
router.post('/predict', predictYield);

module.exports = router;
