class SmartPlayer {
    constructor() {
        this.socket = null;
        this.projectData = null;
        this.currentFolder = null;
        this.currentFile = null;
        this.selectedItem = null;
        this.lastSelectedIndex = 0;
        this.videoOpacity = 1;
        this.reconnectAttempts = 0;

        this.initializeElements();
        this.setupEventListeners();
        this.connectWebSocket();
        this.loadInitialData();
    }

    initializeElements() {
        // Players
        this.videoPlayer = document.getElementById('videoPlayer');
        this.audioPlayer = document.getElementById('audioPlayer');
        this.imagePlayer = document.getElementById('imagePlayer');
        this.mediaContainer = document.getElementById('mediaContainer');
        this.mainViewer = document.getElementById('mainViewer');
        
        // Overlay for enabling playback
        this.enablePlaybackOverlay = document.getElementById('enablePlaybackOverlay');

        // Controls
        this.videoControls = document.getElementById('videoControls');
        this.audioControls = document.getElementById('audioControls');
        this.videoProgress = document.getElementById('videoProgress');
        this.audioProgress = document.getElementById('audioProgress');
        this.videoTimeDisplay = document.getElementById('videoTimeDisplay');
        this.audioTimeDisplay = document.getElementById('audioTimeDisplay');

        // Buttons
        this.playVideoBtn = document.getElementById('playVideo');
        this.pauseVideoBtn = document.getElementById('pauseVideo');
        this.resetVideoBtn = document.getElementById('resetVideo');
        this.playAudioBtn = document.getElementById('playAudio');
        this.pauseAudioBtn = document.getElementById('pauseAudio');
        this.resetAudioBtn = document.getElementById('resetAudio');
        this.blackScreenBtn = document.getElementById('blackScreen');
        this.muteAllBtn = document.getElementById('muteAll');
        this.backButton = document.getElementById('backButton');
        this.rescanButton = document.getElementById('rescanButton');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.wsOverrideBtn = document.getElementById('wsOverrideBtn');

        // WebSocket connection elements
        this.connectionStatus = document.querySelector('.status-dot');
        this.connectionText = document.querySelector('.status-text');
        this.wsUrlElement = document.getElementById('wsUrl');

        // Current WebSocket URL
        this.currentWsUrl = '';
        
        // Initialize WebSocket override
        this.initializeWsOverride();

        // Volume controls
        this.videoVolumeUpBtn = document.getElementById('videoVolumeUp');
        this.videoVolumeDownBtn = document.getElementById('videoVolumeDown');
        this.audioVolumeUpBtn = document.getElementById('audioVolumeUp');
        this.audioVolumeDownBtn = document.getElementById('audioVolumeDown');
        this.videoOpacitySlider = document.getElementById('videoOpacity');

        // Create volume percentage displays
        this.videoVolumeDisplay = document.createElement('span');
        this.videoVolumeDisplay.className = 'volume-display';
        this.videoVolumeDisplay.textContent = '100%';
        
        this.audioVolumeDisplay = document.createElement('span');
        this.audioVolumeDisplay.className = 'volume-display';
        this.audioVolumeDisplay.textContent = '100%';
        
        // Add volume displays to control panels
        const videoVolumeControl = this.videoControls.querySelector('.volume-control');
        videoVolumeControl.appendChild(this.videoVolumeDisplay);
        
        const audioVolumeControl = this.audioControls.querySelector('.volume-control');
        audioVolumeControl.appendChild(this.audioVolumeDisplay);

        // Titles
        this.selectedVideoTitle = document.getElementById('selectedVideoTitle');
        this.selectedAudioTitle = document.getElementById('selectedAudioTitle');
        this.selectedImageTitle = document.getElementById('selectedImageTitle');
        this.currentPath = document.getElementById('currentPath');

        // Other elements
        this.itemList = document.getElementById('itemList');

        // Initialize player states
        this.videoPlayer.volume = 1;
        this.audioPlayer.volume = 1;
        this.videoPlayer.style.opacity = this.videoOpacity;
        
        // Initialize volume displays
        this.updateVolumeDisplay('video', this.videoPlayer.volume);
        this.updateVolumeDisplay('audio', this.audioPlayer.volume);
        
        // Add fullscreen change event listener
        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                // We're in fullscreen mode
                this.mediaContainer.classList.add('fullscreen');
            } else {
                // Exited fullscreen mode
                this.mediaContainer.classList.remove('fullscreen');
            }
        });
    }

    setupEventListeners() {
        // Player controls
        this.playVideoBtn.addEventListener('click', () => {
            console.log("Video play button clicked");
            if (this.videoPlayer.paused) {
                this.playVideo();
                this.sendSocketMessage('player.playVideo');
            }
        });
        
        this.pauseVideoBtn.addEventListener('click', () => {
            console.log("Video pause button clicked");
            this.videoPlayer.pause();
            this.sendSocketMessage('player.pauseVideo');
        });
        
        this.playAudioBtn.addEventListener('click', () => {
            console.log("Audio play button clicked");
            if (this.audioPlayer.paused) {
                this.playAudio();
                this.sendSocketMessage('player.playAudio');
            }
        });
        
        this.pauseAudioBtn.addEventListener('click', () => {
            console.log("Audio pause button clicked");
            this.audioPlayer.pause();
            this.sendSocketMessage('player.pauseAudio');
        });
        
        // Add reset button event listeners
        this.resetVideoBtn.addEventListener('click', () => {
            console.log("Video reset button clicked");
            this.resetVideo();
        });

        this.resetAudioBtn.addEventListener('click', () => {
            console.log("Audio reset button clicked");
            this.resetAudio();
        });
        
        // Progress bars
        this.videoProgress.addEventListener('click', (e) => this.handleProgressBarClick(e, 'video'));
        this.audioProgress.addEventListener('click', (e) => this.handleProgressBarClick(e, 'audio'));

        // Volume controls
        this.videoVolumeUpBtn.addEventListener('click', () => this.adjustVolume('video', 0.1));
        this.videoVolumeDownBtn.addEventListener('click', () => this.adjustVolume('video', -0.1));
        this.audioVolumeUpBtn.addEventListener('click', () => this.adjustVolume('audio', 0.1));
        this.audioVolumeDownBtn.addEventListener('click', () => this.adjustVolume('audio', -0.1));
        
        // Opacity control
        this.videoOpacitySlider.addEventListener('input', (e) => {
            const opacity = e.target.value / 100;
            this.videoOpacity = opacity;
            
            // Apply opacity to the entire media container
            this.mediaContainer.style.opacity = opacity;
            this.mainViewer.style.opacity = opacity;
            
            // Send opacity change to server
            this.sendSocketMessage('player.videoOpacity', { value: Number(e.target.value) });
        });

        // Toolbar buttons
        this.blackScreenBtn.addEventListener('click', () => this.handleBlackScreen());
        this.muteAllBtn.addEventListener('click', () => this.handleMuteAll());
        this.backButton.addEventListener('click', () => this.navigateBack());
        this.rescanButton.addEventListener('click', () => this.handleRescan());

        // Media events
        this.videoPlayer.addEventListener('timeupdate', () => this.updateProgressBar('video'));
        this.audioPlayer.addEventListener('timeupdate', () => this.updateProgressBar('audio'));
        this.videoPlayer.addEventListener('play', () => this.updatePlayButton('video', true));
        this.videoPlayer.addEventListener('pause', () => this.updatePlayButton('video', false));
        this.audioPlayer.addEventListener('play', () => this.updatePlayButton('audio', true));
        this.audioPlayer.addEventListener('pause', () => this.updatePlayButton('audio', false));

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyboardControls(e));

        // Add fullscreen button handler
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        // Add audio-specific event listeners
        this.audioPlayer.addEventListener('canplay', () => {
            console.log('Audio can play');
            this.updatePlayButton('audio', false);
        });

        this.audioPlayer.addEventListener('playing', () => {
            console.log('Audio playing');
            this.updatePlayButton('audio', true);
        });

        this.audioPlayer.addEventListener('pause', () => {
            console.log('Audio paused');
            this.updatePlayButton('audio', false);
        });

        this.audioPlayer.addEventListener('ended', () => {
            console.log('Audio ended');
            this.updatePlayButton('audio', false);
        });

        // Add timeupdate listeners for both players
        this.videoPlayer.addEventListener('timeupdate', () => this.updateProgressBar('video'));
        this.audioPlayer.addEventListener('timeupdate', () => this.updateProgressBar('audio'));

        // Add loadedmetadata listeners
        this.videoPlayer.addEventListener('loadedmetadata', () => {
            this.updateProgressBar('video');
            this.updateTimeDisplay('video');
        });
        this.audioPlayer.addEventListener('loadedmetadata', () => {
            this.updateProgressBar('audio');
            this.updateTimeDisplay('audio');
        });

        // Add error listeners
        this.videoPlayer.addEventListener('error', (e) => {
            console.error('Video error:', e);
            if (this.videoPlayer.error) {
                console.error('Video error code:', this.videoPlayer.error.code);
            }
        });

        this.audioPlayer.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            if (this.audioPlayer.error) {
                console.error('Audio error code:', this.audioPlayer.error.code);
            }
        });

        // Enable playback overlay
        this.enablePlaybackOverlay.addEventListener('click', () => {
            this.enableMediaPlayback();
        });
    }

    connectWebSocket() {
        // Determine the WebSocket URL to use
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        let wsUrl;
        
        if (this.overrideWsUrl) {
            // Use the override URL if available
            wsUrl = this.overrideWsUrl;
            
            // Make sure it has the ws:// or wss:// prefix
            if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
                wsUrl = `ws://${wsUrl}`;
            }
        } else {
            // Use the default derived from the current window location
            wsUrl = `${protocol}//${window.location.host}`;
        }
        
        // Store the current WebSocket URL and update the display
        this.currentWsUrl = wsUrl;
        this.wsUrlElement.textContent = wsUrl;
        
        console.log(`Connecting to WebSocket: ${wsUrl}`);
        
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        
        try {
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = () => {
                console.log('WebSocket connected');
                this.connectionStatus.classList.add('connected');
                this.connectionText.textContent = 'Connected';
                this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
            };

            this.socket.onclose = (event) => {
                console.log('WebSocket closed:', event);
                this.connectionStatus.classList.remove('connected');
                this.connectionText.textContent = 'Disconnected';
                
                // Attempt to reconnect after a delay, with increasing backoff
                const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts || 0), 30000);
                this.reconnectAttempts = (this.reconnectAttempts || 0) + 1;
                console.log(`Reconnecting in ${delay}ms...`);
                setTimeout(() => this.connectWebSocket(), delay);
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.connectionStatus.classList.remove('connected');
                this.connectionText.textContent = 'Error';
            };

            this.socket.onmessage = (event) => {
                try {
                    // First check if the data is valid JSON
                    if (typeof event.data === 'string' && event.data.trim().startsWith('{')) {
                        const message = JSON.parse(event.data);
                        this.handleSocketMessage(message);
                    } else {
                        console.warn('Received non-JSON message:', event.data);
                    }
                } catch (error) {
                    console.error('Error parsing message:', error, 'Raw message:', event.data);
                }
            };
        } catch (e) {
            console.error('Error creating WebSocket connection:', e);
            this.connectionStatus.classList.remove('connected');
            this.connectionText.textContent = 'Connection Error';
            
            // Try to reconnect after a delay
            setTimeout(() => this.connectWebSocket(), 5000);
        }
    }

    sendSocketMessage(type, data = {}) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            try {
                const message = JSON.stringify({ type, ...data });
                this.socket.send(message);
            } catch (error) {
                console.error('Error sending message:', error);
            }
        } else {
            console.warn('Socket not connected, message not sent:', type);
        }
    }

    handleSocketMessage(msg) {
        console.log("Socket message received:", msg.type);
        
        switch (msg.type) {
            case 'project':
                this.projectData = msg.data;
                
                // Update connection display with server information
                if (msg.connectionInfo) {
                    const connInfo = msg.connectionInfo;
                    const isLocal = 
                        window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
                    
                    if (isLocal) {
                        // If viewing locally, show we're connected locally
                        this.connectionText.textContent = `Connected locally`;
                    } else {
                        // If viewing over network, show the server address we're connected to
                        const serverDisplay = connInfo.serverAddress.includes(':') ? 
                            connInfo.serverAddress : 
                            `${connInfo.serverAddress}:${connInfo.serverPort}`;
                        this.connectionText.textContent = `Connected to ${serverDisplay}`;
                    }
                    
                    // Store connection info for potential display elsewhere
                    this.connectionInfo = msg.connectionInfo;
                }
                
                this.refreshPlaylist();
                break;
                
            case 'player.selectFolder':
                // Store previous folder before updating
                const previousFolder = this.currentFolder;
                
                if (msg.folderID === undefined) {
                    // Going back to root
                    this.currentFolder = null;
                } else {
                    this.currentFolder = msg.folderID;
                }
                
                // Only clear current file when actually changing folders
                if (previousFolder !== this.currentFolder) {
                    this.currentFile = null;
                    
                    // Don't immediately clear displayed media when changing folders
                    // Let loadMedia handle clearing when new media is selected
                }
                
                this.refreshPlaylist();
                break;
                
            case 'player.selectFile':
                console.log('Selecting file:', msg.fileID);
                
                // Get the file info before loading it
                if (this.currentFile) {
                    const currentFile = this.getFileById(this.currentFile);
                    const newFile = this.getFileById(msg.fileID);
                    
                    if (currentFile && newFile) {
                        // Skip confirmation when switching to images while audio is playing
                        // Only show confirmation for other media type switches
                        const isAudioPlayingAndSwitchingToImage = 
                            currentFile.type === 'audio' && 
                            newFile.type === 'image' && 
                            this.audioPlayer.played.length > 0 && 
                            !this.audioPlayer.paused;
                            
                        // Check if we're trying to switch to a new video/audio while one is playing
                        // But exclude the case of switching to images while audio is playing
                        if (!isAudioPlayingAndSwitchingToImage && 
                            ((currentFile.type === 'video' && this.videoPlayer.played.length > 0 && !this.videoPlayer.paused) ||
                             (currentFile.type === 'audio' && this.audioPlayer.played.length > 0 && !this.audioPlayer.paused))) {
                            
                            // Show confirmation when switching while media is playing
                            const confirmMessage = currentFile.type === newFile.type ? 
                                `The current ${currentFile.type} hasn't ended yet. Are you sure you want to play another ${newFile.type}?` :
                                `The current ${currentFile.type} hasn't ended yet. Are you sure you want to switch to ${newFile.type}?`;
                                
                            const confirmSwitch = confirm(confirmMessage);
                            if (!confirmSwitch) {
                                return; // Don't proceed with the switch
                            }
                        }
                    }
                }
                
                const previousFile = this.currentFile;
                this.currentFile = msg.fileID;
                
                // Get the file info before loading it
                if (previousFile && this.currentFile) {
                    const prevFile = this.getFileById(previousFile);
                    const newFile = this.getFileById(this.currentFile);
                    
                    if (prevFile && newFile) {
                        // Only pause previous player if we're loading the same type of media
                        if (prevFile.type === newFile.type) {
                            if (prevFile.type === 'video') this.videoPlayer.pause();
                            if (prevFile.type === 'audio') this.audioPlayer.pause();
                            
                            // For images, we now handle the transition in loadMedia with preloading
                        }
                        
                        // If playing audio and showing image, don't disrupt audio when switching images
                        if (prevFile.type === 'audio' && newFile.type === 'image') {
                            // Don't pause audio when loading an image
                        } 
                        // If showing image and playing audio, don't affect the image when switching audio
                        else if (prevFile.type === 'image' && newFile.type === 'audio') {
                            // Don't clear the image when loading audio
                        }
                    }
                }
                
                this.loadMedia();
                this.refreshPlaylist();
                break;
                
            case 'player.playVideo':
                console.log("Playing video");
                this.playVideo();
                break;
                
            case 'player.pauseVideo':
                console.log("Pausing video");
                this.videoPlayer.pause();
                break;
                
            case 'player.playAudio':
                console.log("Playing audio");
                this.playAudio();
                break;
                
            case 'player.pauseAudio':
                console.log("Pausing audio");
                this.audioPlayer.pause();
                break;
                
            case 'player.videoOpacity':
                const opacity = msg.value / 100;
                this.videoOpacity = opacity;
                
                // Apply opacity to the entire media container
                this.mediaContainer.style.opacity = opacity;
                this.mainViewer.style.opacity = opacity;
                
                // Update the slider value
                this.videoOpacitySlider.value = msg.value;
                break;
                
            case 'player.seekVideo':
            case 'player.seekAudio':
                const player = msg.type === 'player.seekVideo' ? this.videoPlayer : this.audioPlayer;
                if (player && !isNaN(msg.time)) {
                    player.currentTime = msg.time;
                    if (msg.wasPlaying) {
                        player.play().catch(e => console.error(`${msg.type} play error: ` + e.message));
                    }
                }
                break;
                
            case 'player.setVolumeOfFile':
                // Always update volume for the corresponding file type, even if not current
                if (msg.folderID && msg.fileID) {
                    // Update in local project data
                    const folder = this.projectData.folders[msg.folderID];
                    if (folder && folder.files[msg.fileID]) {
                        folder.files[msg.fileID].volume = msg.volume;
                        
                        // If this is the currently playing file, update the player
                        if (this.currentFolder === msg.folderID && this.currentFile === msg.fileID) {
                            const file = folder.files[msg.fileID];
                            if (file.type === 'video') {
                                this.videoPlayer.volume = msg.volume;
                                this.updateVolumeDisplay('video', msg.volume);
                            } else if (file.type === 'audio') {
                                this.audioPlayer.volume = msg.volume;
                                this.updateVolumeDisplay('audio', msg.volume);
                            }
                        }
                    }
                }
                break;
                
            case 'player.setNotes':
                // Update notes in the local project data
                if (msg.folderID && msg.fileID) {
                    const folder = this.projectData.folders[msg.folderID];
                    if (folder && folder.files[msg.fileID]) {
                        folder.files[msg.fileID].notes = msg.notes;
                        
                        // If the playlist is currently showing this file, update its notes
                        if (this.currentFolder === msg.folderID) {
                            const notesElement = document.querySelector(`.playlist-item[data-file-id="${msg.fileID}"] .notes-content`);
                            if (notesElement) {
                                if (msg.notes) {
                                    // Format the notes with proper line breaks
                                    const formattedNotes = msg.notes.replace(/\n/g, '<br>');
                                    notesElement.innerHTML = formattedNotes;
                                } else {
                                    notesElement.textContent = 'Click to add notes...';
                                }
                            }
                        }
                    }
                }
                break;
                
            case 'player.setTitle':
                // Update title in the local project data when received from another client
                if (msg.folderID && msg.fileID) {
                    const folder = this.projectData.folders[msg.folderID];
                    if (folder && folder.files[msg.fileID]) {
                        folder.files[msg.fileID].title = msg.title;
                        
                        // If the playlist is currently showing this file, update its title in the UI
                        if (this.currentFolder === msg.folderID) {
                            const titleElement = document.querySelector(`.playlist-item[data-file-id="${msg.fileID}"] .item-title`);
                            if (titleElement) {
                                titleElement.textContent = msg.title;
                            }
                            
                            // If this is the currently selected file, update the title in the player controls
                            if (this.currentFile === msg.fileID) {
                                const file = folder.files[msg.fileID];
                                if (file.type === 'video') {
                                    this.selectedVideoTitle.textContent = msg.title;
                                } else if (file.type === 'audio') {
                                    this.selectedAudioTitle.textContent = msg.title;
                                } else if (file.type === 'image') {
                                    this.selectedImageTitle.textContent = msg.title;
                                }
                            }
                        }
                    }
                }
                break;
                
            case 'player.blackScreen':
                console.log("Showing black screen");
                this.showBlackScreen();
                break;
                
            case 'player.setFileOrder':
                // Update file order when received from another client
                if (msg.folderID && Array.isArray(msg.fileOrder)) {
                    const folder = this.projectData.folders[msg.folderID];
                    if (folder) {
                        folder.fileOrder = msg.fileOrder;
                        
                        // Refresh playlist if we're currently viewing this folder
                        if (this.currentFolder === msg.folderID) {
                            this.refreshPlaylist();
                        }
                    }
                }
                break;
            case 'player.wsOverrideConfirm':
                // Handle WebSocket override confirmation from another instance
                if (msg.url) {
                    localStorage.setItem('wsOverrideUrl', msg.url);
                    this.overrideWsUrl = msg.url;
                    if (msg.reconnect && this.socket && this.socket.readyState === WebSocket.OPEN) {
                        this.connectWebSocket();
                    }
                    // Only show alerts if this instance initiated the change
                    if (msg.isInitiator) {
                        if (msg.url.trim() === '') {
                            alert('WebSocket override cleared. Will use default server address on next connection.');
                        } else {
                            alert(`WebSocket override set to: ${msg.url}\nWill connect to this address on next connection.`);
                        }
                    }
                }
                break;
        }
    }

    refreshPlaylist() {
        // Save the currently selected file ID before refreshing the list
        const currentSelectedFileId = this.selectedItem ? this.selectedItem.getAttribute('data-file-id') : null;
        
        this.itemList.innerHTML = '';
        
        if (!this.currentFolder) {
            // Show folders
            this.backButton.classList.add('hidden');
            this.currentPath.textContent = 'Root';
            if (this.projectData && this.projectData.folders) {
                Object.values(this.projectData.folders).forEach(folder => {
                    this.createPlaylistItem(folder, 'folder');
                });
            }
        } else {
            // Show files in current folder
            this.backButton.classList.remove('hidden');
            const folder = this.projectData?.folders[this.currentFolder];
            if (folder) {
                this.currentPath.textContent = folder.title;
                
                // Use fileOrder if available to determine the order of files
                if (folder.fileOrder && Array.isArray(folder.fileOrder)) {
                    // First ensure all files are included in fileOrder
                    const fileIdSet = new Set(folder.fileOrder);
                    Object.keys(folder.files).forEach(fileId => {
                        if (!fileIdSet.has(fileId)) {
                            folder.fileOrder.push(fileId);
                        }
                    });
                    
                    // Then display files in the specified order
                    folder.fileOrder.forEach(fileId => {
                        if (folder.files[fileId]) {
                            this.createPlaylistItem(folder.files[fileId], 'file');
                        }
                    });
                } else {
                    // Fallback to unordered display if fileOrder is not available
                    Object.values(folder.files).forEach(file => {
                        this.createPlaylistItem(file, 'file');
                    });
                }
            } else {
                // If folder not found, go back to root
                this.currentFolder = null;
                this.refreshPlaylist();
                return; // Exit early to avoid restoring selection before the recursive call completes
            }
        }
        
        // Restore keyboard selection after refresh
        if (this.currentFile) {
            // If we have a currently selected file, select it for keyboard navigation
            const selectedElement = document.querySelector(`.playlist-item[data-file-id="${this.currentFile}"]`);
            if (selectedElement) {
                this.selectedItem = selectedElement;
                const items = Array.from(this.itemList.children);
                this.lastSelectedIndex = items.indexOf(selectedElement);
                selectedElement.classList.add('keyboard-selected');
            }
        } else if (currentSelectedFileId) {
            // If no current file but we had a keyboard selection, try to restore it
            const previousSelectedElement = document.querySelector(`.playlist-item[data-file-id="${currentSelectedFileId}"]`);
            if (previousSelectedElement) {
                this.selectedItem = previousSelectedElement;
                const items = Array.from(this.itemList.children);
                this.lastSelectedIndex = items.indexOf(previousSelectedElement);
                previousSelectedElement.classList.add('keyboard-selected');
            }
        }
    }

    createPlaylistItem(item, type) {
        const div = document.createElement('div');
        div.className = 'playlist-item';
        if (type === 'file' && item.id === this.currentFile) {
            div.classList.add('selected');
        }
        
        // Add media type class for styling
        if (type === 'file') {
            div.setAttribute('data-file-id', item.id);
            // Add CSS class based on media type
            if (item.type === 'video') {
                div.classList.add('video-file');
            } else if (item.type === 'audio') {
                div.classList.add('audio-file');
            } else if (item.type === 'image') {
                div.classList.add('image-file');
            }
        }

        // Create header section to contain icon, title and controls
        const header = document.createElement('div');
        header.className = 'playlist-item-header';

        const icon = document.createElement('i');
        icon.className = 'fas ' + this.getItemIcon(item.type || type);
        
        const content = document.createElement('div');
        content.className = 'item-content';
        
        const title = document.createElement('div');
        title.className = 'item-title';
        title.textContent = item.title;
        
        const description = document.createElement('div');
        description.className = 'item-description';
        description.textContent = item.description || '';

        content.appendChild(title);
        content.appendChild(description);

        header.appendChild(icon);
        header.appendChild(content);

        if (type === 'file') {
            const controls = document.createElement('div');
            controls.className = 'item-controls';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'control-btn small';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = 'Edit Title';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editItem(item);
            });
            
            // Add move up button
            const moveUpBtn = document.createElement('button');
            moveUpBtn.className = 'control-btn small';
            moveUpBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
            moveUpBtn.title = 'Move Up';
            moveUpBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveFileItem(item, 'up');
            });
            
            // Add move down button
            const moveDownBtn = document.createElement('button');
            moveDownBtn.className = 'control-btn small';
            moveDownBtn.innerHTML = '<i class="fas fa-arrow-down"></i>';
            moveDownBtn.title = 'Move Down';
            moveDownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveFileItem(item, 'down');
            });
            
            controls.appendChild(editBtn);
            controls.appendChild(moveUpBtn);
            controls.appendChild(moveDownBtn);
            header.appendChild(controls);
        }

        div.appendChild(header);

        // Add notes section for files only
        if (type === 'file') {
            const notesSection = document.createElement('div');
            notesSection.className = 'notes-section';
            
            const notesHeader = document.createElement('div');
            notesHeader.className = 'notes-header';
            notesHeader.innerHTML = '<span>Notes</span>';
            
            const notesContent = document.createElement('div');
            notesContent.className = 'notes-content';
            
            // Handle multiline notes by properly formatting with line breaks
            if (item.notes) {
                // Replace newlines with <br> tags for proper display
                const formattedNotes = item.notes.replace(/\n/g, '<br>');
                notesContent.innerHTML = formattedNotes;
            } else {
                notesContent.textContent = 'Click to add notes...';
            }
            
            // Add event to edit notes
            notesContent.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editNotes(item, notesSection, notesContent);
            });
            
            notesSection.appendChild(notesHeader);
            notesSection.appendChild(notesContent);
            div.appendChild(notesSection);
        }

        div.addEventListener('click', () => {
            if (type === 'folder') {
                this.sendSocketMessage('player.selectFolder', { folderID: item.id });
            } else {
                this.sendSocketMessage('player.selectFile', { fileID: item.id });
            }
        });

        this.itemList.appendChild(div);
    }

    editItem(item) {
        const newTitle = prompt('Enter new title:', item.title);
        if (newTitle !== null && newTitle !== item.title) {
            // Send the new title to the server
            this.sendSocketMessage('player.setTitle', {
                folderID: this.currentFolder,
                fileID: item.id,
                title: newTitle
            });
            
            // Update title in the local data structure
            if (this.projectData.folders[this.currentFolder]?.files[item.id]) {
                this.projectData.folders[this.currentFolder].files[item.id].title = newTitle;
                
                // Update the title in the UI
                const titleElement = document.querySelector(`.playlist-item[data-file-id="${item.id}"] .item-title`);
                if (titleElement) {
                    titleElement.textContent = newTitle;
                }
                
                // If this is the currently selected file, update the title in the player controls
                if (this.currentFile === item.id) {
                    const file = this.projectData.folders[this.currentFolder].files[item.id];
                    if (file.type === 'video') {
                        this.selectedVideoTitle.textContent = newTitle;
                    } else if (file.type === 'audio') {
                        this.selectedAudioTitle.textContent = newTitle;
                    } else if (file.type === 'image') {
                        this.selectedImageTitle.textContent = newTitle;
                    }
                }
            }
        }
    }

    editNotes(item, notesSection, notesContent) {
        // Create edit interface
        const editArea = document.createElement('div');
        editArea.className = 'notes-edit-area';
        
        const textarea = document.createElement('textarea');
        textarea.className = 'notes-edit';
        textarea.placeholder = 'Add notes...';
        // Populate with current notes if they exist
        if (item.notes) {
            textarea.value = item.notes;
        }
        
        const saveBtn = document.createElement('button');
        saveBtn.className = 'notes-save-btn';
        saveBtn.textContent = 'Save';
        
        // Create cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'notes-cancel-btn';
        cancelBtn.textContent = 'Cancel';
        
        // Replace content with edit interface
        notesContent.replaceWith(editArea);
        editArea.appendChild(textarea);
        
        // Create a button container for better alignment
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'notes-button-container';
        buttonContainer.appendChild(saveBtn);
        buttonContainer.appendChild(cancelBtn);
        editArea.appendChild(buttonContainer);
        
        // Focus the textarea
        textarea.focus();
        
        // Handle save
        const saveNotes = () => {
            const newNotes = textarea.value.trim();
            item.notes = newNotes;
            
            // Update the notes content display
            const newNotesContent = document.createElement('div');
            newNotesContent.className = 'notes-content';
            
            // Preserve line breaks by replacing \n with <br> tags
            if (newNotes) {
                // Process line breaks for display
                const formattedNotes = newNotes.replace(/\n/g, '<br>');
                newNotesContent.innerHTML = formattedNotes;
            } else {
                newNotesContent.textContent = 'Click to add notes...';
            }
            
            // Replace edit interface with new content
            editArea.replaceWith(newNotesContent);
            
            // Save to server
            this.sendSocketMessage('player.setNotes', {
                folderID: this.currentFolder,
                fileID: item.id,
                notes: newNotes
            });
            
            // Add event listener for the new content element
            newNotesContent.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editNotes(item, notesSection, newNotesContent);
            });
        };
        
        // Handle cancel
        const cancelEdit = () => {
            // Create new content element without saving changes
            const newNotesContent = document.createElement('div');
            newNotesContent.className = 'notes-content';
            
            // Show original notes
            if (item.notes) {
                const formattedNotes = item.notes.replace(/\n/g, '<br>');
                newNotesContent.innerHTML = formattedNotes;
            } else {
                newNotesContent.textContent = 'Click to add notes...';
            }
            
            // Replace edit interface with new content
            editArea.replaceWith(newNotesContent);
            
            // Add event listener for the new content element
            newNotesContent.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editNotes(item, notesSection, newNotesContent);
            });
        };
        
        // Add event listeners only to buttons, not to document clicks
        saveBtn.addEventListener('click', saveNotes);
        cancelBtn.addEventListener('click', cancelEdit);
        
        // Stop propagation for textarea clicks to prevent playlist item click
        textarea.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Stop propagation for the edit area
        editArea.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    getItemIcon(type) {
        switch (type) {
            case 'folder': return 'fa-folder';
            case 'video': return 'fa-video';
            case 'audio': return 'fa-music';
            case 'image': return 'fa-image';
            default: return 'fa-file';
        }
    }

    loadMedia() {
        console.log("Loading media...");
        
        if (!this.currentFolder || !this.currentFile) {
            console.log("No folder or file selected, returning");
            return;
        }

        const folder = this.projectData.folders[this.currentFolder];
        const file = folder?.files[this.currentFile];

        if (!file) {
            console.log("File not found in folder");
            return;
        }

        // Deactivate black screen mode
        this.blackScreenBtn.classList.remove('active');
        
        console.log(`Loading ${file.type} file: ${file.fileName}`);
        const mediaPath = `/media/${folder.folderName}/${file.fileName}`;
        
        // Handle different media types independently
        switch (file.type) {
            case 'video':
                console.log("Loading video:", mediaPath);
                // Pause and clear other media
                this.videoPlayer.pause();
                this.audioPlayer.pause();
                
                // Clear all sources before loading video
                this.videoPlayer.removeAttribute('src');
                this.audioPlayer.removeAttribute('src');
                this.imagePlayer.removeAttribute('src');
                
                // Reset titles
                this.selectedVideoTitle.textContent = 'No video selected';
                this.selectedAudioTitle.textContent = 'No audio selected';
                this.selectedImageTitle.textContent = 'No image selected';
                
                // Make sure video player is visible
                this.videoPlayer.style.display = 'block';
                this.imagePlayer.style.display = 'none';
                
                // Load the video
                this.videoPlayer.src = mediaPath;
                this.videoPlayer.volume = file.volume || 1;
                this.updateVolumeDisplay('video', this.videoPlayer.volume);
                this.selectedVideoTitle.textContent = file.title;
                this.videoControls.classList.remove('hidden');
                try {
                    this.videoPlayer.load();
                    console.log("Video loaded successfully");
                    this.updateTimeDisplay('video');
                } catch (e) {
                    console.error("Error loading video:", e);
                }
                break;
                
            case 'audio':
                console.log("Loading audio:", mediaPath);
                // Only pause the audio player, don't affect video/image
                this.audioPlayer.pause();
                
                // Clear only audio source
                this.audioPlayer.removeAttribute('src');
                
                // Update audio title
                this.selectedAudioTitle.textContent = file.title;
                
                // Don't affect image visibility if image is showing
                const hasImage = this.imagePlayer.src && this.imagePlayer.style.display !== 'none';
                
                // Load the audio
                this.audioPlayer.src = mediaPath;
                this.audioPlayer.volume = file.volume || 1;
                this.updateVolumeDisplay('audio', this.audioPlayer.volume);
                this.audioControls.classList.remove('hidden');
                
                try {
                    this.audioPlayer.load();
                    console.log("Audio loaded successfully");
                    this.updateTimeDisplay('audio');
                } catch (e) {
                    console.error("Error loading audio:", e);
                }
                break;
                
            case 'image':
                console.log("Loading image:", mediaPath);
                
                // First, ensure video player won't block the image
                this.videoPlayer.pause();
                this.videoPlayer.removeAttribute('src');
                
                // Preload the new image before replacing the current one
                const newImage = new Image();
                
                // Update image title
                this.selectedImageTitle.textContent = file.title;
                
                // Only set the new image after it's loaded
                newImage.onload = () => {
                    this.imagePlayer.src = mediaPath;
                    console.log("Image loaded successfully");
                    
                    // Ensure the image is visible (not blocked by video)
                    // This helps with z-index stacking issues
                    this.videoPlayer.style.display = 'none';
                    this.imagePlayer.style.display = 'block';
                    this.imagePlayer.style.opacity = '1';
                };
                
                newImage.onerror = (e) => {
                    console.error("Error loading image:", e);
                    // Still try to set the src in case the error is transient
                    this.imagePlayer.src = mediaPath;
                    this.videoPlayer.style.display = 'none';
                    this.imagePlayer.style.display = 'block';
                };
                
                // Start loading the image
                newImage.src = mediaPath;
                break;
        }

        // Update progress bars
        this.updateProgressBar('video');
        this.updateProgressBar('audio');

        // Remove playing class from all items first
        document.querySelectorAll('.playlist-item').forEach(item => {
            item.classList.remove('playing');
        });

        // Add playing class to currently playing/displayed items
        if (this.currentVideoFile) {
            const videoItem = document.querySelector(`[data-file-id="${this.currentVideoFile.id}"]`);
            if (videoItem) videoItem.classList.add('playing');
        }
        
        if (this.currentAudioFile) {
            const audioItem = document.querySelector(`[data-file-id="${this.currentAudioFile.id}"]`);
            if (audioItem) audioItem.classList.add('playing');
        }
        
        if (this.currentImageFile) {
            const imageItem = document.querySelector(`[data-file-id="${this.currentImageFile.id}"]`);
            if (imageItem) imageItem.classList.add('playing');
        }
    }

    getPlayerForType(type) {
        switch (type) {
            case 'video': return this.videoPlayer;
            case 'audio': return this.audioPlayer;
            case 'image': return this.imagePlayer;
            default: return null;
        }
    }

    hideAllPlayers() {
        // Only pause the players, don't clear their sources
        this.videoPlayer.pause();
        this.audioPlayer.pause();
        
        // Reset display state
        this.videoPlayer.style.display = 'none';
        this.imagePlayer.style.display = 'none';
        
        // Reset titles
        this.selectedVideoTitle.textContent = 'No video selected';
        this.selectedAudioTitle.textContent = 'No audio selected';
        this.selectedImageTitle.textContent = 'No image selected';

        // Hide controls
        this.videoControls.classList.add('hidden');
        this.audioControls.classList.add('hidden');
    }

    showBlackScreen() {
        // Hide video and make sure it doesn't block the black screen
        this.videoPlayer.pause();
        this.videoPlayer.removeAttribute('src');
        this.videoPlayer.style.display = 'none';
        
        // Pause audio but don't stop it
        // this.audioPlayer.pause();
        
        // Show the black screen image
        const tempImage = new Image();
        tempImage.onload = () => {
            this.imagePlayer.src = '/black.jpg';
            this.imagePlayer.style.display = 'block';
            this.imagePlayer.style.opacity = '1';
            console.log("Black screen image loaded successfully");
        };
        tempImage.onerror = (e) => {
            console.error("Error loading black screen image:", e);
            // Set a black background as fallback
            this.imagePlayer.removeAttribute('src');
            this.imagePlayer.style.display = 'block';
            this.imagePlayer.style.backgroundColor = '#000';
        };
        tempImage.src = '/black.jpg';
        
        // Update button state
        this.blackScreenBtn.classList.add('active');
        
        // Clear titles except for image title
        this.selectedVideoTitle.textContent = '';
        this.selectedAudioTitle.textContent = '';
        this.selectedImageTitle.textContent = 'Black Screen';
        
        // Hide video controls
        this.videoControls.classList.add('hidden');
    }

    handleProgressBarClick(event, type) {
        const player = type === 'video' ? this.videoPlayer : this.audioPlayer;
        const progressBar = type === 'video' ? this.videoProgress : this.audioProgress;
        
        if (player && player.duration) {
            const rect = progressBar.getBoundingClientRect();
            const pos = (event.clientX - rect.left) / rect.width;
            const newTime = player.duration * pos;
            
            player.currentTime = newTime;
            this.updateProgressBar(type);
            
            this.sendSocketMessage(`player.seek${type.charAt(0).toUpperCase() + type.slice(1)}`, {
                time: newTime,
                duration: player.duration,
                percent: pos * 100,
                wasPlaying: !player.paused
            });
        }
    }

    updateProgressBar(type) {
        const player = type === 'video' ? this.videoPlayer : this.audioPlayer;
        const progressFill = type === 'video' ? 
            this.videoProgress.querySelector('.progress-fill') : 
            this.audioProgress.querySelector('.progress-fill');
        
        if (player && player.duration) {
            const percentage = (player.currentTime / player.duration) * 100;
            progressFill.style.width = `${percentage}%`;
            
            // Update time display
            this.updateTimeDisplay(type);
        } else {
            progressFill.style.width = '0%';
        }
    }

    updatePlayButton(type, isPlaying) {
        const button = type === 'video' ? this.playVideoBtn : this.playAudioBtn;
        
        // Always keep the play icon, don't change to pause icon
        button.innerHTML = '<i class="fas fa-play"></i>';
        
        // Add/remove playing class for visual feedback (red color)
        if (isPlaying) {
            button.classList.add('playing');
        } else {
            button.classList.remove('playing');
        }
        
        // Update the button title for accessibility
        button.title = isPlaying ? `Playing ${type}` : `Play ${type}`;
        
        // Log state change for debugging
        console.log(`${type} player is now ${isPlaying ? 'playing' : 'paused'}`);
    }

    adjustVolume(type, delta) {
        const player = type === 'video' ? this.videoPlayer : this.audioPlayer;
        player.volume = Math.max(0, Math.min(1, player.volume + delta));
        
        // Update volume display
        this.updateVolumeDisplay(type, player.volume);
        
        if (this.currentFolder && this.currentFile) {
            const file = this.projectData.folders[this.currentFolder].files[this.currentFile];
            if (file && file.type === type) {
                file.volume = player.volume;
                this.sendSocketMessage('player.setVolumeOfFile', {
                    folderID: this.currentFolder,
                    fileID: this.currentFile,
                    volume: player.volume
                });
            }
        }
    }

    resetVideo() {
        if (this.videoPlayer.src) {
            this.videoPlayer.currentTime = 0;
            this.sendSocketMessage('player.seekVideo', {
                time: 0,
                duration: this.videoPlayer.duration,
                percent: 0,
                wasPlaying: !this.videoPlayer.paused
            });
        }
    }

    resetAudio() {
        if (this.audioPlayer.src) {
            this.audioPlayer.currentTime = 0;
            this.sendSocketMessage('player.seekAudio', {
                time: 0,
                duration: this.audioPlayer.duration,
                percent: 0,
                wasPlaying: !this.audioPlayer.paused
            });
        }
    }

    handleBlackScreen() {
        // Show the black screen locally
        this.showBlackScreen();
        
        // Notify other clients to show black screen
        this.sendSocketMessage('player.blackScreen');
    }

    handleMuteAll() {
        const isMuted = this.muteAllBtn.classList.toggle('active');
        this.videoPlayer.muted = isMuted;
        this.audioPlayer.muted = isMuted;
    }

    navigateBack() {
        this.currentFolder = null;
        this.currentFile = null;
        this.sendSocketMessage('player.selectFolder', { folderID: undefined });
        this.refreshPlaylist();
    }

    handleKeyboardControls(e) {
        // Don't handle keyboard events if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Helper to simulate button press
        const simulateButtonPress = (btn) => {
            if (!btn) return;
            
            // Add active class for visual feedback
            btn.classList.add('active');
            
            // Trigger click to execute the action
            btn.click();
            
            // Remove active class after a brief delay
            setTimeout(() => {
                btn.classList.remove('active');
            }, 150);
        };

        switch (e.key) {
            case 'u':
                simulateButtonPress(this.playVideoBtn);
                break;
            case 'i':
                simulateButtonPress(this.pauseVideoBtn);
                break;
            case 'j':
                simulateButtonPress(this.playAudioBtn);
                break;
            case 'k':
                simulateButtonPress(this.pauseAudioBtn);
                break;
            case 'b':
                simulateButtonPress(this.blackScreenBtn);
                break;
            case 'o':
                simulateButtonPress(this.resetVideoBtn);
                break;
            case 'l':
                simulateButtonPress(this.resetAudioBtn);
                break;
            case 'ArrowUp':
            case 'ArrowDown':
                this.handleArrowNavigation(e);
                break;
            case 'Enter':
                this.handleEnterKey();
                break;
            case 'ArrowLeft':
                if (this.currentFolder) {
                    simulateButtonPress(this.backButton);
                }
                break;
        }
    }

    handleArrowNavigation(e) {
        e.preventDefault();
        const items = Array.from(this.itemList.children);
        if (!items.length) return;

        let currentIndex = -1;
        
        // First check for the current keyboard-selected item
        const keyboardSelectedItem = document.querySelector('.playlist-item.keyboard-selected');
        if (keyboardSelectedItem) {
            currentIndex = items.indexOf(keyboardSelectedItem);
        }
        
        // Only if no keyboard selection exists, check for selected item
        if (currentIndex === -1) {
            const visibleSelectedItem = document.querySelector('.playlist-item.selected');
            if (visibleSelectedItem) {
                currentIndex = items.indexOf(visibleSelectedItem);
            }
        }
        
        // If no visible selection, use remembered selected item
        if (currentIndex === -1 && this.selectedItem) {
            currentIndex = items.indexOf(this.selectedItem);
        }
        
        // If still no selection, use last index
        if (currentIndex === -1 && this.lastSelectedIndex >= 0 && this.lastSelectedIndex < items.length) {
            currentIndex = this.lastSelectedIndex;
        }
        
        // If no valid selection at all, start from top or bottom based on direction
        if (currentIndex === -1) {
            currentIndex = e.key === 'ArrowUp' ? items.length - 1 : 0;
        } else {
            // Calculate next index with wrapping
            if (e.key === 'ArrowUp') {
                currentIndex = (currentIndex - 1 + items.length) % items.length;
            } else {
                currentIndex = (currentIndex + 1) % items.length;
            }
        }

        // Remove only keyboard selection from all items
        items.forEach(item => {
            item.classList.remove('keyboard-selected');
        });

        // Add keyboard selection to the new item
        const newSelectedItem = items[currentIndex];
        newSelectedItem.classList.add('keyboard-selected');
        this.selectedItem = newSelectedItem;
        this.lastSelectedIndex = currentIndex;

        // Scroll the selected item into view
        newSelectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    handleEnterKey() {
        if (this.selectedItem) {
            // Add animation for enter press
            this.selectedItem.classList.add('keyboard-active');
            
            // Remember the file ID for better post-click selection tracking
            const fileId = this.selectedItem.getAttribute('data-file-id');
            
            // Execute the click
            this.selectedItem.click();
            
            // Remove the animation after a brief delay
            setTimeout(() => {
                // After clicking, find the element again in case DOM has changed
                const newElement = document.querySelector(`.playlist-item[data-file-id="${fileId}"]`);
                if (newElement) {
                    newElement.classList.remove('keyboard-active');
                    
                    // Update the selection to point to the new element
                    this.selectedItem = newElement;
                    const items = Array.from(this.itemList.children);
                    this.lastSelectedIndex = items.indexOf(newElement);
                } else if (this.selectedItem) {
                    this.selectedItem.classList.remove('keyboard-active');
                }
            }, 150);
        }
    }

    async handleRescan() {
        try {
            this.rescanButton.disabled = true;
            this.rescanButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Scanning...';
            
            const response = await fetch('/api/rescan', { method: 'POST' });
            if (!response.ok) throw new Error('Rescan failed');
            
            // Reload project data
            const projectResponse = await fetch('/api/project');
            if (!projectResponse.ok) throw new Error('Failed to reload project data');
            
            const projectData = await projectResponse.json();
            this.projectData = projectData;
            this.refreshPlaylist();
        } catch (error) {
            console.error('Error during rescan:', error);
        } finally {
            this.rescanButton.disabled = false;
            this.rescanButton.innerHTML = '<i class="fas fa-sync"></i> Rescan Media';
        }
    }

    async loadInitialData() {
        try {
            const response = await fetch('/api/project');
            if (!response.ok) throw new Error('Failed to load project data');
            
            const data = await response.json();
            this.projectData = data;
            this.refreshPlaylist();
        } catch (error) {
            console.error('Error loading initial data:', error);
            // If initial load fails, try rescanning
            this.handleRescan();
        }
    }

    getFileById(fileId) {
        for (const folder of Object.values(this.projectData.folders)) {
            if (folder.files[fileId]) {
                return folder.files[fileId];
            }
        }
        return null;
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            this.mediaContainer.requestFullscreen().then(() => {
                // Add fullscreen class after entering fullscreen
                this.mediaContainer.classList.add('fullscreen');
            }).catch(err => {
                console.error('Error attempting to enable fullscreen:', err.message);
            });
        } else {
            // Exit fullscreen
            document.exitFullscreen();
        }
    }

    // New direct play methods
    playVideo() {
        console.log("Direct video play called");
        if (this.videoPlayer.src) {
            console.log("Video has source, attempting to play");
            this.videoPlayer.play()
                .then(() => console.log("Video playing successfully"))
                .catch(e => {
                    console.error("Video play error:", e);
                    // Try again with user interaction
                    this.playVideoBtn.onclick = () => {
                        this.videoPlayer.play()
                            .catch(err => console.error("Retry video play error:", err));
                    };
                });
        } else {
            console.log("No video source to play");
        }
    }
    
    playAudio() {
        console.log("Direct audio play called");
        if (this.audioPlayer.src) {
            console.log("Audio has source, attempting to play");
            this.audioPlayer.play()
                .then(() => console.log("Audio playing successfully"))
                .catch(e => {
                    console.error("Audio play error:", e);
                    // Try again with user interaction
                    this.playAudioBtn.onclick = () => {
                        this.audioPlayer.play()
                            .catch(err => console.error("Retry audio play error:", err));
                    };
                });
        } else {
            console.log("No audio source to play");
        }
    }

    // New method to update volume displays
    updateVolumeDisplay(type, volume) {
        const percentage = Math.round(volume * 100);
        
        if (type === 'video') {
            this.videoVolumeDisplay.textContent = `${percentage}%`;
        } else {
            this.audioVolumeDisplay.textContent = `${percentage}%`;
        }
    }

    moveFileItem(item, direction) {
        if (!this.currentFolder || !item) return;
        
        // Get all file IDs in the current folder
        const folder = this.projectData.folders[this.currentFolder];
        if (!folder) return;
        
        // Get ordered array of file IDs
        let fileIds = Object.keys(folder.files);
        
        // Check if we have order information and use it if available
        if (!folder.fileOrder) {
            // Create initial order array if it doesn't exist
            folder.fileOrder = fileIds;
        } else {
            // Make sure fileOrder contains all files (might have new ones added since last ordering)
            const existingIds = new Set(folder.fileOrder);
            fileIds.forEach(id => {
                if (!existingIds.has(id)) {
                    folder.fileOrder.push(id);
                }
            });
            
            // Remove any IDs from fileOrder that no longer exist in the folder
            folder.fileOrder = folder.fileOrder.filter(id => folder.files[id]);
            
            // Use the existing order
            fileIds = folder.fileOrder;
        }
        
        // Find current position of the item
        const currentIndex = fileIds.indexOf(item.id);
        if (currentIndex === -1) return;
        
        // Calculate new position
        let newIndex;
        if (direction === 'up') {
            // Move up (towards index 0)
            newIndex = Math.max(0, currentIndex - 1);
        } else {
            // Move down (towards end of array)
            newIndex = Math.min(fileIds.length - 1, currentIndex + 1);
        }
        
        // Don't do anything if the item is already at the limit
        if (newIndex === currentIndex) return;
        
        // Reorder the array
        fileIds.splice(currentIndex, 1); // Remove from current position
        fileIds.splice(newIndex, 0, item.id); // Insert at new position
        
        // Update the folder's fileOrder
        folder.fileOrder = fileIds;
        
        // Send order change to server
        this.sendSocketMessage('player.setFileOrder', {
            folderID: this.currentFolder,
            fileOrder: fileIds
        });
        
        // Refresh the playlist to reflect the new order
        this.refreshPlaylist();
        
        // Add animation to the moved item
        setTimeout(() => {
            const movedItem = document.querySelector(`.playlist-item[data-file-id="${item.id}"]`);
            if (movedItem) {
                movedItem.classList.add('reordering');
                setTimeout(() => {
                    movedItem.classList.remove('reordering');
                }, 400); // Match duration of the animation
            }
        }, 10); // Small delay to ensure DOM is updated
    }

    // Add the WebSocket override functionality
    initializeWsOverride() {
        // Check for stored override URL in localStorage
        this.overrideWsUrl = localStorage.getItem('wsOverrideUrl');
        
        // Initialize override button
        this.wsOverrideBtn.addEventListener('click', () => {
            const currentUrl = this.overrideWsUrl || this.currentWsUrl || '';
            const newUrl = prompt('Enter WebSocket URL to override connection:', currentUrl);
            
            if (newUrl !== null) {
                if (newUrl.trim() === '') {
                    // User wants to clear the override
                    localStorage.removeItem('wsOverrideUrl');
                    this.overrideWsUrl = null;
                    alert('WebSocket override cleared. Will use default server address on next connection.');
                } else {
                    // Save the override URL
                    localStorage.setItem('wsOverrideUrl', newUrl);
                    this.overrideWsUrl = newUrl;
                    alert(`WebSocket override set to: ${newUrl}\nWill connect to this address on next connection.`);
                }
                
                // If we're connected, ask if they want to reconnect now
                if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                    if (confirm('Do you want to reconnect using the new address now?')) {
                        // Send confirmation to other instances
                        this.sendSocketMessage('player.wsOverrideConfirm', {
                            url: newUrl,
                            reconnect: true,
                            isInitiator: true
                        });
                        this.connectWebSocket();
                    }
                }
            }
        });
    }

    // Format time in MM:SS format
    formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) return '0:00';
        seconds = Math.round(seconds);
        const minutes = Math.floor(seconds / 60);
        seconds = seconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    // Update the time display for a player type
    updateTimeDisplay(type) {
        const player = type === 'video' ? this.videoPlayer : this.audioPlayer;
        const display = type === 'video' ? this.videoTimeDisplay : this.audioTimeDisplay;
        
        if (player && !isNaN(player.duration)) {
            const currentTime = this.formatTime(player.currentTime);
            const duration = this.formatTime(player.duration);
            display.textContent = `${currentTime} / ${duration}`;
        } else {
            display.textContent = '0:00 / 0:00';
        }
    }

    // Add a new method to handle enabling media playback
    enableMediaPlayback() {
        // Hide the overlay
        this.enablePlaybackOverlay.classList.add('hidden');
        
        // Create a silent audio context to unlock audio
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const silentSource = audioContext.createOscillator();
        silentSource.start();
        silentSource.stop(0.1);
        
        // Prime the video and audio elements with user gesture
        this.videoPlayer.play().catch(() => {});
        this.videoPlayer.pause();
        this.audioPlayer.play().catch(() => {});
        this.audioPlayer.pause();
        
        console.log('Media playback enabled by user interaction');
    }
}

// Initialize the application
new SmartPlayer(); 