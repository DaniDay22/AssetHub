//Csomagokat behozzuk
const express = require('express')
const mssql = require('mssql')
const config = require('../config')
const bcrypt = require('bcrypt')
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
    try{
        const {AuthLv, UserId} = req.user

        if (AuthLv > 4) {
            return res.status(403).json({ success: false, error: "Ehhez a művelethez nincs jogosultságod!!" });
        }

        const pool = await mssql.connect(config)

        const result = pool.request()
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

router.get('/History', authenticationToken, async (req, res) => {
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

