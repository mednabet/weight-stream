-- =============================================================================
-- PRODUCTION LINE MANAGER - MULTI-DATABASE SCHEMA
-- Compatible with: PostgreSQL, MySQL, SQL Server
-- =============================================================================
-- 
-- INSTRUCTIONS:
-- 1. Choose the appropriate section for your database system
-- 2. Run the corresponding CREATE statements
-- 3. Adjust data types if needed for your specific version
--
-- =============================================================================

-- #############################################################################
-- ## POSTGRESQL SCHEMA
-- #############################################################################

-- ======================== PostgreSQL: User Roles ============================
/*
-- Create enum for roles
CREATE TYPE app_role AS ENUM ('operator', 'supervisor', 'admin');

-- User roles table
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'operator',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Weight units table
CREATE TABLE weight_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    decimal_precision INTEGER NOT NULL DEFAULT 3,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    target_weight DECIMAL(18,4) NOT NULL,
    tolerance_min DECIMAL(18,4) NOT NULL,
    tolerance_max DECIMAL(18,4) NOT NULL,
    weight_unit_id UUID REFERENCES weight_units(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Production lines table
CREATE TABLE production_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scale_url VARCHAR(500),
    photocell_url VARCHAR(500),
    weight_unit_id UUID REFERENCES weight_units(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Terminals table
CREATE TABLE terminals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_uid VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    line_id UUID REFERENCES production_lines(id) UNIQUE,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    last_ping TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Production tasks table
CREATE TABLE production_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_id UUID NOT NULL REFERENCES production_lines(id),
    product_id UUID NOT NULL REFERENCES products(id),
    operator_id UUID,
    target_quantity INTEGER NOT NULL,
    produced_quantity INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Production items table
CREATE TABLE production_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES production_tasks(id),
    sequence INTEGER NOT NULL,
    weight DECIMAL(18,4) NOT NULL,
    status VARCHAR(50) NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_products_reference ON products(reference);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_production_tasks_line ON production_tasks(line_id);
CREATE INDEX idx_production_tasks_status ON production_tasks(status);
CREATE INDEX idx_production_items_task ON production_items(task_id);
CREATE INDEX idx_production_items_status ON production_items(status);
*/


-- #############################################################################
-- ## MYSQL SCHEMA
-- #############################################################################

-- ======================== MySQL: Tables =====================================
/*
-- User roles table
CREATE TABLE user_roles (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    role ENUM('operator', 'supervisor', 'admin') NOT NULL DEFAULT 'operator',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_role (user_id, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Weight units table
CREATE TABLE weight_units (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    code VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    decimal_precision INT NOT NULL DEFAULT 3,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products table
CREATE TABLE products (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    reference VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    target_weight DECIMAL(18,4) NOT NULL,
    tolerance_min DECIMAL(18,4) NOT NULL,
    tolerance_max DECIMAL(18,4) NOT NULL,
    weight_unit_id CHAR(36),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_reference (reference),
    FOREIGN KEY (weight_unit_id) REFERENCES weight_units(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Production lines table
CREATE TABLE production_lines (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scale_url VARCHAR(500),
    photocell_url VARCHAR(500),
    weight_unit_id CHAR(36),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (weight_unit_id) REFERENCES weight_units(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Terminals table
CREATE TABLE terminals (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    device_uid VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    line_id CHAR(36),
    is_online TINYINT(1) NOT NULL DEFAULT 0,
    last_ping TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_device_uid (device_uid),
    UNIQUE KEY uk_line_id (line_id),
    FOREIGN KEY (line_id) REFERENCES production_lines(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Production tasks table
CREATE TABLE production_tasks (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    line_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    operator_id CHAR(36),
    target_quantity INT NOT NULL,
    produced_quantity INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (line_id) REFERENCES production_lines(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Production items table
CREATE TABLE production_items (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    task_id CHAR(36) NOT NULL,
    sequence INT NOT NULL,
    weight DECIMAL(18,4) NOT NULL,
    status VARCHAR(50) NOT NULL,
    captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES production_tasks(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create indexes
CREATE INDEX idx_products_reference ON products(reference);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_production_tasks_line ON production_tasks(line_id);
CREATE INDEX idx_production_tasks_status ON production_tasks(status);
CREATE INDEX idx_production_items_task ON production_items(task_id);
CREATE INDEX idx_production_items_status ON production_items(status);
*/


-- #############################################################################
-- ## SQL SERVER SCHEMA
-- #############################################################################

-- ======================== SQL Server: Tables ================================
/*
-- User roles table
CREATE TABLE user_roles (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    role NVARCHAR(20) NOT NULL DEFAULT 'operator' CHECK (role IN ('operator', 'supervisor', 'admin')),
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT uk_user_role UNIQUE (user_id, role)
);

-- Weight units table
CREATE TABLE weight_units (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    code NVARCHAR(10) NOT NULL,
    name NVARCHAR(100) NOT NULL,
    symbol NVARCHAR(10) NOT NULL,
    decimal_precision INT NOT NULL DEFAULT 3,
    is_default BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT uk_weight_units_code UNIQUE (code)
);

-- Products table
CREATE TABLE products (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    reference NVARCHAR(100) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    target_weight DECIMAL(18,4) NOT NULL,
    tolerance_min DECIMAL(18,4) NOT NULL,
    tolerance_max DECIMAL(18,4) NOT NULL,
    weight_unit_id UNIQUEIDENTIFIER,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT uk_products_reference UNIQUE (reference),
    CONSTRAINT fk_products_weight_unit FOREIGN KEY (weight_unit_id) REFERENCES weight_units(id)
);

-- Production lines table
CREATE TABLE production_lines (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    scale_url NVARCHAR(500),
    photocell_url NVARCHAR(500),
    weight_unit_id UNIQUEIDENTIFIER,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_lines_weight_unit FOREIGN KEY (weight_unit_id) REFERENCES weight_units(id)
);

-- Terminals table
CREATE TABLE terminals (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    device_uid NVARCHAR(100) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    ip_address NVARCHAR(45),
    line_id UNIQUEIDENTIFIER,
    is_online BIT NOT NULL DEFAULT 0,
    last_ping DATETIME2,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT uk_terminals_device_uid UNIQUE (device_uid),
    CONSTRAINT uk_terminals_line_id UNIQUE (line_id),
    CONSTRAINT fk_terminals_line FOREIGN KEY (line_id) REFERENCES production_lines(id)
);

-- Production tasks table
CREATE TABLE production_tasks (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    line_id UNIQUEIDENTIFIER NOT NULL,
    product_id UNIQUEIDENTIFIER NOT NULL,
    operator_id UNIQUEIDENTIFIER,
    target_quantity INT NOT NULL,
    produced_quantity INT NOT NULL DEFAULT 0,
    status NVARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at DATETIME2,
    completed_at DATETIME2,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_tasks_line FOREIGN KEY (line_id) REFERENCES production_lines(id),
    CONSTRAINT fk_tasks_product FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Production items table
CREATE TABLE production_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    task_id UNIQUEIDENTIFIER NOT NULL,
    sequence INT NOT NULL,
    weight DECIMAL(18,4) NOT NULL,
    status NVARCHAR(50) NOT NULL,
    captured_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_items_task FOREIGN KEY (task_id) REFERENCES production_tasks(id)
);

-- Create indexes
CREATE INDEX idx_products_reference ON products(reference);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_production_tasks_line ON production_tasks(line_id);
CREATE INDEX idx_production_tasks_status ON production_tasks(status);
CREATE INDEX idx_production_items_task ON production_items(task_id);
CREATE INDEX idx_production_items_status ON production_items(status);
*/


-- #############################################################################
-- ## SEED DATA (Compatible with all databases - adjust syntax as needed)
-- #############################################################################

-- Default weight units (PostgreSQL syntax - adapt for other DBs)
/*
INSERT INTO weight_units (code, name, symbol, decimal_precision, is_default) VALUES
('g', 'Gramme', 'g', 1, true),
('kg', 'Kilogramme', 'kg', 3, false),
('lb', 'Livre', 'lb', 3, false),
('oz', 'Once', 'oz', 2, false);
*/
