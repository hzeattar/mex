import React from 'react'
import { Link } from 'react-router-dom'

function Header({ user, setUser }) {
  const handleLogout = () => {
    fetch('/v3/api/auth.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'logout' })
    }).then(() => setUser(null))
  }

  return (
    <header className="bg-dark-800 border-b border-dark-600 sticky top-0 z-50 safe-area-top">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center font-bold text-lg">
            V
          </div>
          <span className="font-bold text-lg hidden sm:block">VertexPluse</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-gray-300 hover:text-white transition">Home</Link>
          <Link to="/markets" className="text-gray-300 hover:text-white transition">Markets</Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-gray-400 hidden sm:block">{user.name}</span>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm transition"
              >
                Logout
              </button>
            </>
          ) : (
            <Link 
              to="/login"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm font-medium transition"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
