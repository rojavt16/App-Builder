/*
* Validates a storefront user token.
*
* The UI calls this on load to decide whether a stored token is still good, and it
* doubles as the reference implementation of the guard that protected actions use.
* Signature and expiry are checked locally; the account is then re-read from the
* database so a deleted user cannot keep using an unexpired token.
*/

const { Core } = require('@adobe/aio-sdk')
const { stringParameters } = require('../utils')
const { success, failure } = require('../lib/response')
const { withDb, findOneOrNull } = require('../lib/db')
const { authenticateUser } = require('../lib/guard')
const { publicUser } = require('../lib/auth')

async function main (params) {
  const logger = Core.Logger('validate', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.debug(stringParameters(params))

    const { user: claims, error } = authenticateUser(params)
    if (error) {
      return failure(error.statusCode, error.message, logger)
    }

    return await withDb(params, async (client) => {
      const userCollection = client.collection('users')
      const stored = await findOneOrNull(userCollection, { email: claims.email })

      if (!stored) {
        logger.info(`token valid but account ${claims.email} no longer exists`)
        return failure(401, 'Invalid token', logger)
      }

      return success(200, 'Token is valid', {
        valid: true,
        userId: String(stored._id),
        user: publicUser(stored),
        expiresAt: new Date(claims.exp * 1000).toISOString()
      })
    })
  } catch (error) {
    logger.error(error)
    return failure(500, 'Server error', logger)
  }
}

exports.main = main
