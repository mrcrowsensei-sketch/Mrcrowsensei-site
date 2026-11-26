// Looks up a YouTube channel for the admin panel. The YouTube key stays on the server (Vercel env var YT_API_KEY).
const fs = require('fs'), path = require('path');
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  try {
    const cfg = fs.readFileSync(path.join(process.cwd(), 'config.js'), 'utf8');
    const url = (cfg.match(/url:\s*'([^']+)'/) || [])[1], key = (cfg.match(/key:\s*'([^']+)'/) || [])[1];
    const tok = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const who = await fetch(url + '/auth/v1/user', { headers: { apikey: key, Authorization: 'Bearer ' + tok } });
    if (!tok || !who.ok) return res.status(401).send(JSON.stringify({ error: 'Please log in again' }));
    const yt = process.env.YT_API_KEY;
    if (!yt) return res.status(200).send(JSON.stringify({ error: 'YT_API_KEY is not set in Vercel yet' }));
    const q = req.query || {};
    const sel = q.id ? '&id=' + encodeURIComponent(q.id) : q.u ? '&forUsername=' + encodeURIComponent(q.u) : '&forHandle=' + encodeURIComponent('@' + String(q.h || '').replace(/^@/, ''));
    const r = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&key=' + yt + sel);
    const j = await r.json();
    if (j.error) return res.status(200).send(JSON.stringify({ error: j.error.message || 'YouTube error' }));
    const it = j.items && j.items[0];
    if (!it) return res.status(200).send(JSON.stringify({ error: 'nf' }));
    const sn = it.snippet || {}, st = it.statistics || {}, p = sn.thumbnails || {};
    res.status(200).send(JSON.stringify({ cid: it.id, n: sn.title, h: (sn.customUrl || '').replace(/^@/, ''), pic: (p.medium || p.default || {}).url || '', s: st.hiddenSubscriberCount ? 0 : (+st.subscriberCount || 0) }));
  } catch (e) { res.status(200).send(JSON.stringify({ error: 'Server error' })); }
};
