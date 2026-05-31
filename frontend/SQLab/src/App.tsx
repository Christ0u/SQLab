import { useState } from 'react'
import Login from './pages/Login'
import './App.css'

function App() {
  const [connected, setConnected] = useState(false)

  if (!connected) {
    return <Login onConnected={() => setConnected(true)} />
  }

  return (
    <div>
      <p>Conected</p>
    </div>
  )
}

export default App
