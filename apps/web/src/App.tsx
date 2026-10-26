import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { Layout } from './components/Layout'
import { Create } from './pages/Create'
import { DrawPage } from './pages/DrawPage'
import { Explore } from './pages/Explore'
import { HowItWorks } from './pages/HowItWorks'
import { Landing } from './pages/Landing'
import { ProofPage } from './pages/ProofPage'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="explore" element={<Explore />} />
          <Route path="create" element={<Create />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="d/:id" element={<DrawPage />} />
          <Route path="d/:id/proof" element={<ProofPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}
