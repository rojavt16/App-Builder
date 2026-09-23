/*
* <license header>
*/

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Flex,
  View,
  Grid,
  Heading,
  Divider,
  TextField,
  Picker,
  Item,
  Button,
  Text,
  ProgressCircle
} from '@adobe/react-spectrum'
import { useNavigate } from 'react-router-dom'

import { listProducts, formatPrice } from '../../services/productService'
import { getSession, clearSession } from '../../services/authService'

import './ProductList.css'

const PAGE_SIZE = 12
const ALL = 'all'

const SORT_OPTIONS = [
  { key: 'title_asc', label: 'Name (A-Z)' },
  { key: 'title_desc', label: 'Name (Z-A)' },
  { key: 'price_asc', label: 'Price (low to high)' },
  { key: 'price_desc', label: 'Price (high to low)' },
  { key: 'rating_desc', label: 'Rating (best first)' }
]

function ProductCard ({ product, onOpen }) {
  return (
    <View
      backgroundColor="static-white"
      borderWidth="thin"
      borderColor="gray-300"
      borderRadius="medium"
      padding="size-200"
      UNSAFE_className="product-card"
    >
      <div
        className="product-card__link"
        role="link"
        tabIndex={0}
        aria-label={product.title}
        onClick={() => onOpen(product.sku)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen(product.sku)
          }
        }}
      >
      <View
        height="size-2400"
        marginBottom="size-150"
        UNSAFE_className="product-card__media"
      >
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          className="product-card__image"
        />
      </View>

      <Text UNSAFE_className="product-card__category">
        {product.category}
      </Text>

      <View minHeight="size-700" marginTop="size-50">
        <Text UNSAFE_className="product-card__title">{product.title}</Text>
      </View>

      <Flex direction="row" justifyContent="space-between" alignItems="center" marginTop="size-100">
        <Text UNSAFE_className="product-card__price">
          {formatPrice(product.price, product.currency)}
        </Text>
        {product.rating > 0 && (
          <Text UNSAFE_className="product-card__rating">
            {'★'} {product.rating}
          </Text>
        )}
      </Flex>
      </div>
    </View>
  )
}

export default function ProductList () {
  const navigate = useNavigate()
  const [session] = useState(() => getSession())

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(ALL)
  const [sort, setSort] = useState('title_asc')
  const [page, setPage] = useState(1)

  const [data, setData] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const inFlight = useRef(null)

  const load = useCallback(async (query) => {
    if (inFlight.current) {
      inFlight.current.abort()
    }
    const controller = new AbortController()
    inFlight.current = controller

    setLoading(true)
    setError('')

    try {
      const response = await listProducts({ ...query, limit: PAGE_SIZE, facets: true }, controller.signal)
      setData(response)
      if (response.facets?.categories) {
        setCategories(response.facets.categories)
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        return
      }
      setError(e.message || 'Could not load products.')
      setData(null)
    } finally {
      if (inFlight.current === controller) {
        inFlight.current = null
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      load({
        search,
        category: category === ALL ? '' : category,
        sort,
        page
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [search, category, sort, page, load])

  useEffect(() => () => {
    if (inFlight.current) {
      inFlight.current.abort()
    }
  }, [])

  const onSearchChange = (value) => {
    setSearch(value)
    setPage(1)
  }
  const onCategoryChange = (value) => {
    setCategory(value)
    setPage(1)
  }
  const onSortChange = (value) => {
    setSort(value)
    setPage(1)
  }

  const handleLogout = () => {
    clearSession()
    navigate('/login')
  }

  const pagination = data?.pagination
  const products = data?.products || []

  return (
    <View width="100%">
      <Flex direction="row" justifyContent="space-between" alignItems="center" wrap gap="size-200">
        <Heading level={1} marginY="size-0">Products</Heading>
        {session.user && (
          <Flex direction="row" alignItems="center" gap="size-150" wrap>
            <Text>Signed in as <strong>{session.user.name || session.user.email}</strong></Text>
            <Button variant="secondary" onPress={handleLogout}>Log out</Button>
          </Flex>
        )}
      </Flex>

      <Divider size="S" marginTop="size-200" marginBottom="size-200" />

      <Flex direction="row" gap="size-200" wrap alignItems="end">
        <TextField
          label="Search"
          width="size-3000"
          value={search}
          onChange={onSearchChange}
          placeholder="Name, brand or tag"
        />
        <Picker
          label="Category"
          selectedKey={category}
          onSelectionChange={onCategoryChange}
          width="size-2400"
        >
          <Item key={ALL}>All categories</Item>
          {categories.map((name) => <Item key={name}>{name}</Item>)}
        </Picker>
        <Picker
          label="Sort by"
          selectedKey={sort}
          onSelectionChange={onSortChange}
          width="size-2400"
          items={SORT_OPTIONS}
        >
          {(option) => <Item key={option.key}>{option.label}</Item>}
        </Picker>
      </Flex>

      <Flex direction="row" alignItems="center" gap="size-150" marginTop="size-200" minHeight="size-400">
        {loading && <ProgressCircle aria-label="loading products" isIndeterminate size="S" />}
        {!loading && pagination && (
          <Text>
            {pagination.total === 0
              ? 'No products match those filters.'
              : `${pagination.total} product${pagination.total === 1 ? '' : 's'} ` +
                `— page ${pagination.page} of ${pagination.totalPages}`}
          </Text>
        )}
        {error && <Text UNSAFE_className="product-list__error">{error}</Text>}
      </Flex>

      {products.length > 0 && (
        <Grid
          columns="repeat(auto-fill, minmax(220px, 1fr))"
          gap="size-200"
          marginTop="size-100"
        >
          {products.map((product) => (
            <ProductCard
              key={product.sku}
              product={product}
              onOpen={(sku) => navigate(`/products/${encodeURIComponent(sku)}`)}
            />
          ))}
        </Grid>
      )}

      {pagination && pagination.totalPages > 1 && (
        <Flex direction="row" gap="size-150" alignItems="center" justifyContent="center" marginTop="size-400">
          <Button
            variant="secondary"
            isDisabled={!pagination.hasPrevPage || loading}
            onPress={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <Text>Page {pagination.page} of {pagination.totalPages}</Text>
          <Button
            variant="secondary"
            isDisabled={!pagination.hasNextPage || loading}
            onPress={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </Flex>
      )}
    </View>
  )
}
