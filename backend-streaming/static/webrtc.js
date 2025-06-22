const ws_protocol = 'wss';

function setupWebRTC(role, streamId, videoElementId = null) {
  const pc = new RTCPeerConnection();
  const ws = new WebSocket(`${ws_protocol}://${location.host}/signal/${streamId}`);

  ws.onopen = () => {
    ws.send(role);
    console.log(`[${streamId}] ${role} connected`);
  };

  ws.onmessage = async ({ data }) => {
    const msg = JSON.parse(data);

    if (msg.type === 'offer' && role === 'viewer') {
      await pc.setRemoteDescription(new RTCSessionDescription(msg));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify(pc.localDescription));
    }

    if (msg.type === 'answer' && role === 'broadcaster') {
      await pc.setRemoteDescription(new RTCSessionDescription(msg));
    }

    if (msg.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
    }
  };

  pc.onicecandidate = ({ candidate }) => {
    if (candidate) {
      ws.send(JSON.stringify({ candidate }));
    }
  };

  if (role === 'viewer') {
    pc.ontrack = (event) => {
      const video = document.getElementById(videoElementId || 'remote');
      if (video && video.srcObject !== event.streams[0]) {
        video.srcObject = event.streams[0];
        console.log(`[${streamId}] stream attached`);
      }
    };
  }

  if (role === 'broadcaster') {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(async stream => {
      document.getElementById('local').srcObject = stream;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify(offer));
    });
  }
}

