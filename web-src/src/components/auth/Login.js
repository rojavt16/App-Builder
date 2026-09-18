/*
* <license header>
*/

import React, { useState, useRef, useEffect } from 'react'
import {
  Flex,
  View,
  Heading,
  TextField,
  Button,
  Text,
  Form
} from '@adobe/react-spectrum'
import { useNavigate } from 'react-router-dom'

import { login, saveSession } from '../../services/authService'

export default function Login () {
  const navigate = useNavigate()

  // navigate() unmounts this page, but a blurred text field can still deliver a
  // final change event afterwards. Every setState is gated on this so a late
  // event is dropped instead of warning about updating an unmounted component.
  const isMounted = useRef(true)
  useEffect(() => () => { isMounted.current = false }, [])

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [busy, setBusy] = useState(false)

  const handleChange = (field, value) => {
    if (!isMounted.current) {
      return
    }
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleLogin = async () => {
    const { email, password } = formData

    setBusy(true)
    try {
      const response = await login({ email, password })
      if (!isMounted.current) {
        return
      }
      setBusy(false)

      if (response.statusCode === 200) {
        saveSession(response.token, response.user)
        alert(response.message)
        // no form reset here: this page unmounts on the next line, and clearing
        // the controlled fields first is what queued the stray change event
        navigate('/account')
      }
    } catch (error) {
      if (!isMounted.current) {
        return
      }
      setBusy(false)

      const errorData = error.data || {
        statusCode: error.status,
        message: error.message
      }

      console.log('Login error:', errorData)
      alert(errorData.message || 'An error occurred during login.')
    }
  }

  return (
    <Flex
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      <View
        backgroundColor="static-white"
        borderWidth="thin"
        borderColor="gray-300"
        borderRadius="medium"
        padding="size-400"
        width="size-4600"
      >
        <Heading level={2}>Welcome Back</Heading>

        <Text marginBottom="size-300">
          Log in to continue
        </Text>

        <Form>
          <TextField
            label="Email"
            type="email"
            value={formData.email}
            onChange={(value) => handleChange('email', value)}
            isRequired
          />

          <TextField
            label="Password"
            type="password"
            value={formData.password}
            onChange={(value) => handleChange('password', value)}
            isRequired
          />

          <Button
            variant="cta"
            marginTop="size-200"
            isDisabled={busy}
            onPress={handleLogin}
          >
            {busy ? 'Logging in ...' : 'Log In'}
          </Button>
        </Form>

        <Text marginTop="size-200">
          Do not have an account?{' '}
          <span
            style={{
              color: '#1473e6',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/signup')}
          >
            Sign up
          </span>
        </Text>
      </View>
    </Flex>
  )
}
