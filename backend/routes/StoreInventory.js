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

        const result = await pool.request()
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

            const result = await pool.request()
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
        const {PName, PCName, Brand, Unit, Price, Currency, Stock, Description} = req.body
        const {AuthLv, UserId} = req.user //Tokenből infó

        if(AuthLv == 4)
            return res.status(403).json({ success: false, error: "Ehhez a művelethez nincs jogosultságod!" });

        pool = await mssql.connect(config)

        await pool.request()
            .input('PName', mssql.NVarChar, PName)
            .input('Brand', mssql.NVarChar, Brand)
            .input('Unit', mssql.NVarChar, Unit)
            .input('PCName', mssql.NVarChar, PCName)
            .input('Price', mssql.Decimal, Price)
            .input('Currency', mssql.NVarChar, Currency)
            .input('Stock', mssql.Decimal, Stock)
            .input('Description', mssql.NVarChar, Description)
            .input('UserId', mssql.Int, UserId)
            .query(`
                DECLARE @CategoryId int;
                DECLARE @ProductId int;
                DECLARE @StoreId int;

                -- Megnézzük, hogy létezik-e ez a kategória a ProductCategory-ban (Transaction folyt. köv.)
                SET @CategoryId = (SELECT Id FROM ProductCategory WHERE Name = @PCName);

                -- Megnézzük, hogy létezik-e ez a sablon a Products-ban (Transaction folyt. köv.)
                SET @ProductId = (SELECT TOP 1 Id FROM Product
                    WHERE LOWER(Name) = LOWER(@PName) AND LOWER(Brand) = LOWER(@Brand)
                    AND LOWER(Unit) = LOWER(@Unit) AND CategoryId = @CategoryId)

                -- Kikeressük az alkalmazotthoz rendelt StoreId (Melyik boltnál dolgozik?)
                SET @StoreId = (SELECT StoreId FROM Employee WHERE Id = @UserId) 

                BEGIN TRANSACTION
                    BEGIN TRY
                        -- Ha még nincs ilyen kategória, akkor töltsük fel
                        IF @CategoryId IS NULL
                        BEGIN
                            INSERT INTO ProductCategory (Name) VALUES (@PCName)
                            SET @CategoryId = SCOPE_IDENTITY()  -- Elkérjük az új termék kategória Id-jét
                        END;
                        
                        -- Ha még nincs ilyen termék sablon, töltsük fel
                        IF @ProductId IS NULL
                        BEGIN
                            INSERT INTO Product (CategoryId, Name, Brand, Unit, Description) VALUES
                                (@CategoryId, @PName, @Brand, @Unit, @Description)
                            SET @ProductId = SCOPE_IDENTITY()  -- Elkérjük az új termék sablon Id-jét
                        END;

                        -- Feltöltjük a bolt idézőjeles raktárába a terméket
                        INSERT INTO StoreInventory (StoreId, ProductId, Price, Currency, Stock) VALUES
                        (@StoreId, @ProductId, @Price, @Currency, @Stock)
                        
                        COMMIT TRANSACTION;
                    END TRY;
                    BEGIN CATCH
                        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                        THROW;
                    END CATCH;
                `)

        res.status(201).json({success: true, message: "Termék sikeresen feltöltve!"})
    }
    catch(err){
        console.error("Fetch ERROR:", err)
        res.status(500).json({success: false, message: "Szerver hiba történt!"})
    }
    finally{
        if (pool) pool.close()
    }
})