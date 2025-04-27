import 'dotenv/config';               // auto-loads .env
import axios from 'axios';

let messageHistory = [];              // in-memory storage (non-persistent)

// Call Gemini API
async function getGeminiResponse(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const body = { contents: [{ parts: [{ text: prompt }] }] };
  try {
    const res = await axios.post(url, body, { headers: { 'Content-Type': 'application/json' } });
    return res.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
  } catch (e) {
    console.error('Gemini error:', e);
    return 'Sorry, cannot generate response right now.';
  }
}

// Serverless handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email = 'Unknown', message } = req.body;
  if (typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  // track in memory
  messageHistory.push({ email, message, timestamp: new Date().toISOString() });

  // get AI reply
  const reply = await getGeminiResponse(message);
  res.status(200).json({ reply });
}
