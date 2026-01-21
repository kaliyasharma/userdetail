// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Store data in memory or create a temporary directory
// We'll use a 'data' object to simulate file storage if we can't create folder
const savedFiles = {};

// Alternative: Try to create directory if permissions allow
const dataDir = path.join(__dirname, 'data');
try {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`Created directory: ${dataDir}`);
    }
} catch (err) {
    console.log('Could not create data directory, using in-memory storage');
}

app.post('/save-json', (req, res) => {
    try {
        const { filename, data, username } = req.body;
        
        if (!filename || !data) {
            return res.status(400).json({ 
                success: false, 
                error: 'Filename and data are required' 
            });
        }

        // Clean filename
        const cleanFilename = filename.replace(/[^\w\-.]/g, '_');
        
        // Remove old files from same user if directory exists
        if (fs.existsSync(dataDir)) {
            try {
                const files = fs.readdirSync(dataDir);
                const userFiles = files.filter(file => 
                    file.startsWith(username.toLowerCase() + '_') && 
                    file.endsWith('.json')
                );
                
                // Remove old files
                userFiles.forEach(oldFile => {
                    try {
                        fs.unlinkSync(path.join(dataDir, oldFile));
                        console.log(`Removed old file: ${oldFile}`);
                    } catch (err) {
                        console.log(`Could not remove ${oldFile}:`, err.message);
                    }
                });
                
                // Save new file
                const filePath = path.join(dataDir, cleanFilename);
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                
                console.log(`File saved to folder: ${cleanFilename} for user: ${username}`);
                
                return res.json({ 
                    success: true, 
                    filename: cleanFilename,
                    savedTo: 'folder',
                    message: `File saved to data/ folder. Removed ${userFiles.length} old file(s).`
                });
                
            } catch (dirErr) {
                console.log('Folder operation failed, using alternative storage');
            }
        }
        
        // Alternative: If folder doesn't exist or can't write, use in-memory
        savedFiles[username] = savedFiles[username] || {};
        
        // Remove old entry
        delete savedFiles[username];
        
        // Save new data
        savedFiles[username] = {
            filename: cleanFilename,
            data: data,
            timestamp: new Date().toISOString()
        };
        
        console.log(`File saved in memory: ${cleanFilename} for user: ${username}`);
        
        res.json({ 
            success: true, 
            filename: cleanFilename,
            savedTo: 'memory',
            message: 'File saved successfully (in-memory storage)'
        });
        
    } catch (error) {
        console.error('Error saving file:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Optional: Endpoint to retrieve saved files
app.get('/get-saved-files', (req, res) => {
    if (fs.existsSync(dataDir)) {
        try {
            const files = fs.readdirSync(dataDir);
            res.json({ 
                success: true, 
                storage: 'folder',
                files: files.filter(f => f.endsWith('.json')),
                count: files.length
            });
        } catch (err) {
            res.json({ 
                success: true, 
                storage: 'memory',
                files: Object.keys(savedFiles),
                count: Object.keys(savedFiles).length
            });
        }
    } else {
        res.json({ 
            success: true, 
            storage: 'memory',
            files: Object.keys(savedFiles),
            count: Object.keys(savedFiles).length
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the app at: http://localhost:${PORT}`);
    console.log(`JSON save endpoint: http://localhost:${PORT}/save-json`);
    
    // Check if we can create/write to data directory
    try {
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log(`✓ Created data directory at: ${dataDir}`);
        } else {
            console.log(`✓ Using existing data directory: ${dataDir}`);
        }
        
        // Test write permission
        const testFile = path.join(dataDir, 'test_permission.json');
        fs.writeFileSync(testFile, '{"test": true}');
        fs.unlinkSync(testFile);
        console.log(`✓ Write permission confirmed in data directory`);
    } catch (err) {
        console.log(`⚠ Could not create/write to data directory: ${err.message}`);
        console.log(`⚠ Using in-memory storage instead`);
    }
});