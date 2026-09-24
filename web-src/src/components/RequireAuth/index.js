/*
* <license header>
*/

import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Flex, Text, ProgressCircle } from '@adobe/react-spectrum'

import { validateToken, getSession, clearSession } from '../../services/authService'

export default function RequireAuth ({ children }) {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    const { token } = getSession()

    if (!token) {
      setStatus('denied')
      return
    }

    let cancelled = false

    validateToken(token)
      .then(() => {
        if (!cancelled) {
          setStatus('allowed')
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearSession()
          setStatus('denied')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'checking') {
    return (
      <Flex direction="row" alignItems="center" gap="size-150" marginTop="size-400">
        <ProgressCircle aria-label="checking your session" isIndeterminate size="S" />
        <Text>Checking your session ...</Text>
      </Flex>
    )
  }

  if (status === 'denied') {
    return <Navigate to="/login" replace />
  }

  return children
}
