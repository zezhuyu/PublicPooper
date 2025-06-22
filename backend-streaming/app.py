#!/usr/bin/env python3
"""
Serve example html documents (to be replaced later) and websocket stream

@author:          Chet Gupt <chatgpt@openai.com>
@prompt-engineer: Will Pringle <willkantorpringle@gmail.com>

Minimal peer-to-peer video streaming application built with Flask,
WebSockets, and WebRTC. It allows multiple broadcasters to stream
video/audio directly from their browsers and multiple viewers to watch
those streams in real-time — all within the same local network.

I only tested watch-all endpoint and stream/stream1, stream/stream2
endpoints - the rest are artifacts from the vibe coding journey (:
"""

from flask import Flask, render_template
from flask_sock import Sock
import json

app = Flask(__name__)
sock = Sock(app)

# Key: stream_id, Value: {'broadcaster': ws, 'viewer': ws}
streams = {}

@app.route('/stream/<stream_id>')
def stream(stream_id):
    return render_template('stream.html', stream_id=stream_id)

@app.route('/watch/<stream_id>')
def watch(stream_id):
    return render_template('watch.html', stream_id=stream_id)

@app.route('/watch-all')
def watch_all():
    # Hardcoded stream IDs for now
    stream_ids = ['stream1', 'stream2', 'stream3']
    return render_template('watch_all.html', stream_ids=stream_ids)

@sock.route('/signal/<stream_id>')
def signaling(ws, stream_id):
    role = ws.receive()
    print(f"[{stream_id}] {role} connected")

    if stream_id not in streams:
        streams[stream_id] = {}

    streams[stream_id][role] = ws

    other_role = 'viewer' if role == 'broadcaster' else 'broadcaster'
    try:
        while True:
            msg = ws.receive()
            if not msg:
                break

            other = streams[stream_id].get(other_role)
            if other:
                other.send(msg)
    except:
        pass
    finally:
        print(f"[{stream_id}] {role} disconnected")
        if stream_id in streams:
            streams[stream_id][role] = None

if __name__ == '__main__':
    context = ('cert.pem', 'key.pem')  # Cert, Key
    app.run(host='0.0.0.0', port=5000, ssl_context=context, debug=True)

