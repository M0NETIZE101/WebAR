const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use('/models', express.static(path.join(__dirname, 'models')));
app.use('/markers', express.static(path.join(__dirname, 'markers')));

// Serve index.html for all routes (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at https://localhost:${PORT}`);
    console.log(`📱 Access via HTTPS on your local network`);
    console.log(`🏷️  Scan QR code marker to see the dinosaur!`);
});