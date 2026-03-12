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

        const accountExists = await pool.request()
            .input('Email', mssql.NVarChar, emailFormatted)
            .query(`SELECT TOP 1 Id FROM Employee
                WHERE Email = @Email`)

        const storeExists = await pool.request()
            .input('StoreName', mssql.NVarChar, storeName)
            .input('StoreAddress', mssql.NVarChar, storeAddress)
            .query(`SELECT TOP 1 Id FROM Store
                WHERE Name = @StoreName AND Address = @StoreAddress`)
                
        if(accountExists.recordset.length > 0){
            res.status(400).json({success: false, error: "Ez az email már használatban van!"})
        }
        else if(storeExists.recordset.length > 0){
            res.status(400).json({success: false, error: "Ez a bolt már létezik!"})
        }
        else{
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
                    INSERT INTO Store(Name, Address) VALUES (@StoreName, @StoreAddress);

                    DECLARE @NewStoreId int = SCOPE_IDENTITY();

                    INSERT INTO Employee(StoreId, AuthLv, Password, Name, Email, Phone, DoB, HiredAt) VALUES
                        (@NewStoreId,
                        (SELECT Id FROM AuthLevel WHERE Position = 'Manager'),
                        @Password, @Name, @Email, @Phone, @DoB, GETDATE());
                    COMMIT TRANSACTION;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH`)

            res.status(201).json({success: true, message: "Menedzseri fiók elkészítve!"})
        }
    }
    catch(err){
        res.status(500).json({success: false, error: "Szerver hiba történt!"})
    }
    finally{
        if (pool) await pool.close()
    }
})

router.post('/Register/Employee', async (req, res) => {
    try{
        const {name, email, phone, dob, salary, authName, creatorId} = req.body
        const emailFormatted = email.toLowerCase().trim()

        const pool = await sql.connect(config)

        const exists = await pool.request()
            .input('Email', mssql.NVarChar, emailFormatted)
            .query(`SELECT TOP 1 Email FROM Employee
                WHERE Email = @Email`)
        
        if(exists.recordset.length < 1){
            const hashedPass = await bcrypt.hash(phone, 10);
            const bufferedPass = Buffer.from(hashedPass);

            await pool.request()
            .input('Name', mssql.NVarChar, name)
            .input('Password', mssql.VarBinary, bufferedPass)
            .input('Email', mssql.NVarChar, emailFormatted)
            .input('Phone', mssql.NVarChar, phone)
            .input('DoB', mssql.Date, dob)
            .input('Salary', mssql.Int, salary)
            .input('AuthName', mssql.NVarChar, authName)
            .input('CreatorId', mssql.Int, creatorId)
            .query(`BEGIN TRANSACTION
                BEGIN TRY
                    INSERT INTO Employee(StoreId, AuthLv, Password, Name, Email, Phone, DoB, HiredAt, Salary, FirstLogin) VALUES
                        ((SELECT StoreId FROM Employee WHERE Id = @CreatorId),
                        (SELECT Id FROM AuthLevel WHERE Position = @AuthName),
                        @Password, @Name, @Email, @Phone, @DoB, GETDATE(), @Salary, true);
                    
                    COMMIT TRANSACTION;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH`)

            res.status(201).json({success: true, message: "Új fiók elkészítve!"})
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