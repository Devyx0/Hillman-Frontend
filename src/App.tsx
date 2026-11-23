import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes, useSearchParams } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth, RequirePermission } from './auth/guards'
import { LanguageProvider } from './i18n/LanguageProvider'
import { Loading } from './components/states'
import Login from './pages/account/Login'
import AppLayout from './layout/AppLayout'
import Today from './pages/Today'

/** Pages load on demand so the first screen downloads only what it needs. */
const Agenda = lazy(() => import('./pages/Agenda'))
const Catalogue = lazy(() => import('./pages/Catalogue'))
const ClientDetail = lazy(() => import('./pages/ClientDetail'))
const Clients = lazy(() => import('./pages/Clients'))
const Conversations = lazy(() => import('./pages/Conversations'))
const LeadDetail = lazy(() => import('./pages/LeadDetail'))
const Leads = lazy(() => import('./pages/Leads'))
const Pipeline = lazy(() => import('./pages/Pipeline'))
const Portal = lazy(() => import('./pages/Portal'))
const PortalCancellation = lazy(() => import('./pages/portal/Cancellation'))
const PortalSignedCopy = lazy(() => import('./pages/portal/SignedCopy'))
const QuoteBuilder = lazy(() => import('./pages/QuoteBuilder'))
const Quotes = lazy(() => import('./pages/Quotes'))
const Profile = lazy(() => import('./pages/account/Profile'))
const Invitation = lazy(() => import('./pages/account/Invitation'))
const ResetPassword = lazy(() => import('./pages/account/ResetPassword'))

/**
 * `/catalogue` needs `catalogue.view` (read-only) or `catalogue.edit`; its Paramètres view
 * (`?tab=parametres`) needs `settings.manage`, `users.manage` or `audit.view`.
 */
function CatalogueRoute() {
  const [params] = useSearchParams()
  const settings = params.get('tab') === 'parametres'
  return (
    <RequirePermission perm={settings ? ['settings.manage', 'users.manage', 'audit.view'] : ['catalogue.view', 'catalogue.edit']}>
      <Catalogue />
    </RequirePermission>
  )
}

export default function App() {
  return (
    // AuthProvider sits outside AppProvider (the scope follows the signed-in user) and both sit
    // outside LanguageProvider, which re-mounts its children when the language changes.
    <AuthProvider>
      <AppProvider>
      <LanguageProvider>
      <HashRouter>
        <Suspense fallback={<Loading className="min-h-screen" />}>
        <Routes>
          {/* Client-facing portal (no app chrome) */}
          <Route path="/portail/:no" element={<Portal />} />
          <Route path="/portail/:no/copie-signee" element={<PortalSignedCopy />} />
          <Route path="/portail/:no/annulation" element={<PortalCancellation />} />
          {/* Account (no app chrome) */}
          <Route path="/connexion" element={<Login />} />
          <Route path="/invitation/:token" element={<Invitation />} />
          <Route path="/mot-de-passe" element={<ResetPassword />} />
          {/* Everything else needs a signed-in user */}
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Today />} />
            <Route path="leads" element={<Leads />} />
            <Route path="leads/:id" element={<LeadDetail />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="soumissions" element={<Quotes />} />
            <Route path="soumissions/:id" element={<QuoteBuilder />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="conversations" element={<Conversations />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="catalogue" element={<CatalogueRoute />} />
            <Route path="profil" element={<Profile />} />
            <Route path="*" element={<Today />} />
          </Route>
        </Routes>
        </Suspense>
      </HashRouter>
      </LanguageProvider>
      </AppProvider>
    </AuthProvider>
  )
}
