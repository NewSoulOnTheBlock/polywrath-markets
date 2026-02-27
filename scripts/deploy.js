const { ethers } = require('ethers');
const solc = require('solc');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'https://polygon-bor-rpc.publicnode.com';
const PRIVATE_KEY = '0x0ca2f1034c3a82b9276931f0e88be418b85540fc443b6187ad8b270b1fe4f5b7';

// USDC on Polygon (bridged)
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log('Deployer:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('POL Balance:', ethers.formatEther(balance));
  
  // Read contract source
  const contractPath = path.join(__dirname, '..', 'contracts', 'PolyAgentVault.sol');
  const source = fs.readFileSync(contractPath, 'utf8');

  // Read OpenZeppelin dependencies
  const ozBase = path.join(__dirname, '..', 'node_modules', '@openzeppelin', 'contracts');
  
  function findImports(importPath) {
    try {
      if (importPath.startsWith('@openzeppelin/contracts/')) {
        const filePath = path.join(ozBase, importPath.replace('@openzeppelin/contracts/', ''));
        return { contents: fs.readFileSync(filePath, 'utf8') };
      }
      return { error: 'File not found: ' + importPath };
    } catch (e) {
      return { error: 'File not found: ' + importPath };
    }
  }

  console.log('Compiling contract...');
  
  const input = {
    language: 'Solidity',
    sources: {
      'PolyAgentVault.sol': { content: source }
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode.object'] }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  
  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      console.error('Compilation errors:');
      errors.forEach(e => console.error(e.formattedMessage));
      process.exit(1);
    }
    // Print warnings
    output.errors.filter(e => e.severity === 'warning').forEach(e => console.warn('Warning:', e.message));
  }

  const contract = output.contracts['PolyAgentVault.sol']['PolyAgentVault'];
  const abi = contract.abi;
  const bytecode = '0x' + contract.evm.bytecode.object;

  console.log('Compiled! Bytecode size:', bytecode.length / 2, 'bytes');

  // Deploy
  console.log('Deploying to Polygon...');
  console.log('Constructor args:');
  console.log('  USDC:', USDC_ADDRESS);
  console.log('  Agent:', wallet.address);
  console.log('  Fee Collector:', wallet.address);

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  
  // Get gas price
  const feeData = await provider.getFeeData();
  console.log('Gas price:', ethers.formatUnits(feeData.gasPrice || 0n, 'gwei'), 'gwei');

  const deployTx = await factory.deploy(
    USDC_ADDRESS,      // _usdc
    wallet.address,    // _agent (deployer is agent for now)
    wallet.address,    // _feeCollector (deployer collects fees for now)
    {
      gasPrice: feeData.gasPrice,
    }
  );

  console.log('Deploy tx:', deployTx.deploymentTransaction().hash);
  console.log('Waiting for confirmation...');

  await deployTx.waitForDeployment();
  const address = await deployTx.getAddress();

  console.log('\n========================================');
  console.log('PolyAgentVault deployed!');
  console.log('Contract:', address);
  console.log('Network: Polygon Mainnet');
  console.log('Explorer: https://polygonscan.com/address/' + address);
  console.log('========================================\n');

  // Save deployment info
  const deployInfo = {
    contract: 'PolyAgentVault',
    address,
    network: 'polygon',
    chainId: 137,
    deployer: wallet.address,
    agent: wallet.address,
    feeCollector: wallet.address,
    usdc: USDC_ADDRESS,
    txHash: deployTx.deploymentTransaction().hash,
    deployedAt: new Date().toISOString(),
    abi,
  };

  const outPath = path.join(__dirname, '..', 'deployment.json');
  fs.writeFileSync(outPath, JSON.stringify(deployInfo, null, 2));
  console.log('Deployment info saved to deployment.json');
}

main().catch(err => {
  console.error('Deploy failed:', err.message);
  process.exit(1);
});
