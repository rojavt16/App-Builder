/*
* Returns a page of products for the listing page.
*
* Public: a shopper browsing the catalogue has no account, so unlike ingest this
* action requires no token.
*
*   GET /api/v1/web/App Builder/list?search=shirt&category=electronics&sort=price_asc&page=2
*
* Supported query parameters:
*   search      matches title, brand or tags, case-insensitively
*   category    exact category match
*   brand       exact brand match
*   minPrice    lower bound, inclusive
*   maxPrice    upper bound, inclusive
*   sort        price_asc | price_desc | rating_desc | rating_asc |
*               title_asc | title_desc | newest   (default: title_asc)
*   page        1-based page number (default 1)
*   limit       page size, 1..100 (default 12)
*   facets      when 'true', also returns the distinct categories and brands
*               so the UI can build its filter controls in one round trip
*/

const { Core } = require('@adobe/aio-sdk')
const { stringParameters } = require('../utils')
const { success, failure } = require('../lib/response')
const { withDb } = require('../lib/db')

const COLLECTION = 'products'
const DEFAULT_LIMIT = 12
const MAX_LIMIT = 100

// every sort ends with _id so that products with equal values keep a stable
// order between pages; without it the same item can appear on two pages
const SORTS = {
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: 1 },
  rating_asc: { rating: 1, _id: 1 },
  rating_desc: { rating: -1, _id: 1 },
  title_asc: { title: 1, _id: 1 },
  title_desc: { title: -1, _id: 1 },
  newest: { createdAt: -1, _id: 1 }
}
const DEFAULT_SORT = 'title_asc'

/**
 * Escapes regex metacharacters in user input.
 *
 * The search term goes into a $regex, so an unescaped '(' or '*' would either
 * error or turn a search box into a way to run arbitrary patterns against the
 * catalogue. Escaping makes the term a literal substring match.
 *
 * @param {string} term the raw search term
 * @returns {string} the term, safe to embed in a regex
 */
function escapeRegex (term) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Parses a positive integer parameter, falling back when absent or invalid.
 *
 * @param {*} value the raw parameter
 * @param {number} fallback the value to use when it cannot be parsed
 * @returns {number}
 */
function toPositiveInt (value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Builds the database filter from the request parameters.
 *
 * @param {object} params action input parameters
 * @returns {{filter: object, applied: object}} the query and an echo of what was used
 */
function buildFilter (params) {
  const filter = {}
  const applied = {}

  const search = String(params.search || '').trim()
  if (search) {
    const pattern = escapeRegex(search)
    filter.$or = [
      { title: { $regex: pattern, $options: 'i' } },
      { brand: { $regex: pattern, $options: 'i' } },
      { tags: { $regex: pattern, $options: 'i' } }
    ]
    applied.search = search
  }

  const category = String(params.category || '').trim()
  if (category) {
    filter.category = category
    applied.category = category
  }

  const brand = String(params.brand || '').trim()
  if (brand) {
    filter.brand = brand
    applied.brand = brand
  }

  const minPrice = Number(params.minPrice)
  const maxPrice = Number(params.maxPrice)
  const hasMin = params.minPrice !== undefined && params.minPrice !== '' && Number.isFinite(minPrice)
  const hasMax = params.maxPrice !== undefined && params.maxPrice !== '' && Number.isFinite(maxPrice)
  if (hasMin || hasMax) {
    filter.price = {}
    if (hasMin) {
      filter.price.$gte = minPrice
      applied.minPrice = minPrice
    }
    if (hasMax) {
      filter.price.$lte = maxPrice
      applied.maxPrice = maxPrice
    }
  }

  return { filter, applied }
}

async function main (params) {
  const logger = Core.Logger('list', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.debug(stringParameters(params))

    const { filter, applied } = buildFilter(params)

    const sortKey = SORTS[params.sort] ? params.sort : DEFAULT_SORT
    const sort = SORTS[sortKey]

    const page = toPositiveInt(params.page, 1)
    const limit = Math.min(toPositiveInt(params.limit, DEFAULT_LIMIT), MAX_LIMIT)
    const skip = (page - 1) * limit

    return await withDb(params, async (client) => {
      const collection = client.collection(COLLECTION)

      // count first so the caller always learns the true total, even when the
      // requested page is past the end of the result set
      const total = await collection.countDocuments(filter)
      const totalPages = total === 0 ? 0 : Math.ceil(total / limit)

      let products = []
      if (skip < total) {
        // find() returns a cursor; findArray would cap the result at one batch
        products = await collection
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray()
      }

      const body = {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasPrevPage: page > 1,
          hasNextPage: page < totalPages
        },
        filters: { ...applied, sort: sortKey }
      }

      if (params.facets === 'true' || params.facets === true) {
        const [categories, brands] = await Promise.all([
          collection.distinct('category'),
          collection.distinct('brand')
        ])
        body.facets = {
          categories: (categories || []).filter(Boolean).sort(),
          brands: (brands || []).filter(Boolean).sort()
        }
      }

      logger.info(`listed ${products.length} of ${total} products (page ${page}, sort ${sortKey})`)
      return success(200, `Found ${total} product(s)`, body)
    })
  } catch (error) {
    logger.error(error)
    return failure(500, 'Server error', logger)
  }
}

exports.main = main
