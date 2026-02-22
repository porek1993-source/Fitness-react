// src/pages/PlannerPage.jsx
import { useState, useCallback } from 'react'
import { ChevronRight, Zap, RefreshCw, Check, Settings } from 'lucide-react'
import { useApp, haptic } from '../lib/useAppStore'
import { optimizePlan } from '../lib/gemini'
import { readinessForDay, fatigueLabel } from '../lib/recovery'
import { supabase } from '../lib/supabase'

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const WORKOUT_TYPES = {
  push:     { label: 'Push Day',   color: '#ff375f', emoji: '🔺', muscles: ['chest','shoulders','triceps'] },
  pull:     { label: 'Pull Day',   color: '#0a84ff', emoji: '🔻', muscles: ['back','biceps','forearms'] },
  legs:     { label: 'Leg Day',    color: '#ffd60a', emoji: '⚡', muscles: ['quads','hamstrings','glutes','calves'] },
  upper:    { label: 'Upper Body', color: '#bf5af2', emoji: '💪', muscles: ['chest','back','shoulders','biceps','triceps'] },
  lower:    { label: 'Lower Body', color: '#ff9f0a', emoji: '🦵', muscles: ['quads','hamstrings','glutes','calves','core'] },
  fullbody: { label: 'Full Body',  color: '#30d158', emoji: '🌟', muscles: ['chest','back','quads','hamstrings','shoulders','core'] },
  cardio:   { label: 'Cardio',     color: '#5ac8fa', emoji: '🏃', muscles: ['core','calves'] },
  rest:     { label: 'Rest Day',   color: '#3a3a4a', emoji: '😴', muscles: [] },
}

export default function PlannerPage() {
  const { profile, muscleStatus, weeklyWorkouts, user } = useApp()
  const [split,     setSplit]     = useState(() => profile?.weekly_split || {})
  const [editing,   setEditing]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [aiSuggest, setAiSuggest] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  const todayDow = new Date().getDay()

  const handleSplitChange = (dayIdx, type) => {
    haptic([25])
    setSplit(prev => ({ ...prev, [String(dayIdx)]: type }))
  }

  const saveSplit = async () => {
    haptic([40, 20, 60])
    setSaving(true)
    await supabase.from('profiles').update({ weekly_split: split }).eq('id', user.id)
    setSaving(false)
    setEditing(false)
  }

  const getAISuggestion = async () => {
    haptic([30])
    setAiLoading(true)
    setAiSuggest(null)
    const suggestion = await optimizePlan(split, muscleStatus, weeklyWorkouts)
    setAiSuggest(suggestion)
    setAiLoading(false)
  }

  return (
    <div className="px-4 pb-6 space-y-5 animate-fade-in">
      <div className="pt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Weekly Plan</h1>
          <p className="text-dim text-xs font-mono mt-0.5">Tap a day to see details</p>
        </div>
        <button onClick={() => { haptic([25]); setEditing(e => !e) }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
            editing
              ? 'bg-red/15 border-red/30 text-red'
              : 'bg-card border-border text-dim'
          }`}>
          <Settings className="w-3.5 h-3.5" />
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Weekly strip */}
      <div className="grid grid-cols-7 gap-1.5">
        {[1,2,3,4,5,6,0].map(dayIdx => {
          const wType  = split[String(dayIdx)] || 'rest'
          const config = WORKOUT_TYPES[wType] || WORKOUT_TYPES.rest
          const offset = ((dayIdx - todayDow + 7) % 7)
          const isToday = offset === 0
          const score  = readinessForDay(config.muscles, muscleStatus, offset)

          return (
            <div key={dayIdx}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-2xl transition-all"
              style={{
                background: isToday ? `${config.color}15` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isToday ? config.color + '40' : '#1c1c28'}`,
              }}>
              <p className="text-[9px] font-mono font-bold" style={{ color: isToday ? config.color : '#555570' }}>
                {DAYS[dayIdx]}
              </p>
              <div className="text-sm leading-none">{config.emoji}</div>
              {/* Readiness bar */}
              {config.muscles.length > 0 && (
                <div className="w-6 h-1 rounded-full bg-surface overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${score}%`, background: config.color }} />
                </div>
              )}
              {isToday && (
                <div className="w-1.5 h-1.5 rounded-full"
                  style={{ background: config.color, boxShadow: `0 0 5px ${config.color}` }} />
              )}
            </div>
          )
        })}
      </div>

      {/* AI Optimization CTA */}
      <button onClick={getAISuggestion} disabled={aiLoading}
        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-white transition-all active:scale-[0.97] disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #ff375f 0%, #ff9f0a 50%, #ffd60a 100%)', boxShadow: '0 4px 20px rgba(255,55,95,0.25)' }}>
        {aiLoading
          ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing your plan...</>
          : <><Zap className="w-4 h-4" /> Optimize Plan with AI</>
        }
      </button>

      {/* AI suggestion card */}
      {aiSuggest && (
        <div className="bg-gradient-to-br from-red/8 to-orange/5 border border-red/15 rounded-3xl p-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-red to-orange flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-white font-bold text-sm">AI Recommendation</p>
          </div>
          <p className="text-subtle text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: aiSuggest
              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
              .replace(/\n/g, '<br/>') }} />
        </div>
      )}

      {/* Day-by-day detail list */}
      <div>
        <p className="text-dim text-[10px] font-mono uppercase tracking-wider mb-3">Schedule</p>
        <div className="space-y-2">
          {[1,2,3,4,5,6,0].map(dayIdx => {
            const wType  = split[String(dayIdx)] || 'rest'
            const config = WORKOUT_TYPES[wType] || WORKOUT_TYPES.rest
            const offset = ((dayIdx - todayDow + 7) % 7)
            const isToday = offset === 0
            const score  = readinessForDay(config.muscles, muscleStatus, offset)
            const dateObj = new Date(); dateObj.setDate(dateObj.getDate() + offset)
            const dateStr = dateObj.toLocaleDateString('en', { day: 'numeric', month: 'short' })

            return (
              <DayRow
                key={dayIdx}
                dayIdx={dayIdx}
                dayName={DAYS_FULL[dayIdx]}
                dateStr={dateStr}
                config={config}
                workoutType={wType}
                score={score}
                isToday={isToday}
                editing={editing}
                onTypeChange={handleSplitChange}
                muscleStatus={muscleStatus}
              />
            )
          })}
        </div>
      </div>

      {/* Save button */}
      {editing && (
        <button onClick={saveSplit} disabled={saving}
          className="w-full py-4 rounded-2xl font-black text-white bg-green transition-all active:scale-[0.97] flex items-center justify-center gap-2">
          {saving
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
            : <><Check className="w-4 h-4" /> Save Split</>
          }
        </button>
      )}
    </div>
  )
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
            {dayName.slice(0,3).toUpperCase()}
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
                    {config.muscles.slice(0,3).join(' · ')}
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
