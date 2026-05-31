import { useEffect, useState } from 'react'

interface Database {
    name: string
    state: string
    recovery_model: string
    size_mb: number
    last_backup: string | null
}

interface Props {
    onDisconnected: () => void
}

const SYSTEM_DATABASES = ['master', 'model', 'msdb', 'tempdb']

export default function Dashboard({ onDisconnected }: Props) {
    const [databases, setDatabases] = useState<Database[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null) // nom de la BDD à supprimer
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const loadDatabases = () => {
        setLoading(true)
        fetch('/api/databases', { credentials: 'include' })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) setDatabases(data)
                else setError(data.error)
            })
            .catch(() => setError('Impossible de charger les bases de données'))
            .finally(() => setLoading(false))
    }

    useEffect(() => { loadDatabases() }, [])

    const handleDisconnect = async () => {
        await fetch('/api/auth/disconnect', { method: 'POST', credentials: 'include' })
        onDisconnected()
    }

    const handleDeleteConfirm = async () => {
        if (!confirmDelete) return
        setDeleting(true)
        setDeleteError(null)
        try {
            const res = await fetch(`/api/databases/${encodeURIComponent(confirmDelete)}`, {
                method: 'DELETE',
                credentials: 'include'
            })
            const data = await res.json()
            if (!res.ok) {
                setDeleteError(data.error)
            } else {
                setConfirmDelete(null)
                loadDatabases() // rafraîchir la liste
            }
        } catch {
            setDeleteError('Erreur lors de la suppression')
        } finally {
            setDeleting(false)
        }
    }

    const formatDate = (d: string | null) => {
        if (!d) return <span style={{ color: '#aaa' }}>Jamais</span>
        return new Date(d).toLocaleString('fr-FR')
    }

    const formatSize = (mb: number) => {
        if (mb >= 1024) return `${(mb / 1024).toFixed(1)} Go`
        return `${mb} Mo`
    }

    const stateColor = (state: string) => {
        if (state === 'ONLINE') return '#2e7d32'
        if (state === 'OFFLINE') return '#c62828'
        return '#f57c00'
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>

            {/* Header */}
            <div style={{
                background: '#1a1a2e', color: '#fff', padding: '0 24px',
                height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <span style={{ fontWeight: 600, letterSpacing: 1 }}>SQLab</span>
                <button onClick={handleDisconnect} style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
                    color: '#fff', padding: '4px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12
                }}>
                    Déconnexion
                </button>
            </div>

            <div style={{ display: 'flex', height: 'calc(100vh - 52px)' }}>

                {/* Sidebar */}
                <div style={{ width: 200, background: '#fff', borderRight: '1px solid #e0e0e0', padding: '16px 0' }}>
                    <div style={{
                        padding: '8px 20px', fontSize: 13, fontWeight: 600,
                        background: '#f0f4ff', borderLeft: '3px solid #3f51b5', color: '#3f51b5'
                    }}>
                        Bases de données
                    </div>
                </div>

                {/* Contenu */}
                <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Bases de données</h2>

                    {loading && <p style={{ color: '#888', fontSize: 13 }}>Chargement...</p>}
                    {error && (
                        <div style={{
                            background: '#fff0f0', border: '1px solid #ffcccc',
                            borderRadius: 6, padding: '10px 14px', color: '#c00', fontSize: 13
                        }}>
                            {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#fafafa', borderBottom: '1px solid #e0e0e0' }}>
                                        {['Nom', 'État', 'Taille', 'Modèle de récupération', 'Dernière sauvegarde', 'Actions'].map(h => (
                                            <th key={h} style={{
                                                padding: '10px 16px', textAlign: 'left',
                                                fontWeight: 600, color: '#555', fontSize: 12
                                            }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {databases.map((db, i) => {
                                        const isSystem = SYSTEM_DATABASES.includes(db.name.toLowerCase())
                                        return (
                                            <tr key={db.name} style={{
                                                borderBottom: i < databases.length - 1 ? '1px solid #f0f0f0' : 'none'
                                            }}>
                                                <td style={{ padding: '10px 16px', fontWeight: 500 }}>{db.name}</td>
                                                <td style={{ padding: '10px 16px' }}>
                                                    <span style={{
                                                        color: stateColor(db.state),
                                                        background: stateColor(db.state) + '18',
                                                        padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600
                                                    }}>
                                                        {db.state}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 16px', color: '#444' }}>{formatSize(db.size_mb)}</td>
                                                <td style={{ padding: '10px 16px', color: '#444' }}>{db.recovery_model}</td>
                                                <td style={{ padding: '10px 16px', color: '#444' }}>{formatDate(db.last_backup)}</td>
                                                <td style={{ padding: '10px 16px' }}>
                                                    <button
                                                        onClick={() => !isSystem && setConfirmDelete(db.name)}
                                                        disabled={isSystem}
                                                        title={isSystem ? 'Base système protégée' : `Supprimer ${db.name}`}
                                                        style={{
                                                            background: '#fff',
                                                            border: `1px solid ${isSystem ? '#e0e0e0' : '#ffcccc'}`,
                                                            color: isSystem ? '#bbb' : '#c00',
                                                            padding: '4px 12px', borderRadius: 4,
                                                            cursor: isSystem ? 'not-allowed' : 'pointer', fontSize: 12
                                                        }}
                                                    >
                                                        Supprimer
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de confirmation */}
            {confirmDelete && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 8, padding: 28,
                        width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
                    }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                            Supprimer la base de données ?
                        </h3>
                        <p style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
                            La base <strong>{confirmDelete}</strong> sera supprimée définitivement.
                            Cette action est irréversible.
                        </p>

                        {deleteError && (
                            <div style={{
                                background: '#fff0f0', border: '1px solid #ffcccc',
                                borderRadius: 6, padding: '8px 12px', fontSize: 12,
                                color: '#c00', marginBottom: 12
                            }}>
                                {deleteError}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                            <button
                                onClick={() => { setConfirmDelete(null); setDeleteError(null) }}
                                disabled={deleting}
                                style={{
                                    background: '#f5f5f5',
                                    border: '1px solid #ccc',
                                    color: '#333',
                                    padding: '6px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13
                                }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={deleting}
                                style={{
                                    background: '#c00', border: 'none', color: '#fff',
                                    padding: '6px 16px', borderRadius: 4,
                                    cursor: deleting ? 'not-allowed' : 'pointer', fontSize: 13,
                                    opacity: deleting ? 0.7 : 1
                                }}
                            >
                                {deleting ? 'Suppression...' : 'Supprimer définitivement'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}