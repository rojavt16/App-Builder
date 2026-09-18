/*
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  Flex,
  View,
  Heading,
  Divider,
  Button,
  Text,
  TextArea,
  StatusLight,
  ProgressCircle
} from '@adobe/react-spectrum'
import { useNavigate } from 'react-router-dom'

import { validateToken, getSession, clearSession } from '../../services/authService'

/*
 * Lands here after signup or login. Calling validate-token on mount is what
 * exercises the token-validation action: the token is only trusted once the
 * backend has checked its signature, its expiry, and that the account still exists.
 */
export default function Account () {
  const navigate = useNavigate()

  const [session] = useState(() => getSession())
  const [status, setStatus] = useState('checking')
  const [details, setDetails] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!session.token) {
      setStatus('invalid')
      setMessage('No token stored. Please log in.')
      return
    }

    let cancelled = false

    validateToken(session.token)
      .then((response) => {
        if (!cancelled) {
          setStatus('valid')
          setDetails(response)
          setMessage(response.message)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const errorData = error.data || { statusCode: error.status, message: error.message }
          console.log('Token validation error:', errorData)
          setStatus('invalid')
          setMessage(errorData.message || 'Token validation failed.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [session.token])

  const handleLogout = () => {
    clearSession()
    navigate('/login')
  }

  return (
    <View width="100%" maxWidth="size-6000">
      <Heading level={1}>My Account</Heading>

      <Flex direction="row" alignItems="center" gap="size-200">
        {status === 'checking' && (
          <>
            <ProgressCircle aria-label="validating token" isIndeterminate size="S" />
            <Text>Validating your token ...</Text>
          </>
        )}
        {status !== 'checking' && (
          <StatusLight variant={status === 'valid' ? 'positive' : 'negative'}>
            {message}
          </StatusLight>
        )}
      </Flex>

      <Divider size="S" marginTop="size-300" marginBottom="size-300" />

      {status === 'valid' && details && (
        <View>
          <Heading level={3}>Signed in as</Heading>
          <Text>
            <strong>{details.user.name}</strong> &mdash; {details.user.email}
          </Text>
          <View marginTop="size-200">
            <Text>Account created: {details.user.createdAt}</Text>
          </View>
          <View marginTop="size-100">
            <Text>Token expires: {details.expiresAt}</Text>
          </View>
          <TextArea
            label="User token (JWT)"
            isReadOnly
            width="100%"
            height="size-1200"
            marginTop="size-200"
            value={session.token}
          />
        </View>
      )}

      {status === 'invalid' && (
        <Text>Your session is not valid. Log in again to continue.</Text>
      )}

      <Flex direction="row" gap="size-200" marginTop="size-300">
        {status === 'valid'
          ? <Button variant="secondary" onPress={handleLogout}>Log out</Button>
          : <Button variant="cta" onPress={() => navigate('/login')}>Go to login</Button>}
      </Flex>
    </View>
  )
}
