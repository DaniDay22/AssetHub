use master
GO

CREATE DATABASE AssetHubDb
GO

USE AssetHubDb
GO

-- Autentikáció szintjei felhasználóknál
CREATE TABLE AuthLevel (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Position NVARCHAR(30) NOT NULL,
    Description NVARCHAR(100) NOT NULL
);

-- Termék kategóriák
CREATE TABLE ProductCategory (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(30) NOT NULL
);

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
    CONSTRAINT FK_ProductCategory_Product FOREIGN KEY (CategoryId) REFERENCES ProductCategory(Id)
);

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
    Salary INT NULL,
    Currency NVARCHAR(3) DEFAULT 'HUF',
    IsActive BIT DEFAULT 1,
    CONSTRAINT FK_Store_Employee FOREIGN KEY (StoreId) REFERENCES Store(Id),
    CONSTRAINT FK_AuthLevel_Employee FOREIGN KEY (AuthLv) REFERENCES AuthLevel(Id)
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
    CONSTRAINT FK_Store_StoreInventory FOREIGN KEY (StoreId) REFERENCES Store(Id),
    CONSTRAINT FK_Product_StoreInventory FOREIGN KEY (ProductId) REFERENCES Product(Id)
);

-- eladások
CREATE TABLE Sales (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    InventoryId INT NOT NULL,
    EmployeeId INT NOT NULL,
    PaymentMethod NVARCHAR(20) NOT NULL,
    PriceAtSale INT NOT NULL,
    TimeSold DATETIME DEFAULT GETDATE(),
    Quantity DECIMAL(18, 2) NOT NULL,
    IsDeleted BIT NOT NULL DEFAULT 0,
    CONSTRAINT FK_StoreInventory_Sales FOREIGN KEY (InventoryId) REFERENCES StoreInventory(Id),
    CONSTRAINT FK_Employee_Sales FOREIGN KEY (EmployeeId) REFERENCES Employee(Id)
);