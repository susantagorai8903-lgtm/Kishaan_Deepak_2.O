const multer = require('multer');

const errorHandler = (err, req, res, next) => {
  const isChatRequest = req.path === '/api/chat';
  const isInvalidJson = err.type === 'entity.parse.failed';
  const logDetail = isChatRequest
    ? err.code || err.type || err.name || 'request failed'
    : err.message || err;
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, logDetail);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size limit exceeded. Maximum allowed upload size is 5 MB.'
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`
    });
  }

  const statusCode = err.statusCode || err.status || (res.statusCode !== 200 ? res.statusCode : 500);
  res.status(statusCode).json({
    success: false,
    error: isChatRequest
      ? isInvalidJson
        ? 'Invalid request body. Please send valid JSON.'
        : 'The farm assistant could not process the request.'
      : err.message || 'An unexpected internal server error occurred.'
  });
};

module.exports = errorHandler;
