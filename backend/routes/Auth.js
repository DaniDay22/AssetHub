require('dotenv')
const express = require('express')
const mssql = require('mssql')
const config = require('../config')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const jwt_secretKey = process.env.JWT_SECRET

const router = express.Router()

//JWT Middleware réteg
const authenticationToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if(!token)
        return res.status(401).json({success: false, error: "Bejelentkezés szükséges!"})
    
    jwt.verify(token, jwt_secretKey, (err, decoded) => {
        if(err)
            return res.status(403).json({success: false, error: "Érvénytelen vagy lejárt token!"})

        res.user = decoded
        next()
    })
}

//Routes
//Regisztráció Menedzserként (Boltot is felvesszük)
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

//Regisztráció alkalmazottnak -> Csak a Menedzser(ek) tudják ezt elérni!!
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
            const hashedPass = await bcrypt.hash(dob, 10);
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
                        @Password, @Name, @Email, @Phone, @DoB, GETDATE(), @Salary, 1);
                    
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

//Belépés a fiókban
router.post('/Login', async (req, res) => {
    try{
        const {email, password} = req.body
        const emailFormatted = email.toLowerCase().trim()

        const pool = await sql.connect(config)

        const user = await pool.request()
            .input('Email', mssql.NVarChar, emailFormatted)
            .query(`SELECT TOP 1 Email, Password, AuthLv, FirstLogin FROM Employee
                WHERE Email = @Email`).recordset
        
        const storedPass = user.Password.toString()
        const matches = await bcrypt.compare(password, storedPass);

        if(user && matches){
            const tokenInfo = {
                UserId: user.Id,
                AuthLv: user.AuthLv,
                Email: user.Email
            }

            const token = jwt.sign(tokenInfo, jwt_secretKey, {expiresIn: '2h'})

            res.status(200).json({
                success: true,
                message: "Sikeres bejelentkezés!",
                token: token,
                user: {
                    Id: user.Id,
                    AuthLv: user.AuthLv,
                    FirstLogin: user.FirstLogin
                }
            })
        }
        else{
            res.status(401).json({success: false, error: "Hibás email vagy jelszó!"})
        }
    }
    catch(err){
        res.status(500).json({success: false, error: "Szerver hiba történt!"})
    }
    finally{
        if (pool) await pool.close()
    }
})

//Ha első alkalommal lép be egy alkalmazott, ez a route szolgál a változtatásra.
//NEM LEHET HASZNÁLNI ÁLTALÁNOS JELSZÓ VÁLTOZTATÁSRA!!
router.patch('/FirstLogin', authenticationToken, async (req, res) => {
    try{
        const {newPassword} = req.body
        const userId = req.user.Id

        const hashedPass = await bcrypt.hash(newPassword, 10);
        const bufferedPass = Buffer.from(hashedPass);

        const pool = await sql.connect(config)

        await pool.request()
            .input('Id', mssql.Int, userId)
            .input('NewPassword', mssql.VarBinary, bufferedPass)
            .query(`
                UPDATE Employee 
                SET Password = @NewPassword, 
                    FirstLogin = 0
                WHERE Id = @Id
            `)

        res.status(200).json({success: true, message: "Jelszó módosítva!"})
    }
    catch(err){
        res.status(500).json({success: false, error: "Szerver hiba történt!"})
    }
    finally{
        if (pool) await pool.close()
    }
})

//Általános jelszó változtatás fiókokra
router.patch('/UpdatePassword', authenticationToken, async (req, res) => {
    try{
        const {newPassword} = req.body
        const userId = req.user.Id

        const hashedPass = await bcrypt.hash(newPassword, 10);
        const bufferedPass = Buffer.from(hashedPass);

        const pool = await sql.connect(config)

        await pool.request()
            .input('Id', mssql.Int, userId)
            .input('NewPassword', mssql.VarBinary, bufferedPass)
            .query(`
                UPDATE Employee 
                SET Password = @NewPassword,
                    FirstLogin = CASE WHEN FirstLogin = 1 THEN 0 ELSE FirstLogin END
                WHERE Id = @Id
            `)

        res.status(200).json({success: true, message: "Jelszó módosítva!"})
    }
    catch(err){
        res.status(500).json({success: false, error: "Szerver hiba történt!"})
    }
    finally{
        if (pool) await pool.close()
    }
})