import { getPool } from './connection.js';

export async function initDatabase() {
  const conn = await getPool().getConnection();

  try {
    // Create tables if not exist (MySQL syntax)

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        role ENUM('operator', 'supervisor', 'admin') NOT NULL DEFAULT 'operator',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_role (user_id, role),
        CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS weight_units (
        id CHAR(36) PRIMARY KEY,
        code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(50) NOT NULL,
        symbol VARCHAR(10) NOT NULL,
        decimal_precision INT DEFAULT 3,
        is_default BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id CHAR(36) PRIMARY KEY,
        reference VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        target_weight DECIMAL(10,3) NOT NULL,
        tolerance_min DECIMAL(10,3) NOT NULL,
        tolerance_max DECIMAL(10,3) NOT NULL,
        weight_unit_id CHAR(36),
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_products_weight_unit FOREIGN KEY (weight_unit_id) REFERENCES weight_units(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS production_lines (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        scale_url VARCHAR(255),
        weight_unit_id CHAR(36),
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_lines_weight_unit FOREIGN KEY (weight_unit_id) REFERENCES weight_units(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS terminals (
        id CHAR(36) PRIMARY KEY,
        device_uid VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        line_id CHAR(36),
        ip_address VARCHAR(45),
        is_online BOOLEAN DEFAULT FALSE,
        last_ping DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_terminals_line FOREIGN KEY (line_id) REFERENCES production_lines(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS production_tasks (
        id CHAR(36) PRIMARY KEY,
        line_id CHAR(36) NOT NULL,
        product_id CHAR(36) NOT NULL,
        operator_id CHAR(36),
        target_quantity INT NOT NULL,
        produced_quantity INT DEFAULT 0,
        status ENUM('pending', 'in_progress', 'paused', 'completed', 'cancelled') DEFAULT 'pending',
        started_at DATETIME NULL,
        completed_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_tasks_line FOREIGN KEY (line_id) REFERENCES production_lines(id),
        CONSTRAINT fk_tasks_product FOREIGN KEY (product_id) REFERENCES products(id),
        CONSTRAINT fk_tasks_operator FOREIGN KEY (operator_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS production_items (
        id CHAR(36) PRIMARY KEY,
        task_id CHAR(36) NOT NULL,
        sequence INT NOT NULL,
        weight DECIMAL(10,3) NOT NULL,
        status ENUM('conforme', 'non_conforme') NOT NULL,
        captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_items_task FOREIGN KEY (task_id) REFERENCES production_tasks(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Insert default weight unit if none exists
    const [rows]: any = await conn.query('SELECT COUNT(*) as count FROM weight_units');
    if (parseInt(rows[0].count) === 0) {
      const { v4: uuidv4 } = await import('uuid');
      await conn.query(
        'INSERT INTO weight_units (id, code, name, symbol, decimal_precision, is_default) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), 'KG', 'Kilogramme', 'kg', 3, true]
      );
    }

    console.log('Database initialized successfully (MySQL)');
  } finally {
    conn.release();
  }
}
