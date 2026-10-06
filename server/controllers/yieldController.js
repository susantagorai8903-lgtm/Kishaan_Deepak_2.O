const pyClient = require('../utils/pyClient');

const getOptions = async (req, res, next) => {
  try {
    const response = await pyClient.get('/api/yield/options');
    return res.status(200).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return next(new Error(`Failed to contact ML Service: ${error.message}`));
  }
};

const predictYield = async (req, res, next) => {
  try {
    const { crop, region, season, soil_type, temperature, rainfall, humidity } = req.body;

    // Forward to Python ML Microservice
    const pyResponse = await pyClient.post('/api/yield/predict', {
      crop,
      region,
      season,
      soil_type,
      temperature,
      rainfall,
      humidity
    });

    const predictionData = pyResponse.data.data;

    return res.status(200).json({
      success: true,
      data: predictionData
    });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return next(new Error(`Yield prediction service error: ${error.message}`));
  }
};

module.exports = {
  getOptions,
  predictYield
};
