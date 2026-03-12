use master
GO

CREATE DATABASE AssetHubDb
GO

USE AssetHubDb
GO

-- 1. Tables with no dependencies
-- A térkép layout-ja
CREATE TABLE Map (
    Id INT PRIMARY KEY,
    Width SMALLINT,
    Height SMALLINT
);
-- Autentikáció szintjei felhasználóknál
CREATE TABLE AuthLevel (
    Id INT PRIMARY KEY,
    Position NVARCHAR(30),
    Description NVARCHAR(100)
);
-- Termék kategóriák
CREATE TABLE ProductCategory (
    Id INT PRIMARY KEY,
    Name NVARCHAR(30)
);
-- Bútorok a térképen
CREATE TABLE Furniture (
    Id INT PRIMARY KEY,
    Name NVARCHAR(50),
    Width SMALLINT,
    Height SMALLINT
);

-- 2. Tables with single-level dependencies
-- A fõ tábla 
CREATE TABLE Store (
    Id INT PRIMARY KEY,
    MapId INT,
    Name NVARCHAR(100),
    Address NVARCHAR(100),
    FOREIGN KEY (MapId) REFERENCES Map(Id)
);
-- termékek
CREATE TABLE Product (
    Id INT PRIMARY KEY,
    CategoryId INT,
    Name NVARCHAR(200),
    Brand NVARCHAR(50),
    Unit NVARCHAR(10),
    FOREIGN KEY (CategoryId) REFERENCES ProductCategory(Id)
);

-- 3. Tables depending on Store and Product
-- alkalmazottak listája és a bejelentkezési adataik
CREATE TABLE Employee (
    Id INT PRIMARY KEY,
    StoreId INT,
    AuthLv INT,
    Password VARBINARY(255),
    Name NVARCHAR(100),
    Email NVARCHAR(50),
    Phone NVARCHAR(15),
    DoB DATETIME,
    HiredAt DATETIME,
    Salary INT,
    FOREIGN KEY (StoreId) REFERENCES Store(Id),
    FOREIGN KEY (AuthLv) REFERENCES AuthLevel(Id)
);
-- raktárban lévõ készlet és eladásaik 
CREATE TABLE StoreInventory (
    Id INT PRIMARY KEY,
    StoreId INT,
    ProductId INT,
    Price INT,
    Description NVARCHAR(300),
    Stock DECIMAL(18, 2),
    Sold DECIMAL(18, 2),
    ImagePath NVARCHAR(150),
    FOREIGN KEY (StoreId) REFERENCES Store(Id),
    FOREIGN KEY (ProductId) REFERENCES Product(Id)
);

-- 4. Map and Furniture placement
-- a térképen lévõ bútorok elhelyeszkedése
CREATE TABLE MapContent (
    Id INT PRIMARY KEY,
    MapId INT,
    FurnitureId INT,
    CoordX INT,
    CoordY INT,
    FOREIGN KEY (MapId) REFERENCES Map(Id),
    FOREIGN KEY (FurnitureId) REFERENCES Furniture(Id)
);

-- 5. Final transactional and content tables
-- eladások
CREATE TABLE Sales (
    Id INT PRIMARY KEY,
    InventoryId INT,
    EmployeeId INT,
    PaymentMethod NVARCHAR(20),
    PriceAtSale INT,
    TimeSold DATETIME,
    Quantity DECIMAL(18, 2),
    FOREIGN KEY (InventoryId) REFERENCES StoreInventory(Id),
    FOREIGN KEY (EmployeeId) REFERENCES Employee(Id)
);
-- bútorok tartalma
CREATE TABLE FurnitureContent (
    Id INT PRIMARY KEY,
    MapContentId INT,
    StoreInvId INT,
    FOREIGN KEY (MapContentId) REFERENCES MapContent(Id),
    FOREIGN KEY (StoreInvId) REFERENCES StoreInventory(Id)
);