require('dotenv').config(); // <-- Make sure .config() is called if you rely on process.env here!
const express = require('express');
const mssql = require('mssql');
const config = require('../config');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const jwt_secretKey = process.env.JWT_SECRET;

const router = express.Router();

const authenticationToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if(!token)
        return res.status(401).json({success: false, error: "Bejelentkezés szükséges!"});
    
    jwt.verify(token, jwt_secretKey, (err, decoded) => {
        if(err)
            return res.status(403).json({success: false, error: "Érvénytelen vagy lejárt token!"});

        //Ha minden oké, akkor adjuk át a dekódolt adatokat és mehet tovább
        req.user = decoded;
        next();
    });
};

// GET: Fetch all stores belonging to the user's franchise
// FIX: Added 'authenticationToken' middleware here!
router.get('/my-stores', authenticationToken, async (req, res) => {
    let pool;
    try {
        pool = await mssql.connect(config);
        const result = await pool.request()
            .input('FranchiseId', mssql.Int, req.user.FranchiseId) 
            .query(`
                SELECT Id, Name, Address 
                FROM Store 
                WHERE FranchiseId = @FranchiseId
                ORDER BY Name ASC
            `);
            
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("My Stores Error:", err);
        res.status(500).json({ success: false, error: "Hiba a boltok betöltésekor!" });
    }  
});

// GET: Fetch all employees for the user's store
router.get('/List', authenticationToken, async (req, res) => {
    let pool;
    try {
        const { UserId, AuthLv, FranchiseId, StoreId } = req.user;

        if (AuthLv > 3) {
            return res.status(403).json({ success: false, error: "Nincs jogosultságod a dolgozók listázásához!" });
        }

        const targetStoreId = req.query.storeId ? parseInt(req.query.storeId) : StoreId;

        pool = await mssql.connect(config);

        const storeCheck = await pool.request()
            .input('TargetStoreId', mssql.Int, targetStoreId)
            .input('MyFranchiseId', mssql.Int, FranchiseId)
            .query(`SELECT Id FROM Store WHERE Id = @TargetStoreId AND FranchiseId = @MyFranchiseId`);

        if (storeCheck.recordset.length === 0) {
            return res.status(403).json({ success: false, error: "Nincs jogosultságod ehhez a bolthoz!" });
        }
        
        const result = await pool.request()
            .input('TargetStoreId', mssql.Int, targetStoreId)
            .query(`
                SELECT 
                    Id, Name, Email, AuthLv, Phone, DoB, Salary, Currency, StoreId, FranchiseId,
                    StoreName = (SELECT Name FROM Store WHERE Id = Employee.StoreId)
                FROM Employee
                WHERE StoreId = @TargetStoreId AND IsActive = 1
                ORDER BY AuthLv ASC, Name ASC
            `);

        res.status(200).json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("List Employees Error:", err);
        res.status(500).json({ success: false, error: "Szerver hiba a lekérdezéskor!" });
    }  
});

// POST: Add a new employee
router.post('/Add', authenticationToken, async (req, res) => {
    let pool;
    try {
        // FIX: Destructure 'storeId' from req.body too!
        const { name, email, password, authLv, phone, doB, salary, storeId } = req.body;
        const creatorId = req.user.UserId;
        const creatorAuthLv = req.user.AuthLv;

        if (creatorAuthLv > 2) {
            return res.status(403).json({ success: false, error: "Nincs jogosultságod!" });
        }

        if (!name || !email || !password || !authLv || !phone || !doB) {
            return res.status(400).json({ success: false, error: "Minden kötelező mezőt ki kell tölteni!" });
        }

        // Determine which store to put them in (fallback to creator's store if missing)
        const targetStoreId = storeId ? parseInt(storeId) : req.user.StoreId;

        pool = await mssql.connect(config);

        // Security: Ensure the target store actually belongs to this manager's franchise
        const storeCheck = await pool.request()
            .input('StoreId', mssql.Int, targetStoreId)
            .input('FranchiseId', mssql.Int, req.user.FranchiseId)
            .query(`SELECT Id FROM Store WHERE Id = @StoreId AND FranchiseId = @FranchiseId`);

        if (storeCheck.recordset.length === 0) {
            return res.status(403).json({ success: false, error: "Érvénytelen bolt!" });
        }

        const emailCheck = await pool.request()
            .input('Email', mssql.NVarChar, email.toLowerCase().trim())
            .query(`SELECT Id FROM Employee WHERE Email = @Email`);
        
        if (emailCheck.recordset.length > 0) {
            return res.status(400).json({ success: false, error: "Ezzel az email címmel már regisztráltak!" });
        }

        const hashedPass = await bcrypt.hash(password, 10);
        const bufferedPass = Buffer.from(hashedPass);

        await pool.request()
            .input('Name', mssql.NVarChar, name)
            .input('Email', mssql.NVarChar, email.toLowerCase().trim())
            .input('Password', mssql.VarBinary, bufferedPass)
            .input('AuthLv', mssql.Int, authLv)
            .input('Phone', mssql.NVarChar, phone)
            .input('DoB', mssql.Date, doB) 
            .input('Salary', mssql.Int, salary ? parseInt(salary) : null) 
            .input('StoreId', mssql.Int, targetStoreId) // Assign to specific store!
            .input('FranchiseId', mssql.Int, req.user.FranchiseId)
            .query(`
                INSERT INTO Employee (Name, Email, Password, AuthLv, StoreId, Phone, DoB, HiredAt, Salary, FranchiseId, Currency, IsActive)
                VALUES (@Name, @Email, @Password, @AuthLv, @StoreId, @Phone, @DoB, GETDATE(), @Salary, @FranchiseId, 'HUF', 1)
            `);

        res.status(200).json({ success: true, message: "Dolgozó sikeresen hozzáadva!" });
    } catch (err) {
        console.error("Create Employee Error:", err);
        res.status(500).json({ success: false, error: "Szerver hiba történt!" });
    }  
});

// DELETE: Remove an employee
// FIX: Changed from router.put to router.delete!
router.delete('/:id', authenticationToken, async (req, res) => {
    let pool;
    try {
        const targetId = req.params.id;
        const myId = req.user.UserId;

        if (targetId == myId) {
            return res.status(400).json({ success: false, error: "Nem törölheted a saját fiókodat!" });
        }

        if (req.user.AuthLv > 2) {
            return res.status(403).json({ success: false, error: "Nincs jogosultságod!" });
        }

        pool = await mssql.connect(config);

        await pool.request()
            .input('TargetId', mssql.Int, targetId)
            .input('MyFranchiseId', mssql.Int, req.user.FranchiseId)
            .query(`
                UPDATE Employee 
                SET IsActive = 0 
                WHERE Id = @TargetId 
                AND FranchiseId = @MyFranchiseId
            `);

        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ success: false, error: "Szerver hiba!" });
    }  
});

// PUT: Update an existing employee
router.put('/:id', authenticationToken, async (req, res) => {
    let pool;
    try {
        const targetId = req.params.id;
        const myAuthLv = req.user.AuthLv;
        const { name, email, authLv, phone, doB, salary } = req.body;

        if (myAuthLv > 2) {
            return res.status(403).json({ success: false, error: "Nincs jogosultságod!" });
        }

        if (!name || !email || !authLv || !phone || !doB) {
            return res.status(400).json({ success: false, error: "Minden kötelező mezőt ki kell tölteni!" });
        }

        pool = await mssql.connect(config);

        const emailCheck = await pool.request()
            .input('Email', mssql.NVarChar, email.toLowerCase().trim())
            .input('TargetId', mssql.Int, targetId)
            .query(`SELECT Id FROM Employee WHERE Email = @Email AND Id != @TargetId`);
        
        if (emailCheck.recordset.length > 0) {
            return res.status(400).json({ success: false, error: "Ez az email cím már foglalt!" });
        }

        await pool.request()
            .input('TargetId', mssql.Int, targetId)
            .input('MyFranchiseId', mssql.Int, req.user.FranchiseId)
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
                AND FranchiseId = @MyFranchiseId
            `);

        res.status(200).json({ success: true, message: "Adatok frissítve!" });
    } catch (err) {
        console.error("Update Employee Error:", err);
        res.status(500).json({ success: false, error: "Szerver hiba!" });
    }  
});

module.exports = router;