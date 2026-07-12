import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = import.meta.env.VITE_API_BASE || 'https://dinner-six-backend.shijanhoo.workers.dev';
const AUTH_KEY = 'dinnerSixAuthToken';

const TOPICS = ['Food', 'Travel', 'Startups', 'Books', 'Fitness', 'Music', 'AI', 'Culture', 'Comedy', 'Social impact', 'Gaming', 'Architecture'];
const AREAS = ['Central', 'East', 'West', 'North', 'North-East', 'CBD'];
const BUDGETS = ['$25-$35', '$35-$50', '$50-$70', '$70+'];
const STEPS = ['About you', 'Preferences', 'Dinner fit'];

const initialForm = {
  name: '', phone: '', gender: 'Female', age: '28', industry: 'Tech',
  vibe: 'Deep talks', energy: 'Balanced', topics: ['Food', 'Travel', 'Startups'],
  area: 'Central', budget: '$35-$50', diet: 'No restrictions', night: 'Thursday',
};

function api(path) {
  return `${API}${path}`;
}

function Toast({ messages }) {
  return (
    <div className="toast-stack">
      {messages.map(m => <div key={m.id} className={`toast toast-${m.type}`}>{m.text}</div>)}
    </div>
  );
}

function useToast() {
  const [messages, setMessages] = useState([]);
  const push = useCallback((text, type = 'error') => {
    const id = Date.now() + Math.random();
    setMessages(p => [...p, { id, text, type }]);
    setTimeout(() => setMessages(p => p.filter(m => m.id !== id)), 4500);
  }, []);
  return { messages, push };
}

function authHeaders(token) {
  return token ? { Authorization: 'Bearer ' + token } : {};
}

async function requestJson(path, { token, ...options } = {}) {
  const res = await fetch(api(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

function countBy(arr, key) {
  return arr.reduce((acc, x) => {
    acc[x[key]] = (acc[x[key]] || 0) + 1;
    return acc;
  }, {});
}

function asBars(obj) {
  const total = Object.values(obj).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(obj).map(([label, count]) => ({ label, count, width: `${Math.round((count / total) * 100)}%` }));
}

function Metric({ title, rows }) {
  return (
    <div className="metric">
      <b>{title}</b>
      {rows.map(r => (
        <div className="bar-row" key={r.label}>
          <span>{r.label} · {r.count}</span>
          <div><i style={{ width: r.width }} /></div>
        </div>
      ))}
    </div>
  );
}

function SignInPanel() {
  function startGoogleSignIn() {
    const returnTo = `${window.location.origin}${window.location.pathname}`;
    window.location.href = api(`/auth/google/start?return_to=${encodeURIComponent(returnTo)}`);
  }

  return (
    <div className="signin-card">
      <p className="eyebrow">Google sign-in required</p>
      <h3>Sign in with Gmail before registering.</h3>
      <p>Your registration and matching status are tied to your Google email account.</p>
      <button className="button primary google-button" onClick={startGoogleSignIn}>
        Continue with Google
      </button>
    </div>
  );
}

function PendingScreen({ user, registration, checking, onCheck, onSignOut }) {
  return (
    <section className="section pending-panel" id="status">
      <div className="pending-card">
        <p className="eyebrow">Registration received</p>
        <h2>Your table request is in the queue.</h2>
        <p>
          Matching can take a few days while we gather the right 5–6 people for your area, budget,
          dietary needs, and conversation style. You do not need to wait on this website.
        </p>
        <div className="status-grid two">
          <div>
            <span>Status</span>
            <strong>{registration?.status === 'matched' ? 'Table ready' : 'Matching in progress'}</strong>
          </div>
          <div>
            <span>Signed in as</span>
            <strong>{user?.email}</strong>
          </div>
        </div>
        <div className="preference-summary">
          <span>{registration?.profile?.area || 'Area'} area</span>
          <span>{registration?.profile?.budget || 'Budget selected'}</span>
          <span>{registration?.profile?.night || 'Preferred night'}</span>
        </div>
        <p className="pending-note">
          Your registration is stored with your Google email. Sign in with the same account later to see the latest status.
        </p>
        <div className="pending-actions">
          <button className="button primary" onClick={onCheck} disabled={checking}>{checking ? 'Checking…' : 'Check status now'}</button>
          <button className="button secondary" onClick={onSignOut}>Sign out</button>
        </div>
      </div>
    </section>
  );
}

function ConfirmedScreen({ match, onReset }) {
  return (
    <div className="confirmed-screen">
      <div className="confirmed-inner">
        <div className="confirmed-icon">🍽️</div>
        <h2>You're confirmed!</h2>
        <p>See you at <strong>{match.restaurant.name}</strong> in {match.restaurant.area}.</p>
        <p className="confirmed-perk">✨ {match.restaurant.perk}</p>
        <button className="button primary" onClick={onReset}>Back to status</button>
      </div>
    </div>
  );
}

function MatchSection({ match, registrationId, token, onConfirm, onReset, push }) {
  const [confirming, setConfirming] = useState(false);
  const genders = asBars(countBy(match.group, 'gender'));
  const industries = asBars(countBy(match.group, 'industry'));
  const personas = asBars(countBy(match.group, 'persona'));

  async function handleConfirm() {
    setConfirming(true);
    try {
      const data = await requestJson('/match/confirm', {
        token,
        method: 'POST',
        body: JSON.stringify({ registrationId }),
      });
      onConfirm(data.match || match);
    } catch (err) {
      push(err.message);
      setConfirming(false);
    }
  }

  return (
    <section className="section match" id="match">
      <div className="section-head">
        <p className="eyebrow match-eyebrow">✓ Your table is ready</p>
        <h2>Your next table of {match.group.length}.</h2>
        <p>Preview your matched group, restaurant, and fit before confirming your seat.</p>
      </div>
      <div className="match-grid">
        <div className="table-card">
          <h3>{match.restaurant.name}</h3>
          <p>{match.restaurant.cuisine}</p>
          <div className="perk-badge">✨ {match.restaurant.perk}</div>
          <p className="venue">📍 {match.restaurant.area}</p>
          <div className="compat-score"><strong>{match.compatibility}%</strong><span>compatibility score</span></div>
        </div>
        <div className="insights">
          <h3>Who's turning up?</h3>
          <Metric title="Gender mix" rows={genders} />
          <Metric title="Industries" rows={industries} />
          <Metric title="Personas" rows={personas} />
        </div>
        <div className="guest-list">
          {match.group.map(p => (
            <article key={`${p.name}-${p.industry}`} className={p.isUser ? 'you' : ''}>
              <div className="guest-avatar">{p.isUser ? 'You' : p.name[0]}</div>
              <div>
                <h4>{p.name}</h4>
                <p>{p.persona} · {p.industry} · {p.gender}</p>
                <span>{p.vibe} · {p.energy}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="confirm-strip">
        <button className="button primary" onClick={handleConfirm} disabled={confirming}>{confirming ? 'Confirming…' : 'Confirm my spot 🍽️'}</button>
        <button className="button secondary" onClick={onReset}>Back to status</button>
      </div>
    </section>
  );
}

function SignupForm({ user, onSubmit, loading }) {
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(0);

  function update(name, value) { setForm(p => ({ ...p, [name]: value })); }
  function toggleTopic(t) {
    setForm(p => ({ ...p, topics: p.topics.includes(t) ? p.topics.filter(x => x !== t) : [...p.topics, t].slice(-5) }));
  }
  function next(e) { e.preventDefault(); setStep(s => Math.min(s + 1, STEPS.length - 1)); }
  function back() { setStep(s => Math.max(s - 1, 0)); }
  function handleSubmit(e) { e.preventDefault(); onSubmit(form); }

  return (
    <div className="signup-wrap">
      <div className="signed-email">Signed in as <strong>{user.email}</strong></div>
      <div className="step-progress">
        {STEPS.map((label, i) => (
          <div key={label} className={`step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`}>
            <div className="step-bubble">{i < step ? '✓' : i + 1}</div><span>{label}</span>
          </div>
        ))}
        <div className="step-track"><div className="step-fill" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} /></div>
      </div>

      <form className="signup" onSubmit={step < STEPS.length - 1 ? next : handleSubmit}>
        {step === 0 && (
          <div className="form-step">
            <label>Full name<input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your name" required /></label>
            <label>Phone number<input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+65 9123 4567" required /></label>
            <label>Gender<select value={form.gender} onChange={e => update('gender', e.target.value)}>{['Female','Male','Non-binary','Prefer not to say'].map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Age<input type="number" min="18" max="80" value={form.age} onChange={e => update('age', e.target.value)} required /></label>
            <label>Industry<select value={form.industry} onChange={e => update('industry', e.target.value)}>{['Tech','Finance','Product','Design','Marketing','Healthcare','Education','Law','Hospitality','Engineering','Founder','Student'].map(x => <option key={x}>{x}</option>)}</select></label>
          </div>
        )}
        {step === 1 && (
          <div className="form-step">
            <label>Preferred area<select value={form.area} onChange={e => update('area', e.target.value)}>{AREAS.map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Dinner budget per person<select value={form.budget} onChange={e => update('budget', e.target.value)}>{BUDGETS.map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Conversation vibe<select value={form.vibe} onChange={e => update('vibe', e.target.value)}>{['Deep talks','Playful banter','New ideas'].map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Social energy<select value={form.energy} onChange={e => update('energy', e.target.value)}>{['Calm','Balanced','Outgoing'].map(x => <option key={x}>{x}</option>)}</select></label>
            <div className="topic-box"><span>Pick up to 5 topics you enjoy</span>{TOPICS.map(t => <button type="button" key={t} className={form.topics.includes(t) ? 'selected' : ''} onClick={() => toggleTopic(t)}>{t}</button>)}</div>
          </div>
        )}
        {step === 2 && (
          <div className="form-step">
            <label>Dietary needs<select value={form.diet} onChange={e => update('diet', e.target.value)}>{['No restrictions','Vegetarian','Halal-friendly','No pork','No beef','No seafood'].map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Preferred night<select value={form.night} onChange={e => update('night', e.target.value)}>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(x => <option key={x}>{x}</option>)}</select></label>
            <div className="review-box">
              <span>Preference summary</span>
              <strong>{form.area} · {form.budget} · {form.night}</strong>
              <p>{form.vibe}, {form.energy.toLowerCase()} energy, {form.diet.toLowerCase()}.</p>
            </div>
          </div>
        )}
        <div className="form-nav">
          {step > 0 && <button type="button" className="button secondary" onClick={back}>← Back</button>}
          <button type="submit" className="button primary" disabled={loading}>{step < STEPS.length - 1 ? 'Continue →' : loading ? 'Registering…' : 'Register for matching'}</button>
        </div>
      </form>
    </div>
  );
}

function App() {
  const [restaurants, setRestaurants] = useState([]);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(AUTH_KEY));
  const [user, setUser] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [appState, setAppState] = useState('loading');
  const [matchData, setMatchData] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const { messages, push } = useToast();

  const previewMatch = {
    compatibility: 91,
    restaurant: restaurants[0] || { name: 'Neighbourhood Table', area: 'Tanjong Pagar', perk: 'Complimentary welcome drink for each guest' },
    group: [{ name: 'You', isUser: true }, { name: 'Alicia' }, { name: 'Marcus' }, { name: 'Priya' }, { name: 'Daniel' }, { name: 'Mei' }],
  };
  const avatarColors = ['#ff4f8b', '#6c47ff', '#92174d', '#428bff', '#00a878', '#222'];

  const loadStatus = useCallback(async (token = authToken, opts = {}) => {
    if (!token) { setAppState('signedOut'); return null; }
    if (opts.manual) setCheckingStatus(true);
    try {
      const data = await requestJson('/me', { token, method: 'GET' });
      setUser(data.user);
      setRegistration(data.registration || null);
      if (data.registration?.status === 'matched') {
        setMatchData(data.registration.match);
        setAppState('matched');
      } else if (data.registration?.status === 'confirmed') {
        setMatchData(data.registration.match);
        setAppState('confirmed');
      } else if (data.registration) {
        setAppState('pending');
      } else {
        setAppState('form');
      }
      return data;
    } catch (err) {
      localStorage.removeItem(AUTH_KEY);
      setAuthToken(null);
      setUser(null);
      setRegistration(null);
      setAppState('signedOut');
      if (opts.manual) push(err.message);
      return null;
    } finally {
      if (opts.manual) setCheckingStatus(false);
    }
  }, [authToken, push]);

  useEffect(() => {
    fetch(api('/restaurants')).then(r => r.json()).then(d => setRestaurants(d.restaurants || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = hash.get('auth_token');
    const error = hash.get('auth_error');
    if (token) {
      localStorage.setItem(AUTH_KEY, token);
      setAuthToken(token);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      push('You are signed in with Google. You can now register for a table.', 'success');
    } else if (error) {
      push(decodeURIComponent(error));
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [push]);

  useEffect(() => {
    loadStatus(authToken);
  }, [authToken, loadStatus]);

  async function handleFormSubmit(form) {
    setFormLoading(true);
    try {
      const data = await requestJson('/registrations', { token: authToken, method: 'POST', body: JSON.stringify(form) });
      setRegistration(data.registration);
      setAppState(data.registration.status === 'matched' ? 'matched' : 'pending');
      setMatchData(data.registration.match || null);
      push('Registration submitted. It is now tagged to your signed-in email.', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      push(err.message);
    } finally {
      setFormLoading(false);
    }
  }

  function signOut() {
    localStorage.removeItem(AUTH_KEY);
    setAuthToken(null);
    setUser(null);
    setRegistration(null);
    setMatchData(null);
    setAppState('signedOut');
  }

  function handleConfirmed(match) {
    setMatchData(match);
    setRegistration(prev => prev ? { ...prev, status: 'confirmed', match } : prev);
    setAppState('confirmed');
  }

  return (
    <main>
      <Toast messages={messages} />
      <nav className="nav">
        <a className="brand" href="#top"><span>6</span>DinnerSix</a>
        <div className="nav-links"><a href="#how">How it works</a><a href="#signup">Register</a></div>
        <div className="nav-right">
          {user?.email ? <button className="auth-pill" onClick={() => loadStatus(authToken, { manual: true })}><span>Signed in</span><strong>{user.email}</strong></button> : <a className="nav-cta" href="#signup">Sign in</a>}
        </div>
      </nav>

      {appState === 'loading' && <section className="section pending-panel"><div className="pending-card"><h2>Loading DinnerSix…</h2></div></section>}
      {appState === 'pending' && <PendingScreen user={user} registration={registration} checking={checkingStatus} onCheck={() => loadStatus(authToken, { manual: true })} onSignOut={signOut} />}
      {appState === 'confirmed' && matchData && <ConfirmedScreen match={matchData} onReset={() => setAppState('pending')} />}

      {(appState === 'signedOut' || appState === 'form' || appState === 'matched') && (
        <>
          <section className="hero" id="top">
            <div className="hero-copy">
              <p className="eyebrow">Dinner matching · Singapore</p>
              <h1>Meet five interesting strangers over dinner.</h1>
              <p className="lead">DinnerSix matches compatible people into tables of 5–6 for dinner, drinks, and real conversation. Sign in with Google, share your preferences, then check back when your table is ready.</p>
              <div className="hero-actions"><a className="button primary" href="#signup">Continue with Google</a><a className="button secondary" href="#how">See how it works</a></div>
              <div className="trust"><span>Google sign-in required</span><span>Area + budget preferences</span><span>5–6 person tables</span><span>No need to wait online</span></div>
            </div>
            <div className="phone-card">
              <div className="phone-top"><span>Sample table</span><strong>{previewMatch.compatibility}% fit</strong></div>
              <div className="avatar-ring">{previewMatch.group.map((p, i) => <div key={`${p.name}-${i}`} className={`avatar a${i}`} style={{ background: avatarColors[i] }}>{p.isUser ? 'You' : p.name[0]}</div>)}</div>
              <div className="reservation"><b>{previewMatch.restaurant.name}</b><span>{previewMatch.restaurant.area} · {previewMatch.restaurant.perk}</span></div>
            </div>
          </section>

          <section className="stats">
            <div><strong>Email</strong><span>Google sign-in before registration</span></div>
            <div><strong>Area</strong><span>east, west, central and more</span></div>
            <div><strong>Budget</strong><span>matched to your range</span></div>
            <div><strong>5–6</strong><span>people per table</span></div>
          </section>

          <section className="section" id="how">
            <div className="section-head"><p className="eyebrow">How it works</p><h2>Sign in, register preferences, then return when matched.</h2></div>
            <div className="steps">
              <article><span>01</span><h3>Sign in with Google</h3><p>Use your Google account first so your registration and status are tied to your email.</p></article>
              <article><span>02</span><h3>Share your dinner fit</h3><p>Tell us your area, budget, dietary needs, social energy, and conversation topics.</p></article>
              <article><span>03</span><h3>Confirm when ready</h3><p>Matching can take a few days. Sign in with the same Google account later to see and confirm your table.</p></article>
            </div>
          </section>

          <section className="section split" id="signup">
            <div>
              <p className="eyebrow">Registration</p>
              <h2>{user ? 'Register your dinner preferences.' : 'Continue with Google.'}</h2>
              <p>{user ? 'Your registration is stored with your signed-in email so you can return later from any device.' : 'Use Google sign-in before the registration form is shown.'}</p>
            </div>
            {user ? <SignupForm user={user} onSubmit={handleFormSubmit} loading={formLoading} /> : <SignInPanel />}
          </section>

          {appState === 'matched' && matchData && <MatchSection match={matchData} registrationId={registration?.id} token={authToken} onConfirm={handleConfirmed} onReset={() => setAppState('pending')} push={push} />}

          <section className="section restaurant">
            <div><p className="eyebrow">For restaurants</p><h2>Fill quieter nights with curated tables.</h2><p>Partner restaurants get predictable group bookings and guests who arrive primed for a shared dining experience — with only the booking details needed to host well.</p></div>
            <div className="restaurant-cards">
              <article><strong>Curated</strong><span>personality-matched groups</span></article>
              <article><strong>6 seats</strong><span>average per matched booking</span></article>
              <article><strong>Privacy-first</strong><span>only practical booking details</span></article>
            </div>
          </section>

          <footer><a className="brand" href="#top"><span>6</span>DinnerSix</a><p>Free social dining matches. Real-world connection.</p><a href="#signup">Register</a></footer>
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
