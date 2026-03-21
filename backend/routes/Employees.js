require('dotenv')
const express = require('express')
const mssql = require('mssql')
const config = require('../config')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const jwt_secretKey = process.env.JWT_SECRET

const router = express.Router()

const authenticationToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if(!token)
        return res.status(401).json({success: false, error: "Bejelentkezés szükséges!"})
    
    jwt.verify(token, jwt_secretKey, (err, decoded) => {
        if(err)
            return res.status(403).json({success: false, error: "Érvénytelen vagy lejárt token!"})

        //Ha minden oké, akkor adjuk át a dekódolt adatokat és mehet tovább
        req.user = decoded
        next()
    })
}

// GET: Fetch all employees for the user's store
router.get('/List', authenticationToken, async (req, res) => {
    let pool;
    try {
        const { UserId, AuthLv } = req.user;

        // Optional: Only allow Admins/Managers (AuthLv 1-3) to see the full list
        if (AuthLv > 3) {
            return res.status(403).json({ success: false, error: "Nincs jogosultságod a dolgozók listázásához!" });
        }

        pool = await mssql.connect(config);
        
        const result = await pool.request()
            .input('UserId', mssql.Int, UserId)
            .query(`
                SELECT 
                    Id, 
                    Name, 
                    Email, 
                    AuthLv,
                    Phone,   
                    DoB,    
                    Salary,
                    -- We fetch the Store name too just for the UI
                    StoreName = (SELECT Name FROM Store WHERE Id = Employee.StoreId)
                FROM Employee
                WHERE StoreId = (SELECT StoreId FROM Employee WHERE Id = @UserId)
                AND IsActive = 1
                ORDER BY Name ASC
            `);

        res.status(200).json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, error: "Szerver hiba a lekérdezéskor!" });
    } finally {
        if (pool) await pool.close();
    }
});

// POST: Add a new employee to your store
router.post('/Add', authenticationToken, async (req, res) => {
    let pool;
    try {
        // 1. We now grab the new fields from req.body
        const { name, email, password, authLv, phone, doB, salary } = req.body;
        const creatorId = req.user.UserId;
        const creatorAuthLv = req.user.AuthLv;

        if (creatorAuthLv > 2) {
            return res.status(403).json({ success: false, error: "Nincs jogosultságod!" });
        }

        // 2. Updated validation to require Phone and DoB
        if (!name || !email || !password || !authLv || !phone || !doB) {
            return res.status(400).json({ success: false, error: "Minden kötelező mezőt ki kell tölteni!" });
        }

        pool = await mssql.connect(config);

        const emailCheck = await pool.request()
            .input('Email', mssql.NVarChar, email.toLowerCase().trim())
            .query(`SELECT Id FROM Employee WHERE Email = @Email`);
        
        if (emailCheck.recordset.length > 0) {
            return res.status(400).json({ success: false, error: "Ezzel az email címmel már regisztráltak!" });
        }

        const hashedPass = await bcrypt.hash(password, 10);
        const bufferedPass = Buffer.from(hashedPass);

        // 3. The grand insertion with all the new columns!
        await pool.request()
            .input('Name', mssql.NVarChar, name)
            .input('Email', mssql.NVarChar, email.toLowerCase().trim())
            .input('Password', mssql.VarBinary, bufferedPass)
            .input('AuthLv', mssql.Int, authLv)
            .input('Phone', mssql.NVarChar, phone)
            .input('DoB', mssql.Date, doB) // Expects YYYY-MM-DD
            .input('Salary', mssql.Int, salary ? parseInt(salary) : null) // Salary is optional
            .input('CreatorId', mssql.Int, creatorId)
            .query(`
                DECLARE @MyStoreId INT = (SELECT StoreId FROM Employee WHERE Id = @MyId);
                DECLARE @MyFranchiseId INT = (SELECT FranchiseId FROM Employee WHERE Id = @MyId);

                INSERT INTO Employee (Name, Email, Password, AuthLv, StoreId, Phone, DoB, HiredAt, Salary, FranchiseId)
                VALUES (
                    @Name, 
                    @Email, 
                    @Password, 
                    @AuthLv, 
                    (SELECT StoreId FROM Employee WHERE Id = @CreatorId),
                    @Phone,
                    @DoB,
                    GETDATE(), -- Automatically sets the HiredAt timestamp
                    @Salary,
                    @MyFranchiseId -- New employees get the same FranchiseId as their creator
                )
            `);

        res.status(200).json({ success: true, message: "Dolgozó sikeresen hozzáadva!" });
    } catch (err) {
        console.error("Create Employee Error:", err);
        res.status(500).json({ success: false, error: "Szerver hiba történt!" });
    } finally {
        if (pool) await pool.close();
    }
});

// DELETE: Remove an employee
router.put('/:id', authenticationToken, async (req, res) => {
    let pool;
    try {
        const targetId = req.params.id;
        const myId = req.user.UserId;

        // Safety: You can't fire yourself!
        if (targetId == myId) {
            return res.status(400).json({ success: false, error: "Nem törölheted a saját fiókodat!" });
        }

        if (req.user.AuthLv > 2) {
            return res.status(403).json({ success: false, error: "Nincs jogosultságod!" });
        }

        pool = await mssql.connect(config);

        // Try to delete them (ensuring they belong to the same store)
        await pool.request()
            .input('TargetId', mssql.Int, targetId)
            .input('MyId', mssql.Int, myId)
            .query(`
                UPDATE Employee 
                SET IsActive = 0 
                WHERE Id = @TargetId 
                AND StoreId = (SELECT StoreId FROM Employee WHERE Id = @MyId)
            `);

        res.status(200).json({ success: true });
    } catch (err) {
        // SQL Error 547 means Foreign Key Constraint (they have made sales, so you can't hard-delete them)
        if (err.number === 547) {
            res.status(400).json({ success: false, error: "Nem törölheted, mert már rögzített eladásokat!" });
        } else {
            res.status(500).json({ success: false, error: "Szerver hiba!" });
        }
    } finally {
        if (pool) await pool.close();
    }
});

// PUT: Update an existing employee
router.put('/:id', authenticationToken, async (req, res) => {
    let pool;
    try {
        const targetId = req.params.id;
        const myId = req.user.UserId;
        const myAuthLv = req.user.AuthLv;
        const { name, email, authLv, phone, doB, salary } = req.body;

        // Security: Only Admins (1) or Managers (2) can edit
        if (myAuthLv > 2) {
            return res.status(403).json({ success: false, error: "Nincs jogosultságod!" });
        }

        if (!name || !email || !authLv || !phone || !doB) {
            return res.status(400).json({ success: false, error: "Minden kötelező mezőt ki kell tölteni!" });
        }

        pool = await mssql.connect(config);

        // Make sure the new email isn't already taken by SOMEONE ELSE
        const emailCheck = await pool.request()
            .input('Email', mssql.NVarChar, email.toLowerCase().trim())
            .input('TargetId', mssql.Int, targetId)
            .query(`SELECT Id FROM Employee WHERE Email = @Email AND Id != @TargetId`);
        
        if (emailCheck.recordset.length > 0) {
            return res.status(400).json({ success: false, error: "Ez az email cím már foglalt!" });
        }

        // Update the employee (ensuring they belong to the manager's store!)
        await pool.request()
            .input('TargetId', mssql.Int, targetId)
            .input('MyId', mssql.Int, myId)
            .input('Name', mssql.NVarChar, name)
            .input('Email', mssql.NVarChar, email.toLowerCase().trim())
            .input('AuthLv', mssql.Int, authLv)
            .input('Phone', mssql.NVarChar, phone)
            .input('DoB', mssql.Date, doB)
            .input('Salary', mssql.Int, salary ? parseInt(salary) : null)
            .query(`
                UPDATE Employee 
                SET Name = @Name, Email = @Email, AuthLv = @AuthLv, 
                    Phone = @Phone, DoB = @DoB, Salary = @Salary
                WHERE Id = @TargetId 
                AND StoreId = (SELECT StoreId FROM Employee WHERE Id = @MyId)
            `);

        res.status(200).json({ success: true, message: "Adatok frissítve!" });
    } catch (err) {
        console.error("Update Employee Error:", err);
        res.status(500).json({ success: false, error: "Szerver hiba!" });
    } finally {
        if (pool) await pool.close();
    }
});

module.exports = router;