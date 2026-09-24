// src/services/notification/telegramNotifier.js
// ═══════════════════════════════════════════════════════════════════════════
// TELEGRAM NOTIFICATION DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Dispatches a formatted alert to a designated Telegram chat/channel.
 * Reads TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from environment.
 * If credentials are not present, logs safely without throwing.
 *
 * @param {string} text Message content
 * @param {object} [options]
 * @param {string} [options.parseMode="HTML"] HTML or Markdown
 * @param {string} [options.token] Override bot token
 * @param {string} [options.chatId] Override target chat/channel ID
 * @returns {Promise<{ sent: boolean, error?: string, messageId?: number }>}
 */
export async function sendTelegramMessage(text, options = {}) {
  const token = options.token || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options.chatId || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return {
      sent: false,
      error: "Telegram credentials not configured (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing).",
    };
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      console.warn("[sendTelegramMessage] Telegram API error:", json?.description || res.statusText);
      return { sent: false, error: json?.description || `HTTP ${res.status}` };
    }

    return { sent: true, messageId: json.result?.message_id };
  } catch (err) {
    console.error("[sendTelegramMessage] Network failure:", err.message);
    return { sent: false, error: err.message };
  }
}
