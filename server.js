// server.js (Node.js with Express)
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('.')); // Serve static files

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
fs.mkdir(dataDir, { recursive: true });

app.post('/save-json', async (req, res) => {
  try {
    const { filename, data, username } = req.body;
    
    if (!filename || !data) {
      return res.status(400).json({ 
        success: false, 
        error: 'Filename and data are required' 
      });
    }

    // Clean filename (remove any path traversal attempts)
    const cleanFilename = filename.replace(/[^\w\-.]/g, '_');
    
    // Check for existing files from same user
    const files = await fs.readdir(dataDir);
    const userFiles = files.filter(file => 
      file.startsWith(username.toLowerCase() + '_')
    );
    
    // Remove old files from same user
    for (const oldFile of userFiles) {
      await fs.unlink(path.join(dataDir, oldFile));
      console.log(`Removed old file: ${oldFile}`);
    }

    // Save new file
    const filePath = path.join(dataDir, cleanFilename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    
    console.log(`File saved: ${cleanFilename} for user: ${username}`);
    
    res.json({ 
      success: true, 
      filename: cleanFilename,
      message: `File saved successfully. Removed ${userFiles.length} old file(s).`
    });
    
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Data directory: ${dataDir}`);
});