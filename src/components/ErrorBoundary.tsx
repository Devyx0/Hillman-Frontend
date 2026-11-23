/**
 * Last line of defence: a render error anywhere shows a friendly card instead of a blank page.
 * The card clears itself when the hash route changes, so one broken screen never blocks navigation.
 * A failed lazy page chunk (stale deploy / dev server restarted) triggers a one-time reload.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { t } from '../i18n'

const RELOAD_KEY = 'hc:chunk-reload'
const CHUNK_ERROR = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|does not provide an export named|Unable to preload CSS/i

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  /** True when the error comes from loading a code chunk (not from the app's own code). */
  static isChunkError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err ?? '')
    return CHUNK_ERROR.test(msg)
  }

  /**
   * Reload the page once per tab session; returns false when it already did (so it cannot loop).
   * The guard expires a little after a successful load, so a later redeploy can reload again.
   */
  static reloadOnce(): boolean {
    try {
      if (sessionStorage.getItem(RELOAD_KEY)) return false
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    } catch {
      return false
    }
    location.reload()
    return true
  }

  /** Call once the app has loaded: clears the reload guard after the page proved stable. */
  static armReloadGuardReset() {
    window.setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_KEY)
      } catch {
        /* storage unavailable: nothing to clear */
      }
    }, 10_000)
  }

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    if (ErrorBoundary.isChunkError(error)) ErrorBoundary.reloadOnce()
  }

  componentDidMount() {
    window.addEventListener('hashchange', this.reset)
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.reset)
  }

  reset = () => {
    if (this.state.error) this.setState({ error: null })
  }

  goHome = () => {
    if (location.hash === '#/' || location.hash === '') this.reset()
    else location.hash = '#/'
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="min-h-dvh flex items-center justify-center bg-sand p-4">
        <div role="alert" className="w-full max-w-md rounded-2xl border border-hairline bg-white p-6 shadow-float space-y-4">
          <h1 className="text-lg font-semibold text-ink">{t('Un problème est survenu sur cet écran')}</h1>
          <p className="text-sm text-ink-secondary">{t("Rechargez la page ou revenez à l'accueil.")}</p>
          {error.message && <p className="text-2xs text-ink-mute font-mono break-words bg-sand rounded-md px-3 py-2">{error.message}</p>}
          <div className="flex flex-wrap gap-2 justify-end">
            <button type="button" onClick={this.goHome} className="btn btn-sm btn-ghost">
              {t("Retour à l'accueil")}
            </button>
            <button type="button" onClick={() => location.reload()} className="btn btn-sm btn-primary">
              {t('Recharger')}
            </button>
          </div>
        </div>
      </div>
    )
  }
}
