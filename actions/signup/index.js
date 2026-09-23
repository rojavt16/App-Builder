const { Core } = require('@adobe/aio-sdk')
const { checkMissingRequestInputs, stringParameters } = require('../utils')
const { success, failure } = require('../lib/response')
const { withDb, findOneOrNull } = require('../lib/db')
const {
  hashPassword,
  signUserToken,
  normalizeEmail,
  validateCredentials,
  publicUser
} = require('../lib/auth')

const DUPLICATE_MESSAGE = 'User already exists'

function isDuplicateKey (error) {
  return error?.httpStatusCode === 409 || /duplicate key|e11000/i.test(error?.message || '')
}

async function main (params) {
  const logger = Core.Logger('signup', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.debug(stringParameters(params))

    const missing = checkMissingRequestInputs(params, ['name', 'email', 'password'])
    if (missing) {
      return failure(400, 'All fields are required', logger)
    }
    if (!params.JWT_SECRET) {
      logger.error('JWT_SECRET is not configured for this action')
      return failure(500, 'Server error', logger)
    }

    const invalid = validateCredentials(params.email, params.password)
    if (invalid) {
      return failure(400, invalid, logger)
    }

    const email = normalizeEmail(params.email)
    const { salt, passwordHash } = await hashPassword(params.password)
    const user = {
      email,
      passwordHash,
      salt,
      name: String(params.name).trim(),
      createdAt: new Date().toISOString()
    }

    return await withDb(params, async (client) => {
      const userCollection = client.collection('users')

      if (await findOneOrNull(userCollection, { email })) {
        return failure(409, DUPLICATE_MESSAGE, logger)
      }

      let result
      try {
        result = await userCollection.insertOne(user)
      } catch (error) {
        if (isDuplicateKey(error)) {
          return failure(409, DUPLICATE_MESSAGE, logger)
        }
        throw error
      }

      const stored = { ...user, _id: result?.insertedId ?? result?._id }
      logger.info(`created account for ${email}`)

      return success(201, 'User registered successfully', {
        userId: String(stored._id),
        user: publicUser(stored),
        token: signUserToken(stored, params.JWT_SECRET)
      })
    })
  } catch (error) {
    logger.error(error)
    return failure(500, 'Server error', logger)
  }
}

exports.main = main
