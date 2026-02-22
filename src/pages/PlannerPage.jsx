// src/pages/PlannerPage.jsx
import { useState, useCallback } from 'react'
import { ChevronRight, Zap, RefreshCw, Check, Settings } from 'lucide-react'
import { useApp, haptic } from '../lib/useAppStore'
import { optimizePlan } from '../lib/gemini'
import { readinessForDay, fatigueLabel } from '../lib/recovery'
import { supabase } from '../lib/supabase'

import { Calendar, Sparkles } from 'lucide-react' // Added Sparkles and Calendar

const WORKOUT_TYPES = {
  push: { label: 'Tlaky (Push)', color: '#ff375f', emoji: '💪' },
  pull: { label: 'Tahy (Pull)', color: '#0a84ff', emoji: '🧗' },
  legs: { label: 'Nohy (Legs)', color: '#ffd60a', emoji: '🦵' },
  upper: { label: 'Vršek těla', color: '#bf5af2', emoji: '👕' },
  lower: { label: 'Spodek těla', color: '#ff9f0a', emoji: '🏃' },
  fullbody: { label: 'Celé tělo', color: '#30d158', emoji: '🏋️' },
  rest: { label: 'Odpočinek', color: '#555570', emoji: '☕' },
}

const DAYS = [
  { id: '1', label: 'Pondělí', short: 'Po' },
  { id: '2', label: 'Úterý', short: 'Út' },
  { id: '3', label: 'Středa', short: 'St' },
  { id: '4', label: 'Čtvrtek', short: 'Čt' },
  { id: '5', label: 'Pátek', short: 'Pá' },
  { id: '6', label: 'Sobota', short: 'So' },
  { id: '0', label: 'Neděle', short: 'Ne' },
]

export default function PlannerPage() {
  const { profile, updateProfile, muscleStatus } = useApp()
  const [editingDay, setEditingDay] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [planSummary, setPlanSummary] = useState(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)

  // Use profile.weekly_split or a default
  const split = profile?.weekly_split || { '1': 'push', '2': 'pull', '3': 'rest', '4': 'legs', '5': 'upper', '6': 'lower', '0': 'rest' }

  const handleDayUpdate = async (type) => {
    if (!editingDay) return
    haptic([30])
    setIsUpdating(true)
    try {
      const newSplit = { ...split, [editingDay]: type }
      await updateProfile({ weekly_split: newSplit })
      setPlanSummary(null) // Clear summary when plan changes
    } catch (error) {
      console.error("Failed to update weekly split:", error)
    } finally {
      setIsUpdating(false)
      setEditingDay(null)
    }
  }

  const generateOptimization = async () => {
    haptic([50])
    setIsLoadingSummary(true)
    setPlanSummary(null)
    try {
      const summary = await optimizePlan(profile, split, muscleStatus)
      setPlanSummary(summary)
    } catch (error) {
      console.error("Failed to optimize plan:", error)
      setPlanSummary("Nepodařilo se vygenerovat optimalizaci. Zkuste to prosím znovu.")
    } finally {
      setIsLoadingSummary(false)
    }
  }

  // ── Day Row Component ─────────────────────────────────────────────────────────
  function DayRow({ dayIdx, dayName, dateStr, config, workoutType, score, isToday, editing, onTypeChange, muscleStatus }) {
    const [expanded, setExpanded] = useState(false)

    const muscleStatuses = config.muscles.map(m => ({
      id: m,
      fatigue: muscleStatus?.[m]?.fatigue || 0,
    })).sort((a, b) => b.fatigue - a.fatigue)

    return (
      <div className="bg-card border rounded-2xl overflow-hidden transition-all"
        style={{ borderColor: isToday ? `${config.color}35` : '#1c1c28' }}>

        {/* Row header */}
        <button
          onClick={() => { if (!editing) { haptic([25]); setExpanded(e => !e) } }}
          className="w-full flex items-center gap-3 p-3.5 text-left"
        >
          {/* Day label */}
          <div className="w-12 flex-shrink-0">
            <p className="text-[10px] font-mono font-bold" style={{ color: isToday ? config.color : '#555570' }}>
              {dayName.slice(0, 3).toUpperCase()}
            </p>
            <p className="text-[9px] font-mono text-muted">{dateStr}</p>
          </div>

          {/* Workout type selector (edit mode) or display */}
          {editing ? (
            <select
              value={workoutType}
              onChange={e => onTypeChange(dayIdx, e.target.value)}
              onClick={e => e.stopPropagation()}
              className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm font-bold outline-none"
              style={{ color: config.color }}
            >
              {Object.entries(WORKOUT_TYPES).map(([id, cfg]) => (
                <option key={id} value={id}>{cfg.emoji} {cfg.label}</option>
              ))}
            </select>
          ) : (
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-base">{config.emoji}</span>
                <div>
                  <p className="text-sm font-bold text-white">{config.label}</p>
                  {config.muscles.length > 0 && (
                    <p className="text-[10px] font-mono text-dim capitalize">
                      {config.muscles.slice(0, 3).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Readiness indicator */}
          {!editing && config.muscles.length > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <p className="text-xs font-black" style={{ color: config.color }}>{score}%</p>
                <p className="text-[9px] font-mono text-dim">ready</p>
              </div>
              <ChevronRight className={`w-4 h-4 text-dim transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </div>
          )}

          {isToday && !editing && (
            <div className="flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-mono font-black"
              style={{ background: `${config.color}20`, color: config.color }}>
              TODAY
            </div>
          )}
        </button>

        {/* Expanded detail */}
        {expanded && !editing && config.muscles.length > 0 && (
          <div className="px-3.5 pb-3.5 border-t border-border pt-3 space-y-2">
            {muscleStatuses.map(({ id, fatigue }) => {
              const lbl = fatigueLabel(fatigue)
              return (
                <div key={id} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: lbl.color }} />
                  <span className="text-xs text-subtle capitalize flex-1">{id}</span>
                  <div className="w-24 h-1.5 bg-surface rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${fatigue}%`, background: lbl.color, transition: 'width 0.5s ease' }} />
                  </div>
                  <span className="text-[10px] font-mono w-12 text-right" style={{ color: lbl.color }}>
                    {Math.round(fatigue)}%
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-2 pb-6 flex-shrink-0">
        <h1 className="text-2xl font-black text-white">Tréninkový plán</h1>
        <p className="text-dim text-xs font-mono">Nastavte si svůj týdenní split</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-12 space-y-6 scrollbar-none">

        {/* Readiness Card */}
        <div className="bg-gradient-to-br from-blue/20 to-purple/10 border border-blue/20 rounded-[32px] p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-blue" />
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Přehled týdne</p>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map(d => {
                const type = split[d.id]
                const cfg = WORKOUT_TYPES[type] || WORKOUT_TYPES.rest
                return (
                  <div key={d.id} className="text-center">
                    <p className="text-[10px] font-bold text-dim mb-2">{d.short}</p>
                    <div className="w-full aspect-square rounded-xl bg-surface border border-border flex items-center justify-center text-lg">
                      {cfg.emoji}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-blue/10 blur-3xl rounded-full" />
        </div>

        {/* List of Days */}
        <div className="space-y-3">
          <p className="text-dim text-[10px] font-mono uppercase tracking-widest px-1">Upravit dny</p>
          {DAYS.map(d => {
            const type = split[d.id]
            const cfg = WORKOUT_TYPES[type] || WORKOUT_TYPES.rest
            return (
              <button key={d.id} onClick={() => { haptic([20]); setEditingDay(d.id) }}
                className="w-full flex items-center justify-between bg-card border border-border rounded-3xl p-4 transition-all active:scale-[0.99] hover:border-blue/30">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-surface border border-border flex items-center justify-center text-xl">
                    {cfg.emoji}
                  </div>
                  <div className="text-left">
                    <p className="text-white font-bold text-sm">{d.label}</p>
                    <p className="text-dim text-[10px] font-mono uppercase">{cfg.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${type === 'rest' ? 'bg-dim' : 'bg-blue pulse'}`} />
                  <ChevronRight className="w-4 h-4 text-dim" />
                </div>
              </button>
            )
          })}
        </div>

        {/* AI Optimization section */}
        <div className="bg-card border border-border rounded-[32px] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-red" />
              <h3 className="text-white font-black">AI Optimalizace</h3>
            </div>
            <button
              onClick={generateOptimization}
              disabled={isLoadingSummary}
              className="text-[10px] font-black text-blue uppercase tracking-widest bg-blue/10 px-3 py-1.5 rounded-full"
            >
              {isLoadingSummary ? 'Analyzuji...' : 'Analyzovat plán'}
            </button>
          </div>

          {!planSummary && !isLoadingSummary ? (
            <p className="text-subtle text-xs leading-relaxed">
              Nechte AI zkontrolovat váš plán vzhledem k aktuální únavě svalů a vašim cílům.
            </p>
          ) : isLoadingSummary ? (
            <div className="space-y-2">
              <div className="h-2 bg-white/5 rounded-full w-full animate-pulse" />
              <div className="h-2 bg-white/5 rounded-full w-4/5 animate-pulse" />
              <div className="h-2 bg-white/5 rounded-full w-2/3 animate-pulse" />
            </div>
          ) : (
            <div className="text-subtle text-xs leading-relaxed space-y-3"
              dangerouslySetInnerHTML={{ __html: planSummary.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1').replace(/\n/g, '<br/>') }} />
          )}
        </div>
      </div>

      {/* Editing Modal */}
      {editingDay && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-slide-up">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingDay(null)} />
          <div className="relative w-full max-w-lg bg-card border-t border-border rounded-t-[40px] px-6 pt-10 pb-12 max-h-[85vh] overflow-y-auto">
            {/* Handle */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-border rounded-full" />

            <div className="mb-6">
              <h2 className="text-2xl font-black text-white">Upravit {DAYS.find(d => d.id === editingDay)?.label}</h2>
              <p className="text-dim text-xs">Vyberte zaměření tréninku pro tento den</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {Object.entries(WORKOUT_TYPES).map(([id, cfg]) => (
                <button key={id} onClick={() => handleDayUpdate(id)}
                  disabled={isUpdating}
                  className={`flex flex-col items-center justify-center gap-2 p-5 rounded-3xl border transition-all ${split[editingDay] === id ? 'bg-blue/10 border-blue text-white ring-2 ring-blue/20' : 'bg-surface border-border text-dim hover:border-blue/30'
                    }`}>
                  <span className="text-3xl mb-1">{cfg.emoji}</span>
                  <span className="text-xs font-bold text-center">{cfg.label}</span>
                </button>
              ))}
            </div>

            <button onClick={() => setEditingDay(null)}
              className="w-full py-4 rounded-2xl bg-surface text-white font-bold text-sm">
              Zrušit
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
