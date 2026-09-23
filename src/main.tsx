import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from './components/AppShell'
import InstallPrompt from './components/InstallPrompt'
import HomePage from './pages/HomePage'
import { seedDemoDataIfEmpty } from './lib/seedData'
import { SettingsProvider } from './hooks/useSettings'
import './index.css'

// Each page is its own lazy-loaded chunk: visiting the note editor shouldn't
// have to download MapPage's d3 dependency, and vice versa.
const NoteEditorPage = lazy(() => import('./pages/NoteEditorPage'))
const StudyPage = lazy(() => import('./pages/StudyPage'))
const ProgressPage = lazy(() => import('./pages/ProgressPage'))
const MapPage = lazy(() => import('./pages/MapPage'))

// Populates the database with demo content on a brand-new install; no-op if real data already exists.
void seedDemoDataIfEmpty()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route element={<AppShell />}>
              <Route path="/notes/:id" element={<NoteEditorPage />} />
              <Route path="/study" element={<StudyPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/map" element={<MapPage />} />
            </Route>
          </Routes>
          <InstallPrompt />
        </Suspense>
      </BrowserRouter>
    </SettingsProvider>
  </StrictMode>
)
