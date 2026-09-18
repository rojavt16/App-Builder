/*
* Request guard shared by every action that requires a logged-in storefront user.
*
* Returns a result object rather than throwing so callers can map the outcome
* straight onto an HTTP response without a try/catch around the happy path.
*/

const { getBearerToken } = require('../utils')
const { verifyUserToken } = require('./auth')

/**
 * Authenticates the caller from the request's `Authorization: Bearer <token>` header.
 *
 * @param {object} params action input parameters
 * @returns {{user: object}|{error: {statusCode: number, message: string}}}
 */
function authenticateUser (params) {
  if (!params.JWT_SECRET) {
    return { error: { statusCode: 500, message: 'Server error' } }
  }

  const token = getBearerToken(params)
  if (!token) {
    return { error: { statusCode: 401, message: 'Missing authorization token' } }
  }

  try {
    return { user: verifyUserToken(token, params.JWT_SECRET) }
  } catch (error) {
    const message = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
    return { error: { statusCode: 401, message } }
  }
}

module.exports = { authenticateUser }
