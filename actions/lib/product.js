const CATEGORY_MAX_LENGTH = 100
const TITLE_MAX_LENGTH = 300
const DESCRIPTION_MAX_LENGTH = 2000
const MAX_RATING = 5
const DEFAULT_STOCK = 25

function toNumber (value) {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toText (value) {
  return value === null || value === undefined ? '' : String(value).trim()
}

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

function fromDummyJson (raw) {
  return {
    sku: raw?.sku,
    title: raw?.title,
    description: raw?.description,
    price: raw?.price,
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

function fromFakeStore (raw) {
  return {
    sku: `FS-${raw?.id}`,
    title: raw?.title,
    description: raw?.description,
    price: raw?.price,
    currency: 'USD',
    category: raw?.category,
    brand: '',
    stock: DEFAULT_STOCK,
    rating: raw?.rating?.rate,
    ratingCount: raw?.rating?.count,
    image: raw?.image,
    tags: [],
    sourceId: raw?.id
  }
}

function mapSourceItem (raw) {
  const nestedRating = raw !== null && typeof raw === 'object' &&
    typeof raw.rating === 'object' && raw.rating !== null
  return nestedRating ? fromFakeStore(raw) : fromDummyJson(raw)
}

module.exports = { validateProduct, fromDummyJson, fromFakeStore, mapSourceItem }
