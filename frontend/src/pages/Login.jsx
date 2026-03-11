import { useState } from 'react'
import api from '../api'

const Logo = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00c9b8"/>
        <stop offset="1" stopColor="#a78bfa"/>
      </linearGradient>
    </defs>
    <rect width="36" height="36" rx="10" fill="url(#lg)"/>
    <path d="M10 22l6-8 5 6 3-4 5 6H10z" fill="#070b14" opacity="0.9"/>
    <circle cx="25" cy="13" r="2.5" fill="#070b14" opacity="0.9"/>
  </svg>
)

const steps = ['phone', 'code', '2fa']

export default function Login({ onLogin }) {
  const [step, setStep]       = useState('phone')
  const [phone, setPhone]     = useState('')
  const [code, setCode]       = useState('')
  const [pass, setPass]       = useState('')
  const [hash, setHash]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const wrap = async (fn) => {
    setLoading(true)
    setError('')
    try { await fn() }
    catch (e) { setError(e.message || 'Something went wrong') }
    finally { setLoading(false) }
  }

  const onPhone = (e) => {
    e.preventDefault()
    wrap(async () => {
      const res = await api.sendCode(phone)
      setHash(res.phone_code_hash)
      setStep('code')
    })
  }

  const onCode = (e) => {
    e.preventDefault()
    wrap(async () => {
      const res = await api.verify(phone, code, hash)
      if (res.requires_2fa) { setStep('2fa'); return }
      localStorage.setItem('unistro_token', res.token)
      onLogin()
    })
  }

  const on2FA = (e) => {
    e.preventDefault()
    wrap(async () => {
      const res = await api.verify2fa(phone, pass)
      localStorage.setItem('unistro_token', res.token)
      onLogin()
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      {/* Ambient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-slideUp">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Logo />
            <h1 className="text-3xl font-bold text-white tracking-tight">UniStro</h1>
          </div>
          <p className="text-muted text-sm">Unlimited storage · Powered by Telegram</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xl">
          {/* Steps indicator */}
          <div className="flex items-center gap-1.5 mb-6">
            {steps.map((s, i) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                steps.indexOf(step) >= i ? 'bg-primary' : 'bg-border'
              }`} />
            ))}
          </div>

          {/* Phone step */}
          {step === 'phone' && (
            <form onSubmit={onPhone} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-2">
                  Phone Number
                </label>
                <input
                  type="tel" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full bg-elevated border border-border rounded-xl px-4 py-3 text-white
                             placeholder-muted/50 focus:outline-none focus:border-primary/60
                             focus:ring-1 focus:ring-primary/30 transition-all"
                  required autoFocus
                />
                <p className="text-xs text-muted mt-1.5">Include country code (+91 for India)</p>
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || !phone}
                className="w-full bg-primary text-bg font-semibold py-3 rounded-xl
                           hover:opacity-90 active:scale-[0.98] transition-all
                           disabled:opacity-40 disabled:cursor-not-allowed">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner/> Sending code...
                  </span>
                ) : 'Continue with Telegram →'}
              </button>
            </form>
          )}

          {/* OTP step */}
          {step === 'code' && (
            <form onSubmit={onCode} className="space-y-4">
              <div>
                <p className="text-sm text-muted mb-4">
                  Telegram sent a code to{' '}
                  <span className="text-white font-medium">{phone}</span>
                </p>
                <label className="block text-sm font-medium text-muted mb-2">
                  Verification Code
                </label>
                <input
                  type="text" value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g,''))}
                  placeholder="·····"
                  maxLength={6}
                  className="w-full bg-elevated border border-border rounded-xl px-4 py-3
                             text-white text-center text-2xl tracking-[0.5em] font-mono
                             placeholder-muted/30 focus:outline-none focus:border-primary/60
                             focus:ring-1 focus:ring-primary/30 transition-all"
                  required autoFocus
                />
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || code.length < 5}
                className="w-full bg-primary text-bg font-semibold py-3 rounded-xl
                           hover:opacity-90 active:scale-[0.98] transition-all
                           disabled:opacity-40 disabled:cursor-not-allowed">
                {loading ? <span className="flex items-center justify-center gap-2"><Spinner/> Verifying...</span> : 'Verify Code'}
              </button>

              <button type="button" onClick={() => { setStep('phone'); setCode(''); setError('') }}
                className="w-full text-muted text-sm hover:text-white transition-colors py-1">
                ← Change number
              </button>
            </form>
          )}

          {/* 2FA step */}
          {step === '2fa' && (
            <form onSubmit={on2FA} className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                  </div>
                  <p className="text-sm text-white font-medium">Two-Factor Password</p>
                </div>
                <p className="text-xs text-muted mb-3">Your Telegram account has 2FA enabled.</p>
                <input
                  type="password" value={pass}
                  onChange={e => setPass(e.target.value)}
                  placeholder="Enter your 2FA password"
                  className="w-full bg-elevated border border-border rounded-xl px-4 py-3 text-white
                             placeholder-muted/50 focus:outline-none focus:border-accent/60
                             focus:ring-1 focus:ring-accent/30 transition-all"
                  required autoFocus
                />
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || !pass}
                className="w-full bg-accent text-white font-semibold py-3 rounded-xl
                           hover:opacity-90 active:scale-[0.98] transition-all
                           disabled:opacity-40 disabled:cursor-not-allowed">
                {loading ? <span className="flex items-center justify-center gap-2"><Spinner/> Signing in...</span> : 'Sign In'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted/60 mt-6">
          Photos stored in your Telegram account · No data shared
        </p>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}
