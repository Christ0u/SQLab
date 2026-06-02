import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import './App.css'

function App() {
  const [connected, setConnected] = useState<boolean | null>(null) // null = en cours de vérification

  useEffect(() => {
    fetch('/api/auth/status', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setConnected(data.connected))
      .catch(() => setConnected(false))
  }, [])

  if (connected === null) return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#f5f5f5', color: '#888', fontSize: 13
    }}>
      Chargement...
    </div>
  )

  return connected
    ? <Dashboard onDisconnected={() => setConnected(false)} />
    : <Login onConnected={() => setConnected(true)} />
}

export default App
