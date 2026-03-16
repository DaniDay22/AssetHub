//Csomagokat behozzuk
const express = require('express')
const mssql = require('mssql')
const config = require('../config')
const jwt = require('jsonwebtoken')

const jwt_secretKey = process.env.JWT_SECRET

const router = express.Router()

//JWT Middleware réteg
//
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

router.get('/History', authenticationToken, async (req, res) => {
    let pool;
    try {
        const { AuthLv, UserId } = req.user;

        // Check permissions
        if (AuthLv > 4) {
            return res.status(403).json({ success: false, error: "Ehhez a művelethez nincs jogosultságod!!" });
        }

        pool = await mssql.connect(config);

        // Clean, simple query. No confusing date filters.
        // The ORDER BY Sales.TimeSold DESC guarantees newest is on top.
        const result = await pool.request()
            .input('UserId', mssql.Int, UserId)
            .query(`
                SELECT 
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
                WHERE Employee.StoreId = (SELECT StoreId FROM Employee WHERE Id = @UserId)
                ORDER BY Sales.TimeSold DESC
            `);

        res.status(200).json({ success: true, data: result.recordset });
    } catch(err) {
        console.error("History Fetch Error:", err); // Added this so you can see if SQL fails!
        res.status(500).json({ success: false, error: "Szerver hiba történt!" });
    } finally {
        if (pool) await pool.close();
    }
});

router.get('/Inventory', authenticationToken, async (req, res) => {
    let pool;
    try {
        pool = await mssql.connect(config);
        const result = await pool.request()
            .input('UserId', mssql.Int, req.user.UserId)
            .query(`
                SELECT 
                    si.Id as InventoryId, 
                    si.Stock,
                    si.Price, -- Explicitly taking Price from StoreInventory
                    p.Name, 
                    p.Brand
                FROM StoreInventory si
                LEFT JOIN Product p ON si.ProductId = p.Id
                WHERE si.StoreId = (SELECT StoreId FROM Employee WHERE Id = @UserId)
                AND si.Stock > 0 
                ORDER BY p.Brand, p.Name
            `);

        res.status(200).json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Inventory Fetch Error:", err); // This is what showed us the 'Price' error!
        res.status(500).json({ success: false, error: "Hiba a termékek betöltésekor!" });
    } finally {
        if (pool) await pool.close();
    }
});

// POST: Register a new sale
router.post('/Add', authenticationToken, async (req, res) => {
    let pool;
    try {
        const { inventoryId, quantity, paymentMethod } = req.body;
        const employeeId = req.user.UserId;

        pool = await mssql.connect(config);

        // 1. Get the current price and stock (Using 'Stock' instead of 'Quantity')
        const itemRes = await pool.request()
            .input('InventoryId', mssql.Int, inventoryId)
            .query(`SELECT Price, Stock FROM StoreInventory WHERE Id = @InventoryId`);

        if (itemRes.recordset.length === 0) {
            return res.status(404).json({ success: false, error: "Termék nem található!" });
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
    } finally {
        if (pool) await pool.close();
    }
});

//WTF IS THIS SUPPOSED TO BE??!!??!??!??!??!??!??!??!??!??!??!??!??!??!??!??!??!?!
/*
router.get('/Historyidk?', authenticationToken, async (req, res) => {
    try{
        const {AuthLv, UserId} = req.user
        // Query paraméterek: ?startDate=2023-10-01&endDate=2023-10-31
        let { startDate, endDate } = req.query;
        
        if (AuthLv > 4) {
            return res.status(403).json({ success: false, error: "Ehhez a művelethez nincs jogosultságod!!" });
        }
        
        if (!startDate) {
            startDate = new Date().toISOString().split('T')[0]; // Csak a dátum rész: YYYY-MM-DD
        }
        if (!endDate) {
            endDate = startDate; // Ugyanaz a nap
        }
        
        const pool = await mssql.connect(config)

        const result = pool.request()
            .input('UserId', mssql.Int, UserId)
            .input('StartDate', mssql.Date, startDate)
            .input('EndDate', mssql.Date, endDate)
            .query(`
            SELECT 
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
            WHERE Employee.StoreId = (SELECT StoreId FROM Employee WHERE Id = @UserId)
            AND Sales.TimeSold BETWEEN @StartDate AND @EndDate 
                ORDER BY Sales.TimeSold DESC
                `)
                
                res.status(200).json({ success: true, data: result.recordset });
    }
    catch(err){
        res.status(500).json({success: true, message: "Szerver hiba történt!"})
    }
    finally{
        if (pool) await pool.close()
    }
    })
*/ 
module.exports = router
