const express = require('express')
const sql = require('mssql')
const router = express.Router()

const SYSTEM_DATABASES = ['master', 'model', 'msdb', 'tempdb']

router.get('/', async (req, res) => {
    if (!req.session.connected) {
        return res.status(401).json({ error: 'Non connecté' })
    }

    try {
        const pool = await sql.connect(req.session.sqlConfig)
        const result = await pool.request().query(`
            SELECT 
                d.name,
                d.state_desc                                    AS state,
                d.recovery_model_desc                           AS recovery_model,
                CAST(SUM(mf.size) * 8.0 / 1024 AS DECIMAL(10,1)) AS size_mb,
                MAX(b.backup_finish_date)                       AS last_backup
            FROM sys.databases d
            LEFT JOIN sys.master_files mf 
                ON d.database_id = mf.database_id
            LEFT JOIN msdb.dbo.backupset b 
                ON d.name = b.database_name
            GROUP BY d.name, d.state_desc, d.recovery_model_desc
            ORDER BY d.name
        `)
        res.json(result.recordset)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.delete('/:name', async (req, res) => {
    if (!req.session.connected) {
        return res.status(401).json({ error: 'Non connecté' })
    }

    const { name } = req.params

    if (SYSTEM_DATABASES.includes(name.toLowerCase())) {
        return res.status(403).json({ error: `"${name}" est une base système protégée.` })
    }

    // Vérifier que le nom ne contient que des caractères valides (sécurité)
    if (!/^[\w\-. ]+$/.test(name)) {
        return res.status(400).json({ error: 'Nom de base de données invalide.' })
    }

    try {
        const pool = await sql.connect(req.session.sqlConfig)

        // Forcer la déconnexion des autres sessions avant suppression
        await pool.request().query(`
            ALTER DATABASE [${name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE
        `)
        await pool.request().query(`DROP DATABASE [${name}]`)

        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.post('/', async (req, res) => {
    if (!req.session.connected) {
        return res.status(401).json({ error: 'Non connecté' })
    }

    // On ne récupère plus que le nom, la collation et le modèle
    const { name, collation, recoveryModel } = req.body

    if (!name) return res.status(400).json({ error: 'Le nom est obligatoire.' })
    if (!/^[\w\-. ]+$/.test(name)) return res.status(400).json({ error: 'Nom invalide.' })
    if (SYSTEM_DATABASES.includes(name.toLowerCase())) {
        return res.status(403).json({ error: 'Ce nom est réservé.' })
    }

    const collate = collation || 'French_CI_AS'
    const model = recoveryModel || 'SIMPLE'

    try {
        const pool = await sql.connect(req.session.sqlConfig)

        // Création simple
        await pool.request().query(`
            CREATE DATABASE [${name}]
            COLLATE ${collate}
        `)

        // Modèle de récupération
        await pool.request().query(`
            ALTER DATABASE [${name}] SET RECOVERY ${model}
        `)

        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.post('/backup', async (req, res) => {
    if (!req.session.connected) {
        return res.status(401).json({ error: 'Non connecté' })
    }

    const { database, type, destination } = req.body

    if (!database) return res.status(400).json({ error: 'La base de données est obligatoire.' })
    if (!destination) return res.status(400).json({ error: 'La destination est obligatoire.' })

    try {
        const pool = await sql.connect(req.session.sqlConfig)
        let query = ''

        // On adapte la requête SQL en fonction du type de sauvegarde
        switch (type) {
            case 'FULL':
                // INIT écrase le fichier s'il existe déjà. Retire-le si tu veux ajouter au fichier existant.
                query = `BACKUP DATABASE [${database}] TO DISK = N'${destination}' WITH INIT, FORMAT`
                break
            case 'DIFFERENTIAL':
                query = `BACKUP DATABASE [${database}] TO DISK = N'${destination}' WITH DIFFERENTIAL`
                break
            case 'LOG':
                query = `BACKUP LOG [${database}] TO DISK = N'${destination}'`
                break
            default:
                return res.status(400).json({ error: 'Type de sauvegarde invalide.' })
        }

        await pool.request().query(query)
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// Route pour exécuter une requête SQL libre
router.post('/query', async (req, res) => {
    if (!req.session.connected) {
        return res.status(401).json({ error: 'Non connecté' })
    }

    const { sqlQuery } = req.body

    if (!sqlQuery || sqlQuery.trim() === '') {
        return res.status(400).json({ error: 'La requête est vide.' })
    }

    try {
        const pool = await sql.connect(req.session.sqlConfig)

        // Exécution de la requête brute
        const result = await pool.request().query(sqlQuery)

        // recordset contient les lignes (SELECT). S'il n'y en a pas (ex: UPDATE, CREATE), on renvoie un tableau vide.
        res.json({ results: result.recordset || [], rowsAffected: result.rowsAffected })
    } catch (err) {
        // En cas d'erreur de syntaxe ou autre, on renvoie le message d'erreur SQL
        res.status(400).json({ error: err.message })
    }
})

module.exports = router