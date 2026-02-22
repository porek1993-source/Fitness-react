// src/pages/AuthPage.jsx
import { useState } from 'react'
import { Zap, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useApp, haptic } from '../lib/useAppStore'

export default function AuthPage() {
  const { signIn, signUp } = useApp()
  const [mode,     setMode]     = useState('login')   // 'login' | 'signup'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    haptic([40])

    const fn = mode === 'login' ? signIn : signUp
    const { error: authError } = await fn(email, password)

    setLoading(false)
    if (authError) {
      setError(authError.message)
      haptic([80, 40, 80]) // Error pattern
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-red/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue/4 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red to-orange flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red/30">
          <Zap className="w-8 h-8 text-white" fill="white" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white">Agile Coach</h1>
        <p className="text-dim text-sm mt-1">AI-powered adaptive fitness</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        <div className="bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-6 shadow-2xl">
          {/* Tab toggle */}
          <div className="flex bg-surface rounded-2xl p-1 mb-6">
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null); haptic([30]) }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  mode === m
                    ? 'bg-red text-white shadow-md shadow-red/30'
                    : 'text-dim'
                }`}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-surface border border-border rounded-2xl pl-10 pr-4 py-3.5 text-white text-sm outline-none focus:border-red/60 transition-colors placeholder:text-dim"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
              <input
                type={showPwd ? 'text' : 'password'} required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                minLength={6}
                className="w-full bg-surface border border-border rounded-2xl pl-10 pr-12 py-3.5 text-white text-sm outline-none focus:border-red/60 transition-colors placeholder:text-dim"
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dim">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red/10 border border-red/20 rounded-2xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red flex-shrink-0" />
                <p className="text-red text-xs">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-red to-orange shadow-lg shadow-red/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {mode === 'signup' && (
            <p className="text-dim text-xs text-center mt-4 leading-relaxed">
              By creating an account, you agree to track your fitness data securely.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
