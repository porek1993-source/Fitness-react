// src/App.jsx
import { AppProvider, useApp } from './lib/useAppStore'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import WorkoutLoggerPage from './pages/WorkoutLoggerPage'
import LibraryPage from './pages/LibraryPage'
import PlannerPage from './pages/PlannerPage'
import CoachPage from './pages/CoachPage'
import { Activity, Dumbbell, BookOpen, Calendar, MessageCircle, WifiOff } from 'lucide-react'
import { haptic } from './lib/useAppStore'

// Tab definitions
const TABS = [
  { id: 'dashboard', label: 'Přehled', Icon: Activity },
  { id: 'log', label: 'Trénink', Icon: Dumbbell },
  { id: 'library', label: 'Knihovna', Icon: BookOpen },
  { id: 'planner', label: 'Plánovač', Icon: Calendar },
  { id: 'coach', label: 'Trenér', Icon: MessageCircle },
]

function Shell() {
  const { session, loading, activeTab, setTab, onlineStatus, pendingSync } = useApp()

  if (loading) return <LoadingScreen />
  if (!session) return <AuthPage />

  const accentColor = {
    dashboard: '#ff375f',
    log: '#ff9f0a',
    library: '#0a84ff',
    planner: '#30d158',
    coach: '#bf5af2',
  }[activeTab] || '#ff375f'

  return (
    <div className="flex flex-col bg-black min-h-screen max-w-[430px] mx-auto relative overflow-hidden"
      style={{ height: '100dvh' }}>

      {/* Ambient background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top, ${accentColor}07 0%, transparent 70%)`, transition: 'background 0.6s ease' }} />

      {/* Offline banner */}
      {!onlineStatus && (
        <div className="flex items-center justify-center gap-2 bg-yellow/10 border-b border-yellow/20 px-4 py-2 flex-shrink-0">
          <WifiOff className="w-3.5 h-3.5 text-yellow" />
          <p className="text-yellow text-xs font-mono">
            Režim offline — {pendingSync} trénink{pendingSync !== 1 ? 'y' : ''} ve frontě
          </p>
        </div>
      )}

      {/* iOS-style status bar spacer */}
      <div className="h-[env(safe-area-inset-top,44px)] flex-shrink-0" />

      {/* Page content */}
      <main className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-none ${activeTab === 'coach' ? 'flex flex-col' : ''
        }`} style={{ WebkitOverflowScrolling: 'touch' }}>
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'log' && <WorkoutLoggerPage />}
        {activeTab === 'library' && <LibraryPage />}
        {activeTab === 'planner' && <PlannerPage />}
        {activeTab === 'coach' && <CoachPage />}
      </main>

      {/* Bottom tab bar */}
      <div className="flex-shrink-0 border-t border-border/50"
        style={{
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        }}>
        <div className="flex items-center px-2 pt-1">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => { haptic([25]); setTab(id) }}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all active:scale-90"
                style={{ color: isActive ? accentColor : '#555570' }}
              >
                <div className="relative">
                  <Icon className="w-5 h-5 transition-all" strokeWidth={isActive ? 2.5 : 1.5} />
                  {/* Active dot */}
                  {isActive && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ background: accentColor, boxShadow: `0 0 4px ${accentColor}` }} />
                  )}
                  {/* Coach unread badge */}
                  {id === 'coach' && !isActive && (
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red rounded-full" />
                  )}
                </div>
                <span className="text-[9px] font-mono font-bold transition-all">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-red to-orange flex items-center justify-center shadow-2xl shadow-red/30">
          <Activity className="w-8 h-8 text-white" />
        </div>
        {/* Spinning ring */}
        <div className="absolute inset-0 rounded-3xl border-2 border-red/30 animate-spin-slow" />
      </div>
      <p className="text-dim text-xs font-mono tracking-widest uppercase animate-pulse">
        Načítám Agile Coach
      </p>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
