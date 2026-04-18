import { ShieldAlert } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: ReactNode
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(error, errorInfo)
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="w-full max-w-md rounded-xl border border-red-500/40 bg-[#111827] p-6 text-center">
            <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-red-400" />
            <h2 className="text-lg font-semibold text-[#e2e8f0]">Something went wrong</h2>
            <p className="mt-2 text-sm text-[#94a3b8]">
              {this.state.error?.message ?? 'Unknown error'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
