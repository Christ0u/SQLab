const express = require('express')
const cors = require('cors')
const session = require('express-session')

const authRouter = require('./routes/auth')
const databasesRouter = require('./routes/databases')

const app = express()

app.use(cors({
    origin: 'http://localhost:80',
    credentials: true
}))
app.use(express.json())
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}))

app.use('/api/auth', authRouter)
app.use('/api/databases', databasesRouter)

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' })
})

app.listen(3001, () => {
    console.log('SQLab backend running on :3001')
})