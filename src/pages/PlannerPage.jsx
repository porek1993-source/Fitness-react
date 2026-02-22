// src/pages/PlannerPage.jsx
import { useState, useCallback } from 'react'
import { ChevronRight, Zap, RefreshCw, Check, Settings, Bed, Play, Info, X, Dumbbell, Loader } from 'lucide-react'
import { useApp, haptic } from '../lib/useAppStore'
import { optimizePlan, MUSCLE_LABELS } from '../lib/gemini'
import { readinessForDay, fatigueLabel } from '../lib/recovery'
import { supabase } from '../lib/supabase'
import { ensureExerciseImage } from '../lib/exercises'

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

const MUSCLES_BY_TYPE = {
  push: ['chest', 'shoulders', 'triceps'],
  pull: ['back', 'biceps', 'forearms'],
  legs: ['quads', 'hamstrings', 'calves', 'glutes'],
  upper: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
  lower: ['quads', 'hamstrings', 'calves', 'glutes'],
  fullbody: ['chest', 'back', 'shoulders', 'legs', 'core'],
  rest: []
}

function configForType(type) {
  return {
    ...(WORKOUT_TYPES[type] || WORKOUT_TYPES.rest),
    muscles: MUSCLES_BY_TYPE[type] || []
  }
}

export default function PlannerPage() {
  const { profile, updateProfile, muscleStatus, exercises } = useApp()
  const [editingDay, setEditingDay] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null) // New: for Viewing Workout
  const [selectedExercise, setSelectedExercise] = useState(null) // New: for Exercise Tech Detail
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

  const handleDayUpdateWithShift = async (type, shouldShift = false) => {
    if (!editingDay) return
    haptic([30])
    setIsUpdating(true)
    try {
      let newSplit = { ...split, [editingDay]: type }

      if (shouldShift) {
        // Shift remaining days
        const dayIds = ['1', '2', '3', '4', '5', '6', '0']
        const startIdx = dayIds.indexOf(editingDay)

        // Save the old values to shift them
        const dayValues = dayIds.map(id => split[id])

        for (let i = startIdx + 1; i < dayIds.length; i++) {
          newSplit[dayIds[i]] = dayValues[i - 1]
        }
      }

      await updateProfile({ weekly_split: newSplit })
      setPlanSummary(null)
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

  // ── Exercise Image Component (Fixed for Safari/CORS) ──────────────────────────
  function ExerciseImage({ exercise: ex, size = 52, color }) {
    const [loaded, setLoaded] = useState(false)
    const [loading, setLoading] = useState(true)
    const [imgError, setImgError] = useState(false)
    const [imageUrl, setImageUrl] = useState(ex?.image_url)

    useEffect(() => {
      if (!ex?.image_url) {
        ensureExerciseImage(ex).then(url => {
          if (url) setImageUrl(url)
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    }, [ex])

    const showPlaceholder = !imageUrl || imgError

    return (
      <div className={`flex-shrink-0 rounded-2xl overflow-hidden bg-surface border border-border flex items-center justify-center relative`}
        style={{ width: size, height: size }}>

        {loading && !showPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface z-10">
            <Loader className="w-5 h-5 animate-spin" style={{ color: color || '#0a84ff' }} />
          </div>
        )}

        {!showPlaceholder ? (
          <img
            src={imageUrl} alt={ex.name}
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => { setLoaded(true); setLoading(false) }}
            onError={() => {
              console.error("Image load error for:", ex.name);
              setImgError(true);
              setLoading(false)
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full bg-surface">
            <Dumbbell className="text-dim/50" style={{ width: size * 0.4, height: size * 0.4 }} />
          </div>
        )}
      </div>
    )
  }

  // ── Day Row Component ─────────────────────────────────────────────────────────
  function DayRow({ dayIdx, dayName, dateStr, config, workoutType, score, isToday, muscleStatus }) {
    const muscleStatuses = (config.muscles || []).map(m => ({
      id: m,
      fatigue: muscleStatus?.[m]?.fatigue || 0,
    })).sort((a, b) => b.fatigue - a.fatigue)

    const isRest = workoutType === 'rest'

    return (
      <div className={`bg-card border rounded-[32px] overflow-hidden transition-all active:scale-[0.98] ${isToday ? 'border-blue/40 shadow-lg shadow-blue/5' : 'border-border'
        }`}>
        <button
          onClick={() => { haptic([25]); setSelectedDay(dayIdx) }}
          className="w-full flex items-center gap-4 p-5 text-left"
        >
          {/* Day & Date */}
          <div className="w-14">
            <p className={`text-xs font-black ${isToday ? 'text-blue' : 'text-dim'}`}>
              {dayName.slice(0, 3).toUpperCase()}
            </p>
            <p className="text-[10px] font-mono text-muted">{dateStr}</p>
          </div>

          {/* Workout Type */}
          <div className="flex-1 flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-surface border border-border`}>
              {isRest ? '☕' : config.emoji}
            </div>
            <div>
              <p className="text-sm font-black text-white">{isRest ? 'Odpočinek' : config.label}</p>
              {!isRest && (
                <p className="text-[10px] font-mono text-dim capitalize">
                  {config.muscles.map(m => MUSCLE_LABELS[m] || m).slice(0, 2).join(' · ')}
                </p>
              )}
            </div>
          </div>

          {/* Ready & Button */}
          {!isRest ? (
            <div className="text-right">
              <p className="text-sm font-black text-blue">{score}%</p>
              <p className="text-[8px] font-mono text-dim uppercase tracking-widest">Ready</p>
            </div>
          ) : (
            <Bed className="w-5 h-5 text-dim" />
          )}
          <ChevronRight className="w-5 h-5 text-dim/50" />
        </button>
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

      <div className="flex-1 overflow-y-auto px-4 pb-32 space-y-6 scrollbar-none">

        {/* List of Days (The New Planner Focal Point) */}
        <div className="space-y-4">
          {DAYS.map(d => {
            const type = split[d.id]
            const cfg = WORKOUT_TYPES[type] || WORKOUT_TYPES.rest
            const today = new Date()
            const dayOfToday = today.getDay()
            const isToday = parseInt(d.id) === dayOfToday

            // Calculate readiness score for this day (simplified mockup for now)
            const score = configForType(type).muscles.length > 0
              ? readinessForDay(configForType(type).muscles, muscleStatus, (parseInt(d.id) - dayOfToday + 7) % 7)
              : 100

            return (
              <DayRow
                key={d.id}
                dayIdx={d.id}
                dayName={d.label}
                dateStr={d.short}
                config={configForType(type)}
                workoutType={type}
                score={score}
                isToday={isToday}
                muscleStatus={muscleStatus}
              />
            )
          })}
        </div>
      </div>

      {/* Day Interaction Modal (Viewing Workout or Changing Type) */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-slide-up">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedDay(null)} />
          <div className="relative w-full max-w-lg bg-card border-t border-border rounded-t-[40px] px-6 pt-10 pb-12 max-h-[90vh] flex flex-col">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-border rounded-full" />

            {/* Modal Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-white">{DAYS.find(d => d.id === selectedDay)?.label}</h2>
                <p className="text-dim text-xs font-mono uppercase">{configForType(split[selectedDay]).label}</p>
              </div>
              <button onClick={() => { haptic([20]); setEditingDay(selectedDay); setSelectedDay(null) }}
                className="p-3 rounded-2xl bg-surface border border-border text-dim hover:text-blue">
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {/* Workout Detail or Rest Day Prompt */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pb-6">
              {split[selectedDay] === 'rest' ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center text-4xl mb-4">☕</div>
                  <h3 className="text-lg font-bold text-white">Dnes je čas na regeneraci</h3>
                  <p className="text-dim text-sm max-w-[240px] mt-2 mb-8">Svaly potřebují čas na růst a obnovu.</p>

                  <button onClick={() => { haptic([30]); setEditingDay(selectedDay); setSelectedDay(null) }}
                    className="text-xs font-bold text-blue bg-blue/10 px-6 py-3 rounded-2xl border border-blue/20">
                    Změnit na trénink
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs font-black text-white uppercase tracking-widest">Seznam cviků</p>
                    <button onClick={() => { handleDayUpdateWithShift('rest', true); setSelectedDay(null) }}
                      className="flex items-center gap-2 text-[10px] font-black text-dim uppercase tracking-widest bg-surface border border-border px-3 py-1.5 rounded-xl hover:text-white transition-colors">
                      <Bed className="w-3 h-3" /> Nastavit Volno
                    </button>
                  </div>
                  <div className="space-y-4">
                    {exercises
                      .filter(ex => configForType(split[selectedDay]).muscles.includes(ex.muscle_group))
                      .slice(0, 6)
                      .map(ex => (
                        <button key={ex.id} onClick={() => { haptic([15]); setSelectedExercise(ex) }}
                          className="w-full flex items-center gap-4 bg-surface/50 border border-border p-3 rounded-[24px] hover:border-blue/30 transition-all group text-left">
                          <ExerciseImage exercise={ex} size={48} />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-white group-hover:text-blue transition-colors line-clamp-1">{ex.name}</p>
                            <p className="text-[10px] text-dim capitalize">{MUSCLE_LABELS[ex.muscle_group] || ex.muscle_group} · 3-4 série</p>
                          </div>
                          <Info className="w-4 h-4 text-dim/30 group-hover:text-dim transition-colors" />
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {split[selectedDay] !== 'rest' && (
              <button
                onClick={() => { haptic([40]); setSelectedDay(null); /* Action to start workout could go here */ }}
                className="w-full py-4 rounded-2xl bg-blue text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue/20">
                <Play className="w-4 h-4 fill-current" /> Začít trénink
              </button>
            )}
          </div>
        </div>
      )}

      {/* Exercise Detail Modal (Same logic as Library but integrated) */}
      {selectedExercise && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setSelectedExercise(null)} />
          <div className="relative w-full max-w-lg h-[85vh] bg-card border border-border rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex-1">
                <h3 className="text-xl font-black text-white">{selectedExercise.name}</h3>
                <p className="text-[10px] font-mono text-dim uppercase tracking-widest mt-1">
                  {MUSCLE_LABELS[selectedExercise.muscle_group] || selectedExercise.muscle_group}
                </p>
              </div>
              <button onClick={() => setSelectedExercise(null)}
                className="w-10 h-10 rounded-2xl bg-surface border border-border flex items-center justify-center text-dim">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="aspect-square w-full bg-black relative">
                <ExerciseImage exercise={selectedExercise} size="100%" />
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">Technika provedení</p>
                  <div className="text-subtle text-xs leading-relaxed space-y-2">
                    {selectedExercise.instructions ? (
                      selectedExercise.instructions.split('. ').map((step, i) => (
                        <div key={i} className="flex gap-3">
                          <span className="text-blue font-mono font-bold">{i + 1}.</span>
                          <p>{step}.</p>
                        </div>
                      ))
                    ) : (
                      <p className="italic text-dim">Návod k tomuto cviku se připravuje...</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <button key={id} onClick={() => {
                  if (id === 'rest') {
                    // Rest day specific logic or shift
                    handleDayUpdateWithShift(id, true)
                  } else {
                    handleDayUpdate(id)
                  }
                }}
                  disabled={isUpdating}
                  className={`flex flex-col items-center justify-center gap-2 p-5 rounded-3xl border transition-all ${split[editingDay] === id ? 'bg-blue/10 border-blue text-white ring-2 ring-blue/20' : 'bg-surface border-border text-dim hover:border-blue/30'
                    }`}>
                  {id === 'rest' && split[editingDay] !== 'rest' && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-lg bg-blue text-[8px] font-black text-white">SHIFT</div>
                  )}
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
