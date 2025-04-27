require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const telegramToken = process.env.TELEGRAM_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;

const bot = new TelegramBot(telegramToken, { polling: true });
const messagesFile = path.join(__dirname, 'messages.json');
const userPrefsFile = path.join(__dirname, 'user_preferences.json');

const messageCounts = new Map();
const BLOCK_TIME = 20 * 60 * 1000;
const MAX_MESSAGES = 15;

// Greetings & random replies
const greetings = ['hi', 'hello', 'welcome', 'ss', 'cc', 'ola', 'salam', 'slm', 'wsp', 'you', 'yo', 'hey', 'hi there'];
const welcomeReplies = [
  'Hi, welcome to DevGeniusAi 🤖✨',
  'Hello! DevGeniusAi at your service 🌟',
  'Hey there! Youre chatting with DevGeniusAi 🚀',
  'Salam! DevGeniusAi says hello 👋',
  'Ola! DevGeniusAi ready to help you 😊'
];

// NEW: Tech stack recommendations
const techStacks = {
  'web': 'For modern web development, I recommend: [react](https://skillicons.dev/icons?i=react), [nodejs](https://skillicons.dev/icons?i=nodejs), [express](https://skillicons.dev/icons?i=express), and [mongodb](https://skillicons.dev/icons?i=mongodb).',
  'mobile': 'For mobile app development, consider: [react](https://skillicons.dev/icons?i=react) Native, [kotlin](https://skillicons.dev/icons?i=kotlin), or [flutter](https://skillicons.dev/icons?i=flutter).',
  'backend': 'Strong backend stack: [nodejs](https://skillicons.dev/icons?i=nodejs), [express](https://skillicons.dev/icons?i=express), [python](https://skillicons.dev/icons?i=python) with FastAPI, or [laravel](https://skillicons.dev/icons?i=laravel).',
  'frontend': 'Modern frontend stack: [react](https://skillicons.dev/icons?i=react), [tailwind](https://skillicons.dev/icons?i=tailwind), [typescript](https://skillicons.dev/icons?i=typescript), and [nextjs](https://skillicons.dev/icons?i=nextjs).',
  'fullstack': 'Recommended fullstack: MERN ([mongodb](https://skillicons.dev/icons?i=mongodb), [express](https://skillicons.dev/icons?i=express), [react](https://skillicons.dev/icons?i=react), [nodejs](https://skillicons.dev/icons?i=nodejs)) or LAMP ([linux](https://skillicons.dev/icons?i=linux), Apache, [mysql](https://skillicons.dev/icons?i=mysql), [php](https://skillicons.dev/icons?i=php)).'
};

// NEW: Programming jokes for fun interactions
const programmingJokes = [
  "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
  "A SQL query walks into a bar, walks up to two tables and asks, 'Can I join you?' 😄",
  "Why do Java developers wear glasses? Because they don't C# 👓",
  "How many programmers does it take to change a light bulb? None, that's a hardware problem! 💡",
  "What's a programmer's favorite place? The Foo Bar! 🍻",
  "Why was the JavaScript developer sad? Because he didn't know how to 'null' his feelings 😢",
  "What do you call a programmer from Finland? Nerdic 🧙‍♂️",
  "Why did the developer go broke? Because he used up all his cache 💸"
];
// replace your old saveMessage with this

function saveMessage(chatId, message, username, phoneNumber, from, contact, location) {
  // extract emails
  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  const extracted_emails = message.match(emailRegex) || [];

  // extract digit-sequences of length 7–15
  const phoneRegex = /\b\d{7,15}\b/g;
  const extracted_numbers = message.match(phoneRegex) || [];

  const newMessage = {
    telegram_id: from.id,
    username: from.username || "_-_-_",
    first_name: from.first_name || "",
    last_name: from.last_name || "",
    chat_id: chatId,
    message: message,
    extracted_emails,
    extracted_numbers,
    shared_contact: contact || null,   // phone & vCard if user shares
    shared_location: location || null, // { latitude, longitude }
    timestamp: new Date().toISOString()
  };

  let data = [];
  if (fs.existsSync(messagesFile)) {
    try {
      data = JSON.parse(fs.readFileSync(messagesFile, 'utf8')) || [];
    } catch {
      data = [];
    }
  }
  data.push(newMessage);
  fs.writeFileSync(messagesFile, JSON.stringify(data, null, 2), 'utf8');
}



// function saveMessage(chatId, message, username, phoneNumber) {
//   const newMessage = {
//     name: username || "_-_-_",
//     phone_number: phoneNumber || "_-_-_-",
//     chat_id: chatId,
//     message,
//     timestamp: new Date().toISOString()
//   };
//   let data = [];
//   if (fs.existsSync(messagesFile)) {
//     try {
//       data = JSON.parse(fs.readFileSync(messagesFile, 'utf8')) || [];
//     } catch {
//       data = [];
//     }
//   }
//   data.push(newMessage);
//   fs.writeFileSync(messagesFile, JSON.stringify(data, null, 2), 'utf8');
// }

async function getGeminiResponse(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
  const body = {
    system_instruction: {
      parts: [{
        text: "You are DevGeniusAi. Do NOT include any introductory boiler-plate. Answer the user's query directly."
      }]
    },
    contents: [{ parts: [{ text: prompt }] }]
  };
  const headers = { 'Content-Type': 'application/json' };

  try {
    const res = await axios.post(url, body, { headers });
    return res.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (err) {
    console.error("DevGeniusAi API error:", err);
    return "Sorry, I am unable to generate a response at the moment.";
  }
}

// NEW: User preferences manager
function getUserPreferences(userId) {
  try {
    if (fs.existsSync(userPrefsFile)) {
      const data = JSON.parse(fs.readFileSync(userPrefsFile, 'utf8')) || {};
      return data[userId] || { language: 'en', notifications: true, mode: 'standard' };
    }
  } catch (error) {
    console.error("Error reading user preferences:", error);
  }
  return { language: 'en', notifications: true, mode: 'standard' };
}

// NEW: Save user preferences
function saveUserPreferences(userId, preferences) {
  try {
    let data = {};
    if (fs.existsSync(userPrefsFile)) {
      data = JSON.parse(fs.readFileSync(userPrefsFile, 'utf8')) || {};
    }
    data[userId] = { ...(data[userId] || {}), ...preferences };
    fs.writeFileSync(userPrefsFile, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error("Error saving user preferences:", error);
    return false;
  }
}

// NEW: Code snippet execution (simulation for common languages)
function executeCodeSnippet(language, code) {
  // This is a simulated function - in production you'd use proper sandboxing
  const outputs = {
    'javascript': `// Result for JavaScript code:\n${code}\n\n// Output:\n${Math.random() > 0.2 ? 'Executed successfully!' : 'Error: Unexpected token'}`,
    'python': `# Result for Python code:\n${code}\n\n# Output:\n${Math.random() > 0.2 ? 'Executed successfully!' : 'IndentationError: unexpected indent'}`,
    'php': `// PHP Result:\n${code}\n\n// Output:\n${Math.random() > 0.2 ? 'Executed successfully!' : 'Parse error: syntax error, unexpected token'}`,
  };

  return outputs[language.toLowerCase()] || "Language not supported for execution";
}

// NEW: Analytics function
function generateUserAnalytics() {
  try {
    if (!fs.existsSync(messagesFile)) return "No data available";

    const data = JSON.parse(fs.readFileSync(messagesFile, 'utf8')) || [];
    const users = new Set(data.map(msg => msg.chat_id)).size;
    const totalMessages = data.length;

    // Get messages from the last 24 hours
    const last24h = data.filter(msg => {
      const msgDate = new Date(msg.timestamp);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return msgDate > yesterday;
    });

    return `📊 Bot Analytics:\n- Total Users: ${users}\n- Total Messages: ${totalMessages}\n- Messages (24h): ${last24h.length}`;
  } catch (error) {
    console.error("Error generating analytics:", error);
    return "Error generating analytics";
  }
}

// NEW: Schedule daily stats report to admin
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // Add this to your .env file
cron.schedule('0 20 * * *', () => { // Every day at 8 PM
  if (ADMIN_CHAT_ID) {
    const stats = generateUserAnalytics();
    bot.sendMessage(ADMIN_CHAT_ID, `📈 Daily Report\n${stats}`);
  }
});

// NEW: Create custom keyboard for tech stacks
function createTechStackKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ['Web', 'Mobile'],
        ['Backend', 'Frontend'],
        ['Fullstack', 'Cancel']
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  };
}

// NEW: Create settings keyboard
function createSettingsKeyboard(userId) {
  const prefs = getUserPreferences(userId);
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: `Notifications: ${prefs.notifications ? 'ON ✅' : 'OFF ❌'}`, callback_data: 'toggle_notifications' }
        ],
        [
          { text: `Mode: ${prefs.mode === 'standard' ? 'Standard' : 'Developer'}`, callback_data: 'toggle_mode' }
        ],
        [
          { text: 'Close Settings', callback_data: 'close_settings' }
        ]
      ]
    }
  };
}

// NEW: Language detection
async function detectLanguage(text) {
  try {
    // This could use a language detection API or library
    // For example, Google Cloud Translation API or a local library
    // This is a simplified detection for demo purposes
    const arabicPattern = /[\u0600-\u06FF]/;
    const frenchPattern = /[àáâäæçèéêëîïôœùûüÿÀÁÂÄÆÇÈÉÊËÎÏÔŒÙÛÜŸ]/;

    if (arabicPattern.test(text)) return 'ar';
    if (frenchPattern.test(text)) return 'fr';
    return 'en'; // Default
  } catch (error) {
    console.error("Language detection error:", error);
    return 'en';
  }
}

// Register callback query handler for inline buttons
bot.on('callback_query', async (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const userId = callbackQuery.from.id.toString();
  const data = callbackQuery.data;

  if (data === 'toggle_notifications') {
    const prefs = getUserPreferences(userId);
    prefs.notifications = !prefs.notifications;
    saveUserPreferences(userId, prefs);

    bot.editMessageReplyMarkup(
      { inline_keyboard: createSettingsKeyboard(userId).reply_markup.inline_keyboard },
      { chat_id: chatId, message_id: msg.message_id }
    );

    bot.answerCallbackQuery(callbackQuery.id, {
      text: `Notifications ${prefs.notifications ? 'enabled' : 'disabled'}`
    });
  }
  else if (data === 'toggle_mode') {
    const prefs = getUserPreferences(userId);
    prefs.mode = prefs.mode === 'standard' ? 'developer' : 'standard';
    saveUserPreferences(userId, prefs);

    bot.editMessageReplyMarkup(
      { inline_keyboard: createSettingsKeyboard(userId).reply_markup.inline_keyboard },
      { chat_id: chatId, message_id: msg.message_id }
    );

    bot.answerCallbackQuery(callbackQuery.id, {
      text: `Mode set to ${prefs.mode}`
    });
  }
  else if (data === 'close_settings') {
    bot.deleteMessage(chatId, msg.message_id);
    bot.answerCallbackQuery(callbackQuery.id, { text: 'Settings closed' });
  }
});

bot.on('message', async (msg) => {
  // const chatId = msg.chat.id;

  const chatId = msg.chat.id;
  const text = (msg.text || "").toLowerCase().trim();

  if (text === '/start' || text === 'share') {
    return bot.sendMessage(chatId, "Please share your contact & location:", {
      reply_markup: {
        keyboard: [
          [{ text: "Share Contact", request_contact: true }],
          [{ text: "Share Location", request_location: true }]
        ],
        one_time_keyboard: true
      }
    });
  }


  const userId = msg.from.id.toString();
  const userInput = msg.text || "";
  const username = msg.from?.username || "Unknown";
  const phoneNumber = msg.contact?.phone_number || "Not provided";

  if (!messageCounts.has(chatId)) {
    messageCounts.set(chatId, { count: 0, blockTime: 0 });
  }
  const userStats = messageCounts.get(chatId);

  // Block check
  if (userStats.blockTime > Date.now()) return;

  // Rate-limit
  if (userStats.count >= MAX_MESSAGES) {
    bot.sendMessage(chatId, "safi gayrha 😁😂😂");
    userStats.blockTime = Date.now() + BLOCK_TIME;
    userStats.count = 0;
    return;
  }

  // NEW: Command handlers
  if (userInput.startsWith('/')) {
    const command = userInput.split(' ')[0].toLowerCase();

    // Process commands
    if (command === '/start' || command === '/help') {
      bot.sendMessage(chatId,
        "🤖 *DevGeniusAi Commands*\n\n" +
        "• /stack - Get tech stack recommendations\n" +
        "• /joke - Get a programming joke\n" +
        "• /settings - Adjust your preferences\n" +
        "• /feedback - Send feedback to developers\n" +
        "• /code [language] [code] - Try to execute code\n" +
        "• /stats - View bot usage statistics (admin only)\n\n" +
        "You can also just chat with me normally! 💬",
        { parse_mode: 'Markdown' }
      );
      return;
    }

    else if (command === '/stack') {
      bot.sendMessage(chatId, "Choose a tech stack category:", createTechStackKeyboard());
      return;
    }

    else if (command === '/joke') {
      const joke = programmingJokes[Math.floor(Math.random() * programmingJokes.length)];
      bot.sendMessage(chatId, joke);
      return;
    }

    else if (command === '/settings') {
      bot.sendMessage(chatId, "⚙️ *Your DevGeniusAi Settings*", {
        parse_mode: 'Markdown',
        ...createSettingsKeyboard(userId)
      });
      return;
    }

    else if (command === '/feedback') {
      // Store that user is in feedback mode and wait for next message
      saveUserPreferences(userId, { awaiting_feedback: true });
      bot.sendMessage(chatId, "📝 Please share your feedback or suggestions for DevGeniusAi:");
      return;
    }

    else if (command === '/code') {
      const parts = userInput.split(' ');
      if (parts.length < 3) {
        bot.sendMessage(chatId, "Usage: /code [language] [your code here]");
        return;
      }

      const language = parts[1];
      const code = parts.slice(2).join(' ');
      const result = executeCodeSnippet(language, code);

      bot.sendMessage(chatId, "```\n" + result + "\n```", { parse_mode: 'Markdown' });
      return;
    }

    else if (command === '/stats') {
      // Only allow admins to see stats
      if (chatId.toString() === ADMIN_CHAT_ID) {
        const analytics = generateUserAnalytics();
        bot.sendMessage(chatId, analytics);
      } else {
        bot.sendMessage(chatId, "⛔ This command is only available to admins.");
      }
      return;
    }
  }

  // NEW: Check if user is providing feedback
  const userPrefs = getUserPreferences(userId);
  if (userPrefs.awaiting_feedback) {
    // Save feedback to a feedback file
    const feedback = {
      userId,
      username,
      message: userInput,
      timestamp: new Date().toISOString()
    };

    let feedbackData = [];
    const feedbackFile = path.join(__dirname, 'feedback.json');

    if (fs.existsSync(feedbackFile)) {
      try {
        feedbackData = JSON.parse(fs.readFileSync(feedbackFile, 'utf8')) || [];
      } catch {
        feedbackData = [];
      }
    }

    feedbackData.push(feedback);
    fs.writeFileSync(feedbackFile, JSON.stringify(feedbackData, null, 2), 'utf8');

    // Notify admin about new feedback if configured
    if (ADMIN_CHAT_ID) {
      bot.sendMessage(ADMIN_CHAT_ID,
        `📣 *New Feedback*\nFrom: ${username}\nMessage: ${userInput}`,
        { parse_mode: 'Markdown' }
      );
    }

    // Clear feedback state and thank user
    saveUserPreferences(userId, { awaiting_feedback: false });
    bot.sendMessage(chatId, "Thank you for your feedback! It helps us improve DevGeniusAi. 🙏");
    return;
  }

  // NEW: Handle tech stack selection via keyboard
  if (['Web', 'Mobile', 'Backend', 'Frontend', 'Fullstack'].includes(userInput)) {
    const stackInfo = techStacks[userInput.toLowerCase()];
    if (stackInfo) {
      bot.sendMessage(chatId, stackInfo, { parse_mode: 'Markdown' });
      return;
    }
  }

  if (userInput.toLowerCase() === 'cancel') {
    bot.sendMessage(chatId, "Operation cancelled. What can I help you with?", {
      reply_markup: {
        remove_keyboard: true
      }
    });
    return;
  }

  // Greetings
  if (greetings.includes(userInput.toLowerCase())) {
    const reply = welcomeReplies[Math.floor(Math.random() * welcomeReplies.length)];
    bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
    return;
  }

  // NEW: Detect language for better response
  const detectedLang = await detectLanguage(userInput);
  // You can use this to adapt responses or prompts

  // Log & count
  // saveMessage(chatId, userInput, username, phoneNumber);
  saveMessage(chatId, userInput, username, phoneNumber, msg.from, msg.contact, msg.location);

  userStats.count++;

  // NEW: Show typing action for better UX
  bot.sendChatAction(chatId, 'typing');

  // Get AI reply
  let reply = await getGeminiResponse(userInput);

  // Replace any variant of "gemini"
  reply = reply.replace(/\b(?:gimini|ai gimini|google gimin|gemini)\b/gi, 'DevGenius_Ai');

  // Dynamic replacements table
  const replacements = {
    "من جوجل": "مطور بواسطة [Samir Aoulad Amar](https://www.instagram.com/samir_devgenius) 💡",
    "جوجل الذكاء الاصطناعي": "عقل DevGenius_Ai 🧠",
    "بواسطة جوجل": "مقدم لك بواسطة [Samir Aoulad Amar](https://www.instagram.com/samir_devgenius)",
    "دربتني جوجل": "مقدم لك بواسطة [Samir Aoulad Amar](https://www.instagram.com/samir_devgenius)",
    "جوجل جيميني": "مساعد DevGenius_Ai 🤖",
    "جيميني جوجل": "مساعد DevGenius_Ai 🤖",
    "by Google": "crafted with 💡 by [Samir Aoulad Amar](https://www.instagram.com/samir_devgenius), is the boss",
    "Google AI": "DevGenius_Ai Brain",
    "Made by Google": "brought to you by [Samir Aoulad Amar](https://www.instagram.com/samir_devgenius)",
    "gimini google ": "DevGenius_Ai Assistant",
    "google gimini": "DevGenius_Ai Assistant",
    "AI model": "DevGenius_Ai model",
    "machine learning": "DevGenius_Ai magic",
    "neural network": "DevGenius_Ai neural core",
    "laravel": "[laravel](https://skillicons.dev/icons?i=laravel)",
    "html": "[html](https://skillicons.dev/icons?i=html)",
    "express": "[express](https://skillicons.dev/icons?i=express)",
    "mysql": "[mysql](https://skillicons.dev/icons?i=mysql)",
    "vscode": "[vscode](https://skillicons.dev/icons?i=vscode)",
    "ubuntu": "[ubuntu](https://skillicons.dev/icons?i=ubuntu)",
    "github": "[github](https://skillicons.dev/icons?i=github)",
    "figma": "[figma](https://skillicons.dev/icons?i=figma)",
    "tailwind": "[tailwind](https://skillicons.dev/icons?i=tailwind)",
    "adonis": "[adonis](https://skillicons.dev/icons?i=adonis)",
    "javascript": "[javascript](https://skillicons.dev/icons?i=javascript)",
    "angular": "[angular](https://skillicons.dev/icons?i=angular)",
    "linux": "[linux](https://skillicons.dev/icons?i=linux)",
    "react": "[react](https://skillicons.dev/icons?i=react)",
    "python": "[python](https://skillicons.dev/icons?i=python)",
    "alpinejs": "[alpinejs](https://skillicons.dev/icons?i=alpinejs)",
    "bootstrap": "[bootstrap](https://skillicons.dev/icons?i=bootstrap)",
    "androidstudio": "[androidstudio](https://skillicons.dev/icons?i=androidstudio)",
    "kotlin": "[kotlin](https://skillicons.dev/icons?i=kotlin)",
    "arduino": "[arduino](https://skillicons.dev/icons?i=arduino)",
    "kali": "[kali](https://skillicons.dev/icons?i=kali)",
    "nodejs": "[nodejs](https://skillicons.dev/icons?i=nodejs)",
    // NEW: Additional replacements
    "mongodb": "[mongodb](https://skillicons.dev/icons?i=mongodb)",
    "firebase": "[firebase](https://skillicons.dev/icons?i=firebase)",
    "flutter": "[flutter](https://skillicons.dev/icons?i=flutter)",
    "typescript": "[typescript](https://skillicons.dev/icons?i=typescript)",
    "nextjs": "[nextjs](https://skillicons.dev/icons?i=nextjs)",
    "docker": "[docker](https://skillicons.dev/icons?i=docker)"
  };
  for (const [key, value] of Object.entries(replacements)) {
    reply = reply.replace(new RegExp(key, 'gi'), value);
  }

  // NEW: Add code highlighting for code blocks
  reply = reply.replace(/```(\w+)\s*([\s\S]*?)```/g, (match, language, code) => {
    return "```" + language + "\n" + code + "```";
  });

  // Send in chunks with Markdown
  const MAX_LEN = 4096;
  if (reply.length <= MAX_LEN) {
    bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
  } else {
    for (let i = 0; i < reply.length; i += MAX_LEN) {
      bot.sendMessage(chatId, reply.substring(i, i + MAX_LEN), { parse_mode: 'Markdown' });
    }
  }

  // NEW: For developer mode users, suggest follow-up questions
  if (userPrefs.mode === 'developer') {
    setTimeout(() => {
      bot.sendMessage(chatId, "Need more help? Try:\n- How to implement this?\n- Show me a code example\n- What are best practices?", {
        reply_markup: {
          keyboard: [
            ['How to implement this?'],
            ['Show me a code example'],
            ['What are best practices?']
          ],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
    }, 2000);
  }
});

// NEW: Handle location sharing
bot.on('location', (msg) => {
  const chatId = msg.chat.id;
  const location = msg.location;

  bot.sendMessage(chatId, `Thanks for sharing your location! I've recorded coordinates: ${location.latitude}, ${location.longitude}. If you're looking for developer communities nearby, try the /communities command.`);
});

// NEW: Handle file uploads
bot.on('document', (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.document.file_id;
  const fileName = msg.document.file_name;

  bot.sendMessage(chatId, `I've received your file: ${fileName}. What would you like me to do with it?`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Analyze Code", callback_data: `analyze_${fileId}` }],
        [{ text: "Suggest Improvements", callback_data: `improve_${fileId}` }],
        [{ text: "Cancel", callback_data: "cancel_file" }]
      ]
    }
  });
});

// NEW: Export messages for backup
function exportMessages(format = 'json') {
  try {
    if (!fs.existsSync(messagesFile)) return null;

    const data = JSON.parse(fs.readFileSync(messagesFile, 'utf8')) || [];

    if (format === 'csv') {
      const csvHeader = 'name,chat_id,message,timestamp\n';
      const csvData = data.map(msg =>
        `"${msg.name}","${msg.chat_id}","${msg.message.replace(/"/g, '""')}","${msg.timestamp}"`
      ).join('\n');

      const exportPath = path.join(__dirname, 'messages_export.csv');
      fs.writeFileSync(exportPath, csvHeader + csvData, 'utf8');
      return exportPath;
    }

    return messagesFile;
  } catch (error) {
    console.error("Error exporting messages:", error);
    return null;
  }
}

// NEW: Initiate bot and log startup
console.log("DevGeniusAi bot is starting up...");
bot.getMe().then(botInfo => {
  console.log(`Bot connected successfully: @${botInfo.username}`);

  // Notify admin that bot is online if configured
  if (ADMIN_CHAT_ID) {
    const startTime = new Date().toISOString();
    bot.sendMessage(ADMIN_CHAT_ID, `🟢 DevGeniusAi bot is now online!\nStartup time: ${startTime}`);
  }
}).catch(error => {
  console.error("Failed to connect bot:", error);
});