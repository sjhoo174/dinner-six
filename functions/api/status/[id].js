import { buildMatch, json, readRegistration } from '../../_shared.js';

export function onRequestGet({ params }) {
  const registration = readRegistration(params.id);
  if (!registration) return json({ error: 'Registration not found' }, 404);

  const remaining = Math.max(0, registration.readyAt - Date.now());
  if (remaining > 0) {
    return json({
      status: 'pending',
      estimatedRemainingMs: remaining,
      readyAt: new Date(registration.readyAt).toISOString(),
    });
  }

  return json({
    status: 'matched',
    match: buildMatch(registration.user),
    confirmed: false,
  });
}
