const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Mock Data
const issues = [
    {
        id: 1,
        title: 'Broken Streetlight',
        location: 'Main St & 5th Ave',
        votes: 12,
        status: 'open',
        urgency: 'medium',
        impact: 'medium'
    },
    {
        id: 2,
        title: 'Pothole on Elm St',
        location: 'Elm St near Park',
        votes: 45,
        status: 'in-progress',
        urgency: 'high',
        impact: 'high'
    }
];

// Routes
app.get('/', (req, res) => {
    res.send('Civic API is running.');
});

app.get('/api/issues', (req, res) => {
    // Simulate delay
    setTimeout(() => {
        res.json(issues);
    }, 500);
});

app.post('/api/issues', (req, res) => {
    const newIssue = { id: issues.length + 1, ...req.body, votes: 0 };
    issues.push(newIssue);
    res.status(201).json(newIssue);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
