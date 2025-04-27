import axios from 'axios';
import fs from 'fs';
import path from 'path';

// This is your serverless function handler
export default async function handler(req, res) {
  const { message, email } = req.body;

  // Your message tracking logic can go here
  // If you're saving messages, store them in a database (Not in local files)

  const BLOCK_TIME = 20 * 60 * 1000;
  const MAX_MESSAGES = 20;
  
  const messagesFile = path.join(process.cwd(), 'messages.json');

  const userStats = {
    count: 0, // Track message count for the user
    blockTime: 0
  };

  // Replace this with actual file/database storage logic

  if (userStats.blockTime > Date.now()) {
    return res.status(403).json({ reply: "You are temporarily blocked. Try again later." });
  }

  if (userStats.count >= MAX_MESSAGES) {
    userStats.blockTime = Date.now() + BLOCK_TIME;
    userStats.count = 0;
    return res.status(200).json({ reply: "safi gayrha 😁😂😂" });
  }

  // Call Gemini API (same as your existing code)
  const reply = await getGeminiResponse(message);

  res.json({ reply });
}

async function getGeminiResponse(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const body = { contents: [{ parts: [{ text: prompt }] }] };
  const headers = { 'Content-Type': 'application/json' };

  try {
    const response = await axios.post(url, body, { headers });
    return response.data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
  } catch (error) {
    console.error("Error with Gemini API:", error);
    return "Sorry, I am unable to generate a response at the moment.";
  }
}
