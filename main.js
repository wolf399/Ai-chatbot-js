// === DOM ELEMENTS ===
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendButton = document.getElementById("sendButton");
const clearChatButton = document.getElementById("clearChatButton");

// === CONSTANTS ===
const BOT_GREETING = "Hello! How can I help you today?";
const API_KEY = "AIzaSyDhpCyVn1FjRRWC0i7MeMihP04AKHgWVcQ";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

let chatHistory = [
  { role: "model", parts: [{ text: BOT_GREETING }] }
];

// === UTILS ===

// Sanitize and format markdown as HTML
function markdownToHtml(text) {
  return text
    .replace(/\*\*(.*?)\*\*|__(.*?)__/g, "<strong>$1$2</strong>")
    .replace(/\*(.*?)\*|_(.*?)_/g, "<em>$1$2</em>")
    .replace(/\n/g, "<br>");
}

// Display message in chat
function displayMessage(content, sender = "bot", isHtml = false) {
  const message = document.createElement("div");
  message.classList.add("message", sender);
  message.innerHTML = isHtml ? content : escapeHtml(content);
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Escape HTML for security
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (match) => {
    const escapes = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return escapes[match];
  });
}

// === LOADING INDICATOR ===
let loadingInterval;
function showLoading(show = true) {
  let loader = document.getElementById("loadingIndicator");

  if (!loader) {
    loader = document.createElement("div");
    loader.id = "loadingIndicator";
    loader.className = "loading-indicator message bot";
    chatMessages.appendChild(loader);
  }

  if (show) {
    loader.style.display = "block";
    let dots = 0;
    loadingInterval = setInterval(() => {
      loader.textContent = `Bot is typing${".".repeat(dots++ % 4)}`;
    }, 300);
  } else {
    clearInterval(loadingInterval);
    loader.style.display = "none";
  }

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// === API CALL ===
async function sendMessageToBot(userMessage) {
  displayMessage(userMessage, "user");
  chatHistory.push({ role: "user", parts: [{ text: userMessage }] });
  chatInput.value = "";

  showLoading(true);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
    });

    if (!response.ok) {
      const { error } = await response.json();
      throw new Error(`${response.status}: ${error.message}`);
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) throw new Error("Empty response from model.");

    const html = markdownToHtml(reply);
    displayMessage(html, "bot", true);
    chatHistory.push({ role: "model", parts: [{ text: reply }] });

  } catch (err) {
    displayMessage(`🚫 Error: ${err.message}`, "bot");
    console.error("API Error:", err);
  } finally {
    showLoading(false);
  }
}

// === EVENTS ===

// Debounce function
function debounce(fn, delay = 500) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

const debouncedSend = debounce(sendMessageToBot, 400);

// Send on button click
sendButton.addEventListener("click", () => {
  const msg = chatInput.value.trim();
  if (msg) debouncedSend(msg);
});

// Send on Enter
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const msg = chatInput.value.trim();
    if (msg) debouncedSend(msg);
  }
});

// Clear Chat
clearChatButton?.addEventListener("click", () => {
  chatMessages.innerHTML = "";
  chatHistory = [{ role: "model", parts: [{ text: BOT_GREETING }] }];
  displayMessage(BOT_GREETING, "bot");
});

// Initial greeting if no message shown yet
if (!chatMessages.querySelector(".message.bot")) {
  displayMessage(BOT_GREETING, "bot");
}
