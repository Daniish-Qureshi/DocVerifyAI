const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const connectDB = async () => {
  try {
    await pool.query('SELECT 1')
    console.log('✅ PostgreSQL Connected!')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar VARCHAR(500) DEFAULT '',
        plan VARCHAR(50) DEFAULT 'free',
        total_scans INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS scans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        filename VARCHAR(500) NOT NULL,
        image_url VARCHAR(500) DEFAULT '',
        verdict VARCHAR(50) NOT NULL CHECK (verdict IN ('AUTHENTIC', 'SUSPICIOUS', 'FRAUDULENT')),
        confidence NUMERIC NOT NULL,
        fraud_score NUMERIC DEFAULT 0,
        document_type VARCHAR(255) DEFAULT 'Unknown',
        summary TEXT DEFAULT '',
        flags JSONB DEFAULT '[]',
        analyses JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    console.log('✅ Tables ready!')
  } catch (error) {
    console.error('❌ DB Error:', error.message)
    process.exit(1)
  }
}

module.exports = { pool, connectDB }