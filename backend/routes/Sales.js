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

// GET: Fetch Sales History (Now supports Multi-Store AND Date Filtering!)
router.get('/History', authenticationToken, async (req, res) => {
    try {
        const { AuthLv, FranchiseId, StoreId } = req.user;

        if (AuthLv > 4) {
            return res.status(403).json({ success: false, error: "Ehhez a művelethez nincs jogosultságod!!" });
        }

        // Determine target store (fallback to user's home store)
        const targetStoreId = req.query.storeId ? parseInt(req.query.storeId) : StoreId;
        
        // Grab optional date filters from the URL
        const { startDate, endDate } = req.query;

        const pool = await mssql.connect(config);

        // SECURITY: Verify the requested store belongs to their franchise
        const storeCheck = await pool.request()
            .input('TargetStoreId', mssql.Int, targetStoreId)
            .input('MyFranchiseId', mssql.Int, FranchiseId)
            .query(`SELECT Id FROM Store WHERE Id = @TargetStoreId AND FranchiseId = @MyFranchiseId`);

        if (storeCheck.recordset.length === 0) {
            return res.status(403).json({ success: false, error: "Nincs jogosultságod ehhez a bolthoz!" });
        }

        // Build the query dynamically
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

        // If the frontend passed dates, add the filter! (Resolves the "WTF" route)
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

// GET: Fetch Inventory for the Cash Register
router.get('/Inventory', authenticationToken, async (req, res) => {
    try {
        const { FranchiseId, StoreId } = req.user;
        const targetStoreId = req.query.storeId ? parseInt(req.query.storeId) : StoreId;

        const pool = await mssql.connect(config);

        // SECURITY: Verify store ownership
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

// POST: Register a new sale
router.post('/Add', authenticationToken, async (req, res) => {
    let pool;
    try {
        const { inventoryId, quantity, paymentMethod } = req.body;
        const employeeId = req.user.UserId;
        const myFranchiseId = req.user.FranchiseId;

        pool = await mssql.connect(config);

        // 1. Get current price, stock, AND verify the item belongs to their franchise!
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

        // 2. The Transaction
        await pool.request()
            .input('InventoryId', mssql.Int, inventoryId)
            .input('EmployeeId', mssql.Int, employeeId)
            .input('Quantity', mssql.Int, quantity)
            .input('TotalPrice', mssql.Int, Price * quantity)
            .input('PaymentMethod', mssql.NVarChar, paymentMethod)
            .query(`
                BEGIN TRANSACTION;
                INSERT INTO Sales (InventoryId, EmployeeId, TimeSold, Quantity, PriceAtSale, PaymentMethod)
                VALUES (@InventoryId, @EmployeeId, GETDATE(), @Quantity, @TotalPrice, @PaymentMethod);

                UPDATE StoreInventory SET Stock = Stock - @Quantity WHERE Id = @InventoryId;
                COMMIT TRANSACTION;
            `);

        res.status(200).json({ success: true });
    } catch (err) {
        if (pool) await pool.request().query('ROLLBACK TRANSACTION').catch(() => {});
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE: Void a sale and return stock to inventory
router.delete('/:id', authenticationToken, async (req, res) => {
    let pool;
    try {
        const saleId = req.params.id;
        const myFranchiseId = req.user.FranchiseId;
        
        pool = await mssql.connect(config);

        // 1. Find the sale AND verify it happened in a store owned by their franchise
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

        if (saleCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, error: "Eladás nem található, vagy nincs jogosultságod törölni!" });
        }

        const { InventoryId, Quantity } = saleCheck.recordset[0];

        // 2. Delete the sale AND return the stock in one atomic transaction
        await pool.request()
            .input('SaleId', mssql.Int, saleId)
            .input('InventoryId', mssql.Int, InventoryId)
            .input('Quantity', mssql.Int, Quantity)
            .query(`
                BEGIN TRANSACTION;
                UPDATE StoreInventory SET Stock = Stock + @Quantity WHERE Id = @InventoryId;
                DELETE FROM Sales WHERE Id = @SaleId;
                COMMIT TRANSACTION;
            `);

        res.status(200).json({ success: true, message: "Eladás törölve, készlet visszaállítva!" });
    } catch (err) {
        if (pool) await pool.request().query('ROLLBACK TRANSACTION').catch(() => {});
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;