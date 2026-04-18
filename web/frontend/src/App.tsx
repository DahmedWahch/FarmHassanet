import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/Toast'
import { BatchTest } from './pages/BatchTest'
import { Dashboard } from './pages/Dashboard'
import { WebcamTest } from './pages/WebcamTest'

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route
              path="/"
              element={
                <ErrorBoundary>
                  <Dashboard />
                </ErrorBoundary>
              }
            />
            <Route
              path="/webcam"
              element={
                <ErrorBoundary>
                  <WebcamTest />
                </ErrorBoundary>
              }
            />
            <Route
              path="/batch"
              element={
                <ErrorBoundary>
                  <BatchTest />
                </ErrorBoundary>
              }
            />
            <Route path="*" element={<Navigate replace to="/" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
