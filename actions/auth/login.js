/*
* Authenticates a storefront user and returns a signed user token.
*
* Public endpoint. Failures deliberately return one generic message so the
* response cannot be used to discover which email addresses are registered.
*/

const { Core } = require('@adobe/aio-sdk')
const { checkMissingRequestInputs, stringParameters } = require('../utils')
const { success, failure } = require('../lib/response')
const { withDb, findOneOrNull } = require('../lib/db')
const { verifyPassword, signUserToken, normalizeEmail, publicUser } = require('../lib/auth')

const INVALID_MESSAGE = 'Invalid email or password'

async function main (params) {
  const logger = Core.Logger('login', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.debug(stringParameters(params))

    const missing = checkMissingRequestInputs(params, ['email', 'password'])
    if (missing) {
      return failure(400, 'All fields are required', logger)
    }
    if (!params.JWT_SECRET) {
      logger.error('JWT_SECRET is not configured for this action')
      return failure(500, 'Server error', logger)
    }

    const email = normalizeEmail(params.email)

    return await withDb(params, async (client) => {
      const userCollection = client.collection('users')
      const user = await findOneOrNull(userCollection, { email })

      if (!user) {
        logger.info(`login rejected for ${email}: no such account`)
        return failure(401, INVALID_MESSAGE, logger)
      }

      if (!await verifyPassword(params.password, user.salt, user.passwordHash)) {
        logger.info(`login rejected for ${email}: bad password`)
        return failure(401, INVALID_MESSAGE, logger)
      }

      logger.info(`login succeeded for ${email}`)

      return success(200, 'Login successful', {
        userId: String(user._id),
        user: publicUser(user),
        token: signUserToken(user, params.JWT_SECRET)
      })
    })
  } catch (error) {
    logger.error(error)
    return failure(500, 'Server error', logger)
  }
}

exports.main = main
