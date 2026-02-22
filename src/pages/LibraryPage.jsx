// src/pages/LibraryPage.jsx
import { useState } from 'react'
import { Search, Dumbbell, ChevronRight, Star, BarChart2, X, HelpCircle, Loader } from 'lucide-react'
import { useApp, haptic } from '../lib/useAppStore'
import { getFormTips } from '../lib/gemini'
import MuscleMap from '../components/MuscleMap'

const MUSCLE_OPTIONS = [
  'all','chest','back','shoulders','biceps','triceps','forearms','core','glutes','quads','hamstrings','calves'
]
const DIFF_COLORS = {
  'Beginner':     '#30d158',
  'Intermediate': '#ff9f0a',
  'Advanced':     '#ff375f',
}

export default function LibraryPage() {
  const { exercises, muscleStatus, selectedMuscle, setMuscle } = useApp()
  const [query,     setQuery]     = useState('')
  const [equipment, setEquipment] = useState('all')
  const [detail,    setDetail]    = useState(null)
  const [formTip,   setFormTip]   = useState(null)
  const [tipLoad,   setTipLoad]   = useState(false)

  // Active filter = selectedMuscle from body map OR local state
  const activeFilter = selectedMuscle || 'all'

  // Filter exercises
  const filtered = exercises.filter(ex => {
    const matchMuscle = activeFilter === 'all' || ex.muscle_group === activeFilter ||
                        (ex.secondary_muscles || []).includes(activeFilter)
    const matchQuery  = !query.trim() || ex.name.toLowerCase().includes(query.toLowerCase())
    const matchEquip  = equipment === 'all' || ex.equipment === equipment
    return matchMuscle && matchQuery && matchEquip
  })

  const equipmentOptions = ['all', ...new Set(exercises.map(e => e.equipment))]

  const openDetail = (ex) => {
    haptic([40])
    setDetail(ex)
    setFormTip(null)
  }

  const loadFormTips = async () => {
    if (!detail) return
    haptic([30])
    setTipLoad(true)
    const tip = await getFormTips(detail.name, muscleStatus, [])
    setFormTip(tip)
    setTipLoad(false)
  }

  return (
    <div className="px-4 pb-6 animate-fade-in">
      <div className="pt-2 mb-4">
        <h1 className="text-2xl font-black text-white">Exercise Library</h1>
        <p className="text-dim text-xs font-mono">{exercises.length} exercises · tap a muscle to filter</p>
      </div>

      {/* Body map filter (compact) */}
      <div className="bg-card border border-border rounded-3xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-white text-sm font-bold">Filter by Muscle</p>
          {selectedMuscle && (
            <button onClick={() => setMuscle(null)} className="text-xs text-dim flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
        <MuscleMap muscleStatus={muscleStatus} compact />
      </div>

      {/* Search + equipment filter */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search exercises..."
            className="w-full bg-card border border-border rounded-2xl pl-10 pr-4 py-3 text-white text-sm outline-none placeholder:text-dim"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {equipmentOptions.map(eq => (
            <button key={eq} onClick={() => { haptic([25]); setEquipment(eq) }}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all capitalize"
              style={{
                borderColor: equipment === eq ? '#0a84ff' : '#1c1c28',
                background:  equipment === eq ? 'rgba(10,132,255,0.12)' : 'transparent',
                color:       equipment === eq ? '#0a84ff' : '#555570',
              }}>
              {eq}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-dim text-xs font-mono mb-3">
        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        {activeFilter !== 'all' && <span className="text-blue"> · {activeFilter}</span>}
      </p>

      {/* Exercise grid */}
      <div className="space-y-3">
        {filtered.map(ex => (
          <ExerciseCard key={ex.id} exercise={ex} onClick={() => openDetail(ex)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Dumbbell className="w-10 h-10 text-dim mx-auto mb-3" />
          <p className="text-subtle text-sm">No exercises found</p>
          <button onClick={() => { setQuery(''); setMuscle(null); setEquipment('all') }}
            className="text-blue text-xs mt-2">Clear filters</button>
        </div>
      )}

      {/* Exercise detail sheet */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && setDetail(null)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-t-3xl p-5 pb-10 animate-slide-up max-h-[85vh] overflow-y-auto">

            {/* Handle */}
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />

            {/* Exercise header */}
            <div className="flex gap-4 mb-4">
              <ExerciseImage exercise={detail} size={72} />
              <div className="flex-1">
                <h2 className="text-white text-xl font-black">{detail.name}</h2>
                <p className="text-dim text-xs font-mono capitalize mt-0.5">
                  {detail.muscle_group} · {detail.equipment}
                </p>
                <span className="inline-block mt-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: `${DIFF_COLORS[detail.difficulty] || '#3a3a4a'}18`,
                    color: DIFF_COLORS[detail.difficulty] || '#888',
                  }}>
                  {detail.difficulty}
                </span>
              </div>
            </div>

            {/* Muscles */}
            <div className="mb-4">
              <p className="text-dim text-[10px] font-mono uppercase tracking-wider mb-2">Muscles</p>
              <div className="flex gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue/15 text-blue capitalize">
                  {detail.muscle_group} (primary)
                </span>
                {(detail.secondary_muscles || []).map(m => (
                  <span key={m} className="px-3 py-1 rounded-full text-xs font-mono bg-surface text-subtle capitalize">{m}</span>
                ))}
              </div>
            </div>

            {/* Instructions */}
            {detail.instructions && (
              <div className="mb-4">
                <p className="text-dim text-[10px] font-mono uppercase tracking-wider mb-2">Instructions</p>
                <p className="text-subtle text-sm leading-relaxed">{detail.instructions}</p>
              </div>
            )}

            {/* Form tips from AI */}
            <button onClick={loadFormTips}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-border text-white font-semibold text-sm mb-3">
              {tipLoad ? <Loader className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4 text-blue" />}
              {tipLoad ? 'Loading AI form cues...' : 'Get AI Form Tips'}
            </button>

            {formTip && (
              <div className="bg-surface border border-blue/20 rounded-2xl p-4 mb-3">
                <p className="text-[10px] font-mono text-blue uppercase tracking-wider mb-2">AI Form Cues</p>
                <div className="text-white text-xs leading-relaxed space-y-1"
                  dangerouslySetInnerHTML={{ __html: formTip.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
              </div>
            )}

            <button onClick={() => setDetail(null)}
              className="w-full py-3.5 rounded-2xl bg-surface text-dim font-semibold text-sm">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Exercise Card ─────────────────────────────────────────────────────────────
function ExerciseCard({ exercise: ex, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-3.5 text-left active:scale-[0.98] transition-all">
      <ExerciseImage exercise={ex} size={52} />

      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm truncate">{ex.name}</p>
        <p className="text-dim text-[10px] font-mono capitalize mt-0.5">
          {ex.muscle_group} · {ex.equipment}
        </p>
        {ex.secondary_muscles?.length > 0 && (
          <p className="text-[9px] font-mono mt-0.5" style={{ color: '#3a3a4a' }}>
            + {ex.secondary_muscles.slice(0,2).join(', ')}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
          style={{
            background: `${DIFF_COLORS[ex.difficulty] || '#3a3a4a'}15`,
            color: DIFF_COLORS[ex.difficulty] || '#888',
          }}>
          {ex.difficulty}
        </span>
        {ex.is_compound && (
          <span className="text-[9px] font-mono text-purple bg-purple/10 px-2 py-0.5 rounded-full">
            Compound
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-dim" />
      </div>
    </button>
  )
}

// ── Exercise Image / Placeholder ──────────────────────────────────────────────
function ExerciseImage({ exercise: ex, size = 52 }) {
  const [imgError, setImgError] = useState(false)
  const showPlaceholder = !ex.image_url || imgError

  return (
    <div className="flex-shrink-0 rounded-2xl overflow-hidden bg-surface border border-border flex items-center justify-center"
      style={{ width: size, height: size }}>
      {!showPlaceholder ? (
        <img
          src={ex.image_url} alt={ex.name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full bg-surface">
          <Dumbbell className="text-dim" style={{ width: size * 0.36, height: size * 0.36 }} />
          <p className="text-[8px] font-mono text-muted mt-0.5 capitalize px-1 text-center truncate w-full">
            {ex.muscle_group}
          </p>
        </div>
      )}
    </div>
  )
}
