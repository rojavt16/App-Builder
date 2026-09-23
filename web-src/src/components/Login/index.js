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

import './Login.css'

import { login, saveSession } from '../../services/authService'

export default function Login () {
  const navigate = useNavigate()

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
        navigate('/products')
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

        <Form
          onSubmit={(e) => {
            e.preventDefault()
            handleLogin()
          }}
        >
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
            type="submit"
            marginTop="size-200"
            isDisabled={busy}
          >
            {busy ? 'Logging in ...' : 'Log In'}
          </Button>
        </Form>

        <Text marginTop="size-200">
          Do not have an account?{' '}
          <span
            className="auth-switch-link"
            onClick={() => navigate('/signup')}
          >
            Sign up
          </span>
        </Text>
      </View>
    </Flex>
  )
}
