// Runs once a day (Vercel cron): refreshes every creator's subscribers, name and photo in your database.
const SB_URL = 'https://pfkmgzajjdbbxljlgsug.supabase.co', SB_KEY = 'sb_publishable_7jtZIX_LWRT2-XWlRGYsgQ_Sa8wmXDj';
module.exports = async (req, res) => {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.authorization !== 'Bearer ' + secret) return res.status(401).json({ error: 'unauthorized' });
    const url = SB_URL;
    const sk = process.env.SUPABASE_SERVICE_KEY, yt = process.env.YT_API_KEY;
    if (!sk || !yt) return res.status(200).json({ error: 'Set SUPABASE_SERVICE_KEY and YT_API_KEY in Vercel' });
    const H = { apikey: sk, Authorization: 'Bearer ' + sk, 'Content-Type': 'application/json' };
    const r = await fetch(url + '/rest/v1/site?id=eq.1&select=data', { headers: H });
    const data = ((await r.json())[0] || {}).data;
    if (!data || !data.CL || !data.CL.length) return res.status(200).json({ updated: 0 });
    const ids = data.CL.map((c) => c.cid).filter(Boolean);
    const map = {};
    for (let i = 0; i < ids.length; i += 50) {
      const y = await (await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&maxResults=50&key=' + yt + '&id=' + ids.slice(i, i + 50).join(','))).json();
      (y.items || []).forEach((it) => { map[it.id] = it; });
    }
    let n = 0;
    data.CL.forEach((c) => {
      const it = map[c.cid]; if (!it) return;
      const sn = it.snippet || {}, st = it.statistics || {}, p = sn.thumbnails || {};
      if (!st.hiddenSubscriberCount) c.s = +st.subscriberCount || 0;
      if (sn.title) c.n = sn.title;
      const pic = (p.medium || p.default || {}).url; if (pic) c.pic = pic;
      c.t = 'auto-updated'; n++;
    });
    await fetch(url + '/rest/v1/site?id=eq.1', { method: 'PATCH', headers: Object.assign({ Prefer: 'return=minimal' }, H), body: JSON.stringify({ data, updated_at: new Date().toISOString() }) });
    res.status(200).json({ updated: n });
  } catch (e) { res.status(200).json({ error: 'failed' }); }
};
