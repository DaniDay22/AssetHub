const express = require('express');
const mssql = require('mssql');
const config = require('../config');
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
        req.user = decoded;
        next();
    });
};

// GET: Lekéri egy adott bolt eladási történetét. A dolgozó csak a saját franchise-án belül, és csak a saját boltjához tartozó eladásokat láthatja (kivéve ha magasabb jogosultságú, akkor több bolthoz is láthat).
router.get('/History', authenticationToken, async (req, res) => {
    try {
        const { AuthLv, FranchiseId, StoreId } = req.user;

        if (AuthLv > 4) {
            return res.status(403).json({ success: false, error: "Ehhez a művelethez nincs jogosultságod!!" });
        }

        // Ha a frontend nem adott meg storeId-t, akkor használjuk a tokenben lévő StoreId-t. Ez biztosítja, hogy ha egy dolgozó nem ad meg storeId-t, akkor automatikusan a saját boltja eladásait fogja látni.
        const targetStoreId = req.query.storeId ? parseInt(req.query.storeId) : StoreId;
        
        // Ha a frontend nem adott meg dátumokat, akkor lekérjük az összes eladást. Ha megadott, akkor csak a megadott időszakra eső eladásokat.
        const { startDate, endDate } = req.query;

        const pool = await mssql.connect(config);

        // SECURITY: Megnézzük, hogy a megadott storeId valóban a saját franchise-unkhoz tartozik-e. Ez megakadályozza, hogy egy dolgozó más franchise-hoz tartozó bolt eladásait lássa.
        const storeCheck = await pool.request()
            .input('TargetStoreId', mssql.Int, targetStoreId)
            .input('MyFranchiseId', mssql.Int, FranchiseId)
            .query(`SELECT Id FROM Store WHERE Id = @TargetStoreId AND FranchiseId = @MyFranchiseId`);

        if (storeCheck.recordset.length === 0) {
            return res.status(403).json({ success: false, error: "Nincs jogosultságod ehhez a bolthoz!" });
        }

        let queryStr = `
            SELECT 
                Sales.Id,
                Sales.TimeSold, 
                Sales.Quantity, 
                Sales.PriceAtSale, 
                Sales.PaymentMethod,
                ProductName = Product.Name, 
                ProductBrand = Product.Brand,
                SellerName = Employee.Name, 
                CategoryName = ProductCategory.Name
            FROM Sales
            INNER JOIN StoreInventory ON Sales.InventoryId = StoreInventory.Id
            INNER JOIN Product ON StoreInventory.ProductId = Product.Id
            INNER JOIN ProductCategory ON Product.CategoryId = ProductCategory.Id
            INNER JOIN Employee ON Sales.EmployeeId = Employee.Id
            WHERE StoreInventory.StoreId = @TargetStoreId
            AND Sales.IsDeleted = 0
        `;

        const request = pool.request().input('TargetStoreId', mssql.Int, targetStoreId);

        // Ha a frontend megadta a startDate és endDate paramétereket, akkor szűrjük az eladásokat a megadott időszakra. 
        if (startDate && endDate) {
            queryStr += ` AND CAST(Sales.TimeSold AS DATE) BETWEEN @StartDate AND @EndDate`;
            request.input('StartDate', mssql.Date, startDate);
            request.input('EndDate', mssql.Date, endDate);
        }

        queryStr += ` ORDER BY Sales.TimeSold DESC`;

        const result = await request.query(queryStr);
        res.status(200).json({ success: true, data: result.recordset });
    } catch(err) {
        console.error("History Fetch Error:", err);
        res.status(500).json({ success: false, error: "Szerver hiba történt!" });
    }
});

// GET: Lekéri egy adott bolt aktuális készletét. A dolgozó csak a saját franchise-án belül, és csak a saját boltjához tartozó készletet láthatja (kivéve ha magasabb jogosultságú, akkor több bolthoz is láthat).
router.get('/Inventory', authenticationToken, async (req, res) => {
    try {
        const { FranchiseId, StoreId } = req.user;
        const targetStoreId = req.query.storeId ? parseInt(req.query.storeId) : StoreId;

        const pool = await mssql.connect(config);

        // SECURITY: Megnézzük, hogy a megadott storeId valóban a saját franchise-unkhoz tartozik-e. Ez megakadályozza, hogy egy dolgozó más franchise-hoz tartozó bolt készletét lássa.
        const storeCheck = await pool.request()
            .input('TargetStoreId', mssql.Int, targetStoreId)
            .input('MyFranchiseId', mssql.Int, FranchiseId)
            .query(`SELECT Id FROM Store WHERE Id = @TargetStoreId AND FranchiseId = @MyFranchiseId`);

        if (storeCheck.recordset.length === 0) {
            return res.status(403).json({ success: false, error: "Érvénytelen bolt!" });
        }

        const result = await pool.request()
            .input('TargetStoreId', mssql.Int, targetStoreId)
            .query(`
                SELECT 
                    si.Id as InventoryId, 
                    si.Stock,
                    si.Price,
                    p.Name, 
                    p.Brand
                FROM StoreInventory si
                LEFT JOIN Product p ON si.ProductId = p.Id
                WHERE si.StoreId = @TargetStoreId
                AND si.Stock > 0 
                ORDER BY p.Brand, p.Name
            `);

        res.status(200).json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Inventory Fetch Error:", err);
        res.status(500).json({ success: false, error: "Hiba a termékek betöltésekor!" });
    }
});

// POST: Rögzít egy új eladást. A dolgozó csak a saját franchise-án belül, és csak a saját boltjához tartozó eladásokat rögzítheti (kivéve ha magasabb jogosultságú, akkor több bolthoz is rögzíthet).
router.post('/Add', authenticationToken, async (req, res) => {
    let pool;
    try {
        const { inventoryId, quantity, paymentMethod } = req.body;
        const employeeId = req.user.UserId;
        const myFranchiseId = req.user.FranchiseId;

        pool = await mssql.connect(config);

        // Megnézzük, hogy a megadott inventoryId valóban egy olyan termék, ami a saját franchise-unkhoz tartozó boltban van, és lekérjük az árát és a készletét is. Ez megakadályozza, hogy egy dolgozó más franchise-hoz tartozó bolt termékét adja el.
        const itemRes = await pool.request()
            .input('InventoryId', mssql.Int, inventoryId)
            .input('MyFranchiseId', mssql.Int, myFranchiseId)
            .query(`
                SELECT si.Price, si.Stock 
                FROM StoreInventory si
                INNER JOIN Store s ON si.StoreId = s.Id
                WHERE si.Id = @InventoryId AND s.FranchiseId = @MyFranchiseId
            `);

        if (itemRes.recordset.length === 0) {
            return res.status(404).json({ success: false, error: "Termék nem található, vagy nincs jogosultságod!" });
        }

        const { Price, Stock } = itemRes.recordset[0];

        if (Stock < quantity) {
            return res.status(400).json({ success: false, error: "Nincs elég készlet!" });
        }

        // A transakcióban egyszerre rögzítjük az eladást és vonjuk le a készletet, hogy elkerüljük a versenyhelyzeteket.
        await pool.request()
            .input('InventoryId', mssql.Int, inventoryId)
            .input('EmployeeId', mssql.Int, employeeId)
            .input('Quantity', mssql.Int, quantity)
            .input('TotalPrice', mssql.Int, Price * quantity)
            .input('PaymentMethod', mssql.NVarChar, paymentMethod)
            .query(`
                BEGIN TRANSACTION;
                INSERT INTO Sales (InventoryId, EmployeeId, TimeSold, Quantity, PriceAtSale, PaymentMethod, IsDeleted)
                VALUES (@InventoryId, @EmployeeId, GETDATE(), @Quantity, @TotalPrice, @PaymentMethod, 0);

                UPDATE StoreInventory SET Stock = Stock - @Quantity WHERE Id = @InventoryId;
                COMMIT TRANSACTION;
            `);

        res.status(200).json({ success: true });
    } catch (err) {
        if (pool) await pool.request().query('IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION').catch(() => {});
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE: Töröl egy eladást (valójában csak érvényteleníti). A dolgozó csak a saját franchise-án belül, és csak a saját boltjához tartozó eladásokat törölheti (kivéve ha magasabb jogosultságú, akkor több bolthoz is törölhet).
router.delete('/:id', authenticationToken, async (req, res) => {
    let pool;
    try {
        const saleId = req.params.id;
        const myFranchiseId = req.user.FranchiseId;
        
        pool = await mssql.connect(config);

        // Megkeressük az eladást, és ellenőrizzük, hogy valóban a saját franchise-unkhoz tartozó boltban történt-e. Ez megakadályozza, hogy egy dolgozó más franchise-hoz tartozó bolt eladásait törölje.
        const saleCheck = await pool.request()
            .input('SaleId', mssql.Int, saleId)
            .input('MyFranchiseId', mssql.Int, myFranchiseId)
            .query(`
                SELECT Sales.InventoryId, Sales.Quantity 
                FROM Sales
                INNER JOIN StoreInventory ON Sales.InventoryId = StoreInventory.Id
                INNER JOIN Store ON StoreInventory.StoreId = Store.Id
                WHERE Sales.Id = @SaleId AND Store.FranchiseId = @MyFranchiseId
            `);

        if (saleCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, error: "Eladás nem található, vagy nincs jogosultságod törölni!" });
        }

        const { InventoryId, Quantity } = saleCheck.recordset[0];

        // A transakcióban egyszerre érvénytelenítjük az eladást és visszaállítjuk a készletet, hogy elkerüljük a versenyhelyzeteket.
        await pool.request()
            .input('SaleId', mssql.Int, saleId)
            .input('InventoryId', mssql.Int, InventoryId)
            .input('Quantity', mssql.Int, Quantity)
            .query(`
                BEGIN TRANSACTION;
                -- Put the items back on the shelf
                UPDATE StoreInventory SET Stock = Stock + @Quantity WHERE Id = @InventoryId;
                
                -- SOFT DELETE: Mark as voided instead of deleting the record entirely!
                UPDATE Sales SET IsDeleted = 1 WHERE Id = @SaleId; 
                COMMIT TRANSACTION;
            `);

        res.status(200).json({ success: true, message: "Eladás törölve, készlet visszaállítva!" });
    } catch (err) {
        if (pool) await pool.request().query('IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION').catch(() => {});
        console.error("Delete Sale Error:", err);
        res.status(500).json({ success: false, error: "Szerver hiba történt az eladás törlésekor." });
    }
});

module.exports = router;