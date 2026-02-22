// src/pages/CoachPage.jsx
import { useState, useEffect, useRef } from 'react'
import { Send, Zap, RotateCcw, Loader, Mic } from 'lucide-react'
import { useApp, haptic } from '../lib/useAppStore'
import { chatWithCoach, getProactiveGreeting } from '../lib/gemini'

const QUICK_PROMPTS = [
  "What should I train today?",
  "Which muscles are recovered?",
  "Suggest a workout for 45 minutes",
  "Am I overtraining?",
  "Rate my recovery this week",
]

export default function CoachPage() {
  const { muscleStatus, weeklyWorkouts, profile } = useApp()
  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [initLoad,  setInitLoad]  = useState(true)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Load proactive opening message
  useEffect(() => {
    if (!muscleStatus) return

    getProactiveGreeting(muscleStatus, weeklyWorkouts)
      .then(text => {
        setMessages([{
          role: 'assistant',
          text,
          time: now(),
          isProactive: true,
        }])
        setInitLoad(false)
      })
      .catch(() => {
        setMessages([{
          role: 'assistant',
          text: "Hey! I'm your AI coach. Tell me how you're feeling today and I'll help optimize your training.",
          time: now(),
        }])
        setInitLoad(false)
      })
  }, [profile?.id])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return

    haptic([35])
    setInput('')
    setMessages(m => [...m, { role: 'user', text: msg, time: now() }])
    setLoading(true)

    try {
      const reply = await chatWithCoach(msg, muscleStatus, weeklyWorkouts)
      setMessages(m => [...m, { role: 'assistant', text: reply, time: now() }])
      haptic([20])
    } catch {
      setMessages(m => [...m, {
        role: 'assistant',
        text: 'Connection error. Check your Gemini API key in the environment config.',
        time: now(),
        isError: true,
      }])
    } finally {
      setLoading(false)
    }
  }

  const resetChat = () => {
    haptic([40])
    setMessages([])
    setInitLoad(true)
    getProactiveGreeting(muscleStatus, weeklyWorkouts)
      .then(text => {
        setMessages([{ role: 'assistant', text, time: now(), isProactive: true }])
        setInitLoad(false)
      })
      .catch(() => setInitLoad(false))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-2 pb-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-black text-white">AI Coach</h1>
          <p className="text-dim text-xs font-mono">Powered by Gemini 2.5 Flash-Lite</p>
        </div>
        <button onClick={resetChat}
          className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-dim">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4 scrollbar-none">

        {/* Loading skeleton for initial greeting */}
        {initLoad && (
          <div className="flex gap-3 items-start">
            <CoachAvatar />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 bg-card rounded-full w-4/5 animate-pulse" />
              <div className="h-3 bg-card rounded-full w-3/5 animate-pulse" />
              <div className="h-3 bg-card rounded-full w-2/3 animate-pulse" />
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3 items-start animate-fade-in">
            <CoachAvatar />
            <div className="bg-card border border-border rounded-3xl rounded-tl-lg px-4 py-3">
              <div className="flex gap-1.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 bg-dim rounded-full"
                    style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick prompt chips */}
      <div className="px-4 mb-3 flex-shrink-0">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => sendMessage(p)}
              className="flex-shrink-0 px-3.5 py-2 bg-card border border-border rounded-full text-xs text-subtle font-medium transition-all active:scale-95 whitespace-nowrap">
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div className="px-4 pb-4 flex-shrink-0">
        <div className="flex gap-2 bg-card border border-border rounded-2xl px-3 py-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              // Auto-resize
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Ask your coach..."
            rows={1}
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-dim resize-none leading-relaxed py-1.5 scrollbar-none max-h-24"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30 active:scale-90"
            style={{ background: input.trim() ? 'linear-gradient(135deg, #ff375f, #ff9f0a)' : '#1c1c28' }}
          >
            {loading
              ? <Loader className="w-4 h-4 text-white animate-spin" />
              : <Send className="w-4 h-4 text-white" />
            }
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-5px); }
        }
      `}</style>
    </div>
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
          <div className={`rounded-3xl rounded-tl-lg px-4 py-3 border ${
            msg.isProactive
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
