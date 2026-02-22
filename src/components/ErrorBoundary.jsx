import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo })
        console.error("ErrorBoundary caught an error:", error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-red/10 border border-red/20 flex items-center justify-center mb-6">
                        <AlertTriangle className="w-10 h-10 text-red" />
                    </div>

                    <h1 className="text-2xl font-black text-white mb-2">Aplikace spadla</h1>
                    <p className="text-dim text-sm mb-8 max-w-xs">
                        Něco se pokazilo. Zkuste aplikaci restartovat nebo se podívejte na detaily níže.
                    </p>

                    <div className="w-full bg-card border border-border rounded-3xl p-4 mb-8 text-left overflow-auto max-h-[300px]">
                        <p className="text-red font-mono text-xs font-bold mb-2">Error:</p>
                        <pre className="text-white font-mono text-[10px] whitespace-pre-wrap break-all">
                            {this.state.error?.toString()}
                        </pre>
                        {this.state.errorInfo && (
                            <>
                                <p className="text-dim font-mono text-xs font-bold mt-4 mb-2">Stack:</p>
                                <pre className="text-dim/50 font-mono text-[8px] whitespace-pre-wrap break-all">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 bg-red text-white px-8 py-4 rounded-2xl font-black text-sm shadow-lg shadow-red/20 active:scale-95 transition-transform"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Restartovat aplikaci
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
