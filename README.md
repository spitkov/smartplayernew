# SmartPlayer 2.0

A modern, web-based media player application for managing and playing video, audio, and image files.

## Features

- Folder-based media organization
- Support for video, audio, and image files
- Real-time synchronization between multiple clients
- Keyboard shortcuts for quick control
- Progress bars with seeking functionality
- Black screen and mute controls
- Modern, responsive interface

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `media` folder in the `public` directory:
```bash
mkdir -p public/media
```

3. Add your media files to subfolders in the `public/media` directory:
```
public/media/
  folder1/
    video1.mp4
    audio1.mp3
    image1.jpg
  folder2/
    video2.mp4
    ...
```

4. Start the server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Keyboard Shortcuts

- `u` - Play video
- `i` - Stop video
- `j` - Play audio
- `k` - Stop audio
- `b` - Black screen
- `o` - Reset video to start
- `l` - Reset audio to start
- Arrow keys - Navigate playlist
- Enter - Select item
- Left arrow - Go back to folders

## Project Structure

- `server.js` - Express server with WebSocket support
- `public/index.html` - Main application HTML
- `public/styles.css` - Application styles
- `public/js/SmartPlayer.js` - Core application logic
- `project-data.json` - Project configuration and metadata

## Data Storage

The application stores project data in `project-data.json`, which includes:
- Folder structure
- File metadata (title, description, volume)
- Current selections

The file is automatically created and updated as you use the application.

## Browser Support

The application works best in modern browsers that support:
- WebSocket API
- ES6+ JavaScript
- CSS Grid and Flexbox
- HTML5 Video and Audio 