import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './auth/AuthContext'
import { LanguageProvider } from './i18n/LanguageProvider'
import Invitation from './pages/account/Invitation'
import Login from './pages/account/Login'
import Profile from './pages/account/Profile'
import ResetPassword from './pages/account/ResetPassword'
import AppLayout from './layout/AppLayout'
import Agenda from './pages/Agenda'
import Catalogue from './pages/Catalogue'
import ClientDetail from './pages/ClientDetail'
import Clients from './pages/Clients'
import Conversations from './pages/Conversations'
import LeadDetail from './pages/LeadDetail'
import Leads from './pages/Leads'
import Pipeline from './pages/Pipeline'
import Portal from './pages/Portal'
import QuoteBuilder from './pages/QuoteBuilder'
import Quotes from './pages/Quotes'
import Today from './pages/Today'

export default function App() {
  return (
    <AppProvider>
      <LanguageProvider>
      <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Client-facing portal (no app chrome) */}
          <Route path="/portail/:no" element={<Portal />} />
          {/* Account (no app chrome) */}
          <Route path="/connexion" element={<Login />} />
          <Route path="/invitation/:token" element={<Invitation />} />
          <Route path="/mot-de-passe" element={<ResetPassword />} />
          <Route element={<AppLayout />}>
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
            <Route path="catalogue" element={<Catalogue />} />
            <Route path="profil" element={<Profile />} />
            <Route path="*" element={<Today />} />
          </Route>
        </Routes>
      </HashRouter>
      </AuthProvider>
      </LanguageProvider>
    </AppProvider>
  )
}
