import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='min-h-screen flex items-center justify-center p-6'>
          <div className='bg-white border rounded p-6 max-w-xl text-center'>
            <h2 className='text-lg font-semibold mb-2'>Something went wrong</h2>
            <p className='text-sm text-gray-600 mb-4'>An unexpected error occurred while rendering this page.</p>
            <details className='text-xs text-left whitespace-pre-wrap text-gray-500 max-h-40 overflow-auto border-t pt-2'>
              {String(this.state.error && this.state.error.stack ? this.state.error.stack : this.state.error)}
            </details>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
