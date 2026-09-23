/*
* <license header>
*/

import { actionUrl } from './actionUrls'

export async function listProducts (query = {}, signal) {
  const url = new URL(actionUrl('list'))

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  const response = await fetch(url.toString(), { signal })
  const text = await response.text()

  let data
  try {
    data = JSON.parse(text)
  } catch (e) {
    data = { statusCode: response.status, success: false, message: text }
  }

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`)
    error.data = data
    error.status = response.status
    throw error
  }

  return data
}

export async function getProduct (sku, signal) {
  const url = new URL(actionUrl('detail'))
  url.searchParams.set('sku', sku)

  const response = await fetch(url.toString(), { signal })
  const text = await response.text()

  let data
  try {
    data = JSON.parse(text)
  } catch (e) {
    data = { statusCode: response.status, success: false, message: text }
  }

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`)
    error.data = data
    error.status = response.status
    throw error
  }

  return data
}

export function formatPrice (amount, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
  } catch (e) {
    return `${currency} ${Number(amount).toFixed(2)}`
  }
}
