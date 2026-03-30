const express = require('express');
const mssql = require('mssql');
const config = require('../config');
const jwt = require('jsonwebtoken');

const jwt_secretKey = process.env.JWT_SECRET;
const router = express.Router();

const authenticationToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token)
        return res.status(401).json({ success: false, error: "Bejelentkezés szükséges!" });

    jwt.verify(token, jwt_secretKey, (err, decoded) => {
        if (err)
            return res.status(403).json({ success: false, error: "Érvénytelen vagy lejárt token!" });
        req.user = decoded;
        next();
    });
};

// GET: Lekéri egy adott bolt eladási történetét...
router.get('/History', authenticationToken, async (req, res) => {
    // ... (Your existing History logic remains completely unchanged)
    try {
        const { AuthLv, FranchiseId, StoreId } = req.user;

        if (AuthLv > 4) {
            return res.status(403).json({ success: false, error: "Ehhez a művelethez nincs jogosultságod!!" });
        }

        const targetStoreId = req.query.storeId ? parseInt(req.query.storeId) : StoreId;
        const { startDate, endDate } = req.query;
        const pool = await mssql.connect(config);

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

        if (startDate && endDate) {
            queryStr += ` AND CAST(Sales.TimeSold AS DATE) BETWEEN @StartDate AND @EndDate`;
            request.input('StartDate', mssql.Date, startDate);
            request.input('EndDate', mssql.Date, endDate);
        }

        queryStr += ` ORDER BY Sales.TimeSold DESC`;

        const result = await request.query(queryStr);
        res.status(200).json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("History Fetch Error:", err);
        res.status(500).json({ success: false, error: "Szerver hiba történt!" });
    }
});

// GET: Lekéri egy adott bolt aktuális készletét...
router.get('/Inventory', authenticationToken, async (req, res) => {
    // ... (Your existing Inventory logic remains completely unchanged)
    try {
        const { FranchiseId, StoreId } = req.user;
        const targetStoreId = req.query.storeId ? parseInt(req.query.storeId) : StoreId;
        const pool = await mssql.connect(config);

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

// POST: Rögzít TÖBB eladást egyszerre (Kosár rendszer)
router.post('/Add', authenticationToken, async (req, res) => {
    let pool;
    let transaction;
    try {
        // A frontend most egy "items" tömböt küld, ami a kosár tartalmát jelenti.
        const { items, paymentMethod } = req.body;
        const employeeId = req.user.UserId;
        const myFranchiseId = req.user.FranchiseId;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, error: "A kosár üres!" });
        }

        pool = await mssql.connect(config);
        
        // 1. Megnyitjuk a tranzakciót. Ha a ciklusban BÁRMI elromlik (pl. elfogy a kóla), 
        // a Transaction visszavon mindent (Rollback), így nem lesz félig sikeres eladás a rendszerben.
        transaction = new mssql.Transaction(pool);
        await transaction.begin();

        for (const item of items) {
            const { inventoryId, quantity } = item;

            // 2. Ellenőrizzük a készletet és lekérjük az árat az aktuális termékre
            const itemReq = new mssql.Request(transaction);
            itemReq.input('InventoryId', mssql.Int, inventoryId);
            itemReq.input('MyFranchiseId', mssql.Int, myFranchiseId);
            
            const itemRes = await itemReq.query(`
                SELECT si.Price, si.Stock, p.Name
                FROM StoreInventory si
                INNER JOIN Store s ON si.StoreId = s.Id
                INNER JOIN Product p ON si.ProductId = p.Id
                WHERE si.Id = @InventoryId AND s.FranchiseId = @MyFranchiseId
            `);

            if (itemRes.recordset.length === 0) {
                throw new Error(`Érvénytelen termék a kosárban! (ID: ${inventoryId})`);
            }

            const { Price, Stock, Name } = itemRes.recordset[0];

            if (Stock < quantity) {
                // Ha ez a hiba lefut, a tranzakció megszakad!
                throw new Error(`Nincs elég készlet ebből: ${Name}! (Raktáron: ${Stock} db)`);
            }

            const totalPrice = Price * quantity;

            // 3. Rögzítjük a Sales táblában és levonjuk a készletből
            const insertReq = new mssql.Request(transaction);
            insertReq.input('InventoryId', mssql.Int, inventoryId);
            insertReq.input('EmployeeId', mssql.Int, employeeId);
            insertReq.input('Quantity', mssql.Int, quantity);
            insertReq.input('TotalPrice', mssql.Int, totalPrice);
            insertReq.input('PaymentMethod', mssql.NVarChar, paymentMethod);

            await insertReq.query(`
                INSERT INTO Sales (InventoryId, EmployeeId, TimeSold, Quantity, PriceAtSale, PaymentMethod, IsDeleted)
                VALUES (@InventoryId, @EmployeeId, GETDATE(), @Quantity, @TotalPrice, @PaymentMethod, 0);

                UPDATE StoreInventory 
                SET 
                    Stock = Stock - @Quantity, 
                    Sold = ISNULL(Sold, 0) + @Quantity  
                WHERE Id = @InventoryId;
            `);
        }

        // 4. Ha a ciklus minden terméken sikeresen végigment, véglegesítjük az egészet.
        await transaction.commit();
        res.status(200).json({ success: true });

    } catch (err) {
        // Ha bármi hiba volt, visszavonjuk a tranzakciót.
        if (transaction) await transaction.rollback().catch(() => {});
        console.error("Bulk Add Sale Error:", err);
        res.status(500).json({ success: false, error: err.message || "Szerver hiba történt!" });
    }
});

// DELETE: Töröl egy eladást...
router.delete('/:id', authenticationToken, async (req, res) => {
    // ... (Your existing Delete logic remains completely unchanged. It works perfectly with the new cart system because items are still saved as individual rows!)
    let pool;
    try {
        const saleId = req.params.id;
        const myFranchiseId = req.user.FranchiseId;

        pool = await mssql.connect(config);

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

        await pool.request()
            .input('SaleId', mssql.Int, saleId)
            .input('InventoryId', mssql.Int, InventoryId)
            .input('Quantity', mssql.Int, Quantity)
            .query(`
                BEGIN TRANSACTION;
                UPDATE StoreInventory SET Stock = Stock + @Quantity WHERE Id = @InventoryId;
                UPDATE Sales SET IsDeleted = 1 WHERE Id = @SaleId; 
                COMMIT TRANSACTION;
            `);

        res.status(200).json({ success: true, message: "Eladás törölve, készlet visszaállítva!" });
    } catch (err) {
        if (pool) await pool.request().query('IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION').catch(() => { });
        res.status(500).json({ success: false, error: "Szerver hiba történt az eladás törlésekor." });
    }
});

module.exports = router;