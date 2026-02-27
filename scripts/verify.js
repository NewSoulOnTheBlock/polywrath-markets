const fs = require('fs');
const path = require('path');

const API_KEY = 'RJBXN5FTSSH7WNEFNZ7EJQQ4RUREFIPUFB';
const CONTRACT = '0xb21285c26E2b1BcA2c85a41Ab524B5278beF779E';
const CONSTRUCTOR_ARGS = '0000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa841740000000000000000000000001062986fdc207ad058f0a1d75622bb2616594c110000000000000000000000001062986fdc207ad058f0a1d75622bb2616594c11';

// Recursively resolve all imports
function resolveImports(filePath, basePath, sources, visited = new Set()) {
  const absPath = filePath.startsWith('@') 
    ? path.join(basePath, 'node_modules', filePath)
    : path.join(basePath, filePath);
  
  if (visited.has(filePath)) return;
  visited.add(filePath);

  const content = fs.readFileSync(absPath, 'utf8');
  sources[filePath] = { content };

  // Find all imports
  const importRegex = /import\s+.*?["'](.+?)["']/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    let importPath = match[1];
    
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      // Relative import - resolve relative to current file's directory
      const dir = path.dirname(filePath.startsWith('@') ? filePath : filePath);
      importPath = path.posix.normalize(path.posix.join(dir, importPath));
    }
    
    resolveImports(importPath, basePath, sources, visited);
  }
}

async function verify() {
  const basePath = path.join(__dirname, '..');
  const sources = {};
  
  console.log('Resolving imports...');
  // Deploy script used 'PolyAgentVault.sol' as source key, not 'contracts/...'
  const mainSource = fs.readFileSync(path.join(basePath, 'contracts', 'PolyAgentVault.sol'), 'utf8');
  sources['PolyAgentVault.sol'] = { content: mainSource };
  
  // Resolve imports from the main source
  const importRegex = /import\s+.*?["'](.+?)["']/g;
  let match;
  const visited = new Set(['PolyAgentVault.sol']);
  function addImports(content, currentFile) {
    const regex = /import\s+.*?["'](.+?)["']/g;
    let m;
    while ((m = regex.exec(content)) !== null) {
      let imp = m[1];
      
      // Resolve relative imports
      if (imp.startsWith('./') || imp.startsWith('../')) {
        const dir = path.posix.dirname(currentFile);
        imp = path.posix.normalize(path.posix.join(dir, imp));
      }
      
      if (visited.has(imp)) continue;
      visited.add(imp);
      
      let absPath;
      if (imp.startsWith('@')) {
        absPath = path.join(basePath, 'node_modules', imp);
      } else {
        absPath = path.join(basePath, 'node_modules', imp);
      }
      
      const c = fs.readFileSync(absPath, 'utf8');
      sources[imp] = { content: c };
      addImports(c, imp);
    }
  }
  addImports(mainSource, 'PolyAgentVault.sol');
  
  console.log(`Found ${Object.keys(sources).length} source files:`);
  Object.keys(sources).forEach(k => console.log(`  ${k}`));

  const input = {
    language: "Solidity",
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
    }
  };

  console.log('\nSubmitting verification to Polygonscan V2...');
  
  const params = new URLSearchParams();
  params.append('apikey', API_KEY);
  params.append('module', 'contract');
  params.append('action', 'verifysourcecode');
  params.append('contractaddress', CONTRACT);
  params.append('sourceCode', JSON.stringify(input));
  params.append('codeformat', 'solidity-standard-json-input');
  params.append('contractname', 'PolyAgentVault.sol:PolyAgentVault');
  params.append('compilerversion', 'v0.8.20+commit.a1b79de6');
  params.append('optimizationUsed', '1');
  params.append('runs', '200');
  params.append('constructorArguements', CONSTRUCTOR_ARGS);
  params.append('licenseType', '3');

  const res = await fetch('https://api.etherscan.io/v2/api?chainid=137', {
    method: 'POST',
    body: params,
  });
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));

  if (data.status === '1' && data.result) {
    const guid = data.result;
    console.log(`\nGUID: ${guid}`);
    
    for (let i = 0; i < 6; i++) {
      console.log(`Checking status (attempt ${i+1}/6)...`);
      await new Promise(r => setTimeout(r, 10000));
      
      const checkRes = await fetch(`https://api.etherscan.io/v2/api?chainid=137&apikey=${API_KEY}&module=contract&action=checkverifystatus&guid=${guid}`);
      const checkData = await checkRes.json();
      console.log('Status:', JSON.stringify(checkData, null, 2));
      
      if (checkData.result && !checkData.result.includes('Pending')) break;
    }
  }
}

verify().catch(console.error);
