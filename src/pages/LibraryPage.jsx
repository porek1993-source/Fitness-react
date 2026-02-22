// src/pages/LibraryPage.jsx
import { useState } from 'react'
import { Search, Dumbbell, ChevronRight, Star, BarChart2, X, HelpCircle, Loader, LayoutGrid, Wind, Zap, Box, Play } from 'lucide-react'
import { useApp, haptic } from '../lib/useAppStore'
import { getFormTips } from '../lib/gemini'
import MuscleMap from '../components/MuscleMap'

const EQUIPMENT = [
  { id: 'all', label: 'Vše', icon: <LayoutGrid className="w-4 h-4" /> },
  { id: 'bodyweight', label: 'Vlastní váha', icon: <Wind className="w-4 h-4" /> },
  { id: 'dumbbell', label: 'Jednoručky', icon: <Dumbbell className="w-4 h-4" /> },
  { id: 'barbell', label: 'Osa', icon: <Zap className="w-4 h-4" /> },
  { id: 'machine', label: 'Stroj', icon: <Box className="w-4 h-4" /> },
  { id: 'cables', label: 'Kladky', icon: <Play className="w-4 h-4" /> },
]

export default function LibraryPage() {
  const { exercises, selectedMuscle, setMuscle, muscleStatus, weeklyWorkouts } = useApp()
  const [search, setSearch] = useState('')
  const [equipment, setEquipment] = useState('all')
  const [details, setDetails] = useState(null)
  const [tips, setTips] = useState(null)
  const [tipsLoading, setTipsLoading] = useState(false)

  // Filter logic
  const filtered = exercises.filter(ex => {
    const s = search.toLowerCase()
    const matchSearch = ex.name.toLowerCase().includes(s) || ex.muscle_group.toLowerCase().includes(s)
    const matchEquip = equipment === 'all' || ex.equipment === equipment
    const matchMuscle = !selectedMuscle || ex.muscle_group === selectedMuscle || ex.secondary_muscles?.includes(selectedMuscle)
    return matchSearch && matchEquip && matchMuscle
  })

  const loadTips = async (ex) => {
    haptic([30])
    setTips(null)
    setTipsLoading(true)
    const t = await getFormTips(ex.name, muscleStatus, weeklyWorkouts)
    setTips(t)
    setTipsLoading(false)
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-2 pb-4 space-y-4 flex-shrink-0">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Knihovna cviků</h1>
            <p className="text-dim text-xs font-mono">Vyberte sval nebo hledejte</p>
          </div>
          <div className="bg-card border border-border rounded-full px-3 py-1 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue animate-pulse" />
            <span className="text-[10px] font-black text-white">{filtered.length} CVIKŮ</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Hledat cvik nebo sval..."
            className="w-full bg-card border border-border rounded-2xl pl-11 pr-4 py-3.5 text-white text-sm outline-none focus:border-blue/50 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dim">
              <span className="text-xs">Zrušit</span>
            </button>
          )}
        </div>

        {/* Equipment chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {EQUIPMENT.map(e => (
            <button key={e.id} onClick={() => { haptic([20]); setEquipment(e.id) }}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all ${equipment === e.id ? 'bg-blue text-white shadow-lg shadow-blue/20' : 'bg-card text-dim border border-border'
                }`}>
              {e.icon} {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body Map Filter Area */}
      <div className="px-4 mb-4 flex-shrink-0">
        <div className="bg-card/50 border border-border rounded-3xl p-4 flex gap-4 items-center">
          <div className="w-24 h-32 flex-shrink-0">
            <MuscleMap muscleStatus={muscleStatus} compact />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-mono text-dim uppercase tracking-wider mb-1">Filtr svalů</p>
            <p className="text-white font-black text-lg capitalize">{selectedMuscle || 'Všechny svaly'}</p>
            {selectedMuscle && (
              <button onClick={() => setMuscle(null)} className="text-blue text-xs font-bold mt-1">Zrušit výběr</button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-12 space-y-3">
        {filtered.map(ex => (
          <button key={ex.id} onClick={() => { haptic([30]); setDetails(ex); loadTips(ex) }}
            className="w-full flex items-center gap-4 bg-card border border-border rounded-3xl p-3 border-l-4 transition-all active:scale-[0.98]"
            style={{ borderLeftColor: ex.difficulty === 'advanced' ? '#ff375f' : ex.difficulty === 'intermediate' ? '#ff9f0a' : '#30d158' }}>
            <div className="w-16 h-16 rounded-2xl bg-surface overflow-hidden flex-shrink-0">
              {ex.image_url ? (
                <img src={ex.image_url} alt={ex.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-dim uppercase font-black text-[10px]">{ex.id.slice(0, 2)}</div>
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-white font-bold text-sm truncate">{ex.name}</p>
              <div className="flex gap-2 mt-1">
                <span className="text-[9px] font-mono text-muted uppercase">{ex.equipment}</span>
                <span className="text-[9px] font-mono text-muted uppercase">·</span>
                <span className="text-[9px] font-mono text-muted uppercase">{ex.muscle_group}</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-surface flex items-center justify-center text-dim flex-shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        ))}
      </div>

      {/* Detail Modal */}
      {details && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-slide-up">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDetails(null)} />
          <div className="relative w-full max-w-lg bg-card border-t border-border rounded-t-[40px] px-6 pt-8 pb-12 max-h-[90vh] overflow-y-auto">
            {/* Drag handle */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-border rounded-full" />

            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-dim text-[10px] font-mono uppercase tracking-widest mb-1">{details.muscle_group}</p>
                <h2 className="text-2xl font-black text-white">{details.name}</h2>
              </div>
              <button onClick={() => setDetails(null)} className="p-2 text-dim"><X /></button>
            </div>

            {/* AI Tips Section */}
            <div className="bg-gradient-to-br from-red/10 to-orange/5 border border-red/20 rounded-3xl p-5 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red to-orange flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm font-black text-white">Rady od AI Trenéra</h3>
              </div>

              {tipsLoading ? (
                <div className="space-y-3">
                  <div className="h-3 bg-white/5 rounded-full w-full animate-pulse" />
                  <div className="h-3 bg-white/5 rounded-full w-5/6 animate-pulse" />
                  <div className="h-3 bg-white/5 rounded-full w-2/3 animate-pulse" />
                </div>
              ) : tips ? (
                <div className="text-subtle text-xs leading-relaxed space-y-4"
                  dangerouslySetInnerHTML={{
                    __html: tips
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }} />
              ) : (
                <button onClick={() => loadTips(details)} className="text-red text-xs font-bold">Zkusit znovu načíst</button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-surface p-4 rounded-3xl">
                <p className="text-dim text-[10px] uppercase mb-1">Vybavení</p>
                <p className="text-white font-bold capitalize">{details.equipment}</p>
              </div>
              <div className="bg-surface p-4 rounded-3xl">
                <p className="text-dim text-[10px] uppercase mb-1">Obtížnost</p>
                <p className="text-white font-bold capitalize">{details.difficulty}</p>
              </div>
            </div>

            <button onClick={() => setDetails(null)}
              className="w-full py-4 rounded-2xl bg-white text-black font-black text-sm active:scale-[0.98] transition-all">
              Rozumím
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
            + {ex.secondary_muscles.slice(0, 2).join(', ')}
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
