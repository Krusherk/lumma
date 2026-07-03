/**
 * Generate the entity secret ciphertext for Circle registration.
 * 
 * Usage:
 *   ENTITY_SECRET=<32-byte-hex> CIRCLE_API_KEY=<key> node scripts/register-entity-secret.mjs
 *
 * Secrets are read from environment variables — never hardcode them.
 */
import crypto from 'crypto';

const ENTITY_SECRET = process.env.ENTITY_SECRET;
const API_KEY = process.env.CIRCLE_API_KEY;

if (!ENTITY_SECRET || !API_KEY) {
  console.error('Missing required env vars. Set ENTITY_SECRET and CIRCLE_API_KEY before running.');
  console.error('Example: ENTITY_SECRET=<hex> CIRCLE_API_KEY=<key> node scripts/register-entity-secret.mjs');
  process.exit(1);
}

async function main() {

  // 1. Fetch Circle's entity public key
  console.log('Fetching Circle public key...');
  const res = await fetch('https://api.circle.com/v1/w3s/config/entity/publicKey', {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  const json = await res.json();
  
  if (!json.data?.publicKey) {
    console.error('Failed to fetch public key:', JSON.stringify(json, null, 2));
    process.exit(1);
  }
  
  const publicKey = json.data.publicKey;
  console.log('Got public key ✓');

  // 2. Encrypt the entity secret with RSA-OAEP
  const entitySecretBuf = Buffer.from(ENTITY_SECRET, 'hex'); // 32 bytes
  
  const encryptedBuf = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    entitySecretBuf
  );
  
  const ciphertext = encryptedBuf.toString('base64');
  
  console.log('\n=== ENTITY SECRET CIPHERTEXT (paste into Circle dashboard) ===\n');
  console.log(ciphertext);
  console.log(`\nLength: ${ciphertext.length} characters`);
  console.log('\n=== ENTITY_SECRET for Vercel env var ===\n');
  console.log(ENTITY_SECRET);
  console.log('\nDone! Copy the ciphertext above and paste it into Circle\'s Entity Secret registration page.');
}

main().catch(err => { console.error(err); process.exit(1); });
