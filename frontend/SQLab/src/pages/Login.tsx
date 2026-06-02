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
    setError(null)
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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    marginTop: 6,
    padding: '10px 12px',
    border: '1px solid #d6d9e0',
    borderRadius: 8,
    fontSize: 13,
    color: '#1f2937',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: 600
  }

  const fieldStyle: React.CSSProperties = {
    marginBottom: 14
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at top left, rgba(63,81,181,0.35), transparent 34%), linear-gradient(135deg, #111827 0%, #1a1a2e 48%, #0f172a 100%)',
        padding: 24,
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'rgba(255, 255, 255, 0.96)',
          border: '1px solid rgba(255,255,255,0.35)',
          borderRadius: 18,
          padding: 32,
          boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div style={{ marginBottom: 26 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 42,
              height: 42,
              borderRadius: 12,
              background: '#3f51b5',
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              marginBottom: 14,
              boxShadow: '0 8px 18px rgba(63,81,181,0.35)'
            }}
          >
            SQL
          </div>

          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: '#111827',
              margin: 0,
              letterSpacing: '-0.03em'
            }}
          >
            SQLab
          </h1>

          <p
            style={{
              fontSize: 13,
              color: '#6b7280',
              margin: '6px 0 0 0',
              lineHeight: 1.5
            }}
          >
            Connecte-toi à une instance SQL Server pour gérer tes bases,
            sauvegardes et logins.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.2fr 0.8fr',
              gap: 10,
              marginBottom: 14
            }}
          >
            <div>
              <label style={labelStyle}>
                Serveur <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                name="server"
                value={form.server}
                onChange={handleChange}
                placeholder="my.sql.server"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Instance</label>
              <input
                name="instance"
                value={form.instance}
                onChange={handleChange}
                placeholder="SQLEXPRESS"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Port</label>
              <input
                name="port"
                value={form.port}
                onChange={handleChange}
                placeholder="1433"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Utilisateur <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="login"
              required
              autoComplete="username"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>
              Mot de passe <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••••••••"
              required
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>

          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 12,
                color: '#b91c1c',
                marginBottom: 16,
                lineHeight: 1.4,
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start'
              }}
            >
              <span style={{ fontWeight: 700 }}>Erreur :</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: 42,
              border: 'none',
              borderRadius: 10,
              background: loading
                ? '#9ca3af'
                : 'linear-gradient(135deg, #3f51b5, #263a9f)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading
                ? 'none'
                : '0 10px 22px rgba(63,81,181,0.32)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease'
            }}
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>

          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: '1px solid #eef0f4',
              textAlign: 'center'
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: '#9ca3af'
              }}
            >
              Les informations sont transmises au serveur via ta session active.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}