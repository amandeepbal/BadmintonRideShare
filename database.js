const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'rideshare.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
    // Heroku-friendly error logging
    process.stderr.write(`Database Error: ${err.message}\n`);
  } else {
    console.log('Database opened successfully');
    initializeDatabase();
  }
});

// Initialize database schema
function initializeDatabase() {
  db.serialize(() => {
    // Create rides table with comprehensive schema
    db.run(`CREATE TABLE IF NOT EXISTS rides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_name TEXT NOT NULL,
      ride_date DATE NOT NULL,
      notes TEXT,
      is_archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating rides table', err);
      } else {
        console.log('Rides table created or already exists');
      }
    });
  });
}

// Comprehensive database operations object
const database = {
  // Archive past rides
  archivePastRides: (callback) => {
    const today = new Date().toISOString().split('T')[0];
    console.log('Archiving rides before:', today);
    
    const query = `
      UPDATE rides 
      SET is_archived = 1 
      WHERE ride_date < ? AND is_archived = 0
    `;
    
    db.run(query, [today], function(err) {
      if (err) {
        console.error('Error archiving rides:', err);
        return callback(err, 0);
      }
      
      console.log('Rides archived:', this.changes);
      callback(null, this.changes);
    });
  },

  // Get active rides
  getActiveRides: (callback) => {
    console.log('Fetching active rides');
    
    const query = `
      SELECT * FROM rides 
      WHERE is_archived = 0 
      ORDER BY ride_date
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error fetching active rides:', err);
        return callback(err, null);
      }
      console.log('Active rides fetched:', rows.length);
      callback(null, rows);
    });
  },

  // Add a new ride
  addRide: (driverName, rideDate, notes, callback) => {
    console.log('Attempting to add ride:', { driverName, rideDate, notes });
    
    const query = `
      INSERT INTO rides (driver_name, ride_date, notes, is_archived) 
      VALUES (?, ?, ?, 0)
    `;
    
    db.run(query, [driverName, rideDate, notes || null], function(err) {
      if (err) {
        console.error('Error adding ride:', err);
        return callback(err, null);
      }
      
      console.log('Ride added successfully. Last ID:', this.lastID);
      callback(null, this.lastID);
    });
  },

  // Get archived rides
  getArchivedRides: (callback) => {
    const query = `
      SELECT * FROM rides 
      WHERE is_archived = 1 
      ORDER BY ride_date DESC
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error fetching archived rides:', err);
        return callback(err, null);
      }
      console.log('Archived rides fetched:', rows.length);
      callback(null, rows);
    });
  },

  // Update a ride
  updateRide: (id, driverName, rideDate, notes, callback) => {
    const query = `
      UPDATE rides 
      SET driver_name = ?, ride_date = ?, notes = ? 
      WHERE id = ?
    `;
    
    db.run(query, [driverName, rideDate, notes || null, id], function(err) {
      if (err) {
        console.error('Error updating ride:', err);
      }
      callback(err, this ? this.changes : null);
    });
  },

  // Delete a ride
  deleteRide: (id, callback) => {
    db.run(`DELETE FROM rides WHERE id = ?`, [id], function(err) {
      if (err) {
        console.error('Error deleting ride:', err);
      }
      callback(err, this ? this.changes : null);
    });
  },

  // Delete all archived rides
  deleteAllArchivedRides: (callback) => {
    db.run(`DELETE FROM rides WHERE is_archived = 1`, function(err) {
      if (err) {
        console.error('Error deleting archived rides:', err);
      }
      callback(err, this ? this.changes : 0);
    });
  }
};

// Close database connection on app termination
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database', err);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
});

module.exports = database;