import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, Globe, Sparkles, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

const renderAssistantText = (content) =>
  content
    .split(/(\*\*[^*\n]+?\*\*|__[^_\n]+__)/g)
    .map((part) => (/^(\*\*.+\*\*|__.+__)$/s.test(part) ? part.slice(2, -2) : part))
    .join('');

export default function FarmChatbot() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Namaste! I’m Kishaan Deepak, your farm assistant. What crop or farming question can I help with today?',
      provider: 'Kishaan Deepak Knowledge Base'
    }
  ]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const requestInFlight = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickPrompts = [
    { label: '🌾 Rice Kharif Fertilizer', text: 'What is the recommended fertilizer schedule (Urea, DAP, Potash) for Kharif paddy?' },
    { label: '🔬 Brown Spot Treatment', text: 'How do I identify and treat Brown Spot disease in my paddy field?' },
    { label: '🏛️ PM-KISAN Scheme', text: 'What are the benefits and eligibility criteria for PM-KISAN and PMFBY?' },
    { label: '💧 Water Saving (AWD)', text: 'Explain Alternate Wetting and Drying (AWD) irrigation method for rice crops.' }
  ];

  const handleSend = async (messageText) => {
    const textToSend = (messageText ?? input).trim();
    if (!textToSend || requestInFlight.current) return;

    requestInFlight.current = true;
    const history = messages
      .filter((message) => message.role === 'user' || message.provider === 'Groq AI Farm Assistant')
      .slice(-12)
      .map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: 'user', content: textToSend }]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await api.sendChat(textToSend, language, history);
      if (typeof res.reply === 'string' && res.reply.trim()) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: res.reply,
          provider: 'Groq AI Farm Assistant'
        }]);
      } else {
        setError('The farm assistant returned an invalid response. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reach the farm assistant. Please try again.');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (requestInFlight.current) return;
    setMessages([
      {
        role: 'assistant',
        content: 'Conversation cleared. What would you like to discuss next about your crops or field?',
        provider: 'Kishaan Deepak System'
      }
    ]);
    setError(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title & Language Toggle */}
      <div className="bg-brand-card p-6 rounded-3xl border border-brand-border shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-accent text-sm font-semibold tracking-wider uppercase mb-1">
            <span>🤖</span> Generative Agronomy AI
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">AI Farm Assistant</h2>
          <p className="text-sm text-brand-textMuted mt-1">
            Conversational assistant powered by Groq LLM with specialized Indian farming knowledge.
          </p>
        </div>

        {/* Language selector & clear */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-brand-darkest px-3 py-1.5 rounded-2xl border border-brand-border">
            <Globe className="w-3.5 h-3.5 text-brand-accent" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="auto" className="bg-brand-darkest text-white">Auto detect</option>
              <option value="en" className="bg-brand-darkest text-white">English</option>
              <option value="hi" className="bg-brand-darkest text-white">हिंदी (Hindi)</option>
              <option value="bn" className="bg-brand-darkest text-white">বাংলা (Bengali)</option>
              <option value="ur" className="bg-brand-darkest text-white">اردو (Urdu)</option>
              <option value="hinglish" className="bg-brand-darkest text-white">Hinglish</option>
            </select>
          </div>

          <button
            onClick={handleClear}
            disabled={loading}
            className="p-2 rounded-xl bg-brand-darkest hover:bg-brand-cardHover border border-brand-border text-brand-textMuted hover:text-red-400 transition"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick suggestions */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-brand-textMuted flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-brand-accent" /> Quick Topics:
        </span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p.text)}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-brand-card hover:bg-brand-cardHover border border-brand-border text-xs text-brand-textLight transition-all shadow-sm"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Box */}
      <div className="bg-brand-card rounded-3xl border border-brand-border shadow-xl flex flex-col h-[520px] overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={index}
                className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                    isUser
                      ? 'bg-brand-accent text-brand-darkest shadow-md'
                      : 'bg-brand-darkest text-brand-accent border border-brand-border'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs md:text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-brand-accent text-brand-darkest font-medium rounded-tr-none shadow-md'
                      : 'bg-brand-darkest text-brand-textLight rounded-tl-none border border-brand-border'
                  }`}
                >
                  {isUser ? msg.content : renderAssistantText(msg.content)}
                  {!isUser && msg.provider && (
                    <div className="mt-2 pt-2 border-t border-brand-border/60 text-[10px] text-brand-textMuted flex items-center justify-between">
                      <span>Source: {msg.provider}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 mr-auto max-w-[85%]">
              <div className="w-8 h-8 rounded-xl bg-brand-darkest text-brand-accent border border-brand-border flex items-center justify-center">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="p-4 rounded-2xl bg-brand-darkest text-brand-textMuted rounded-tl-none border border-brand-border text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-accent animate-ping" />
                <span>Kishaan Deepak is preparing practical farming advice...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="px-6 py-2 bg-red-950/60 border-t border-red-800 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 bg-brand-darkest border-t border-brand-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask about crops, diseases, fertilizers, or government schemes..."
              className="flex-1 bg-brand-card border border-brand-border rounded-2xl px-4 py-3 text-sm text-white placeholder-brand-textMuted focus:outline-none focus:border-brand-accent transition"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-5 py-3 rounded-2xl bg-brand-accent hover:bg-brand-accentHover text-brand-darkest font-bold text-sm tracking-wide transition shadow-lg shadow-brand-accent/25 flex items-center gap-2 disabled:opacity-40"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
