//Csomagokat behozzuk
require('dotenv')
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

router.put('/UpdateProfile', authenticationToken, async (req, res) => {
    try {
        const userId = req.user.UserId;
        const { email, phone } = req.body;

        const pool = await mssql.connect(config);

        // Check if email is already taken by someone else
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
    let pool; // Moved outside so the 'finally' block can always close the connection
    
    try {
        const {name, password, email, phone, dob, storeName, storeAddress} = req.body;
        const emailFormatted = email.toLowerCase().trim();

        pool = await mssql.connect(config);

        // 1. Check if the email is already registered
        const accountExists = await pool.request()
            .input('Email', mssql.NVarChar, emailFormatted)
            .query(`SELECT TOP 1 Id FROM Employee WHERE Email = @Email`);

        if (accountExists.recordset.length > 0) { 
            return res.status(400).json({success: false, error: "Ez az email már használatban van!"});
        }

        // 2. Check if the store name and address already exist
        const storeExists = await pool.request()
            .input('StoreName', mssql.NVarChar, storeName)
            .input('StoreAddress', mssql.NVarChar, storeAddress)
            .query(`SELECT TOP 1 Id FROM Store WHERE Name = @StoreName AND Address = @StoreAddress`);
                
        if (storeExists.recordset.length > 0) { 
            return res.status(400).json({success: false, error: "Ez a bolt már létezik!"});
        }
        
        // 3. Hash the password for the database
        const hashedPass = await bcrypt.hash(password, 10);
        const bufferedPass = Buffer.from(hashedPass);
        
        // 4. Generate a brand new FranchiseId for this new company
        const franchiseCheck = await pool.request().query(`
            SELECT ISNULL(MAX(FranchiseId), 0) + 1 AS NewId FROM Store
        `);
        const newFranchiseId = franchiseCheck.recordset[0].NewId;

        // 5. Execute the Transaction (Insert Store -> Get StoreId -> Insert Employee)
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
    try{
        const {name, email, phone, dob, salary, authName, creatorId} = req.body
        const emailFormatted = email.toLowerCase().trim()

        const pool = await mssql.connect(config)

        const exists = await pool.request()
            .input('Email', mssql.NVarChar, emailFormatted)
            .query(`SELECT TOP 1 Email FROM Employee
                WHERE Email = @Email`)
        
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
            console.log("--- DEBUG LOGIN ---");
            console.log("Amit beírtál (password):", password);
            console.log("Típusa:", typeof password);
            console.log("DB Buffer (raw):", user.Password);
            console.log("DB Hex stringként:", user.Password.toString('hex'));
            console.log("DB UTF8 stringként:", user.Password.toString('utf-8'));
            */
            
            if ( matches/*storedPass === password*/) { // Egyszerűsített ellenőrzés, csak teszteléshez!
                const token = jwt.sign({
                    UserId: user.Id, // Figyelj, hogy UserId vagy Id a kulcs!
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
    try {
        // 1. Grab BOTH passwords from the frontend request
        const { currentPassword, newPassword } = req.body;
        
        // 2. Extract the ID securely from your JWT middleware
        // (Note: Check if your token payload uses 'Id' or 'UserId')
        const userId = req.user.Id || req.user.UserId; 

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: "Kérlek add meg a jelenlegi és az új jelszót is!" });
        }

        pool = await mssql.connect(config);

        // 3. Get the user's current hashed password from the database
        const userRes = await pool.request()
            .input('Id', mssql.Int, userId)
            .query(`SELECT Password FROM Employee WHERE Id = @Id`);

        if (userRes.recordset.length === 0) {
            return res.status(404).json({ success: false, error: "Felhasználó nem található!" });
        }

        const user = userRes.recordset[0];

        // 4. Compare the typed 'currentPassword' with the one in the database
        const storedPass = user.Password.toString('utf-8');
        const isMatch = await bcrypt.compare(currentPassword, storedPass);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: "A jelenlegi jelszó helytelen." });
        }

        // 5. If it matches, hash the NEW password and convert it to a Buffer
        const hashedPass = await bcrypt.hash(newPassword, 10);
        const bufferedPass = Buffer.from(hashedPass);

        // 6. Save the new password to the database
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