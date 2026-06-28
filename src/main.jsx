import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const sampleGuests = [
  { name: 'Alicia', gender: 'Female', industry: 'Product', age: 29, vibe: 'Deep talks', diet: 'No restrictions', energy: 'Balanced', topics: ['Startups', 'Travel', 'Food'], persona: 'Curious Builder' },
  { name: 'Marcus', gender: 'Male', industry: 'Finance', age: 31, vibe: 'Playful banter', diet: 'No pork', energy: 'Outgoing', topics: ['Markets', 'Fitness', 'Comedy'], persona: 'Social Strategist' },
  { name: 'Priya', gender: 'Female', industry: 'Healthcare', age: 28, vibe: 'Deep talks', diet: 'Vegetarian', energy: 'Calm', topics: ['Wellness', 'Books', 'Culture'], persona: 'Thoughtful Connector' },
  { name: 'Daniel', gender: 'Male', industry: 'Design', age: 34, vibe: 'Playful banter', diet: 'No restrictions', energy: 'Balanced', topics: ['Art', 'Music', 'Architecture'], persona: 'Creative Spark' },
  { name: 'Mei', gender: 'Female', industry: 'Tech', age: 27, vibe: 'New ideas', diet: 'No seafood', energy: 'Outgoing', topics: ['AI', 'Gaming', 'Travel'], persona: 'Future Tinkerer' },
  { name: 'Sam', gender: 'Non-binary', industry: 'Education', age: 32, vibe: 'Deep talks', diet: 'Halal-friendly', energy: 'Calm', topics: ['Language', 'Films', 'Social impact'], persona: 'Warm Facilitator' },
  { name: 'Theo', gender: 'Male', industry: 'Marketing', age: 30, vibe: 'Playful banter', diet: 'No restrictions', energy: 'Outgoing', topics: ['Brands', 'Nightlife', 'Sports'], persona: 'Conversation Starter' },
  { name: 'Nadia', gender: 'Female', industry: 'Law', age: 35, vibe: 'New ideas', diet: 'No beef', energy: 'Balanced', topics: ['Policy', 'Food', 'Theatre'], persona: 'Insight Hunter' },
  { name: 'Jun', gender: 'Male', industry: 'Engineering', age: 26, vibe: 'New ideas', diet: 'No restrictions', energy: 'Calm', topics: ['Robotics', 'Climbing', 'Coffee'], persona: 'Quiet Inventor' },
  { name: 'Farah', gender: 'Female', industry: 'Hospitality', age: 33, vibe: 'Playful banter', diet: 'Halal-friendly', energy: 'Outgoing', topics: ['Restaurants', 'Travel', 'Events'], persona: 'Host Energy' }
];

const restaurants = [
  { name: 'Neighbourhood Table', area: 'Tanjong Pagar', cuisine: 'Modern Asian sharing plates', discount: '25%', perk: 'Free welcome drink for every matched guest' },
  { name: 'The Long Bar Table', area: 'Bugis', cuisine: 'Mediterranean tapas', discount: '30%', perk: 'Shared appetiser platter included' },
  { name: 'Supper Club Social', area: 'Keong Saik', cuisine: 'Casual bistro and cocktails', discount: '20%', perk: 'Happy-hour pricing extended for the group' }
];

const initialForm = {
  name: '', email: '', gender: 'Female', age: '28', industry: 'Tech', area: 'Central',
  vibe: 'Deep talks', energy: 'Balanced', diet: 'No restrictions', budget: '$35-$50',
  topics: ['Food', 'Travel', 'Startups'], night: 'Thursday', phone: ''
};

function overlap(a, b) { return a.filter(x => b.includes(x)).length; }
function scoreGuest(user, guest) {
  let score = 0;
  if (user.vibe === guest.vibe) score += 4;
  if (user.energy === guest.energy) score += 3;
  if (user.diet === guest.diet || guest.diet === 'No restrictions') score += 1;
  score += overlap(user.topics, guest.topics) * 2;
  score += Math.max(0, 3 - Math.abs(Number(user.age) - guest.age) / 4);
  return score;
}
function createMatch(user) {
  const ranked = [...sampleGuests].map(g => ({ ...g, score: scoreGuest(user, g) })).sort((a,b)=>b.score-a.score);
  const group = [{ name: user.name || 'You', gender: user.gender, industry: user.industry, age: Number(user.age), vibe: user.vibe, diet: user.diet, energy: user.energy, topics: user.topics, persona: inferPersona(user), isUser: true }, ...ranked.slice(0,5)];
  const restaurant = restaurants[(user.area.length + user.industry.length + Number(user.age || 0)) % restaurants.length];
  return { group, restaurant, compatibility: Math.min(97, Math.round(78 + ranked.slice(0,5).reduce((s,g)=>s+g.score,0) / 5)) };
}
function inferPersona(user) {
  if (user.energy === 'Outgoing' && user.vibe === 'Playful banter') return 'Room Igniter';
  if (user.vibe === 'Deep talks') return 'Meaning Maker';
  if (user.industry === 'Tech' || user.vibe === 'New ideas') return 'Idea Explorer';
  return 'Open Connector';
}
function countBy(group, key) {
  return group.reduce((acc, x) => { acc[x[key]] = (acc[x[key]] || 0) + 1; return acc; }, {});
}
function asBars(obj) {
  const total = Object.values(obj).reduce((a,b)=>a+b,0) || 1;
  return Object.entries(obj).map(([label, count]) => ({ label, count, width: `${Math.round(count/total*100)}%` }));
}

function App() {
  const [form, setForm] = useState(initialForm);
  const [matched, setMatched] = useState(() => JSON.parse(localStorage.getItem('dinnerSixMatch') || 'null'));
  const match = useMemo(() => matched || createMatch(form), [form, matched]);
  const genders = asBars(countBy(match.group, 'gender'));
  const industries = asBars(countBy(match.group, 'industry'));
  const personas = asBars(countBy(match.group, 'persona'));

  function update(name, value) { setForm(prev => ({ ...prev, [name]: value })); }
  function toggleTopic(topic) {
    setForm(prev => ({ ...prev, topics: prev.topics.includes(topic) ? prev.topics.filter(t=>t!==topic) : [...prev.topics, topic].slice(-5) }));
  }
  function submit(e) {
    e.preventDefault();
    const fresh = createMatch(form);
    const payload = { ...fresh, user: form, createdAt: new Date().toISOString() };
    localStorage.setItem('dinnerSixMatch', JSON.stringify(payload));
    setMatched(payload);
    document.getElementById('match')?.scrollIntoView({ behavior: 'smooth' });
  }

  return <main>
    <nav className="nav"><a className="brand" href="#top"><span>6</span>DinnerSix</a><div><a href="#how">How it works</a><a href="#signup">Sign up</a><a href="#match">Live demo</a></div><a className="nav-cta" href="#signup">Join free</a></nav>
    <section className="hero" id="top">
      <div className="hero-copy"><p className="eyebrow">Free to join dinner matching</p><h1>Meet five strangers over a discounted dinner.</h1><p className="lead">DinnerSix matches compatible people into tables of 5–6 for dinner dates, drinks, and real conversation — no app fee, with partner restaurants offering subsidised percentage discounts.</p><div className="hero-actions"><a className="button primary" href="#signup">Get matched free</a><a className="button secondary" href="#match">See a sample table</a></div><div className="trust"><span>No app fee</span><span>5–6 person tables</span><span>Restaurant discounts</span><span>Persona previews</span></div></div>
      <div className="phone-card"><div className="phone-top"><span>Tonight's table</span><strong>{match.compatibility}% fit</strong></div><div className="avatar-ring">{match.group.slice(0,6).map((p,i)=><div key={p.name} className={`avatar a${i}`}>{p.isUser?'You':p.name[0]}</div>)}</div><div className="reservation"><b>{match.restaurant.name}</b><span>{match.restaurant.area} · {match.restaurant.discount} off</span></div></div>
    </section>
    <section className="stats"><div><strong>FREE</strong><span>for diners to join</span></div><div><strong>5–6</strong><span>people per table</span></div><div><strong>20–30%</strong><span>restaurant subsidy</span></div><div><strong>7 min</strong><span>questionnaire</span></div></section>
    <section className="section" id="how"><div className="section-head"><p className="eyebrow">How it works</p><h2>A simple flow from signup to seated dinner.</h2></div><div className="steps"><article><span>01</span><h3>Answer a few questions</h3><p>Tell us your industry, dinner budget, dietary needs, social energy, and conversation preferences.</p></article><article><span>02</span><h3>Get algorithmically grouped</h3><p>We build tables of 5–6 using compatibility, diversity, dietary fit, location, and balanced personas.</p></article><article><span>03</span><h3>Unlock restaurant perks</h3><p>Partner restaurants subsidise the experience with percentage discounts, drinks, or shared starters.</p></article></div></section>
    <section className="section split" id="signup"><div><p className="eyebrow">Questionnaire</p><h2>Sign up and preview your table.</h2><p>Share your preferences so DinnerSix can shape a table around compatible energy, balanced personas, dietary fit, location, and conversation topics.</p></div><form className="signup" onSubmit={submit}><label>Name<input value={form.name} onChange={e=>update('name', e.target.value)} placeholder="Your name" required /></label><label>Email<input type="email" value={form.email} onChange={e=>update('email', e.target.value)} placeholder="you@example.com" required /></label><label>Gender<select value={form.gender} onChange={e=>update('gender', e.target.value)}><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select></label><label>Age<input type="number" min="18" max="80" value={form.age} onChange={e=>update('age', e.target.value)} /></label><label>Industry<select value={form.industry} onChange={e=>update('industry', e.target.value)}>{['Tech','Finance','Product','Design','Marketing','Healthcare','Education','Law','Hospitality','Engineering','Founder','Student'].map(x=><option key={x}>{x}</option>)}</select></label><label>Preferred area<select value={form.area} onChange={e=>update('area', e.target.value)}>{['Central','East','West','North','North-East','CBD'].map(x=><option key={x}>{x}</option>)}</select></label><label>Conversation vibe<select value={form.vibe} onChange={e=>update('vibe', e.target.value)}><option>Deep talks</option><option>Playful banter</option><option>New ideas</option></select></label><label>Social energy<select value={form.energy} onChange={e=>update('energy', e.target.value)}><option>Calm</option><option>Balanced</option><option>Outgoing</option></select></label><label>Dietary needs<select value={form.diet} onChange={e=>update('diet', e.target.value)}>{['No restrictions','Vegetarian','Halal-friendly','No pork','No beef','No seafood'].map(x=><option key={x}>{x}</option>)}</select></label><label>Dinner budget<select value={form.budget} onChange={e=>update('budget', e.target.value)}><option>$25-$35</option><option>$35-$50</option><option>$50-$70</option></select></label><div className="topic-box"><span>Pick up to 5 topics</span>{['Food','Travel','Startups','Books','Fitness','Music','AI','Culture','Comedy','Social impact','Gaming','Architecture'].map(t=><button type="button" key={t} className={form.topics.includes(t)?'selected':''} onClick={()=>toggleTopic(t)}>{t}</button>)}</div><button className="button primary full" type="submit">Generate my table</button></form></section>
    <section className="section match" id="match"><div className="section-head"><p className="eyebrow">Match preview</p><h2>Your next table of {match.group.length}.</h2><p>Users see the shape of the room before booking: personas, industries, gender mix, venue, discount, and what kind of people are turning up.</p></div><div className="match-grid"><div className="table-card"><h3>{match.restaurant.name}</h3><p>{match.restaurant.cuisine}</p><div className="discount"><strong>{match.restaurant.discount} off</strong><span>{match.restaurant.perk}</span></div><p className="venue">📍 {match.restaurant.area} · matched for your preferred area</p></div><div className="insights"><h3>Who is turning up?</h3><Metric title="Gender mix" rows={genders}/><Metric title="Industries" rows={industries}/><Metric title="Personas" rows={personas}/></div><div className="guest-list">{match.group.map(p=><article key={p.name} className={p.isUser?'you':''}><div className="guest-avatar">{p.isUser?'You':p.name[0]}</div><div><h4>{p.name}</h4><p>{p.persona} · {p.industry} · {p.gender}</p><span>{p.vibe} · {p.energy}</span></div></article>)}</div></div></section>
    <section className="section restaurant"><div><p className="eyebrow">For restaurants</p><h2>Fill quieter nights with curated tables.</h2><p>Restaurants subsidise a percentage discount in exchange for predictable group bookings, social discovery, and new diners who arrive primed to order together.</p></div><div className="restaurant-cards"><article><strong>25%</strong><span>sample partner discount</span></article><article><strong>6 seats</strong><span>average matched table</span></article><article><strong>CRM</strong><span>guest opt-ins and repeat nights</span></article></div></section>
    <footer><a className="brand" href="#top"><span>6</span>DinnerSix</a><p>Free social dining matches. Restaurant-subsidised dinners. Real-world connection.</p><a href="#signup">Join free</a></footer>
  </main>
}
function Metric({ title, rows }) { return <div className="metric"><b>{title}</b>{rows.map(r=><div className="bar-row" key={r.label}><span>{r.label} · {r.count}</span><div><i style={{width:r.width}} /></div></div>)}</div> }

createRoot(document.getElementById('root')).render(<App />);
