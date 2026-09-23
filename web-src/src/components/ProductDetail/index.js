/*
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  Flex,
  View,
  Grid,
  Heading,
  Divider,
  Button,
  Text,
  ProgressCircle
} from '@adobe/react-spectrum'
import { useParams, useNavigate } from 'react-router-dom'

import { getProduct, formatPrice } from '../../services/productService'

import './ProductDetail.css'

function RelatedCard ({ product, onOpen }) {
  return (
    <View
      backgroundColor="static-white"
      borderWidth="thin"
      borderColor="gray-300"
      borderRadius="medium"
      padding="size-150"
      UNSAFE_className="related-card"
    >
      <div
        className="related-card__link"
        role="link"
        tabIndex={0}
        onClick={() => onOpen(product.sku)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen(product.sku)
          }
        }}
      >
        <View
          height="size-1600"
          marginBottom="size-100"
          UNSAFE_className="related-card__media"
        >
          <img
            src={product.image}
            alt={product.title}
            loading="lazy"
            className="related-card__image"
          />
        </View>
        <Text UNSAFE_className="related-card__title">{product.title}</Text>
        <View marginTop="size-75">
          <Text UNSAFE_className="related-card__price">
            {formatPrice(product.price, product.currency)}
          </Text>
        </View>
      </div>
    </View>
  )
}

export default function ProductDetail () {
  const { sku } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError('')
    setData(null)

    getProduct(sku, controller.signal)
      .then((response) => setData(response))
      .catch((e) => {
        if (e.name === 'AbortError') {
          return
        }
        setError(e.status === 404 ? 'That product does not exist.' : (e.message || 'Could not load the product.'))
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [sku])

  if (loading) {
    return (
      <Flex direction="row" alignItems="center" gap="size-150" marginTop="size-400">
        <ProgressCircle aria-label="loading product" isIndeterminate size="S" />
        <Text>Loading product ...</Text>
      </Flex>
    )
  }

  if (error) {
    return (
      <View>
        <Heading level={2}>Product unavailable</Heading>
        <Text>{error}</Text>
        <View marginTop="size-300">
          <Button variant="cta" onPress={() => navigate('/products')}>Back to products</Button>
        </View>
      </View>
    )
  }

  const { product, related = [] } = data
  const inStock = product.stock > 0

  return (
    <View width="100%">
      <Button variant="secondary" onPress={() => navigate('/products')}>&larr; Back to products</Button>

      <Flex direction="row" gap="size-400" wrap marginTop="size-300" alignItems="start">
        <View
          width="size-4600"
          height="size-4600"
          backgroundColor="static-white"
          borderWidth="thin"
          borderColor="gray-300"
          borderRadius="medium"
          padding="size-200"
          UNSAFE_className="pdp__media"
        >
          <img
            src={product.image}
            alt={product.title}
            className="pdp__image"
          />
        </View>

        <View flex="1" minWidth="size-3600" maxWidth="size-6000">
          <Text UNSAFE_className="pdp__category">
            {product.category}
          </Text>

          <Heading level={1} marginTop="size-50" marginBottom="size-100">{product.title}</Heading>

          {product.brand && (
            <Text UNSAFE_className="pdp__brand">by {product.brand}</Text>
          )}

          <View marginTop="size-200">
            <Text UNSAFE_className="pdp__price">
              {formatPrice(product.price, product.currency)}
            </Text>
          </View>

          <Flex direction="row" gap="size-200" alignItems="center" marginTop="size-150" wrap>
            {product.rating > 0 && (
              <Text>
                {'★'} {product.rating}
                {product.ratingCount > 0 && ` (${product.ratingCount} reviews)`}
              </Text>
            )}
            <Text UNSAFE_className={`pdp__stock ${inStock ? 'pdp__stock--in' : 'pdp__stock--out'}`}>
              {inStock ? `In stock: ${product.stock}` : 'Out of stock'}
            </Text>
          </Flex>

          {product.description && (
            <View marginTop="size-300">
              <Heading level={4} marginBottom="size-75">Description</Heading>
              <Text>{product.description}</Text>
            </View>
          )}

          <View marginTop="size-300">
            <Text UNSAFE_className="pdp__sku">SKU: {product.sku}</Text>
          </View>

          <View marginTop="size-300">
            <Button variant="cta" isDisabled={!inStock}>
              {inStock ? 'Add to cart' : 'Out of stock'}
            </Button>
          </View>
        </View>
      </Flex>

      {related.length > 0 && (
        <View marginTop="size-500">
          <Divider size="S" marginBottom="size-200" />
          <Heading level={3}>More in {product.category}</Heading>
          <Grid columns="repeat(auto-fill, minmax(180px, 1fr))" gap="size-200" marginTop="size-100">
            {related.map((item) => (
              <RelatedCard
                key={item.sku}
                product={item}
                onOpen={(nextSku) => navigate(`/products/${encodeURIComponent(nextSku)}`)}
              />
            ))}
          </Grid>
        </View>
      )}
    </View>
  )
}
