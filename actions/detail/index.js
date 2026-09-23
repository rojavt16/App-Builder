const { Core } = require('@adobe/aio-sdk')
const { stringParameters } = require('../utils')
const { success, failure } = require('../lib/response')
const { withDb, findOneOrNull } = require('../lib/db')

const COLLECTION = 'products'
const RELATED_LIMIT = 4

async function main (params) {
  const logger = Core.Logger('detail', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.debug(stringParameters(params))

    const sku = String(params.sku || params.id || '').trim()
    if (!sku) {
      return failure(400, 'sku is required', logger)
    }

    return await withDb(params, async (client) => {
      const collection = client.collection(COLLECTION)
      const product = await findOneOrNull(collection, { sku })

      if (!product) {
        logger.info(`no product with sku ${sku}`)
        return failure(404, 'Product not found', logger)
      }

      let related = []
      try {
        related = await collection
          .find({ category: product.category, sku: { $ne: sku } })
          .sort({ rating: -1, _id: 1 })
          .limit(RELATED_LIMIT)
          .toArray()
      } catch (relatedError) {
        logger.error(`could not load related products for ${sku}: ${relatedError.message}`)
      }

      logger.info(`served product ${sku}`)
      return success(200, 'Product found', { product, related })
    })
  } catch (error) {
    logger.error(error)
    return failure(500, 'Server error', logger)
  }
}

exports.main = main
