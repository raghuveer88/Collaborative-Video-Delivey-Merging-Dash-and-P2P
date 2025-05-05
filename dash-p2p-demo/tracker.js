// tracker.js
const express    = require('express');
const bodyParser = require('body-parser');
const app        = express();
const PORT       = 7000;

app.use(bodyParser.json());

const segmentMap = {}; // key="rep-num" → [ { peerId, host, port }, … ]

// Announce endpoint
app.post('/announce', (req, res) => {
  const { peerId, host, port, segments } = req.body;
  console.log(`[Tracker] ← announce from ${peerId}  segments=${segments.join(',')}`);
  segments.forEach(key => {
    segmentMap[key] = segmentMap[key] || [];
    if (!segmentMap[key].some(p => p.peerId === peerId)) {
      segmentMap[key].push({ peerId, host, port });
    }
  });
  res.json({ ok: true });
});

// Lookup endpoint
app.get('/tracker', (req, res) => {
  const key   = req.query.segment;
  const peers = segmentMap[key] || [];
  console.log(`[Tracker] → lookup   ${key}  holders=${peers.length}`);
  res.json(peers);
});

app.listen(PORT, () =>
  console.log(`▶ Tracker running on http://localhost:${PORT}`)
);
