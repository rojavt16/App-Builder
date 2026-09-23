const { getBearerToken } = require('../utils')
const { verifyUserToken } = require('./auth')

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
