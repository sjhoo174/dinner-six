import { createRegistration, json } from '../_shared.js';

export async function onRequestPost({ request }) {
  const user = await request.json().catch(() => null);

  if (!user?.name || !user?.email) {
    return json({ error: 'name and email are required' }, 400);
  }

  const registration = createRegistration(user);
  return json({
    ...registration,
    message: 'Registration received. Matching can take a few days; you can close this page and check back later.',
  });
}
