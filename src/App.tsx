import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
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
      <HashRouter>
        <Routes>
          {/* Client-facing portal (no app chrome) */}
          <Route path="/portail/:no" element={<Portal />} />
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
            <Route path="*" element={<Today />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  )
}
