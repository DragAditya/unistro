const errorHandler = (err, req, res, _next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  // Telegram FloodWait error
  if (err.message && err.message.includes('FLOOD_WAIT')) {
    const waitTime = parseInt(err.message.match(/\d+/)?.[0] || '60', 10);
    return res.status(429).json({
      error: 'Too many requests to Telegram. Please wait.',
      retryAfter: waitTime,
      code: 'FLOOD_WAIT',
    });
  }

  // Telegram session errors
  if (err.message && (err.message.includes('SESSION_EXPIRED') || err.message.includes('AUTH_KEY'))) {
    return res.status(401).json({
      error: 'Session expired. Please log in again.',
      code: 'SESSION_EXPIRED',
    });
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large. Maximum size is 2GB.',
      code: 'FILE_TOO_LARGE',
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: err.message,
      code: 'VALIDATION_ERROR',
    });
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : err.message,
    code: err.code || 'INTERNAL_ERROR',
  });
};

module.exports = errorHandler;
