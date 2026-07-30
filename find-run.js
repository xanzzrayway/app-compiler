exports.handler = async (event) => {
  const token = process.env.GH_TOKEN;
  const owner = process.env.GH_OWNER;
  const repo = process.env.GH_REPO;

  const since = event.queryStringParameters && event.queryStringParameters.since;
  if (!since) {
    return { statusCode: 400, body: 'Query param "since" wajib ada.' };
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/runs?event=repository_dispatch&per_page=5`,
    {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  );
  const data = await res.json();

  const sinceTime = new Date(since).getTime() - 15000;
  const found = (data.workflow_runs || []).find(r => new Date(r.created_at).getTime() >= sinceTime);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId: found ? found.id : null })
  };
};
