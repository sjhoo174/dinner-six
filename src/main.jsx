import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = import.meta.env.VITE_API_BASE || '';
const SESSION_KEY = 'dinnerSixSession';

// ─── Utility helpers ────────────────────────────────────────────────────────
function countBy(arr, key) {
  return arr.reduce((acc, x) => { acc[x[key]] = (acc[x[key]] || 0) + 1; return acc; }, {});
}
function asBars(obj) {
  const total = Object.values(obj).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(obj).map(([label, count]) => ({ label, count, width: `${Math.round(count / total * 100)}%` }));
}

function api(path) {
  return `${API}${path}`;
}

function formatWait(ms = 0) {
  if (ms < 3_600_000) return 'soon';
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.ceil((ms % 86_400_000) / 3_600_000);
  if (days >= 1) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  return `${hours}h`;
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

// ─── Toast ──────────────────────────────────────────────────────────────────
function Toast({ messages }) {
  return (
    <div className="toast-stack">
      {messages.map(m => (
        <div key={m.id} className={`toast toast-${m.type}`}>{m.text}</div>
      ))}
    </div>
  );
}
function useToast() {
  const [messages, setMessages] = useState([]);
  const push = useCallback((text, type = 'error') => {
    const id = Date.now();
    setMessages(p => [...p, { id, text, type }]);
    setTimeout(() => setMessages(p => p.filter(m => m.id !== id)), 4000);
  }, []);
  return { messages, push };
}

// ─── Metric bar component ───────────────────────────────────────────────────
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

// ─── Pending status screen ──────────────────────────────────────────────────
function PendingScreen({ session, status, checking, onCheck, onReset }) {
  const remaining = status?.estimatedRemainingMs ?? session?.estimatedWaitMs ?? 0;
  const readyAt = status?.readyAt || session?.readyAt;

  return (
    <section className="section pending-panel" id="status">
      <div className="pending-card">
        <p className="eyebrow">Registration saved</p>
        <h2>Your table request is in the queue.</h2>
        <p>
          Matching can take a few days while we gather the right 5–6 people for your night, area, dietary needs,
          and conversation style. You do not need to wait on this page.
        </p>

        <div className="status-grid">
          <div>
            <span>Status</span>
            <strong>{status?.status === 'matched' ? 'Table ready' : 'Matching in progress'}</strong>
          </div>
          <div>
            <span>Signed in as</span>
            <strong>{session?.email || 'Guest'}</strong>
          </div>
          <div>
            <span>Typical time left</span>
            <strong>{status?.status === 'matched' ? 'Ready now' : formatWait(remaining)}</strong>
          </div>
        </div>

        {readyAt && status?.status !== 'matched' && (
          <p className="pending-note">
            Estimated readiness: {new Date(readyAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.
            We will use the contact details you submitted for follow-up, and you can also return here from this device to check.
          </p>
        )}

        <div className="pending-actions">
          <button className="button primary" onClick={onCheck} disabled={checking}>
            {checking ? 'Checking…' : 'Check status now'}
          </button>
          <button className="button secondary" onClick={onReset}>Sign out / start over</button>
        </div>
      </div>
    </section>
  );
}

// ─── Match confirmed screen ──────────────────────────────────────────────────
function ConfirmedScreen({ match, onReset }) {
  return (
    <div className="confirmed-screen">
      <div className="confetti-burst" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => <span key={i} />)}
      </div>
      <div className="confirmed-inner">
        <div className="confirmed-icon">🍽️</div>
        <h2>You're confirmed!</h2>
        <p>See you at <strong>{match.restaurant.name}</strong> in {match.restaurant.area}.</p>
        <p className="confirmed-perk">✨ {match.restaurant.perk}</p>
        <button className="button primary" onClick={onReset}>Register a new table</button>
      </div>
    </div>
  );
}

// ─── Match preview section ───────────────────────────────────────────────────
function MatchSection({ match, registrationId, onConfirm, onReset }) {
  const [confirming, setConfirming] = useState(false);
  const { messages, push } = useToast();

  async function handleConfirm() {
    setConfirming(true);
    try {
      const res = await fetch(api('/api/match/confirm'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm');
      onConfirm();
    } catch (err) {
      push(err.message);
      setConfirming(false);
    }
  }

  const genders    = asBars(countBy(match.group, 'gender'));
  const industries = asBars(countBy(match.group, 'industry'));
  const personas   = asBars(countBy(match.group, 'persona'));

  return (
    <section className="section match" id="match">
      <Toast messages={messages} />
      <div className="match-celebrate">
        <div className="confetti-burst mini" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => <span key={i} />)}
        </div>
      </div>

      <div className="section-head">
        <p className="eyebrow match-eyebrow">✓ Your table is ready</p>
        <h2>Your next table of {match.group.length}.</h2>
        <p>Here is a preview of your matched group — their personas, industries, and vibes. Confirm your spot to lock in the booking.</p>
      </div>

      <div className="match-grid">
        {/* Restaurant card */}
        <div className="table-card">
          <h3>{match.restaurant.name}</h3>
          <p>{match.restaurant.cuisine}</p>
          <div className="perk-badge">✨ {match.restaurant.perk}</div>
          <p className="venue">📍 {match.restaurant.area} · matched for your area</p>
          <div className="compat-score">
            <strong>{match.compatibility}%</strong>
            <span>compatibility score</span>
          </div>
        </div>

        {/* Group insights */}
        <div className="insights">
          <h3>Who's turning up?</h3>
          <Metric title="Gender mix"  rows={genders}    />
          <Metric title="Industries"  rows={industries} />
          <Metric title="Personas"    rows={personas}   />
        </div>

        {/* Guest list */}
        <div className="guest-list">
          {match.group.map(p => (
            <article key={p.name} className={p.isUser ? 'you' : ''}>
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

      {/* Confirm CTA */}
      <div className="confirm-strip">
        <button
          id="confirm-btn"
          className="button primary"
          onClick={handleConfirm}
          disabled={confirming}
        >
          {confirming ? 'Confirming…' : 'Confirm my spot 🍽️'}
        </button>
        <button className="button secondary" onClick={onReset}>Not for me — try again</button>
      </div>
    </section>
  );
}

// ─── Multi-step signup form ──────────────────────────────────────────────────
const STEPS = ['About you', 'Your preferences', 'Dinner details'];
const TOPICS = ['Food', 'Travel', 'Startups', 'Books', 'Fitness', 'Music', 'AI', 'Culture', 'Comedy', 'Social impact', 'Gaming', 'Architecture'];

const initialForm = {
  name: '', email: '', phone: '',
  gender: 'Female', age: '28',
  industry: 'Tech', area: 'Central',
  vibe: 'Deep talks', energy: 'Balanced',
  diet: 'No restrictions', budget: '$35-$50',
  topics: ['Food', 'Travel', 'Startups'],
  night: 'Thursday',
};

function SignupForm({ onSubmit, loading }) {
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(0);

  function update(name, value) { setForm(p => ({ ...p, [name]: value })); }
  function toggleTopic(t) {
    setForm(p => ({
      ...p,
      topics: p.topics.includes(t) ? p.topics.filter(x => x !== t) : [...p.topics, t].slice(-5),
    }));
  }

  function next(e) { e.preventDefault(); setStep(s => s + 1); }
  function back()  { setStep(s => s - 1); }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <div className="signup-wrap">
      {/* Step progress */}
      <div className="step-progress">
        {STEPS.map((label, i) => (
          <div key={i} className={`step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`}>
            <div className="step-bubble">{i < step ? '✓' : i + 1}</div>
            <span>{label}</span>
          </div>
        ))}
        <div className="step-track"><div className="step-fill" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} /></div>
      </div>

      <form className="signup" onSubmit={step < STEPS.length - 1 ? next : handleSubmit}>
        {/* Step 0 — About you */}
        {step === 0 && (
          <div className="form-step">
            <label>Full name
              <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your name" required />
            </label>
            <label>Email address
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@example.com" required />
            </label>
            <label>Phone (optional)
              <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+65 9123 4567" />
            </label>
            <label>Gender
              <select value={form.gender} onChange={e => update('gender', e.target.value)}>
                <option>Female</option>
                <option>Male</option>
                <option>Non-binary</option>
                <option>Prefer not to say</option>
              </select>
            </label>
            <label>Age
              <input type="number" min="18" max="80" value={form.age} onChange={e => update('age', e.target.value)} required />
            </label>
            <label>Industry
              <select value={form.industry} onChange={e => update('industry', e.target.value)}>
                {['Tech','Finance','Product','Design','Marketing','Healthcare','Education','Law','Hospitality','Engineering','Founder','Student'].map(x => <option key={x}>{x}</option>)}
              </select>
            </label>
          </div>
        )}

        {/* Step 1 — Preferences */}
        {step === 1 && (
          <div className="form-step">
            <label>Conversation vibe
              <select value={form.vibe} onChange={e => update('vibe', e.target.value)}>
                <option>Deep talks</option>
                <option>Playful banter</option>
                <option>New ideas</option>
              </select>
            </label>
            <label>Social energy
              <select value={form.energy} onChange={e => update('energy', e.target.value)}>
                <option>Calm</option>
                <option>Balanced</option>
                <option>Outgoing</option>
              </select>
            </label>
            <div className="topic-box">
              <span>Pick up to 5 topics you enjoy</span>
              {TOPICS.map(t => (
                <button
                  type="button"
                  key={t}
                  className={form.topics.includes(t) ? 'selected' : ''}
                  onClick={() => toggleTopic(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Dinner details */}
        {step === 2 && (
          <div className="form-step">
            <label>Preferred area
              <select value={form.area} onChange={e => update('area', e.target.value)}>
                {['Central','East','West','North','North-East','CBD'].map(x => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label>Dietary needs
              <select value={form.diet} onChange={e => update('diet', e.target.value)}>
                {['No restrictions','Vegetarian','Halal-friendly','No pork','No beef','No seafood'].map(x => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label>Dinner budget per person
              <select value={form.budget} onChange={e => update('budget', e.target.value)}>
                <option>$25-$35</option>
                <option>$35-$50</option>
                <option>$50-$70</option>
              </select>
            </label>
            <label>Preferred night
              <select value={form.night} onChange={e => update('night', e.target.value)}>
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(x => <option key={x}>{x}</option>)}
              </select>
            </label>
          </div>
        )}

        {/* Navigation */}
        <div className="form-nav">
          {step > 0 && (
            <button type="button" className="button secondary" onClick={back}>← Back</button>
          )}
          <button
            type="submit"
            id={step === STEPS.length - 1 ? 'find-table-btn' : `step-${step}-next-btn`}
            className="button primary"
            disabled={loading}
          >
            {step < STEPS.length - 1
              ? 'Continue →'
              : loading ? 'Submitting…' : 'Find my table'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
function App() {
  const [darkMode, setDarkMode]             = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [restaurants, setRestaurants]       = useState([]);
  const [appState, setAppState]             = useState('form');   // form | pending | matched | confirmed
  const [session, setSession]               = useState(() => loadSession());
  const [registrationId, setRegistrationId] = useState(() => loadSession()?.registrationId || null);
  const [statusData, setStatusData]         = useState(null);
  const [matchData, setMatchData]           = useState(null);
  const [formLoading, setFormLoading]       = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const pollRef                             = useRef(null);
  const { messages, push }                  = useToast();

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Restore a saved registration so returning users can see whether they are signed in.
  useEffect(() => {
    const saved = loadSession();
    if (!saved?.registrationId) return;
    setSession(saved);
    setRegistrationId(saved.registrationId);
    setAppState('pending');
  }, []);

  // Fetch restaurants on mount
  useEffect(() => {
    fetch(api('/api/restaurants'))
      .then(r => r.json())
      .then(d => setRestaurants(d.restaurants || []))
      .catch(() => {}); // graceful fallback — restaurants shown post-match
  }, []);

  // Live preview match (without waiting) for hero phone card
  const [previewMatch, setPreviewMatch] = useState(null);
  useEffect(() => {
    setPreviewMatch({
      compatibility: 91,
      restaurant: restaurants[0] || { name: 'Neighbourhood Table', area: 'Tanjong Pagar', perk: 'Welcome drink included' },
      group: [
        { name: 'You',    isUser: true },
        { name: 'Alicia' }, { name: 'Marcus' },
        { name: 'Priya'  }, { name: 'Daniel' }, { name: 'Mei' },
      ],
    });
  }, [restaurants]);

  const checkStatus = useCallback(async (id = registrationId, opts = {}) => {
    if (!id) return null;
    if (opts.manual) setCheckingStatus(true);
    try {
      const res = await fetch(api(`/api/status/${id}`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not check status');
      setStatusData(data);

      if (data.status === 'matched') {
        clearInterval(pollRef.current);
        const alreadyConfirmed = session?.status === 'confirmed' && appState === 'confirmed';
        setMatchData(data.match);
        setAppState(alreadyConfirmed || data.confirmed ? 'confirmed' : 'matched');
        setSession(prev => {
          const alreadyConfirmed = prev?.status === 'confirmed' && appState === 'confirmed';
          const next = { ...(prev || {}), registrationId: id, status: alreadyConfirmed || data.confirmed ? 'confirmed' : 'matched' };
          saveSession(next);
          return next;
        });
        if (!opts.silent) document.getElementById('match')?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setAppState('pending');
        setSession(prev => {
          if (!prev) return prev;
          const next = { ...prev, status: 'pending', readyAt: data.readyAt, estimatedWaitMs: data.estimatedRemainingMs };
          saveSession(next);
          return next;
        });
      }
      return data;
    } catch (err) {
      if (opts.manual) push(err.message || 'Could not check your status.');
      return null;
    } finally {
      if (opts.manual) setCheckingStatus(false);
    }
  }, [registrationId, push, session?.status, appState]);

  // Poll lightly for returning users. Matching is expected to take days, so this
  // is a status refresh, not a blocking wait screen.
  useEffect(() => {
    if (appState !== 'pending' || !registrationId) return;
    checkStatus(registrationId, { silent: true });
    pollRef.current = setInterval(() => {
      checkStatus(registrationId, { silent: true });
    }, 60_000);
    return () => clearInterval(pollRef.current);
  }, [appState, registrationId, checkStatus]);

  async function handleFormSubmit(form) {
    setFormLoading(true);
    try {
      const res  = await fetch(api('/api/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      const nextSession = {
        registrationId: data.registrationId,
        name: form.name,
        email: form.email,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        readyAt: data.readyAt,
        estimatedWaitMs: data.estimatedWaitMs,
      };
      saveSession(nextSession);
      setSession(nextSession);
      setRegistrationId(data.registrationId);
      setStatusData({ status: 'pending', readyAt: data.readyAt, estimatedRemainingMs: data.estimatedWaitMs });
      setAppState('pending');
      push('Registration saved. You can close this page and check back later.', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      push(err.message || 'Could not reach the server. Please try again.');
    } finally {
      setFormLoading(false);
    }
  }

  function handleConfirmed() {
    setAppState('confirmed');
    setSession(prev => {
      if (!prev) return prev;
      const next = { ...prev, status: 'confirmed' };
      saveSession(next);
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleReset() {
    clearInterval(pollRef.current);
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setRegistrationId(null);
    setStatusData(null);
    setMatchData(null);
    setAppState('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const avatarColors = ['#ff4f8b', '#6c47ff', '#92174d', '#428bff', '#00a878', '#222'];

  return (
    <main className={darkMode ? 'dark' : ''}>
      <Toast messages={messages} />

      {/* ── Nav ── */}
      <nav className="nav">
        <a className="brand" href="#top" id="nav-logo">
          <span>6</span>DinnerSix
        </a>
        <div className="nav-links">
          <a href="#how"    id="nav-how">How it works</a>
          <a href="#signup" id="nav-signup">Sign up</a>
        </div>
        <div className="nav-right">
          {session?.email && (
            <button
              className={`auth-pill ${appState === 'matched' || appState === 'confirmed' ? 'ready' : 'pending'}`}
              onClick={() => checkStatus(registrationId, { manual: true })}
              title="Click to refresh your DinnerSix status"
            >
              <span>{appState === 'matched' || appState === 'confirmed' ? 'Ready' : 'Signed in'}</span>
              <strong>{session.email}</strong>
            </button>
          )}
          <button
            id="dark-mode-toggle"
            className="theme-toggle"
            onClick={() => setDarkMode(d => !d)}
            aria-label="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <a className="nav-cta" href="#signup" id="nav-cta-btn">Join free</a>
        </div>
      </nav>

      {/* ── Persistent pending status (not a blocking waiting screen) ── */}
      {appState === 'pending' && (
        <PendingScreen
          session={session}
          status={statusData}
          checking={checkingStatus}
          onCheck={() => checkStatus(registrationId, { manual: true })}
          onReset={handleReset}
        />
      )}

      {/* ── Confirmed overlay ── */}
      {appState === 'confirmed' && matchData && (
        <ConfirmedScreen match={matchData} onReset={handleReset} />
      )}

      {/* ── Normal page (hidden behind waiting/confirmed if active) ── */}
      {appState === 'form' || appState === 'matched' ? (
        <>
          {/* Hero */}
          <section className="hero" id="top">
            <div className="hero-copy">
              <p className="eyebrow">Free dinner matching · Singapore</p>
              <h1>Meet five interesting strangers over dinner.</h1>
              <p className="lead">DinnerSix matches compatible people into tables of 5–6 for dinner, drinks, and real conversation — completely free to join.</p>
              <div className="hero-actions">
                <a className="button primary" href="#signup" id="hero-cta-btn">Get matched free</a>
                <a className="button secondary" href="#how" id="hero-how-btn">See how it works</a>
              </div>
              <div className="trust">
                <span>No fee to join</span>
                <span>5–6 person tables</span>
                <span>Matched by personality</span>
                <span>Real conversation</span>
              </div>
            </div>

            {/* Hero phone card */}
            {previewMatch && (
              <div className="phone-card">
                <div className="phone-top">
                  <span>Tonight's table</span>
                  <strong>{previewMatch.compatibility}% fit</strong>
                </div>
                <div className="avatar-ring">
                  {previewMatch.group.slice(0, 6).map((p, i) => (
                    <div key={p.name} className={`avatar a${i}`} style={{ background: avatarColors[i] }}>
                      {p.isUser ? 'You' : p.name[0]}
                    </div>
                  ))}
                </div>
                <div className="reservation">
                  <b>{previewMatch.restaurant.name}</b>
                  <span>{previewMatch.restaurant.area} · {previewMatch.restaurant.perk}</span>
                </div>
              </div>
            )}
          </section>

          {/* Stats bar */}
          <section className="stats">
            <div><strong>FREE</strong><span>for diners to join</span></div>
            <div><strong>5–6</strong><span>people per table</span></div>
            <div><strong>Real people</strong><span>not bots or dates</span></div>
            <div><strong>7 min</strong><span>to register, then check back later</span></div>
          </section>

          {/* How it works */}
          <section className="section" id="how">
            <div className="section-head">
              <p className="eyebrow">How it works</p>
              <h2>From sign-up to a confirmed seat, without waiting on-site.</h2>
            </div>
            <div className="steps">
              <article>
                <span>01</span>
                <h3>Answer a few questions</h3>
                <p>Tell us your industry, dinner budget, dietary needs, social energy, and conversation preferences. Takes about 7 minutes.</p>
              </article>
              <article>
                <span>02</span>
                <h3>We build your table</h3>
                <p>Our algorithm groups 5–6 people using compatibility, diversity, dietary fit, location, and balanced personas. This can take a few days, so we save your registration and contact you when it is ready.</p>
              </article>
              <article>
                <span>03</span>
                <h3>Return, confirm, and enjoy</h3>
                <p>When your table is ready, come back to confirm your spot, then meet the group at a partner restaurant.</p>
              </article>
            </div>
          </section>

          {/* Sign-up section */}
          <section className="section split" id="signup">
            <div>
              <p className="eyebrow">Questionnaire</p>
              <h2>Sign up once. We will handle the matching over the next few days.</h2>
              <p>Share your preferences and contact details. Your signed-in status is saved on this device, so you can close the site and check back later.</p>
            </div>
            <SignupForm onSubmit={handleFormSubmit} loading={formLoading} />
          </section>

          {/* Match preview (shown after matching) */}
          {appState === 'matched' && matchData && (
            <MatchSection
              match={matchData}
              registrationId={registrationId}
              onConfirm={handleConfirmed}
              onReset={handleReset}
            />
          )}

          {/* Restaurant partner section */}
          <section className="section restaurant">
            <div>
              <p className="eyebrow">For restaurants</p>
              <h2>Fill quieter nights with curated tables.</h2>
              <p>Partner restaurants get predictable group bookings, new diners who arrive primed to order together, and opt-in CRM data for repeat nights.</p>
            </div>
            <div className="restaurant-cards">
              <article>
                <strong>Curated</strong>
                <span>audience — personality-matched groups</span>
              </article>
              <article>
                <strong>6 seats</strong>
                <span>average per matched booking</span>
              </article>
              <article>
                <strong>CRM</strong>
                <span>guest opt-ins and repeat nights</span>
              </article>
            </div>
          </section>

          {/* Footer */}
          <footer>
            <a className="brand" href="#top">
              <span>6</span>DinnerSix
            </a>
            <p>Free social dining matches. Real-world connection.</p>
            <a href="#signup" id="footer-cta">Join free</a>
          </footer>
        </>
      ) : null}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
