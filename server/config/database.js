import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

// Create SQLite database connection
const db = new sqlite3.Database('./complaint_system.db', (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Promisify database methods for async/await usage
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

// Create a pool-like interface to match the MySQL implementation
export const pool = {
  async execute(query, params = []) {
    try {
      if (query.trim().toUpperCase().startsWith('SELECT')) {
        const rows = await dbAll(query, params);
        return [rows];
      } else {
        const result = await dbRun(query, params);
        return [{ insertId: result?.lastID, affectedRows: result?.changes || 0 }];
      }
    } catch (error) {
      throw error;
    }
  },
  
  async getConnection() {
    return {
      execute: this.execute,
      release: () => {} // No-op for SQLite
    };
  }
};

export const initDatabase = async () => {
  try {
    // Enable foreign keys
    await dbRun('PRAGMA foreign_keys = ON');
    
    // Users table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'citizen' CHECK (role IN ('citizen', 'admin', 'department_head')),
        department TEXT,
        phone TEXT,
        avatar TEXT,
        is_verified BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for users table
    await dbRun('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    
    // Departments table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        head_id INTEGER,
        performance_score INTEGER DEFAULT 0,
        avg_resolution_time REAL DEFAULT 0,
        total_resolved INTEGER DEFAULT 0,
        badges TEXT, -- JSON stored as TEXT
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (head_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // Create indexes for departments table
    await dbRun('CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_departments_performance ON departments(performance_score)');
    
    // Complaints table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        department_id INTEGER,
        priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
        status TEXT DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'In Review', 'Assigned', 'In Progress', 'Resolved', 'Closed')),
        user_id INTEGER,
        is_anonymous BOOLEAN DEFAULT 0,
        location_address TEXT,
        location_lat REAL,
        location_lng REAL,
        attachments TEXT, -- JSON stored as TEXT
        tags TEXT, -- JSON stored as TEXT
        sentiment TEXT DEFAULT 'Neutral' CHECK (sentiment IN ('Positive', 'Neutral', 'Negative')),
        urgency_keywords TEXT, -- JSON stored as TEXT
        ai_confidence REAL DEFAULT 0,
        estimated_resolution DATETIME,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      )
    `);
    
    // Create indexes for complaints table
    await dbRun('CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_complaints_department ON complaints(department_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_complaints_submitted_at ON complaints(submitted_at)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_complaints_location ON complaints(location_lat, location_lng)');
    
    // Complaint votes table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS complaint_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id INTEGER NOT NULL,
        user_id INTEGER,
        device_id TEXT,
        voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // Create unique constraints for complaint votes
    await dbRun('CREATE UNIQUE INDEX IF NOT EXISTS unique_user_vote ON complaint_votes(complaint_id, user_id) WHERE user_id IS NOT NULL');
    await dbRun('CREATE UNIQUE INDEX IF NOT EXISTS unique_device_vote ON complaint_votes(complaint_id, device_id) WHERE device_id IS NOT NULL');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_complaint_votes_complaint ON complaint_votes(complaint_id)');
    
    // Complaint updates table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS complaint_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id INTEGER NOT NULL,
        status TEXT CHECK (status IN ('Submitted', 'In Review', 'Assigned', 'In Progress', 'Resolved', 'Closed')),
        message TEXT,
        updated_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // Create indexes for complaint updates table
    await dbRun('CREATE INDEX IF NOT EXISTS idx_complaint_updates_complaint ON complaint_updates(complaint_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_complaint_updates_created_at ON complaint_updates(created_at)');
    
    // OTP verification table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        phone TEXT,
        otp TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        verified BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for OTP verification table
    await dbRun('CREATE INDEX IF NOT EXISTS idx_otp_email_otp ON otp_verifications(email, otp)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_verifications(expires_at)');
    
    // Insert default departments if they don't exist
    const departments = [
      ['Public Works', 'Infrastructure, utilities, roads, and general maintenance'],
      ['Police Department', 'Public safety, law enforcement, and emergency response'],
      ['Parks Department', 'Parks, recreation facilities, and green spaces'],
      ['Code Enforcement', 'Building codes, zoning, permits, and compliance'],
      ['Sanitation', 'Waste management, recycling, and cleaning services'],
      ['Fire Department', 'Fire safety, emergency response, and hazard management']
    ];
    
    for (const [name, description] of departments) {
      const existing = await dbGet('SELECT id FROM departments WHERE name = ?', [name]);
      if (!existing) {
        const performanceScore = Math.floor(Math.random() * 20) + 80; // Random score between 80-100
        await dbRun(`
          INSERT INTO departments (name, description, performance_score)
          VALUES (?, ?, ?)
        `, [name, description, performanceScore]);
      }
    }
    
    console.log('✅ Database initialized successfully');
    console.log('📊 Default departments created');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
};

// Test database connection
export const testConnection = async () => {
  try {
    await dbGet('SELECT 1');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});