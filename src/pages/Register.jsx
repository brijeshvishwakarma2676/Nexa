import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, Calendar, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'

const GOOGLE_CLIENT_ID = '75355985562-3jkt7pgrcegteani3r0hflob6e8famaa.apps.googleusercontent.com'

// Generate arrays for date selectors
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const YEARS = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i)

export default function Register() {
  const navigate = useNavigate()
  const { register, checkEmail, checkUsername, googleVerify, googleSignup, isLoading, error, clearError } = useAuthStore()

  // Flow state: 'local' or 'google'
  const [flow, setFlow] = useState('local')
  const [step, setStep] = useState(1)

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    username: '',
    birthday: { month: '', day: '', year: '' },
    googleToken: null,
    googleData: null
  })

  const [showPassword, setShowPassword] = useState(false)
  const [emailAvailable, setEmailAvailable] = useState(null)
  const [usernameAvailable, setUsernameAvailable] = useState(null)
  const [usernameSuggestions, setUsernameSuggestions] = useState([])

  // Calculate age from birthday
  const calculateAge = (birthday) => {
    if (!birthday.month || !birthday.day || !birthday.year) return null
    const today = new Date()
    const birthDate = new Date(birthday.year, birthday.month - 1, birthday.day)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  // Format birthday as YYYY-MM-DD for API
  const formatBirthday = (birthday) => {
    const month = String(birthday.month).padStart(2, '0')
    const day = String(birthday.day).padStart(2, '0')
    return `${birthday.year}-${month}-${day}`
  }

  // Load Google script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = initGoogle
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  const initGoogle = () => {
    if (!window.google) return

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse
    })

    const container = document.getElementById('google-btn-register')
    if (container) {
      const width = Math.min(320, window.innerWidth - 64)
      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: width
      })
    }
  }

  const handleGoogleResponse = async (response) => {
    const result = await googleVerify(response.credential)
    
    if (result.success) {
      if (!result.isNewUser) {
        // Existing user - already logged in
        toast.success('Welcome back!')
        navigate('/')
      } else {
        // New user - switch to Google flow
        setFlow('google')
        setFormData(prev => ({
          ...prev,
          googleToken: response.credential,
          googleData: result.googleData,
          displayName: result.googleData.name,
          username: result.suggestedUsername
        }))
        setStep(2) // Skip email step, go to birthday
      }
    }
  }


  // Email validation and availability check
  const handleEmailNext = async () => {
    if (!formData.email) {
      toast.error('Email is required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email')
      return
    }

    const result = await checkEmail(formData.email)
    if (!result.available) {
      toast.error('This email is already registered. Try logging in.')
      return
    }
    setEmailAvailable(true)
    setStep(2)
  }

  // Birthday validation
  const handleBirthdayNext = () => {
    const { month, day, year } = formData.birthday
    if (!month || !day || !year) {
      toast.error('Please enter your full birthday')
      return
    }
    const age = calculateAge(formData.birthday)
    if (age < 13) {
      toast.error('You must be at least 13 years old to create an account')
      return
    }
    setStep(3)
  }

  // Name & Password validation
  const handleNamePasswordNext = () => {
    if (!formData.displayName.trim()) {
      toast.error('Please enter your name')
      return
    }
    if (flow === 'local' && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setStep(4)
  }

  // Username check with debounce
  const checkUsernameAvailability = useCallback(async (username) => {
    if (username.length < 3) {
      setUsernameAvailable(null)
      return
    }
    const result = await checkUsername(username)
    setUsernameAvailable(result.available)
    setUsernameSuggestions(result.suggestions || [])
  }, [checkUsername])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.username.length >= 3) {
        checkUsernameAvailability(formData.username)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [formData.username, checkUsernameAvailability])

  // Final signup
  const handleSignup = async () => {
    clearError()

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      toast.error('Username can only contain letters, numbers, and underscores')
      return
    }

    if (usernameAvailable === false) {
      toast.error('This username is taken. Please choose another.')
      return
    }

    const birthday = formatBirthday(formData.birthday)

    if (flow === 'local') {
      const result = await register(
        formData.email,
        formData.username,
        formData.password,
        formData.displayName,
        birthday
      )
      if (result.success) {
        toast.success('Account created successfully!')
        navigate('/')
      } else {
        toast.error(result.error || 'Registration failed')
      }
    } else {
      const result = await googleSignup(
        formData.googleToken,
        birthday,
        formData.username
      )
      if (result.success) {
        toast.success('Account created successfully!')
        navigate('/')
      } else {
        toast.error(result.error || 'Registration failed')
      }
    }
  }

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  // Determine total steps based on flow
  const totalSteps = flow === 'local' ? 4 : 3

  return (
    <div className="min-h-screen bg-(--color-bg) flex overflow-x-hidden">
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
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-white">N</span>
            </div>
            <h1 className="text-2xl font-bold text-(--color-primary)">Nexa</h1>
          </div>

          <div className="card p-6 sm:p-8">
            {/* Header with back button */}
            <div className="flex items-center mb-6">
              {step > 1 && (
                <button onClick={goBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                  <ArrowLeft className="w-5 h-5 text-(--color-text-primary)" />
                </button>
              )}
              <div className="flex-1 text-center">
                <div className="flex justify-center gap-1 mb-2">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 w-8 rounded-full ${i < step ? 'bg-(--color-primary)' : 'bg-gray-200'}`}
                    />
                  ))}
                </div>
              </div>
              {step > 1 && <div className="w-9" />}
            </div>

            {/* Step 1: Email */}
            {step === 1 && flow === 'local' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-(--color-text-primary) mb-2">
                  What's your email?
                </h2>
                <p className="text-(--color-text-muted) mb-6">
                  You'll use this to sign in to your account.
                </p>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--color-text-muted)" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email address"
                    className="input pl-10"
                    autoFocus
                  />
                </div>

                <button onClick={handleEmailNext} disabled={isLoading} className="btn btn-primary w-full h-12">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Next'}
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or</span>
                  </div>
                </div>

                <div id="google-btn-register" className="flex justify-center"></div>

                <p className="mt-6 text-center text-(--color-text-muted)">
                  Already have an account?{' '}
                  <Link to="/login" className="text-(--color-primary) font-medium hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            )}

            {/* Step 2: Birthday */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-(--color-text-primary) mb-2">
                  When's your birthday?
                </h2>
                <p className="text-(--color-text-muted) mb-6">
                  This won't be public. We use this to verify your age.
                </p>

                <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-2">
                  <div className="relative">
                    <select
                      value={formData.birthday.month}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        birthday: { ...prev.birthday, month: e.target.value }
                      }))}
                      className="input appearance-none pr-8 text-sm sm:text-base w-full"
                    >
                      <option value="">Month</option>
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select
                      value={formData.birthday.day}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        birthday: { ...prev.birthday, day: e.target.value }
                      }))}
                      className="input appearance-none pr-8 text-sm sm:text-base w-full"
                    >
                      <option value="">Day</option>
                      {DAYS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select
                      value={formData.birthday.year}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        birthday: { ...prev.birthday, year: e.target.value }
                      }))}
                      className="input appearance-none pr-8 text-sm sm:text-base w-full"
                    >
                      <option value="">Year</option>
                      {YEARS.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <button onClick={handleBirthdayNext} disabled={isLoading} className="btn btn-primary w-full h-12">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Next'}
                </button>
              </div>
            )}

            {/* Step 3: Name & Password */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-(--color-text-primary) mb-2">
                  {flow === 'google' ? 'Confirm your name' : 'Create your account'}
                </h2>

                <div>
                  <label className="block text-sm font-medium text-(--color-text-primary) mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--color-text-muted)" />
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="Your name"
                      className="input pl-10"
                      autoFocus
                    />
                  </div>
                </div>

                {flow === 'local' && (
                  <div>
                    <label className="block text-sm font-medium text-(--color-text-primary) mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--color-text-muted)" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="At least 6 characters"
                        className="input pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                <button onClick={handleNamePasswordNext} disabled={isLoading} className="btn btn-primary w-full h-12">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Next'}
                </button>
              </div>
            )}

            {/* Step 4: Username */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-(--color-text-primary) mb-2">
                  Choose a username
                </h2>
                <p className="text-(--color-text-muted) mb-6">
                  This is how other people will find you.
                </p>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)">@</span>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase() }))}
                    placeholder="username"
                    className="input pl-8"
                    autoFocus
                  />
                  {usernameAvailable !== null && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${usernameAvailable ? 'text-green-600' : 'text-red-600'}`}>
                      {usernameAvailable ? 'Available' : 'Taken'}
                    </span>
                  )}
                </div>

                {usernameSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {usernameSuggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => setFormData(prev => ({ ...prev, username: s }))}
                        className="text-sm px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200"
                      >
                        @{s}
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-xs text-(--color-text-muted)">
                  Letters, numbers, and underscores only
                </p>

                <button
                  onClick={handleSignup}
                  disabled={isLoading || usernameAvailable === false}
                  className="btn btn-primary w-full h-12"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
