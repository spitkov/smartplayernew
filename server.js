const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ 
    server,
    // Add ping interval
    clientTracking: true,
    // Set ping timeout
    pingTimeout: 30000
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store project data
let projectData = {
    folders: {},
    currentFolder: null,
    currentFile: null
};

// Load project data from JSON if exists
const PROJECT_FILE = 'project-data.json';
try {
    if (fs.existsSync(PROJECT_FILE)) {
        projectData = JSON.parse(fs.readFileSync(PROJECT_FILE));
    }
} catch (err) {
    console.error('Error loading project data:', err);
}

// Save project data
function saveProjectData() {
    fs.writeFileSync(PROJECT_FILE, JSON.stringify(projectData, null, 2));
}

// Scan media directory and update project data
function scanMediaDirectory() {
    const mediaDir = path.join(__dirname, 'public', 'media');
    if (!fs.existsSync(mediaDir)) {
        console.log('Media directory does not exist');
        return;
    }

    const folders = fs.readdirSync(mediaDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    // Track existing folders to remove deleted ones
    const existingFolders = new Set();

    folders.forEach(folderName => {
        const folderId = Buffer.from(folderName).toString('base64');
        existingFolders.add(folderId);

        // Create or update folder in project data
        if (!projectData.folders[folderId]) {
            projectData.folders[folderId] = {
                id: folderId,
                title: folderName,
                folderName: folderName,
                files: {}
            };
        }

        const folderPath = path.join(mediaDir, folderName);
        const files = fs.readdirSync(folderPath, { withFileTypes: true })
            .filter(dirent => dirent.isFile())
            .map(dirent => dirent.name);

        // Track existing files to remove deleted ones
        const existingFiles = new Set();

        files.forEach(fileName => {
            const fileId = Buffer.from(`${folderName}/${fileName}`).toString('base64');
            existingFiles.add(fileId);

            // Create or update file in project data
            if (!projectData.folders[folderId].files[fileId]) {
                const extension = path.extname(fileName).toLowerCase();
                let type = 'unknown';
                if (['.mp4', '.webm', '.mov'].includes(extension)) type = 'video';
                else if (['.mp3', '.wav', '.ogg'].includes(extension)) type = 'audio';
                else if (['.jpg', '.jpeg', '.png', '.gif'].includes(extension)) type = 'image';

                projectData.folders[folderId].files[fileId] = {
                    id: fileId,
                    title: path.basename(fileName, extension),
                    fileName: fileName,
                    type: type,
                    volume: 1
                };
            }
        });

        // Remove files that no longer exist
        Object.keys(projectData.folders[folderId].files).forEach(fileId => {
            if (!existingFiles.has(fileId)) {
                delete projectData.folders[folderId].files[fileId];
            }
        });
    });

    // Remove folders that no longer exist
    Object.keys(projectData.folders).forEach(folderId => {
        if (!existingFolders.has(folderId)) {
            delete projectData.folders[folderId];
        }
    });

    saveProjectData();
    console.log('Media directory scan complete');
}

// Initial scan on startup
scanMediaDirectory();

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    // Get client IP address from request
    const clientIP = req.socket.remoteAddress.replace(/^.*:/, '');
    console.log(`New client connected from ${clientIP}`);
    
    // Set up ping-pong
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });
    
    // Get server address information
    const serverAddress = req.socket.localAddress ? req.socket.localAddress.replace(/^.*:/, '') : req.headers.host;
    const serverPort = PORT;
    
    // Send initial project data with current state and connection info
    ws.send(JSON.stringify({
        type: 'project',
        data: projectData,
        connectionInfo: {
            clientIP: clientIP,
            serverAddress: serverAddress || req.headers.host,
            serverPort: serverPort
        }
    }));
    
    // Send current folder and file selection if available
    if (projectData.currentFolder !== null) {
        ws.send(JSON.stringify({
            type: 'player.selectFolder',
            folderID: projectData.currentFolder
        }));
        
        // If there's also a current file selection, send that too
        if (projectData.currentFile !== null) {
            // Small delay to ensure folder processing completes first
            setTimeout(() => {
                ws.send(JSON.stringify({
                    type: 'player.selectFile',
                    fileID: projectData.currentFile
                }));
            }, 100);
        }
    }

    ws.on('message', (message) => {
        try {
            // Make sure the message is a string and parse it
            const msgString = message.toString();
            if (!msgString.trim().startsWith('{')) {
                console.warn('Received invalid message format:', msgString);
                return;
            }
            
            const msg = JSON.parse(msgString);
            console.log('Received message:', msg);
            
            // Handle specific message types
            switch (msg.type) {
                case 'player.selectFolder':
                    console.log('Selecting folder:', msg.folderID);
                    if (msg.folderID === undefined) {
                        projectData.currentFolder = null;
                    } else if (projectData.folders[msg.folderID]) {
                        projectData.currentFolder = msg.folderID;
                    }
                    projectData.currentFile = null;
                    saveProjectData();
                    
                    // Broadcast to all clients
                    broadcastMessage({
                        type: 'player.selectFolder',
                        folderID: projectData.currentFolder
                    });
                    break;
                case 'player.selectFile':
                    console.log('Selecting file:', msg.fileID);
                    projectData.currentFile = msg.fileID;
                    saveProjectData();
                    // Broadcast to all clients
                    broadcastMessage({
                        type: 'player.selectFile',
                        fileID: msg.fileID
                    });
                    break;
                case 'player.setDescription':
                case 'player.setTitle':
                case 'player.setNotes':
                    if (projectData.folders[msg.folderID]?.files[msg.fileID]) {
                        if (msg.type === 'player.setDescription') {
                            projectData.folders[msg.folderID].files[msg.fileID].description = msg.description;
                        } else if (msg.type === 'player.setTitle') {
                            projectData.folders[msg.folderID].files[msg.fileID].title = msg.title;
                        } else if (msg.type === 'player.setNotes') {
                            projectData.folders[msg.folderID].files[msg.fileID].notes = msg.notes;
                        }
                        saveProjectData();
                        
                        // Broadcast the changes to all clients
                        if (msg.type === 'player.setNotes') {
                            broadcastMessage({
                                type: 'player.setNotes',
                                folderID: msg.folderID,
                                fileID: msg.fileID,
                                notes: msg.notes
                            }, ws);
                        } else if (msg.type === 'player.setTitle') {
                            broadcastMessage({
                                type: 'player.setTitle',
                                folderID: msg.folderID,
                                fileID: msg.fileID,
                                title: msg.title
                            }, ws);
                        }
                    }
                    break;
                case 'player.setVolumeOfFile':
                    if (projectData.folders[msg.folderID]?.files[msg.fileID]) {
                        projectData.folders[msg.folderID].files[msg.fileID].volume = msg.volume;
                        saveProjectData();
                        
                        // Broadcast volume change to other clients
                        broadcastMessage({
                            type: 'player.setVolumeOfFile',
                            folderID: msg.folderID,
                            fileID: msg.fileID,
                            volume: msg.volume
                        }, ws);
                    }
                    break;
                case 'player.setFileOrder':
                    if (projectData.folders[msg.folderID] && Array.isArray(msg.fileOrder)) {
                        console.log('Setting file order for folder:', msg.folderID);
                        // Store the file order in the folder
                        projectData.folders[msg.folderID].fileOrder = msg.fileOrder;
                        saveProjectData();
                        
                        // Broadcast the new file order to all clients
                        broadcastMessage({
                            type: 'player.setFileOrder',
                            folderID: msg.folderID,
                            fileOrder: msg.fileOrder
                        }, ws);
                    }
                    break;
                case 'player.videoOpacity':
                    // Broadcast opacity change to all clients
                    broadcastMessage({
                        type: 'player.videoOpacity',
                        value: msg.value
                    });
                    break;
                case 'player.wsOverrideConfirm':
                    // Broadcast WebSocket override confirmation to all clients
                    broadcastMessage({
                        type: 'player.wsOverrideConfirm',
                        url: msg.url,
                        reconnect: msg.reconnect,
                        isInitiator: msg.isInitiator
                    });
                    break;
                default:
                    // Broadcast to other clients
                    broadcastMessage(msg, ws);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        ws.isAlive = false;
    });
});

// Helper function to broadcast messages to all clients
function broadcastMessage(message, excludeWs = null) {
    try {
        const messageString = JSON.stringify(message);
        wss.clients.forEach((client) => {
            if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
                client.send(messageString);
            }
        });
    } catch (error) {
        console.error('Error broadcasting message:', error);
    }
}

// Set up ping interval
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            console.log('Terminating inactive client');
            return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping(() => {});
    });
}, 30000);

wss.on('close', () => {
    clearInterval(interval);
});

// API Routes
app.post('/api/folder', (req, res) => {
    const { id, title } = req.body;
    projectData.folders[id] = {
        id,
        title,
        files: {}
    };
    saveProjectData();
    res.json({ success: true });
});

app.get('/api/project', (req, res) => {
    res.json(projectData);
});

app.post('/api/file', (req, res) => {
    const { folderId, fileId, file } = req.body;
    if (projectData.folders[folderId]) {
        projectData.folders[folderId].files[fileId] = file;
        saveProjectData();
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Folder not found' });
    }
});

// Rescan endpoint
app.post('/api/rescan', (req, res) => {
    scanMediaDirectory();
    res.json({ success: true });
});

// Serve index.html for all routes (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 