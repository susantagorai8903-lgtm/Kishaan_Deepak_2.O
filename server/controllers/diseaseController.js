const fs = require('fs');
const FormData = require('form-data');
const pyClient = require('../utils/pyClient');

const predictDisease = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Please upload an image file using the "image" field.'
    });
  }

  const filePath = req.file.path;

  try {
    // Prepare form-data to forward to Python microservice
    const formData = new FormData();
    formData.append('image', fs.createReadStream(filePath), {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    const pyResponse = await pyClient.post('/api/disease/predict', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    const result = pyResponse.data;

    return res.status(pyResponse.status || 200).json(result);

  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return next(new Error(`Disease classification service error: ${error.message}`));
  } finally {
    // Slide 5 Requirement: Automatic cleanup after inference
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupErr) {
      console.warn(`Failed to cleanup temp file ${filePath}:`, cleanupErr.message);
    }
  }
};

module.exports = {
  predictDisease
};
