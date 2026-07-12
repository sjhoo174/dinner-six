import express from 'express';
import cors from 'cors';
import {
  buildMatch,
  createRegistration,
  readRegistration,
  restaurants,
} from '../functions/_shared.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());

app.get('/api/restaurants', (_req, res) => {
  res.json({ restaurants });
});

app.post('/api/register', (req, res) => {
  const user = req.body;

  if (!user?.name || !user?.email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  const registration = createRegistration(user);
  res.json({
    ...registration,
    message: 'Registration received. Matching can take a few days; you can close this page and check back later.',
  });
});

app.get('/api/status/:id', (req, res) => {
  const registration = readRegistration(req.params.id);
  if (!registration) return res.status(404).json({ error: 'Registration not found' });

  const remaining = Math.max(0, registration.readyAt - Date.now());
  if (remaining > 0) {
    return res.json({
      status: 'pending',
      estimatedRemainingMs: remaining,
      readyAt: new Date(registration.readyAt).toISOString(),
    });
  }

  res.json({
    status: 'matched',
    match: buildMatch(registration.user),
    confirmed: false,
  });
});

app.post('/api/match/confirm', (req, res) => {
  const registration = readRegistration(req.body.registrationId);
  if (!registration) return res.status(404).json({ error: 'Registration not found' });

  if (Date.now() < registration.readyAt) {
    return res.status(400).json({ error: 'Match not ready yet' });
  }

  res.json({
    success: true,
    message: 'You are confirmed! See you at the table 🍽️',
    match: buildMatch(registration.user),
  });
});

app.listen(PORT, () => {
  console.log(`\n🍽️  DinnerSix API running at http://localhost:${PORT}\n`);
});
