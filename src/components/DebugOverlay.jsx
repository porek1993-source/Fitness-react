import { useState, useEffect } from 'react'
import { Terminal, X, Trash2, Bug } from 'lucide-react'
import { logger } from '../lib/logger'
import { haptic } from '../lib/useAppStore'

export default function DebugOverlay() {
    const [isOpen, setIsOpen] = useState(false)
    const [logs, setLogs] = useState([])

    useEffect(() => {
        return logger.subscribe(setLogs)
    }, [])

    if (!isOpen) {
        return (
            <button
                onClick={() => { haptic([10]); setIsOpen(true) }}
                className="fixed top-2 right-2 z-[9999] p-2 bg-black/20 backdrop-blur-md border border-white/10 rounded-xl text-white/30 hover:text-white transition-colors"
                title="Debug Logs"
            >
                <Bug className="w-4 h-4" />
            </button>
        )
    }

    return (
        <div className="fixed inset-0 z-[10000] bg-black flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-4 border-b border-white/10 safe-top">
                <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-blue" />
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">Debug Console</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { haptic([10]); logger.clear() }}
                        className="p-2 text-dim hover:text-red transition-colors"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-dim hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto font-mono text-[10px] p-4 space-y-2">
                {logs.length === 0 ? (
                    <p className="text-dim italic text-center mt-10">No logs captured yet.</p>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="border-b border-white/5 pb-2 last:border-0">
                            <div className="flex gap-2 items-center mb-1">
                                <span className="text-[8px] text-muted">{log.timestamp}</span>
                                <span className={`px-1 rounded-[4px] text-[8px] font-bold uppercase ${log.level === 'error' ? 'bg-red/20 text-red' :
                                        log.level === 'warn' ? 'bg-yellow/20 text-yellow' :
                                            'bg-blue/20 text-blue'
                                    }`}>
                                    {log.level}
                                </span>
                            </div>
                            <div className={`whitespace-pre-wrap break-all ${log.level === 'error' ? 'text-red' :
                                    log.level === 'warn' ? 'text-yellow' :
                                        'text-dim'
                                }`}>
                                {log.message}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer / Safe Area */}
            <div className="h-[env(safe-area-inset-bottom,24px)] bg-black" />
        </div>
    )
}
