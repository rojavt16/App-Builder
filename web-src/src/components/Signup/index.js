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

import './Signup.css'

import { signup, saveSession } from '../../services/authService'

export default function Signup () {
  const navigate = useNavigate()

  const isMounted = useRef(true)
  useEffect(() => () => { isMounted.current = false }, [])

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
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

  const handleSignup = async () => {
    const { name, email, password, confirmPassword } = formData

    if (password !== confirmPassword) {
      alert('Passwords do not match')
      return
    }

    setBusy(true)
    try {
      const response = await signup({ name, email, password })
      if (!isMounted.current) {
        return
      }
      setBusy(false)

      if (response.statusCode === 201) {
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

      console.log('Signup error:', errorData)
      alert(errorData.message || 'An error occurred during sign up.')
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
        <Heading level={2}>Create Account</Heading>

        <Text marginBottom="size-300">
          Sign up to continue
        </Text>

        <Form
          onSubmit={(e) => {
            e.preventDefault()
            handleSignup()
          }}
        >
          <TextField
            label="Full Name"
            value={formData.name}
            onChange={(value) => handleChange('name', value)}
            isRequired
          />

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
            description="At least 8 characters"
            value={formData.password}
            onChange={(value) => handleChange('password', value)}
            isRequired
          />

          <TextField
            label="Confirm Password"
            type="password"
            value={formData.confirmPassword}
            onChange={(value) => handleChange('confirmPassword', value)}
            isRequired
          />

          <Button
            variant="cta"
            type="submit"
            marginTop="size-200"
            isDisabled={busy}
          >
            {busy ? 'Signing up ...' : 'Sign Up'}
          </Button>
        </Form>

        <Text marginTop="size-200">
          Already have an account?{' '}
          <span
            className="auth-switch-link"
            onClick={() => navigate('/login')}
          >
            Login
          </span>
        </Text>
      </View>
    </Flex>
  )
}
