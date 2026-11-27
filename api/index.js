// Serves index.html with the link-preview tags (title, description, banner) taken from the admin panel.
const fs = require('fs'), path = require('path');
const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
module.exports = async (req, res) => {
  let html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  try {
    const cfg = fs.readFileSync(path.join(process.cwd(), 'config.js'), 'utf8');
    const url = (cfg.match(/url:\s*'([^']+)'/) || [])[1], key = (cfg.match(/key:\s*'([^']+)'/) || [])[1];
    if (/^https?:/.test(url) && key) {
      const headers = { apikey: key };
      if (key.indexOf('sb_') !== 0) headers.Authorization = 'Bearer ' + key;
      const r = await fetch(url + '/rest/v1/site?id=eq.1&select=data', { headers });
      const d = r.ok ? ((await r.json())[0] || {}).data : null;
      if (d) {
        const B = d.B || {}, E = d.E || {};
        const set = (re, val) => { html = html.replace(re, (m, a, b) => a + esc(val) + b); };
        if (/^https?:\/\/[^\s"'<>]+$/.test(B.logo || '')) { html = html.replace('</head>', '<link rel="icon" href="' + esc(B.logo) + '">\n<link rel="apple-touch-icon" href="' + esc(B.logo) + '">\n</head>'); }
        if (B.ogt) { set(/(<title>)[^<]*(<\/title>)/, B.ogt); set(/(<meta property="og:title" content=")[^"]*(")/, B.ogt); set(/(<meta name="twitter:title" content=")[^"]*(")/, B.ogt); }
        if (B.ogd) { set(/(<meta property="og:description" content=")[^"]*(")/, B.ogd); set(/(<meta name="twitter:description" content=")[^"]*(")/, B.ogd); set(/(<meta name="description" content=")[^"]*(")/, B.ogd); }
        if (E.bn === false) { html = html.replace(/<meta[^>]*(og:image|twitter:image)[^>]*>\s*/g, '').replace(/(<meta name="twitter:card" content=")[^"]*(")/, '$1summary$2'); }
        if (B.banner && E.bn !== false) { set(/(<meta property="og:image" content=")[^"]*(")/, B.banner); set(/(<meta name="twitter:image" content=")[^"]*(")/, B.banner); }
      }
    }
  } catch (e) { /* fall back to the plain page */ }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
  res.status(200).send(html);
};
