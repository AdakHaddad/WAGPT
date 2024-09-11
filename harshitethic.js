const {
  BufferJSON,
  generateWAMessageFromContent,
  proto,
  generateWAMessage,
} = require("@whiskeysockets/baileys");
const fs = require("fs");
const { OpenAI } = require("openai");
const chalk = require("chalk");

// Load OpenAI API key configuration from environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Use environment variable for API key
});

// Load chat history from file
const chatHistory = readChatHistoryFromFile();

// Utility function to read chat history from file
function readChatHistoryFromFile() {
  try {
    const data = fs.readFileSync("chat_history.json", "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
}

// Utility function to write chat history to file
function writeChatHistoryToFile(chatHistory) {
  fs.writeFileSync("chat_history.json", JSON.stringify(chatHistory));
}

// Utility function to update chat history
function updateChatHistory(sender, message) {
  if (!chatHistory[sender]) {
    chatHistory[sender] = [];
  }
  chatHistory[sender].push(message);
  if (chatHistory[sender].length > 20) {
    chatHistory[sender].shift();
  }
}

// Main function to handle incoming messages
module.exports = sansekai = async (client, m, chatUpdate, store) => {
  try {
    if (!chatHistory[m.sender]) chatHistory[m.sender] = [];

    const text = m.text;

    // Use OpenAI to generate a response based on chat history
    const messages = [
      {
        role: "system",
        content: `
        Anda adalah seorang rekan kerja yang bersahabat. Teman anda baru saja mengikuti rapat bersama pemimpinnya.
        Buatlah beberapa pertanyaan dengan gaya non formal tentang pengalaman dan perasaannya saat rapat.
        Tindak lanjuti setiap jawaban dengan pertanyaan lebih dalam.
        Setelah diskusi, alihkan percakapan untuk mengeksplorasi perasaannya tentang pekerjaannya, terkait Psychological Empowerment:
        Competence, Meaning, Impact, Self-determination. Gali secara friendly dan rinci.`,
      },
      ...chatHistory[m.sender].map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: text },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use the gpt-4o-mini model
      messages: messages,
      temperature: 1,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    // Update chat history
    updateChatHistory(m.sender, { role: "user", content: text });
    updateChatHistory(m.sender, {
      role: "assistant",
      content: response.choices[0].message.content,
    });

    // Reply with the OpenAI-generated response
    m.reply(`${response.choices[0].message.content}`);
  } catch (err) {
    console.log(err);
  }

  // Watch for changes and reload
  let file = require.resolve(__filename);
  fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
  });
};
