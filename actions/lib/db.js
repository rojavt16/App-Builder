/*
* Shared App Builder Database (aio-lib-db) helper.
*
* The IMS access token is minted from the OAuth Server-to-Server credentials that
* the `include-ims-credentials: true` annotation injects into `params.__ims_oauth_s2s`.
* `generateAccessToken` caches and refreshes the token per container, so calling it
* on every invocation is cheap on warm containers.
*/

const { Core } = require('@adobe/aio-sdk')
const libDb = require('@adobe/aio-lib-db')

const DEFAULT_REGION = 'apac'

/**
 * Opens a database client for this app's namespace.
 *
 * @param {object} params action input parameters
 * @returns {Promise<object>} a connected DbClient
 */
async function connect (params) {
  const { access_token: token } = await Core.AuthClient.generateAccessToken(params)
  const db = await libDb.init({
    token,
    region: params.DB_REGION || DEFAULT_REGION
  })
  return db.connect()
}

/**
 * Runs `fn` with a connected database client and always closes it afterwards.
 * Closing releases any open cursors, so prefer this over calling `connect` directly.
 *
 * @param {object} params action input parameters
 * @param {function} fn receives the connected DbClient
 * @returns {Promise<*>} whatever `fn` returns
 */
async function withDb (params, fn) {
  const client = await connect(params)
  try {
    return await fn(client)
  } finally {
    try {
      await client.close()
    } catch (e) {
      // a failed close must not mask the real result or error
    }
  }
}

/**
 * True when a DbError means "no document matched" rather than a real failure.
 *
 * @param {Error} error the error thrown by a read
 * @returns {boolean}
 */
function isNotFound (error) {
  return /document not found/i.test(error?.message || '')
}

/**
 * `findOne` variant that returns null on a miss.
 *
 * aio-lib-db throws `DbError: Document not found` when nothing matches, unlike the
 * MongoDB driver which returns null. Absence is an expected outcome for lookups
 * such as "is this email taken?", so it is translated back into a null here.
 *
 * @param {object} collection a DbCollection
 * @param {object} filter the query filter
 * @param {object=} options passed through to findOne
 * @returns {Promise<object|null>} the document, or null when none matched
 */
async function findOneOrNull (collection, filter, options = {}) {
  try {
    return await collection.findOne(filter, options)
  } catch (error) {
    if (isNotFound(error)) {
      return null
    }
    throw error
  }
}

module.exports = { connect, withDb, findOneOrNull, isNotFound, DEFAULT_REGION }
