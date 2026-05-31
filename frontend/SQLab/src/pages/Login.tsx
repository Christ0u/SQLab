import { useState, useEffect } from 'react'

interface LoginForm {
  server: string
  instance: string
  port: string
  username: string
  password: string
}

interface Props {
  onConnected: () => void
}

export default function Login({ onConnected }: Props) {
  const [form, setForm] = useState<LoginForm>({
    server: '',
    instance: '',
    port: '1433',
    username: '',
    password: ''
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth/defaults', { credentials: 'include' })
      .then(r => r.json())
      .then(defaults => setForm(prev => ({ ...prev, ...defaults })))
      .catch(() => { })
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erreur de connexion')
      } else {
        onConnected()
      }
    } catch {
      setError('Impossible de joindre le serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5'
    }}>
      <div style={{
        background: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: 8,
        padding: '32px',
        width: 420
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>SQLab</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
          Connexion à une instance SQL Server
        </p>

        <form onSubmit={handleSubmit}>

          {/* Ligne 1 : Serveur / Instance / Port */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 2 }}>
              <label style={{ fontSize: 12, color: '#555' }}>Serveur</label>
              <input
                name="server"
                value={form.server}
                onChange={handleChange}
                placeholder="my.sql.server"
                required
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: '#555' }}>Instance</label>
              <input
                name="instance"
                value={form.instance}
                onChange={handleChange}
                placeholder="MY_INSTANCE"
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
            <div style={{ width: 70 }}>
              <label style={{ fontSize: 12, color: '#555' }}>Port</label>
              <input
                name="port"
                value={form.port}
                onChange={handleChange}
                placeholder="1433"
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
          </div>

          {/* Login */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#555' }}>Utilisateur</label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="login"
              required
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>

          {/* Mot de passe */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: '#555' }}>Mot de passe</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••••••••"
              required
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fff0f0',
              border: '1px solid #ffcccc',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 12,
              color: '#c00',
              marginBottom: 16
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

        </form>
      </div>
    </div>
  )
}