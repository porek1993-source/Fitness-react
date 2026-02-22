// src/lib/supabase.js
// ─────────────────────────────────────────────────────────────────────────────
// Supabase client + typed helpers + offline queue
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://tjtdkqlasjrnjcucnvvz.supabase.co'
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: { params: { eventsPerSecond: 10 } },
})

// Resilience helper for external APIs
export async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    throw error
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE SYNC QUEUE
// Workouts logged offline are stored in localStorage and replayed on reconnect.
// ─────────────────────────────────────────────────────────────────────────────

const QUEUE_KEY = 'agile_offline_queue'

export function enqueueOffline(record) {
  const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  q.push({ ...record, _queued_at: Date.now() })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
}

export async function flushOfflineQueue() {
  const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  if (!q.length) return 0

  const failed = []
  for (const item of q) {
    const { _queued_at, ...record } = item
    const { error } = await supabase.from('workouts').insert(record)
    if (error) failed.push(item)
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(failed))
  return q.length - failed.length
}

export function getQueueLength() {
  return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]').length
}

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISE DATA ENRICHMENT (RapidAPI ExerciseDB)
// ─────────────────────────────────────────────────────────────────────────────

export async function getExerciseData(exerciseName) {
  if (!exerciseName) return null

  // 1. Check if exercise already exists in Supabase
  const { data: existing, error: fetchError } = await supabase
    .from('exercise_library')
    .select('*')
    .ilike('name', exerciseName)
    .single()

  if (existing) {
    return existing
  }

  // 2. Fetch from ExerciseDB (RapidAPI)
  const RAPID_API_KEY = import.meta.env.VITE_RAPIDAPI_KEY
  if (!RAPID_API_KEY) {
    console.warn('VITE_RAPIDAPI_KEY not found')
    return null
  }

  try {
    const url = `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(exerciseName.toLowerCase())}`
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPID_API_KEY,
        'x-rapidapi-host': 'exercisedb.p.rapidapi.com'
      }
    }

    const res = await fetchWithTimeout(url, options, 5000)
    if (!res.ok) throw new Error(`RapidAPI error: ${res.status}`)

    const apiData = await res.json()
    if (!apiData || apiData.length === 0) return null

    // Use the first match
    const ex = apiData[0]

    // 3. Map to our schema
    const newRecord = {
      name: ex.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      muscle_group: ex.target,
      secondary_muscles: ex.secondaryMuscles || [],
      equipment: ex.equipment.charAt(0).toUpperCase() + ex.equipment.slice(1),
      instructions: ex.instructions ? ex.instructions.join('\n') : null,
      image_url: ex.gifUrl,
      difficulty: 'Intermediate', // Default
    }

    // 4. Insert into Supabase
    const { data: inserted, error: insertError } = await supabase
      .from('exercise_library')
      .insert(newRecord)
      .select()
      .single()

    if (insertError) {
      console.error('Failed to cache exercise in Supabase:', insertError)
      return newRecord // Return the record anyway so the UI can show it
    }

    return inserted
  } catch (error) {
    console.error('getExerciseData error:', error)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SQL SCHEMA (run in Supabase SQL editor)
// ─────────────────────────────────────────────────────────────────────────────
/*
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id              uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email           text,
  display_name    text,
  muscle_status   jsonb NOT NULL DEFAULT '{
    "chest":      {"fatigue": 0, "last_updated": null},
    "back":       {"fatigue": 0, "last_updated": null},
    "shoulders":  {"fatigue": 0, "last_updated": null},
    "biceps":     {"fatigue": 0, "last_updated": null},
    "triceps":    {"fatigue": 0, "last_updated": null},
    "forearms":   {"fatigue": 0, "last_updated": null},
    "core":       {"fatigue": 0, "last_updated": null},
    "glutes":     {"fatigue": 0, "last_updated": null},
    "quads":      {"fatigue": 0, "last_updated": null},
    "hamstrings": {"fatigue": 0, "last_updated": null},
    "calves":     {"fatigue": 0, "last_updated": null}
  }',
  weekly_split    jsonb NOT NULL DEFAULT '{"1":"rest","2":"rest","3":"rest","4":"rest","5":"rest","6":"rest","0":"rest"}',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own profile"
  ON public.profiles FOR ALL USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ── workouts ──────────────────────────────────────────────────────────────────
CREATE TABLE public.workouts (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  workout_type text NOT NULL,            -- e.g. 'push', 'pull', 'legs'
  exercise_id  uuid,                     -- FK to exercise_library (nullable)
  exercise_name text NOT NULL,
  sets_data    jsonb NOT NULL DEFAULT '[]', -- [{set: 1, weight: 80, reps: 8, done: true}]
  total_volume float GENERATED ALWAYS AS (
    (SELECT SUM((s->>'weight')::float * (s->>'reps')::float)
     FROM jsonb_array_elements(sets_data) AS s
     WHERE (s->>'done')::boolean = true)
  ) STORED,
  muscle_groups text[] NOT NULL DEFAULT '{}',
  notes       text,
  logged_at   timestamptz DEFAULT now(),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own workouts"
  ON public.workouts FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_workouts_user_logged ON public.workouts(user_id, logged_at DESC);

-- ── exercise_library ──────────────────────────────────────────────────────────
CREATE TABLE public.exercise_library (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name         text NOT NULL,
  muscle_group text NOT NULL,            -- primary muscle
  secondary_muscles text[] DEFAULT '{}',
  equipment    text NOT NULL DEFAULT 'Barbell',
  difficulty   text NOT NULL DEFAULT 'Intermediate',
  instructions text,
  tips         text,
  image_url    text,                     -- URL to image or GIF
  is_compound  boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

-- Public read access for exercise library
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read exercise library"
  ON public.exercise_library FOR SELECT USING (true);

-- ── Sample exercise data ──────────────────────────────────────────────────────
INSERT INTO public.exercise_library (name, muscle_group, secondary_muscles, equipment, difficulty, instructions, is_compound, image_url) VALUES
('Bench Press',          'chest',      ARRAY['shoulders','triceps'],      'Barbell',    'Intermediate', 'Lie on bench, grip slightly wider than shoulder-width. Lower bar to chest, press up explosively.',  true,  null),
('Incline Dumbbell Press','chest',     ARRAY['shoulders','triceps'],      'Dumbbell',   'Intermediate', 'Set bench to 30-45°. Press dumbbells from chest level overhead.',                                   true,  null),
('Cable Fly',            'chest',      ARRAY['shoulders'],                'Cables',     'Beginner',     'Stand between cables. With slight elbow bend, bring hands together in arc motion.',                false, null),
('Deadlift',             'back',       ARRAY['glutes','hamstrings','core'],'Barbell',   'Advanced',     'Hip-width stance, bar over mid-foot. Hinge at hips, drive heels into floor.',                      true,  null),
('Pull-up',              'back',       ARRAY['biceps','forearms'],        'Bodyweight', 'Intermediate', 'Hang from bar, pull until chin clears bar. Full extension at bottom.',                             true,  null),
('Seated Cable Row',     'back',       ARRAY['biceps','rear delts'],      'Cables',     'Beginner',     'Sit upright, pull handle to lower chest. Keep elbows close to body.',                             false, null),
('Overhead Press',       'shoulders',  ARRAY['triceps','upper traps'],    'Barbell',    'Intermediate', 'Press bar overhead from front rack. Lock out arms fully at top.',                                  true,  null),
('Lateral Raise',        'shoulders',  ARRAY['traps'],                    'Dumbbell',   'Beginner',     'Raise dumbbells to shoulder height with slight elbow bend. Control the descent.',                 false, null),
('Barbell Curl',         'biceps',     ARRAY['forearms'],                 'Barbell',    'Beginner',     'Supinated grip. Curl bar to chin, squeeze at top. No swinging.',                                  false, null),
('Skull Crusher',        'triceps',    ARRAY['chest'],                    'Barbell',    'Intermediate', 'Lie on bench. Lower bar to forehead by bending elbows, press back up.',                          false, null),
('Squat',                'quads',      ARRAY['glutes','hamstrings','core'],'Barbell',   'Intermediate', 'Bar on upper traps. Descent until thighs parallel. Drive through heels.',                        true,  null),
('Romanian Deadlift',    'hamstrings', ARRAY['glutes','back'],            'Barbell',    'Intermediate', 'Hip hinge with slight knee bend. Lower bar along legs to mid-shin.',                              true,  null),
('Hip Thrust',           'glutes',     ARRAY['hamstrings','quads'],       'Barbell',    'Beginner',     'Shoulders on bench. Drive hips up, squeeze glutes at top.',                                       false, null),
('Plank',                'core',       ARRAY['shoulders','glutes'],       'Bodyweight', 'Beginner',     'Forearms on floor. Straight line from head to heels. Hold position.',                             false, null),
('Calf Raise',           'calves',     ARRAY[],                           'Machine',    'Beginner',     'Full range of motion. Pause at bottom stretch, squeeze at top.',                                  false, null);
*/
