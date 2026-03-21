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
                SI.Id,
                P.Name,
                PC.Name,
                P.Brand,
                P.Unit,
                SI.Price,
                SI.Stock,
                SI.Sold,
                SI.Description
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
                            INSERT INTO Product (CategoryId, Name, Brand, Unit) VALUES
                                (@CategoryId, @PName, @Brand, @Unit)
                            SET @ProductId = SCOPE_IDENTITY()  -- Elkérjük az új termék sablon Id-jét
                        END;

                        -- Feltöltjük a bolt idézőjeles raktárába a terméket
                        INSERT INTO StoreInventory (StoreId, ProductId, Price, Currency, Stock, Description) VALUES
                        (@StoreId, @ProductId, @Price, @Currency, @Stock, @Description)
                        
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

router.put('/', authenticationToken, async (req, res) => {
    let pool;
    try{
        const {StoreInvId, ProductId, PName, PCName, Brand, Unit, Price, Currency, Stock, Description} = req.body
        const {AuthLv} = req.user //Tokenből infó

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
            .input('currentProductId', mssql.Int, ProductId)
            .input('StoreInventoryId', mssql.Int, StoreInvId)
            .query(`
                DECLARE @CategoryId int;
                DECLARE @ProductId int;

                -- Megnézzük, hogy létezik-e ez a kategória a ProductCategory-ban (Transaction folyt. köv.)
                SET @CategoryId = (SELECT Id FROM ProductCategory WHERE Name = @PCName);

                BEGIN TRANSACTION
                    BEGIN TRY
                        -- Ha még nincs ilyen kategória, akkor töltsük fel
                        IF @CategoryId IS NULL
                        BEGIN
                            INSERT INTO ProductCategory (Name) VALUES (@PCName)
                            SET @CategoryId = SCOPE_IDENTITY()  -- Elkérjük az új termék kategória Id-jét
                        END;

                        -- Megnézzük, hogy létezik-e ez a sablon a Products-ban
                        -- Ezuttal már a CategoryId újra beillesztése után, ha megtörtént
                        SET @ProductId = (SELECT TOP 1 Id FROM Product
                            WHERE LOWER(Name) = LOWER(@PName) AND LOWER(Brand) = LOWER(@Brand)
                            AND LOWER(Unit) = LOWER(@Unit) AND CategoryId = @CategoryId)
                        
                        -- Ha még nincs ilyen termék sablon, vagy nem ugyanaz mint a mostani, akkor...
                        IF @ProductId IS NULL OR @ProductId <> @currentProductId
                        BEGIN
                            -- ...először megnézzük, hogy TÉNYLEG nincs ilyen sablon, ha nincs...
                            IF @ProductId IS NULL
                            BEGIN
                                -- ...csináljuk meg a sablont
                                INSERT INTO Product (CategoryId, Name, Brand, Unit) 
                                VALUES (@CategoryId, @PName, @Brand, @Unit);
                                
                                SET @ProductId = SCOPE_IDENTITY(); -- Elkérjük az új termék sablon Id-jét
                            END;

                            -- ...állítsuk át az új termék sablonra a StoreInventory-nál.
                            UPDATE StoreInventory
                            SET ProductId = @ProductId
                            WHERE Id = @StoreInventoryId;

                            -- Töröljük ki a régi termék sablont !!CSAK AKKOR HA MÁS BOLT NEM HASZNÁLJA!!
                            DELETE FROM Product
                            WHERE Id = @currentProductId 
                            AND Id <> @ProductId -- Nehogy magunkat töröljük le
                            AND NOT EXISTS (SELECT 1 FROM StoreInventory WHERE ProductId = @currentProductId);
                        END;

                        -- Megnézzük, hogy legalább az egyik NEM NULL
                        IF LEN(CONCAT(@Price, @Currency, @Description, @Stock)) > 0
                        BEGIN
                            -- Frissítjük az adatokat
                            UPDATE StoreInventory
                            SET 
                                -- Ha a @Price 0 vagy NULL, marad a jelenlegi Price
                                Price = COALESCE(NULLIF(@Price, 0), Price),
                                
                                -- Ha a @Currency üres ('') vagy NULL, marad a jelenlegi Currency
                                Currency = COALESCE(NULLIF(@Currency, ''), Currency),
                                
                                -- Ha a @Description üres vagy NULL, marad a jelenlegi Description
                                Description = COALESCE(NULLIF(@Description, ''), Description),
                                
                                -- Ha a @Stock NULL (itt a 0 lehet valid érték, szóval csak NULL-ra nézzük), marad a régi
                                Stock = COALESCE(@Stock, Stock)
                            WHERE Id = @StoreInventoryId;
                        END;

                        COMMIT TRANSACTION;
                    END TRY;
                    BEGIN CATCH
                        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                        THROW;
                    END CATCH;
                `)

        res.status(200).json({success: true, message: "Termék sikeresen feltöltve!"})
    }
    catch(err){
        console.error("Fetch ERROR:", err)
        res.status(500).json({success: false, message: "Szerver hiba történt!"})
    }
    finally{
        if (pool) pool.close()
    }
})

// MÉG NINCS KÉSZ!!! EZ ITT A FÁJL BEOLVASÁSHOZ LESZ!
router.patch('/', authenticationToken, async (req, res) => {
    let pool;
    try{
        const {StoreName, StoreAddress, PName, PCName, Brand, Unit, Stock} = req.body
        const {AuthLv} = req.user //Tokenből infó

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
            .input('currentProductId', mssql.Int, ProductId)
            .input('StoreInventoryId', mssql.Int, StoreInvId)
            .query(`
                DECLARE @CategoryId int;
                DECLARE @ProductId int;

                -- Megnézzük, hogy létezik-e ez a kategória a ProductCategory-ban (Transaction folyt. köv.)
                SET @CategoryId = (SELECT Id FROM ProductCategory WHERE Name = @PCName);

                BEGIN TRANSACTION
                    BEGIN TRY
                        -- Ha még nincs ilyen kategória, akkor töltsük fel
                        IF @CategoryId IS NULL
                        BEGIN
                            INSERT INTO ProductCategory (Name) VALUES (@PCName)
                            SET @CategoryId = SCOPE_IDENTITY()  -- Elkérjük az új termék kategória Id-jét
                        END;

                        -- Megnézzük, hogy létezik-e ez a sablon a Products-ban
                        -- Ezuttal már a CategoryId újra beillesztése után, ha megtörtént
                        SET @ProductId = (SELECT TOP 1 Id FROM Product
                            WHERE LOWER(Name) = LOWER(@PName) AND LOWER(Brand) = LOWER(@Brand)
                            AND LOWER(Unit) = LOWER(@Unit) AND CategoryId = @CategoryId)
                        
                        -- Ha még nincs ilyen termék sablon, vagy nem ugyanaz mint a mostani, akkor...
                        IF @ProductId IS NULL OR @ProductId <> @currentProductId
                        BEGIN
                            -- ...először megnézzük, hogy TÉNYLEG nincs ilyen sablon, ha nincs...
                            IF @ProductId IS NULL
                            BEGIN
                                -- ...csináljuk meg a sablont
                                INSERT INTO Product (CategoryId, Name, Brand, Unit) 
                                VALUES (@CategoryId, @PName, @Brand, @Unit);
                                
                                SET @ProductId = SCOPE_IDENTITY(); -- Elkérjük az új termék sablon Id-jét
                            END;

                            -- ...állítsuk át az új termék sablonra a StoreInventory-nál.
                            UPDATE StoreInventory
                            SET ProductId = @ProductId
                            WHERE Id = @StoreInventoryId;

                            -- Töröljük ki a régi termék sablont !!CSAK AKKOR HA MÁS BOLT NEM HASZNÁLJA!!
                            DELETE FROM Product
                            WHERE Id = @currentProductId 
                            AND Id <> @ProductId -- Nehogy magunkat töröljük le
                            AND NOT EXISTS (SELECT 1 FROM StoreInventory WHERE ProductId = @currentProductId);
                        END;

                        -- Megnézzük, hogy legalább az egyik NEM NULL
                        IF LEN(CONCAT(@Price, @Currency, @Description, @Stock)) > 0
                        BEGIN
                            -- Frissítjük az adatokat
                            UPDATE StoreInventory
                            SET 
                                -- Ha a @Price 0 vagy NULL, marad a jelenlegi Price
                                Price = COALESCE(NULLIF(@Price, 0), Price),
                                
                                -- Ha a @Currency üres ('') vagy NULL, marad a jelenlegi Currency
                                Currency = COALESCE(NULLIF(@Currency, ''), Currency),
                                
                                -- Ha a @Description üres vagy NULL, marad a jelenlegi Description
                                Description = COALESCE(NULLIF(@Description, ''), Description),
                                
                                -- Ha a @Stock NULL (itt a 0 lehet valid érték, szóval csak NULL-ra nézzük), marad a régi
                                Stock = COALESCE(@Stock, Stock)
                            WHERE Id = @StoreInventoryId;
                        END;

                        COMMIT TRANSACTION;
                    END TRY;
                    BEGIN CATCH
                        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                        THROW;
                    END CATCH;
                `)

        res.status(200).json({success: true, message: "Termék sikeresen feltöltve!"})
    }
    catch(err){
        console.error("Fetch ERROR:", err)
        res.status(500).json({success: false, message: "Szerver hiba történt!"})
    }
    finally{
        if (pool) pool.close()
    }
})

router.delete('/', authenticationToken, async (req, res) => {
    let pool;
    try{
        const {StoreInvId, ProductId} = req.body
        const {AuthLv} = req.user //Tokenből infó

        if(AuthLv == 4)
            return res.status(403).json({ success: false, error: "Ehhez a művelethez nincs jogosultságod!" });

        pool = await mssql.connect(config)

        await pool.request()
            .input('StoreInventoryId', mssql.Int, StoreInvId)
            .input('currentProductId', mssql.Int, ProductId)
            .query(`
                BEGIN TRANSACTION
                    BEGIN TRY
                        -- Volt-e bármely eladásban ez a termék? Ha Igen...
                        IF EXISTS (SELECT 1 FROM Sales WHERE InventoryId = @StoreInvId)
                        BEGIN
                            -- Teljesen töröljük ki
                            DELETE FROM StoreInventory WHERE Id = @StoreInventoryId;
                            
                            -- Sablonnal együtt, ha más bolt nem használja más bolt.
                            DELETE FROM Product 
                            WHERE Id = @currentProductId 
                            AND NOT EXISTS (SELECT 1 FROM StoreInventory WHERE ProductId = @currentProductId);
                        END;
                        ELSE -- Ha nem...
                        BEGIN
                            -- Simán úgy teszünk, mintha kitörölnénk
                            UPDATE StoreInventory
                            SET IsDeleted = 1
                            WHERE Id = @StoreInventoryId
                        END;

                        COMMIT TRANSACTION;
                    END TRY;
                    BEGIN CATCH
                        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                        THROW;
                    END CATCH;
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

module.exports = router