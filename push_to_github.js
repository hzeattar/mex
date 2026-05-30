// GitHub multi-file push script using Git Trees API
const https = require('https');
const fs = require('fs');

const TOKEN = process.env.GH_TOKEN;
if (!TOKEN || TOKEN.length < 10) {
  console.error('GH_TOKEN env var not set or too short. Length:', TOKEN ? TOKEN.length : 0);
  process.exit(1);
}
console.log('Token obtained, length:', TOKEN.length, 'prefix:', TOKEN.substring(0, 8) + '...');

const OWNER = 'hzeattar';
const REPO = 'mex';
const BRANCH = 'main';
const BASE = 'C:\\Users\\AM\\Documents\\Codex\\2026-05-06\\files-mentioned-by-the-user-vertexpluse\\mex\\';
const COMMIT_MESSAGE = 'feat: Add Vite frontend v2 with Tailwind, SSE streaming, and lazy-loaded routes';

const FILES = [
  'frontend/.gitignore',
  'frontend/package.json',
  'frontend/postcss.config.js',
  'frontend/tailwind.config.js',
  'frontend/vite.config.js',
  'frontend/src/main.js',
  'frontend/src/router.js',
  'frontend/src/components/common/Icons.js',
  'frontend/src/components/layout/Shell.js',
  'frontend/src/services/api.js',
  'frontend/src/services/sse.js',
  'frontend/src/state/store.js',
  'frontend/src/styles/main.css',
  'frontend/src/utils/dom.js',
  'frontend/src/utils/format.js',
  'frontend/src/views/account.js',
  'frontend/src/views/funding.js',
  'frontend/src/views/home.js',
  'frontend/src/views/invest.js',
  'frontend/src/views/kyc.js',
  'frontend/src/views/news.js',
  'frontend/src/views/portfolio.js',
  'frontend/src/views/support.js',
  'frontend/src/views/trade.js',
  'frontend/src/views/wallet.js',
  'api/stream/sse.php',
  'app-v2.php',
  'assets/dist/.vite/manifest.json',
  'assets/dist/css/style-B9cBJs0J.css',
  'assets/dist/js/main-DTI-JlRE.js',
  'assets/dist/js/home-eJmXuQio.js',
  'assets/dist/js/trade-BVVeXFHx.js',
  'assets/dist/js/chart-Bk8T08OE.js',
  'assets/dist/js/account-DChAKLUe.js',
  'assets/dist/js/funding-LF6g1YmF.js',
  'assets/dist/js/invest-BZw7qRHA.js',
  'assets/dist/js/kyc-xGbDby-g.js',
  'assets/dist/js/news-abKyfDPJ.js',
  'assets/dist/js/portfolio-CCaeBVMP.js',
  'assets/dist/js/support-CPOQlzMG.js',
  'assets/dist/js/wallet-QIuRWPda.js',
];

function apiRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      method: method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'NodeJS-Push-Script',
        'Content-Type': 'application/json',
      }
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);
    
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 400) {
            reject(new Error(`API Error ${res.statusCode}: ${JSON.stringify(parsed).substring(0, 300)}`));
          } else {
            resolve(parsed);
          }
        } catch(e) {
          reject(new Error(`Parse error: ${responseData.substring(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // Step 1: Get current branch SHA
  console.log('Step 1: Getting branch info...');
  const branchInfo = await apiRequest('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
  const latestCommitSha = branchInfo.object.sha;
  console.log('Latest commit SHA:', latestCommitSha);

  // Step 2: Get the tree SHA of the latest commit
  console.log('Step 2: Getting commit info...');
  const commitInfo = await apiRequest('GET', `/repos/${OWNER}/${REPO}/git/commits/${latestCommitSha}`);
  const baseTreeSha = commitInfo.tree.sha;
  console.log('Base tree SHA:', baseTreeSha);

  // Step 3: Create blobs for each file and build tree
  console.log('Step 3: Creating blobs and building tree...');
  const treeItems = [];
  
  for (const filePath of FILES) {
    const diskPath = BASE + filePath.replace(/\//g, '\\');
    process.stdout.write(`  [${treeItems.length + 1}/${FILES.length}] ${filePath}... `);
    
    let content;
    try {
      content = fs.readFileSync(diskPath, 'utf8');
    } catch(e) {
      console.log(`SKIP (not found)`);
      continue;
    }
    
    const blob = await apiRequest('POST', `/repos/${OWNER}/${REPO}/git/blobs`, {
      content: content,
      encoding: 'utf-8'
    });
    
    treeItems.push({
      path: filePath,
      mode: '100644',
      type: 'blob',
      sha: blob.sha
    });
    console.log('OK (' + blob.sha.substring(0,8) + ')');
  }

  // Step 4: Create new tree
  console.log(`\nStep 4: Creating tree with ${treeItems.length} files...`);
  const newTree = await apiRequest('POST', `/repos/${OWNER}/${REPO}/git/trees`, {
    base_tree: baseTreeSha,
    tree: treeItems
  });
  console.log('New tree SHA:', newTree.sha);

  // Step 5: Create commit
  console.log('Step 5: Creating commit...');
  const newCommit = await apiRequest('POST', `/repos/${OWNER}/${REPO}/git/commits`, {
    message: COMMIT_MESSAGE,
    tree: newTree.sha,
    parents: [latestCommitSha]
  });
  console.log('New commit SHA:', newCommit.sha);

  // Step 6: Update branch reference
  console.log('Step 6: Updating branch reference...');
  await apiRequest('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
    sha: newCommit.sha,
    force: false
  });

  console.log('\nSUCCESS! All files pushed.');
  console.log('  Repository: https://github.com/' + OWNER + '/' + REPO);
  console.log('  Branch: ' + BRANCH);
  console.log('  Commit: ' + newCommit.sha);
  console.log('  Commit URL: https://github.com/' + OWNER + '/' + REPO + '/commit/' + newCommit.sha);
  console.log('  Files pushed: ' + treeItems.length);
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err.message);
  process.exit(1);
});
