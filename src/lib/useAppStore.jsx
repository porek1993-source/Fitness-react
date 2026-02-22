// src/lib/useAppStore.js
// ─────────────────────────────────────────────────────────────────────────────
// Central state management via React Context + hooks
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import { supabase, flushOfflineQueue, getQueueLength } from './supabase'
import { applyDecayToStatus, mergeFatigue, calculateFatigueIncrease } from './recovery'
import { logger } from './logger'

// Initialize logger
logger.init()

const DEFAULT_MUSCLE_STATUS = {
  chest: { fatigue: 0, last_updated: null },
  back: { fatigue: 0, last_updated: null },
  shoulders: { fatigue: 0, last_updated: null },
  biceps: { fatigue: 0, last_updated: null },
  triceps: { fatigue: 0, last_updated: null },
  forearms: { fatigue: 0, last_updated: null },
  core: { fatigue: 0, last_updated: null },
  glutes: { fatigue: 0, last_updated: null },
  quads: { fatigue: 0, last_updated: null },
  hamstrings: { fatigue: 0, last_updated: null },
  calves: { fatigue: 0, last_updated: null }
}

const AppContext = createContext(null)

// ── Haptic feedback helper ────────────────────────────────────────────────────
export function haptic(pattern = [50]) {
  if ('vibrate' in navigator) navigator.vibrate(pattern)
}

// ── Reducer ───────────────────────────────────────────────────────────────────
const initialState = {
  // Auth
  session: null,
  user: null,
  profile: null,
  // Data
  muscleStatus: null,
  weeklyWorkouts: [],
  exercises: [],
  // UI
  loading: true,
  onlineStatus: navigator.onLine,
  pendingSync: 0,
  activeTab: 'dashboard',
  selectedMuscle: null,  // for filtering exercise library
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SESSION': return { ...state, session: action.payload, user: action.payload?.user }
    case 'SET_PROFILE': return { ...state, profile: action.payload, muscleStatus: action.payload?.muscle_status }
    case 'SET_WORKOUTS': return { ...state, weeklyWorkouts: action.payload }
    case 'SET_EXERCISES': return { ...state, exercises: action.payload }
    case 'SET_LOADING': return { ...state, loading: action.payload }
    case 'SET_ONLINE': return { ...state, onlineStatus: action.payload }
    case 'SET_PENDING': return { ...state, pendingSync: action.payload }
    case 'SET_TAB': return { ...state, activeTab: action.payload }
    case 'SET_MUSCLE': return { ...state, selectedMuscle: action.payload }
    case 'UPDATE_MUSCLES': return { ...state, muscleStatus: action.payload }
    default: return state
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // ── Auth listener ──────────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        dispatch({ type: 'SET_SESSION', payload: session })
        if (session) {
          console.log("[Auth] Session detected, initializing data...")
          // Promise.race to ensure we don't hang forever on iPhone
          const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("INITIALIZATION_TIMEOUT")), 6000)
          )

          try {
            await Promise.race([
              Promise.all([
                loadProfile(session.user.id),
                loadRecentWorkouts(session.user.id),
                loadExercises()
              ]),
              timeout
            ])
            console.log("[Auth] Data loaded successfully")
          } catch (err) {
            console.error("[Auth] Initial load failed or timed out:", err.message)
          }
        }
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  // ── Online/offline detection ───────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      dispatch({ type: 'SET_ONLINE', payload: true })
      const synced = await flushOfflineQueue()
      if (synced > 0) {
        await loadRecentWorkouts(state.user?.id)
      }
      dispatch({ type: 'SET_PENDING', payload: getQueueLength() })
    }
    const handleOffline = () => {
      dispatch({ type: 'SET_ONLINE', payload: false })
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    dispatch({ type: 'SET_PENDING', payload: getQueueLength() })
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [state.user?.id])

  // ── Data loaders ───────────────────────────────────────────────────────────
  const checkRecovery = useCallback(async (profileData) => {
    if (!profileData?.muscle_status) return

    const lastUpdated = profileData.updated_at ? new Date(profileData.updated_at).getTime() : 0
    const now = Date.now()
    const DAY_MS = 24 * 3600 * 1000

    if (now - lastUpdated >= DAY_MS) {
      // 20% reduction logic is already in applyDecayToStatus
      const decayedStatus = applyDecayToStatus(profileData.muscle_status)
      dispatch({ type: 'UPDATE_MUSCLES', payload: decayedStatus })

      await supabase
        .from('profiles')
        .update({
          muscle_status: decayedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileData.id)
    }
  }, [])

  const loadProfile = useCallback(async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      dispatch({ type: 'SET_PROFILE', payload: data })
      await checkRecovery(data)
    } else {
      // If no profile found, we'll initialize with defaults
      console.warn("[Store] No profile found, using defaults")
      dispatch({ type: 'UPDATE_MUSCLES', payload: DEFAULT_MUSCLE_STATUS })
    }
  }, [checkRecovery])

  const loadRecentWorkouts = useCallback(async (userId) => {
    if (!userId) return
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const { data } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', since)
      .order('logged_at', { ascending: false })
      .limit(30)
    if (data) dispatch({ type: 'SET_WORKOUTS', payload: data })
  }, [])

  const loadExercises = useCallback(async () => {
    const { data } = await supabase
      .from('exercise_library')
      .select('*')
      .order('muscle_group', { ascending: true })
    if (data) dispatch({ type: 'SET_EXERCISES', payload: data })
  }, [])

  // ── Actions ────────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }, [])

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { data, error }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const logWorkout = useCallback(async (workoutData) => {
    const { setsData, exerciseName, workoutType, muscleGroups, notes } = workoutData
    const record = {
      user_id: state.user.id,
      workout_type: workoutType,
      exercise_name: exerciseName,
      sets_data: setsData,
      muscle_groups: muscleGroups,
      notes: notes || null,
      logged_at: new Date().toISOString(),
    }

    // Always update local muscle status immediately
    const fatigueIncrease = calculateFatigueIncrease(setsData, muscleGroups)
    const newMuscleStatus = mergeFatigue(state.muscleStatus, fatigueIncrease)
    dispatch({ type: 'UPDATE_MUSCLES', payload: newMuscleStatus })

    if (state.onlineStatus) {
      // Online: write to Supabase
      const { error: workoutError } = await supabase.from('workouts').insert(record)
      if (!workoutError) {
        await supabase
          .from('profiles')
          .update({ muscle_status: newMuscleStatus, updated_at: new Date().toISOString() })
          .eq('id', state.user.id)
        await loadRecentWorkouts(state.user.id)
      }
    } else {
      // Offline: queue for later sync
      const { enqueueOffline } = await import('./supabase')
      enqueueOffline(record)
      dispatch({ type: 'SET_PENDING', payload: getQueueLength() })
    }

    haptic([50, 30, 80]) // Completion haptic
  }, [state.user, state.muscleStatus, state.onlineStatus, loadRecentWorkouts])

  const logActivity = useCallback(async (activityType, intensityMultiplier = 1) => {
    const { ACTIVITY_IMPACTS } = await import('./recovery')
    const impactData = ACTIVITY_IMPACTS[activityType]
    if (!impactData) return

    const fatigueIncrease = {}
    Object.entries(impactData.impact).forEach(([muscle, baseVal]) => {
      fatigueIncrease[muscle] = baseVal * intensityMultiplier
    })

    const newMuscleStatus = mergeFatigue(state.muscleStatus, fatigueIncrease)
    dispatch({ type: 'UPDATE_MUSCLES', payload: newMuscleStatus })

    if (state.user) {
      await supabase
        .from('profiles')
        .update({ muscle_status: newMuscleStatus, updated_at: new Date().toISOString() })
        .eq('id', state.user.id)
    }
    haptic([40, 20, 40])
  }, [state.muscleStatus, state.user])

  const updateMuscleStatus = useCallback(async (updates) => {
    const newStatus = { ...state.muscleStatus, ...updates }
    dispatch({ type: 'UPDATE_MUSCLES', payload: newStatus })
    if (state.user) {
      await supabase
        .from('profiles')
        .update({ muscle_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', state.user.id)
    }
  }, [state.muscleStatus, state.user])

  const getDecayedMuscleStatus = useCallback(() => {
    return applyDecayToStatus(state.muscleStatus)
  }, [state.muscleStatus])

  const value = {
    ...state,
    signIn,
    signUp,
    signOut,
    logWorkout,
    logActivity, // Added
    updateMuscleStatus,
    getDecayedMuscleStatus,
    setTab: (tab) => dispatch({ type: 'SET_TAB', payload: tab }),
    setMuscle: (muscle) => dispatch({ type: 'SET_MUSCLE', payload: muscle }),
    refreshWorkouts: () => loadRecentWorkouts(state.user?.id),
    updateProfile: async (updates) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', state.user.id)
        .select()
        .single()
      if (!error && data) {
        dispatch({ type: 'SET_PROFILE', payload: data })
      }
      return { data, error }
    }
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
