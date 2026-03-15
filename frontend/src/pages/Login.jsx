import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Phone, Loader2, RefreshCcw } from 'lucide-react';
import api from '../api';
import useAuthStore from '../store/authStore';

export default function Login() {
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Password
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionInfo, setSessionInfo] = useState({ hash: '', id: '' });
  
  const otpRefs = useRef([]);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    if (step === 2 && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [step]);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    let cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+')) cleanPhone = '+' + cleanPhone;
    if (cleanPhone.length < 8) {
      setError('Please enter a valid phone number with country code (e.g. +1234567890)');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/send-otp', { phoneNumber: cleanPhone });
      setSessionInfo({ hash: data.phoneCodeHash, id: data.tempSessionId });
      setPhone(cleanPhone);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const pastedData = value.replace(/[^0-9]/g, '').split('').slice(0, 6);
      const newOtp = [...otp];
      pastedData.forEach((char, i) => {
        if (index + i < 6) newOtp[index + i] = char;
      });
      setOtp(newOtp);
      // Focus appropriate input
      const nextIndex = Math.min(index + pastedData.length, 5);
      otpRefs.current[nextIndex].focus();
      return;
    }

    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next
    if (value && index < 5) {
      otpRefs.current[index + 1].focus();
    }
    
    // Auto submit if full
    if (index === 5 && value && newOtp.every(v => v !== '')) {
      verifyCode(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1].focus();
    } else if (e.key === 'Enter') {
      if (otp.every(v => v !== '')) {
        verifyCode(otp.join(''));
      }
    }
  };

  const verifyCode = async (codeString) => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', {
        phoneNumber: phone,
        phoneCodeHash: sessionInfo.hash,
        tempSessionId: sessionInfo.id,
        code: codeString
      });

      if (data.requiresPassword) {
        setStep(3);
      } else {
        login(data.user, data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code. Please try again.');
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0].focus();
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', {
        phoneNumber: phone,
        phoneCodeHash: sessionInfo.hash,
        tempSessionId: sessionInfo.id,
        code: otp.join(''),
        password
      });

      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid password. Please try again.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 selection:bg-primary/30 selection:text-foreground">
      {/* Dynamic Background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 blur-[100px] rounded-full opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[100px] rounded-full opacity-50 pointer-events-none" />

      {/* Logo */}
      <div className="mb-10 text-center relative z-10 transition-transform hover:scale-105 cursor-default">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-primary/20 mx-auto mb-4">
          U
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Login to Unistro</h1>
        <p className="text-muted-foreground mt-2">Your private cloud powered by Telegram</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-card/60 backdrop-blur-xl border border-border p-8 rounded-3xl shadow-sm sm:shadow-xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
            <span className="shrink-0 animate-bounce">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Phone */}
        {step === 1 && (
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-foreground">Phone Number</label>
              <div className="relative flex items-center">
                <div className="absolute pl-4 pointer-events-none text-muted-foreground">
                  <Phone size={18} />
                </div>
                <input
                  id="phone"
                  type="tel"
                  placeholder="+1 (234) 567-8900"
                  className="block w-full pl-11 pr-4 py-3 bg-muted/50 border border-transparent rounded-xl text-foreground placeholder-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground pl-1">Include country code (e.g., +1 for US, +44 for UK)</p>
            </div>
            
            <button
              type="submit"
              disabled={loading || !phone}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Send Code <ArrowRight className="ml-2" size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Verify your number</h3>
              <p className="text-sm text-muted-foreground">
                We've sent a code via Telegram app to <br/>
                <span className="font-medium text-foreground">{phone}</span>
              </p>
            </div>

            <div className="flex justify-between gap-2 sm:gap-4 mt-8">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  type="text"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold bg-muted/50 border border-transparent rounded-xl text-foreground focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                  disabled={loading}
                />
              ))}
            </div>

            <div className="pt-4 flex flex-col gap-3">
               <button
                  onClick={() => verifyCode(otp.join(''))}
                  disabled={loading || otp.join('').length < 5}
                  className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify Code'}
                </button>
                <button
                  onClick={() => {
                    setStep(1);
                    setOtp(['', '', '', '', '', '']);
                    setError('');
                  }}
                  disabled={loading}
                  className="text-sm text-primary hover:text-primary/80 font-medium flex justify-center items-center py-2"
                >
                  Change phone number
                </button>
            </div>
          </div>
        )}

        {/* Step 3: 2FA Password */}
        {step === 3 && (
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="text-center space-y-2">
               <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                 <Lock className="text-primary" size={24} />
               </div>
              <h3 className="text-lg font-semibold text-foreground">Two-Step Verification</h3>
              <p className="text-sm text-muted-foreground">Your account is protected. Enter your password.</p>
            </div>

            <div className="space-y-2 mt-6">
              <input
                type="password"
                placeholder="Password"
                className="block w-full px-4 py-3 text-center text-lg tracking-widest bg-muted/50 border border-transparent rounded-xl text-foreground placeholder-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Login'}
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground flex items-center gap-2 relative z-10 font-medium bg-muted/50 px-4 py-2 rounded-full border border-border">
        <Lock size={14} className="text-emerald-500" />
        Secure login via Telegram MTProto
      </div>
    </div>
  );
}
