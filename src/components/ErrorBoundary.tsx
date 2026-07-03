import React, { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught rendering error:', error, errorInfo)
    
    // Attempt silent recovery by clearing potentially corrupt widget/wallet state
    try {
      const now = Date.now()
      const lastRecovery = localStorage.getItem('lma_last_recovery')
      
      // If we recovered less than 8 seconds ago, don't loop refresh
      if (lastRecovery && now - Number(lastRecovery) < 8000) {
        console.warn('Prevented infinite recovery reload loop.')
        return
      }
      
      localStorage.setItem('lma_last_recovery', String(now))
      
      // Clear LI.FI widget/sdk state from localStorage
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.startsWith('lifi') || 
          key.startsWith('widget') || 
          key.startsWith('wagmi') || 
          key.startsWith('@lifi') || 
          key.includes('wallet')
        )) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(k => localStorage.removeItem(k))
      sessionStorage.clear()
      
      console.log('Cleared corrupt session state. Reloading page for silent recovery...')
      window.location.reload()
    } catch (e) {
      console.error('Failed to run silent recovery:', e)
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Silent fallback UI while recovery reload is executing
      return (
        <div style={{
          padding: '40px 24px',
          textAlign: 'center',
          color: 'rgba(240, 236, 255, 0.4)',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.82rem'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid rgba(147, 51, 234, 0.2)',
            borderTopColor: '#9333ea',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px'
          }} />
          <span>Restoring interface...</span>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )
    }

    return this.props.children
  }
}
