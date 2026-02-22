// src/lib/logger.js
/**
 * Global singleton to intercept console logs and keep a buffer for UI display.
 */

class Logger {
    constructor() {
        this.logs = []
        this.maxLogs = 100
        this.subscribers = new Set()
        this.intercepted = false
    }

    init() {
        if (this.intercepted) return
        const originalLog = console.log
        const originalError = console.error
        const originalWarn = console.warn

        console.log = (...args) => {
            this.pushLog('log', args)
            originalLog.apply(console, args)
        }
        console.warn = (...args) => {
            this.pushLog('warn', args)
            originalWarn.apply(console, args)
        }
        console.error = (...args) => {
            this.pushLog('error', args)
            originalError.apply(console, args)
        }

        this.intercepted = true
        console.log("[Logger] System initialized")
    }

    pushLog(level, args) {
        const timestamp = new Date().toLocaleTimeString()
        const message = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ')

        const entry = { level, timestamp, message, id: Date.now() + Math.random() }
        this.logs.unshift(entry)

        if (this.logs.length > this.maxLogs) {
            this.logs.pop()
        }

        this.subscribers.forEach(sub => sub(this.logs))
    }

    subscribe(callback) {
        this.subscribers.add(callback)
        callback(this.logs)
        return () => this.subscribers.delete(callback)
    }

    clear() {
        this.logs = []
        this.subscribers.forEach(sub => sub(this.logs))
    }
}

export const logger = new Logger()
