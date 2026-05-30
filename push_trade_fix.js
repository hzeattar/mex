const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GH_TOKEN;
if (!TOKEN || TOKEN.length < 10) {
  console.error('GH_TOKEN env var not set');
  process.exit(1);
}

const OWNER = 'hzeattar';
const REPO = 'mex';
const BRANCH = 'main';
const BASE = 'C:\\Users\\AM\\Documents\\Codex\\2026-05-06\\files-mentioned-by-the-user-vertexpluse\\mex';
const MESSAGE = 'fix: Restore live trade quotes and mobile order flow';

const keepFiles = [
  'assets/dist/.vite/manifest.json',
  'assets/dist/css/style-IYU3lxA9.css',
  'assets/dist/js/main-43dhkjcl.js',
  'assets/dist/js/trade-Co7Y43EA.js',
  'assets/dist/js/home-eB6dtm2J.js',
  'assets/dist/js/chart-DbDccfIU.js',
  'assets/dist/js/portfolio-BrpZ89Mq.js',
  'assets/dist/js/wallet-1aUAaanW.js',
  'assets/dist/js/invest-Da4AhjUb.js',
  'assets/dist/js/funding-ChltHqdU.js',
  'assets/dist/js/kyc-CShzHI1x.js',
  'assets/dist/js/news-C1DnH56K.js',
  'assets/dist/js/support-QbftvH0a.js',
  'assets/dist/js/account-DKwk2XBw.js',
  'frontend/src/views/trade.js',
  'frontend/src/styles/main.css'
];

function req(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      method,
      headers: {
        Authorization: `token ${TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Verdent-GitData-Push',
        'Content-Type': 'application/json'
      }
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);
    const r = https.request(options, res => {
      let out = '';
      res.on('data', c => out += c);
      res.on('end', () => {
        let parsed;
        try { parsed = out ? JSON.parse(out) : {}; } catch (e) { return reject(new Error(`Bad JSON ${res.statusCode}: ${out.slice(0, 250)}`)); }
        if (res.statusCode >= 400) return reject(new Error(`API ${res.statusCode}: ${JSON.stringify(parsed).slice(0, 400)}`));
        resolve(parsed);
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function getTreeRecursive(treeSha) {
  return req('GET', `/repos/${OWNER}/${REPO}/git/trees/${treeSha}?recursive=1`);
}

async function blobForFile(file) {
  const full = path.join(BASE, file.replace(/\//g, path.sep));
  const content = fs.readFileSync(full, 'utf8');
  const blob = await req('POST', `/repos/${OWNER}/${REPO}/git/blobs`, { content, encoding: 'utf-8' });
  return { path: file, mode: '100644', type: 'blob', sha: blob.sha };
}

async function main() {
  console.log('Fetching branch...');
  const ref = await req('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
  const headSha = ref.object.sha;
  const commit = await req('GET', `/repos/${OWNER}/${REPO}/git/commits/${headSha}`);
  const baseTree = commit.tree.sha;
  const currentTree = await getTreeRecursive(baseTree);

  const keep = new Set(keepFiles);
  const deletions = currentTree.tree
    .filter(item => item.type === 'blob' && /^assets\/dist\/(css|js)\//.test(item.path) && !keep.has(item.path))
    .map(item => ({ path: item.path, mode: '100644', type: 'blob', sha: null }));

  const updates = [];
  for (const file of keepFiles) {
    process.stdout.write(`blob ${file} ... `);
    updates.push(await blobForFile(file));
    console.log('ok');
  }

  console.log(`Deleting stale dist files: ${deletions.length}`);
  deletions.forEach(d => console.log(`delete ${d.path}`));

  const tree = await req('POST', `/repos/${OWNER}/${REPO}/git/trees`, {
    base_tree: baseTree,
    tree: [...updates, ...deletions]
  });

  const newCommit = await req('POST', `/repos/${OWNER}/${REPO}/git/commits`, {
    message: MESSAGE,
    tree: tree.sha,
    parents: [headSha]
  });

  await req('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, { sha: newCommit.sha, force: false });
  console.log(`Pushed ${newCommit.sha}`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
