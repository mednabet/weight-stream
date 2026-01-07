import { getPool } from './connection.js';

export async function initDatabase() {
  const client = await getPool().connect();
  
  try {
    // Create enum type for roles if not exists
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE app_role AS ENUM ('operator', 'supervisor', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create enum type for task status if not exists
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'paused', 'completed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create enum type for item status if not exists
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE item_status AS ENUM ('valid', 'underweight', 'overweight');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create tables if not exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role app_role NOT NULL DEFAULT 'operator',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, role)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS weight_units (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(50) NOT NULL,
        symbol VARCHAR(10) NOT NULL,
        decimal_precision INT DEFAULT 3,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reference VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        target_weight DECIMAL(10,3) NOT NULL,
        tolerance_min DECIMAL(10,3) NOT NULL,
        tolerance_max DECIMAL(10,3) NOT NULL,
        weight_unit_id UUID REFERENCES weight_units(id),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS production_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        scale_url VARCHAR(255),
        photocell_url VARCHAR(255),
        weight_unit_id UUID REFERENCES weight_units(id),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS terminals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_uid VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        line_id UUID REFERENCES production_lines(id),
        ip_address VARCHAR(45),
        is_online BOOLEAN DEFAULT FALSE,
        last_ping TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS production_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        line_id UUID NOT NULL REFERENCES production_lines(id),
        product_id UUID NOT NULL REFERENCES products(id),
        operator_id UUID REFERENCES users(id),
        target_quantity INT NOT NULL,
        produced_quantity INT DEFAULT 0,
        status task_status DEFAULT 'pending',
        started_at TIMESTAMPTZ NULL,
        completed_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS production_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL REFERENCES production_tasks(id),
        sequence INT NOT NULL,
        weight DECIMAL(10,3) NOT NULL,
        status item_status NOT NULL,
        captured_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create updated_at trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Add triggers for updated_at on relevant tables
    const tablesWithUpdatedAt = ['users', 'weight_units', 'products', 'production_lines', 'terminals', 'production_tasks'];
    for (const table of tablesWithUpdatedAt) {
      await client.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
          BEFORE UPDATE ON ${table}
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    // Insert default weight unit if none exists
    const result = await client.query('SELECT COUNT(*) as count FROM weight_units');
    if (parseInt(result.rows[0].count) === 0) {
      await client.query(
        'INSERT INTO weight_units (code, name, symbol, decimal_precision, is_default) VALUES ($1, $2, $3, $4, $5)',
        ['KG', 'Kilogramme', 'kg', 3, true]
      );
    }

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}
