// src/lib/gemini.js
// ─────────────────────────────────────────────────────────────────────────────
// Gemini 2.5 Flash-Lite client
// All calls inject muscle_status + recent workouts as grounding context
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const GEMINI_MODEL = 'gemini-2.5-flash-lite'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

// Muscle labels for natural language
const MUSCLE_LABELS = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders',
  biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms',
  core: 'Core', glutes: 'Glutes', quads: 'Quadriceps',
  hamstrings: 'Hamstrings', calves: 'Calves',
}

// ── Build grounding context from user data ───────────────────────────────────
function buildContext(muscleStatus, recentWorkouts = []) {
  // Apply decay before building context so AI sees accurate state
  const decayed = applyDecayToStatus(muscleStatus)

  const fatigueLines = Object.entries(decayed)
    .map(([m, d]) => `  • ${MUSCLE_LABELS[m] || m}: ${Math.round(d.fatigue)}% fatigue`)
    .join('\n')

  const workoutLines = recentWorkouts.slice(0, 5).map(w => {
    const date = new Date(w.logged_at).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
    return `  • ${date}: ${w.workout_type} — ${w.exercise_name} (${Math.round(w.total_volume || 0)} kg volume)`
  }).join('\n')

  return `You are Agile Coach, an elite AI fitness coach. You are direct, motivating, and data-driven.

CURRENT MUSCLE STATUS (post-recovery calculation):
${fatigueLines || '  • All muscles fully recovered'}

RECENT TRAINING HISTORY:
${workoutLines || '  • No recent workouts logged'}

Rules:
- Respond in the user's language (detect from their message)
- Be PROACTIVE: lead with insights from the data above, not generic questions  
- Be concise but impactful — max 3 paragraphs unless asked for detail
- When fatigue > 70%, strongly advise rest or alternative muscles
- Format with **bold** for exercise names, emojis for readability`
}

// Apply 20%/24h decay — mirror of the Recovery Engine
function applyDecayToStatus(muscleStatus) {
  if (!muscleStatus) return {}
  const now = Date.now()
  const DECAY_RATE = 0.20
  const DAY_MS = 24 * 3600 * 1000

  return Object.fromEntries(
    Object.entries(muscleStatus).map(([id, data]) => {
      if (!data.last_updated || data.fatigue === 0) return [id, data]
      const elapsed = now - new Date(data.last_updated).getTime()
      const periods = elapsed / DAY_MS
      const fatigue = Math.max(0, data.fatigue * Math.pow(1 - DECAY_RATE, periods))
      return [id, { ...data, fatigue: Math.round(fatigue * 10) / 10 }]
    })
  )
}

// ── Core API call ─────────────────────────────────────────────────────────────
async function callGemini(userMessage, systemContext, options = {}) {
  const { temperature = 0.7, maxTokens = 800 } = options

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemContext}\n\n---\nUser: ${userMessage}` }]
      }
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      topP: 0.8,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ]
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.'
}

// ── Public API ────────────────────────────────────────────────────────────────

/** General coach chat — has full context */
export async function chatWithCoach(message, muscleStatus, recentWorkouts) {
  const ctx = buildContext(muscleStatus, recentWorkouts)
  return callGemini(message, ctx)
}

/** Proactive opening message — AI leads with insights */
export async function getProactiveGreeting(muscleStatus, recentWorkouts) {
  const ctx = buildContext(muscleStatus, recentWorkouts)
  const prompt = `Generate a proactive coaching message (2-3 sentences) based on the athlete's current data.
DO NOT start with "How can I help". Instead, immediately reference their data.
Example format: "Your [muscle] is [X]% recovered — ideal timing for [exercise]. [specific recommendation]."
Be specific, use their actual fatigue numbers.`
  return callGemini(prompt, ctx, { temperature: 0.9 })
}

/** Form tips for a specific exercise */
export async function getFormTips(exerciseName, muscleStatus, recentWorkouts) {
  const ctx = buildContext(muscleStatus, recentWorkouts)
  const prompt = `Give concise form cues for **${exerciseName}** (4-6 bullet points).
Format: 🎯 **Cue name**: brief explanation. Include one common mistake to avoid.`
  return callGemini(prompt, ctx, { temperature: 0.4, maxTokens: 500 })
}

/** Weekly plan optimization */
export async function optimizePlan(weeklyPlan, muscleStatus, recentWorkouts) {
  const ctx = buildContext(muscleStatus, recentWorkouts)
  const planStr = Object.entries(weeklyPlan)
    .map(([day, type]) => `Day ${day}: ${type}`)
    .join(', ')
  const prompt = `Analyze this weekly training split: ${planStr}
Based on current fatigue levels, suggest specific swaps or intensity adjustments.
Format your response with: ⚠️ Issues found, ✅ Recommended changes, 📅 Optimized schedule.`
  return callGemini(prompt, ctx, { temperature: 0.6, maxTokens: 600 })
}

export { applyDecayToStatus }
