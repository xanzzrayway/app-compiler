const { getStore } = require('@netlify/blobs');

const DEFAULT_DAILY_LIMIT = 3;

exports.handler = async (event) => {
  const segments = event.path.split('/').filter(Boolean);
  const action = segments[segments.length - 1];

  switch (action) {
    case 'dispatch': return handleDispatch(event);
    case 'find-run': return handleFindRun(event);
    case 'run-status': return handleRunStatus(event);
    case 'download-artifact': return handleDownloadArtifact(event);
    case 'admin-set-limit': return handleAdminSetLimit(event);
    case 'admin-reset-quota': return handleAdminResetQuota(event);
    default: return { statusCode: 404, body: 'Unknown action: ' + action };
  }
};

function ghHeaders(token) {
  return {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

// ==== trigger build ====
async function handleDispatch(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const token = process.env.GH_TOKEN;
  const owner = process.env.GH_OWNER;
  const repo = process.env.GH_REPO;

  if (!token || !owner || !repo) {
    return { statusCode: 500, body: 'Env var GH_TOKEN/GH_OWNER/GH_REPO belum di-set di Netlify.' };
  }

  const configStore = getStore('config');
  let dailyLimit = DEFAULT_DAILY_LIMIT;
  try {
    const cfg = await configStore.get('dailyLimit', { type: 'json' });
    if (cfg && cfg.value) dailyLimit = cfg.value;
  } catch (e) {}

  const ip = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || 'unknown';
  const today = new Date().toISOString().slice(0, 10);
  const usageKey = ip + ':' + today;
  const store = getStore('usage');

  let count = 0;
  try {
    const existing = await store.get(usageKey, { type: 'json' });
    if (existing && existing.count) count = existing.count;
  } catch (e) {}

  if (count >= dailyLimit) {
    return {
      statusCode: 429,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Limit compile harian (${dailyLimit}x) buat IP kamu udah abis. Coba lagi besok.` })
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
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: 'build_apk', client_payload: payload })
  });

  if (res.status !== 204) {
    const text = await res.text();
    return { statusCode: res.status, body: text };
  }

  await store.setJSON(usageKey, { count: count + 1 });

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
}

// ==== cari run yang baru muncul ====
async function handleFindRun(event) {
  const token = process.env.GH_TOKEN;
  const owner = process.env.GH_OWNER;
  const repo = process.env.GH_REPO;

  const since = event.queryStringParameters && event.queryStringParameters.since;
  if (!since) return { statusCode: 400, body: 'Query param "since" wajib ada.' };

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/runs?event=repository_dispatch&per_page=5`,
    { headers: ghHeaders(token) }
  );
  const data = await res.json();

  const sinceTime = new Date(since).getTime() - 15000;
  const found = (data.workflow_runs || []).find(r => new Date(r.created_at).getTime() >= sinceTime);

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: found ? found.id : null }) };
}

// ==== cek status run ====
async function handleRunStatus(event) {
  const token = process.env.GH_TOKEN;
  const owner = process.env.GH_OWNER;
  const repo = process.env.GH_REPO;

  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) return { statusCode: 400, body: 'Query param "id" wajib ada.' };

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs/${id}`, { headers: ghHeaders(token) });
  const data = await res.json();

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: data.status, conclusion: data.conclusion }) };
}

// ==== download artifact (APK) ====
async function handleDownloadArtifact(event) {
  const token = process.env.GH_TOKEN;
  const owner = process.env.GH_OWNER;
  const repo = process.env.GH_REPO;

  const runId = event.queryStringParameters && event.queryStringParameters.runId;
  if (!runId) return { statusCode: 400, body: 'Query param "runId" wajib ada.' };

  const headers = ghHeaders(token);
  const artRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`, { headers });
  const artData = await artRes.json();
  const artifact = (artData.artifacts || [])[0];

  if (!artifact) return { statusCode: 404, body: 'Artifact gak ketemu (mungkin udah expired).' };

  const zipRes = await fetch(artifact.archive_download_url, { headers });
  const buffer = Buffer.from(await zipRes.arrayBuffer());

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/zip' },
    body: buffer.toString('base64'),
    isBase64Encoded: true
  };
}

// ==== admin: ganti limit harian ====
async function handleAdminSetLimit(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try { body = JSON.parse(event.body); }
  catch (e) { return { statusCode: 400, body: 'Body bukan JSON valid.' }; }

  if (body.password !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Password salah.' }) };
  }

  const limitNum = parseInt(body.limit, 10);
  if (!limitNum || limitNum < 1) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Limit harus angka positif.' }) };
  }

  await getStore('config').setJSON('dailyLimit', { value: limitNum });

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, newLimit: limitNum }) };
}

// ==== admin: reset kuota semua IP ====
async function handleAdminResetQuota(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try { body = JSON.parse(event.body); }
  catch (e) { return { statusCode: 400, body: 'Body bukan JSON valid.' }; }

  if (body.password !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Password salah.' }) };
  }

  const usageStore = getStore('usage');
  const { blobs } = await usageStore.list();

  let deleted = 0;
  for (const b of blobs) {
    await usageStore.delete(b.key);
    deleted++;
  }

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, deleted }) };
}
