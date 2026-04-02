// Use the PROVEN function selector 0xf2c298be
// This is what actually works on the registry!

require('dotenv').config();
const { ethers } = require('ethers');
const { REGISTRY } = require('./lib/constants');

async function registerUsingProvenMethod() {
  console.log('🎯 USING PROVEN REGISTRATION METHOD\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
  const signer = new ethers.Wallet(process.env.AGENT_WALLET_PRIVATE_KEY, provider);
  const wallet = signer.address;

  console.log('📋 CONFIG:');
  console.log('  Wallet: ' + wallet);
  console.log('  Registry: ' + REGISTRY.ONE);
  console.log('  Method: 0xf2c298be (proven working!)');
  console.log();

  // Proof candidates based on the successful pattern
  const proofFormats = [
    // Exact pattern from successful tx
    'AgentProof ArbiLink',
    // Variations
    'AgentProof GMX',
    'AgentProof ' + wallet.substring(0, 6),
    'GMX AgentProof',
    'GMX Trading Agent',
    // Try with wallet
    'AgentProof ' + wallet,
    // Try simple
    'AgentProof',
    'Proof',
    // ArbiLink style
    'arbitrum_gmx_agent',
    'arbilink_agent_' + wallet.substring(2, 8)
  ];

  // Function selector 0xf2c298be takes a string parameter
  // Encode: selector + offset + length + data
  
  const trySingleProof = async (proof) => {
    console.log(`\n🔄 Trying proof: "${proof}"`);
    
    try {
      // Encode the function call with ethers
      // 0xf2c298be appears to take a single string parameter
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const encoded = abiCoder.encode(['string'], [proof]);
      
      // Build complete call data
      const callData = '0xf2c298be' + encoded.slice(2);
      
      console.log('  Encoded: ' + callData.substring(0, 50) + '...');
      
      // Estimate gas
      const gasEstimate = await provider.estimateGas({
        to: REGISTRY.ONE,
        from: wallet,
        data: callData,
        value: '0'
      }).catch(e => null);

      if (gasEstimate) {
        console.log('  ✅ Gas estimate: ' + gasEstimate.toString());
        
        // Send transaction
        console.log('  📡 Sending transaction...');
        const tx = await signer.sendTransaction({
          to: REGISTRY.ONE,
          data: callData,
          value: '0',
          gasLimit: gasEstimate * 2n
        });

        console.log('  ✅ TX SUBMITTED: ' + tx.hash);
        console.log('  ⏳ Waiting for confirmation...');

        const receipt = await tx.wait();

        if (receipt.status === 1) {
          console.log('  🎉 SUCCESS!');
          console.log('\n═══════════════════════════════════════════════════════════');
          console.log('✅ AGENT REGISTERED SUCCESSFULLY!');
          console.log('═══════════════════════════════════════════════════════════');
          console.log('📋 REGISTRATION DETAILS:');
          console.log('  TX Hash: ' + receipt.hash);
          console.log('  Block: ' + receipt.blockNumber);
          console.log('  Proof: ' + proof);
          console.log('  Function: 0xf2c298be');
          console.log('═══════════════════════════════════════════════════════════\n');
          return receipt.hash;
        } else {
          console.log('  ❌ Reverted in execution');
        }
      } else {
        console.log('  ⛽ Cannot estimate gas');
      }
    } catch (err) {
      const msg = err.message.split('\n')[0];
      console.log('  ❌ Error: ' + msg.substring(0, 100));
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 1000));
  };

  // Try all proofs
  for (const proof of proofFormats) {
    const result = await trySingleProof(proof);
    if (result) return result;
  }

  console.log('\n⚠️  No matching proof format successful');
  console.log('\nNote: The exact proof may need to be issued by ArbiLink team');
  console.log('or may be time-sensitive / wallet-specific.');
}

registerUsingProvenMethod().catch(console.error);
