require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

const AuthRoute = require('./routes/Auth')
app.use('/api/Auth', AuthRoute)

const SalesRoute = require('./routes/Sales')
app.use('/api/Sales', SalesRoute)

const EmployeesRoute = require('./routes/employees')
app.use('/api/Employees', EmployeesRoute)

const StoreInventoryRoute = require('./routes/StoreInventory')
app.use('/api/StoreInventory', StoreInventoryRoute)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`Backend fut: http://localhost:${PORT}`)
    console.log(`API: http://localhost:${PORT}/api`)
})