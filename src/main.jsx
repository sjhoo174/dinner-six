import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = import.meta.env.VITE_API_BASE || 'https://dinner-six-backend.shijanhoo.workers.dev';
const AUTH_KEY = 'dinnerSixAuthToken';
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

const TOPICS = [
  'Food', 'Travel', 'Startups', 'Books', 'Fitness', 'Music', 'AI', 'Culture', 'Comedy', 'Social impact',
  'Gaming', 'Architecture', 'Movies & TV', 'Fashion', 'Photography', 'Wellness', 'Investing', 'Sports',
  'Cooking', 'Wine & spirits', 'Podcasts', 'Science', 'Nature & outdoors', 'Cars', 'Pets', 'Spirituality',
];
const AREAS = ['Central', 'East', 'West', 'North', 'North-East', 'CBD'];
const BUDGETS = ['$25-$35', '$35-$50', '$50-$70', '$70+'];
const ALCOHOLS = ['Non-drinker', 'Social drinker', 'Drinks freely'];
const LANGUAGES = ['English', 'Mandarin', 'Malay', 'Tamil', 'Other'];
const SMOKING = ['Non-smoker', 'Smoker', 'No preference'];
const STEPS = ['About you', 'Preferences', 'Dinner fit'];
const ATTENDANCE_OPTIONS = [
  { value: 'on_time', label: '✅ On time' },
  { value: 'late', label: '⏰ Running late' },
  { value: 'not_showing', label: "🚫 Can't make it" },
];
const NETWORKING_GOALS = ['Find co-founders', 'Career mentorship', 'Client / business development', 'Explore new industries', 'Grow professional network'];
const REJECT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

const DINNER_TYPES = {
  social: {
    label: 'Social Dining',
    eyebrow: 'Dinner matching · Singapore',
    headline: 'Meet 4 to 6 interesting strangers over dinner.',
    lead: 'DinnerSix uses a matching algorithm to group compatible people into tables of 4-6 for dinner, drinks, and real conversation. Sign in with Google, share your preferences, then check back when your table is ready.',
    trust: ['Google sign-in required', 'Area + budget preferences', '4-6 person tables'],
    valuePropsEyebrow: 'Why social dining',
    valuePropsHeadline: 'Built for genuine connection, not another group chat.',
    valueProps: [
      { icon: '🍜', title: 'Real conversation', body: 'No agenda, no small talk circles — just a table of people matched for genuine chemistry over a shared meal.' },
      { icon: '🎲', title: 'Curated by vibe', body: 'Matched on energy, interests, and conversation style, not just your neighbourhood and budget.' },
      { icon: '🤝', title: 'Meet outside your bubble', body: 'Every table mixes industries and backgrounds, so you leave with a new perspective and new friends.' },
    ],
    howHeadline: 'Sign in, register preferences, then return when matched.',
    howSteps: [
      { title: 'Sign in with Google', body: 'Use your Google account first so your registration and status are tied to your email.' },
      { title: 'Share your dinner fit', body: 'Tell us your area, budget, dietary needs, social energy, and conversation topics.' },
      { title: 'Confirm when ready', body: "Our matching algorithm scores compatibility across everyone's preferences and forms your table automatically — no manual curation. Sign in with the same Google account later to see your table, restaurant, and event time." },
    ],
    registerHeadline: 'Register your dinner preferences.',
    registerBody: 'Your social dining registration is stored with your signed-in email so you can return later from any device — separate from any professional networking registration you hold.',
    restaurantEyebrow: 'For restaurants',
    restaurantHeadline: 'Fill quieter nights with curated tables.',
    restaurantBody: 'Partner restaurants get predictable group bookings and guests who arrive primed for a shared dining experience.',
  },
  professional: {
    label: 'Professional Networking',
    eyebrow: 'Networking dinners · Singapore',
    headline: 'Build real industry connections over dinner.',
    lead: 'DinnerSix Professional matches you into curated tables of 4-6 driven professionals for purposeful networking — no name tags, no small-talk circles, just dinner with people worth knowing.',
    trust: ['Google sign-in required', 'Industry-aware matching', '4-6 person tables'],
    valuePropsEyebrow: 'Why professional networking',
    valuePropsHeadline: 'Built for outcomes, not business cards.',
    valueProps: [
      { icon: '💼', title: 'Purposeful networking', body: 'Every guest opts in with a specific goal — co-founders, mentorship, or new clients — so conversations start with intent.' },
      { icon: '🧭', title: 'Matched by industry fit', body: 'Tables are built around complementary industries and seniority, not a random mixer name tag.' },
      { icon: '🕰️', title: 'Your time, respected', body: 'One dinner, a fixed group, a clear end time — no endless card-swapping or awkward standing mingling.' },
    ],
    howHeadline: 'Sign in, register your networking goals, then return when matched.',
    howSteps: [
      { title: 'Sign in with Google', body: 'Your professional registration and status are tied to your Google account, kept separate from any social dining registration.' },
      { title: 'Share your networking fit', body: 'Tell us your industry, networking goal, area, and budget so we can seat you with the right people.' },
      { title: 'Confirm when ready', body: 'Our matching algorithm forms your table automatically around complementary goals and industries — no manual curation. Sign in with the same Google account later to see your table, restaurant, and event time.' },
    ],
    registerHeadline: 'Register your networking preferences.',
    registerBody: 'Your professional registration is stored separately from any social dining registration, tied to your signed-in email so you can return later from any device.',
    restaurantEyebrow: 'For venues',
    restaurantHeadline: 'Host business dinners that book themselves.',
    restaurantBody: 'Partner venues get consistent weekday bookings from professionals who show up ready for focused, unhurried conversation — not just another happy hour crowd.',
  },
};

const initialForm = {
  name: '', phone: '', gender: 'Female', age: '28', industry: 'Tech',
  vibe: 'Deep talks', energy: 'Balanced', topics: ['Food', 'Travel', 'Startups'],
  area: 'Central', budget: '$35-$50', diet: 'No restrictions', night: 'Thursday',
  alcohol: 'Social drinker', language: 'English', smoking: 'Non-smoker',
  dinnerType: 'social', networkingGoal: NETWORKING_GOALS[0],
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

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function formatEventDateTime(iso) {
  if (!iso) return '';
  const formatted = new Date(iso).toLocaleString('en-SG', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Singapore',
  });
  return `${formatted} SGT`;
}

function EventCountdown({ eventAt, eventEndsAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!eventAt) return null;
  const start = new Date(eventAt).getTime();
  const end = eventEndsAt ? new Date(eventEndsAt).getTime() : null;
  const dateLabel = formatEventDateTime(eventAt);
  if (now < start) {
    return (
      <div className="event-countdown">
        <span>Your table is on {dateLabel}</span>
        <strong>{formatCountdown(start - now)}</strong>
      </div>
    );
  }
  if (end && now < end) {
    return (
      <div className="event-countdown live">
        <span>Your table is happening now · {dateLabel}</span>
      </div>
    );
  }
  return null;
}

function AttendanceSelector({ match, token, push, onUnmatched }) {
  const me = match.group.find(p => p.isUser);
  const [status, setStatus] = useState(me?.attendanceStatus || 'unknown');
  const [saving, setSaving] = useState(false);
  const past = Boolean(match.eventAt) && Date.now() >= new Date(match.eventAt).getTime();

  async function setAttendance(value) {
    setSaving(true);
    try {
      const data = await requestJson('/attendance', { token, method: 'POST', body: JSON.stringify({ groupId: match.groupId, status: value }) });
      setStatus(value);
      if (data.groupUnmatched) {
        push("2 or more people can't make it, so this table has been unmatched. You're back in the pool for a new match.", 'success');
        onUnmatched?.();
      } else {
        push('Attendance updated.', 'success');
      }
    } catch (err) {
      push(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="attendance-selector">
      <span>Will you be there?</span>
      <div className="attendance-buttons">
        {ATTENDANCE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            className={status === opt.value ? 'active' : ''}
            disabled={saving || past}
            onClick={() => setAttendance(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {past && <p className="pending-note">Attendance can no longer be changed once the event has started.</p>}
    </div>
  );
}

function RatingPanel({ match, token, push }) {
  const [drafts, setDrafts] = useState({});
  const [submitted, setSubmitted] = useState({});
  const [loaded, setLoaded] = useState(false);
  const tablemates = match.group.filter(p => !p.isUser);
  const eligible = Boolean(match.ratingWindowOpensAt) && Date.now() >= new Date(match.ratingWindowOpensAt).getTime();

  useEffect(() => {
    if (!eligible) return;
    requestJson(`/ratings/mine?groupId=${encodeURIComponent(match.groupId)}`, { token })
      .then(data => {
        const map = {};
        (data.ratings || []).forEach(r => { map[r.rateeRegistrationId] = r; });
        setSubmitted(map);
      })
      .finally(() => setLoaded(true));
  }, [eligible, match.groupId, token]);

  if (!eligible) return null;

  function updateDraft(id, field, value) {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function submitRating(registrationId) {
    const draft = drafts[registrationId] || {};
    if (!draft.rating) return;
    try {
      const data = await requestJson('/ratings', {
        token, method: 'POST',
        body: JSON.stringify({ groupId: match.groupId, rateeRegistrationId: registrationId, rating: Number(draft.rating), comment: draft.comment || '' }),
      });
      setSubmitted(prev => ({ ...prev, [registrationId]: data.rating }));
      push('Rating submitted.', 'success');
    } catch (err) {
      push(err.message);
    }
  }

  return (
    <div className="rating-panel">
      <h3>Rate your table</h3>
      <p>Ratings help us improve future matches. This opens 3 hours after your table ends.</p>
      {!loaded && <p className="pending-note">Loading your ratings…</p>}
      {loaded && tablemates.map(p => (
        <div className="rating-row" key={p.registrationId}>
          <span>{p.name}</span>
          {submitted[p.registrationId] ? (
            <strong>✓ Rated {submitted[p.registrationId].rating}/5</strong>
          ) : (
            <div className="star-input">
              <select value={drafts[p.registrationId]?.rating || ''} onChange={e => updateDraft(p.registrationId, 'rating', e.target.value)}>
                <option value="">Rate 1-5</option>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <input
                type="text"
                placeholder="Optional comment"
                value={drafts[p.registrationId]?.comment || ''}
                onChange={e => updateDraft(p.registrationId, 'comment', e.target.value)}
              />
              <button type="button" className="button secondary" disabled={!drafts[p.registrationId]?.rating} onClick={() => submitRating(p.registrationId)}>Submit</button>
            </div>
          )}
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
          Matching can take a few days while our algorithm gathers the right 4-6 people for your area,
          budget, dietary needs, and conversation style. We'll show your table, restaurant, and event
          time here as soon as it's ready.
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
          <span>{DINNER_TYPES[registration?.profile?.dinnerType || 'social'].label}</span>
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

function RejectedScreen({ retryAt, checking, onCheck, onSignOut }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = retryAt - now;

  return (
    <section className="section pending-panel" id="status">
      <div className="pending-card">
        <p className="eyebrow">Table declined</p>
        <h2>You can register for a new table soon.</h2>
        <p>
          You rejected your last matched table. To keep things fair for restaurants and other guests,
          you can register again 6 hours after rejecting.
        </p>
        {remaining > 0 ? (
          <div className="event-countdown">
            <span>You can register again in</span>
            <strong>{formatCountdown(remaining)}</strong>
          </div>
        ) : (
          <p className="pending-note">You can register again now — check your status to continue.</p>
        )}
        <div className="pending-actions">
          {remaining <= 0 && (
            <button className="button primary" onClick={onCheck} disabled={checking}>{checking ? 'Checking…' : 'Check status now'}</button>
          )}
          <button className="button secondary" onClick={onSignOut}>Sign out</button>
        </div>
      </div>
    </section>
  );
}

function BannedScreen({ onSignOut }) {
  return (
    <section className="section pending-panel">
      <div className="pending-card">
        <p className="eyebrow">Account suspended</p>
        <h2>Your account has been suspended.</h2>
        <p>
          This happens automatically once a diner receives 3 reports from 3 different tablemates within their
          last 3 successfully matched tables. If you think this was a mistake, please contact support.
        </p>
        <div className="pending-actions">
          <button className="button secondary" onClick={onSignOut}>Sign out</button>
        </div>
      </div>
    </section>
  );
}

// Up/down voting and reporting for a diner's tablemates. Voting only opens on
// the diner's LATEST successfully matched group; reporting opens on any
// successfully matched group (one report chance per group).
function VotingPanel({ match, token, user, push }) {
  const [votes, setVotes] = useState({});
  const [reported, setReported] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const tablemates = match.group.filter(p => !p.isUser);
  const canVote = match.groupCompleted && match.isLatestSuccessfulGroup;
  const canReport = match.groupCompleted;
  const credits = user?.downvoteCreditsAvailable ?? 0;

  useEffect(() => {
    if (!match.groupCompleted) return;
    Promise.all([
      canVote ? requestJson(`/votes/mine?groupId=${encodeURIComponent(match.groupId)}`, { token }) : Promise.resolve({ votes: [] }),
      requestJson(`/reports/mine?groupId=${encodeURIComponent(match.groupId)}`, { token }),
    ]).then(([voteData, reportData]) => {
      const map = {};
      (voteData.votes || []).forEach(v => { map[v.voteeRegistrationId] = v.direction; });
      setVotes(map);
      setReported(reportData.report?.reportedRegistrationId || null);
    }).finally(() => setLoaded(true));
  }, [match.groupId, match.groupCompleted, canVote, token]);

  if (!match.groupCompleted) return null;

  async function castVote(registrationId, direction) {
    setBusyKey(`${registrationId}:${direction}`);
    try {
      await requestJson('/votes', { token, method: 'POST', body: JSON.stringify({ groupId: match.groupId, voteeRegistrationId: registrationId, direction }) });
      setVotes(prev => ({ ...prev, [registrationId]: direction }));
      push(direction === 'up' ? 'Upvoted.' : 'Downvoted.', 'success');
    } catch (err) {
      push(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function fileReport(registrationId) {
    if (!window.confirm('Report this tablemate? You only get one report chance per successfully matched table.')) return;
    setBusyKey(`${registrationId}:report`);
    try {
      const data = await requestJson('/reports', { token, method: 'POST', body: JSON.stringify({ groupId: match.groupId, reportedRegistrationId: registrationId }) });
      setReported(registrationId);
      push(data.banned ? 'Report filed. This diner has been banned from the platform.' : 'Report filed.', 'success');
    } catch (err) {
      push(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="voting-panel">
      <h3>Rate your tablemates</h3>
      <p>
        {canVote
          ? `Up or down vote the people from this table. You have ${credits} down-vote credit${credits === 1 ? '' : 's'} available.`
          : 'Voting is only open on your most recently completed table.'}
      </p>
      {!loaded && <p className="pending-note">Loading…</p>}
      {loaded && tablemates.map(p => (
        <div className="voting-row" key={p.registrationId}>
          <span>{p.name}</span>
          <div className="voting-actions">
            {canVote && (
              <>
                <button
                  type="button"
                  className={`vote-button up ${votes[p.registrationId] === 'up' ? 'active' : ''}`}
                  disabled={Boolean(votes[p.registrationId]) || busyKey === `${p.registrationId}:up`}
                  onClick={() => castVote(p.registrationId, 'up')}
                >👍</button>
                <button
                  type="button"
                  className={`vote-button down ${votes[p.registrationId] === 'down' ? 'active' : ''}`}
                  disabled={Boolean(votes[p.registrationId]) || busyKey === `${p.registrationId}:down` || credits <= 0}
                  title={credits > 0 ? 'Down vote' : 'No down-vote credits available'}
                  onClick={() => castVote(p.registrationId, 'down')}
                >👎</button>
              </>
            )}
            {canReport && (
              reported === p.registrationId ? (
                <span className="report-filed">🚩 Reported</span>
              ) : (
                <button
                  type="button"
                  className="report-button"
                  disabled={Boolean(reported) || busyKey === `${p.registrationId}:report`}
                  onClick={() => fileReport(p.registrationId)}
                >🚩 Report</button>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function GuestList({ group }) {
  return (
    <div className="guest-list">
      {group.map(p => (
        <article key={`${p.name}-${p.industry}`} className={p.isUser ? 'you' : ''}>
          <div className="guest-avatar">{p.isUser ? 'You' : p.name[0]}</div>
          <div>
            <h4>{p.name}</h4>
            <p>{p.persona} · {p.industry} · {p.gender}</p>
            <span>{p.vibe} · {p.energy}</span>
            {p.networkingGoal && <span className="networking-goal">🎯 {p.networkingGoal}</span>}
            {!p.isUser && p.attendanceStatus === 'not_showing' && (
              <span className="confirm-badge not-showing">🚫 Can't make it</span>
            )}
            {!p.isUser && p.attendanceStatus !== 'not_showing' && (
              <span className={`confirm-badge ${p.confirmed ? 'confirmed' : 'pending'}`}>
                {p.confirmed ? '✓ Confirmed' : 'Pending confirmation'}
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function ConfirmedScreen({ match, token, user, push, onSignOut, onUnmatched, canRegisterAgain, onRegisterAgain }) {
  return (
    <div className="confirmed-screen">
      <div className="confirmed-inner">
        <div className="confirmed-icon">🍽️</div>
        <h2>{match.groupCompleted ? 'Your table happened!' : "You're confirmed!"}</h2>
        <p>See you at <strong>{match.restaurant.name}</strong> in {match.restaurant.area}.</p>
        <p className="confirmed-perk">✨ {match.restaurant.perk}</p>
        <EventCountdown eventAt={match.eventAt} eventEndsAt={match.eventEndsAt} />
        {!match.groupCompleted && <AttendanceSelector match={match} token={token} push={push} onUnmatched={onUnmatched} />}
        <div className="confirmed-guests">
          <h3>Who's coming</h3>
          <GuestList group={match.group} />
        </div>
        <RatingPanel match={match} token={token} push={push} />
        <VotingPanel match={match} token={token} user={user} push={push} />
        {canRegisterAgain && (
          <button className="button primary" onClick={onRegisterAgain}>Register for a new table</button>
        )}
        <button className="button secondary" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}

function MatchSection({ match, registrationId, token, onConfirm, onReject, push }) {
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
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

  async function handleReject() {
    setRejecting(true);
    try {
      await onReject();
    } finally {
      setRejecting(false);
    }
  }

  return (
    <section className="section match" id="match">
      <div className="section-head">
        <p className="eyebrow match-eyebrow">✓ Your table is ready · {DINNER_TYPES[match.dinnerType || 'social'].label}</p>
        <h2>Your next table of {match.group.length}.</h2>
        <p>Preview your matched group, restaurant, and fit, then confirm or reject your seat.</p>
      </div>
      <div className="match-grid">
        <div className="table-card">
          <h3>{match.restaurant.name}</h3>
          <p>{match.restaurant.cuisine}</p>
          <div className="perk-badge">✨ {match.restaurant.perk}</div>
          <p className="venue">📍 {match.restaurant.area}</p>
          {match.compatibility != null && (
            <div className="compat-score"><strong>{match.compatibility}%</strong><span>compatibility score</span></div>
          )}
          <EventCountdown eventAt={match.eventAt} eventEndsAt={match.eventEndsAt} />
        </div>
        <div className="insights">
          <h3>Who's turning up?</h3>
          <Metric title="Gender mix" rows={genders} />
          <Metric title="Industries" rows={industries} />
          <Metric title="Personas" rows={personas} />
        </div>
        <GuestList group={match.group} />
      </div>
      <div className="confirm-strip">
        <button className="button primary" onClick={handleConfirm} disabled={confirming || rejecting}>{confirming ? 'Confirming…' : 'Confirm my spot 🍽️'}</button>
        <button className="button secondary" onClick={handleReject} disabled={confirming || rejecting}>{rejecting ? 'Rejecting…' : "Can't make this table"}</button>
      </div>
    </section>
  );
}

function SignupForm({ user, onSubmit, loading, defaultDinnerType }) {
  const [form, setForm] = useState(() => ({ ...initialForm, dinnerType: defaultDinnerType || 'social' }));
  const [step, setStep] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);

  function update(name, value) { setForm(p => ({ ...p, [name]: value })); }
  function toggleTopic(t) {
    setForm(p => ({ ...p, topics: p.topics.includes(t) ? p.topics.filter(x => x !== t) : [...p.topics, t].slice(-5) }));
  }
  function next(e) { e.preventDefault(); setStep(s => Math.min(s + 1, STEPS.length - 1)); }
  function back() { setStep(s => Math.max(s - 1, 0)); }

  function resetTurnstile() {
    setTurnstileToken('');
    if (widgetIdRef.current != null) window.turnstile?.reset(widgetIdRef.current);
  }

  useEffect(() => {
    if (step !== 2 || !turnstileRef.current) return undefined;
    let cancelled = false;
    let widgetId;
    function render() {
      if (cancelled || !window.turnstile || !turnstileRef.current) return;
      widgetId = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: t => setTurnstileToken(t),
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken(''),
      });
      widgetIdRef.current = widgetId;
    }
    let pollId;
    if (window.turnstile) render();
    else pollId = setInterval(() => { if (window.turnstile) { render(); clearInterval(pollId); } }, 200);
    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
      if (widgetId != null) window.turnstile?.remove(widgetId);
    };
  }, [step]);

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await onSubmit({ ...form, turnstileToken });
    if (!ok) resetTurnstile();
  }

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
            <label>Gender<select value={form.gender} onChange={e => update('gender', e.target.value)}>{['Female','Male'].map(x => <option key={x}>{x}</option>)}</select></label>
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
            <label>Alcohol preference<select value={form.alcohol} onChange={e => update('alcohol', e.target.value)}>{ALCOHOLS.map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Preferred language<select value={form.language} onChange={e => update('language', e.target.value)}>{LANGUAGES.map(x => <option key={x}>{x}</option>)}</select></label>
            {form.dinnerType === 'professional' && (
              <label>Networking goal<select value={form.networkingGoal} onChange={e => update('networkingGoal', e.target.value)}>{NETWORKING_GOALS.map(x => <option key={x}>{x}</option>)}</select></label>
            )}
            <div className="topic-box"><span>Pick up to 5 topics you enjoy</span>{TOPICS.map(t => <button type="button" key={t} className={form.topics.includes(t) ? 'selected' : ''} onClick={() => toggleTopic(t)}>{t}</button>)}</div>
          </div>
        )}
        {step === 2 && (
          <div className="form-step">
            <label>Dietary needs<select value={form.diet} onChange={e => update('diet', e.target.value)}>{['No restrictions','Vegetarian','Halal-friendly','No pork','No beef','No seafood'].map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Preferred night<select value={form.night} onChange={e => update('night', e.target.value)}>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Smoking preference<select value={form.smoking} onChange={e => update('smoking', e.target.value)}>{SMOKING.map(x => <option key={x}>{x}</option>)}</select></label>
            <div className="review-box">
              <span>Preference summary</span>
              <strong>{DINNER_TYPES[form.dinnerType].label} · {form.area} · {form.budget} · {form.night}</strong>
              <p>
                {form.vibe}, {form.energy.toLowerCase()} energy, {form.diet.toLowerCase()}, {form.alcohol.toLowerCase()}, {form.language}
                {form.dinnerType === 'professional' ? `, networking goal: ${form.networkingGoal.toLowerCase()}` : ''}.
              </p>
            </div>
            <div className="turnstile-box">
              <span>Quick human check</span>
              <div ref={turnstileRef} />
            </div>
          </div>
        )}
        <div className="form-nav">
          {step > 0 && <button type="button" className="button secondary" onClick={back}>← Back</button>}
          <button
            type="submit"
            className="button primary"
            disabled={loading || (step === STEPS.length - 1 && !turnstileToken)}
          >
            {step < STEPS.length - 1 ? 'Continue →' : loading ? 'Registering…' : 'Register for matching'}
          </button>
        </div>
      </form>
    </div>
  );
}

function deriveTrackState(reg) {
  if (!reg) return { appState: 'form', matchData: null };
  if (reg.status === 'matched') return { appState: 'matched', matchData: reg.match };
  if (reg.status === 'confirmed') return { appState: 'confirmed', matchData: reg.match };
  // 'completed' means the group survived past its event start time — the
  // registration itself is done (free to register again), but the same
  // screen keeps showing so ratings/voting/reporting stay available.
  if (reg.status === 'completed') return { appState: 'confirmed', matchData: reg.match };
  if (reg.status === 'rejected') {
    const retryAt = reg.rejectedAt ? new Date(reg.rejectedAt).getTime() + REJECT_COOLDOWN_MS : 0;
    return Date.now() < retryAt ? { appState: 'rejected', matchData: null } : { appState: 'form', matchData: null };
  }
  return { appState: 'pending', matchData: null };
}

function App() {
  const [restaurants, setRestaurants] = useState([]);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(AUTH_KEY));
  const [user, setUser] = useState(null);
  const [registrations, setRegistrations] = useState({ social: null, professional: null });
  const [authStage, setAuthStage] = useState('loading');
  const [formLoading, setFormLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [dinnerType, setDinnerType] = useState('social');
  const [forceForm, setForceForm] = useState(false);
  const { messages, push } = useToast();
  const dinnerTypeCopy = DINNER_TYPES[dinnerType];

  // Each dinner type has its own independent registration/match/confirm/
  // reject lifecycle; the toggle just selects which track is on screen.
  const activeRegistration = registrations[dinnerType];
  const track = deriveTrackState(activeRegistration);
  const appState = authStage === 'ready' ? (forceForm ? 'form' : track.appState) : authStage;
  const matchData = track.matchData;
  const banned = authStage === 'ready' && Boolean(user?.banned);

  useEffect(() => { setForceForm(false); }, [dinnerType]);

  const previewMatch = {
    compatibility: 91,
    restaurant: restaurants[0] || { name: 'Neighbourhood Table', area: 'Tanjong Pagar', perk: 'Complimentary welcome drink for each guest' },
    group: [{ name: 'You', isUser: true }, { name: 'Alicia' }, { name: 'Marcus' }, { name: 'Priya' }, { name: 'Daniel' }, { name: 'Mei' }],
  };
  const avatarColors = ['#ff4f8b', '#6c47ff', '#92174d', '#428bff', '#00a878', '#222'];

  const loadStatus = useCallback(async (token = authToken, opts = {}) => {
    if (!token) { setAuthStage('signedOut'); return null; }
    if (opts.manual) setCheckingStatus(true);
    try {
      const data = await requestJson('/me', { token, method: 'GET' });
      setUser(data.user);
      const regs = data.registrations || { social: null, professional: null };
      setRegistrations(regs);
      setAuthStage('ready');
      if (opts.manual) {
        const reg = regs[dinnerType];
        if (reg?.status === 'matched') push('Your table is ready — review and confirm your spot.', 'success');
        else if (reg?.status === 'pending') push('No match yet — we are still finding the right table for you.', 'success');
        else if (!reg) push('You are signed in, but have not registered for matching yet.', 'success');
      }
      return data;
    } catch (err) {
      localStorage.removeItem(AUTH_KEY);
      setAuthToken(null);
      setUser(null);
      setRegistrations({ social: null, professional: null });
      setAuthStage('signedOut');
      if (opts.manual) push(err.message);
      return null;
    } finally {
      if (opts.manual) setCheckingStatus(false);
    }
  }, [authToken, dinnerType, push]);

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
      setRegistrations(prev => ({ ...prev, [form.dinnerType]: data.registration }));
      setDinnerType(form.dinnerType);
      setForceForm(false);
      push('Registration submitted. It is now tagged to your signed-in email.', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    } catch (err) {
      push(err.message);
      return false;
    } finally {
      setFormLoading(false);
    }
  }

  function signOut() {
    localStorage.removeItem(AUTH_KEY);
    setAuthToken(null);
    setUser(null);
    setRegistrations({ social: null, professional: null });
    setAuthStage('signedOut');
  }

  function handleConfirmed(match) {
    setRegistrations(prev => {
      const current = prev[dinnerType];
      if (!current) return prev;
      return { ...prev, [dinnerType]: { ...current, status: 'confirmed', match } };
    });
  }

  async function handleReject() {
    try {
      const data = await requestJson('/match/reject', { token: authToken, method: 'POST', body: JSON.stringify({ registrationId: activeRegistration?.id }) });
      if (data.groupUnmatched) {
        push("You rejected this table, and with 2 or more unable to make it, the whole table has been unmatched. You can register again in 6 hours.", 'success');
      } else {
        push('You rejected this table. You can register again in 6 hours.', 'success');
      }
      await loadStatus(authToken);
    } catch (err) {
      push(err.message);
    }
  }

  return (
    <main data-dinner-type={dinnerType}>
      <Toast messages={messages} />
      <nav className="nav">
        <div className="nav-left">
          <a className="brand" href="#top"><span>6</span>DinnerSix</a>
        </div>
        <div className="dinner-type-toggle nav-toggle" role="tablist">
          {Object.entries(DINNER_TYPES).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={dinnerType === key}
              className={dinnerType === key ? 'active' : ''}
              onClick={() => setDinnerType(key)}
            >
              {cfg.label}
            </button>
          ))}
        </div>
        <div className="nav-links">
          {(appState === 'signedOut' || appState === 'form') && (
            <>
              <a href="#how">How it works</a>
              <a href="#signup">Register</a>
            </>
          )}
        </div>
        <div className="nav-right">
          {user?.email ? (
            <>
              <button className="auth-pill" onClick={() => loadStatus(authToken, { manual: true })}><span>Signed in</span><strong>{user.email}</strong></button>
              <button className="nav-signout" onClick={signOut}>Sign out</button>
            </>
          ) : <a className="nav-cta" href="#signup">Sign in</a>}
        </div>
      </nav>

      {banned && <BannedScreen onSignOut={signOut} />}
      {!banned && appState === 'loading' && <section className="section pending-panel"><div className="pending-card"><h2>Loading DinnerSix…</h2></div></section>}
      {!banned && appState === 'pending' && <PendingScreen user={user} registration={activeRegistration} checking={checkingStatus} onCheck={() => loadStatus(authToken, { manual: true })} onSignOut={signOut} />}
      {!banned && appState === 'rejected' && (
        <RejectedScreen
          retryAt={activeRegistration?.rejectedAt ? new Date(activeRegistration.rejectedAt).getTime() + REJECT_COOLDOWN_MS : Date.now()}
          checking={checkingStatus}
          onCheck={() => loadStatus(authToken, { manual: true })}
          onSignOut={signOut}
        />
      )}
      {!banned && appState === 'matched' && matchData && (
        <MatchSection match={matchData} registrationId={activeRegistration?.id} token={authToken} onConfirm={handleConfirmed} onReject={handleReject} push={push} />
      )}
      {!banned && appState === 'confirmed' && matchData && (
        <ConfirmedScreen
          match={matchData}
          token={authToken}
          user={user}
          push={push}
          onSignOut={signOut}
          onUnmatched={() => loadStatus(authToken)}
          canRegisterAgain={activeRegistration?.status === 'completed'}
          onRegisterAgain={() => setForceForm(true)}
        />
      )}

      {!banned && (appState === 'signedOut' || appState === 'form') && (
        <>
          <section className="hero" id="top">
            <div className="hero-copy">
              <p className="eyebrow">{dinnerTypeCopy.eyebrow}</p>
              <h1>{dinnerTypeCopy.headline}</h1>
              <p className="lead">{dinnerTypeCopy.lead}</p>
              <div className="hero-actions"><a className="button primary" href="#signup">Continue with Google</a><a className="button secondary" href="#how">See how it works</a></div>
              <div className="trust">{dinnerTypeCopy.trust.map(t => <span key={t}>{t}</span>)}</div>
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
            <div><strong>4-6</strong><span>people per table</span></div>
          </section>

          <section className="section">
            <div className="section-head"><p className="eyebrow">{dinnerTypeCopy.valuePropsEyebrow}</p><h2>{dinnerTypeCopy.valuePropsHeadline}</h2></div>
            <div className="value-prop-grid">
              {dinnerTypeCopy.valueProps.map(v => (
                <article key={v.title}>
                  <span className="value-prop-icon">{v.icon}</span>
                  <h3>{v.title}</h3>
                  <p>{v.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="section" id="how">
            <div className="section-head"><p className="eyebrow">How it works</p><h2>{dinnerTypeCopy.howHeadline}</h2></div>
            <div className="steps">
              {dinnerTypeCopy.howSteps.map((step, i) => (
                <article key={step.title}><span>{String(i + 1).padStart(2, '0')}</span><h3>{step.title}</h3><p>{step.body}</p></article>
              ))}
            </div>
          </section>

          <section className="section split" id="signup">
            <div>
              <p className="eyebrow">Registration</p>
              <h2>{user ? dinnerTypeCopy.registerHeadline : 'Continue with Google.'}</h2>
              <p>{user ? dinnerTypeCopy.registerBody : 'Use Google sign-in before the registration form is shown.'}</p>
            </div>
            {user ? <SignupForm key={dinnerType} user={user} onSubmit={handleFormSubmit} loading={formLoading} defaultDinnerType={dinnerType} /> : <SignInPanel />}
          </section>

          <section className="section restaurant">
            <div><p className="eyebrow">{dinnerTypeCopy.restaurantEyebrow}</p><h2>{dinnerTypeCopy.restaurantHeadline}</h2><p>{dinnerTypeCopy.restaurantBody}</p></div>
            <div className="restaurant-cards">
              <article><strong>Curated</strong><span>personality-matched groups</span></article>
              <article><strong>4-6 seats</strong><span>average per matched booking</span></article>
            </div>
          </section>

          <footer><a className="brand" href="#top"><span>6</span>DinnerSix</a><p>Free dinner matching for social dining and professional networking.</p><a href="#signup">Register</a></footer>
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
