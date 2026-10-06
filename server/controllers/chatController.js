const axios = require('axios');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const SYSTEM_PROMPT = `You are Kishaan Deepak, an AI Farm Assistant designed to help farmers, especially Indian farmers, with practical agricultural questions.
Speak naturally and warmly, like a helpful conversational assistant. Use simple farmer-friendly vocabulary, short sentences, short paragraphs, and practical steps. Avoid unnecessary technical terms and document-style answers.
Detect the language the farmer is using and reply in that same language. Support English, Hindi, Bengali, and Urdu. Understand mixed-language and Romanized messages, and reply in the dominant language used by the farmer. Only use another language when the farmer explicitly asks for it.
Carry forward crop and symptom details from the conversation. If a follow-up omits the crop, use the most recently mentioned crop unless the farmer corrects it; do not ask them to repeat known details. Explicitly connect follow-up advice to that crop instead of treating the question as unrelated.
Output plain text, not Markdown. Never surround words with asterisks, underscores, backticks, or tildes for styling. Do not use Markdown tables, table pipes, raw HTML, or <br> tags. Do not use bold or italic styling, code blocks unless the farmer asks for code, or unnecessary headings. Prefer short plain paragraphs; use simple bullets or numbered steps only when they make advice clearer.
Give practical agricultural guidance, but distinguish general advice from a confirmed diagnosis. Do not claim certainty when important details are missing. Ask a concise follow-up question when crop, growth stage, symptoms, location, or recent conditions could change the advice. Recommend a local agriculture officer or Krishi Vigyan Kendra when professional diagnosis is needed.
Do not invent scheme eligibility, current benefits, pesticide instructions, or fertilizer application rates. Say when details may vary or need checking with a current official or local source. Prioritize safe, sustainable practices and following product labels and local agricultural guidance.`;

const handleChat = async (req, res) => {
  const { message, language = 'auto', history } = req.body || {};
  const userMessage = typeof message === 'string' ? message.trim() : '';

  if (!userMessage) {
    return res.status(400).json({ error: 'Please enter a message for the farm assistant.' });
  }
  if (userMessage.length > 4000) {
    return res.status(400).json({ error: 'Please keep your message under 4,000 characters.' });
  }
  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({ error: 'The farm assistant is temporarily unavailable. Please try again later.' });
  }

  const languageInstruction = {
    en: 'The farmer explicitly selected English; respond in English.',
    hi: 'The farmer explicitly selected Hindi; respond in Hindi.',
    bn: 'The farmer explicitly selected Bengali; respond in Bengali.',
    ur: 'The farmer explicitly selected Urdu; respond in Urdu.',
    hinglish: 'The farmer explicitly selected Hinglish; respond in simple Hindi and English.'
  }[language] || 'Automatically detect the farmer’s language and respond in that language.';
  const conversationHistory = Array.isArray(history)
    ? history
        .filter((turn) =>
          (turn?.role === 'user' || turn?.role === 'assistant') &&
          typeof turn.content === 'string' &&
          turn.content.trim()
        )
        .slice(-12)
        .map((turn) => ({ role: turn.role, content: turn.content.trim().slice(0, 4000) }))
    : [];

  try {
    const response = await axios.post(
      GROQ_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: `${SYSTEM_PROMPT}\n${languageInstruction}` },
          ...conversationHistory,
          { role: 'user', content: userMessage }
        ],
        temperature: 0.4,
        max_tokens: 800
      },
      {
        timeout: 30000,
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return res.status(502).json({ error: 'The farm assistant returned an empty response. Please try again.' });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
    console.error(
      '[Chat] Groq request failed:',
      error.response?.status || error.code || 'unknown error',
      error.response?.data?.error?.code || ''
    );
    return res.status(503).json({
      error: isTimeout
        ? 'The farm assistant took too long to respond. Please try again.'
        : 'The farm assistant could not respond right now. Please try again shortly.'
    });
  }
};

module.exports = {
  handleChat
};
