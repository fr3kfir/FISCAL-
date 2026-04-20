import { useState, useRef, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || ''

const SUGGESTIONS = (ticker) => ticker ? [
  `Analyze ${ticker} fundamentals`,
  `Is ${ticker} overvalued right now?`,
  `Key risks for ${ticker}`,
  `${ticker} growth outlook`,
] : [
  'Explain P/E ratio',
  'What is a good debt-to-equity ratio?',
  'How to analyze a stock',
  'What moves stock prices?',
]

function formatMessage(text) {
  // Basic markdown-like formatting
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:var(--bg-hover);padding:1px 5px;border-radius:4px;font-family:monospace">$1</code>')
    .replace(/\n/g, '<br/>')
}

export default function AICopilot({ ticker, stockContext, mobileOpen }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: ticker
        ? `Hi! I'm your AI financial analyst. I can see you're viewing **${ticker}**. Ask me anything — in English or Hebrew! / שאל אותי כל שאלה על המניה הזו!`
        : `Hi! I'm your AI financial analyst. Search for a stock or ask me any finance question — in English or Hebrew! / חפש מניה או שאל אותי כל שאלה פיננסית!`
    }
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: ticker
        ? `Switched to **${ticker}**. What would you like to know? / מה תרצה לדעת על המניה הזו?`
        : 'Ready to help with any finance questions — in English or Hebrew! / מוכן לענות על כל שאלה פיננסית!'
    }])
  }, [ticker])

  const sendMessage = async (text) => {
    const userText = text || input.trim()
    if (!userText || streaming) return

    setInput('')
    // Skip opening greeting (first assistant message) — not a real conversation turn
    const history = messages
      .filter((m, i) => m.content && !(i === 0 && m.role === 'assistant'))
      .map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [...prev, { role: 'user', content: userText }])
    setStreaming(true)

    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          ticker: ticker || null,
          stock_context: stockContext || null,
          history: history,
        }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          if (raw === '[DONE]') continue
          try {
            const parsed = JSON.parse(raw)
            if (parsed.text) {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: updated[updated.length - 1].content + parsed.text,
                }
                return updated
              })
            } else if (parsed.error) {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: `⚠️ Error: ${parsed.error}` }
                return updated
              })
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Sorry, something went wrong. Make sure the backend is running.',
        }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <aside className={`copilot-panel${mobileOpen ? ' mobile-open' : ''}`}>
      <div className="copilot-header">
        <div className="copilot-icon">✦</div>
        <div>
          <div className="copilot-title">AI Copilot</div>
          <div className="copilot-subtitle">
            {streaming ? 'Thinking...' : (ticker ? `Analyzing ${ticker}` : 'Ask anything')}
          </div>
        </div>
      </div>

      <div className="copilot-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-role">{msg.role === 'user' ? 'You' : 'AI Analyst'}</div>
            <div
              className="message-bubble"
              dangerouslySetInnerHTML={{
                __html: formatMessage(msg.content) + (streaming && i === messages.length - 1 && msg.role === 'assistant' ? '<span class="typing-cursor"></span>' : '')
              }}
            />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {!streaming && messages.length <= 2 && (
        <div className="copilot-suggestions">
          {SUGGESTIONS(ticker).map((s, i) => (
            <button key={i} className="suggestion-btn" onClick={() => sendMessage(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="copilot-input-area">
        <textarea
          ref={textareaRef}
          className="copilot-input"
          placeholder="Ask in English or Hebrew… / שאל בעברית או אנגלית..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
        />
        <button className="send-btn" onClick={() => sendMessage()} disabled={!input.trim() || streaming}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
