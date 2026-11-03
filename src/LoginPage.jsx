import React, { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from './lib/supabase.js';
import './LoginPage.css';

export default function LoginPage({ onSuccess, authChecking = false, existingSession = null }) {
  const [mode, setMode] = useState('login');
  const [showForm, setShowForm] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Student');
  const [city, setCity] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const splashTimer = window.setTimeout(() => setShowSplash(false), 5350);
    const formTimer = window.setTimeout(() => setShowForm(true), 5550);
    return () => { window.clearTimeout(splashTimer); window.clearTimeout(formTimer); };
  }, []);

  useEffect(() => {
    if (!authChecking && existingSession && !showSplash) {
      onSuccess(existingSession);
    }
  }, [authChecking, existingSession, showSplash]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (mode === 'signup' && !city.trim()) {
      setError('Please choose the city where you study.');
      return;
    }
    if (mode === 'signup' && role === 'Student' && !/^[a-z0-9_]{3,20}$/.test(username.trim().toLowerCase())) {
      setError('Student username must be 3–20 characters using letters, numbers, and underscores only.');
      return;
    }
    if (!supabaseConfigured || !supabase) {
      setError('Supabase is not configured. Please check the environment variables.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: name.trim(),
              role,
              city: city.trim(),
              username: role === 'Student' ? username.trim().toLowerCase() : null,
            },
          },
        });

        if (authError) throw authError;

        if (data.session) {
          onSuccess(data.session);
        } else {
          setNotice('Your account was created. Please check your email for the confirmation link, then log in.');
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (authError) throw authError;
        if (!data.session) {
          setError('Login did not return an active session. Please try again.');
          return;
        }
        onSuccess(data.session);
      }
    } catch (authError) {
      const authMessage = authError?.message || '';
      setError(/spacehunt_profiles_username_lower_uidx|duplicate key value.*username/i.test(authMessage)
        ? 'That username is already taken. Please choose another one.'
        : /database error saving new user/i.test(authMessage)
          ? 'Account creation failed. Check whether this username is already taken, then try another one.'
          : authMessage || 'Authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={`sh-login ${authChecking || existingSession ? "sh-login--booting" : ""}`}>
      {(showSplash || authChecking || existingSession) && (
        <div className="sh-splash" role="status" aria-label="SPACEHUNT loading">
          <div className="sh-splash__stars" aria-hidden="true" />
          <div className="sh-splash__nebula sh-splash__nebula--a" aria-hidden="true" />
          <div className="sh-splash__nebula sh-splash__nebula--b" aria-hidden="true" />
          <div className="sh-splash__horizon" aria-hidden="true" />
          <div className="sh-splash__portal" aria-hidden="true"><span /><span /><span /></div>
          <div className="sh-splash__floor" aria-hidden="true" />
          <div className="sh-splash__emblem" aria-hidden="true">
            <svg viewBox="0 0 58 54" fill="none"><path d="M6 13.5c8-4.2 15.2-2.8 23 2.5v31C21.4 41.2 13.4 40 6 44V13.5Z"/><path d="M52 13.5c-8-4.2-15.2-2.8-23 2.5v31C36.6 41.2 44.6 40 52 44V13.5Z"/><path d="M29 16V47M11 19v18c5.4-1.4 10.3-.3 15 2.4M47 19v18c-5.4-1.4-10.3-.3-15 2.4"/><path d="m24 7 5-5 5 5-5 5-5-5Z" className="sh-splash__gem"/></svg>
          </div>
          <div className="sh-splash__wordmark"><span>SPACE</span><b>HUNT</b></div>
          <div className="sh-splash__line"><i /></div>
        </div>
      )}
      <div className="sh-login__aurora sh-login__aurora--one" />
      <div className="sh-login__aurora sh-login__aurora--two" />
      <div className="sh-login__grid" />

      <section className="sh-login__layout">
        <div className="sh-login__brand-side">
          <div className="sh-login__brand-mark"><svg viewBox="0 0 58 54" fill="none" aria-hidden="true"><path d="M6 13.5c8-4.2 15.2-2.8 23 2.5v31C21.4 41.2 13.4 40 6 44V13.5Z"/><path d="M52 13.5c-8-4.2-15.2-2.8-23 2.5v31C36.6 41.2 44.6 40 52 44V13.5Z"/><path d="M29 16V47M11 19v18c5.4-1.4 10.3-.3 15 2.4M47 19v18c-5.4-1.4-10.3-.3-15 2.4"/><path d="m24 7 5-5 5 5-5 5-5-5Z" className="sh-login__gem"/></svg></div>
          <div className="sh-login__wordmark" aria-label="SPACEHUNT"><span className="sh-word-space">SPACE</span><span className="sh-word-hunt">HUNT</span><span className="sh-word-cursor" /></div>
          <div className="sh-login__orbit" aria-hidden="true"><span className="orbit orbit--a"/><span className="orbit orbit--b"/><span className="orbit orbit--c"/><span className="orbit-core">S<span>✦</span></span><i className="orbit-point orbit-point--a"/><i className="orbit-point orbit-point--b"/><i className="orbit-point orbit-point--c"/></div>
        </div>

        <div className={`sh-login__card ${showForm ? 'is-visible' : ''}`}>
          <h1>{mode === 'login' ? 'Welcome back.' : 'Join the journey.'}</h1>
          <div className="sh-login__mode"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => {setMode('login');setError('');}}>Log in</button><button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => {setMode('signup');setError('');}}>Create account</button></div>
          <form onSubmit={submit}>
            {mode === 'signup' && <label className="sh-field"><span>FULL NAME</span><input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name"/></label>}
            <label className="sh-field"><span>EMAIL ADDRESS</span><div className="sh-input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></div></label>
            <label className="sh-field"><span>PASSWORD</span><div className="sh-input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/><button type="button" className="sh-show-pass" onClick={() => setShowPassword(v => !v)}>{showPassword ? 'HIDE' : 'SHOW'}</button></div></label>
            {mode === 'signup' && <label className="sh-field"><span>I AM A</span><select value={role} onChange={e => setRole(e.target.value)}><option>Student</option><option>Space Owner</option></select></label>}
            {mode === 'signup' && <label className="sh-field"><span>{role === 'Student' ? 'STUDY CITY *' : 'CITY *'}</span><select value={city} onChange={e => setCity(e.target.value)} required><option value="">Select city</option>{['Jaipur','Kota','Delhi','Jodhpur','Suratgarh','Sri Ganganagar','Ajmer','Bikaner','Udaipur','Ahmedabad','Chandigarh','Lucknow','Indore','Pune','Mumbai','Bengaluru','Hyderabad','Chennai'].map(item => <option key={item} value={item}>{item}</option>)}</select></label>}
            {mode === 'signup' && role === 'Student' && <label className="sh-field"><span>UNIQUE USERNAME *</span><input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} minLength={3} maxLength={20} autoCapitalize="none" autoCorrect="off" placeholder="e.g. sartaj2027" required/><small className="sh-field__hint">3–20 characters · letters, numbers, underscores</small></label>}
            {notice && <p className="sh-login__notice" role="status">{notice}</p>}
            {error && <p className="sh-login__error" role="alert">{error}</p>}
            <button className="sh-login__submit" type="submit" disabled={busy}><span>{busy ? 'Please wait…' : mode === 'login' ? 'Unlock SPACEHUNT' : 'Create my account'}</span><b>↗</b></button>
          </form>
        </div>
      </section>
      <footer className="sh-login__footer"><span>© {new Date().getFullYear()} SPACEHUNT</span></footer>
    </main>
  );
}
