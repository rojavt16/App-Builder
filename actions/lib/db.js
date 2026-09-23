const { Core } = require('@adobe/aio-sdk')
const libDb = require('@adobe/aio-lib-db')

const DEFAULT_REGION = 'apac'

async function connect (params) {
  const { access_token: token } = await Core.AuthClient.generateAccessToken(params)
  const db = await libDb.init({
    token,
    region: params.DB_REGION || DEFAULT_REGION
  })
  return db.connect()
}

async function withDb (params, fn) {
  const client = await connect(params)
  try {
    return await fn(client)
  } finally {
    try {
      await client.close()
    } catch (e) {
    }
  }
}

function isNotFound (error) {
  return /document not found/i.test(error?.message || '')
}

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
