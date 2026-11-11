const express = require('express');
const helmet = require('helmet');
const client = require('prom-client');
const { param, body, validationResult } = require('express-validator');

const app = express();
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
client.collectDefaultMetrics();

const failedLogins = new client.Counter({
  name: 'failed_logins_total', help: 'Failed login attempts'
});

const APP_PASSWORD = process.env.APP_PASSWORD;

const patients = { 1: { id: 1, name: 'Test Patient', condition: 'Mock data' } };

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/patients/:id', param('id').isInt({ min: 1 }), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid id' });
  const p = patients[req.params.id];
  return p ? res.json(p) : res.status(404).json({ error: 'Not found' });
});

app.post('/login', body('password').isString().isLength({ min: 1, max: 100 }), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input' });
  if (req.body.password !== APP_PASSWORD) {
    failedLogins.inc();
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return res.json({ message: 'Logged in' });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(3000, () => console.log('Listening on 3000'));
