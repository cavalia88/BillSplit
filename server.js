// server.js

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// ======================
// Middleware Configuration
// ======================
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ======================
// Database Configuration
// ======================
const connection = mysql.createConnection({
  host: 'db4free.net',
  user: 'service277waiter',
  password: 'Hero1829Coward',
  database: 'pan184cake',
  connectTimeout: 20000,
  dateStrings: true, // <-- This forces date and datetime columns to be returned as strings.
  flags: ['FOUND_ROWS', '-FOUND_ROWS', '-IGNORE_SPACE']
});

connection.connect(err => {
  if (err) {
    console.error('❌ Error connecting to MySQL:', err);
    return;
  }
  console.log('✅ MySQL connection established');
  // migrateExistingMembersToTrips();
});

// ======================
// Helper Functions
// ======================
const generateUniqueId = () => {
  // Generate the full UUID
  const fullId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  
  // Return only the first 18 characters (including hyphens)
  return fullId.substring(0, 18);
};


// ======================
// Categories API Endpoints
// ======================
app.get('/api/categories', (req, res) => {
  connection.query('SELECT * FROM categories', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ======================
// Expenses API Endpoints
// ======================
const formatExpenseResults = results => {
  return results.map(row => {
    const participants = row.participants_list?.split(',') || [];
    const shareValues = row.shares_list?.split(',').map(Number) || [];
    const shares = participants.reduce((acc, participant, i) => ({
      ...acc,
      [participant]: shareValues[i]
    }), {});

    return {
      id: row.id,
      description: row.description,
      amount: parseFloat(row.amount),
      payer: row.payer,
      date: row.date,
      category: row.category,
      participants,
      shares
    };
  });
};

app.get('/api/expenses', (req, res) => {
  const query = `
    SELECT e.*,
      GROUP_CONCAT(p.participant) as participants_list,
      GROUP_CONCAT(p.share) as shares_list
    FROM expenses e
    LEFT JOIN expense_participants p ON e.id = p.expense_id
    GROUP BY e.id
  `;

  connection.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(formatExpenseResults(results));
  });
});

app.post('/api/expenses', (req, res) => {
  const { description, amount, payer, date, category, participants, shares, trip_id } = req.body;

  connection.beginTransaction(err => {
    if (err) return res.status(500).json({ error: err.message });

    const expenseQuery = `
      INSERT INTO expenses 
        (description, amount, payer, date, category, trip_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    connection.query(expenseQuery, [description, amount, payer, date, category, trip_id || null], (err, result) => {
      if (err) return rollback(res, err);

      const expenseId = result.insertId;
      const participantValues = participants.map(p => [expenseId, p, shares[p]]);
      
      const participantQuery = `
        INSERT INTO expense_participants 
          (expense_id, participant, share)
        VALUES ?
      `;
      
      connection.query(participantQuery, [participantValues], err => {
        if (err) return rollback(res, err);
        commit(res, () => res.status(201).json({ id: expenseId }));
      });
    });
  });
});

app.put('/api/expenses/:id', (req, res) => {
  const { id } = req.params;
  const { description, amount, payer, date, category, participants, shares } = req.body;

  connection.beginTransaction(err => {
    if (err) return res.status(500).json({ error: err.message });

    const updateQuery = `
      UPDATE expenses
      SET description = ?, amount = ?, payer = ?, date = ?, category = ?
      WHERE id = ?
    `;

    connection.query(updateQuery, [description, amount, payer, date, category, id], err => {
      if (err) return rollback(res, err);

      connection.query('DELETE FROM expense_participants WHERE expense_id = ?', [id], err => {
        if (err) return rollback(res, err);

        const participantValues = participants.map(p => [id, p, shares[p]]);
        connection.query('INSERT INTO expense_participants (expense_id, participant, share) VALUES ?', [participantValues], err => {
          if (err) return rollback(res, err);
          commit(res, () => res.json({ message: 'Expense updated successfully' }));
        });
      });
    });
  });
});

app.delete('/api/expenses/:id', (req, res) => {
  connection.query('DELETE FROM expenses WHERE id = ?', [req.params.id], err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Expense deleted successfully' });
  });
});

// ======================
// Cash Flow API Endpoints
// ======================
app.get('/api/cash-outflows', (req, res) => {
  const tripId = req.query.trip_id;
  
  if (!tripId) {
    return res.status(400).json({ error: 'trip_id parameter is required' });
  }
  
  let query = `
    SELECT
      tm.member_name,
      COALESCE(p.total_paid, 0) AS total_cash_outflow,
      COALESCE(s.total_share, 0) AS total_expenditure
    FROM trip_members tm
    LEFT JOIN (
      SELECT payer, SUM(amount) AS total_paid
      FROM expenses
      WHERE trip_id = ?
      GROUP BY payer
    ) p ON tm.member_name = p.payer
    LEFT JOIN (
      SELECT participant, SUM(share) AS total_share
      FROM expense_participants ep
      JOIN expenses e ON ep.expense_id = e.id
      WHERE e.trip_id = ?
      GROUP BY participant
    ) s ON tm.member_name = s.participant
    WHERE tm.trip_id = ?
    ORDER BY tm.member_name
  `;
  
  connection.query(query, [tripId, tripId, tripId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ======================
// Trips API Endpoints
// ======================
app.get('/api/trips', (req, res) => {
  connection.query('SELECT * FROM trips', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get('/api/trips/:urlId', (req, res) => {
  connection.query('SELECT * FROM trips WHERE url_id = ?', [req.params.urlId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0] || { error: 'Trip not found' });
  });
});

app.post('/api/trips', (req, res) => {
  const { name, description, currency, start_date, end_date } = req.body;
  const urlId = generateUniqueId();
  connection.query(
    'INSERT INTO trips (name, description, trip_currency, start_date, end_date, url_id) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description, currency, start_date, end_date, urlId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId, url_id: urlId });
    }
  );
});

app.get('/api/trips/:tripId/expenses', (req, res) => {
  const query = `
    SELECT e.*,
      GROUP_CONCAT(p.participant) as participants_list,
      GROUP_CONCAT(p.share) as shares_list
    FROM expenses e
    LEFT JOIN expense_participants p ON e.id = p.expense_id
    WHERE e.trip_id = ?
    GROUP BY e.id
  `;

  connection.query(query, [req.params.tripId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(formatExpenseResults(results));
  });
});

// Update a trip
app.put('/api/trips/:id', (req, res) => {
  const tripId = req.params.id;
  const { name, description, currency, start_date, end_date } = req.body;
  connection.query(
    'UPDATE trips SET name = ?, description = ?, trip_currency = ?, start_date = ?, end_date = ? WHERE id = ?',
    [name, description, currency, start_date, end_date, tripId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Trip updated successfully' });
    }
  );
});


// ======================
// Transaction Helpers
// ======================
const rollback = (res, err) => {
  connection.rollback(() => res.status(500).json({ error: err.message }));
};

const commit = (res, successCallback) => {
  connection.commit(err => {
    if (err) return rollback(res, err);
    successCallback();
  });
};

// ======================
// Get members for a specific trip
// ======================
app.get('/api/trips/:id/members', (req, res) => {
  const tripId = req.params.id;
  connection.query('SELECT member_name FROM trip_members WHERE trip_id = ?', [tripId], (err, results) => {
    if (err) {
      console.error('Error fetching trip members:', err);
      return res.status(500).json({ error: 'Failed to fetch trip members' });
    }
    const members = results.map(row => row.member_name);
    res.json(members);
  });
});


function migrateExistingMembersToTrips() {
  connection.query('SELECT id FROM trips', (err, trips) => {
    if (err) {
      console.error('Error in migration:', err);
      return;
    }
    
    trips.forEach(trip => {
      const query = `
        SELECT DISTINCT 
          COALESCE(p.participant, e.payer) as member_name
        FROM expenses e
        LEFT JOIN expense_participants p ON e.id = p.expense_id
        WHERE e.trip_id = ? AND COALESCE(p.participant, e.payer) IS NOT NULL
      `;
      
      connection.query(query, [trip.id], (err, members) => {
        if (err || members.length === 0) return;
        
        const memberValues = members.map(m => [trip.id, m.member_name]);
        connection.query(
          'INSERT IGNORE INTO trip_members (trip_id, member_name) VALUES ?',
          [memberValues]
        );
      });
    });
  });
}

// Add a member to a trip
app.post('/api/trips/:id/members', (req, res) => {
  const tripId = req.params.id;
  const { name } = req.body;
   
    // Add to trip_members table
    connection.query('INSERT INTO trip_members (trip_id, member_name) VALUES (?, ?)', [tripId, name], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Member added to trip successfully' });
    });
  });


// Remove a member from a trip
app.delete('/api/trips/:id/members/:name', (req, res) => {
  const tripId = req.params.id;
  const memberName = req.params.name;
  
  connection.query('DELETE FROM trip_members WHERE trip_id = ? AND member_name = ?', [tripId, memberName], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Member removed from trip successfully' });
  });
});

// Delete a trip
app.delete('/api/trips/:id', (req, res) => {
  const tripId = req.params.id;
  console.log(`Attempting to delete trip with ID: ${tripId}`);
  
  // First delete all related data
  connection.beginTransaction(err => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Delete trip members
    connection.query('DELETE FROM trip_members WHERE trip_id = ?', [tripId], err => {
      if (err) return rollback(res, err);
      
      // Delete expense participants for this trip's expenses
      connection.query(
        'DELETE ep FROM expense_participants ep JOIN expenses e ON ep.expense_id = e.id WHERE e.trip_id = ?', 
        [tripId], 
        err => {
          if (err) return rollback(res, err);
          
          // Delete expenses
          connection.query('DELETE FROM expenses WHERE trip_id = ?', [tripId], err => {
            if (err) return rollback(res, err);
            
            // Finally delete the trip
            connection.query('DELETE FROM trips WHERE id = ?', [tripId], err => {
              if (err) return rollback(res, err);
              
              commit(res, () => res.json({ message: 'Trip deleted successfully' }));
            });
          });
        }
      );
    });
  });
});

// ======================
// Client-Side Routing - UPDATED FOR SEPARATE HTML FILES
// ======================
app.get('/trip/:urlId', (req, res, next) => {
  const urlId = req.params.urlId;
  connection.query('SELECT * FROM trips WHERE url_id = ?', [urlId], (err, results) => {
    if (err) {
      return next(err);
    }
    if (results.length === 0) {
      return res.status(404).send('Trip not found');
    }
    // Send trip.html instead of index.html
    res.sendFile(path.join(__dirname, 'public', 'trip.html'));
  });
});

// Catch-all route for the root - now serves main.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

// 404 handler for any other routes
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// ======================
// Server Initialization
// ======================
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
