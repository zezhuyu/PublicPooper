const ws_protocol = location.protocol === 'https:' ? 'wss' : 'ws';

function setupWebRTC(role, streamId, videoElementId = null) {
  let ws;
  let retryCount = 0;
  const maxRetries = 3;
  let localStream = null;
  let isConnecting = false;
  
  // For broadcaster: multiple peer connections (one per viewer)
  let peerConnections = new Map(); // viewerId -> PeerConnection
  let viewerIdCounter = 0;
  
  // For viewer: single peer connection
  let pc = null;

  function createPeerConnection(viewerId = null) {
    const newPc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    newPc.onicecandidate = ({ candidate }) => {
      if (candidate && ws && ws.readyState === WebSocket.OPEN) {
        const message = { 
          type: 'ice-candidate',
          candidate: candidate 
        };
        
        // Include viewer ID for broadcaster messages
        if (role === 'broadcaster' && viewerId) {
          message.viewerId = viewerId;
        }
        
        ws.send(JSON.stringify(message));
      }
    };

    newPc.onconnectionstatechange = () => {
      const id = viewerId || 'viewer';
      console.log(`[${streamId}] ${role} (${id}) connection state:`, newPc.connectionState);
      
      if (newPc.connectionState === 'failed') {
        if (role === 'viewer' && retryCount < maxRetries) {
          console.log(`[${streamId}] Connection failed, retrying... (${retryCount + 1}/${maxRetries})`);
          setTimeout(() => {
            retryCount++;
            reconnect();
          }, 1000 * retryCount);
        } else if (role === 'broadcaster' && viewerId) {
          // Remove failed peer connection for broadcaster
          console.log(`[${streamId}] Removing failed connection for viewer ${viewerId}`);
          peerConnections.delete(viewerId);
        }
      } else if (newPc.connectionState === 'connected') {
        retryCount = 0; // Reset retry count on successful connection
      }
    };

    if (role === 'viewer') {
      newPc.ontrack = (event) => {
        const video = document.getElementById(videoElementId || 'remote');
        if (video && event.streams[0]) {
          video.srcObject = event.streams[0];
          console.log(`[${streamId}] stream attached to viewer`);
        }
      };
    }

    return newPc;
  }

  function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    ws = new WebSocket(`${ws_protocol}://${location.host}/signal/${streamId}/${role}`);

    ws.onopen = () => {
      console.log(`[${streamId}] ${role} WebSocket connected`);
      isConnecting = false;
      
      // When a viewer connects, notify the broadcaster
      if (role === 'viewer') {
        ws.send(JSON.stringify({ type: 'viewer-joined' }));
      }
    };

    ws.onmessage = async ({ data }) => {
      try {
        const msg = JSON.parse(data);
        console.log(`[${streamId}] ${role} received:`, msg.type, msg.viewerId ? `(viewer ${msg.viewerId})` : '');

        if (msg.type === 'offer' && role === 'viewer') {
          if (pc && pc.signalingState !== 'stable') {
            console.log(`[${streamId}] Ignoring offer, signaling state: ${pc.signalingState}`);
            return;
          }
          
          await pc.setRemoteDescription(new RTCSessionDescription(msg));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          ws.send(JSON.stringify({
            type: 'answer',
            sdp: answer.sdp,
            viewerId: msg.viewerId // Echo back the viewer ID
          }));
        }

        if (msg.type === 'answer' && role === 'broadcaster') {
          const viewerId = msg.viewerId;
          const targetPc = peerConnections.get(viewerId);
          
          if (targetPc && targetPc.signalingState === 'have-local-offer') {
            await targetPc.setRemoteDescription(new RTCSessionDescription(msg));
            console.log(`[${streamId}] Answer processed for viewer ${viewerId}`);
          } else {
            console.log(`[${streamId}] Ignoring answer for viewer ${viewerId}, state: ${targetPc?.signalingState}`);
          }
        }

        if (msg.type === 'ice-candidate' && msg.candidate) {
          if (role === 'viewer' && pc) {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } else {
              console.log(`[${streamId}] Queueing ICE candidate for viewer`);
            }
          } else if (role === 'broadcaster') {
            const viewerId = msg.viewerId;
            const targetPc = peerConnections.get(viewerId);
            
            if (targetPc && targetPc.remoteDescription) {
              await targetPc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } else {
              console.log(`[${streamId}] Queueing ICE candidate for viewer ${viewerId}`);
            }
          }
        }

        // When broadcaster receives viewer-joined, create new peer connection
        if (msg.type === 'viewer-joined' && role === 'broadcaster') {
          if (localStream) {
            const viewerId = ++viewerIdCounter;
            console.log(`[${streamId}] Creating new connection for viewer ${viewerId}`);
            
            const newPc = createPeerConnection(viewerId);
            localStream.getTracks().forEach(track => newPc.addTrack(track, localStream));
            peerConnections.set(viewerId, newPc);
            
            const offer = await newPc.createOffer();
            await newPc.setLocalDescription(offer);
            
            ws.send(JSON.stringify({
              type: 'offer',
              sdp: offer.sdp,
              viewerId: viewerId
            }));
          } else {
            console.log(`[${streamId}] Cannot create offer - no local stream`);
          }
        }
      } catch (error) {
        console.error(`[${streamId}] Error handling message:`, error);
      }
    };

    ws.onclose = (event) => {
      console.log(`[${streamId}] WebSocket closed:`, event.code, event.reason);
      if (!isConnecting && retryCount < maxRetries) {
        setTimeout(() => {
          retryCount++;
          reconnect();
        }, 1000 * retryCount);
      }
    };

    ws.onerror = (error) => {
      console.error(`[${streamId}] WebSocket error:`, error);
    };
  }

  function reconnect() {
    if (isConnecting) return;
    
    isConnecting = true;
    console.log(`[${streamId}] Reconnecting... (attempt ${retryCount})`);
    
    // Close existing connections
    if (role === 'viewer' && pc) {
      pc.close();
      pc = null;
    } else if (role === 'broadcaster') {
      peerConnections.forEach(pc => pc.close());
      peerConnections.clear();
      viewerIdCounter = 0;
    }
    
    if (ws) {
      ws.close();
    }
    
    // Create new connections
    if (role === 'viewer') {
      pc = createPeerConnection();
    }
    
    if (role === 'broadcaster' && localStream) {
      // Peer connections will be created when viewers join
    }
    
    connectWebSocket();
  }

  // Initialize
  if (role === 'viewer') {
    pc = createPeerConnection();
  }
  connectWebSocket();

  if (role === 'broadcaster') {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(async stream => {
      const localVideo = document.getElementById('local');
      if (localVideo) {
        localVideo.srcObject = stream;
      }
      
      localStream = stream;
      console.log(`[${streamId}] broadcaster stream ready`);
    }).catch(error => {
      console.error(`[${streamId}] Error accessing media:`, error);
    });
  }

  // Return control functions
  return { 
    get pc() { return role === 'viewer' ? pc : Array.from(peerConnections.values())[0]; },
    ws, 
    reconnect: () => {
      retryCount = 0;
      reconnect();
    },
    close: () => {
      if (role === 'viewer' && pc) {
        pc.close();
      } else if (role === 'broadcaster') {
        peerConnections.forEach(pc => pc.close());
        peerConnections.clear();
      }
      
      if (ws) ws.close();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    },
    getStats: () => {
      if (role === 'broadcaster') {
        return {
          activeConnections: peerConnections.size,
          viewerIds: Array.from(peerConnections.keys())
        };
      }
      return { connected: pc?.connectionState === 'connected' };
    }
  };
}

