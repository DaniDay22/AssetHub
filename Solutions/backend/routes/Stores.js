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

// GET: Listázza a franchise-hoz tartozó boltokat, rendezve név szerint. Minden bolthoz visszaadjuk a dolgozók számát is, hogy a frontend könnyen meg tudja jeleníteni ezt az információt a bolt listában.
router.get('/List', authenticationToken, async (req, res) => {
    try {
        const { AuthLv, FranchiseId } = req.user;

        // Security: Csak a franchise adminisztrátorok és tulajdonosok láthatják a boltok listáját, hogy egy dolgozó ne láthassa más franchise-hoz tartozó boltok adatait.
        if (AuthLv > 2) {
            return res.status(403).json({ success: false, error: "Ehhez a művelethez nincs jogosultságod!" });
        }

        const pool = await mssql.connect(config);
        
        // subquery-val lekérjük a dolgozók számát minden bolthoz, hogy ne kelljen külön lekérdezést futtatni minden bolt esetén. Ez optimalizálja a teljesítményt, különösen ha sok bolt van egy franchise-hoz tartozóan.
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

// POST: Új bolt hozzáadása
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

// PUT: Létező bolt szerkesztése.
router.put('/:id', authenticationToken, async (req, res) => {
    try {
        const { AuthLv, FranchiseId } = req.user;
        const { name, address } = req.body;
        const storeId = req.params.id;

        if (AuthLv > 2) return res.status(403).json({ success: false, error: "Nincs jogosultságod!" });

        const pool = await mssql.connect(config);

        // Security: Megbizonyosodunk arról, hogy a szerkeszteni kívánt bolt valóban a saját franchise-unkhoz tartozik, hogy egy dolgozó ne tudja más franchise-hoz tartozó boltok adatait módosítani.
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