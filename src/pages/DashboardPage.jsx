// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react'
import { Zap, Activity, TrendingUp, Clock, ChevronRight, RefreshCw, Sliders, Footprints } from 'lucide-react'
import { useApp, haptic } from '../lib/useAppStore'
import { getProactiveGreeting } from '../lib/gemini'
import { MUSCLE_LABELS } from '../lib/gemini'
import { fatigueLabel, hoursUntilRecovered, readinessScore, ACTIVITY_IMPACTS } from '../lib/recovery'
import MuscleMap from '../components/MuscleMap'

const WORKOUT_CONFIGS = {
  push: { label: 'Tlaky (Push)', color: '#ff375f', muscles: ['chest', 'shoulders', 'triceps'] },
  pull: { label: 'Tahy (Pull)', color: '#0a84ff', muscles: ['back', 'biceps', 'forearms'] },
  legs: { label: 'Nohy (Legs)', color: '#ffd60a', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  upper: { label: 'Vršek těla', color: '#bf5af2', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  lower: { label: 'Spodek těla', color: '#ff9f0a', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'core'] },
  fullbody: { label: 'Celé tělo', color: '#30d158', muscles: ['chest', 'back', 'quads', 'hamstrings', 'shoulders', 'core'] },
  rest: { label: 'Odpočinek', color: '#3a3a4a', muscles: [] },
}

const DAYS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']

export default function DashboardPage() {
  const { profile, muscleStatus, weeklyWorkouts, pendingSync, onlineStatus, setTab, getDecayedMuscleStatus, updateMuscleStatus, logActivity } = useApp()
  const [greeting, setGreeting] = useState(null)
  const [greetLoad, setGreetLoad] = useState(true)
  const [showFatigueModal, setShowFatigueModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [activityType, setActivityType] = useState('running')
  const [activityIntensity, setActivityIntensity] = useState(1.0)

  const decayed = getDecayedMuscleStatus()
  const todayDow = new Date().getDay()
  const todayWorkoutType = profile?.weekly_split?.[String(todayDow)] || 'rest'
  const todayConfig = WORKOUT_CONFIGS[todayWorkoutType] || WORKOUT_CONFIGS.rest
  const todayReadiness = readinessScore(todayConfig.muscles, muscleStatus)

  // Most fatigued muscles
  const rankedMuscles = Object.entries(decayed)
    .filter(([, d]) => d.fatigue > 5)
    .sort(([, a], [, b]) => b.fatigue - a.fatigue)
    .slice(0, 4)

  // Weekly volume stat
  const weeklyVolume = weeklyWorkouts.reduce((s, w) => s + (w.total_volume || 0), 0)

  // Load proactive AI greeting
  useEffect(() => {
    if (!muscleStatus) return
    let cancelled = false
    setGreetLoad(true)

    getProactiveGreeting(muscleStatus, weeklyWorkouts)
      .then(text => { if (!cancelled) { setGreeting(text); setGreetLoad(false) } })
      .catch(() => { if (!cancelled) { setGreeting(null); setGreetLoad(false) } })

    return () => { cancelled = true }
  }, [profile?.id])

  return (
    <div className="px-4 pb-6 space-y-5 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="pt-2 flex items-start justify-between">
        <div>
          <p className="text-dim text-xs font-mono tracking-wider uppercase">
            {new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            Dobré {getGreeting()}, {profile?.display_name?.split(' ')[0] || 'Sportovče'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Sync badge */}
          {pendingSync > 0 && (
            <div className="flex items-center gap-1.5 bg-yellow/10 border border-yellow/20 rounded-full px-2.5 py-1">
              <RefreshCw className="w-3 h-3 text-yellow animate-spin" />
              <span className="text-yellow text-[10px] font-mono">{pendingSync}</span>
            </div>
          )}
          {/* Online indicator */}
          <div className={`w-2 h-2 rounded-full ${onlineStatus ? 'bg-green' : 'bg-red'}`}
            style={{ boxShadow: `0 0 6px ${onlineStatus ? '#30d158' : '#ff375f'}` }} />
        </div>
      </div>

      {/* ── AI Greeting card ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-card to-surface border border-border rounded-3xl p-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex gap-3 relative">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-red to-orange flex items-center justify-center flex-shrink-0 shadow-lg shadow-red/20">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono text-dim tracking-wider uppercase mb-1">AI Trenér</p>
            {greetLoad ? (
              <div className="space-y-2">
                <div className="h-3 bg-muted/60 rounded-full w-full animate-pulse" />
                <div className="h-3 bg-muted/60 rounded-full w-4/5 animate-pulse" />
              </div>
            ) : greeting ? (
              <p className="text-white text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: greeting.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            ) : (
              <p className="text-subtle text-sm">Klikni na kartu Trenér pro osobní tipy.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Today's workout hero ─────────────────────────────────────────────── */}
      <button
        onClick={() => { haptic([40]); setTab('planner') }}
        className="w-full text-left rounded-3xl p-4 relative overflow-hidden transition-all active:scale-[0.98]"
        style={{
          background: `linear-gradient(135deg, ${todayConfig.color}15 0%, ${todayConfig.color}06 100%)`,
          border: `1px solid ${todayConfig.color}30`,
        }}
      >
        <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${todayConfig.color}12 0%, transparent 70%)` }} />

        <div className="relative flex items-center gap-3">
          {/* Readiness ring */}
          <ReadinessRing score={todayReadiness} color={todayConfig.color} />

          <div className="flex-1">
            <p className="text-[10px] font-mono tracking-wider uppercase mb-0.5"
              style={{ color: todayConfig.color }}>DNES</p>
            <p className="text-white text-lg font-black">{todayConfig.label}</p>
            <p className="text-subtle text-xs mt-0.5">
              {todayConfig.muscles.map(m => MUSCLE_LABELS[m] || m).slice(0, 3).join(' · ')}
              {todayConfig.muscles.length > 3 && ` +${todayConfig.muscles.length - 3}`}
            </p>
          </div>

          <ChevronRight className="w-5 h-5 text-dim" />
        </div>
      </button>

      {/* ── Quick stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tento týden', value: weeklyWorkouts.length, unit: 'tréninky', icon: <TrendingUp className="w-4 h-4" />, color: '#0a84ff' },
          { label: 'Objem', value: Math.round(weeklyVolume / 1000 * 10) / 10, unit: 'tun', icon: <Zap className="w-4 h-4" />, color: '#ff9f0a' },
          { label: 'Připravenost', value: todayReadiness, unit: '%', icon: <Clock className="w-4 h-4" />, color: todayReadiness > 70 ? '#30d158' : '#ff375f' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-3 text-center">
            <div className="flex justify-center mb-1.5" style={{ color: s.color }}>{s.icon}</div>
            <p className="text-white text-xl font-black leading-none">{s.value}</p>
            <p className="text-[9px] font-mono text-dim mt-0.5 uppercase">{s.unit}</p>
            <p className="text-[9px] text-dim mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Muscle Status Section ────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-[40px] p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Stav svalů</h2>
            <p className="text-dim text-[10px] font-mono uppercase tracking-widest">Detailní analýza únavy</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { haptic([25]); setShowActivityModal(true) }}
              className="w-10 h-10 rounded-2xl bg-surface border border-border flex items-center justify-center text-blue">
              <Footprints className="w-5 h-5" />
            </button>
            <button onClick={() => { haptic([25]); setShowFatigueModal(true) }}
              className="w-10 h-10 rounded-2xl bg-surface border border-border flex items-center justify-center text-red">
              <Sliders className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Muscle Map ───────────────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-3xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-bold text-sm">Mapa svalů</p>
            <button onClick={() => { haptic([25]); setTab('library') }}
              className="text-blue text-xs font-mono flex items-center gap-1">
              Zobrazit cviky <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <MuscleMap muscleStatus={decayed} compact />
        </div>

        {/* ── Fatigue breakdown ────────────────────────────────────────────────── */}
        {rankedMuscles.length > 0 && (
          <div className="bg-card border border-border rounded-3xl p-4">
            <p className="text-white font-bold text-sm mb-3">Stav regenerace</p>
            <div className="space-y-3">
              {rankedMuscles.map(([id, data]) => {
                const lbl = fatigueLabel(data.fatigue)
                const hours = hoursUntilRecovered(data.fatigue)
                return (
                  <div key={id} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: lbl.color, boxShadow: `0 0 6px ${lbl.color}` }} />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-white font-semibold capitalize">{MUSCLE_LABELS[id] || id}</span>
                        <span className="text-xs font-mono" style={{ color: lbl.color }}>
                          {Math.round(data.fatigue)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${data.fatigue}%`, background: `linear-gradient(to right, ${lbl.color}80, ${lbl.color})` }} />
                      </div>
                    </div>
                    {hours > 0 && (
                      <span className="text-[10px] font-mono text-dim w-14 text-right flex-shrink-0">
                        za {hours}h
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Week overview strip ──────────────────────────────────────────────── */}
      <div>
        <p className="text-white font-bold text-sm mb-3">Tento týden</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {DAYS.map((day, idx) => {
            const workoutType = profile?.weekly_split?.[String(idx)] || 'rest'
            const config = WORKOUT_CONFIGS[workoutType] || WORKOUT_CONFIGS.rest
            const isToday = idx === todayDow
            const readiness = readinessScore(config.muscles, muscleStatus)

            return (
              <div key={day} className={`flex-shrink-0 flex flex-col items-center gap-1.5 rounded-2xl p-2.5 transition-all ${isToday ? 'border-2' : 'border border-border bg-card'
                }`} style={isToday ? {
                  borderColor: config.color,
                  background: `${config.color}12`,
                } : {}}>
                <p className={`text-[10px] font-mono font-bold ${isToday ? 'text-white' : 'text-dim'}`}>{day}</p>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                  style={{ background: `${config.color}20`, border: `1px solid ${config.color}30` }}>
                  {workoutType === 'rest' ? '—' : '💪'}
                </div>
                <div className="w-7 h-1 rounded-full bg-surface overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${readiness}%`,
                    background: config.color,
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Manual Fatigue Modal */}
      {showFatigueModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-slide-up">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowFatigueModal(false)} />
          <div className="relative w-full max-w-lg bg-card border-t border-border rounded-t-[40px] p-6 max-h-[90vh] overflow-y-auto">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-border rounded-full" />

            <div className="mb-6 mt-2">
              <h3 className="text-2xl font-black text-white">Upravit únavu</h3>
              <p className="text-dim text-xs">Nastavte aktuální úroveň únavy pro každý sval</p>
            </div>

            <div className="space-y-4 mb-8">
              {Object.entries(MUSCLE_LABELS).map(([id, label]) => {
                const fatigue = muscleStatus?.[id]?.fatigue || 0
                return (
                  <div key={id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white font-bold">{label}</span>
                      <span className="text-mono text-dim">{Math.round(fatigue)}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100" step="1"
                      value={fatigue}
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        updateMuscleStatus({ [id]: { fatigue: val, last_updated: new Date().toISOString() } })
                      }}
                      className="w-full accent-blue appearance-none bg-surface h-1.5 rounded-full outline-none"
                    />
                  </div>
                )
              })}
            </div>

            <button onClick={() => setShowFatigueModal(false)}
              className="w-full py-4 rounded-2xl bg-blue text-white font-black text-sm">
              Hotovo
            </button>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-slide-up">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowActivityModal(false)} />
          <div className="relative w-full max-w-lg bg-card border-t border-border rounded-t-[40px] p-6 max-h-[80vh] overflow-y-auto">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-border rounded-full" />

            <div className="mb-6 mt-2">
              <h3 className="text-2xl font-black text-white">Zapsat aktivitu</h3>
              <p className="text-dim text-xs">Zaznamenejte jiný sport a jeho vliv na únavu</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {Object.entries(ACTIVITY_IMPACTS).map(([id, cfg]) => (
                <button key={id} onClick={() => { haptic([20]); setActivityType(id) }}
                  className={`flex flex-col items-center gap-2 p-5 rounded-3xl border transition-all ${activityType === id ? 'bg-blue/10 border-blue' : 'bg-surface border-border'
                    }`}>
                  <span className="text-2xl">{cfg.emoji}</span>
                  <span className={`text-xs font-bold ${activityType === id ? 'text-white' : 'text-dim'}`}>{cfg.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white font-bold">Intenzita / Délka</span>
                <span className="text-mono text-blue font-bold">{activityIntensity.toFixed(1)}x</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] text-dim font-mono">Lehká</span>
                <input
                  type="range" min="0.5" max="2.0" step="0.1"
                  value={activityIntensity}
                  onChange={(e) => setActivityIntensity(parseFloat(e.target.value))}
                  className="flex-1 accent-blue appearance-none bg-surface h-1.5 rounded-full outline-none"
                />
                <span className="text-[10px] text-dim font-mono">Těžká</span>
              </div>
            </div>

            <button onClick={async () => {
              await logActivity(activityType, activityIntensity)
              setShowActivityModal(false)
            }}
              className="w-full py-4 rounded-2xl bg-blue text-white font-black text-sm">
              Zapsat a přepočítat únavu
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ReadinessRing({ score, color, size = 56 }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a1a2e" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={4} strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: 'stroke-dasharray 0.6s ease' }} />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle"
        fill={color} fontSize={13} fontWeight={800} fontFamily="-apple-system, sans-serif">
        {score}
      </text>
    </svg>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'jitro'
  if (h < 17) return 'odpoledne'
  return 'večer'
}
