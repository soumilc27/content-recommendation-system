import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiMenu, FiX } from 'react-icons/fi'
import { getToken } from '../lib/auth'

export default function Header(){
  const [logged, setLogged] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(()=> setLogged(!!getToken()), [])

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/search', label: 'Search' },
    { href: '/recommend', label: 'Recommend' },
    { href: '/dashboard/taste-profile', label: 'Movie DNA' },
    { href: '/wishlist', label: 'Wishlist' },
  ]

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-b from-olive-950 to-olive-950/80 backdrop-blur-md sticky top-0 z-50 border-b border-olive-800"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-olive-400 to-olive-500 bg-clip-text text-transparent"
            >
              CineMind
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  className="text-olive-200 hover:text-white transition-colors font-medium cursor-pointer"
                >
                  {link.label}
                </motion.span>
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-olive-300 hover:text-white"
          >
            {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </motion.button>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {logged ? (
              <div className="flex items-center gap-3">
                <Link href="/profile">
                  <motion.button whileHover={{ scale: 1.05 }} className="btn btn-primary text-sm">
                    Profile
                  </motion.button>
                </Link>
              </div>
            ) : (
              <Link href="/login">
                <motion.button whileHover={{ scale: 1.05 }} className="btn btn-outline text-sm">
                  Sign In
                </motion.button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{
            opacity: mobileMenuOpen ? 1 : 0,
            height: mobileMenuOpen ? 'auto' : 0
          }}
          transition={{ duration: 0.3 }}
          className="md:hidden overflow-hidden border-t border-olive-800"
        >
          <div className="py-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <motion.span
                  whileHover={{ x: 4 }}
                  className="text-olive-200 hover:text-white block px-4 py-2 rounded transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </motion.span>
              </Link>
            ))}
            {logged ? (
              <>
                <Link href="/profile">
                  <motion.span className="text-olive-200 hover:text-white block px-4 py-2 rounded transition-colors"
                    onClick={() => setMobileMenuOpen(false)}>
                    Profile
                  </motion.span>
                </Link>
              </>
            ) : (
              <Link href="/login">
                <motion.span className="text-olive-200 hover:text-white block px-4 py-2 rounded transition-colors"
                  onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </motion.span>
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </motion.header>
  )
}
