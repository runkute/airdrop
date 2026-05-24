'use client'
import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center flex-col gap-6 p-6">
          <AlertTriangle className="w-16 h-16 text-red-400" />
          <h1 className="text-white text-xl font-bold">Đã xảy ra lỗi</h1>
          {this.state.error && (
            <code className="text-red-300 text-sm bg-red-500/10 rounded-xl p-4 font-mono max-w-lg block whitespace-pre-wrap break-all">
              {this.state.error.message}
            </code>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25"
          >
            Tải lại trang
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
