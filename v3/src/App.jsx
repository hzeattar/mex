import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import MobileNav from './components/MobileNav'
import Home from './pages/Home'
import Trade from './pages/Trade'
import Markets from './pages/Markets'
import Login from './pages/Login'

const API_URL = '/v3/api'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check session
    fetch(`${API_URL}/auth.php`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) setUser(data.user)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="skeleton w-32 h-8 rounded"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <Header user={user} setUser={setUser} />
      
      <main className="pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/trade/:symbol" element={<Trade user={user} />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <MobileNav />
    </div>
  )
}

export default App
