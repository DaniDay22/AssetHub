//Csomagokat behozzuk
require('dotenv')
const express = require('express')
const mssql = require('mssql')
const config = require('../config')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const iconv = require('iconv-lite')

const upload = multer({ storage: multer.memoryStorage() })
const { parse } = require('csv-parse/sync')

const jwt_secretKey = process.env.JWT_SECRET

const router = express.Router()

const filter = /^[a-zA-Z áéíóöőúüűÁÉÍÓÖŐÚÜŰ]+$/ //Csak betűk (+ magyar betűk) és szóközöket lehet megadni

//JWT Middleware réteg
const authenticationToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token)
        return res.status(401).json({ success: false, error: "Bejelentkezés szükséges!" })

    jwt.verify(token, jwt_secretKey, (err, decoded) => {
        if (err)
            return res.status(403).json({ success: false, error: "Érvénytelen vagy lejárt token!" })

        //Ha minden oké, akkor adjuk át a dekódolt adatokat és mehet tovább
        req.user = decoded
        next()
    })
}

// SMART GET: Kétféle sablon letöltése egy endpointból! Ha a query-ben van egy érvényes szám a threshold paraméterben, akkor csak a low-stock termékeket adja vissza (ez lesz a bevásárlólista). Ha nincs ilyen paraméter, vagy nem érvényes szám, akkor az összes terméket adja vissza (ez lesz a teljes készlet feltöltő sablon). Így elkerüljük, hogy két külön endpointot kelljen fenntartani, és a frontendnek is egyszerűbb dolga van, mert csak egy endpointot kell hívnia a sablon letöltéséhez, és dinamikusan megadhatja, hogy melyik sablont szeretné.
router.get('/export-template/:storeId', authenticationToken, async (req, res) => {
    let pool;
    try {
        pool = await mssql.connect(config);

        const storeId = req.params.storeId;
        const thresholdQuery = req.query.threshold;

        let result;

        // Megnézzük, hogy a threshold query paraméterben van-e érték, és ha igen, akkor az egy szám-e. Ha van ilyen paraméter, és érvényes szám, akkor csak a low-stock termékeket kérjük le (ez lesz a bevásárlólista). Ha nincs ilyen paraméter, vagy nem érvényes szám, akkor az összes terméket kérjük le (ez lesz a teljes készlet feltöltő sablon).
        if (thresholdQuery !== undefined && thresholdQuery !== null && !isNaN(parseInt(thresholdQuery))) {
            const lowStockThreshold = parseInt(thresholdQuery);

            result = await pool.request()
                .input('StoreId', mssql.Int, storeId)
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
                    WHERE SI.StoreId = @StoreId 
                      AND (SI.IsDeleted = 0 OR SI.IsDeleted IS NULL) 
                      AND SI.Stock <= @Threshold
                `);
        }
        // Ha nincs threshold paraméter, akkor az összes terméket lekérjük, hogy a teljes készlet feltöltő sablont generáljuk.
        else {
            result = await pool.request()
                .input('StoreId', mssql.Int, storeId)
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
                    WHERE SI.StoreId = @StoreId 
                      AND (SI.IsDeleted = 0 OR SI.IsDeleted IS NULL)
                `);
        }

        // Fejléc összeállítása (pontosan az, amit az import vár!)
        // Ha ezt a sort megváltoztatod, akkor az előző .patch route-nál IS MEG KELL VÁLTOZTATNI!! Figyelmeztetve lettél
        let csvContent = "Bolt név;Bolt cím;Termék név;Termék kategória név;Márka;Egység;Hozzáadandó áru száma\n";

        // Sorok hozzáadása
        result.recordset.forEach(row => {
            csvContent += `${row.StoreName};${row.StoreAddress};${row.ProductName};${row.CategoryName};${row.Brand};${row.Unit};0\n`;
        });

        // 4. Konvertálás Windows-1250-re (Excel barát ékezetek)
        const buffer = iconv.encode(csvContent, 'win1250');

        // 5. Header-ek beállítása a letöltéshez
        res.setHeader('Content-Type', 'text/csv; charset=windows-1250');

        // Dinamikus fájlnév attól függően, hogy melyiket töltjük le
        const fileNamePrefix = thresholdQuery ? 'bevasarlista' : 'keszlet_sablon';
        res.setHeader('Content-Disposition', `attachment; filename=${fileNamePrefix}_bolt_${storeId}.csv`);

        res.send(buffer);

    } catch (error) {
        console.error("Template Export ERROR:", error);
        res.status(500).json({ success: false, message: "Hiba a sablon generálása közben!" });
    } finally {
        if (pool) pool.close();
    }
});

// GET: Fetch all products for the SELECTED store
router.get('/All', authenticationToken, async (req, res) => {
    try {
        const { AuthLv, FranchiseId, StoreId } = req.user;

        // Blokkoljuk az Eladókat(AuthLv == 4), mert nincs értelme, hogy ők itt legyenek
        if (AuthLv == 4) {
            return res.status(403).json({ success: false, error: "Ehhez a művelethez nincs jogosultságod!" });
        }

        // Megnézzük, hogy a frontend küldött-e storeId-t query-ben. Ha igen, akkor azt használjuk, ha nem, akkor a tokenben lévő StoreId-t (ez az alapértelmezett boltja a dolgozónak).
        const targetStoreId = req.query.storeId ? parseInt(req.query.storeId) : StoreId;

        const pool = await mssql.connect(config);

        // SECURITY: Megnézzük, hogy a megadott storeId valóban a saját franchise-unkhoz tartozik-e. Ez megakadályozza, hogy egy dolgozó más franchise-hoz tartozó bolt készletét lássa.
        const storeCheck = await pool.request()
            .input('TargetStoreId', mssql.Int, targetStoreId)
            .input('MyFranchiseId', mssql.Int, FranchiseId)
            .query(`SELECT Id FROM Store WHERE Id = @TargetStoreId AND FranchiseId = @MyFranchiseId`);

        if (storeCheck.recordset.length === 0) {
            return res.status(403).json({ success: false, error: "Nincs jogosultságod ehhez a bolthoz!" });
        }

        // Ha minden oké, akkor lekérjük a termékeket a megadott storeId-hoz. Ez lehet az alapértelmezett StoreId a tokenből, vagy egy másik, amit a frontend küldött query-ben (ha magasabb jogosultságú).
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
    try {
        // A frontend küldje el a StoreId-t, hogy melyik bolt raktárába szeretné feltölteni a terméket. Ha nem küldi el, akkor használjuk a tokenben lévő StoreId-t (ez az alapértelmezett boltja a dolgozónak).
        const { PName, PCName, Brand, Unit, Price, Currency, Stock, Description, StoreId } = req.body
        const { AuthLv, UserId } = req.user //Tokenből infó

        if (AuthLv == 4)
            return res.status(403).json({ success: false, error: "Ehhez a művelethez nincs jogosultságod!" });

        // Megnézzük, hogy a frontend küldött-e storeId-t. Ha igen, akkor azt használjuk, ha nem, akkor a tokenben lévő StoreId-t (ez az alapértelmezett boltja a dolgozónak).
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
            .input('TargetStoreId', mssql.Int, targetStoreId)
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

        res.status(201).json({ success: true, message: "Termék sikeresen feltöltve!" })
    }
    catch (err) {
        console.error("Fetch ERROR:", err)
        res.status(500).json({ success: false, message: "Szerver hiba történt!" })
    }
    finally {
        if (pool) pool.close()
    }
})

router.put('/', authenticationToken, async (req, res) => {
    let pool;
    try {
        const { StoreInvId, ProductId, PName, PCName, Brand, Unit, Price, Currency, Stock, Description } = req.body;
        const AuthLv = req.user.AuthLv;

        if (AuthLv == 4) return res.status(403).json({ success: false, error: "Nincs jogosultságod!" });

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

                -- Megnézzük, hogy létezik-e ez a kategória a ProductCategory-ban (Transaction folyt. köv.)
                SET @CategoryId = (SELECT TOP 1 Id FROM ProductCategory WHERE LOWER(TRIM(Name)) = LOWER(TRIM(@PCName)));

                BEGIN TRANSACTION
                BEGIN TRY
                    -- Ha még nincs ilyen kategória, akkor töltsük fel
                    IF @CategoryId IS NULL
                    BEGIN
                        INSERT INTO ProductCategory (Name) VALUES (TRIM(@PCName));
                        SET @CategoryId = SCOPE_IDENTITY();
                    END;

                    -- Megnézzük, hogy létezik-e ez a sablon a Products-ban
                    -- Ezuttal már a CategoryId újra beillesztése után, ha megtörtént
                    SET @ProductId = (SELECT TOP 1 Id FROM Product
                        WHERE LOWER(TRIM(Name)) = LOWER(TRIM(@PName)) 
                        AND LOWER(TRIM(Brand)) = LOWER(TRIM(@Brand))
                        AND LOWER(TRIM(Unit)) = LOWER(TRIM(@Unit)) 
                        AND CategoryId = @CategoryId);
                    
                    -- Ha még nincs ilyen termék sablon, vagy nem ugyanaz mint a mostani, akkor...
                    IF @ProductId IS NULL OR @ProductId <> @currentProductId
                    BEGIN
                        -- ...először megnézzük, hogy TÉNYLEG nincs ilyen sablon, ha nincs...
                        IF @ProductId IS NULL
                        BEGIN
                            INSERT INTO Product (CategoryId, Name, Brand, Unit) 
                            VALUES (@CategoryId, TRIM(@PName), TRIM(@Brand), TRIM(@Unit));
                            SET @ProductId = SCOPE_IDENTITY();
                        END;
                        -- ...állítsuk át az új termék sablonra a StoreInventory-nál.
                        UPDATE StoreInventory SET ProductId = @ProductId WHERE Id = @StoreInventoryId;

                        -- Töröljük ki a régi termék sablont !!CSAK AKKOR HA MÁS BOLT NEM HASZNÁLJA!!
                        DELETE FROM Product 
                        WHERE Id = @currentProductId 
                        AND Id <> @ProductId
                        AND NOT EXISTS (SELECT 1 FROM StoreInventory WHERE ProductId = @currentProductId);
                    END;

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

                    COMMIT TRANSACTION;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH;
            `);

        res.status(200).json({ success: true, message: "Sikeres frissítés!" });
    } catch (err) {
        console.error("PUT ERROR:", err);
        res.status(500).json({ success: false, message: "Szerver hiba a módosításkor!" });
    } finally {
        if (pool) pool.close();
    }
});

router.delete('/', authenticationToken, async (req, res) => {
    let pool;
    try {
        const { StoreInvId, ProductId } = req.body;
        if (req.user.AuthLv == 4) return res.status(403).json({ success: false, error: "Nincs jogosultságod!" });

        pool = await mssql.connect(config);
        await pool.request()
            .input('StoreInventoryId', mssql.Int, StoreInvId)
            .input('currentProductId', mssql.Int, ProductId)
            .query(`
                BEGIN TRANSACTION
                BEGIN TRY
                    -- Volt-e bármely eladásban ez a termék? Ha Igen...
                    IF EXISTS (SELECT 1 FROM Sales WHERE InventoryId = @StoreInventoryId)
                    BEGIN
                        -- Simán úgy teszünk, mintha kitörölnénk
                        UPDATE StoreInventory SET IsDeleted = 1 WHERE Id = @StoreInventoryId;
                    END
                    ELSE 
                    BEGIN
                        -- Teljesen töröljük ki
                        DELETE FROM StoreInventory WHERE Id = @StoreInventoryId;
                    END

                    -- Sablonnal együtt, ha más bolt nem használja más bolt.
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
        res.status(200).json({ success: true, message: "Sikeres törlés!" });
    } catch (err) {
        console.error("DELETE ERROR:", err);
        res.status(500).json({ success: false, message: "Hiba a törlés közben!" });
    } finally {
        if (pool) pool.close();
    }
});

// Innentől kezdve a fájl betöltés/írás endpointok találhatók -> Aki ide belép, haggyon fel minden reménnyel

router.patch('/', authenticationToken, upload.single('RestockFile'), async (req, res) => {
    let pool;
    try {
        if (!req.file) return res.status(400).send('Nincs fájl feltöltve.');

        let fileContent;

        // Autómatikusan felismerjük a kódolást (UTF-8 vagy Windows-1250), hogy a magyar ékezetek ne menjenek tönkre. Ez azért fontos, mert az Excel gyakran Windows-1250-ben menti a fájlokat, és ha ezt nem vesszük figyelembe, akkor az ékezetes karakterek helyett kérdőjeleket fogunk látni.
        if (req.file.buffer[0] === 0xEF && req.file.buffer[1] === 0xBB && req.file.buffer[2] === 0xBF) {
            console.log("Encoding Detected: UTF-8");
            fileContent = req.file.buffer.toString('utf8');
        } else {
            console.log("Encoding Detected: win1250");
            fileContent = iconv.decode(req.file.buffer, 'win1250');
        }

        // Autómatikusan felismerjük a delimiter-t (pontosvessző vagy vessző), hogy ne legyen gond, ha a fájlban véletlenül nem pontosvessző van elválasztóként. Ez azért fontos, mert bár a sablon pontosvesszővel van megadva, de előfordulhat, hogy valaki véletlenül vesszőt használ elválasztóként, és így ne legyen hiba a feldolgozás során.
        const firstLine = fileContent.split('\n')[0];
        const detectedDelimiter = firstLine.includes(';') ? ';' : ',';
        console.log("Delimiter Detected:", detectedDelimiter);

        // Parse-oljuk a CSV-t a dinamikusan detektált delimiterrel, és megadjuk a megfelelő opciókat, hogy a magyar ékezetek ne menjenek tönkre, és hogy a fejléc alapján kapjunk kulcsokat az objektumokhoz. Ez megkönnyíti a további feldolgozást, mert így már nem kell indexekkel bajlódni, hanem közvetlenül a kulcsokkal tudunk dolgozni.
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            delimiter: detectedDelimiter,
            trim: true,
            bom: true // Levágja az esetleges BOM-ot, ha maradt volna a fájl elején, ami szintén problémákat okozhat a feldolgozás során.
        });

        console.log("Sikeres beolvasás:", records[0]); // Csak az első rekordot logoljuk, hogy ne legyen túl sok adat a konzolon.

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
    catch (err) {
        console.error("Fetch ERROR:", err)
        res.status(500).json({ success: false, message: "Szerver hiba történt!" })
    }
    finally {
        if (pool) pool.close()
    }
})



module.exports = router