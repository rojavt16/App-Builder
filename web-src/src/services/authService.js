/*
* <license header>
*/

import { actionUrl } from './actionUrls'

const TOKEN_KEY = 'storefront.userToken'
const USER_KEY = 'storefront.user'

async function invoke (url, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers.authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body || {})
  })

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

export async function signup ({ name, email, password }) {
  return invoke(actionUrl('signup'), { body: { name, email, password } })
}

export async function login ({ email, password }) {
  return invoke(actionUrl('login'), { body: { email, password } })
}

export async function validateToken (token) {
  return invoke(actionUrl('validate-token'), { token })
}

export function saveSession (token, user) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
    window.localStorage.setItem(USER_KEY, JSON.stringify(user || null))
  } catch (e) {
  }
}

export function getSession () {
  try {
    return {
      token: window.localStorage.getItem(TOKEN_KEY),
      user: JSON.parse(window.localStorage.getItem(USER_KEY) || 'null')
    }
  } catch (e) {
    return { token: null, user: null }
  }
}

export function clearSession () {
  try {
    window.localStorage.removeItem(TOKEN_KEY)
    window.localStorage.removeItem(USER_KEY)
  } catch (e) {
  }
}
