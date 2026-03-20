use master
GO

CREATE DATABASE AssetHubDb
GO

USE AssetHubDb
GO

-- Autentikáció szintjei felhasználóknál
CREATE TABLE AuthLevel (
    Id INT PRIMARY KEY,
    Position NVARCHAR(30) NOT NULL,
    Description NVARCHAR(100) NOT NULL
);
-- Termék kategóriák
CREATE TABLE ProductCategory (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(30) NOT NULL
);

-- 2. Tables with single-level dependencies
-- A fő tábla 
CREATE TABLE Store (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    FranchiseId INT NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Address NVARCHAR(100) NOT NULL,
);
-- termékek
CREATE TABLE Product (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CategoryId INT NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    Brand NVARCHAR(50) NOT NULL,
    Unit NVARCHAR(10) NOT NULL,
    FOREIGN KEY (CategoryId) REFERENCES ProductCategory(Id)
);

-- 3. Tables depending on Store and Product
-- alkalmazottak listája és a bejelentkezési adataik
CREATE TABLE Employee (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    StoreId INT NOT NULL,
    FranchiseId INT NOT NULL,
    AuthLv INT NOT NULL,
    Password VARBINARY(255) NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(50) NOT NULL,
    Phone NVARCHAR(15) NOT NULL,
    DoB DATE NOT NULL,
    HiredAt DATETIME DEFAULT GETDATE(),
    Salary INT NOT NULL,
    Currency NVARCHAR(3) NOT NULL,
    IsActive BIT DEFAULT 1,
    CONSTRAINT FK_Store_Employee FOREIGN KEY (StoreId) REFERENCES Store(Id),
    FOREIGN KEY (AuthLv) REFERENCES AuthLevel(Id)
);
-- raktárban lévő készlet és eladásaik 
CREATE TABLE StoreInventory (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    StoreId INT NOT NULL,
    ProductId INT NOT NULL,
    Price INT NOT NULL,
    Currency NVARCHAR(3) NOT NULL,
    Description NVARCHAR(300) NULL,
    Stock DECIMAL(18, 2) NOT NULL,
    Sold DECIMAL(18, 2) DEFAULT 0.00,
    IsDeleted BIT DEFAULT 0,
    FOREIGN KEY (StoreId) REFERENCES Store(Id),
    FOREIGN KEY (ProductId) REFERENCES Product(Id)
);

-- 4. Final transactional and content tables
-- eladások
CREATE TABLE Sales (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    InventoryId INT NOT NULL,
    EmployeeId INT NOT NULL,
    PaymentMethod NVARCHAR(20) NOT NULL,
    PriceAtSale INT NOT NULL,
    TimeSold DATETIME DEFAULT GETDATE(),
    Quantity DECIMAL(18, 2) NOT NULL,
    FOREIGN KEY (InventoryId) REFERENCES StoreInventory(Id),
    FOREIGN KEY (EmployeeId) REFERENCES Employee(Id)
);