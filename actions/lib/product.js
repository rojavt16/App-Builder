/*
* Product shape validation, normalization, and mapping from the source feed.
*
* The collection has a schema validator, but that only rejects a bad document at
* write time with an opaque database error. Validating here lets the ingest action
* say exactly which item failed and why, and lets every product be normalized to
* one consistent shape before it is stored.
*/

const CATEGORY_MAX_LENGTH = 100
const TITLE_MAX_LENGTH = 300
const DESCRIPTION_MAX_LENGTH = 2000
const MAX_RATING = 5

/**
 * Coerces a value to a finite number, or returns null when it is not numeric.
 *
 * @param {*} value the raw value
 * @returns {number|null}
 */
function toNumber (value) {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Trims a value to a string, or returns '' when it is absent.
 *
 * @param {*} value the raw value
 * @returns {string}
 */
function toText (value) {
  return value === null || value === undefined ? '' : String(value).trim()
}

/**
 * Validates and normalizes one product.
 *
 * @param {*} raw the candidate item
 * @returns {{product: object}|{error: string}} the stored shape, or why it was rejected
 */
function validateProduct (raw) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { error: 'item must be an object' }
  }

  const sku = toText(raw.sku)
  const title = toText(raw.title)
  const category = toText(raw.category)
  const price = toNumber(raw.price)

  if (!sku) {
    return { error: 'sku is required' }
  }
  if (!title) {
    return { error: 'title is required' }
  }
  if (title.length > TITLE_MAX_LENGTH) {
    return { error: `title must be at most ${TITLE_MAX_LENGTH} characters` }
  }
  if (!category) {
    return { error: 'category is required' }
  }
  if (category.length > CATEGORY_MAX_LENGTH) {
    return { error: `category must be at most ${CATEGORY_MAX_LENGTH} characters` }
  }
  if (price === null) {
    return { error: 'price is required and must be a number' }
  }
  if (price < 0) {
    return { error: 'price must not be negative' }
  }

  const stock = toNumber(raw.stock)
  if (raw.stock !== undefined && stock === null) {
    return { error: 'stock must be a number' }
  }

  const rating = toNumber(raw.rating)
  if (raw.rating !== undefined && rating === null) {
    return { error: 'rating must be a number' }
  }
  if (rating !== null && (rating < 0 || rating > MAX_RATING)) {
    return { error: `rating must be between 0 and ${MAX_RATING}` }
  }

  if (raw.tags !== undefined && !Array.isArray(raw.tags)) {
    return { error: 'tags must be an array' }
  }

  const description = toText(raw.description)
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return { error: `description must be at most ${DESCRIPTION_MAX_LENGTH} characters` }
  }

  return {
    product: {
      sku,
      title,
      description,
      // rounded to whole cents so arithmetic and sorting stay predictable
      price: Math.round(price * 100) / 100,
      currency: toText(raw.currency) || 'USD',
      category,
      brand: toText(raw.brand),
      stock: stock === null ? 0 : Math.trunc(stock),
      rating: rating === null ? 0 : rating,
      ratingCount: toNumber(raw.ratingCount) || 0,
      image: toText(raw.image),
      tags: (raw.tags || []).map(toText).filter(Boolean),
      sourceId: raw.sourceId === undefined ? null : String(raw.sourceId),
      createdAt: toText(raw.createdAt) || new Date().toISOString()
    }
  }
}

/**
 * Maps one item from the DummyJSON API onto this catalog's product shape.
 *
 * The source already supplies a unique sku, brand, stock and a flat rating, so
 * this is mostly a rename. Its numeric `id` is kept as `sourceId` for traceability,
 * and `thumbnail` becomes the catalog image.
 *
 * @param {object} raw an item from https://dummyjson.com/products
 * @returns {object} an unvalidated product in this catalog's shape
 */
function fromDummyJson (raw) {
  return {
    sku: raw?.sku,
    title: raw?.title,
    description: raw?.description,
    price: raw?.price,
    // the source quotes prices in US dollars
    currency: 'USD',
    category: raw?.category,
    brand: raw?.brand,
    stock: raw?.stock,
    rating: raw?.rating,
    ratingCount: Array.isArray(raw?.reviews) ? raw.reviews.length : 0,
    image: raw?.thumbnail,
    tags: raw?.tags,
    sourceId: raw?.id
  }
}

/**
 * Maps one item from the Fake Store API onto this catalog's product shape.
 *
 * That source supplies no sku, brand or stock, and nests its rating as
 * `{ rate, count }`. The sku is derived from the source id so re-running the
 * ingest recognises the same item as a duplicate instead of storing it twice.
 *
 * @param {object} raw an item from https://fakestoreapi.com/products
 * @returns {object} an unvalidated product in this catalog's shape
 */
function fromFakeStore (raw) {
  return {
    sku: `FS-${raw?.id}`,
    title: raw?.title,
    description: raw?.description,
    price: raw?.price,
    currency: 'USD',
    category: raw?.category,
    // not supplied by this source, so left blank rather than invented
    brand: '',
    stock: 0,
    rating: raw?.rating?.rate,
    ratingCount: raw?.rating?.count,
    image: raw?.image,
    tags: [],
    sourceId: raw?.id
  }
}

/**
 * Maps one feed item, choosing the mapper that matches the source.
 *
 * The two supported feeds are told apart by their rating: Fake Store nests it as
 * `{ rate, count }` while DummyJSON keeps it a flat number. Detecting the shape
 * rather than trusting a configured source name means PRODUCTS_API_URL can be
 * repointed without touching code, and a feed that runs locally but is blocked
 * from Adobe Runtime can be swapped for one that is not.
 *
 * @param {object} raw an item from either supported feed
 * @returns {object} an unvalidated product in this catalog's shape
 */
function mapSourceItem (raw) {
  const nestedRating = raw !== null && typeof raw === 'object' &&
    typeof raw.rating === 'object' && raw.rating !== null
  return nestedRating ? fromFakeStore(raw) : fromDummyJson(raw)
}

module.exports = { validateProduct, fromDummyJson, fromFakeStore, mapSourceItem }
