import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiArrowRight, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { API_BASE } from '../lib/config'

export default function Register() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  async function onRegister(e) {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Please fill in all fields')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        let errorMsg = 'Registration failed. Please try again.'
        if (data.detail) {
          if (typeof data.detail === 'string') {
            errorMsg = data.detail
          } else if (Array.isArray(data.detail) && data.detail.length > 0) {
            errorMsg = data.detail[0].msg || 'Validation error'
          }
        }
        setError(errorMsg)
      }
    } catch (err) {
      console.error(err)
      setError('An error occurred. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-olive-950 flex items-center justify-center px-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-olive-900 via-olive-950 to-black opacity-50"></div>

      {/* Register Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-olive-900 border border-olive-800 rounded-lg p-8 backdrop-blur-md">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <Link href="/">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-olive-400 to-olive-500 bg-clip-text text-transparent hover:scale-105 transition-transform cursor-pointer">
                CineMind
              </h1>
            </Link>
            <p className="text-olive-300 mt-2">Create your account</p>
          </motion.div>

          {/* Form */}
          <form onSubmit={onRegister} className="space-y-4">
            {/* Username Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-olive-300 text-sm font-semibold mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                className="search-input focus:border-olive-400"
                disabled={loading}
              />
            </motion.div>

            {/* Email Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-olive-300 text-sm font-semibold mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="search-input focus:border-olive-400"
                disabled={loading}
              />
            </motion.div>

            {/* Password Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <label className="block text-olive-300 text-sm font-semibold mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                className="search-input focus:border-olive-400"
                disabled={loading}
              />
              <p className="text-olive-400 text-xs mt-1">At least 6 characters</p>
            </motion.div>

            {/* Confirm Password Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <label className="block text-olive-300 text-sm font-semibold mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className="search-input focus:border-olive-400"
                disabled={loading}
              />
            </motion.div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-900/30 border border-red-700 rounded-lg p-3 flex items-center gap-2"
              >
                <FiAlertCircle className="text-red-500 flex-shrink-0" />
                <p className="text-red-200 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Success Message */}
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-900/30 border border-green-700 rounded-lg p-3 flex items-center gap-2"
              >
                <FiCheckCircle className="text-green-500 flex-shrink-0" />
                <p className="text-green-200 text-sm">Registration successful! Redirecting to login...</p>
              </motion.div>
            )}

            {/* Register Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || success}
              className="w-full btn btn-primary flex items-center justify-center gap-2 text-lg mt-6"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-5 h-5 border-2 border-olive-200 border-t-white rounded-full"
                  />
                  Creating account...
                </>
              ) : success ? (
                <>
                  <FiCheckCircle /> Account created!
                </>
              ) : (
                <>
                  Create Account
                  <FiArrowRight />
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-olive-700"></div>
            <span className="text-olive-400 text-sm">or</span>
            <div className="flex-1 h-px bg-olive-700"></div>
          </div>

          {/* Login Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center"
          >
            <p className="text-olive-300">
              Already have an account?{' '}
              <Link href="/login">
                <span className="text-olive-400 hover:text-olive-300 font-semibold cursor-pointer transition-colors">
                  Sign in
                </span>
              </Link>
            </p>
          </motion.div>

          {/* Terms */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-olive-400 text-xs text-center mt-4"
          >
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </motion.p>
        </div>
      </motion.div>

      {/* Floating Elements */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-olive-700 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-olive-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
    </div>
  )
}

