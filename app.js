const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const csvParser = require('csv-parser');
const cors = require("cors");

const app = express();
const port = 3000;

// Enable CORS for localhost:3000 only
const corsOptions = {
    origin: 'http://localhost:3000', // Allow only requests from this origin
    methods: ['GET', 'POST'], // Allow only GET and POST methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow specific headers
  };
  
app.use(cors(corsOptions)); // This will only allow CORS for localhost:3000

  
// Simple auth token for demonstration purposes
const AUTH_TOKEN = "Fg3j78Rqz0X8cmX9m1BDxbspsNFC6Dby+tgJ3MJesVOhdU52zTXA";

// Path to CSV file
const CSV_FILE_PATH = path.join(__dirname, 'users.csv');

fs.writeFileSync(CSV_FILE_PATH,'')
// Middleware for checking auth token
function checkAuth(req, res, next) {
  const token = req.headers['authorization'];
  if (token && token === `Bearer ${AUTH_TOKEN}`) {
    next();
  } else {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// Parse CSV file to get users
function parseCSV() {
  const users = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csvParser())
      .on('data', (row) => {
        users.push(row);
      })
      .on('end', () => {
        resolve(users);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

// Write data to CSV
function writeCSV(users) {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(CSV_FILE_PATH);
    const csvStream = csv.format({ headers: true });

    ws.on('finish', resolve);
    ws.on('error', reject);

    csvStream.pipe(ws);
    users.forEach(user => csvStream.write(user));
    csvStream.end();
  });
}

// POST endpoint to add a user
app.post('/add-user', checkAuth, express.json(), async (req, res) => {
  const { id, name, phone, address } = req.body;

  // Validate input
  if (!id || !name || !phone || !address) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Read existing users from CSV
    const users = await parseCSV();

    // Add new user
    const newUser = { id, name, phone, address };
    users.push(newUser);

    // Write updated list back to CSV
    await writeCSV(users);

    res.status(201).json({ message: 'User added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add user to CSV' });
  }
});

// GET endpoint to retrieve user details by ID
app.get('/get-user', checkAuth, async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing ID query parameter' });
  }

  try {
    // Read users from CSV
    const users = await parseCSV();

    // Find user by ID
    const user = users.find(user => user.id === id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read users from CSV' });
  }
});

// POST endpoint to delete user details by ID
app.post('/delete-user', checkAuth, express.json(), async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Missing ID in request body' });
  }

  try {
    // Read users from CSV
    const users = await parseCSV();

    // Filter out the user with the given ID
    const updatedUsers = users.filter(user => user.id !== id);

    // If no user is deleted, respond with an error
    if (updatedUsers.length === users.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Write updated list back to CSV
    await writeCSV(updatedUsers);

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user from CSV' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
