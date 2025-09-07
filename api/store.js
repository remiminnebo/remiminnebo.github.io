import { promises as fs } from 'fs';
import { createHmac } from 'crypto';

const STORAGE_FILE = '/tmp/shares.json';
const SECRET_KEY = process.env.SHARE_SECRET;

function createSignature(data) {
  return createHmac('sha256', SECRET_KEY).update(JSON.stringify(data)).digest('hex').substring(0, 16);
}

function verifySignature(data, signature) {
  return createSignature(data) === signature;
}

async function loadShares() {
  try {
    const data = await fs.readFile(STORAGE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function saveShares(shares) {
  try {
    await fs.writeFile(STORAGE_FILE, JSON.stringify(shares));
  } catch (error) {
    console.error('Failed to save shares:', error);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'POST') {
    const { question, answer } = req.body;
    
    // Create signature to prevent tampering
    const data = { question, answer, timestamp: Date.now() };
    const signature = createSignature(data);
    const id = Math.random().toString(36).substring(2, 15);
    
    const shares = await loadShares();
    shares[id] = { ...data, signature };
    await saveShares(shares);
    
    res.status(200).json({ id });
  } else if (req.method === 'GET') {
    const { id } = req.query;
    const shares = await loadShares();
    const conversation = shares[id];
    
    if (conversation) {
      // Verify signature to prevent tampering
      const { signature, ...data } = conversation;
      if (verifySignature(data, signature)) {
        res.status(200).json(data);
      } else {
        res.status(400).json({ error: 'Invalid or tampered conversation' });
      }
    } else {
      res.status(404).json({ error: 'Conversation not found' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}