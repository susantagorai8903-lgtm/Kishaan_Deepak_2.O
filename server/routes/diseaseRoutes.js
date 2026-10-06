const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { predictDisease } = require('../controllers/diseaseController');

// POST /api/disease/predict - image upload with 60% confidence guard
router.post('/predict', upload.single('image'), predictDisease);

module.exports = router;
