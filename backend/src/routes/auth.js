const express = require('express')
const sql = require('mssql')
const router = express.Router()

router.get('/defaults', (req, res) => {
    res.json({
        server: process.env.SQL_SERVER || '',
        instance: process.env.SQL_INSTANCE || '',
        port: process.env.SQL_PORT || '1433',
        username: process.env.SQL_LOGIN || '',
        password: process.env.SQL_PASSWORD || '',
    })
})

router.post('/connect', async (req, res) => {
    const { server, instance, port, username, password } = req.body

    if (!server || !username || !password) {
        return res.status(400).json({ error: 'Champs manquants' })
    }

    const config = {
        user: username,
        password: password,
        server: server,
        port: port ? parseInt(port) : 1433,
        options: {
            trustServerCertificate: true,
            trustedConnection: false,
            enableArithAbort: true,
            ...(instance ? { instancename: instance } : {})
        }
    }

    try {
        const pool = await sql.connect(config)
        req.session.connected = true
        req.session.sqlConfig = config
        res.json({ success: true })
    } catch (err) {
        res.status(401).json({ error: err.message })
    }
})

router.post('/disconnect', (req, res) => {
    req.session.destroy()
    sql.close()
    res.json({ success: true })
})

module.exports = router