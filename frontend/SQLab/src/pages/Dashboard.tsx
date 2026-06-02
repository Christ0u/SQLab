import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent, CSSProperties } from 'react'

interface Database {
    name: string
    state: string
    recovery_model: string
    size_mb: number
    last_backup: string | null
}

interface Login {
    name: string
    type_desc: string
    is_disabled: boolean
    create_date: string
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

type Section = 'list' | 'create' | 'backup' | 'query' | 'logins'

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

const NAV_ITEMS: { key: Section; label: string; icon: string; description: string }[] = [
    { key: 'list', label: 'Bases', icon: '🗄️', description: 'Inventaire SQL' },
    { key: 'create', label: 'Créer', icon: '➕', description: 'Nouvelle base' },
    { key: 'backup', label: 'Sauvegarder', icon: '💾', description: 'Backup SQL' },
    { key: 'query', label: 'Console SQL', icon: '▶️', description: 'Requêtes' },
    { key: 'logins', label: 'Logins', icon: '👤', description: 'Accès serveur' }
]

export default function Dashboard({ onDisconnected }: Props) {
    const [section, setSection] = useState<Section>('list')

    // -- Liste des Bases --
    const [databases, setDatabases] = useState<Database[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    // -- Liste des Logins --
    const [logins, setLogins] = useState<Login[]>([])
    const [loadingLogins, setLoadingLogins] = useState(false)
    const [loginsError, setLoginsError] = useState<string | null>(null)
    const [updatingLogin, setUpdatingLogin] = useState<string | null>(null)

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
    const [sqlQuery, setSqlQuery] = useState<string>(
        "SELECT top 10 wait_type, waiting_tasks_count, wait_time_ms\nFROM sys.dm_os_wait_stats\nORDER BY wait_time_ms DESC;"
    )
    const [isRunningQuery, setIsRunningQuery] = useState(false)
    const [queryResults, setQueryResults] = useState<any[] | null>(null)
    const [queryRowsAffected, setQueryRowsAffected] = useState<number[] | null>(null)
    const [queryError, setQueryError] = useState<string | null>(null)

    const loadDatabases = () => {
        setLoading(true)
        setError(null)

        fetch('/api/databases', { credentials: 'include' })
            .then(r => r.json())
            .then(data => Array.isArray(data) ? setDatabases(data) : setError(data.error))
            .catch(() => setError('Impossible de charger les bases de données'))
            .finally(() => setLoading(false))
    }

    const loadLogins = () => {
        setLoadingLogins(true)
        setLoginsError(null)

        fetch('/api/databases/logins', { credentials: 'include' })
            .then(r => r.json())
            .then(data => Array.isArray(data) ? setLogins(data) : setLoginsError(data.error))
            .catch(() => setLoginsError('Impossible de charger les logins'))
            .finally(() => setLoadingLogins(false))
    }

    const toggleLoginStatus = async (name: string, isCurrentlyDisabled: boolean) => {
        const action = isCurrentlyDisabled ? 'ENABLE' : 'DISABLE'

        setUpdatingLogin(name)

        try {
            const res = await fetch(`/api/databases/logins/${encodeURIComponent(name)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action })
            })

            if (res.ok) {
                loadLogins()
            } else {
                const data = await res.json()
                alert(data.error || 'Erreur lors de la modification')
            }
        } catch {
            alert('Erreur lors de la modification')
        } finally {
            setUpdatingLogin(null)
        }
    }

    useEffect(() => {
        loadDatabases()
    }, [])

    useEffect(() => {
        if (section === 'logins' && logins.length === 0 && !loadingLogins) {
            loadLogins()
        }
    }, [section])

    const handleDisconnect = async () => {
        await fetch('/api/auth/disconnect', {
            method: 'POST',
            credentials: 'include'
        })

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
                loadDatabases()
            }
        } catch {
            setDeleteError('Erreur lors de la suppression')
        } finally {
            setDeleting(false)
        }
    }

    const handleCreateChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setCreateForm({ ...createForm, [e.target.name]: e.target.value })
        setCreateError(null)
        setCreateSuccess(null)
    }

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault()

        setCreating(true)
        setCreateError(null)
        setCreateSuccess(null)

        try {
            const res = await fetch('/api/databases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(createForm)
            })

            const data = await res.json()

            if (!res.ok) {
                setCreateError(data.error)
            } else {
                setCreateSuccess(`La base "${createForm.name}" a été créée avec succès.`)
                setCreateForm({
                    name: '',
                    collation: 'French_CI_AS',
                    recoveryModel: 'SIMPLE'
                })
                loadDatabases()
            }
        } catch {
            setCreateError('Erreur lors de la création')
        } finally {
            setCreating(false)
        }
    }

    const handleBackupChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setBackupForm({ ...backupForm, [e.target.name]: e.target.value })
        setBackupError(null)
        setBackupSuccess(null)
    }

    const handleBackup = async (e: FormEvent) => {
        e.preventDefault()

        if (!backupForm.database) {
            setBackupError('Veuillez sélectionner une base de données.')
            return
        }

        setBackingUp(true)
        setBackupError(null)
        setBackupSuccess(null)

        try {
            const res = await fetch('/api/databases/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(backupForm)
            })

            const data = await res.json()

            if (!res.ok) {
                setBackupError(data.error)
            } else {
                setBackupSuccess(`Sauvegarde de "${backupForm.database}" lancée et terminée avec succès.`)
                loadDatabases()
            }
        } catch {
            setBackupError('Erreur lors de la communication avec le serveur.')
        } finally {
            setBackingUp(false)
        }
    }

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

    const formatDate = (d: string | null) => {
        if (!d) return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Jamais</span>

        const date = new Date(d)

        if (Number.isNaN(date.getTime())) {
            return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Date invalide</span>
        }

        return date.toLocaleString('fr-FR')
    }

    const formatSize = (mb: number) => {
        const value = Number(mb || 0)

        if (value >= 1024) {
            return `${(value / 1024).toFixed(1)} Go`
        }

        if (Number.isInteger(value)) {
            return `${value} Mo`
        }

        return `${value.toFixed(1)} Mo`
    }

    const stateColor = (state: string) => {
        switch (state) {
            case 'ONLINE':
                return '#16a34a'
            case 'OFFLINE':
                return '#dc2626'
            case 'RESTORING':
                return '#2563eb'
            case 'RECOVERING':
                return '#f59e0b'
            case 'SUSPECT':
                return '#9333ea'
            case 'EMERGENCY':
                return '#ea580c'
            default:
                return '#6b7280'
        }
    }

    const getSectionTitle = () => {
        switch (section) {
            case 'list':
                return 'Bases de données'
            case 'create':
                return 'Créer une base'
            case 'backup':
                return 'Sauvegarder'
            case 'query':
                return 'Console SQL'
            case 'logins':
                return 'Logins serveur'
            default:
                return 'SQLab'
        }
    }

    const getSectionSubtitle = () => {
        switch (section) {
            case 'list':
                return 'Vue d\'ensemble des bases SQL Server disponibles.'
            case 'create':
                return 'Créer rapidement une nouvelle base avec sa collation et son modèle de récupération.'
            case 'backup':
                return 'Lancer une sauvegarde complète, différentielle ou transactionnelle.'
            case 'query':
                return 'Exécuter une requête SQL et afficher les résultats directement.'
            case 'logins':
                return 'Consulter et gérer l\'état des logins SQL Server.'
            default:
                return ''
        }
    }

    const onlineDatabases = databases.filter(db => db.state === 'ONLINE').length
    const totalSizeMb = databases.reduce((sum, db) => sum + Number(db.size_mb || 0), 0)
    const userDatabases = databases.filter(db => !SYSTEM_DATABASES.includes(db.name.toLowerCase())).length
    const activeLogins = logins.filter(login => !login.is_disabled).length

    const inputStyle: CSSProperties = {
        width: '100%',
        marginTop: 6,
        padding: '10px 12px',
        border: '1px solid #d6d9e0',
        borderRadius: 10,
        fontSize: 13,
        color: '#111827',
        background: '#fff',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
    }

    const labelStyle: CSSProperties = {
        fontSize: 12,
        color: '#4b5563',
        fontWeight: 700
    }

    const cardStyle: CSSProperties = {
        background: 'rgba(255,255,255,0.96)',
        border: '1px solid #eef0f4',
        borderRadius: 18,
        boxShadow: '0 18px 45px rgba(15,23,42,0.08)'
    }

    const panelStyle: CSSProperties = {
        ...cardStyle,
        padding: 24
    }

    const primaryButtonStyle: CSSProperties = {
        background: 'linear-gradient(135deg, #3f51b5, #263a9f)',
        border: 'none',
        color: '#fff',
        padding: '10px 18px',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 800,
        cursor: 'pointer',
        boxShadow: '0 10px 22px rgba(63,81,181,0.24)'
    }

    const secondaryButtonStyle: CSSProperties = {
        background: '#fff',
        border: '1px solid #d1d5db',
        color: '#374151',
        padding: '8px 14px',
        borderRadius: 10,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700
    }

    const dangerButtonStyle: CSSProperties = {
        background: '#dc2626',
        border: 'none',
        color: '#fff',
        padding: '8px 14px',
        borderRadius: 10,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 800
    }

    const successButtonStyle: CSSProperties = {
        background: '#16a34a',
        border: 'none',
        color: '#fff',
        padding: '10px 18px',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 800,
        cursor: 'pointer',
        boxShadow: '0 10px 22px rgba(22,163,74,0.22)'
    }

    const tableHeaderStyle: CSSProperties = {
        padding: '13px 16px',
        textAlign: 'center',
        fontWeight: 800,
        color: '#4b5563',
        fontSize: 12,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        background: '#f9fafb',
        borderBottom: '1px solid #eef0f4',
        verticalAlign: 'middle'
    }

    const tableCellStyle: CSSProperties = {
        padding: '13px 16px',
        color: '#374151',
        fontSize: 13,
        borderBottom: '1px solid #f3f4f6',
        textAlign: 'center',
        verticalAlign: 'middle'
    }

    const errorBoxStyle: CSSProperties = {
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 12,
        padding: '10px 12px',
        fontSize: 12,
        color: '#b91c1c',
        lineHeight: 1.45
    }

    const successBoxStyle: CSSProperties = {
        background: '#ecfdf5',
        border: '1px solid #bbf7d0',
        borderRadius: 12,
        padding: '10px 12px',
        fontSize: 12,
        color: '#15803d',
        lineHeight: 1.45
    }

    const mutedTextStyle: CSSProperties = {
        color: '#6b7280',
        fontSize: 13,
        lineHeight: 1.5
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                background:
                    'radial-gradient(circle at top left, rgba(63,81,181,0.24), transparent 32%), linear-gradient(135deg, #111827 0%, #1a1a2e 45%, #0f172a 100%)',
                color: '#111827'
            }}
        >
            {/* Header */}
            <div
                style={{
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 28px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(17,24,39,0.78)',
                    backdropFilter: 'blur(12px)',
                    boxSizing: 'border-box'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, #667eea, #3f51b5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 900,
                            fontSize: 14,
                            boxShadow: '0 10px 25px rgba(63,81,181,0.35)'
                        }}
                    >
                        SQL
                    </div>

                    <div>
                        <div style={{ color: '#fff', fontWeight: 900, fontSize: 17, letterSpacing: '-0.02em' }}>
                            SQLab
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: 11 }}>
                            Administration SQL Server
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleDisconnect}
                    style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.16)',
                        color: '#fff',
                        padding: '8px 14px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 700
                    }}
                >
                    Déconnexion
                </button>
            </div>

            <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
                {/* Sidebar */}
                <aside
                    style={{
                        width: 260,
                        padding: 18,
                        boxSizing: 'border-box',
                        borderRight: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(15,23,42,0.56)',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    <div
                        style={{
                            padding: '14px 14px 16px',
                            borderRadius: 16,
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            marginBottom: 18
                        }}
                    >
                        <div style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>
                            Tableau de bord
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
                            Gérez vos bases, sauvegardes, logins et requêtes SQL.
                        </div>
                    </div>

                    <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {NAV_ITEMS.map(item => {
                            const active = section === item.key

                            return (
                                <button
                                    key={item.key}
                                    onClick={() => setSection(item.key)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        textAlign: 'left',
                                        padding: '12px 13px',
                                        borderRadius: 14,
                                        border: active ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent',
                                        background: active
                                            ? 'linear-gradient(135deg, rgba(63,81,181,0.95), rgba(38,58,159,0.95))'
                                            : 'transparent',
                                        color: active ? '#fff' : '#d1d5db',
                                        cursor: 'pointer',
                                        boxShadow: active ? '0 12px 26px rgba(63,81,181,0.24)' : 'none'
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: 12,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: active ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)',
                                            fontSize: 15
                                        }}
                                    >
                                        {item.icon}
                                    </span>

                                    <span>
                                        <span style={{ display: 'block', fontWeight: 900, fontSize: 13 }}>
                                            {item.label}
                                        </span>
                                        <span
                                            style={{
                                                display: 'block',
                                                color: active ? 'rgba(255,255,255,0.72)' : '#9ca3af',
                                                fontSize: 11,
                                                marginTop: 2
                                            }}
                                        >
                                            {item.description}
                                        </span>
                                    </span>
                                </button>
                            )
                        })}
                    </nav>
                </aside>

                {/* Content */}
                <main
                    style={{
                        flex: 1,
                        padding: 28,
                        overflow: 'auto',
                        boxSizing: 'border-box'
                    }}
                >
                    <div
                        style={{
                            maxWidth: 1280,
                            margin: '0 auto'
                        }}
                    >
                        {/* Page header */}
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr auto',
                                alignItems: 'start',
                                gap: 16,
                                marginBottom: 22,
                                width: '100%'
                            }}
                        >
                            <div
                                style={{
                                    textAlign: 'left',
                                    justifySelf: 'start',
                                    width: '100%'
                                }}
                            >
                                <h1
                                    style={{
                                        color: '#fff',
                                        fontSize: 28,
                                        lineHeight: 1.1,
                                        margin: 0,
                                        fontWeight: 900,
                                        letterSpacing: '-0.04em',
                                        textAlign: 'left'
                                    }}
                                >
                                    {getSectionTitle()}
                                </h1>

                                <p
                                    style={{
                                        color: '#cbd5e1',
                                        fontSize: 13,
                                        margin: '8px 0 0',
                                        lineHeight: 1.5,
                                        textAlign: 'left'
                                    }}
                                >
                                    {getSectionSubtitle()}
                                </p>
                            </div>

                            <div
                                style={{
                                    justifySelf: 'end',
                                    minWidth: section === 'list' ? 110 : 0
                                }}
                            >
                                {section === 'list' && (
                                    <button
                                        onClick={loadDatabases}
                                        disabled={loading}
                                        style={{
                                            ...secondaryButtonStyle,
                                            background: 'rgba(255,255,255,0.96)',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            opacity: loading ? 0.7 : 1
                                        }}
                                    >
                                        {loading ? 'Actualisation...' : 'Actualiser'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Section Liste */}
                        {section === 'list' && (
                            <>
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                                        gap: 14,
                                        marginBottom: 18
                                    }}
                                >
                                    <div style={{ ...cardStyle, padding: 18 }}>
                                        <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 800 }}>
                                            Bases totales
                                        </div>
                                        <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>
                                            {databases.length}
                                        </div>
                                    </div>

                                    <div style={{ ...cardStyle, padding: 18 }}>
                                        <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 800 }}>
                                            Bases utilisateur
                                        </div>
                                        <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>
                                            {userDatabases}
                                        </div>
                                    </div>

                                    <div style={{ ...cardStyle, padding: 18 }}>
                                        <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 800 }}>
                                            En ligne
                                        </div>
                                        <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8, color: '#16a34a' }}>
                                            {onlineDatabases}
                                        </div>
                                    </div>

                                    <div style={{ ...cardStyle, padding: 18 }}>
                                        <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 800 }}>
                                            Taille cumulée
                                        </div>
                                        <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>
                                            {formatSize(totalSizeMb)}
                                        </div>
                                    </div>
                                </div>

                                {loading && (
                                    <div style={panelStyle}>
                                        <p style={mutedTextStyle}>Chargement des bases de données...</p>
                                    </div>
                                )}

                                {error && (
                                    <div style={errorBoxStyle}>
                                        <strong>Erreur :</strong> {error}
                                    </div>
                                )}

                                {!loading && !error && (
                                    <div style={{ ...cardStyle, overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr>
                                                    {['Nom', 'État', 'Taille', 'Modèle', 'Dernière sauvegarde', 'Actions'].map(h => (
                                                        <th key={h} style={tableHeaderStyle}>
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {databases.map(db => {
                                                    const isSystem = SYSTEM_DATABASES.includes(db.name.toLowerCase())

                                                    return (
                                                        <tr key={db.name}>
                                                            <td style={{ ...tableCellStyle, fontWeight: 800, color: '#111827' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                                    <span>🗄️</span>
                                                                    <span>{db.name}</span>
                                                                    {isSystem && (
                                                                        <span
                                                                            style={{
                                                                                color: '#6b7280',
                                                                                background: '#f3f4f6',
                                                                                padding: '2px 7px',
                                                                                borderRadius: 999,
                                                                                fontSize: 10,
                                                                                fontWeight: 800
                                                                            }}
                                                                        >
                                                                            Système
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            <td style={tableCellStyle}>
                                                                <span
                                                                    style={{
                                                                        color: stateColor(db.state),
                                                                        background: `${stateColor(db.state)}14`,
                                                                        border: `1px solid ${stateColor(db.state)}25`,
                                                                        padding: '4px 9px',
                                                                        borderRadius: 999,
                                                                        fontSize: 11,
                                                                        fontWeight: 900
                                                                    }}
                                                                >
                                                                    {db.state}
                                                                </span>
                                                            </td>

                                                            <td style={tableCellStyle}>{formatSize(db.size_mb)}</td>

                                                            <td style={tableCellStyle}>
                                                                <span
                                                                    style={{
                                                                        background: '#f3f4f6',
                                                                        color: '#374151',
                                                                        padding: '4px 9px',
                                                                        borderRadius: 999,
                                                                        fontSize: 11,
                                                                        fontWeight: 800
                                                                    }}
                                                                >
                                                                    {db.recovery_model}
                                                                </span>
                                                            </td>

                                                            <td style={tableCellStyle}>{formatDate(db.last_backup)}</td>

                                                            <td style={tableCellStyle}>
                                                                <button
                                                                    onClick={() => !isSystem && setConfirmDelete(db.name)}
                                                                    disabled={isSystem}
                                                                    title={isSystem ? 'Base système protégée' : `Supprimer ${db.name}`}
                                                                    style={{
                                                                        background: isSystem ? '#f3f4f6' : '#fef2f2',
                                                                        border: `1px solid ${isSystem ? '#e5e7eb' : '#fecaca'}`,
                                                                        color: isSystem ? '#9ca3af' : '#dc2626',
                                                                        padding: '7px 12px',
                                                                        borderRadius: 10,
                                                                        cursor: isSystem ? 'not-allowed' : 'pointer',
                                                                        fontSize: 12,
                                                                        fontWeight: 800
                                                                    }}
                                                                >
                                                                    Supprimer
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}

                                                {databases.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                                                            Aucune base de données trouvée.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Section Création */}
                        {section === 'create' && (
                            <div style={{ ...panelStyle, maxWidth: 680 }}>
                                <form onSubmit={handleCreate}>
                                    <div style={{ marginBottom: 18 }}>
                                        <label style={labelStyle}>
                                            Nom de la base <span style={{ color: '#dc2626' }}>*</span>
                                        </label>

                                        <input
                                            name="name"
                                            value={createForm.name}
                                            onChange={handleCreateChange}
                                            placeholder="MaBase"
                                            required
                                            style={inputStyle}
                                        />
                                    </div>

                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: 14,
                                            marginBottom: 22
                                        }}
                                    >
                                        <div>
                                            <label style={labelStyle}>Collation</label>

                                            <select
                                                name="collation"
                                                value={createForm.collation}
                                                onChange={handleCreateChange}
                                                style={inputStyle}
                                            >
                                                {COLLATIONS.map(c => (
                                                    <option key={c} value={c}>
                                                        {c}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label style={labelStyle}>Modèle de récupération</label>

                                            <select
                                                name="recoveryModel"
                                                value={createForm.recoveryModel}
                                                onChange={handleCreateChange}
                                                style={inputStyle}
                                            >
                                                {RECOVERY_MODELS.map(m => (
                                                    <option key={m} value={m}>
                                                        {m}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {createError && (
                                        <div style={{ ...errorBoxStyle, marginBottom: 16 }}>
                                            <strong>Erreur :</strong> {createError}
                                        </div>
                                    )}

                                    {createSuccess && (
                                        <div style={{ ...successBoxStyle, marginBottom: 16 }}>
                                            <strong>Succès :</strong> {createSuccess}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={creating}
                                        style={{
                                            ...primaryButtonStyle,
                                            cursor: creating ? 'not-allowed' : 'pointer',
                                            opacity: creating ? 0.7 : 1
                                        }}
                                    >
                                        {creating ? 'Création en cours...' : 'Créer la base de données'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Section Sauvegarde */}
                        {section === 'backup' && (
                            <div style={panelStyle}>
                                <form
                                    onSubmit={handleBackup}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1.1fr 1fr 2fr auto',
                                        gap: 14,
                                        alignItems: 'end'
                                    }}
                                >
                                    <div>
                                        <label style={labelStyle}>
                                            Base de données <span style={{ color: '#dc2626' }}>*</span>
                                        </label>

                                        <select
                                            name="database"
                                            value={backupForm.database}
                                            onChange={handleBackupChange}
                                            required
                                            style={inputStyle}
                                        >
                                            <option value="" disabled>
                                                -- Sélectionner --
                                            </option>

                                            {databases
                                                .filter(db => db.name.toLowerCase() !== 'tempdb')
                                                .map(db => (
                                                    <option key={db.name} value={db.name}>
                                                        {db.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={labelStyle}>Type de sauvegarde</label>

                                        <select
                                            name="type"
                                            value={backupForm.type}
                                            onChange={handleBackupChange}
                                            style={inputStyle}
                                        >
                                            {BACKUP_TYPES.map(t => (
                                                <option key={t.value} value={t.value}>
                                                    {t.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={labelStyle}>
                                            Chemin de destination sur le serveur <span style={{ color: '#dc2626' }}>*</span>
                                        </label>

                                        <input
                                            name="destination"
                                            value={backupForm.destination}
                                            onChange={handleBackupChange}
                                            required
                                            style={inputStyle}
                                            placeholder={String.raw`C:\Users\Public\Downloads\MaBase.bak`}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={backingUp}
                                        style={{
                                            ...successButtonStyle,
                                            height: 42,
                                            whiteSpace: 'nowrap',
                                            cursor: backingUp ? 'not-allowed' : 'pointer',
                                            opacity: backingUp ? 0.7 : 1
                                        }}
                                    >
                                        {backingUp ? 'En cours...' : 'Sauvegarder'}
                                    </button>
                                </form>

                                <div style={{ marginTop: 16 }}>
                                    {backupError && (
                                        <div style={errorBoxStyle}>
                                            <strong>Erreur :</strong> {backupError}
                                        </div>
                                    )}

                                    {backupSuccess && (
                                        <div style={successBoxStyle}>
                                            <strong>Succès :</strong> {backupSuccess}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Section Console SQL */}
                        {section === 'query' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={panelStyle}>
                                    <label style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>
                                        Requête SQL
                                    </label>

                                    <textarea
                                        value={sqlQuery}
                                        onChange={e => setSqlQuery(e.target.value)}
                                        placeholder="Écrivez votre requête SQL ici"
                                        style={{
                                            width: '100%',
                                            height: 160,
                                            fontFamily: 'Consolas, Monaco, monospace',
                                            fontSize: 13,
                                            lineHeight: 1.55,
                                            padding: 14,
                                            border: '1px solid #d6d9e0',
                                            borderRadius: 12,
                                            boxSizing: 'border-box',
                                            resize: 'vertical',
                                            background: '#0f172a',
                                            color: '#e5e7eb',
                                            outline: 'none'
                                        }}
                                    />

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                                        <button
                                            onClick={handleRunQuery}
                                            disabled={isRunningQuery || !sqlQuery.trim()}
                                            style={{
                                                ...primaryButtonStyle,
                                                cursor: isRunningQuery || !sqlQuery.trim() ? 'not-allowed' : 'pointer',
                                                opacity: isRunningQuery || !sqlQuery.trim() ? 0.7 : 1
                                            }}
                                        >
                                            {isRunningQuery ? 'Exécution en cours...' : '▶ Exécuter'}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ ...cardStyle, overflow: 'hidden', minHeight: 260 }}>
                                    <div
                                        style={{
                                            background: '#f9fafb',
                                            borderBottom: '1px solid #eef0f4',
                                            padding: '14px 18px',
                                            fontSize: 13,
                                            fontWeight: 900,
                                            color: '#374151',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <span>Résultats</span>
                                        {queryResults && (
                                            <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 700 }}>
                                                {queryResults.length} ligne(s)
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ padding: 18, overflow: 'auto' }}>
                                        {queryError && (
                                            <div
                                                style={{
                                                    ...errorBoxStyle,
                                                    fontFamily: 'Consolas, Monaco, monospace',
                                                    whiteSpace: 'pre-wrap'
                                                }}
                                            >
                                                <strong>Erreur :</strong> {queryError}
                                            </div>
                                        )}

                                        {!queryError && queryResults && queryResults.length === 0 && (
                                            <div style={successBoxStyle}>
                                                Requête exécutée avec succès.
                                                {queryRowsAffected && queryRowsAffected[0] > 0 && ` (${queryRowsAffected[0]} ligne(s) affectée(s))`}
                                                {!queryRowsAffected && ' Aucun résultat à afficher.'}
                                            </div>
                                        )}

                                        {!queryError && queryResults && queryResults.length > 0 && (
                                            <table
                                                style={{
                                                    width: '100%',
                                                    borderCollapse: 'separate',
                                                    borderSpacing: 0,
                                                    fontSize: 12,
                                                    fontFamily: 'Consolas, Monaco, monospace',
                                                    overflow: 'hidden',
                                                    border: '1px solid #eef0f4',
                                                    borderRadius: 12
                                                }}
                                            >
                                                <thead>
                                                    <tr>
                                                        {Object.keys(queryResults[0]).map(key => (
                                                            <th
                                                                key={key}
                                                                style={{
                                                                    padding: '10px 12px',
                                                                    borderBottom: '1px solid #e5e7eb',
                                                                    textAlign: 'center',
                                                                    color: '#374151',
                                                                    position: 'sticky',
                                                                    top: 0,
                                                                    background: '#f9fafb',
                                                                    fontWeight: 900,
                                                                    verticalAlign: 'middle'
                                                                }}
                                                            >
                                                                {key}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {queryResults.map((row, rowIndex) => (
                                                        <tr key={rowIndex}>
                                                            {Object.values(row).map((val: any, colIndex) => (
                                                                <td
                                                                    key={colIndex}
                                                                    style={{
                                                                        padding: '9px 12px',
                                                                        borderBottom: rowIndex < queryResults.length - 1 ? '1px solid #f3f4f6' : 'none',
                                                                        color: '#374151',
                                                                        whiteSpace: 'nowrap',
                                                                        textAlign: 'center',
                                                                        verticalAlign: 'middle'
                                                                    }}
                                                                >
                                                                    {val === null ? (
                                                                        <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                                                                            NULL
                                                                        </span>
                                                                    ) : (
                                                                        String(val)
                                                                    )}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}

                                        {!queryResults && !queryError && !isRunningQuery && (
                                            <div style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>
                                                Les résultats s'afficheront ici.
                                            </div>
                                        )}

                                        {isRunningQuery && (
                                            <div style={{ color: '#6b7280', fontSize: 13 }}>
                                                Exécution de la requête en cours...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Section Logins */}
                        {section === 'logins' && (
                            <>
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                        gap: 14,
                                        marginBottom: 18
                                    }}
                                >
                                    <div style={{ ...cardStyle, padding: 18 }}>
                                        <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 800 }}>
                                            Logins totaux
                                        </div>
                                        <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>
                                            {logins.length}
                                        </div>
                                    </div>

                                    <div style={{ ...cardStyle, padding: 18 }}>
                                        <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 800 }}>
                                            Logins actifs
                                        </div>
                                        <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8, color: '#16a34a' }}>
                                            {activeLogins}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            ...cardStyle,
                                            padding: 18,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minHeight: 86,
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        <button
                                            onClick={loadLogins}
                                            disabled={loadingLogins}
                                            style={{
                                                width: '100%',
                                                maxWidth: 220,
                                                height: 42,
                                                background: 'linear-gradient(135deg, #ffffff, #f9fafb)',
                                                border: '1px solid #d1d5db',
                                                color: '#374151',
                                                padding: '0 16px',
                                                borderRadius: 12,
                                                cursor: loadingLogins ? 'not-allowed' : 'pointer',
                                                fontSize: 12,
                                                fontWeight: 800,
                                                boxShadow: '0 8px 18px rgba(15,23,42,0.08)',
                                                opacity: loadingLogins ? 0.7 : 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {loadingLogins ? 'Actualisation...' : 'Actualiser les logins'}
                                        </button>
                                    </div>
                                </div>

                                {loadingLogins && (
                                    <div style={panelStyle}>
                                        <p style={mutedTextStyle}>Chargement des logins...</p>
                                    </div>
                                )}

                                {loginsError && (
                                    <div style={errorBoxStyle}>
                                        <strong>Erreur :</strong> {loginsError}
                                    </div>
                                )}

                                {!loadingLogins && !loginsError && (
                                    <div style={{ ...cardStyle, overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr>
                                                    {['Nom d\'utilisateur', 'Type', 'Statut', 'Date de création', 'Action'].map(h => (
                                                        <th key={h} style={tableHeaderStyle}>
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {logins.map(login => {
                                                    const isSystemLogin =
                                                        login.name.startsWith('##') ||
                                                        login.name.startsWith('NT SERVICE') ||
                                                        login.name.startsWith('NT AUTHORITY')

                                                    const isUpdating = updatingLogin === login.name

                                                    return (
                                                        <tr key={login.name}>
                                                            <td style={{ ...tableCellStyle, fontWeight: 800, color: '#111827' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                                    <span>👤</span>
                                                                    <span>{login.name}</span>
                                                                </div>
                                                            </td>

                                                            <td style={tableCellStyle}>
                                                                <span
                                                                    style={{
                                                                        background: '#f3f4f6',
                                                                        color: '#374151',
                                                                        padding: '4px 9px',
                                                                        borderRadius: 999,
                                                                        fontSize: 11,
                                                                        fontWeight: 800
                                                                    }}
                                                                >
                                                                    {login.type_desc}
                                                                </span>
                                                            </td>

                                                            <td style={tableCellStyle}>
                                                                <span
                                                                    style={{
                                                                        color: login.is_disabled ? '#dc2626' : '#16a34a',
                                                                        background: login.is_disabled ? '#fef2f2' : '#ecfdf5',
                                                                        border: login.is_disabled ? '1px solid #fecaca' : '1px solid #bbf7d0',
                                                                        padding: '4px 9px',
                                                                        borderRadius: 999,
                                                                        fontSize: 11,
                                                                        fontWeight: 900
                                                                    }}
                                                                >
                                                                    {login.is_disabled ? 'Désactivé' : 'Actif'}
                                                                </span>
                                                            </td>

                                                            <td style={tableCellStyle}>
                                                                {formatDate(login.create_date)}
                                                            </td>

                                                            <td style={tableCellStyle}>
                                                                {!isSystemLogin ? (
                                                                    <button
                                                                        onClick={() => toggleLoginStatus(login.name, login.is_disabled)}
                                                                        disabled={isUpdating}
                                                                        style={{
                                                                            background: login.is_disabled ? '#16a34a' : '#dc2626',
                                                                            color: '#fff',
                                                                            border: 'none',
                                                                            padding: '7px 12px',
                                                                            borderRadius: 10,
                                                                            cursor: isUpdating ? 'not-allowed' : 'pointer',
                                                                            fontSize: 12,
                                                                            fontWeight: 800,
                                                                            opacity: isUpdating ? 0.7 : 1
                                                                        }}
                                                                    >
                                                                        {isUpdating
                                                                            ? 'Modification...'
                                                                            : login.is_disabled
                                                                                ? 'Activer'
                                                                                : 'Désactiver'}
                                                                    </button>
                                                                ) : (
                                                                    <span
                                                                        style={{
                                                                            color: '#9ca3af',
                                                                            background: '#f3f4f6',
                                                                            padding: '4px 9px',
                                                                            borderRadius: 999,
                                                                            fontSize: 11,
                                                                            fontWeight: 800
                                                                        }}
                                                                    >
                                                                        Système
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}

                                                {logins.length === 0 && (
                                                    <tr>
                                                        <td
                                                            colSpan={5}
                                                            style={{
                                                                padding: 24,
                                                                textAlign: 'center',
                                                                color: '#6b7280'
                                                            }}
                                                        >
                                                            Aucun login trouvé.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </main>
            </div>

            {/* Modal suppression */}
            {confirmDelete && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15,23,42,0.68)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100,
                        padding: 24,
                        boxSizing: 'border-box'
                    }}
                >
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: 20,
                            padding: 28,
                            width: 420,
                            boxShadow: '0 28px 90px rgba(0,0,0,0.38)',
                            border: '1px solid rgba(255,255,255,0.4)'
                        }}
                    >
                        <div
                            style={{
                                width: 46,
                                height: 46,
                                borderRadius: 14,
                                background: '#fef2f2',
                                color: '#dc2626',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 22,
                                marginBottom: 14
                            }}
                        >
                            ⚠️
                        </div>

                        <h3
                            style={{
                                fontSize: 19,
                                fontWeight: 900,
                                margin: '0 0 8px',
                                color: '#111827',
                                letterSpacing: '-0.02em'
                            }}
                        >
                            Supprimer la base de données ?
                        </h3>

                        <p
                            style={{
                                fontSize: 13,
                                color: '#4b5563',
                                margin: '0 0 14px',
                                lineHeight: 1.55
                            }}
                        >
                            La base <strong>{confirmDelete}</strong> sera supprimée définitivement.
                            Cette action est irréversible.
                        </p>

                        {deleteError && (
                            <div style={{ ...errorBoxStyle, marginBottom: 14 }}>
                                <strong>Erreur :</strong> {deleteError}
                            </div>
                        )}

                        <div
                            style={{
                                display: 'flex',
                                gap: 10,
                                justifyContent: 'flex-end',
                                marginTop: 22
                            }}
                        >
                            <button
                                onClick={() => {
                                    setConfirmDelete(null)
                                    setDeleteError(null)
                                }}
                                disabled={deleting}
                                style={{
                                    ...secondaryButtonStyle,
                                    cursor: deleting ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Annuler
                            </button>

                            <button
                                onClick={handleDeleteConfirm}
                                disabled={deleting}
                                style={{
                                    ...dangerButtonStyle,
                                    cursor: deleting ? 'not-allowed' : 'pointer',
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