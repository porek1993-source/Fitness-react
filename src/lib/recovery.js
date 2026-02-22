// src/lib/recovery.js
// ─────────────────────────────────────────────────────────────────────────────
// Recovery Engine — all fatigue calculation logic
// 20% reduction per 24 hours, timestamp-based (accurate across page closes)
// ─────────────────────────────────────────────────────────────────────────────

const DECAY_RATE = 0.20      // 20% per 24h
const DAY_MS = 86_400_000 // 24h in ms

/**
 * Predict fatigue level at a future offset (in hours from now).
 * Uses exponential decay: F(t) = F0 × (0.8)^(t/24h)
 */
export function predictFatigue(currentFatigue, hoursAhead = 0) {
  if (currentFatigue <= 0) return 0
  const periods = hoursAhead / 24
  return Math.max(0, currentFatigue * Math.pow(1 - DECAY_RATE, periods))
}

/**
 * Apply decay to the full muscle_status object based on stored timestamps.
 * Returns a new object with updated fatigue values (does not mutate).
 */
export function applyDecayToStatus(muscleStatus) {
  if (!muscleStatus) return {}
  const now = Date.now()

  return Object.fromEntries(
    Object.entries(muscleStatus).map(([id, data]) => {
      const lastUpdated = data.last_updated ? new Date(data.last_updated).getTime() : null
      if (!lastUpdated || data.fatigue === 0) {
        return [id, { ...data, fatigue: 0 }]
      }
      const elapsed = now - lastUpdated
      const periods = elapsed / DAY_MS
      const fatigue = Math.max(0, data.fatigue * Math.pow(1 - DECAY_RATE, periods))
      return [id, { ...data, fatigue: Math.round(fatigue * 10) / 10 }]
    })
  )
}

/**
 * Calculate readiness score (0-100) for a set of muscle groups.
 * 100 = fully rested, 0 = all muscles critical.
 */
export function readinessScore(muscles, muscleStatus) {
  if (!muscles || muscles.length === 0) return 100
  const decayed = applyDecayToStatus(muscleStatus)
  const avg = muscles.reduce((sum, m) => sum + (decayed[m]?.fatigue || 0), 0) / muscles.length
  return Math.max(0, Math.round(100 - avg))
}

/**
 * Get readiness for a future day (offset in days from today).
 */
export function readinessForDay(muscles, muscleStatus, dayOffset) {
  if (!muscles || muscles.length === 0) return 100
  const decayed = applyDecayToStatus(muscleStatus)
  // Further apply decay for the offset
  const future = Object.fromEntries(
    Object.entries(decayed).map(([id, d]) => [
      id, { ...d, fatigue: predictFatigue(d.fatigue, dayOffset * 24) }
    ])
  )
  const avg = muscles.reduce((sum, m) => sum + (future[m]?.fatigue || 0), 0) / muscles.length
  return Math.max(0, Math.round(100 - avg))
}

/**
 * Convert fatigue percentage to display color.
 * 0% = #3a3a4a (grey), 50% = #ff9f0a (orange), 100% = #ff1744 (deep red)
 */
export function fatigueToColor(fatigue, opacity = 1) {
  const t = Math.min(Math.max(fatigue, 0), 100) / 100

  if (t === 0) return `rgba(58, 58, 74, ${opacity})`

  let r, g, b
  if (t < 0.4) {
    // Grey → Yellow
    const s = t / 0.4
    r = Math.round(58 + s * (255 - 58))
    g = Math.round(58 + s * (200 - 58))
    b = Math.round(74 - s * 74)
  } else if (t < 0.7) {
    // Yellow → Orange
    const s = (t - 0.4) / 0.3
    r = 255
    g = Math.round(200 - s * 90)
    b = 0
  } else {
    // Orange → Deep Red
    const s = (t - 0.7) / 0.3
    r = 255
    g = Math.round(110 - s * 110)
    b = 0
  }

  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export function fatigueToGlow(fatigue) {
  if (fatigue < 20) return 'none'
  const color = fatigueToColor(fatigue)
  const intensity = (fatigue / 100) * 14
  return `drop-shadow(0 0 ${intensity}px ${fatigueToColor(fatigue, 0.7)})`
}

export function fatigueLabel(fatigue) {
  const f = Math.round(fatigue)
  if (f === 0) return { text: 'Odpočatý', color: '#30d158', emoji: '✓' }
  if (f < 30) return { text: 'Nízká', color: '#ffd60a', emoji: '▲' }
  if (f < 60) return { text: 'Střední', color: '#ff9f0a', emoji: '▲▲' }
  if (f < 85) return { text: 'Vysoká', color: '#ff6b35', emoji: '▲▲▲' }
  return { text: 'Kritická', color: '#ff375f', emoji: '●' }
}

/**
 * Calculate volume added to each muscle from a completed workout.
 * Fatigue increase is proportional to volume relative to a baseline.
 */
export function calculateFatigueIncrease(setsData, muscleGroups) {
  const totalVolume = setsData
    .filter(s => s.done)
    .reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0)

  // Normalize: ~5000 kg/session = ~80 fatigue points
  const baseFatigue = Math.min(90, Math.round((totalVolume / 5000) * 80) + 25)

  return Object.fromEntries(
    muscleGroups.map(m => [m, baseFatigue])
  )
}

/**
 * Merge new fatigue into existing muscle_status.
 * Takes the higher value per muscle (you can't un-fatigue from a workout).
 */
export function mergeFatigue(muscleStatus, newFatigue) {
  const updated = { ...muscleStatus }
  const now = new Date().toISOString()

  Object.entries(newFatigue).forEach(([muscle, increase]) => {
    if (!updated[muscle]) return
    const current = applyDecayToStatus({ [muscle]: updated[muscle] })[muscle].fatigue
    updated[muscle] = {
      fatigue: Math.min(100, current + increase),
      last_updated: now,
    }
  })

  return updated
}

/** Hours until a muscle drops below a fatigue threshold */
export function hoursUntilRecovered(fatigue, targetFatigue = 30) {
  if (fatigue <= targetFatigue) return 0
  // Solve: fatigue × (0.8)^(h/24) = targetFatigue
  // h = 24 × log(targetFatigue/fatigue) / log(0.8)
  const h = 24 * Math.log(targetFatigue / fatigue) / Math.log(0.8)
  return Math.max(0, Math.round(h))
}

export const ACTIVITY_IMPACTS = {
  running: {
    label: 'Běh',
    emoji: '🏃',
    impact: { quads: 35, hamstrings: 35, calves: 25, glutes: 20, core: 10 }
  },
  cycling: {
    label: 'Kolo',
    emoji: '🚲',
    impact: { quads: 45, hamstrings: 25, calves: 20, glutes: 15 }
  },
  football: {
    label: 'Fotbal',
    emoji: '⚽',
    impact: { quads: 40, hamstrings: 40, calves: 30, glutes: 25, core: 15 }
  },
  swimming: {
    label: 'Plavání',
    emoji: '🏊',
    impact: { back: 30, shoulders: 30, core: 20, chest: 10, triceps: 10 }
  }
}
