import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiArrowRight, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { API_BASE } from '../lib/config'

export default function Login() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function onLogin(e) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()

      if (res.ok && data.access_token) {
        localStorage.setItem('cm_token', data.access_token)
        setSuccess(true)
        setTimeout(() => {
          router.push('/')
        }, 1500)
      } else {
        let errorMsg = 'Login failed. Please try again.'
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

      {/* Login Card */}
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
            <p className="text-olive-300 mt-2">Welcome back</p>
          </motion.div>

          {/* Form */}
          <form onSubmit={onLogin} className="space-y-4">
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
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="search-input focus:border-olive-400"
                disabled={loading}
              />
            </motion.div>

            {/* Password Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-olive-300 text-sm font-semibold mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
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
                <p className="text-green-200 text-sm">Login successful! Redirecting...</p>
              </motion.div>
            )}

            {/* Login Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
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
                  Logging in...
                </>
              ) : success ? (
                <>
                  <FiCheckCircle /> Logged in!
                </>
              ) : (
                <>
                  Sign In
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

          {/* Register Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center"
          >
            <p className="text-olive-300">
              Don't have an account?{' '}
              <Link href="/register">
                <span className="text-olive-400 hover:text-olive-300 font-semibold cursor-pointer transition-colors">
                  Create one
                </span>
              </Link>
            </p>
          </motion.div>

          {/* Demo Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 p-3 bg-olive-800/50 border border-olive-700 rounded text-olive-300 text-xs"
          >
            <p className="font-semibold mb-1">Demo Credentials:</p>
            <p>Username: <span className="text-olive-200">demo</span></p>
            <p>Password: <span className="text-olive-200">demo123</span></p>
          </motion.div>
        </div>
      </motion.div>

      {/* Floating Elements */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-olive-700 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-olive-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
    </div>
  )
}

