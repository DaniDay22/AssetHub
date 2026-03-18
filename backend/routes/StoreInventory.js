//Csomagokat behozzuk
require('dotenv')
const express = require('express')
const mssql = require('mssql')
const config = require('../config')
const jwt = require('jsonwebtoken')
//ÚJ CSOMAG! Validátor (Előre megírt függvények pl.: Email formázásra, Bekért adat szűrésére, stb.)
const validator = require('validator')

const jwt_secretKey = process.env.JWT_SECRET

const router = express.Router()

const filter = /^[a-zA-Z áéíóöőúüűÁÉÍÓÖŐÚÜŰ]+$/ //Csak betűk (+ magyar betűk) és szóközöket lehet megadni

//JWT Middleware réteg
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

router.get('/All', authenticationToken, async (req, res) => {
    let pool;
    try{
        const {AuthLv, UserId} = req.user //Tokenből infó

        if(AuthLv == 4) //Még nem biztos hogy marad: Mindenki aki nem eladó letudja kérdezni
            return res.status(403).json({ success: false, error: "Ehhez a művelethez nincs jogosultságod!" });

        pool = await mssql.connect(config)

        const result = pool.request()
            .input('UserId', mssql.Int, UserId)
            .query(`
            SELECT
                P.Name,
                PC.Name,
                P.Brand,
                P.Unit,
                SI.Price,
                SI.Stock,
                SI.Sold
            FROM StoreInventory SI
            INNER JOIN Product P ON SI.ProductId = P.Id
            INNER JOIN ProductCategory PC ON P.CategoryId = PC.Id
            WHERE SI.StoreId = (SELECT StoreId FROM Employee WHERE Id = @UserId)
            ORDER BY P.Name ASC
            `)

        res.status(200).json({success: true, data: result.recordset})
    }
    catch(err){
        console.error("Fetch ERROR:", err)
        res.status(500).json({success: false, message: "Szerver hiba történt!"})
    }
    finally{
        if (pool) pool.close()
    }
})

//Szűrés termék név alapján
router.get('/:PName', authenticationToken, async (req, res) => {
    let pool;
    try{
        let PName = req.params.PName //Beírt adat
        const {AuthLv, UserId} = req.user //Tokenből infó

        if(AuthLv == 4) //Még nem biztos hogy marad: Mindenki aki nem eladó letudja kérdezni
            return res.status(403).json({ success: false, error: "Ehhez a művelethez nincs jogosultságod!" });

        PName = PName.trim()
        const inputValid = validator.matches(PName, filter) //Helyes-e amit a felhasználó beírt: nincs speciális karakter

        if(inputValid){
            pool = await mssql.connect(config)

            const result = pool.request()
                .input('UserId', mssql.Int, UserId)
                .input('PName', mssql.NVarChar, PName)
                .query(`
                SELECT
                    P.Name,
                    PC.Name,
                    P.Brand,
                    P.Unit,
                    SI.Price,
                    SI.Stock,
                    SI.Sold
                FROM StoreInventory SI
                INNER JOIN Product P ON SI.ProductId = P.Id
                INNER JOIN ProductCategory PC ON P.CategoryId = PC.Id
                WHERE SI.StoreId = (SELECT StoreId FROM Employee WHERE Id = @UserId)
                AND P.Name LIKE @PName + '%'
                ORDER BY P.Name ASC
                `)

            res.status(200).json({success: true, data: result.recordset})
        }

        res.status(401).json({success: false, message: "Nem lehet speciális karakter a kérésben!"})
    }
    catch(err){
        console.error("Fetch ERROR:", err)
        res.status(500).json({success: false, message: "Szerver hiba történt!"})
    }
    finally{
        if (pool) pool.close()
    }
})

router.post('/', authenticationToken, async (req, res) => {
    let pool;
    try{
        const {PName, PCName, Brand, Unit, Price, Stock, Description} = req.body
        const {AuthLv, UserId} = req.user //Tokenből infó

        if(AuthLv == 4)
            return res.status(403).json({ success: false, error: "Ehhez a művelethez nincs jogosultságod!" });

        pool = await mssql.connect(config)

        const templateExists = pool.request()
            .input('PName', mssql.NVarChar, PName.toLowerCase())
            .input('Brand', mssql.NVarChar, Brand.toLowerCase())
            .input('Unit', mssql.NVarChar, Unit.toLowerCase())
            .input('PCName', mssql.NVarChar, PCName.toLowerCase())
            .query(`
                DECLARE @Template TABLE (
                    Name nvarchar(100),
                    CategoryId int,
                    Brand nvarchar(50),
                    Unit nvarchar(10)
                )
                DECLARE inCategoryId = (SELECT Id FROM ProductCategory WHERE Name = @PCName)

                -- Megnézzük, hogy létezik-e ez a sablon a Products-ban
                INSERT INTO @Template (Name, CategoryId, Brand, Unit)
                SELECT TOP 1
                    Name,
                    CategoryId,
                    Brand,
                    Unit
                FROM Product
                WHERE LOWER(Name) = @PName AND LOWER(Brand) = @Brand AND LOWER(Unit) = @Unit
                AND CategoryId = @inCategoryId

                IF EXISTS (SELECT 1 )
                `)
    }
    catch(err){
        console.error("Fetch ERROR:", err)
        res.status(500).json({success: false, message: "Szerver hiba történt!"})
    }
    finally{
        if (pool) pool.close()
    }
})