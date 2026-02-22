// src/components/MuscleMap.jsx
import { useState } from 'react'
import { fatigueToColor, fatigueToGlow, fatigueLabel } from '../lib/recovery'
import { useApp, haptic } from '../lib/useAppStore'

const MUSCLE_PATHS = {
  front: {
    chest: {
      label: 'Hrudník',
      paths: [
        'M 79 102 C 79 97 84 94 100 94 C 116 94 121 97 121 102 L 116 131 C 115 135 109 137 100 137 C 91 137 85 135 84 131Z'
      ]
    },
    shoulders: {
      label: 'Ramena',
      paths: [
        'M 73 102 C 62 96 51 98 46 108 C 43 116 48 122 57 120 C 65 118 71 110 73 102Z',
        'M 127 102 C 138 96 149 98 154 108 C 157 116 152 122 143 120 C 135 118 129 110 127 102Z'
      ]
    },
    biceps: {
      label: 'Biceps',
      paths: [
        'M 55 122 C 48 122 42 129 40 138 C 38 148 40 157 47 159 C 53 157 57 150 59 141 C 62 132 60 124 55 122Z',
        'M 145 122 C 152 122 158 129 160 138 C 162 148 160 157 153 159 C 147 157 143 150 141 141 C 138 132 140 124 145 122Z'
      ]
    },
    forearms: {
      label: 'Předloktí',
      paths: [
        'M 44 162 C 38 162 32 168 31 178 C 30 188 33 198 40 200 C 46 198 50 190 51 180 C 53 170 51 163 44 162Z',
        'M 156 162 C 162 162 168 168 169 178 C 170 188 167 198 160 200 C 154 198 150 190 149 180 C 147 170 149 163 156 162Z'
      ]
    },
    core: {
      label: 'Střed těla',
      paths: [
        'M 84 139 C 84 136 89 134 100 134 C 111 134 116 136 116 139 L 113 179 C 113 183 107 185 100 185 C 93 185 87 183 87 179Z'
      ]
    },
    quads: {
      label: 'Kvadricepsy',
      paths: [
        'M 85 187 C 82 184 77 187 75 196 L 71 234 C 70 241 73 246 81 246 C 87 246 90 240 90 234 L 92 203 C 92 194 89 189 85 187Z',
        'M 115 187 C 118 184 123 187 125 196 L 129 234 C 130 241 127 246 119 246 C 113 246 110 240 110 234 L 108 203 C 108 194 111 189 115 187Z'
      ]
    },
    calves: {
      label: 'Lýtka',
      paths: [
        'M 77 250 C 72 248 69 253 69 263 L 69 298 C 69 305 73 309 79 308 C 85 307 87 301 87 293 L 88 268 C 88 257 82 252 77 250Z',
        'M 123 250 C 128 248 131 253 131 263 L 131 298 C 131 305 127 309 121 308 C 115 307 113 301 113 293 L 112 268 C 112 257 118 252 123 250Z'
      ]
    },
  },
  back: {
    back: {
      label: 'Záda',
      paths: [
        'M 79 98 C 79 94 84 91 100 91 C 116 91 121 94 121 98 L 116 172 C 116 176 108 179 100 179 C 92 179 84 176 84 172Z'
      ]
    },
    shoulders: {
      label: 'Ramena',
      paths: [
        'M 73 102 C 62 96 51 98 46 108 C 43 116 48 122 57 120 C 65 118 71 110 73 102Z',
        'M 127 102 C 138 96 149 98 154 108 C 157 116 152 122 143 120 C 135 118 129 110 127 102Z'
      ]
    },
    triceps: {
      label: 'Tricepsy',
      paths: [
        'M 55 122 C 48 122 42 129 40 138 C 38 148 40 157 47 159 C 53 157 57 150 59 141 C 62 132 60 124 55 122Z',
        'M 145 122 C 152 122 158 129 160 138 C 162 148 160 157 153 159 C 147 157 143 150 141 141 C 138 132 140 124 145 122Z'
      ]
    },
    forearms: {
      label: 'Předloktí',
      paths: [
        'M 44 162 C 38 162 32 168 31 178 C 30 188 33 198 40 200 C 46 198 50 190 51 180 C 53 170 51 163 44 162Z',
        'M 156 162 C 162 162 168 168 169 178 C 170 188 167 198 160 200 C 154 198 150 190 149 180 C 147 170 149 163 156 162Z'
      ]
    },
    glutes: {
      label: 'Hýždě',
      paths: [
        'M 81 181 C 76 178 70 181 68 190 L 65 218 C 64 225 68 230 77 230 C 85 230 88 224 88 218 L 89 197 C 89 188 85 182 81 181Z',
        'M 119 181 C 124 178 130 181 132 190 L 135 218 C 136 225 132 230 123 230 C 115 230 112 224 112 218 L 111 197 C 111 188 115 182 119 181Z'
      ]
    },
    hamstrings: {
      label: 'Hamstringy',
      paths: [
        'M 77 233 C 73 231 69 235 68 244 L 66 278 C 65 285 69 290 76 289 C 82 288 84 282 84 275 L 85 252 C 85 241 81 235 77 233Z',
        'M 123 233 C 127 231 131 235 132 244 L 134 278 C 135 285 131 290 124 289 C 118 288 116 282 116 275 L 115 252 C 115 241 119 235 123 233Z'
      ]
    },
    calves: {
      label: 'Lýtka',
      paths: [
        'M 74 293 C 70 291 67 296 67 306 L 67 338 C 67 345 70 349 77 348 C 83 347 85 341 85 333 L 85 310 C 85 300 79 295 74 293Z',
        'M 126 293 C 130 291 133 296 133 306 L 133 338 C 133 345 130 349 123 348 C 117 347 115 341 115 333 L 115 310 C 115 300 121 295 126 293Z'
      ]
    },
  }
}

const MUSCLE_PRESENCE = {
  chest: { front: true, back: false },
  shoulders: { front: true, back: true },
  biceps: { front: true, back: false },
  triceps: { front: false, back: true },
  forearms: { front: true, back: true },
  back: { front: false, back: true },
  core: { front: true, back: false },
  glutes: { front: false, back: true },
  quads: { front: true, back: false },
  hamstrings: { front: false, back: true },
  calves: { front: true, back: true },
}

function Silhouette() {
  return (
    <g fill="#0d0d16" stroke="#1e1e2e" strokeWidth="1.2">
      <ellipse cx="100" cy="72" rx="16" ry="18" />
      <path d="M 93 88 Q 100 93 107 88 L 107 97 Q 100 100 93 97Z" />
      <path d="M 73 100 L 127 100 L 122 188 L 78 188Z" />
      <path d="M 46 106 L 73 102 L 69 168 L 42 163Z" />
      <path d="M 127 102 L 154 106 L 158 163 L 131 168Z" />
      <path d="M 42 166 L 69 171 L 62 218 L 35 210Z" />
      <path d="M 131 171 L 158 166 L 165 210 L 138 218Z" />
      <ellipse cx="47" cy="225" rx="11" ry="8" transform="rotate(-8,47,225)" />
      <ellipse cx="153" cy="225" rx="11" ry="8" transform="rotate(8,153,225)" />
      <path d="M 78 188 L 100 188 L 97 312 L 71 307Z" />
      <path d="M 100 188 L 122 188 L 129 307 L 103 312Z" />
      <ellipse cx="84" cy="318" rx="15" ry="7" />
      <ellipse cx="116" cy="318" rx="15" ry="7" />
    </g>
  )
}

export default function MuscleMap({ muscleStatus, compact = false }) {
  const { selectedMuscle, setMuscle } = useApp()
  const [view, setView] = useState('front')
  const [tooltip, setTooltip] = useState(null)

  const handleMuscleClick = (muscleId) => {
    haptic([40])
    setMuscle(selectedMuscle === muscleId ? null : muscleId)
  }

  const currentPaths = MUSCLE_PATHS[view]
  const height = compact ? 280 : 340

  return (
    <div className="flex flex-col gap-3">
      {/* View toggle */}
      <div className="flex bg-surface rounded-2xl p-1 gap-1">
        {['front', 'back'].map(v => (
          <button key={v} onClick={() => { setView(v); haptic([25]) }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${view === v ? 'bg-border text-white' : 'text-dim'
              }`}>
            {v === 'front' ? '▷ Předek' : '◁ Záda'}
          </button>
        ))}
      </div>

      {/* SVG Map */}
      <div className="relative flex justify-center">
        <svg
          viewBox="25 55 150 280"
          style={{ width: '100%', maxWidth: compact ? 180 : 220, height }}
          className="overflow-visible"
        >
          <Silhouette />

          {/* Render visible muscles for current view */}
          {Object.entries(currentPaths).map(([muscleId, muscle]) => {
            const data = muscleStatus?.[muscleId]
            const fatigue = data?.fatigue ?? 0
            const fill = fatigueToColor(fatigue, fatigue > 0 ? 0.85 : 0.5)
            const stroke = fatigueToColor(fatigue, fatigue > 0 ? 1 : 0.35)
            const glow = fatigueToGlow(fatigue)
            const isSelected = selectedMuscle === muscleId
            const isCritical = fatigue > 80
            const lbl = fatigueLabel(fatigue)

            return (
              <g
                key={muscleId}
                onClick={() => handleMuscleClick(muscleId)}
                onMouseEnter={() => setTooltip({ id: muscleId, label: muscle.label, fatigue, lbl })}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: 'pointer' }}
              >
                {muscle.paths.map((d, i) => (
                  <path
                    key={i} d={d}
                    fill={fill} stroke={stroke}
                    strokeWidth={isSelected ? 2.5 : 1}
                    style={{
                      filter: isSelected
                        ? `drop-shadow(0 0 10px ${fatigueToColor(fatigue, 0.9)})`
                        : glow,
                      animation: isCritical ? 'pulseGlow 2s ease-in-out infinite' : undefined,
                      transition: 'fill 0.4s ease, stroke 0.4s ease',
                    }}
                  />
                ))}

                {/* Selection ring */}
                {isSelected && muscle.paths.map((d, i) => (
                  <path
                    key={`sel-${i}`} d={d} fill="none"
                    stroke="white" strokeWidth="1.5"
                    strokeDasharray="4 2" opacity="0.4"
                  />
                ))}
              </g>
            )
          })}
        </svg>

        {/* Floating tooltip */}
        {tooltip && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur border border-border rounded-2xl px-4 py-2.5 pointer-events-none z-10 shadow-xl min-w-[120px] text-center">
            <p className="text-white text-sm font-bold">{tooltip.label}</p>
            <p className="text-xs font-mono" style={{ color: tooltip.lbl.color }}>
              {tooltip.lbl.emoji} {Math.round(tooltip.fatigue)}% — {tooltip.lbl.text}
            </p>
          </div>
        )}
      </div>

      {/* Fatigue legend */}
      {!compact && (
        <div className="flex items-center justify-center gap-4 px-2">
          {[
            { label: 'Odpočatý', color: '#3a3a4a' },
            { label: 'Střední únava', color: '#ff9f0a' },
            { label: 'Kritická únava', color: '#ff375f' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color, boxShadow: `0 0 5px ${item.color}` }} />
              <span className="text-dim text-[10px] font-mono">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Selected muscle badge */}
      {selectedMuscle && (
        <div className="flex items-center justify-between bg-surface border border-border rounded-2xl px-4 py-2.5 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: fatigueToColor(muscleStatus?.[selectedMuscle]?.fatigue || 0) }} />
            <span className="text-white text-sm font-semibold">
              {Object.values(MUSCLE_PATHS.front).find((m, idx) => Object.keys(MUSCLE_PATHS.front)[idx] === selectedMuscle)?.label ||
                Object.values(MUSCLE_PATHS.back).find((m, idx) => Object.keys(MUSCLE_PATHS.back)[idx] === selectedMuscle)?.label ||
                selectedMuscle}
            </span>
          </div>
          <button onClick={() => setMuscle(null)} className="text-dim text-xs">Zrušit ×</button>
        </div>
      )}

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.85; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// Export muscle label helper
export { MUSCLE_PATHS, MUSCLE_PRESENCE }
