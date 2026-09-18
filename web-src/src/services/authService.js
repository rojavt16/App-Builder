/*
* <license header>
*/

/*
* Storefront authentication service.
*
* Wraps the signup, login and validate-token actions so the components stay free
* of fetch plumbing. The actions are deployed with `require-adobe-auth: false`,
* so no Adobe IMS token is involved anywhere in the browser; the only token sent
* is the app's own user JWT, and only to validate-token.
*
* On a non-2xx response this throws an Error carrying the parsed action body on
* `error.data`, so a component can read `error.data.message` and
* `error.data.statusCode`.
*/

import allActions from '../config.json'

const TOKEN_KEY = 'storefront.userToken'
const USER_KEY = 'storefront.user'

/**
 * Invokes a storefront action.
 *
 * @param {string} actionUrl the deployed action url
 * @param {object} [options] request options
 * @param {object} [options.body] JSON body to post
 * @param {string} [options.token] user JWT to send as a bearer token
 * @returns {Promise<object>} the parsed action body
 */
async function invoke (actionUrl, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers.authorization = `Bearer ${token}`
  }

  const response = await fetch(actionUrl, {
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

/**
 * Registers a new account.
 *
 * @param {object} form the signup form values
 * @param {string} form.name full name
 * @param {string} form.email email address
 * @param {string} form.password plaintext password, hashed server side
 * @returns {Promise<object>} the action body, including `token` and `user`
 */
export async function signup ({ name, email, password }) {
  return invoke(allActions.signup, { body: { name, email, password } })
}

/**
 * Authenticates an existing account.
 *
 * @param {object} form the login form values
 * @param {string} form.email email address
 * @param {string} form.password plaintext password
 * @returns {Promise<object>} the action body, including `token` and `user`
 */
export async function login ({ email, password }) {
  return invoke(allActions.login, { body: { email, password } })
}

/**
 * Checks whether a user token is still valid.
 *
 * @param {string} token the user JWT
 * @returns {Promise<object>} the action body, including `user` and `expiresAt`
 */
export async function validateToken (token) {
  return invoke(allActions['validate-token'], { token })
}

/**
 * Persists the session so a reload keeps the user logged in.
 *
 * @param {string} token the user JWT
 * @param {object} user the public user record
 * @returns {void}
 */
export function saveSession (token, user) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
    window.localStorage.setItem(USER_KEY, JSON.stringify(user || null))
  } catch (e) {
    // private windows and blocked site data make localStorage unavailable
  }
}

/**
 * Reads the stored session.
 *
 * @returns {{token: string|null, user: object|null}}
 */
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

/**
 * Clears the stored session.
 *
 * @returns {void}
 */
export function clearSession () {
  try {
    window.localStorage.removeItem(TOKEN_KEY)
    window.localStorage.removeItem(USER_KEY)
  } catch (e) {
    // nothing to clear when storage is unavailable
  }
}
