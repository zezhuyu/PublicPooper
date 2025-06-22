function setupWebRTC(role, streamId, videoElementId = null, onDebugUpdate = null) {
  // Validate role parameter
  if (role !== 'viewer' && role !== 'broadcaster') {
    console.error(`Invalid role: ${role}. Must be 'viewer' or 'broadcaster'`);
    return null;
  }

  // Helper function to update debug info
  const updateDebug = (state, details = null) => {
    if (onDebugUpdate) {
      onDebugUpdate(streamId, role, state, details);
    }
  };

  updateDebug('connecting', 'Initializing WebRTC connection');

  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  });
  
  const wsHost = process.env.NODE_ENV === 'production' ? location.host : 'air.local:8000';
  const ws = new WebSocket(`ws://${wsHost}/signal/${streamId}/${role}`);

  ws.onopen = () => {
    ws.send(role);
    console.log(`[${streamId}] ${role} connected`);
    updateDebug('websocket-connected', 'WebSocket connection established');
  };

  ws.onmessage = async ({ data }) => {
    const msg = JSON.parse(data);
    console.log(`[${streamId}] Received message:`, msg);

    if (msg.type === 'offer' && role === 'viewer') {
      await pc.setRemoteDescription(new RTCSessionDescription(msg));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify(pc.localDescription));
      updateDebug('offer-processed', 'Processed offer and sent answer');
    }

    if (msg.type === 'answer' && role === 'broadcaster') {
      await pc.setRemoteDescription(new RTCSessionDescription(msg));
      updateDebug('answer-processed', 'Processed answer from viewer');
    }

    if (msg.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
      updateDebug('ice-candidate', 'Added ICE candidate');
    }
  };

  ws.onerror = (error) => {
    console.error(`[${streamId}] WebSocket error occurred:`, error);
    console.error(`[${streamId}] WebSocket readyState:`, ws.readyState);
    console.error(`[${streamId}] WebSocket URL:`, ws.url);
    console.error(`[${streamId}] Error type:`, error.type || 'unknown');
    console.error(`[${streamId}] Error target:`, error.target || 'unknown');
    
    // Check WebSocket ready states
    const states = {
      0: 'CONNECTING',
      1: 'OPEN', 
      2: 'CLOSING',
      3: 'CLOSED'
    };
    
    console.error(`[${streamId}] Connection state: ${states[ws.readyState]} (${ws.readyState})`);
    console.error(`[${streamId}] Troubleshooting:`);
    console.error(`[${streamId}]   - Check if backend server is running on air.local:8000`);
    console.error(`[${streamId}]   - Verify WebSocket endpoint /signal/${streamId}/${role} exists`);
    console.error(`[${streamId}]   - Ensure role is 'viewer' or 'broadcaster'`);
    console.error(`[${streamId}]   - Ensure no firewall blocking port 8000`);
    
    updateDebug('websocket-error', `WebSocket connection failed - check backend server`);
  };

  ws.onclose = (event) => {
    console.log(`[${streamId}] WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
    
    // Provide more specific close code information
    if (event.code === 1006) {
      console.error(`[${streamId}] Connection closed abnormally - likely server not reachable`);
      console.error(`[${streamId}] This usually means:`);
      console.error(`[${streamId}]   - Backend server is not running`);
      console.error(`[${streamId}]   - Wrong hostname/port (check air.local:8000)`);
      console.error(`[${streamId}]   - Network connectivity issues`);
    } else if (event.code === 1000) {
      console.log(`[${streamId}] Connection closed normally`);
    } else if (event.code === 1001) {
      console.log(`[${streamId}] Connection closed due to page navigation/reload`);
    } else {
      console.warn(`[${streamId}] Connection closed with code: ${event.code}`);
    }
    
    updateDebug('websocket-closed', `Connection closed: ${event.reason || `Code ${event.code}`}`);
  };

  pc.onicecandidate = ({ candidate }) => {
    if (candidate && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ candidate }));
      updateDebug('ice-candidate-sent', 'Sent ICE candidate');
    } else if (!candidate) {
      console.log(`[${streamId}] ICE gathering complete`);
    }
  };

  pc.onconnectionstatechange = () => {
    console.log(`[${streamId}] Connection state: ${pc.connectionState}`);
    updateDebug('connection-state', pc.connectionState);
  };

  pc.oniceconnectionstatechange = () => {
    console.log(`[${streamId}] ICE connection state: ${pc.iceConnectionState}`);
    updateDebug('ice-state', pc.iceConnectionState);
  };

  if (role === 'viewer') {
    pc.ontrack = (event) => {
      const video = document.getElementById(videoElementId || 'remote');
      if (video && video.srcObject !== event.streams[0]) {
        video.srcObject = event.streams[0];
        console.log(`[${streamId}] stream attached`);
        updateDebug('stream-attached', 'Remote stream attached to video element');
      }
    };
  }

  if (role === 'broadcaster') {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(async stream => {
        const localVideo = document.getElementById('local');
        if (localVideo) {
          localVideo.srcObject = stream;
        }
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(offer));
          updateDebug('offer-sent', 'Sent offer to signaling server');
        } else {
          console.log(`[${streamId}] WebSocket not open, waiting to send offer...`);
          updateDebug('waiting-websocket', 'Waiting for WebSocket to open');
          // Wait for WebSocket to connect
          ws.addEventListener('open', () => {
            ws.send(JSON.stringify(offer));
            updateDebug('offer-sent', 'Sent offer after WebSocket opened');
          });
        }
      })
      .catch(error => {
        console.error(`[${streamId}] Failed to get user media:`, error);
        updateDebug('media-error', `Failed to access camera/microphone: ${error.message}`);
      });
  }

  // Return connection object for cleanup
  return {
    pc,
    ws,
    close: () => {
      pc.close();
      ws.close();
      updateDebug('connection-closed', 'WebRTC connection closed');
    }
  };
}

export default setupWebRTC;
