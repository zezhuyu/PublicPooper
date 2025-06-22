# PublicPooper API Server

A FastAPI-based server that provides real-time chatting, betting, user management, room functionality, and emoji support with WebSocket live streaming capabilities.

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the server:
```bash
python api.py
```

The server will start on `http://localhost:8000`

## API Documentation

Once the server is running, you can access:
- Interactive API docs: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

## Key Features

### 1. Real-Time WebSocket Chat
- `WebSocket /ws/{room_id}/{user_id}` - Real-time chat connection
- `GET /rooms/{rid}/connected-users` - Get currently connected users

#### WebSocket Connection:
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/{room_id}/{user_id}');

// Send chat message
ws.send(JSON.stringify({
    "type": "chat",
    "comment": "Hello everyone! :smile:",
    "targetUid": null  // Optional: for direct messages
}));

// Send ping (keepalive)
ws.send(JSON.stringify({
    "type": "ping"
}));
```

#### Message Types:
**Incoming (Client → Server):**
- `{"type": "chat", "comment": "message", "targetUid": "optional"}`
- `{"type": "ping"}`

**Outgoing (Server → Client):**
- `{"type": "chat", "uid": "sender", "comment": "message", "timestamp": "..."}`
- `{"type": "user_joined", "user_id": "...", "message": "...", "timestamp": "..."}`
- `{"type": "user_left", "user_id": "...", "message": "...", "timestamp": "..."}`
- `{"type": "error", "message": "error description", "timestamp": "..."}`
- `{"type": "pong", "timestamp": "..."}`

### 2. User Management (Normal vs Premium)
- `POST /users` - Create a new user (normal or premium)
- `GET /users/{uid}` - Get user details

#### User Types:
- **Normal Users**: 
  - Can see all emojis (free and premium)
  - Can only send free emojis in chat
  - Cannot upload custom emojis
  - Premium emojis remain as `:emoji_name:` text when attempted in chat
  
- **Premium Users**: 
  - Can see all emojis (free and premium)
  - Can send all emojis in chat
  - Can upload custom emojis
  - Can mark uploaded emojis as premium or regular

### 3. Room Management (Casual vs Competitive)
- `POST /rooms/{room_name}/join/{uid}` - Join existing room or create new one
- `POST /rooms/{rid}/leave/{uid}` - Leave a room
- `GET /rooms/{rid}` - Get room details
- `GET /rooms/{rid}/users` - Get users in a room
- `GET /rooms/{rid}/connected-users` - Get currently connected WebSocket users

#### Room Types:
- **Casual Rooms**: 
  - Default limit: 5 users
  - Only room members can send chat messages (WebSocket and HTTP)
  - No betting allowed
  
- **Competitive Rooms**: 
  - Default limit: 5 users
  - Anyone can send chat messages (even non-members)
  - Betting allowed for any user

### 4. Chat System with Emoji Support (HTTP + WebSocket)
- `POST /rooms/{rid}/chat/{uid}` - Send chat message via HTTP (also broadcasts to WebSocket)
- `GET /rooms/{rid}/chat` - Get chat history
- `WebSocket /ws/{room_id}/{user_id}` - Real-time chat connection

#### Chat Rules:
- **Casual**: Only users who joined the room can chat
- **Competitive**: Any registered user can chat, regardless of room membership
- **Premium Emojis**: Only premium users can use premium emojis in chat
- **Real-time**: Messages sent via either HTTP or WebSocket are broadcast to all connected clients

### 5. Emoji Management (Premium Feature)
- `POST /emojis/upload/{uid}` - Upload custom emoji files (premium users only)
- `GET /emojis` - Get available emojis (filtered by user type)
- `DELETE /emojis/{eid}/{uid}` - Delete emoji (only by uploader)
- Static files served at `/emojis/{filename}` - Access emoji images

#### Emoji Rules:
- **Upload**: Only premium users can upload emojis
- **Visibility**: All users can see all emojis (premium and regular)
- **Usage in Chat**: Only premium users can send premium emojis
- **Chat Fallback**: Premium emojis show as `:emoji_name:` text for normal users

### 6. Betting System (Competitive Rooms Only)
- `POST /rooms/{rid}/bet/{uid}` - Place a bet (competitive rooms only)
- `GET /rooms/{rid}/bets` - Get all bets in a room
- `GET /users/{uid}/bets` - Get user's betting history

#### Betting Rules:
- Only available in **competitive** rooms
- Any registered user can place bets (room membership not required)
- Casual rooms do not allow betting

## WebSocket Live Streaming

### Connection Process:
1. **Connect**: `ws://localhost:8000/ws/{room_id}/{user_id}`
2. **Authentication**: Server validates user and room existence
3. **Room Assignment**: User is added to room's WebSocket group
4. **Notifications**: Other users are notified of the new connection

### Real-time Features:
- **Instant Messaging**: Chat messages appear immediately for all connected users
- **User Presence**: Real-time notifications when users join/leave
- **Emoji Processing**: Premium emoji restrictions enforced in real-time
- **Error Handling**: Connection issues handled gracefully with reconnection support
- **Dual Channel**: Messages sent via HTTP API also broadcast to WebSocket clients

### JavaScript Client Example:
```javascript
const roomId = "room123";
const userId = "user456";
const ws = new WebSocket(`ws://localhost:8000/ws/${roomId}/${userId}`);

ws.onopen = function(event) {
    console.log("Connected to chat room");
};

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    
    switch(message.type) {
        case "chat":
            displayChatMessage(message);
            break;
        case "user_joined":
            showUserJoined(message.user_id);
            break;
        case "user_left":
            showUserLeft(message.user_id);
            break;
        case "error":
            showError(message.message);
            break;
        case "pong":
            console.log("Server is alive");
            break;
    }
};

ws.onclose = function(event) {
    console.log("Disconnected from chat room");
    // Implement reconnection logic here
};

// Send a chat message
function sendMessage(text) {
    ws.send(JSON.stringify({
        "type": "chat",
        "comment": text,
        "targetUid": null
    }));
}

// Send keepalive ping
setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({"type": "ping"}));
    }
}, 30000); // Every 30 seconds
```

## Emoji Usage

### Premium Emoji System
- **Regular Emojis**: Available to all users (normal and premium)
- **Premium Emojis**: Visible to all users, sendable only by premium users
- **Upload Rights**: Only premium users can upload new emojis

### Using Emojis in Chat
Reference emojis in chat messages using the format `:emoji_name:`. For example:
- `"Hello :smile: how are you :thumbsup:"` 
- Premium users: `:premium_diamond:` → `[EMOJI:/emojis/premium_diamond_abc123.png]`
- Normal users: `:premium_diamond:` → `:premium_diamond:` (remains as text, cannot send)

## Example Usage

### 1. Create a Normal User
```bash
curl -X POST "http://localhost:8000/users" \
  -H "Content-Type: application/json" \
  -d '{
    "uname": "john_doe",
    "email": "john@example.com",
    "type": "normal"
  }'
```

### 2. Create a Premium User
```bash
curl -X POST "http://localhost:8000/users" \
  -H "Content-Type: application/json" \
  -d '{
    "uname": "jane_premium",
    "email": "jane@example.com",
    "type": "premium"
  }'
```

### 3. Upload Premium Emoji (Premium Users Only)
```bash
curl -X POST "http://localhost:8000/emojis/upload/{premium_user_id}?name=diamond&isPremium=true" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@diamond.png"
```

### 4. Upload Regular Emoji (Premium Users Only)
```bash
curl -X POST "http://localhost:8000/emojis/upload/{premium_user_id}?name=smile&isPremium=false" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@smile.png"
```

### 5. Get All Emojis (Visible to All Users)
```bash
curl -X GET "http://localhost:8000/emojis"
```

### 6. Get All Emojis with User Context
```bash
curl -X GET "http://localhost:8000/emojis?uid={user_id}"
```

### 7. Create/Join a Casual Room
```bash
curl -X POST "http://localhost:8000/rooms/casual_bathroom/join/{user_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "rname": "casual_bathroom",
    "user_limit": 5,
    "type": "casual",
    "duration": 300.0
  }'
```

### 8. Create/Join a Competitive Room
```bash
curl -X POST "http://localhost:8000/rooms/competitive_arena/join/{user_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "rname": "competitive_arena",
    "user_limit": 5,
    "type": "competitive",
    "duration": 600.0
  }'
```

### 9. Get Connected Users (WebSocket Active)
```bash
curl -X GET "http://localhost:8000/rooms/{room_id}/connected-users"
```

### 10. Send Chat via HTTP (Also Broadcasts to WebSocket)
```bash
curl -X POST "http://localhost:8000/rooms/{room_id}/chat/{premium_user_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Hello team! :smile: :premium_diamond:",
    "targetUid": null
  }'
# Result: Message saved to DB and broadcast to all connected WebSocket clients
```

### 11. Connect to WebSocket (JavaScript)
```javascript
// Connect to room's live chat
const ws = new WebSocket('ws://localhost:8000/ws/room123/user456');

// Send message via WebSocket
ws.send(JSON.stringify({
    "type": "chat",
    "comment": "Hello via WebSocket! :smile:",
    "targetUid": null
}));
```

### 12. Place Bet in Competitive Room
```bash
curl -X POST "http://localhost:8000/rooms/{competitive_room_id}/bet/{user_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "bet": 25.0
  }'
```

## Database

The API uses SQLite with the following tables:
- **Users**: User management with type ("normal" or "premium")
- **Room**: Room information with type ("casual" or "competitive")
- **RoomUser**: User-room relationships
- **Chat**: Chat messages with emoji support
- **Bet**: Betting records (competitive rooms only)
- **LeaderBoard**: User statistics
- **Emoji**: Custom emoji files and metadata with premium flag

## User & Room Rules Summary

### User Types
| Feature | Normal Users | Premium Users |
|---------|-------------|---------------|
| **Chat Access** | ✅ All rooms | ✅ All rooms |
| **WebSocket** | ✅ Real-time chat | ✅ Real-time chat |
| **See All Emojis** | ✅ Can view all | ✅ Can view all |
| **Send Free Emojis** | ✅ Can send | ✅ Can send |
| **Send Premium Emojis** | ❌ Shows as text | ✅ Can send |
| **Upload Emojis** | ❌ Not allowed | ✅ Allowed |
| **Betting** | ✅ In competitive rooms | ✅ In competitive rooms |

### Room Types
| Feature | Casual Rooms | Competitive Rooms |
|---------|-------------|------------------|
| **User Limit** | 5 (default) | 5 (default) |
| **Chat Access** | Members only | Anyone |
| **WebSocket Access** | Members only | Anyone |
| **Betting** | ❌ Not allowed | ✅ Allowed |
| **Room Membership** | Required for chat | Optional for chat/betting |

### WebSocket Features
| Feature | Description |
|---------|-------------|
| **Real-time Messaging** | Instant delivery to all room members |
| **User Presence** | Join/leave notifications |
| **Dual Channel** | HTTP API messages also broadcast via WebSocket |
| **Connection Management** | Automatic cleanup of disconnected clients |
| **Error Handling** | Graceful handling of connection issues |
| **Emoji Processing** | Real-time emoji restriction enforcement |

## File Storage

- Emoji files are stored in the `emojis/` directory
- Files are served statically at `/emojis/{filename}`
- Supported formats: PNG, JPEG, JPG, GIF, WebP
- Unique filenames prevent collisions
- Premium emojis are accessible only to premium users

The database is automatically created when the server starts.

## Live Streaming Architecture

The WebSocket implementation provides true live streaming capabilities:

1. **Connection Pool**: Each room maintains a pool of connected WebSocket clients
2. **Message Broadcasting**: Messages are instantly broadcast to all room participants
3. **Presence Management**: Real-time user join/leave notifications
4. **Hybrid Messaging**: Both HTTP API and WebSocket messages are synchronized
5. **Error Recovery**: Automatic connection cleanup and error handling
6. **Room Isolation**: Messages are only sent to users in the same room 