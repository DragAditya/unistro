import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Gallery from './pages/Gallery.jsx'

export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('unistro_token'))
  const navigate = useNavigate()

  const handleLogin = () => {
    setAuthed(true)
    navigate('/')
  }

  const handleLogout = () => {
    localStorage.removeItem('unistro_token')
    setAuthed(false)
    navigate('/login')
  }

  return (
    <Routes>
      <Route path="/login" element={
        authed ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
      } />
      <Route path="/*" element={
        authed ? <Gallery onLogout={handleLogout} /> : <Navigate to="/login" replace />
      } />
    </Routes>
  )
}
