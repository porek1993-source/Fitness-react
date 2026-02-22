// src/pages/CoachPage.jsx
import { useState, useEffect, useRef } from 'react'
import { Send, Zap, RotateCcw, Loader, Sparkles } from 'lucide-react'
import { useApp, haptic } from '../lib/useAppStore'
import { chatWithCoach } from '../lib/gemini'

const QUICK_PROMPTS = [
  { text: 'Jak dnes trénovat?', icon: '💪' },
  { text: 'Které svaly jsou unavené?', icon: '🔋' },
  { text: 'Tipy na techniku dřepu', icon: '🏋️' },
  { text: 'Jak zlepšit regeneraci?', icon: '🛌' },
]

export default function CoachPage() {
  const { muscleStatus, weeklyWorkouts } = useApp()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Ahoj! Jsem tvůj AI Agile Coach. Jak ti dnes můžu pomoci s tvým tréninkem?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef()

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (text) => {
    const msg = text || input
    if (typeof msg !== 'string' || !msg.trim() || loading) return

    haptic([30])
    const newMessages = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const response = await chatWithCoach(msg, muscleStatus, weeklyWorkouts)
      setMessages([...newMessages, { role: 'assistant', content: response }])
      haptic([20])
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: 'Omlouvám se, něco se pokazilo. Zkus to prosím znovu.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full animate-fade-in relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red/5 blur-[120px] rounded-full -z-10" />

      {/* Header */}
      <div className="px-4 pt-2 pb-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-black text-white">AI Trenér</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            <p className="text-dim text-[10px] font-mono uppercase tracking-widest">Online & Připraven</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-surface border border-border flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-red" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-32 scrollbar-none pt-2">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-[24px] text-sm leading-relaxed ${m.role === 'user'
                ? 'bg-blue text-white rounded-tr-none shadow-lg shadow-blue/10'
                : 'bg-card border border-border text-subtle rounded-tl-none'
              }`}>
              <div dangerouslySetInnerHTML={{
                __html: (m.content || m.text || '')
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
                  .replace(/\n/g, '<br/>')
              }} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-card border border-border px-4 py-3 rounded-[24px] rounded-tl-none">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-dim animate-bounce" />
                <div className="w-1.5 h-1.5 rounded-full bg-dim animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-dim animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-10">

        {/* Quick Prompts */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none mb-4">
          {QUICK_PROMPTS.map((p, i) => (
            <button key={i} onClick={() => handleSend(p.text)}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full text-xs font-bold text-dim hover:text-white transition-colors">
              <span>{p.icon}</span> {p.text}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Zeptejte se na trénink nebo techniku..."
            className="w-full bg-card border border-border rounded-2xl pl-5 pr-14 py-4 text-sm text-white outline-none focus:border-red/50 transition-colors shadow-2xl"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white flex items-center justify-center text-black active:scale-95 transition-all disabled:opacity-50 disabled:bg-dim"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-5px); }
        }
      `}</style>
    </div >
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CoachAvatar() {
  return (
    <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-red to-orange flex items-center justify-center flex-shrink-0 shadow-lg shadow-red/20">
      <Zap className="w-4 h-4 text-white" />
    </div>
  )
}

function MessageBubble({ message: msg }) {
  const isAssistant = msg.role === 'assistant'

  // Parse **bold** markdown
  const renderText = (text) => ({
    __html: text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/🎯|✅|⚠️|📅|💪|🔥|⚡/g, '<span class="text-base">$&</span>')
      .replace(/\n/g, '<br/>')
  })

  if (isAssistant) {
    return (
      <div className="flex gap-3 items-start animate-fade-in">
        <CoachAvatar />
        <div className="flex-1 max-w-[85%]">
          <div className={`rounded-3xl rounded-tl-lg px-4 py-3 border ${msg.isProactive
            ? 'bg-gradient-to-br from-red/8 to-orange/5 border-red/15'
            : msg.isError
              ? 'bg-red/5 border-red/20'
              : 'bg-card border-border'
            }`}>
            <p className="text-subtle text-xs leading-relaxed"
              dangerouslySetInnerHTML={renderText(msg.text)} />
          </div>
          <p className="text-[10px] font-mono text-muted mt-1 ml-1">{msg.time}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-end animate-fade-in">
      <div className="max-w-[80%]">
        <div className="bg-gradient-to-br from-red to-orange rounded-3xl rounded-tr-lg px-4 py-3">
          <p className="text-white text-sm leading-relaxed">{msg.text}</p>
        </div>
        <p className="text-[10px] font-mono text-muted mt-1 text-right">{msg.time}</p>
      </div>
    </div>
  )
}

function now() {
  return new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
}
