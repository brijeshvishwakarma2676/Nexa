import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

export default function Register() {
  const navigate = useNavigate()
  const { register, isLoading, error, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    setLocalError('')

    // Validate password match
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters')
      return
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setLocalError('Username can only contain letters, numbers, and underscores')
      return
    }

    const result = await register(email, username, password)
    if (result.success) {
      navigate('/')
    }
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12">
        <div className="max-w-md text-center text-white">
          <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-8">
            <span className="text-5xl font-bold">N</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Nexa</h1>
          <p className="text-lg text-white/80">
            Join millions of people sharing their stories, connecting with friends, and building communities.
          </p>
        </div>
      </div>

      {/* Right side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-white">N</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-primary)]">Nexa</h1>
          </div>

          <div className="card p-8">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              Create account
            </h2>
            <p className="text-[var(--color-text-muted)] mb-6">
              Start your journey with us today
            </p>

            {displayError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                {displayError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="input pl-10"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="Choose a username"
                    required
                    minLength={3}
                    maxLength={50}
                    className="input pl-10"
                  />
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Letters, numbers, and underscores only
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                    minLength={6}
                    className="input pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    className="input pl-10"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full h-12 text-base"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-[var(--color-text-muted)]">
              Already have an account?{' '}
              <Link to="/login" className="text-[var(--color-primary)] font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
