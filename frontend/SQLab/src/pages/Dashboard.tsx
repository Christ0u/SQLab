import { useEffect, useState } from 'react'

interface Database {
    name: string
    state: string
    recovery_model: string
    size_mb: number
    last_backup: string | null
}

interface CreateForm {
    name: string
    collation: string
    recoveryModel: string
}

interface BackupForm {
    database: string
    type: string
    destination: string
}

interface Props {
    onDisconnected: () => void
}

const SYSTEM_DATABASES = ['master', 'model', 'msdb', 'tempdb']

const COLLATIONS = [
    'French_CI_AS',
    'French_CS_AS',
    'SQL_Latin1_General_CP1_CI_AS',
    'SQL_Latin1_General_CP1_CS_AS',
    'Latin1_General_CI_AS',
]

const RECOVERY_MODELS = ['SIMPLE', 'FULL', 'BULK_LOGGED']
const BACKUP_TYPES = [
    { value: 'FULL', label: 'Complète (FULL)' },
    { value: 'DIFFERENTIAL', label: 'Différentielle' },
    { value: 'LOG', label: 'Journal de transactions (LOG)' }
]

export default function Dashboard({ onDisconnected }: Props) {
    const [section, setSection] = useState<'list' | 'create' | 'backup' | 'query'>('list')

    // -- Liste --
    const [databases, setDatabases] = useState<Database[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    // -- Création --
    const [createForm, setCreateForm] = useState<CreateForm>({
        name: '',
        collation: 'French_CI_AS',
        recoveryModel: 'SIMPLE'
    })
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)
    const [createSuccess, setCreateSuccess] = useState<string | null>(null)

    // -- Sauvegarde --
    const [backupForm, setBackupForm] = useState<BackupForm>({
        database: '',
        type: 'FULL',
        destination: 'C:\\Users\\Public\\Downloads\\MaBase.bak'
    })
    const [backingUp, setBackingUp] = useState(false)
    const [backupError, setBackupError] = useState<string | null>(null)
    const [backupSuccess, setBackupSuccess] = useState<string | null>(null)

    // -- Console SQL --
    const [sqlQuery, setSqlQuery] = useState<string>("SELECT @@VERSION;")
    const [isRunningQuery, setIsRunningQuery] = useState(false)
    const [queryResults, setQueryResults] = useState<any[] | null>(null)
    const [queryRowsAffected, setQueryRowsAffected] = useState<number[] | null>(null)
    const [queryError, setQueryError] = useState<string | null>(null)

    const loadDatabases = () => {
        setLoading(true)
        fetch('/api/databases', { credentials: 'include' })
            .then(r => r.json())
            .then(data => Array.isArray(data) ? setDatabases(data) : setError(data.error))
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
                method: 'DELETE', credentials: 'include'
            })
            const data = await res.json()
            if (!res.ok) setDeleteError(data.error)
            else { setConfirmDelete(null); loadDatabases() }
        } catch {
            setDeleteError('Erreur lors de la suppression')
        } finally {
            setDeleting(false)
        }
    }

    // Handlers Création
    const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setCreateForm({ ...createForm, [e.target.name]: e.target.value })
        setCreateError(null); setCreateSuccess(null)
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true); setCreateError(null); setCreateSuccess(null)
        try {
            const res = await fetch('/api/databases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(createForm)
            })
            const data = await res.json()
            if (!res.ok) setCreateError(data.error)
            else {
                setCreateSuccess(`La base "${createForm.name}" a été créée avec succès.`)
                setCreateForm({ name: '', collation: 'French_CI_AS', recoveryModel: 'SIMPLE' })
                loadDatabases()
            }
        } catch {
            setCreateError('Erreur lors de la création')
        } finally {
            setCreating(false)
        }
    }

    // Handlers Sauvegarde
    const handleBackupChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setBackupForm({ ...backupForm, [e.target.name]: e.target.value })
        setBackupError(null); setBackupSuccess(null)
    }

    const handleBackup = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!backupForm.database) {
            setBackupError('Veuillez sélectionner une base de données.'); return;
        }
        setBackingUp(true); setBackupError(null); setBackupSuccess(null)

        try {
            const res = await fetch('/api/databases/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(backupForm)
            })
            const data = await res.json()
            if (!res.ok) setBackupError(data.error)
            else {
                setBackupSuccess(`Sauvegarde de "${backupForm.database}" lancée et terminée avec succès.`)
                loadDatabases()
            }
        } catch {
            setBackupError('Erreur lors de la communication avec le serveur.')
        } finally {
            setBackingUp(false)
        }
    }

    // Handler Console SQL
    const handleRunQuery = async () => {
        if (!sqlQuery.trim()) return

        setIsRunningQuery(true)
        setQueryError(null)
        setQueryResults(null)
        setQueryRowsAffected(null)

        try {
            const res = await fetch('/api/databases/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ sqlQuery })
            })
            const data = await res.json()

            if (!res.ok) {
                setQueryError(data.error)
            } else {
                setQueryResults(data.results)
                if (data.rowsAffected && data.rowsAffected.length > 0) {
                    setQueryRowsAffected(data.rowsAffected)
                }
            }
        } catch {
            setQueryError('Erreur réseau lors de l\'exécution de la requête.')
        } finally {
            setIsRunningQuery(false)
        }
    }

    // Utilitaires
    const formatDate = (d: string | null) => {
        if (!d) return <span style={{ color: '#aaa' }}>Jamais</span>
        return new Date(d).toLocaleString('fr-FR')
    }
    const formatSize = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} Go` : `${mb} Mo`
    const stateColor = (state: string) => {
        switch (state) {
            case 'ONLINE': return '#2e7d32'
            case 'OFFLINE': return '#c62828'
            case 'RESTORING': return '#1565c0'
            case 'RECOVERING': return '#f57c00'
            case 'SUSPECT': return '#6a1b9a'
            case 'EMERGENCY': return '#e65100'
            default: return '#888'
        }
    }

    // Styles
    const inputStyle = {
        width: '100%', marginTop: 4, padding: '7px 10px', border: '1px solid #ddd',
        borderRadius: 4, fontSize: 13, boxSizing: 'border-box' as const
    }
    const labelStyle = { fontSize: 12, color: '#555', fontWeight: 500 }

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
                    {[
                        { key: 'list', label: 'Bases de données' },
                        { key: 'create', label: 'Créer une base' },
                        { key: 'backup', label: 'Sauvegarder' },
                        { key: 'query', label: 'Console SQL' },
                    ].map(item => (
                        <div
                            key={item.key}
                            onClick={() => setSection(item.key as 'list' | 'create' | 'backup' | 'query')}
                            style={{
                                padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                background: section === item.key ? '#f0f4ff' : 'transparent',
                                borderLeft: section === item.key ? '3px solid #3f51b5' : '3px solid transparent',
                                color: section === item.key ? '#3f51b5' : '#444',
                            }}
                        >
                            {item.label}
                        </div>
                    ))}
                </div>

                {/* Contenu */}
                <div style={{ flex: 1, padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

                    {/* ── Section liste ── */}
                    {section === 'list' && (
                        <>
                            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Bases de données</h2>
                            {loading && <p style={{ color: '#888', fontSize: 13 }}>Chargement...</p>}
                            {error && (
                                <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, padding: '10px 14px', color: '#c00', fontSize: 13 }}>
                                    {error}
                                </div>
                            )}
                            {!loading && !error && (
                                <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ background: '#fafafa', borderBottom: '1px solid #e0e0e0' }}>
                                                {['Nom', 'État', 'Taille', 'Modèle', 'Dernière sauvegarde', 'Actions'].map(h => (
                                                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 12 }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {databases.map((db, i) => {
                                                const isSystem = SYSTEM_DATABASES.includes(db.name.toLowerCase())
                                                return (
                                                    <tr key={db.name} style={{ borderBottom: i < databases.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                                                        <td style={{ padding: '10px 16px', fontWeight: 500 }}>{db.name}</td>
                                                        <td style={{ padding: '10px 16px' }}>
                                                            <span style={{
                                                                color: stateColor(db.state), background: stateColor(db.state) + '18',
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
                                                                    background: '#fff', border: `1px solid ${isSystem ? '#e0e0e0' : '#ffcccc'}`,
                                                                    color: isSystem ? '#bbb' : '#c00', padding: '4px 12px', borderRadius: 4,
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
                        </>
                    )}

                    {/* ── Section création ── */}
                    {section === 'create' && (
                        <>
                            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Créer une base de données</h2>
                            <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 24, maxWidth: 560 }}>
                                <form onSubmit={handleCreate}>
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={labelStyle}>Nom de la base <span style={{ color: '#c00' }}>*</span></label>
                                        <input name="name" value={createForm.name} onChange={handleCreateChange} placeholder="MaBase" required style={inputStyle} />
                                    </div>
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={labelStyle}>Collation</label>
                                        <select name="collation" value={createForm.collation} onChange={handleCreateChange} style={inputStyle}>
                                            {COLLATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: 24 }}>
                                        <label style={labelStyle}>Modèle de récupération</label>
                                        <select name="recoveryModel" value={createForm.recoveryModel} onChange={handleCreateChange} style={inputStyle}>
                                            {RECOVERY_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>

                                    {createError && (
                                        <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#c00', marginBottom: 16 }}>{createError}</div>
                                    )}
                                    {createSuccess && (
                                        <div style={{ background: '#f0fff4', border: '1px solid #b2dfdb', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#2e7d32', marginBottom: 16 }}>{createSuccess}</div>
                                    )}

                                    <button type="submit" disabled={creating} style={{
                                        background: '#3f51b5', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: 4, fontSize: 13,
                                        cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1
                                    }}>
                                        {creating ? 'Création...' : 'Créer la base de données'}
                                    </button>
                                </form>
                            </div>
                        </>
                    )}

                    {/* ── Section Sauvegarde ── */}
                    {section === 'backup' && (
                        <>
                            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Sauvegarder une base de données</h2>
                            <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 24 }}>

                                <form onSubmit={handleBackup} style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>

                                    <div style={{ flex: '1 1 200px' }}>
                                        <label style={labelStyle}>Base de données <span style={{ color: '#c00' }}>*</span></label>
                                        <select name="database" value={backupForm.database} onChange={handleBackupChange} required style={inputStyle}>
                                            <option value="" disabled>-- Sélectionner --</option>
                                            {databases.filter(db => db.name.toLowerCase() !== 'tempdb').map(db => (
                                                <option key={db.name} value={db.name}>{db.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ flex: '1 1 200px' }}>
                                        <label style={labelStyle}>Type de sauvegarde</label>
                                        <select name="type" value={backupForm.type} onChange={handleBackupChange} style={inputStyle}>
                                            {BACKUP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>

                                    <div style={{ flex: '2 1 300px' }}>
                                        <label style={labelStyle}>Chemin de destination (sur le serveur) <span style={{ color: '#c00' }}>*</span></label>
                                        <input
                                            name="destination"
                                            value={backupForm.destination}
                                            onChange={handleBackupChange}
                                            required
                                            style={inputStyle}
                                            placeholder="C:\Users\Public\Downloads\MaBase.bak"
                                        />
                                    </div>

                                    <div style={{ paddingBottom: 2 }}>
                                        <button type="submit" disabled={backingUp} style={{
                                            background: '#2e7d32', border: 'none', color: '#fff', padding: '8px 24px',
                                            borderRadius: 4, fontSize: 13, height: 34,
                                            cursor: backingUp ? 'not-allowed' : 'pointer', opacity: backingUp ? 0.7 : 1,
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {backingUp ? 'En cours...' : 'Sauvegarder'}
                                        </button>
                                    </div>

                                </form>

                                <div style={{ marginTop: 16 }}>
                                    {backupError && (
                                        <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#c00' }}>
                                            {backupError}
                                        </div>
                                    )}
                                    {backupSuccess && (
                                        <div style={{ background: '#f0fff4', border: '1px solid #b2dfdb', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#2e7d32' }}>
                                            {backupSuccess}
                                        </div>
                                    )}
                                </div>

                            </div>
                        </>
                    )}

                    {/* ── Section Console SQL ── */}
                    {section === 'query' && (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Exécuter une requête SQL</h2>

                            {/* Éditeur */}
                            <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                                <textarea
                                    value={sqlQuery}
                                    onChange={(e) => setSqlQuery(e.target.value)}
                                    placeholder="Écrivez votre requête SQL ici (ex: SELECT * FROM sys.databases)"
                                    style={{
                                        width: '100%', height: 120, fontFamily: 'monospace', fontSize: 13,
                                        padding: 12, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box',
                                        resize: 'vertical', background: '#fafafa', color: '#333'
                                    }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                                    <button
                                        onClick={handleRunQuery}
                                        disabled={isRunningQuery || !sqlQuery.trim()}
                                        style={{
                                            background: '#3f51b5', border: 'none', color: '#fff',
                                            padding: '8px 24px', borderRadius: 4, fontSize: 13, fontWeight: 600,
                                            cursor: isRunningQuery ? 'not-allowed' : 'pointer',
                                            opacity: isRunningQuery ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6
                                        }}
                                    >
                                        {isRunningQuery ? 'Exécution...' : <>▶ Exécuter</>}
                                    </button>
                                </div>
                            </div>

                            {/* Résultats */}
                            <div style={{ flex: 1, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 200 }}>
                                <div style={{ background: '#fafafa', borderBottom: '1px solid #e0e0e0', padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#555' }}>
                                    Résultats
                                </div>

                                <div style={{ padding: 16, overflow: 'auto', flex: 1 }}>
                                    {queryError && (
                                        <div style={{ color: '#c00', fontSize: 13, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                            Erreur : {queryError}
                                        </div>
                                    )}

                                    {!queryError && queryResults && queryResults.length === 0 && (
                                        <div style={{ color: '#2e7d32', fontSize: 13 }}>
                                            Requête exécutée avec succès.
                                            {queryRowsAffected && queryRowsAffected[0] > 0 && ` (${queryRowsAffected[0]} ligne(s) affectée(s))`}
                                            {!queryRowsAffected && ' Aucun résultat à afficher.'}
                                        </div>
                                    )}

                                    {!queryError && queryResults && queryResults.length > 0 && (
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
                                            <thead>
                                                <tr style={{ background: '#f5f5f5' }}>
                                                    {Object.keys(queryResults[0]).map(key => (
                                                        <th key={key} style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'left', color: '#444', position: 'sticky', top: 0, background: '#f5f5f5' }}>
                                                            {key}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {queryResults.map((row, rowIndex) => (
                                                    <tr key={rowIndex} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                        {Object.values(row).map((val: any, colIndex) => (
                                                            <td key={colIndex} style={{ padding: '6px 12px', border: '1px solid #e0e0e0', color: '#333' }}>
                                                                {val === null ? <span style={{ color: '#aaa', fontStyle: 'italic' }}>NULL</span> : String(val)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {!queryResults && !queryError && !isRunningQuery && (
                                        <div style={{ color: '#aaa', fontSize: 13, fontStyle: 'italic' }}>
                                            Les résultats s'afficheront ici.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Modal suppression */}
            {confirmDelete && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: '#fff', borderRadius: 8, padding: 28, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Supprimer la base de données ?</h3>
                        <p style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
                            La base <strong>{confirmDelete}</strong> sera supprimée définitivement. Cette action est irréversible.
                        </p>
                        {deleteError && (
                            <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#c00', marginBottom: 12 }}>
                                {deleteError}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                            <button onClick={() => { setConfirmDelete(null); setDeleteError(null) }} disabled={deleting}
                                style={{ background: '#f5f5f5', border: '1px solid #ccc', color: '#333', padding: '6px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                                Annuler
                            </button>
                            <button onClick={handleDeleteConfirm} disabled={deleting}
                                style={{ background: '#c00', border: 'none', color: '#fff', padding: '6px 16px', borderRadius: 4, cursor: deleting ? 'not-allowed' : 'pointer', fontSize: 13, opacity: deleting ? 0.7 : 1 }}>
                                {deleting ? 'Suppression...' : 'Supprimer définitivement'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}