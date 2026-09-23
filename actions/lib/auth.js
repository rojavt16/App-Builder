const crypto = require('crypto')
const { promisify } = require('util')
const jwt = require('jsonwebtoken')

const scrypt = promisify(crypto.scrypt)

const SALT_BYTES = 16
const KEY_LENGTH = 64
const TOKEN_TTL = '2h'
const MIN_PASSWORD_LENGTH = 8

async function hashPassword (password, salt = crypto.randomBytes(SALT_BYTES).toString('hex')) {
  const derived = await scrypt(password, salt, KEY_LENGTH)
  return { salt, passwordHash: derived.toString('hex') }
}

async function verifyPassword (password, salt, expectedHash) {
  const derived = await scrypt(password, salt, KEY_LENGTH)
  const expected = Buffer.from(expectedHash, 'hex')
  if (derived.length !== expected.length) {
    return false
  }
  return crypto.timingSafeEqual(derived, expected)
}

function signUserToken (user, secret) {
  return jwt.sign(
    { sub: String(user._id), email: user.email, name: user.name },
    secret,
    { expiresIn: TOKEN_TTL }
  )
}

function verifyUserToken (token, secret) {
  return jwt.verify(token, secret, { algorithms: ['HS256'] })
}

function normalizeEmail (email) {
  return String(email).trim().toLowerCase()
}

function validateCredentials (email, password) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))) {
    return 'a valid email address is required'
  }
  if (String(password).length < MIN_PASSWORD_LENGTH) {
    return `password must be at least ${MIN_PASSWORD_LENGTH} characters`
  }
  return null
}

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
