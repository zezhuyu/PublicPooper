# WebRTC Integration for PublicPooper Frontend

This document explains how the original backend WebRTC functionality has been integrated into the PublicPooper frontend.

## Overview

The WebRTC integration uses the **exact same WebRTC code from the backend** (`backend-streaming/static/webrtc.js`) moved directly to the frontend (`/src/utils/webrtc.js`) without modifications. This ensures 100% compatibility with the backend signaling server.

## Implementation

1. **Original Backend WebRTC** (`/src/utils/webrtc.js`) - Exact copy of backend WebRTC file
2. **Room Page Integration** (`/src/app/room/[roomId]/page.js`) - UI integration using the original setupWebRTC function
3. **Backend Signaling** - Uses WebSocket signaling server at `ws://air.local:8000` (HTTP for development)

## Features

### Video Streaming
- **Local Video**: Shows your own camera feed with mute/unmute controls
- **Remote Videos**: Displays video streams from other users in the room
- **Automatic Fallback**: Shows placeholder 🚽 emoji when video is not available

### Audio Controls
- **Mute/Unmute**: Toggle microphone on/off
- **Visual Indicators**: Muted state shows red background on controls

### Video Controls
- **Camera On/Off**: Toggle camera video on/off
- **Visual Indicators**: Camera off state shows red background on controls

### Connection Management
- **Automatic Setup**: WebRTC initializes automatically when room loads
- **Peer Discovery**: Automatically connects to other users in the room
- **Cleanup**: Properly closes connections when leaving room

## UI Integration

### Video Grid Layout
```
┌─────────────────┬─────────────────┐
│   Local Video   │  Remote Video 1 │
│   (Your Feed)   │   (Other User)  │
├─────────────────┼─────────────────┤
│ Remote Video 2  │  Remote Video 3 │
│  (Other User)   │   (Other User)  │
└─────────────────┴─────────────────┘
```

### Control Panel
The bottom control panel includes:
- 🎤 Mute/Unmute button
- 📹 Video On/Off button  
- 📺 Screen Share button (placeholder)
- 📞 Enable Video Chat button (when disabled)
- ⚙️ Settings button (placeholder)
- ☎️ Leave Call button

## Technical Implementation

### WebRTC Setup Process
1. **Room Initialization**: When user joins room, WebRTC setup is triggered
2. **Local Stream**: Requests camera/microphone access
3. **Signaling**: Connects to WebSocket signaling server
4. **Peer Connections**: Establishes RTCPeerConnection for each user
5. **Stream Exchange**: Exchanges video/audio streams via ICE candidates

### Role System
- **broadcaster**: User sharing their video/audio stream (sends media)
- **viewer**: User receiving video/audio from others (receives media)
- Each user is typically a broadcaster for their own stream and viewer for others
- Role parameter must be exactly 'broadcaster' or 'viewer' - no other values accepted

### Error Handling
- **Camera/Mic Access**: Falls back gracefully if permissions denied
- **Connection Issues**: Shows error messages for CORS or network issues
- **Signaling Failures**: Continues to work without real-time features

### Backend Requirements
The frontend expects a WebRTC signaling server running on `wss://air.local:8000` (secure) with:
- WebSocket endpoint: `/signal/{streamId}`
- Message types: `offer`, `answer`, `ice-candidate`
- Authentication: Basic room/user validation

## Usage Instructions

### For Users
1. **Join a Room**: Navigate to any room page
2. **Allow Permissions**: Grant camera/microphone access when prompted
3. **Auto-Connect**: Video chat will start automatically when others join
4. **Manual Enable**: Click "Enable Video Chat" button if not auto-started
5. **Control Audio/Video**: Use bottom control panel to mute/unmute

### For Developers
1. **setupWebRTC Function**: Import `setupWebRTC` from `/src/utils/webrtc.js` 
2. **Setup Connection**: Call `setupWebRTC(role, streamId, videoElementId)`
   - `role`: 'broadcaster' or 'viewer'
   - `streamId`: unique identifier for the stream (usually user ID)
   - `videoElementId`: DOM element ID where video should be displayed
3. **Video Elements**: Create video elements with specific IDs:
   - `'local'` for local user video
   - `'remote-{userId}'` for remote user videos
4. **No Cleanup Needed**: Original backend code handles connections automatically

## Configuration

### Environment Variables
- `NODE_ENV`: Determines WebSocket host (production vs development)
- Backend signaling server should be configured in WebRTC manager

### Backend Signaling Server
Expected to run on:
- **All Environments**: `wss://air.local:8000` (development) or production host with WSS (HTTPS only)

**Endpoint Format**: `/signal/{streamId}/{role}` (updated for secure connections)

**Important**: The signaling server must support SSL/WSS for video chat to work. The frontend uses secure connections globally.

## Troubleshooting

### Common Issues
1. **No Video**: Check camera permissions in browser
2. **No Audio**: Check microphone permissions 
3. **Connection Failed**: Verify secure signaling server is running at `wss://air.local:8000` with SSL support
4. **CORS Errors**: Configure backend to allow frontend domain
5. **WebSocket Errors**: Check if backend WebRTC signaling server is started
6. **"Bad Response" Error**: Signaling server endpoint may be wrong or server is down
7. **getUserMedia Error**: Browser may not support camera/microphone or permissions denied
8. **Other Users Can't Connect**: Check that signaling server is properly routing messages between users

### Debug Information
- Open browser console to see WebRTC connection logs
- Check Network tab for WebSocket connection status
- Verify camera/microphone permissions in browser settings
- Look for "WebRTC signaling server not available" messages
- Check for ICE candidate exchange in console logs

### Browser Compatibility
- **Chrome/Edge**: Full support for WebRTC
- **Firefox**: Full support for WebRTC  
- **Safari**: Limited WebRTC support, may require HTTPS
- **Mobile browsers**: Limited camera/microphone access

### Error Handling
- **No Camera/Mic**: Falls back to audio-only or shows "No Camera/Mic" indicator
- **WebSocket Fails**: Continues without real-time video features
- **Permissions Denied**: Shows appropriate error messages
- **Connection Issues**: Automatic cleanup and reconnection attempts

### Starting the Backend Signaling Server
Before using video chat features, ensure your backend signaling server is running:
```bash
# Navigate to your backend directory
cd /path/to/backend-streaming

# Start the signaling server (usually on port 8000)
python app.py  # or however your backend starts
```

## Future Enhancements

### Planned Features
- Screen sharing implementation
- Chat integration with video
- Recording capabilities
- Room-wide mute controls
- Video quality settings

### Backend Integration
- Direct integration with room WebSocket for unified messaging
- User presence indicators
- Bandwidth optimization
- Mobile device support
