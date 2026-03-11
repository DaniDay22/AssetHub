require('dotenv')

const config = {
    server: process.env.SERVER,
    database: process.env.DATABASE,
    user: process.env.USER,
    password: process.env.PASSWORD,
    port: parseInt(process.env.DB_PORT),
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
}

module.exports = config