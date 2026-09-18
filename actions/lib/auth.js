/*
* Password hashing and user-token helpers for the storefront's own user accounts.
*
* Passwords are hashed with scrypt from node's built-in crypto module: no native
* dependency to build, and the per-user random salt plus scrypt's memory-hard
* work factor make offline cracking expensive. Hashes are never returned to clients.
*
* User tokens are HS256 JWTs signed with JWT_SECRET. They are distinct from the
* Adobe IMS tokens used to reach the database.
*/

const crypto = require('crypto')
const { promisify } = require('util')
const jwt = require('jsonwebtoken')

const scrypt = promisify(crypto.scrypt)

const SALT_BYTES = 16
const KEY_LENGTH = 64
const TOKEN_TTL = '2h'
const MIN_PASSWORD_LENGTH = 8

/**
 * Hashes a password with scrypt, generating a fresh salt unless one is supplied.
 *
 * @param {string} password plaintext password
 * @param {string} [salt] hex salt; generated when omitted
 * @returns {Promise<{salt: string, passwordHash: string}>}
 */
async function hashPassword (password, salt = crypto.randomBytes(SALT_BYTES).toString('hex')) {
  const derived = await scrypt(password, salt, KEY_LENGTH)
  return { salt, passwordHash: derived.toString('hex') }
}

/**
 * Verifies a password against a stored salt and hash in constant time.
 *
 * @param {string} password plaintext password to check
 * @param {string} salt the stored hex salt
 * @param {string} expectedHash the stored hex hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword (password, salt, expectedHash) {
  const derived = await scrypt(password, salt, KEY_LENGTH)
  const expected = Buffer.from(expectedHash, 'hex')
  if (derived.length !== expected.length) {
    return false
  }
  return crypto.timingSafeEqual(derived, expected)
}

/**
 * Signs a short-lived user token.
 *
 * @param {object} user the stored user document
 * @param {string} secret JWT_SECRET
 * @returns {string} a signed JWT
 */
function signUserToken (user, secret) {
  return jwt.sign(
    { sub: String(user._id), email: user.email, name: user.name },
    secret,
    { expiresIn: TOKEN_TTL }
  )
}

/**
 * Verifies a user token's signature and expiry.
 *
 * @param {string} token the JWT
 * @param {string} secret JWT_SECRET
 * @returns {object} the decoded payload
 * @throws {Error} when the token is malformed, tampered with, or expired
 */
function verifyUserToken (token, secret) {
  return jwt.verify(token, secret, { algorithms: ['HS256'] })
}

/**
 * Normalizes an email for storage and lookup so the unique index behaves
 * case-insensitively.
 *
 * @param {string} email raw email input
 * @returns {string}
 */
function normalizeEmail (email) {
  return String(email).trim().toLowerCase()
}

/**
 * Validates signup credentials.
 *
 * @param {string} email candidate email
 * @param {string} password candidate password
 * @returns {string|null} an error message, or null when valid
 */
function validateCredentials (email, password) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))) {
    return 'a valid email address is required'
  }
  if (String(password).length < MIN_PASSWORD_LENGTH) {
    return `password must be at least ${MIN_PASSWORD_LENGTH} characters`
  }
  return null
}

/**
 * Strips secret fields so a user document is safe to return to a client.
 *
 * @param {object} user the stored user document
 * @returns {object} the public view of the user
 */
function publicUser (user) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    createdAt: user.createdAt
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  signUserToken,
  verifyUserToken,
  normalizeEmail,
  validateCredentials,
  publicUser,
  MIN_PASSWORD_LENGTH,
  TOKEN_TTL
}
