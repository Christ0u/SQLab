const express = require('express')
const sql = require('mssql')
const router = express.Router()

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

module.exports = router