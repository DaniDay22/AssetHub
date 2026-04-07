//Csomagokat behozzuk
require('dotenv')
const express = require('express')
const mssql = require('mssql')
const config = require('../config')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const validator = require('validator')

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

router.put('/UpdateProfile', authenticationToken, async (req, res) => {
    let pool;
    try {
        const userId = req.user.UserId;
        const { email, phone } = req.body;

        const emailFormatCheck = validator.isEmail(email)
        const phoneFormatCheck = validator.isMobilePhone(phone)

        if(!emailFormatCheck || !phoneFormatCheck)
            return res.status(403).json({ success: false, error: "Nem megfelelő email vagy telefonszám formátum!" });

        pool = await mssql.connect(config);

        // Megnézzük, hogy a megadott email cím nem foglalt-e már egy másik felhasználó által (kivéve saját magunkat)
        const emailCheck = await pool.request()
            .input('Email', mssql.NVarChar, email)
            .input('UserId', mssql.Int, userId)
            .query('SELECT Id FROM Employee WHERE Email = @Email AND Id != @UserId');

        if (emailCheck.recordset.length > 0) {
            return res.status(400).json({ success: false, error: "Ez az e-mail cím már foglalt!" });
        }

        await pool.request()
            .input('UserId', mssql.Int, userId)
            .input('Email', mssql.NVarChar, email)
            .input('Phone', mssql.NVarChar, phone)
            .query('UPDATE Employee SET Email = @Email, Phone = @Phone WHERE Id = @UserId');

        res.status(200).json({ success: true, message: "Profil sikeresen frissítve!" });
    } catch (err) {
        res.status(500).json({ success: false, error: "Szerver hiba történt." });
    }
});

//Routes
//Regisztráció Menedzserként (Boltot is felvesszük)
router.post('/Register/Manager', async (req, res) => {
    let pool; 
    try {
        const {name, password, email, phone, dob, storeName, storeAddress} = req.body;
        const emailFormatted = email.toLowerCase().trim();

        const emailFormatCheck = validator.isEmail(email)
        const passwordFormatCheck = validator.isStrongPassword(password)
        const phoneFormatCheck = validator.isMobilePhone(phone)

        if(!emailFormatCheck || !phoneFormatCheck)
            return res.status(403).json({ success: false, error: "Nem megfelelő email vagy telefonszám formátum!" });
        if(!passwordFormatCheck)
            return res.status(403).json({ success: false, error: `Nem elég erős a jelszava! A jelszónak 8 karakter hosszúnak kell lennie, és tartalmaznia kell: 
        1 kisbetűt, 1 nagybetűt, 1 számot, 1 szimbólumot`});

        pool = await mssql.connect(config);

        // Megnézzük, hogy a megadott email cím nem foglalt-e már egy másik felhasználó által
        const accountExists = await pool.request()
            .input('Email', mssql.NVarChar, emailFormatted)
            .query(`SELECT TOP 1 Id FROM Employee WHERE Email = @Email`);

        if (accountExists.recordset.length > 0) { 
            return res.status(400).json({success: false, error: "Ez az email már használatban van!"});
        }

        // Megnézzük, hogy a megadott bolt nem létezik-e már (ne lehessen ugyanazzal a névvel és címmel duplikált boltot létrehozni)
        const storeExists = await pool.request()
            .input('StoreName', mssql.NVarChar, storeName)
            .input('StoreAddress', mssql.NVarChar, storeAddress)
            .query(`SELECT TOP 1 Id FROM Store WHERE Name = @StoreName AND Address = @StoreAddress`);
                
        if (storeExists.recordset.length > 0) { 
            return res.status(400).json({success: false, error: "Ez a bolt már létezik!"});
        }
        
        // A jelszót hash-eljük és Buffer formátumba konvertáljuk, hogy kompatibilis legyen a VarBinary adattípussal
        const hashedPass = await bcrypt.hash(password, 10);
        const bufferedPass = Buffer.from(hashedPass);
        
        // Csinálunk egy új FranchiseId-t kell generálnunk, mivel a Store táblában ez kötelező mező. Ez egy egyszerű lekérdezéssel megoldható, ahol megnézzük a jelenlegi maximum FranchiseId-t és hozzáadunk 1-et.
        const franchiseCheck = await pool.request().query(`
            SELECT ISNULL(MAX(FranchiseId), 0) + 1 AS NewId FROM Store
        `);
        const newFranchiseId = franchiseCheck.recordset[0].NewId;

        // Elvégezzük a tranzakciót, ahol először létrehozzuk a boltot, majd a hozzá tartozó menedzsert. Ha bármelyik lépés hibát dob, az egész tranzakció visszagördül.
        await pool.request()
            .input('Name', mssql.NVarChar, name)
            .input('Password', mssql.VarBinary, bufferedPass)
            .input('Email', mssql.NVarChar, emailFormatted)
            .input('Phone', mssql.NVarChar, phone)
            .input('DoB', mssql.Date, dob)
            .input('StoreName', mssql.NVarChar, storeName)
            .input('StoreAddress', mssql.NVarChar, storeAddress)
            .input('FranchiseId', mssql.Int, newFranchiseId)
            .query(`
                BEGIN TRANSACTION;
                BEGIN TRY
                    -- Step A: Create the Store with the new FranchiseId
                    INSERT INTO Store (Name, Address, FranchiseId) 
                    VALUES (@StoreName, @StoreAddress, @FranchiseId);

                    -- Step B: Grab the ID of the store we literally just created
                    DECLARE @NewStoreId INT = SCOPE_IDENTITY();
                    
                    -- Step C: Create the Owner (AuthLv 1) and link them to the Store & Franchise
                    -- We explicitly set Currency to 'HUF' and IsActive to 1 to match the new schema
                    INSERT INTO Employee (
                        StoreId, FranchiseId, AuthLv, Password, Name, Email, Phone, DoB, HiredAt, Currency, IsActive
                    ) VALUES (
                        @NewStoreId, 
                        @FranchiseId,
                        1, 
                        @Password, 
                        @Name, 
                        @Email, 
                        @Phone, 
                        @DoB, 
                        GETDATE(), 
                        'HUF', 
                        1
                    );
                    
                    COMMIT TRANSACTION;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            `);

        res.status(201).json({success: true, message: "Menedzseri fiók elkészítve!"});
        
    } catch (err) {
        console.error("Register Error:", err); 
        res.status(500).json({success: false, error: "Hiba történt a regisztráció során!"});
    } finally {
        if (pool) await pool.close();
    }
});

//Regisztráció alkalmazottnak -> Csak a Menedzser(ek) tudják ezt elérni!!
router.post('/Register/Employee', async (req, res) => {
    let pool;
    try{
        const {name, email, phone, dob, salary, authName, creatorId} = req.body
        const emailFormatted = email.toLowerCase().trim()

        const pool = await mssql.connect(config)

        const exists = await pool.request()
            .input('Email', mssql.NVarChar, emailFormatted)
            .query(`SELECT TOP 1 Email FROM Employee
                WHERE Email = @Email`)
        
        // Ha nincs ilyen email a rendszerben, akkor létrehozzuk a fiókot, egyébként hibával visszajelzünk
        if(exists.recordset.length < 1){
            const hashedPass = await bcrypt.hash(dob, 10);
            const bufferedPass = Buffer.from(hashedPass);

            await pool.request()
            .input('Name', mssql.NVarChar, name)
            .input('Password', mssql.VarBinary, bufferedPass)
            .input('Email', mssql.NVarChar, emailFormatted)
            .input('Phone', mssql.NVarChar, phone)
            .input('DoB', mssql.Date, dob)
            .input('Salary', mssql.Int, salary)
            .input('AuthName', mssql.NVarChar, authName)
            .input('CreatorId', mssql.Int, creatorId)
            .query(`BEGIN TRANSACTION
                BEGIN TRY
                    INSERT INTO Employee(StoreId, AuthLv, Password, Name, Email, Phone, DoB, HiredAt, Salary, FirstLogin) VALUES
                        ((SELECT StoreId FROM Employee WHERE Id = @CreatorId),
                        (SELECT Id FROM AuthLevel WHERE Position = @AuthName),
                        @Password, @Name, @Email, @Phone, @DoB, GETDATE(), @Salary, 1);
                    
                    COMMIT TRANSACTION;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH`)

            res.status(201).json({success: true, message: "Új fiók elkészítve!"})
        }
        else{
            res.status(400).json({success: false, error: "Ez az email már használatban van!"})
        }
    }
    catch(err){
        res.status(500).json({success: false, error: "Szerver hiba történt!"})
    }
    finally{
        if (pool) await pool.close()
    }
})

//Belépés a fiókba
router.post('/Login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const pool = await mssql.connect(config);

        const result = await pool.request()
            .input('Email', mssql.NVarChar, email.toLowerCase().trim())
            .query(`SELECT TOP 1 Id, Name, Email, Password, AuthLv, StoreId, FranchiseId FROM Employee WHERE Email = @Email`);

        const user = result.recordset[0]; // recordset[0] kell, nem a teljes tömb

        if (user) {
            const storedPass = user.Password.toString('utf-8');
            //const storedPass = user.Password.toString('hex').toLowerCase(); // Teszteléshez egyszerűsített konverzió            
            const matches = await bcrypt.compare(password, storedPass);
            /*
            //Teszteléshez részletes debug logok a jelszó ellenőrzéshez
            console.log("--- DEBUG LOG ---");
            console.log("A beírt (password):", password);
            console.log("Típusa:", typeof password);
            console.log("DB Buffer (raw):", user.Password);
            console.log("DB Hex stringként:", user.Password.toString('hex'));
            console.log("DB UTF8 stringként:", user.Password.toString('utf-8'));
            */
            
            if ( matches/*storedPass === password*/) { // Egyszerűsített ellenőrzés, csak teszteléshez!
                const token = jwt.sign({
                    UserId: user.Id, 
                    AuthLv: user.AuthLv,
                    StoreId: user.StoreId,
                    FranchiseId: user.FranchiseId,
                    Email: user.Email,
                    Name: user.Name
                }, jwt_secretKey, { expiresIn: '2h' });

                return res.status(200).json({ success: true, token, user });
            }
        }
        res.status(401).json({ success: false, error: "Hibás adatok!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

//Jelszó változtatás fiókokra
router.patch('/UpdatePassword', authenticationToken, async (req, res) => {
    let pool;
    try {
        // Mindkét jelszót megköveteljük a kérésben
        const { oldPassword, newPassword } = req.body;
        
        // Kivesszük a userId-t a tokenből, hogy tudjuk, melyik fiók jelszavát akarjuk megváltoztatni. Ez lehet Id vagy UserId, attól függően, hogy a token létrehozásakor milyen kulccsal tettük bele. A biztonság kedvéért mindkettőt megpróbáljuk.
        const userId = req.user.Id || req.user.UserId; 

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ success: false, error: "Kérlek add meg a jelenlegi és az új jelszót is!" });
        }

        const passwordFormatCheck = validator.isStrongPassword(newPassword)
        if(!passwordFormatCheck)
            return res.status(403).json({ success: false, error: `Nem elég erős a jelszava! A jelszónak 8 karakter hosszúnak kell lennie, és tartalmaznia kell: 
        1 kisbetűt, 1 nagybetűt, 1 számot, 1 szimbólumot`});

        pool = await mssql.connect(config);

        // Lekerjük a jelenlegi jelszót a DB-ből, hogy össze tudjuk hasonlítani a beírt 'oldPassword'-dal. Itt feltételezzük, hogy a tokenben szereplő userId alapján azonosítjuk a felhasználót.
        const userRes = await pool.request()
            .input('Id', mssql.Int, userId)
            .query(`SELECT Password FROM Employee WHERE Id = @Id`);

        if (userRes.recordset.length === 0) {
            return res.status(404).json({ success: false, error: "Felhasználó nem található!" });
        }

        const user = userRes.recordset[0];

        // Összehasonlítjuk a beírt 'oldPassword'-t a DB-ben tárolt jelszóval. Mivel a jelszó hash-elve van, használjuk a bcrypt.compare-t, ami kezeli a hash-elést és az összehasonlítást is. Előtte konvertáljuk a Buffer-ben tárolt jelszót stringgé, hogy a bcrypt tudja értelmezni.
        const storedPass = user.Password.toString('utf-8');
        const isMatch = await bcrypt.compare(oldPassword, storedPass);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: "A jelenlegi jelszó helytelen." });
        }

        // Ha minden rendben van, akkor hash-eljük az új jelszót és konvertáljuk Buffer formátumba a DB-hez való kompatibilitás miatt.
        const hashedPass = await bcrypt.hash(newPassword, 10);
        const bufferedPass = Buffer.from(hashedPass);

        // Elmentjük a jelszó frissítését a DB-ben.
        await pool.request()
            .input('Id', mssql.Int, userId)
            .input('NewPassword', mssql.VarBinary, bufferedPass)
            .query(`
                UPDATE Employee 
                SET Password = @NewPassword
                WHERE Id = @Id
            `);

        res.status(200).json({ success: true, message: "Jelszó sikeresen módosítva!" });
        
    } catch (err) {
        console.error("Password Update Error:", err);
        res.status(500).json({ success: false, error: "Szerver hiba történt!" });
    } finally {
        if (pool) await pool.close();
    }
});

//
router.delete('/', authenticationToken, async (req, res) => {
    let pool;
    try {
        const { email } = req.body
        const { authLv, email: managerEmail } = req.user

        const pool = await mssql.connect(config)

        const targetResult = await pool.request()
            .input('Email', mssql.NVarChar, email)
            .query('SELECT Id, AuthLv, StoreId FROM Employee WHERE Email = @Email')

        const target = targetResult.recordset[0]

        if (!target) {
            return res.status(404).json({success: false, error: "A keresett alkalmazott nem található!"})
        }

        const isSelfDelete = (email === managerEmail)
        const isHigherRank = (authLv < target.AuthLv)

        if (!isSelfDelete && !isHigherRank) {
            return res.status(403).json({ 
                success: false, 
                error: "Nincs jogosultságod más menedzserek vagy felettesek törlésére!" 
            })
        }
        await pool.request()
            .input('Id', mssql.Int, target.Id)
            .query('UPDATE Employee SET IsActive = 0 WHERE Id = @Id')

        res.status(200).json({ 
            success: true, 
            message: isSelfDelete ? "Fiókod sikeresen deaktiválva." : "Alkalmazott deaktiválva." 
        })

    } catch (err) {
        res.status(500).json({ success: false, error: "Szerver hiba történt!" });
    } finally {
        if (pool) await pool.close();
    }
})

router.patch('/Reactivate', authenticationToken, async (req, res) => {
    try {
        const { email } = req.body;
        const { authLv, userId } = req.user;

        // Csak Menedzser vagy Tulajdonos (AuthLv <= 3) hozhat vissza embert
        if (authLv > 3) {
            return res.status(403).json({ success: false, error: "Nincs jogosultságod fiókok visszaállítására!" });
        }

        const pool = await mssql.connect(config);
        
        // Visszaállítás, de csak a saját boltján belül!
        const result = await pool.request()
            .input('Email', mssql.NVarChar, email)
            .input('ManagerId', mssql.Int, userId)
            .query(`
                UPDATE Employee 
                SET IsActive = 1 
                WHERE Email = @Email 
                AND StoreId = (SELECT StoreId FROM Employee WHERE Id = @ManagerId)
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: "Nem található ilyen deaktivált alkalmazott a boltodban!" });
        }

        res.status(200).json({ success: true, message: "Fiók sikeresen újraaktiválva!" });

    } catch (err) {
        res.status(500).json({ success: false, error: "Hiba a visszaállítás során!" });
    } finally {
        if (pool) await pool.close();
    }
});
module.exports = router;