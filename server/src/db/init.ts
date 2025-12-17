import { getPool } from './connection.js';

export async function initDatabase() {
  const connection = await getPool().getConnection();
  
  try {
    // Create tables if not exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        role ENUM('operator', 'supervisor', 'admin') NOT NULL DEFAULT 'operator',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_role (user_id, role)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS weight_units (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(50) NOT NULL,
        symbol VARCHAR(10) NOT NULL,
        decimal_precision INT DEFAULT 3,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(36) PRIMARY KEY,
        reference VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        target_weight DECIMAL(10,3) NOT NULL,
        tolerance_min DECIMAL(10,3) NOT NULL,
        tolerance_max DECIMAL(10,3) NOT NULL,
        weight_unit_id VARCHAR(36),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (weight_unit_id) REFERENCES weight_units(id)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS production_lines (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        scale_url VARCHAR(255),
        photocell_url VARCHAR(255),
        weight_unit_id VARCHAR(36),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (weight_unit_id) REFERENCES weight_units(id)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS terminals (
        id VARCHAR(36) PRIMARY KEY,
        device_uid VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        line_id VARCHAR(36),
        ip_address VARCHAR(45),
        is_online BOOLEAN DEFAULT FALSE,
        last_ping TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (line_id) REFERENCES production_lines(id)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS production_tasks (
        id VARCHAR(36) PRIMARY KEY,
        line_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        operator_id VARCHAR(36),
        target_quantity INT NOT NULL,
        produced_quantity INT DEFAULT 0,
        status ENUM('pending', 'in_progress', 'paused', 'completed', 'cancelled') DEFAULT 'pending',
        started_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (line_id) REFERENCES production_lines(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (operator_id) REFERENCES users(id)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS production_items (
        id VARCHAR(36) PRIMARY KEY,
        task_id VARCHAR(36) NOT NULL,
        sequence INT NOT NULL,
        weight DECIMAL(10,3) NOT NULL,
        status ENUM('valid', 'underweight', 'overweight') NOT NULL,
        captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES production_tasks(id)
      )
    `);

    // Insert default weight unit if none exists
    const [units] = await connection.execute('SELECT COUNT(*) as count FROM weight_units');
    if ((units as any)[0].count === 0) {
      const { v4: uuidv4 } = await import('uuid');
      await connection.execute(
        'INSERT INTO weight_units (id, code, name, symbol, decimal_precision, is_default) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), 'KG', 'Kilogramme', 'kg', 3, true]
      );
    }

    console.log('Database initialized successfully');
  } finally {
    connection.release();
  }
}
