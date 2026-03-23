//Csomagokat behozzuk
require('dotenv')
const express = require('express')
const mssql = require('mssql')
const config = require('../config')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const iconv = require('iconv-lite')

const upload = multer({storage: multer.memoryStorage() })
const { parse } = require('csv-parse/sync')

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
                P.Name as 'PName',
                PC.Name as 'PCName',
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
        const AuthLv = req.user.AuthLv //Tokenből infó

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
        const AuthLv = req.user.AuthLv //Tokenből infó

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

// Innentől kezdve a fájl betöltés/írás endpointok találhatók -> Aki ide belép, haggyon fel minden reménnyel
router.patch('/', authenticationToken, upload.single('RestockFile'), async (req, res) => {
    let pool;
    try{
        if (!req.file) return res.status(400).send('Nincs fájl feltöltve.')
        
        const fileContent = iconv.decode(req.file.buffer, 'win1250')

        const records = parse(fileContent, {
            columns: true, // Az első sor a fejléc, ebből lesznek a kulcsok
            skip_empty_lines: true,
            delimiter: ';'
        })

        const jsonData = JSON.stringify(records)

        pool = await mssql.connect(config)

        await pool.request()
            .input('ImportJSON', mssql.NVarChar(mssql.MAX), jsonData)
            .query(`
                -- Beolvassuk a JSON-t egy ideiglenes táblába
                SELECT 
                    JSON_VALUE(value, '$."Bolt név"') as StoreName,
                    JSON_VALUE(value, '$."Bolt cím"') as StoreAddress,
                    JSON_VALUE(value, '$."Termék név"') as PName,
                    JSON_VALUE(value, '$."Termék kategória név"') as PCName,
                    JSON_VALUE(value, '$."Márka"') as Brand,
                    JSON_VALUE(value, '$."Egység"') as Unit,
                    JSON_VALUE(value, '$."Hozzáadandó áru száma"') as StockToAdd
                INTO #TempImport -- Tábla neve
                FROM OPENJSON(@ImportJSON);

                -- Tömeges frissítés
                UPDATE SI
                SET SI.Stock = SI.Stock + CAST(T.StockToAdd AS DECIMAL(18,2))
                FROM StoreInventory SI
                INNER JOIN Product P ON SI.ProductId = P.Id
                INNER JOIN ProductCategory PC ON P.CategoryId = PC.Id
                INNER JOIN #TempImport T ON 
                    LOWER(TRIM(P.Name)) = LOWER(TRIM(T.ProductName)) AND
                    LOWER(TRIM(P.Brand)) = LOWER(TRIM(T.Brand)) AND
                    LOWER(TRIM(P.Unit)) = LOWER(TRIM(T.Unit)) AND
                    LOWER(TRIM(PC.Name)) = LOWER(TRIM(T.CategoryName)) AND
                    LOWER(TRIM(S.Name)) = LOWER(TRIM(T.StoreName)) AND
                    LOWER(TRIM(S.Address)) = LOWER(TRIM(T.StoreAddress));

                SELECT 
                    T.StoreName, 
                    T.ProductName, 
                    T.Brand, 
                    T.Unit,
                    'Nem található ilyen termék vagy bolt ezzel a kombinációval' AS ErrorReason
                FROM #TempImport T
                LEFT JOIN Store S ON LOWER(TRIM(S.Name)) = LOWER(TRIM(T.StoreName))
                LEFT JOIN Product P ON LOWER(TRIM(P.Name)) = LOWER(TRIM(T.ProductName))
                    AND LOWER(TRIM(P.Brand)) = LOWER(TRIM(T.Brand))
                    AND LOWER(TRIM(P.Unit)) = LOWER(TRIM(T.Unit))
                LEFT JOIN StoreInventory SI ON SI.ProductId = P.Id AND SI.StoreId = S.Id
                WHERE SI.Id IS NULL; -- Csak azokat kérjük le, amiknél nem jött létre a kapcsolat
                
                DROP TABLE #TempImport;
            `);

            const failedRows = result.recordset; // Az utolsó SELECT eredménye
            const successCount = records.length - failedRows.length;

        res.status(200).json({
            message: 'Feldolgozás kész.',
            stats: {
                total: records.length,
                success: successCount,
                failed: failedRows.length
            },
            errors: failedRows // Ez megy vissza a frontendnek listaként
        });
    }
    catch(err){
        console.error("Fetch ERROR:", err)
        res.status(500).json({success: false, message: "Szerver hiba történt!"})
    }
    finally{
        if (pool) pool.close()
    }
})

router.get('/export-template/:storeId', authenticationToken, async (req, res) => {
    let pool;
    try {
        pool = await mssql.connect(config)

        const result = await pool.request()
            .input('StoreId', mssql.Int, req.params.storeId)
            .query(`
                SELECT 
                    S.Name AS StoreName,
                    S.Address AS StoreAddress,
                    P.Name AS ProductName,
                    PC.Name AS CategoryName,
                    P.Brand,
                    P.Unit
                FROM StoreInventory SI
                JOIN Store S ON SI.StoreId = S.Id
                JOIN Product P ON SI.ProductId = P.Id
                JOIN ProductCategory PC ON P.CategoryId = PC.Id
                WHERE SI.StoreId = @StoreId AND SI.IsDeleted = 0
            `);

        // Fejléc összeállítása (pontosan az, amit az import vár!)
        // Ha ezt a sort megváltoztatod, akkor az előző .patch route-nál IS MEG KELL VÁLTOZTATNI!! Figyelmeztetve lettél
        let csvContent = "Bolt név;Bolt cím;Termék név;Termék kategória név;Márka;Egység;Hozzáadandó áru száma\n";

        // Sorok hozzáadása
        result.recordset.forEach(row => {
            csvContent += `${row.StoreName};${row.StoreAddress};${row.ProductName};${row.CategoryName};${row.Brand};${row.Unit};0\n`;
        });

        // Konvertálás Windows-1250-re (Excel barát ékezetek)
        const buffer = iconv.encode(csvContent, 'win1250');

        // Header-ek beállítása a letöltéshez
        res.setHeader('Content-Type', 'text/csv; charset=windows-1250');
        res.setHeader('Content-Disposition', `attachment; filename=keszlet_sablon_bolt_${req.params.storeId}.csv`);

        res.send(buffer);
        res.status(200).json({success: true, message: "Sablon generálva!"})
    } catch (error) {
        console.error("Fetch ERROR:", err)
        res.status(500).json({success: false, message: "Hiba a sablon generálása közben!"})
    }
    finally{
        if (pool) pool.close()
    }
});

module.exports = router