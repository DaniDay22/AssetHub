const express = require('express');
const mssql = require('mssql');
const config = require('../config');
const jwt = require('jsonwebtoken');

const jwt_secretKey = process.env.JWT_SECRET;
const router = express.Router();

const authenticationToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if(!token) return res.status(401).json({success: false, error: "Bejelentkezés szükséges!"});
    
    jwt.verify(token, jwt_secretKey, (err, decoded) => {
        if(err) return res.status(403).json({success: false, error: "Érvénytelen vagy lejárt token!"});
        req.user = decoded;
        next();
    });
};

// GET: List all stores for this franchise
router.get('/List', authenticationToken, async (req, res) => {
    try {
        const { AuthLv, FranchiseId } = req.user;

        // Security: Only Owners (1) and Managers (2) can manage stores
        if (AuthLv > 2) {
            return res.status(403).json({ success: false, error: "Ehhez a művelethez nincs jogosultságod!" });
        }

        const pool = await mssql.connect(config);
        
        // We include a subquery to count employees at each store!
        const result = await pool.request()
            .input('FranchiseId', mssql.Int, FranchiseId)
            .query(`
                SELECT 
                    Id, 
                    Name, 
                    Address,
                    (SELECT COUNT(Id) FROM Employee WHERE StoreId = Store.Id) AS EmployeeCount
                FROM Store 
                WHERE FranchiseId = @FranchiseId
                ORDER BY Name ASC
            `);

        res.status(200).json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Store Fetch Error:", err);
        res.status(500).json({ success: false, error: "Szerver hiba történt a boltok betöltésekor!" });
    }
});

// POST: Add a new store
router.post('/Add', authenticationToken, async (req, res) => {
    try {
        const { AuthLv, FranchiseId } = req.user;
        const { name, address } = req.body;

        if (AuthLv > 2) return res.status(403).json({ success: false, error: "Nincs jogosultságod!" });
        if (!name || !address) return res.status(400).json({ success: false, error: "Minden mező kitöltése kötelező!" });

        const pool = await mssql.connect(config);

        await pool.request()
            .input('Name', mssql.NVarChar, name)
            .input('Address', mssql.NVarChar, address)
            .input('FranchiseId', mssql.Int, FranchiseId)
            .query(`
                INSERT INTO Store (Name, Address, FranchiseId) 
                VALUES (@Name, @Address, @FranchiseId)
            `);

        res.status(200).json({ success: true, message: "Bolt sikeresen hozzáadva!" });
    } catch (err) {
        console.error("Store Add Error:", err);
        res.status(500).json({ success: false, error: "Hiba a bolt mentésekor!" });
    }
});

// PUT: Edit an existing store
router.put('/:id', authenticationToken, async (req, res) => {
    try {
        const { AuthLv, FranchiseId } = req.user;
        const { name, address } = req.body;
        const storeId = req.params.id;

        if (AuthLv > 2) return res.status(403).json({ success: false, error: "Nincs jogosultságod!" });

        const pool = await mssql.connect(config);

        // Security: Ensure this store actually belongs to their franchise!
        const check = await pool.request()
            .input('StoreId', mssql.Int, storeId)
            .input('FranchiseId', mssql.Int, FranchiseId)
            .query(`SELECT Id FROM Store WHERE Id = @StoreId AND FranchiseId = @FranchiseId`);
            
        if (check.recordset.length === 0) {
            return res.status(403).json({ success: false, error: "Érvénytelen bolt azonosító!" });
        }

        await pool.request()
            .input('Name', mssql.NVarChar, name)
            .input('Address', mssql.NVarChar, address)
            .input('StoreId', mssql.Int, storeId)
            .query(`UPDATE Store SET Name = @Name, Address = @Address WHERE Id = @StoreId`);

        res.status(200).json({ success: true, message: "Bolt frissítve!" });
    } catch (err) {
        console.error("Store Edit Error:", err);
        res.status(500).json({ success: false, error: "Hiba a frissítéskor!" });
    }
});

module.exports = router;