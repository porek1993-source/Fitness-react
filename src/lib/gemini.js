// src/lib/gemini.js
// ─────────────────────────────────────────────────────────────────────────────
// Gemini 2.5 Flash-Lite client
// All calls inject muscle_status + recent workouts as grounding context
// ─────────────────────────────────────────────────────────────────────────────

const ENDPOINT = '/api/chat'

// Muscle labels for natural language
const MUSCLE_LABELS = {
  chest: 'Hrudník', back: 'Záda', shoulders: 'Ramena',
  biceps: 'Biceps', triceps: 'Triceps', forearms: 'Předloktí',
  core: 'Břicho/Střed', glutes: 'Hýždě', quads: 'Kvadricepsy',
  hamstrings: 'Hamstringy', calves: 'Lýtka',
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

  return `Jsi Agile Coach, elitní AI fitness kouč. Jsi přímý, motivující a opíráš se o data. Mluv výhradně ČESKY.

AKTUÁLNÍ STAV SVALŮ (po započtení regenerace):
${fatigueLines || '  • Všechny svaly jsou plně zregenerovány'}

NEDÁVNÁ HISTORIE TRÉNINKŮ:
${workoutLines || '  • Žádné nedávné tréninky'}

Pravidla:
- Odpovídej vždy ČESKY
- Buď PROAKTIVNÍ: začni s postřehy z výše uvedených dat, neptej se na obecné otázky
- Buď stručný, ale úderný — max 3 odstavce, pokud tě uživatel nepožádá o detail
- Pokud je únava > 70%, důrazně doporuč odpočinek nebo trénink jiných svalů
- Formátuj **tučně** názvy cviků, používej emoji pro lepší čitelnost`
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
  const prompt = `Generuj proaktivní koučovací zprávu (2-3 věty) v ČEŠTINĚ na základě aktuálních dat sportovce.
NEZAČÍNEJ stylem "Jak vám mohu pomoci". Místo toho rovnou odkazuj na jejich data.
Příklad: "Vaše [sval] jsou z [X]% zregenerovány — ideální čas na [cvik]. [specifické doporučení]."
Buď konkrétní, používej jejich reálná čísla únavy.`
  return callGemini(prompt, ctx, { temperature: 0.9 })
}

/** Form tips for a specific exercise */
export async function getFormTips(exerciseName, muscleStatus, recentWorkouts) {
  const ctx = buildContext(muscleStatus, recentWorkouts)
  const prompt = `Poskytni podrobné a stručné rady pro cvik **${exerciseName}** v ČEŠTINĚ.
Struktura odpovědi musí být přesně tato (použij emoji):

💪 **Technika**: Jak cvik správně provádět (3-4 body).
⚠️ **Pozor na**: Na co si dát pozor a nejčastější chyby (2 body).
🫁 **Dýchání**: Kdy se nadechnout a kdy vydechnout.`
  return callGemini(prompt, ctx, { temperature: 0.4, maxTokens: 500 })
}

/** Weekly plan optimization */
export async function optimizePlan(weeklyPlan, muscleStatus, recentWorkouts) {
  const ctx = buildContext(muscleStatus, recentWorkouts)
  const planStr = Object.entries(weeklyPlan)
    .map(([day, type]) => `Day ${day}: ${type}`)
    .join(', ')
  const prompt = `Analyzuj tento týdenní plán: ${planStr}
Na základě aktuální únavy navrhni konkrétní výměny nebo úpravy intenzity. Odpovídej v ČEŠTINĚ.
Formátuj odpověď takto: ⚠️ Nalezené problémy, ✅ Doporučené změny, 📅 Optimalizovaný rozvrh.`
  return callGemini(prompt, ctx, { temperature: 0.6, maxTokens: 600 })
}

export { applyDecayToStatus }
