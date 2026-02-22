// src/pages/WorkoutLoggerPage.jsx
import { useState, useRef, useCallback } from 'react'
import { Search, Plus, Check, Trash2, ChevronDown, Dumbbell, HelpCircle, X, Loader } from 'lucide-react'
import { useApp, haptic } from '../lib/useAppStore'
import { getFormTips } from '../lib/gemini'

const WORKOUT_TYPES = {
  push: { label: 'Push', color: '#ff375f', muscles: ['chest', 'shoulders', 'triceps'] },
  pull: { label: 'Pull', color: '#0a84ff', muscles: ['back', 'biceps', 'forearms'] },
  legs: { label: 'Legs', color: '#ffd60a', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  upper: { label: 'Upper', color: '#bf5af2', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  lower: { label: 'Lower', color: '#ff9f0a', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'core'] },
  fullbody: { label: 'Full Body', color: '#30d158', muscles: ['chest', 'back', 'quads', 'hamstrings', 'shoulders', 'core'] },
}

export default function WorkoutLoggerPage() {
  const { exercises, logWorkout, profile } = useApp()

  // Workout state
  const todayDow = String(new Date().getDay())
  const todayDefault = profile?.weekly_split?.[todayDow] || 'push'
  const [workoutType, setWorkoutType] = useState(
    WORKOUT_TYPES[todayDefault] ? todayDefault : 'push'
  )
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [sets, setSets] = useState([{ weight: '', reps: '', done: false }])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formTip, setFormTip] = useState(null)
  const [tipLoading, setTipLoading] = useState(false)

  const config = WORKOUT_TYPES[workoutType]

  // Autocomplete filtering
  const suggestions = query.trim().length > 1
    ? exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : exercises.filter(e => config.muscles.includes(e.muscle_group)).slice(0, 8)

  const selectExercise = (ex) => {
    haptic([30])
    setSelected(ex)
    setQuery(ex.name)
    setSets([{ weight: '', reps: '', done: false }])
    setFormTip(null)
  }

  // Set management
  const updateSet = (idx, field, val) => {
    setSets(s => s.map((set, i) => i === idx ? { ...set, [field]: val } : set))
  }

  const toggleDone = (idx) => {
    haptic([50]) // Haptic feedback on set completion
    setSets(s => s.map((set, i) => i === idx ? { ...set, done: !set.done } : set))
  }

  const addSet = () => {
    haptic([25])
    const last = sets[sets.length - 1]
    setSets(s => [...s, { weight: last?.weight || '', reps: last?.reps || '', done: false }])
  }

  const removeSet = (idx) => {
    haptic([40])
    setSets(s => s.filter((_, i) => i !== idx))
  }

  const completedSets = sets.filter(s => s.done).length
  const totalVolume = sets.filter(s => s.done).reduce((sum, s) =>
    sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0)

  // Save workout
  const handleSave = async () => {
    if (!selected || completedSets === 0) return
    haptic(50) // Save haptic

    setSaving(true)
    await logWorkout({
      workoutType,
      exerciseName: selected.name,
      setsData: sets,
      muscleGroups: [selected.muscle_group, ...(selected.secondary_muscles || [])],
      notes,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      setSelected(null)
      setQuery('')
      setSets([{ weight: '', reps: '', done: false }])
      setNotes('')
    }, 1800)
  }

  // Form tips from Gemini
  const handleFormTips = async () => {
    if (!selected) return
    haptic([30])
    setTipLoading(true)
    const tip = await getFormTips(selected.name, null, null)
    setFormTip(tip)
    setTipLoading(false)
  }

  return (
    <div className="px-4 pb-6 space-y-4 animate-fade-in">
      <div className="pt-2">
        <h1 className="text-2xl font-black text-white">Log Workout</h1>
        <p className="text-dim text-xs font-mono mt-0.5">
          {new Date().toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'short' })}
        </p>
      </div>

      {/* ── Workout type selector ─────────────────────────────────────────────── */}
      <div>
        <p className="text-dim text-xs font-mono uppercase tracking-wider mb-2">Session Type</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {Object.entries(WORKOUT_TYPES).map(([id, cfg]) => (
            <button key={id} onClick={() => { haptic([25]); setWorkoutType(id) }}
              className="flex-shrink-0 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border"
              style={{
                borderColor: workoutType === id ? cfg.color : '#1c1c28',
                background: workoutType === id ? `${cfg.color}18` : 'transparent',
                color: workoutType === id ? cfg.color : '#555570',
              }}>
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Exercise search ───────────────────────────────────────────────────── */}
      <div className="relative">
        <p className="text-dim text-xs font-mono uppercase tracking-wider mb-2">Exercise</p>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null) }}
            placeholder={`Search or browse ${config.label} exercises...`}
            className="w-full bg-card border border-border rounded-2xl pl-10 pr-10 py-3.5 text-white text-sm outline-none focus:border-opacity-60 transition-colors placeholder:text-dim"
            style={{ '--tw-ring-color': config.color }}
            onFocus={e => e.target.style.borderColor = `${config.color}60`}
            onBlur={e => e.target.style.borderColor = '#1c1c28'}
          />
          {query && (
            <button onClick={() => { setQuery(''); setSelected(null) }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dim">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown suggestions */}
        {!selected && suggestions.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
            {suggestions.map((ex, i) => (
              <button key={ex.id}
                onClick={() => selectExercise(ex)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors text-left"
                style={{ borderBottom: i < suggestions.length - 1 ? '1px solid #1c1c28' : 'none' }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${config.color}15` }}>
                  <Dumbbell className="w-4 h-4" style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{ex.name}</p>
                  <p className="text-dim text-[10px] font-mono capitalize">{ex.muscle_group} · {ex.equipment}</p>
                </div>
                <span className="text-[10px] font-mono text-dim bg-surface rounded-full px-2 py-0.5">
                  {ex.difficulty}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Selected exercise details + sets ────────────────────────────────── */}
      {selected && (
        <div className="space-y-3 animate-fade-in">

          {/* Exercise card */}
          <div className="bg-card border rounded-3xl p-4 space-y-2"
            style={{ borderColor: `${config.color}30` }}>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${config.color}15` }}>
                <Dumbbell className="w-6 h-6" style={{ color: config.color }} />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-black text-base">{selected.name}</h3>
                <p className="text-dim text-xs font-mono capitalize">
                  {selected.muscle_group} · {selected.equipment} · {selected.difficulty}
                </p>
              </div>

              {/* Form tips button */}
              <button onClick={handleFormTips}
                className="flex-shrink-0 flex items-center gap-1.5 bg-surface border border-border rounded-xl px-3 py-2 text-xs text-subtle">
                {tipLoading
                  ? <Loader className="w-3 h-3 animate-spin" />
                  : <HelpCircle className="w-3 h-3" />}
                Form
              </button>
            </div>

            {/* Form tip panel */}
            {formTip && (
              <div className="bg-surface border border-border rounded-2xl p-3 mt-2">
                <p className="text-[10px] font-mono text-dim uppercase tracking-wider mb-2">Form Cues</p>
                <div className="text-white text-xs leading-relaxed space-y-1"
                  dangerouslySetInnerHTML={{ __html: formTip.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>').replace(/\n/g, '<br/>') }} />
              </div>
            )}
          </div>

          {/* Set tracker */}
          <div className="bg-card border border-border rounded-3xl p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-bold text-sm">Sets</p>
              {totalVolume > 0 && (
                <span className="text-xs font-mono" style={{ color: config.color }}>
                  {Math.round(totalVolume)} kg volume
                </span>
              )}
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[28px_1fr_1fr_44px_28px] gap-2 mb-2 px-1">
              {['#', 'Weight (kg)', 'Reps', 'Done', ''].map(h => (
                <p key={h} className="text-[10px] font-mono text-dim text-center">{h}</p>
              ))}
            </div>

            {/* Set rows */}
            <div className="space-y-2">
              {sets.map((set, i) => (
                <div key={i}
                  className={`grid grid-cols-[28px_1fr_1fr_44px_28px] gap-2 items-center rounded-2xl px-1 py-1 transition-all ${set.done ? 'opacity-50' : ''
                    }`}>
                  <span className="text-center text-xs font-mono text-dim">{i + 1}</span>

                  <input
                    type="number" inputMode="decimal" placeholder="0"
                    value={set.weight} onChange={e => updateSet(i, 'weight', e.target.value)}
                    className="bg-surface border border-border rounded-xl text-center py-2.5 text-white text-sm font-bold outline-none w-full"
                    style={{ '--focus-color': config.color }}
                    onFocus={e => e.target.style.borderColor = `${config.color}60`}
                    onBlur={e => e.target.style.borderColor = '#1c1c28'}
                  />

                  <input
                    type="number" inputMode="numeric" placeholder="0"
                    value={set.reps} onChange={e => updateSet(i, 'reps', e.target.value)}
                    className="bg-surface border border-border rounded-xl text-center py-2.5 text-white text-sm font-bold outline-none w-full"
                    onFocus={e => e.target.style.borderColor = `${config.color}60`}
                    onBlur={e => e.target.style.borderColor = '#1c1c28'}
                  />

                  <button onClick={() => toggleDone(i)}
                    className="h-10 rounded-xl border transition-all"
                    style={{
                      background: set.done ? `${config.color}20` : 'transparent',
                      borderColor: set.done ? config.color : '#1c1c28',
                      color: set.done ? config.color : '#555570',
                    }}>
                    <Check className="w-4 h-4 mx-auto" />
                  </button>

                  <button onClick={() => removeSet(i)} className="text-dim hover:text-red transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add set */}
            <button onClick={addSet}
              className="w-full mt-3 py-3 rounded-2xl border border-dashed flex items-center justify-center gap-2 text-sm font-semibold transition-all"
              style={{ borderColor: `${config.color}30`, color: config.color }}>
              <Plus className="w-4 h-4" />
              Add Set
            </button>
          </div>

          {/* Notes */}
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Notes (optional)..."
            rows={2}
            className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-white text-sm outline-none placeholder:text-dim resize-none"
          />

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || completedSets === 0}
            className="w-full py-4 rounded-2xl font-black text-lg text-white transition-all active:scale-[0.97] disabled:opacity-40"
            style={{
              background: saved
                ? 'linear-gradient(135deg, #30d158, #25a244)'
                : `linear-gradient(135deg, ${config.color}, ${config.color}cc)`,
              boxShadow: `0 4px 20px ${config.color}33`,
            }}
          >
            {saving ? <span className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</span>
              : saved ? '✓ Saved!'
                : completedSets === 0 ? 'Complete at least 1 set'
                  : `Save ${completedSets} set${completedSets !== 1 ? 's' : ''} · ${Math.round(totalVolume)} kg`}
          </button>
        </div>
      )}

      {/* Empty state */}
      {!selected && (
        <div className="text-center py-10">
          <div className="w-14 h-14 bg-card border border-border rounded-3xl flex items-center justify-center mx-auto mb-3">
            <Dumbbell className="w-6 h-6 text-dim" />
          </div>
          <p className="text-subtle text-sm font-semibold">Select an exercise to start logging</p>
          <p className="text-dim text-xs mt-1">Showing {config.label} exercises by default</p>
        </div>
      )}
    </div>
  )
}
