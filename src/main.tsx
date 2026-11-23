import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

// A lazy page chunk that fails to load (redeploy changed the file names, or a stale dev server)
// reloads the page once to pick up the current build; the sessionStorage guard prevents a loop.
window.addEventListener('vite:preloadError', (event) => {
  if (ErrorBoundary.reloadOnce()) event.preventDefault()
})
window.addEventListener('unhandledrejection', (event) => {
  if (ErrorBoundary.isChunkError(event.reason)) ErrorBoundary.reloadOnce()
})
ErrorBoundary.armReloadGuardReset()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
