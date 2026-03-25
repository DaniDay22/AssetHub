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

// GET: Készlet feltöltő sablon letöltése (Excel-kompatibilis, win1250 kódolással)
router.get('/export-template/:storeId', authenticationToken, async (req, res) => {
    let pool;
    try {
        pool = await mssql.connect(config);

        // 1. Lekérdezzük a kiválasztott bolt összes aktív termékét
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
                WHERE SI.StoreId = @StoreId AND (SI.IsDeleted = 0 OR SI.IsDeleted IS NULL)
            `);

        // Ha véletlenül teljesen üres a bolt, akkor is adjunk vissza egy üres sablont fejlécekkel!
        
        // 2. Fejléc összeállítása (Pontosan az, amit az import útvonal vár, pontosvesszőkkel!)
        let csvContent = "Bolt név;Bolt cím;Termék név;Termék kategória név;Márka;Egység;Hozzáadandó áru száma\n";

        // 3. Sorok hozzáadása (A végén a 0 a hozzáadandó alapértelmezett mennyiség)
        result.recordset.forEach(row => {
            csvContent += `${row.StoreName};${row.StoreAddress};${row.ProductName};${row.CategoryName};${row.Brand};${row.Unit};0\n`;
        });

        // 4. Konvertálás Windows-1250-re (Hogy az Excel ne rontsa el a magyar ékezeteket!)
        const buffer = iconv.encode(csvContent, 'win1250');

        // 5. Header-ek beállítása a fájl letöltéshez
        res.setHeader('Content-Type', 'text/csv; charset=windows-1250');
        res.setHeader('Content-Disposition', `attachment; filename=keszlet_sablon_bolt_${req.params.storeId}.csv`);

        // Fájl elküldése (Itt nem szabad res.json-t is küldeni, csak a buffert!)
        res.send(buffer);

    } catch (error) {
        console.error("Template Export ERROR:", error);
        res.status(500).json({success: false, message: "Hiba a sablon generálása közben!"});
    } finally {
        if (pool) pool.close();
    }
});

// GET: Fetch all products for the SELECTED store
router.get('/All', authenticationToken, async (req, res) => {
    try {
        const { AuthLv, FranchiseId, StoreId } = req.user;

        // Block level 4 (Cashiers) from the global product management page if needed
        if (AuthLv == 4) {
            return res.status(403).json({ success: false, error: "Ehhez a művelethez nincs jogosultságod!" });
        }

        // 1. Grab the storeId from the URL (or fallback to the employee's home store)
        const targetStoreId = req.query.storeId ? parseInt(req.query.storeId) : StoreId;

        const pool = await mssql.connect(config);

        // 2. SECURITY: Verify this store actually belongs to their Franchise
        const storeCheck = await pool.request()
            .input('TargetStoreId', mssql.Int, targetStoreId)
            .input('MyFranchiseId', mssql.Int, FranchiseId)
            .query(`SELECT Id FROM Store WHERE Id = @TargetStoreId AND FranchiseId = @MyFranchiseId`);

        if (storeCheck.recordset.length === 0) {
            return res.status(403).json({ success: false, error: "Nincs jogosultságod ehhez a bolthoz!" });
        }

        // 3. Fetch ONLY the inventory for that specific store!
        const result = await pool.request()
            .input('TargetStoreId', mssql.Int, targetStoreId)
            .query(`
                SELECT
                    SI.Id AS StoreInventoryId,
                    P.Name AS ProductName,
                    PC.Name AS CategoryName,
                    P.Brand,
                    P.Unit,
                    SI.Price,
                    SI.Stock,
                    SI.Sold,
                    SI.Description
                FROM StoreInventory SI
                INNER JOIN Product P ON SI.ProductId = P.Id
                INNER JOIN ProductCategory PC ON P.CategoryId = PC.Id
                WHERE SI.StoreId = @TargetStoreId
                AND (SI.IsDeleted = 0 OR SI.IsDeleted IS NULL)
                ORDER BY P.Brand ASC, P.Name ASC
            `);

        res.status(200).json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Products Fetch ERROR:", err);
        res.status(500).json({ success: false, message: "Szerver hiba történt a termékek betöltésekor!" });
    }
});

router.post('/', authenticationToken, async (req, res) => {
    let pool;
    try{
        // 1. ADDED StoreId to the destructured body!
        const {PName, PCName, Brand, Unit, Price, Currency, Stock, Description, StoreId} = req.body
        const {AuthLv, UserId} = req.user //Tokenből infó

        if(AuthLv == 4)
            return res.status(403).json({ success: false, error: "Ehhez a művelethez nincs jogosultságod!" });

        // Fallback: If frontend didn't send a StoreId, use the user's default store
        const targetStoreId = StoreId || req.user.StoreId;

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
            .input('TargetStoreId', mssql.Int, targetStoreId) // NEW: Pass the StoreId to SQL
            .query(`
                DECLARE @CategoryId int;
                DECLARE @ProductId int;

                -- Megnézzük, hogy létezik-e ez a kategória a ProductCategory-ban
                SET @CategoryId = (SELECT Id FROM ProductCategory WHERE Name = @PCName);

                -- Megnézzük, hogy létezik-e ez a sablon a Products-ban
                SET @ProductId = (SELECT TOP 1 Id FROM Product
                    WHERE LOWER(Name) = LOWER(@PName) AND LOWER(Brand) = LOWER(@Brand)
                    AND LOWER(Unit) = LOWER(@Unit) AND CategoryId = @CategoryId)

                -- ELTÁVOLÍTVA: A régi Employee StoreId lekérdezés. Most már a @TargetStoreId-t használjuk!

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

                        -- Feltöltjük a KIVÁLASZTOTT bolt raktárába a terméket
                        INSERT INTO StoreInventory (StoreId, ProductId, Price, Currency, Stock, Description) VALUES
                        (@TargetStoreId, @ProductId, @Price, @Currency, @Stock, @Description);
                        
                        COMMIT TRANSACTION;
                    END TRY
                    BEGIN CATCH
                        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                        THROW;
                    END CATCH
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
    try {
        const {StoreInvId, ProductId, PName, PCName, Brand, Unit, Price, Currency, Stock, Description} = req.body;
        const AuthLv = req.user.AuthLv;

        if(AuthLv == 4) return res.status(403).json({ success: false, error: "Nincs jogosultságod!" });

        pool = await mssql.connect(config);
        await pool.request()
            .input('PName', mssql.NVarChar, PName)
            .input('Brand', mssql.NVarChar, Brand)
            .input('Unit', mssql.NVarChar, Unit)
            .input('PCName', mssql.NVarChar, PCName)
            .input('Price', mssql.Decimal(18, 2), Price)
            .input('Currency', mssql.NVarChar, Currency)
            .input('Stock', mssql.Decimal(18, 2), Stock)
            .input('Description', mssql.NVarChar, Description)
            .input('currentProductId', mssql.Int, ProductId)
            .input('StoreInventoryId', mssql.Int, StoreInvId)
            .query(`
                DECLARE @CategoryId int;
                DECLARE @ProductId int;

                -- Bulletproof Category Lookup
                SET @CategoryId = (SELECT TOP 1 Id FROM ProductCategory WHERE LOWER(TRIM(Name)) = LOWER(TRIM(@PCName)));

                BEGIN TRANSACTION
                BEGIN TRY
                    IF @CategoryId IS NULL
                    BEGIN
                        INSERT INTO ProductCategory (Name) VALUES (TRIM(@PCName));
                        SET @CategoryId = SCOPE_IDENTITY();
                    END;

                    -- Bulletproof Product Lookup
                    SET @ProductId = (SELECT TOP 1 Id FROM Product
                        WHERE LOWER(TRIM(Name)) = LOWER(TRIM(@PName)) 
                        AND LOWER(TRIM(Brand)) = LOWER(TRIM(@Brand))
                        AND LOWER(TRIM(Unit)) = LOWER(TRIM(@Unit)) 
                        AND CategoryId = @CategoryId);
                    
                    IF @ProductId IS NULL OR @ProductId <> @currentProductId
                    BEGIN
                        IF @ProductId IS NULL
                        BEGIN
                            INSERT INTO Product (CategoryId, Name, Brand, Unit) 
                            VALUES (@CategoryId, TRIM(@PName), TRIM(@Brand), TRIM(@Unit));
                            SET @ProductId = SCOPE_IDENTITY();
                        END;

                        UPDATE StoreInventory SET ProductId = @ProductId WHERE Id = @StoreInventoryId;

                        -- Cleanup unused templates
                        DELETE FROM Product 
                        WHERE Id = @currentProductId 
                        AND Id <> @ProductId
                        AND NOT EXISTS (SELECT 1 FROM StoreInventory WHERE ProductId = @currentProductId);
                    END;

                    UPDATE StoreInventory
                    SET 
                        Price = COALESCE(NULLIF(@Price, 0), Price),
                        Currency = COALESCE(NULLIF(@Currency, ''), Currency),
                        Description = COALESCE(NULLIF(@Description, ''), Description),
                        Stock = COALESCE(@Stock, Stock)
                    WHERE Id = @StoreInventoryId;

                    COMMIT TRANSACTION;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH;
            `);

        res.status(200).json({success: true, message: "Sikeres frissítés!"});
    } catch(err) {
        console.error("PUT ERROR:", err);
        res.status(500).json({success: false, message: "Szerver hiba a módosításkor!"});
    } finally {
        if (pool) pool.close();
    }
});

router.delete('/', authenticationToken, async (req, res) => {
    let pool;
    try {
        const {StoreInvId, ProductId} = req.body;
        if(req.user.AuthLv == 4) return res.status(403).json({ success: false, error: "Nincs jogosultságod!" });

        pool = await mssql.connect(config);
        await pool.request()
            .input('StoreInventoryId', mssql.Int, StoreInvId) // Use consistent naming
            .input('currentProductId', mssql.Int, ProductId)
            .query(`
                BEGIN TRANSACTION
                BEGIN TRY
                    -- FIX: Using the correct @StoreInventoryId variable here!
                    IF EXISTS (SELECT 1 FROM Sales WHERE InventoryId = @StoreInventoryId)
                    BEGIN
                        -- If it was ever sold, we only soft-delete
                        UPDATE StoreInventory SET IsDeleted = 1 WHERE Id = @StoreInventoryId;
                    END
                    ELSE 
                    BEGIN
                        -- If never sold, we can fully delete
                        DELETE FROM StoreInventory WHERE Id = @StoreInventoryId;
                    END

                    -- Clean up the product template if no other store is using it
                    DELETE FROM Product 
                    WHERE Id = @currentProductId 
                    AND NOT EXISTS (SELECT 1 FROM StoreInventory WHERE ProductId = @currentProductId);

                    COMMIT TRANSACTION;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH;
            `);
        res.status(200).json({success: true, message: "Sikeres törlés!"});
    } catch(err) {
        console.error("DELETE ERROR:", err);
        res.status(500).json({success: false, message: "Hiba a törlés közben!"});
    } finally {
        if (pool) pool.close();
    }
});

// Innentől kezdve a fájl betöltés/írás endpointok találhatók -> Aki ide belép, haggyon fel minden reménnyel
router.patch('/', authenticationToken, upload.single('RestockFile'), async (req, res) => {
    let pool;
    try{
        if (!req.file) return res.status(400).send('Nincs fájl feltöltve.');

        let fileContent;

        // 1. AUTO-DETECT ENCODING: Check for Excel's hidden UTF-8 BOM signature (EF BB BF)
        if (req.file.buffer[0] === 0xEF && req.file.buffer[1] === 0xBB && req.file.buffer[2] === 0xBF) {
            console.log("Encoding Detected: UTF-8");
            fileContent = req.file.buffer.toString('utf8');
        } else {
            console.log("Encoding Detected: win1250");
            fileContent = iconv.decode(req.file.buffer, 'win1250');
        }

        // 2. AUTO-DETECT DELIMITER: Look at the first line to see if Excel used commas or semicolons
        const firstLine = fileContent.split('\n')[0];
        const detectedDelimiter = firstLine.includes(';') ? ';' : ',';
        console.log("Delimiter Detected:", detectedDelimiter);

        // 3. PARSE THE FILE using the auto-detected settings
        const records = parse(fileContent, {
            columns: true, 
            skip_empty_lines: true,
            delimiter: detectedDelimiter,
            trim: true, 
            bom: true // Strips out the invisible characters!
        });

        console.log("Sikeres beolvasás:", records[0]); // Let's peek at the first row!

        const jsonData = JSON.stringify(records);

        pool = await mssql.connect(config);

        const result = await pool.request()
            .input('ImportJSON', mssql.NVarChar(mssql.MAX), jsonData)
            .query(`
                -- Beolvassuk a JSON-t egy ideiglenes táblába
                SELECT 
                    JSON_VALUE(value, '$."Bolt név"') as StoreName,
                    JSON_VALUE(value, '$."Bolt cím"') as StoreAddress,
                    JSON_VALUE(value, '$."Termék név"') as ProductName, -- FIXED ALIAS
                    JSON_VALUE(value, '$."Termék kategória név"') as CategoryName, -- FIXED ALIAS
                    JSON_VALUE(value, '$."Márka"') as Brand,
                    JSON_VALUE(value, '$."Egység"') as Unit,
                    JSON_VALUE(value, '$."Hozzáadandó áru száma"') as StockToAdd
                INTO #TempImport 
                FROM OPENJSON(@ImportJSON);

                -- Tömeges frissítés
                UPDATE SI
                SET SI.Stock = SI.Stock + CAST(T.StockToAdd AS DECIMAL(18,2))
                FROM StoreInventory SI
                INNER JOIN Product P ON SI.ProductId = P.Id
                INNER JOIN ProductCategory PC ON P.CategoryId = PC.Id
                INNER JOIN Store S ON SI.StoreId = S.Id -- FIXED: Added the missing Store JOIN!
                INNER JOIN #TempImport T ON 
                    LOWER(TRIM(P.Name)) = LOWER(TRIM(T.ProductName)) AND
                    LOWER(TRIM(P.Brand)) = LOWER(TRIM(T.Brand)) AND
                    LOWER(TRIM(P.Unit)) = LOWER(TRIM(T.Unit)) AND
                    LOWER(TRIM(PC.Name)) = LOWER(TRIM(T.CategoryName)) AND
                    LOWER(TRIM(S.Name)) = LOWER(TRIM(T.StoreName)) AND
                    LOWER(TRIM(S.Address)) = LOWER(TRIM(T.StoreAddress));

                -- Hibák visszaküldése (amiket nem talált meg)
                SELECT 
                    T.StoreName, 
                    T.ProductName, 
                    T.Brand, 
                    T.Unit,
                    'Nem található ilyen termék vagy bolt ezzel a kombinációval' AS ErrorReason
                FROM #TempImport T
                LEFT JOIN Store S ON LOWER(TRIM(S.Name)) = LOWER(TRIM(T.StoreName)) AND LOWER(TRIM(S.Address)) = LOWER(TRIM(T.StoreAddress))
                LEFT JOIN Product P ON LOWER(TRIM(P.Name)) = LOWER(TRIM(T.ProductName))
                    AND LOWER(TRIM(P.Brand)) = LOWER(TRIM(T.Brand))
                    AND LOWER(TRIM(P.Unit)) = LOWER(TRIM(T.Unit))
                LEFT JOIN StoreInventory SI ON SI.ProductId = P.Id AND SI.StoreId = S.Id
                WHERE SI.Id IS NULL; 
                
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
        const queryThreshold = parseInt(req.query.threshold);
        const lowStockThreshold = (!isNaN(queryThreshold) && queryThreshold >= 0) ? queryThreshold : 10;
        pool = await mssql.connect(config)

        const result = await pool.request()
            .input('StoreId', mssql.Int, req.params.storeId)
            .input('Threshold', mssql.Int, lowStockThreshold)
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
                WHERE SI.StoreId = @StoreId AND SI.IsDeleted = 0 AND SI.Stock <= @Threshold
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
    } catch (error) {
        console.error("Fetch ERROR:", error)
        res.status(500).json({success: false, message: "Hiba a sablon generálása közben!"})
    }
    finally{
        if (pool) pool.close()
    }
});

module.exports = router