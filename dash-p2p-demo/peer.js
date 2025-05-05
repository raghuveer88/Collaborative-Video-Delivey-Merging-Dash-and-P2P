// peer.js
const express  = require('express');
const axios    = require('axios');
const fs       = require('fs');
const os       = require('os');
const path     = require('path');
const { v4: uuidv4 } = require('uuid');
const argv     = require('minimist')(process.argv.slice(2));

/* ── Config ───────────────────────────────────────────── */
const PORT     = argv.port    || process.env.PORT    || 8001;
const TRACKER  = argv.tracker || process.env.TRACKER || 'http://localhost:7000';
const ORIGIN   = argv.origin  || process.env.ORIGIN  || 'http://localhost:9000/dash';
const peerId   = uuidv4();

/* ── App setup ────────────────────────────────────────── */
const app      = express();
const cacheDir = path.join(__dirname, `chunks_${os.hostname()}_${PORT}`);
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

let originBytes = 0;               // metrics: total bytes pulled from origin

/* ── 1) Manifest proxy (inject Representation IDs) ───── */
app.get('/dash/dash.mpd', async (req, res) => {
  try {
    const { data: mpd } = await axios.get(`${ORIGIN}/dash.mpd`);
    let idx = 0;
    const patched = mpd.replace(
      /<Representation\\b([^>]*)>/g,
      (_, attrs) => attrs.includes('id="')
        ? `<Representation${attrs}>`
        : `<Representation id="${idx++}"${attrs}>`
    );
    res.type('application/dash+xml').send(patched);
  } catch (e) {
    console.error(`[Peer ${peerId}] manifest ERROR:`, e.message);
    res.sendStatus(500);
  }
});

/* ── 2) Init‑segment handler ─────────────────────────── */
app.get('/dash/init_:rep.mp4', (req, res) => {
  const file = path.join(__dirname, 'public/dash', `init_${req.params.rep}.mp4`);
  if (!fs.existsSync(file)) return res.sendStatus(404);
  res.sendFile(file);
});

/* ── 3) Receive client metrics ───────────────────────── */
app.use(express.json());
app.post('/metrics', (req, res) => {
  const m = { ...req.body, originBandwidth: originBytes };
  const f = `metrics_${PORT}.json`;
  fs.writeFileSync(f, JSON.stringify(m, null, 2));
  console.log(`[Peer ${peerId}] ✔ wrote ${f}`);
  res.sendStatus(200);
});

/* ── 4) Chunk handler (cache + P2P + fallback) ───────── */
app.get('/dash/chunk_:rep(\\d+)_:num(\\d+).m4s', async (req, res) => {
  const { rep, num } = req.params;
  const key       = `${rep}-${num}`;
  const localFile = path.join(cacheDir, `chunk_${rep}_${num}.m4s`);

  console.log(`[Peer ${peerId}] ← request chunk ${key}`);

  /* Serve from cache */
  if (fs.existsSync(localFile)) {
    console.log(`[Peer ${peerId}]   → from cache`);
    return res.sendFile(localFile);
  }

  /* Try P2P */
  let sourceUrl = null;
  try {
    const { data: peers } = await axios.get(`${TRACKER}/tracker`, { params: { segment: key }});
    for (const p of peers.filter(p => p.peerId !== peerId)) {
      const url = `http://${p.host}:${p.port}/dash/chunk_${rep}_${num}.m4s`;
      try { await axios.head(url, { timeout: 200 }); sourceUrl = url; break; } catch {}
    }
    if (sourceUrl) console.log(`[Peer ${peerId}]   → P2P ${sourceUrl}`);
  } catch (e) {
    console.warn(`[Peer ${peerId}] tracker lookup failed:`, e.message);
  }

  /* Fallback to origin */
  if (!sourceUrl) {
    sourceUrl = `${ORIGIN}/chunk_${rep}_${num}.m4s`;
    console.log(`[Peer ${peerId}]   → origin ${sourceUrl}`);
  }

  /* Stream & cache */
  try {
    const upstream = await axios.get(sourceUrl, { responseType: 'stream' });
    if (sourceUrl.startsWith(ORIGIN))
      upstream.data.on('data', buf => (originBytes += buf.length));

    upstream.data.pipe(res);
    const ws = fs.createWriteStream(localFile);
    upstream.data.pipe(ws).on('finish', async () => {
      try {
        await axios.post(`${TRACKER}/announce`, {
          peerId, host: os.hostname(), port: PORT, segments: [key]
        });
        console.log(`[Peer ${peerId}] ✔ announced ${key}`);
      } catch (e) {
        console.warn(`[Peer ${peerId}] announce error:`, e.message);
      }
    });
  } catch (e) {
    console.error(`[Peer ${peerId}] chunk ${key} ERROR:`, e.message);
    res.sendStatus(500);
  }
});

/* ── 5) Serve player UI ──────────────────────────────── */
app.use('/client', express.static(path.join(__dirname, 'public')));

/* ── 6) Startup & initial announce ───────────────────── */
app.listen(PORT, async () => {
  console.log(`▶ Peer ${peerId} on http://localhost:${PORT}`);
  try {
    await axios.post(`${TRACKER}/announce`, {
      peerId, host: os.hostname(), port: PORT, segments: []   // no segments yet
    });
    console.log(`[Peer ${peerId}] ✔ initial announce`);
  } catch (e) {
    console.warn(`[Peer ${peerId}] initial announce failed:`, e.message);
  }
});

/* ── 7) Graceful shutdown ────────────────────────────── */
process.on('SIGINT', () => {
  console.log(`\\n[Peer ${peerId}] Origin Bandwidth consumed: ${(originBytes/1048576).toFixed(2)} MB`);
  process.exit();
});
