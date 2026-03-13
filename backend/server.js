require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

const AuthRoute = require('./routes/Auth')
app.use('/api/Auth', AuthRoute)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`Backend fut: http://localhost:${PORT}`)
    console.log(`API: http://localhost:${PORT}/api/Auth`)
})