function success (statusCode, message, data = {}) {
  return {
    statusCode,
    body: {
      statusCode,
      success: true,
      message,
      ...data
    }
  }
}

function failure (statusCode, message, logger) {
  if (logger && typeof logger.info === 'function') {
    logger.info(`${statusCode}: ${message}`)
  }
  return {
    statusCode,
    body: {
      statusCode,
      success: false,
      message
    }
  }
}

module.exports = { success, failure }
