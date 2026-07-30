const { getStore } = require('@netlify/blobs');

const DAILY_LIMIT_PER_IP = 3;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const token = process.env.GH_TOKEN;
  const owner = process.env.GH_OWNER;
  const repo = process.env.GH_REPO;

  if (!token || !owner || !repo) {
    return { statusCode: 500, body: 'Env var GH_TOKEN/GH_OWNER/GH_REPO belum di-set di Netlify.' };
  }

  const ip = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || 'unknown';
  const today = new Date().toISOString().slice(0, 10);
  const usageKey = ip + ':' + today;
  const store = getStore('usage');

  let count = 0;
  try {
    const existing = await store.get(usageKey, { type: 'json' });
    if (existing && existing.count) count = existing.count;
  } catch (e) {}

  if (count >= DAILY_LIMIT_PER_IP) {
    return {
      statusCode: 429,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: `Limit compile harian (${DAILY_LIMIT_PER_IP}x) buat IP kamu udah abis. Coba lagi besok.`
      })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Body bukan JSON valid.' };
  }

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ event_type: 'build_apk', client_payload: payload })
  });

  if (res.status !== 204) {
    const text = await res.text();
    return { statusCode: res.status, body: text };
  }

  await store.setJSON(usageKey, { count: count + 1 });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  };
};
