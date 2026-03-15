use master
GO

CREATE DATABASE AssetHubDb
GO

USE AssetHubDb
GO

-- 1. Tables with no dependencies
-- A t�rk�p layout-ja
CREATE TABLE Map (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Width SMALLINT,
    Height SMALLINT
);
-- Autentik�ci� szintjei felhaszn�l�kn�l
CREATE TABLE AuthLevel (
    Id INT PRIMARY KEY,
    Position NVARCHAR(30),
    Description NVARCHAR(100)
);
-- Term�k kateg�ri�k
CREATE TABLE ProductCategory (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(30)
);
-- B�torok a t�rk�pen
CREATE TABLE Furniture (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(50),
    Width SMALLINT,
    Height SMALLINT
);

-- 2. Tables with single-level dependencies
-- A f� t�bla 
CREATE TABLE Store (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    MapId INT,
    Name NVARCHAR(100),
    Address NVARCHAR(100),
    FOREIGN KEY (MapId) REFERENCES Map(Id)
);
-- term�kek
CREATE TABLE Product (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CategoryId INT,
    Name NVARCHAR(200),
    Brand NVARCHAR(50),
    Unit NVARCHAR(10),
    FOREIGN KEY (CategoryId) REFERENCES ProductCategory(Id)
);

-- 3. Tables depending on Store and Product
-- alkalmazottak list�ja �s a bejelentkez�si adataik
CREATE TABLE Employee (
    Id INT IDENTITY(1,1) PRIMARY KEY,
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
-- rakt�rban l�v� k�szlet �s elad�saik 
CREATE TABLE StoreInventory (
    Id INT IDENTITY(1,1) PRIMARY KEY,
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
-- a t�rk�pen l�v� b�torok elhelyeszked�se
CREATE TABLE MapContent (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    MapId INT,
    FurnitureId INT,
    CoordX INT,
    CoordY INT,
    FOREIGN KEY (MapId) REFERENCES Map(Id),
    FOREIGN KEY (FurnitureId) REFERENCES Furniture(Id)
);

-- 5. Final transactional and content tables
-- elad�sok
CREATE TABLE Sales (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    InventoryId INT,
    EmployeeId INT,
    PaymentMethod NVARCHAR(20),
    PriceAtSale INT,
    TimeSold DATETIME,
    Quantity DECIMAL(18, 2),
    FOREIGN KEY (InventoryId) REFERENCES StoreInventory(Id),
    FOREIGN KEY (EmployeeId) REFERENCES Employee(Id)
);
-- b�torok tartalma
CREATE TABLE FurnitureContent (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    MapContentId INT,
    StoreInvId INT,
    FOREIGN KEY (MapContentId) REFERENCES MapContent(Id),
    FOREIGN KEY (StoreInvId) REFERENCES StoreInventory(Id)
);