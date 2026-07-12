/**
 * _shared.js — Shared matching logic for all Pages Functions.
 * Underscore prefix prevents Cloudflare from treating this as a route.
 */

export const sampleGuests = [
  { name: 'Alicia',  gender: 'Female',     industry: 'Product',     age: 29, vibe: 'Deep talks',      diet: 'No restrictions',  energy: 'Balanced',  topics: ['Startups','Travel','Food'],           persona: 'Curious Builder'      },
  { name: 'Marcus',  gender: 'Male',       industry: 'Finance',     age: 31, vibe: 'Playful banter',  diet: 'No pork',          energy: 'Outgoing',  topics: ['Markets','Fitness','Comedy'],         persona: 'Social Strategist'    },
  { name: 'Priya',   gender: 'Female',     industry: 'Healthcare',  age: 28, vibe: 'Deep talks',      diet: 'Vegetarian',       energy: 'Calm',      topics: ['Wellness','Books','Culture'],         persona: 'Thoughtful Connector' },
  { name: 'Daniel',  gender: 'Male',       industry: 'Design',      age: 34, vibe: 'Playful banter',  diet: 'No restrictions',  energy: 'Balanced',  topics: ['Art','Music','Architecture'],         persona: 'Creative Spark'       },
  { name: 'Mei',     gender: 'Female',     industry: 'Tech',        age: 27, vibe: 'New ideas',       diet: 'No seafood',       energy: 'Outgoing',  topics: ['AI','Gaming','Travel'],               persona: 'Future Tinkerer'      },
  { name: 'Sam',     gender: 'Non-binary', industry: 'Education',   age: 32, vibe: 'Deep talks',      diet: 'Halal-friendly',   energy: 'Calm',      topics: ['Language','Films','Social impact'],   persona: 'Warm Facilitator'     },
  { name: 'Theo',    gender: 'Male',       industry: 'Marketing',   age: 30, vibe: 'Playful banter',  diet: 'No restrictions',  energy: 'Outgoing',  topics: ['Brands','Nightlife','Sports'],        persona: 'Conversation Starter' },
  { name: 'Nadia',   gender: 'Female',     industry: 'Law',         age: 35, vibe: 'New ideas',       diet: 'No beef',          energy: 'Balanced',  topics: ['Policy','Food','Theatre'],            persona: 'Insight Hunter'       },
  { name: 'Jun',     gender: 'Male',       industry: 'Engineering', age: 26, vibe: 'New ideas',       diet: 'No restrictions',  energy: 'Calm',      topics: ['Robotics','Climbing','Coffee'],       persona: 'Quiet Inventor'       },
  { name: 'Farah',   gender: 'Female',     industry: 'Hospitality', age: 33, vibe: 'Playful banter',  diet: 'Halal-friendly',   energy: 'Outgoing',  topics: ['Restaurants','Travel','Events'],      persona: 'Host Energy'          },
];

export const restaurants = [
  { id: 'r1', name: 'Neighbourhood Table', area: 'Tanjong Pagar', cuisine: 'Modern Asian sharing plates', perk: 'Complimentary welcome drink for each guest' },
  { id: 'r2', name: 'The Long Bar Table',  area: 'Bugis',         cuisine: 'Mediterranean tapas',          perk: 'Shared appetiser platter on the house'      },
  { id: 'r3', name: 'Supper Club Social',  area: 'Keong Saik',    cuisine: 'Casual bistro and cocktails',  perk: 'Extended happy-hour pricing for the group'  },
];

function overlap(a, b) { return a.filter(x => b.includes(x)).length; }

function scoreGuest(user, guest) {
  let score = 0;
  if (user.vibe   === guest.vibe)                                     score += 4;
  if (user.energy === guest.energy)                                   score += 3;
  if (user.diet   === guest.diet || guest.diet === 'No restrictions') score += 1;
  score += overlap(user.topics || [], guest.topics) * 2;
  score += Math.max(0, 3 - Math.abs(Number(user.age) - guest.age) / 4);
  return score;
}

export function inferPersona(user) {
  if (user.energy === 'Outgoing' && user.vibe === 'Playful banter') return 'Room Igniter';
  if (user.vibe === 'Deep talks')                                    return 'Meaning Maker';
  if (user.industry === 'Tech'  || user.vibe === 'New ideas')        return 'Idea Explorer';
  return 'Open Connector';
}

export function buildMatch(user) {
  const ranked = sampleGuests
    .map(g => ({ ...g, score: scoreGuest(user, g) }))
    .sort((a, b) => b.score - a.score);

  const group = [
    {
      name: user.name || 'You', gender: user.gender, industry: user.industry,
      age: Number(user.age), vibe: user.vibe, diet: user.diet,
      energy: user.energy, topics: user.topics, persona: inferPersona(user), isUser: true,
    },
    ...ranked.slice(0, 5),
  ];

  const restaurant = restaurants[
    (user.area.length + user.industry.length + Number(user.age || 0)) % restaurants.length
  ];
  const compatibility = Math.min(97, Math.round(
    78 + ranked.slice(0, 5).reduce((s, g) => s + g.score, 0) / 5
  ));

  return { group, restaurant, compatibility };
}

/** Standard JSON response helper */
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}


export const MIN_MATCH_WAIT_MS = 2 * 24 * 60 * 60 * 1000;
export const MAX_MATCH_WAIT_MS = 4 * 24 * 60 * 60 * 1000;

export function matchDelayMs(user = {}) {
  const seed = `${user.email || ''}:${user.area || ''}:${user.night || ''}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return MIN_MATCH_WAIT_MS + (hash % (MAX_MATCH_WAIT_MS - MIN_MATCH_WAIT_MS));
}

function base64UrlEncode(text) {
  return btoa(unescape(encodeURIComponent(text)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(text) {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

export function createRegistration(user) {
  const createdAt = Date.now();
  const estimatedWaitMs = matchDelayMs(user);
  const readyAt = createdAt + estimatedWaitMs;
  const payload = { v: 1, user, createdAt, readyAt };
  return {
    registrationId: `ds_${base64UrlEncode(JSON.stringify(payload))}`,
    estimatedWaitMs,
    readyAt: new Date(readyAt).toISOString(),
  };
}

export function readRegistration(registrationId) {
  if (!registrationId || !registrationId.startsWith('ds_')) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(registrationId.slice(3)));
    if (!payload?.user || !payload?.readyAt) return null;
    return payload;
  } catch {
    return null;
  }
}
