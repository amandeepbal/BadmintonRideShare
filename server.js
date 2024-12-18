const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to auto-archive past rides
app.use((req, res, next) => {
  database.archivePastRides((err) => {
    if (err) {
      console.error('Auto-archive error:', err);
    }
    next();
  });
});

// Routes
// Routes
app.get('/', (req, res) => {
  database.getActiveRides((err, rides) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).render('error', { message: 'Error retrieving rides' });
    }
    res.render('index', { 
      rides: rides || [], 
      view: 'active' 
    });
  });
});

// Archived rides route
app.get('/archived', (req, res) => {
  database.getArchivedRides((err, rides) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).render('error', { message: 'Error retrieving archived rides' });
    }
    res.render('index', { 
      rides: rides || [], 
      view: 'archived' 
    });
  });
});

app.post('/rides', (req, res) => {
  const { driverName, rideDate, notes } = req.body;
  
  console.log('Received ride data:', { driverName, rideDate, notes });

  if (!driverName || !rideDate) {
    return res.status(400).send('Driver name and date are required');
  }

  database.addRide(driverName, rideDate, notes, (err, id) => {
    if (err) {
      console.error('Add ride error:', err);
      return res.status(500).send('Error adding ride');
    }
    
    // Redirect or send success response
    res.redirect('/');
  });
});

// Update a ride
app.post('/rides/update/:id', (req, res) => {
  const { driverName, rideDate, notes } = req.body;
  const id = req.params.id;

  if (!driverName || !rideDate) {
    return res.status(400).send('Driver name and date are required');
  }

  database.updateRide(id, driverName, rideDate, notes, (err, changes) => {
    if (err) {
      console.error('Update ride error:', err);
      return res.status(500).send('Error updating ride');
    }
    res.redirect('/');
  });
});

// Delete a ride
app.post('/rides/delete/:id', (req, res) => {
  const id = req.params.id;

  database.deleteRide(id, (err, changes) => {
    if (err) {
      console.error('Delete ride error:', err);
      return res.status(500).send('Error deleting ride');
    }
    res.redirect('/');
  });
});

// Delete all archived rides
app.post('/delete-archived', (req, res) => {
  database.deleteAllArchivedRides((err, count) => {
    if (err) {
      console.error('Delete archived rides error:', err);
      return res.status(500).send('Error deleting archived rides');
    }
    res.redirect('/archived');
  });
});

// Existing routes for adding, updating, deleting rides...
// (Keep the previous routes from the last implementation)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} in your browser`);
});