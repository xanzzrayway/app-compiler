exports.handler = async (event) => {
  const token = process.env.GH_TOKEN;
  const owner = process.env.GH_OWNER;
  const repo = process.env.GH_REPO;

  const runId = event.queryStringParameters && event.queryStringParameters.runId;
  if (!runId) {
    return { statusCode: 400, body: 'Query param "runId" wajib ada.' };
  }

  const ghHeaders = {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  const artRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`,
    { headers: ghHeaders }
  );
  const artData = await artRes.json();
  const artifact = (artData.artifacts || [])[0];

  if (!artifact) {
    return { statusCode: 404, body: 'Artifact gak ketemu (mungkin udah expired).' };
  }

  const zipRes = await fetch(artifact.archive_download_url, { headers: ghHeaders });
  const arrayBuffer = await zipRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/zip' },
    body: buffer.toString('base64'),
    isBase64Encoded: true
  };
};
