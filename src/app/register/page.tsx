"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, User, Lock, ArrowRight, ShieldCheck, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import styles from '../login/login.module.css';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // OTP verification state
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [expectedCode, setExpectedCode] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpSuccess, setOtpSuccess] = useState(false);

  // Real-time availability checks
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const usernameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emailTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced username availability check
  useEffect(() => {
    if (usernameTimeoutRef.current) clearTimeout(usernameTimeoutRef.current);
    if (!username || username.length < 2) { setUsernameStatus('idle'); return; }

    setUsernameStatus('checking');
    usernameTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'check@temp.com', username }),
        });
        const data = await res.json();
        if (!res.ok && data.error?.includes('Username')) {
          setUsernameStatus('taken');
        } else {
          setUsernameStatus('available');
        }
      } catch { setUsernameStatus('idle'); }
    }, 500);
  }, [username]);

  // Debounced email availability check
  useEffect(() => {
    if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);
    if (!email || !email.includes('@')) { setEmailStatus('idle'); return; }

    setEmailStatus('checking');
    emailTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, username: `__check_${Date.now()}` }),
        });
        const data = await res.json();
        if (!res.ok && data.error?.includes('Email')) {
          setEmailStatus('taken');
        } else {
          setEmailStatus('available');
        }
      } catch { setEmailStatus('idle'); }
    }, 500);
  }, [email]);

  // OTP timer countdown
  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => setOtpTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  const handleOtpDigitChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits are filled
    const fullCode = newDigits.join('');
    if (fullCode.length === 6) {
      verifyOtp(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    if (pasted.length === 6) verifyOtp(pasted);
  };

  // Step 1: Send verification code
  const sendVerificationCode = async () => {
    setError('');

    if (!email || !username || !password) {
      setError('All fields are required');
      return;
    }
    if (username.length < 2 || username.length > 32) {
      setError('Username must be 2–32 characters');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (usernameStatus === 'taken') {
      setError(`Username "@${username}" is already taken`);
      return;
    }
    if (emailStatus === 'taken') {
      setError('Email is already registered. Please sign in.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setExpectedCode(data.code);
      setOtpDigits(['', '', '', '', '', '']);
      setStep('verify');
      setOtpTimer(600); // 10 minute timer
      setOtpSuccess(false);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP code
  const verifyOtp = async (code: string) => {
    if (code !== expectedCode) {
      setError('Invalid verification code. Please try again.');
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      return;
    }

    setError('');
    setOtpSuccess(true);

    // OTP verified — now actually register
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Brief success animation then redirect
      setTimeout(() => router.push('/app'), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setOtpSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendVerificationCode();
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const StatusIcon = ({ status }: { status: 'idle' | 'checking' | 'available' | 'taken' }) => {
    if (status === 'checking') return <Loader2 size={14} style={{ color: '#a78bfa', animation: 'spin 1s linear infinite' }} />;
    if (status === 'available') return <CheckCircle size={14} style={{ color: '#57f287' }} />;
    if (status === 'taken') return <AlertCircle size={14} style={{ color: '#ed4245' }} />;
    return null;
  };

  return (
    <div className={styles.authPage}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        .otp-input {
          width: 48px; height: 56px; text-align: center; font-size: 1.5rem; font-weight: 700;
          border-radius: 12px; border: 2px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04); color: #f8fafc; outline: none;
          transition: all 0.2s ease; font-family: 'Outfit', monospace;
        }
        .otp-input:focus {
          border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2), 0 0 20px rgba(99, 102, 241, 0.15);
        }
        .otp-input.success {
          border-color: #57f287; box-shadow: 0 0 0 3px rgba(87, 242, 135, 0.2), 0 0 20px rgba(87, 242, 135, 0.15);
          color: #57f287;
        }
        .field-status { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); display: flex; align-items: center; gap: 4px; font-size: 0.7rem; }
        .field-status.taken { color: #ed4245; }
        .field-status.available { color: #57f287; }
      `}} />

      <AnimatePresence mode="wait">
        {step === 'form' ? (
          <motion.div
            key="form-step"
            className={`glass-panel ${styles.authCard}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -60, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <img src="/logo.png" alt="Arise" style={{ width: 48, height: 48, borderRadius: '50%', margin: '0 auto 8px', display: 'block' }} />
            </div>
            <h1 className={styles.authTitle}>Create an account</h1>
            <p className={styles.authSubtitle}>Join Arise — Your Next-Gen Sanctuary</p>

            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={styles.error} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={14} /> {error}
              </motion.div>
            )}

            <form onSubmit={handleFormSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={13} /> Email
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className={styles.input}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    required
                    style={{ paddingRight: emailStatus !== 'idle' ? 100 : 12 }}
                  />
                  {emailStatus !== 'idle' && (
                    <div className={`field-status ${emailStatus}`}>
                      <StatusIcon status={emailStatus} />
                      <span>{emailStatus === 'checking' ? '' : emailStatus === 'available' ? 'Available' : 'Taken'}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={13} /> Username
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className={styles.input}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    required
                    style={{ paddingRight: usernameStatus !== 'idle' ? 100 : 12 }}
                  />
                  {usernameStatus !== 'idle' && (
                    <div className={`field-status ${usernameStatus}`}>
                      <StatusIcon status={usernameStatus} />
                      <span>{usernameStatus === 'checking' ? '' : usernameStatus === 'available' ? 'Available' : 'Taken!'}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Lock size={13} /> Password
                </label>
                <input
                  type="password"
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                />
              </div>
              <button
                type="submit"
                className={`btn-primary ${styles.submitBtn}`}
                disabled={loading || usernameStatus === 'taken' || emailStatus === 'taken'}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {loading ? (
                  <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending Code...</>
                ) : (
                  <>Continue <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <p className={styles.link}>
              Already have an account? <Link href="/login">Sign In</Link>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="verify-step"
            className={`glass-panel ${styles.authCard}`}
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
          >
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{
                  width: 64, height: 64, borderRadius: '50%', margin: '0 auto 12px',
                  background: otpSuccess ? 'linear-gradient(135deg, #57f287, #2ecc71)' : 'linear-gradient(135deg, #6366f1, #a855f7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: otpSuccess ? '0 0 30px rgba(87,242,135,0.4)' : '0 0 30px rgba(99,102,241,0.4)',
                  transition: 'all 0.4s ease',
                }}
              >
                {otpSuccess ? <CheckCircle size={28} color="#fff" /> : <ShieldCheck size={28} color="#fff" />}
              </motion.div>
            </div>

            <h1 className={styles.authTitle}>
              {otpSuccess ? 'Email Verified! ✅' : 'Verify Your Email'}
            </h1>
            <p className={styles.authSubtitle} style={{ marginBottom: 4 }}>
              {otpSuccess
                ? 'Welcome to Arise! Redirecting...'
                : <>Enter the 6-digit code shown below</>
              }
            </p>

            {!otpSuccess && (
              <div style={{
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 16,
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Your verification code for <strong style={{ color: '#a78bfa' }}>{email}</strong>
                </p>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '2rem',
                  fontWeight: 800,
                  letterSpacing: '0.3em',
                  color: '#6366f1',
                  textShadow: '0 0 20px rgba(99,102,241,0.4)',
                }}>
                  {expectedCode}
                </div>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  ⏳ Code expires in <strong style={{ color: otpTimer < 60 ? '#ed4245' : '#57f287' }}>{formatTimer(otpTimer)}</strong>
                </p>
              </div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={styles.error} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <AlertCircle size={14} /> {error}
              </motion.div>
            )}

            {!otpSuccess && (
              <>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                  {otpDigits.map((digit, i) => (
                    <motion.input
                      key={i}
                      ref={el => { otpInputRefs.current[i] = el; }}
                      className={`otp-input ${otpSuccess ? 'success' : ''}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpDigitChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                    />
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => { setStep('form'); setError(''); setOtpDigits(['','','','','','']); }}
                    style={{ flex: 1, padding: '10px 16px', fontSize: '0.85rem' }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => sendVerificationCode()}
                    disabled={otpTimer > 540 || loading}
                    style={{ flex: 1, padding: '10px 16px', fontSize: '0.85rem' }}
                  >
                    Resend Code
                  </button>
                </div>
              </>
            )}

            {otpSuccess && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}
              >
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#57f287' }} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
