/*
* Bulk-ingests the product catalog from an external product feed.
*
* Both DummyJSON and the Fake Store API are supported; the feed shape is detected
* per item, so PRODUCTS_API_URL can point at either.
*
*   POST /api/v1/web/App Builder/ingest
*   Authorization: Bearer <user token>
*   {}                      fetch the feed and add anything not already stored
*   { "replace": true }     empty the collection first, then load the feed
*
* A caller can also push its own array instead of hitting the source API:
*
*   { "products": [ { "sku": "...", "title": "...", "price": 9.99, "category": "..." } ] }
*
* Writing to the catalog is privileged, so unlike the product read actions this one
* requires a valid user token. Every item is validated before any write, and SKUs
* already stored are skipped rather than failing the batch, which makes the action
* safe to run repeatedly against the same feed.
*/

const { Core } = require('@adobe/aio-sdk')
const { stringParameters } = require('../utils')
const { success, failure } = require('../lib/response')
const { withDb } = require('../lib/db')
const { authenticateUser } = require('../lib/guard')
const { validateProduct, mapSourceItem } = require('../lib/product')

const COLLECTION = 'products'
const MAX_BATCH = 1000
// limit=0 returns the whole catalog; without it the source pages at 30 items
const DEFAULT_SOURCE_URL = 'https://dummyjson.com/products?limit=0'
const SOURCE_TIMEOUT_MS = 15000

/**
 * Fetches the product feed from the source API.
 *
 * The request carries its own timeout so a slow upstream fails with a clear
 * message instead of running the action out of its execution budget.
 *
 * @param {string} url the source feed url
 * @returns {Promise<object[]>} the raw feed items
 */
async function fetchSourceProducts (url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS)

  let response
  try {
    // the source sits behind bot protection that rejects requests with no
    // User-Agent, which is what a bare runtime fetch sends
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AppBuilderIngest/1.0; +https://adobe.com)',
        Accept: 'application/json'
      }
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`source API did not respond within ${SOURCE_TIMEOUT_MS}ms`)
    }
    throw new Error(`could not reach source API: ${error.message}`)
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    throw new Error(`source API responded with status ${response.status}`)
  }

  const body = await response.json()
  // the source wraps its array as { products, total, skip, limit }; a bare array
  // is accepted too so another feed can be pointed at this action unchanged
  const feed = Array.isArray(body) ? body : body?.products
  if (!Array.isArray(feed)) {
    throw new Error('source API did not return a product array')
  }
  return feed
}

async function main (params) {
  const logger = Core.Logger('ingest', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.debug(stringParameters(params))

    const { user, error } = authenticateUser(params)
    if (error) {
      return failure(error.statusCode, error.message, logger)
    }

    // an explicit array wins; otherwise pull the feed from the source API
    const usingRequestBody = params.products !== undefined
    const sourceUrl = params.PRODUCTS_API_URL || DEFAULT_SOURCE_URL
    let incoming

    if (usingRequestBody) {
      if (!Array.isArray(params.products)) {
        return failure(400, 'products must be an array when supplied', logger)
      }
      if (params.products.length === 0) {
        return failure(400, 'products must contain at least one item', logger)
      }
      incoming = params.products
    } else {
      logger.info(`fetching product feed from ${sourceUrl}`)
      let feed
      try {
        feed = await fetchSourceProducts(sourceUrl)
      } catch (fetchError) {
        logger.error(fetchError)
        return failure(502, fetchError.message, logger)
      }
      if (feed.length === 0) {
        return failure(502, 'source API returned an empty feed', logger)
      }
      incoming = feed.map(mapSourceItem)
    }

    if (incoming.length > MAX_BATCH) {
      return failure(400, `cannot ingest more than ${MAX_BATCH} products per request`, logger)
    }

    // validate everything up front so a bad item is reported by position rather
    // than surfacing later as an opaque database error
    const candidates = []
    const errors = []
    const seenInBatch = new Set()

    incoming.forEach((raw, index) => {
      const { product, error: invalid } = validateProduct(raw)
      if (invalid) {
        errors.push({ index, sku: raw?.sku, error: invalid })
        return
      }
      if (seenInBatch.has(product.sku)) {
        errors.push({ index, sku: product.sku, error: 'duplicate sku within this batch' })
        return
      }
      seenInBatch.add(product.sku)
      candidates.push(product)
    })

    if (candidates.length === 0) {
      return failure(400, 'no valid products to ingest', logger)
    }

    const replace = params.replace === true || params.replace === 'true'

    return await withDb(params, async (client) => {
      const collection = client.collection(COLLECTION)

      let removed = 0
      if (replace) {
        const result = await collection.deleteMany({})
        removed = result?.deletedCount ?? 0
        logger.info(`${user.email} cleared ${removed} existing products before ingest`)
      }

      // distinct returns every stored sku; findArray would only return the first
      // batch and would let an already-stored sku through to insertMany
      const stored = replace ? new Set() : new Set(await collection.distinct('sku') || [])
      const toInsert = candidates.filter((product) => !stored.has(product.sku))
      const skipped = candidates.length - toInsert.length

      let inserted = 0
      if (toInsert.length > 0) {
        const result = await collection.insertMany(toInsert)
        inserted = result?.insertedCount ?? toInsert.length
      }

      logger.info(`${user.email} ingested ${inserted} products (${skipped} skipped, ${errors.length} rejected)`)

      return success(200, `Ingested ${inserted} product(s)`, {
        source: usingRequestBody ? 'request body' : sourceUrl,
        replaced: replace,
        removed,
        received: incoming.length,
        inserted,
        skipped,
        rejected: errors.length,
        errors
      })
    })
  } catch (error) {
    logger.error(error)
    return failure(500, 'Server error', logger)
  }
}

exports.main = main
