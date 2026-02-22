// src/lib/exercises.js
import { supabase, fetchWithTimeout } from './supabase'

const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY
const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com'

/**
 * Fetches an exercise GIF from ExerciseDB and updates the local Supabase library
 */
export async function ensureExerciseImage(exercise) {
    if (!exercise || exercise.image_url) return exercise.image_url

    // If we have a key, try to fetch from RapidAPI
    if (!RAPIDAPI_KEY || RAPIDAPI_KEY === 'your_rapidapi_key_here') {
        console.warn("RapidAPI key not configured")
        return null
    }

    try {
        const url = `https://${RAPIDAPI_HOST}/exercises/name/${encodeURIComponent(exercise.name.toLowerCase())}`
        const options = {
            method: 'GET',
            headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST
            }
        }

        const response = await fetchWithTimeout(url, options, 5000)
        const data = await response.json()

        if (Array.isArray(data) && data.length > 0) {
            let gifUrl = data[0].gifUrl
            if (gifUrl && gifUrl.startsWith('http://')) {
                gifUrl = gifUrl.replace('http://', 'https://')
            }

            // Update Supabase so we have it permanently
            await supabase
                .from('exercise_library')
                .update({ image_url: gifUrl })
                .eq('id', exercise.id)

            return gifUrl
        }
    } catch (error) {
        console.error("Error fetching exercise GIF:", error)
    }

    return null
}
