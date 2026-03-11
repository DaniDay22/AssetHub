const express = require('express')
const mssql = require('mssql')
const config = require('../config')
const bcrypt = require('bcrypt')

const router = express.Router()

router.post('/Register/Manager', async (req, res) => {
    try{
        const {name, password, email, phone, dob, storeName, storeAddress} = req.body
        const emailFormatted = email.toLowerCase().trim()

        const pool = await sql.connect(config)

        const exists = await pool.request()
            .input('Email', mssql.NVarChar, emailFormatted)
            .query(`SELECT TOP 1 Email FROM Employee
                WHERE Email = @Email`)
        
        if(exists.recordset.length < 1){
            const hashedPass = await bcrypt.hash(password)
            const bufferedPass = Buffer.from(hashedPass)

            await pool.request()
            .input('Name', mssql.NVarChar, name)
            .input('Password', mssql.VarBinary, bufferedPass)
            .input('Email', mssql.NVarChar, emailFormatted)
            .input('Phone', mssql.NVarChar, phone)
            .input('DoB', mssql.Date, dob)
            .input('StoreName', mssql.NVarChar, storeName)
            .input('StoreAddress', mssql.NVarChar, storeAddress)
            .query(`BEGIN TRANSACTION
                BEGIN TRY
                    INSERT INTO Store(Name, Address) VALUES (@StoreName, @StoreAddress)
                    INSERT INTO Employee(AuthLv, Password, Name, Email, Phone, DoB, HiredAt) VALUES
                        ((SELECT Id FROM AuthLevel WHERE Position = 'Manager')), @Password, @Name, @Email, @Phone, @DoB, SYSDATETIME())
                    COMMIT TRANSACTION
                END TRY
                BEGIN CATCH
                    ROLLBACK TRANSACTION
                    THROW
                END CATCH`)

            res.status(201).json({success: true, message: "Menedzseri fiók elkészítve!"})
        }
        else{
            res.status(400).json({success: false, error: "Ez az email már használatban van!"})
        }
    }
    catch(err){
        res.status(500).json({success: false, error: "Szerver hiba történt!"})
    }
    finally{
        if (pool) await pool.close()
    }
})