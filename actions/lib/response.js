/*
* Response envelope shared by every storefront action.
*
* Actions return `{ statusCode, body: { statusCode, success, message, ... } }`.
* The status code is repeated inside the body because the UI reads the parsed
* JSON, where the outer HTTP status is no longer visible.
*/

/**
 * Builds a success response.
 *
 * @param {number} statusCode the HTTP status to return
 * @param {string} message a human readable summary
 * @param {object} [data] extra fields to merge into the body
 * @returns {object} the action response
 */
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

/**
 * Builds a failure response and logs it.
 *
 * @param {number} statusCode the HTTP status to return
 * @param {string} message a human readable reason
 * @param {*} [logger] optional logger with an `info` method
 * @returns {object} the action response
 */
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
