import { buildMatch, json, readRegistration } from '../../_shared.js';

export async function onRequestPost({ request }) {
  const body = await request.json().catch(() => ({}));
  const registration = readRegistration(body.registrationId);
  if (!registration) return json({ error: 'Registration not found' }, 404);

  if (Date.now() < registration.readyAt) {
    return json({ error: 'Match not ready yet' }, 400);
  }

  return json({
    success: true,
    message: 'You are confirmed! See you at the table 🍽️',
    match: buildMatch(registration.user),
  });
}
