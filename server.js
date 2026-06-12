const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const ip = require('ip');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

app.get('/api/info', (req, res) => {
    res.json({
        ip: ip.address(),
        port: PORT
    });
});

app.post('/api/upload-base64', (req, res) => {
    const { image } = req.body;
    if (!image) {
        return res.status(400).json({ error: 'No image provided' });
    }
    
    // Remove header
    const base64Data = image.replace(/^data:image\/png;base64,/, "");
    const filename = `strip-${Date.now()}.png`;
    const filepath = path.join(__dirname, 'public', 'uploads', filename);
    
    fs.writeFile(filepath, base64Data, 'base64', function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to save image' });
        }
        
        const fileUrl = `http://${ip.address()}:${PORT}/uploads/${filename}`;
        res.json({ url: fileUrl });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Local network: http://${ip.address()}:${PORT}`);
});
