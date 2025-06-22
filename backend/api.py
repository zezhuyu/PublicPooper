from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Set
import sqlite3
import uuid
from datetime import datetime
import os
import shutil
import re
import json
import asyncio
from db import init_database

app = FastAPI(title="PublicPooper API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
DATABASE_PATH = "publicpooper.db"
EMOJI_UPLOAD_DIR = "emojis"

# Create emoji directory if it doesn't exist
os.makedirs(EMOJI_UPLOAD_DIR, exist_ok=True)

# Mount static files for emoji serving
app.mount("/emojis", StaticFiles(directory=EMOJI_UPLOAD_DIR), name="emojis")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        # Store active connections: {room_id: {user_id: websocket}}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        # Store user info: {user_id: {"room_id": str, "websocket": WebSocket}}
        self.user_connections: Dict[str, Dict[str, any]] = {}

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str):
        """Accept WebSocket connection and add to room"""
        await websocket.accept()
        
        # Initialize room if it doesn't exist
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
        
        # Remove user from previous room if connected elsewhere
        if user_id in self.user_connections:
            await self.disconnect_user(user_id)
        
        # Add user to room
        self.active_connections[room_id][user_id] = websocket
        self.user_connections[user_id] = {
            "room_id": room_id,
            "websocket": websocket
        }
        
        # Notify room about new user
        await self.broadcast_to_room(room_id, {
            "type": "user_joined",
            "user_id": user_id,
            "message": f"User {user_id} joined the room",
            "timestamp": datetime.now().isoformat()
        }, exclude_user=user_id)

    async def disconnect_user(self, user_id: str):
        """Disconnect user and remove from all tracking"""
        if user_id in self.user_connections:
            user_info = self.user_connections[user_id]
            room_id = user_info["room_id"]
            websocket = user_info["websocket"]
            
            # Remove from room
            if room_id in self.active_connections and user_id in self.active_connections[room_id]:
                del self.active_connections[room_id][user_id]
                
                # Clean up empty rooms
                if not self.active_connections[room_id]:
                    del self.active_connections[room_id]
            
            # Remove from user tracking
            del self.user_connections[user_id]
            
            # Notify room about user leaving
            if room_id in self.active_connections:
                await self.broadcast_to_room(room_id, {
                    "type": "user_left",
                    "user_id": user_id,
                    "message": f"User {user_id} left the room",
                    "timestamp": datetime.now().isoformat()
                })

    async def broadcast_to_room(self, room_id: str, message: dict, exclude_user: str = None):
        """Send message to all users in a room"""
        if room_id not in self.active_connections:
            return
        
        # Get all users in room
        users_to_notify = []
        for user_id, websocket in self.active_connections[room_id].items():
            if exclude_user and user_id == exclude_user:
                continue
            users_to_notify.append((user_id, websocket))
        
        # Send to all users (handle disconnections)
        disconnected_users = []
        for user_id, websocket in users_to_notify:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception:
                # Mark for removal if connection is broken
                disconnected_users.append(user_id)
        
        # Clean up broken connections
        for user_id in disconnected_users:
            await self.disconnect_user(user_id)

    async def send_to_user(self, user_id: str, message: dict):
        """Send message to specific user"""
        if user_id in self.user_connections:
            websocket = self.user_connections[user_id]["websocket"]
            try:
                await websocket.send_text(json.dumps(message))
            except Exception:
                await self.disconnect_user(user_id)

    def get_room_users(self, room_id: str) -> List[str]:
        """Get list of users currently connected to a room"""
        if room_id in self.active_connections:
            return list(self.active_connections[room_id].keys())
        return []

# Global connection manager instance
manager = ConnectionManager()

def get_db():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def process_emoji_in_comment(comment: str, db: sqlite3.Connection, user_type: str) -> str:
    """Process emoji references in comments and replace with URLs
    
    Args:
        comment: The chat comment containing emoji references
        db: Database connection
        user_type: "normal" or "premium" - determines emoji usage rights
    """
    # Pattern to match :emoji_name: format
    emoji_pattern = r':([a-zA-Z0-9_]+):'
    
    def replace_emoji(match):
        emoji_name = match.group(1)
        cursor = db.cursor()
        cursor.execute("SELECT filename, isPremium FROM Emoji WHERE name = ?", (emoji_name,))
        emoji_row = cursor.fetchone()
        
        if emoji_row:
            # Check if user can send this emoji
            if emoji_row['isPremium'] and user_type != "premium":
                return match.group(0)  # Return original :emoji_name: - normal users can't send premium emojis
            else:
                return f"[EMOJI:/emojis/{emoji_row['filename']}]"
        else:
            return match.group(0)  # Return original if emoji not found
    
    return re.sub(emoji_pattern, replace_emoji, comment)

# Pydantic models
class UserCreate(BaseModel):
    uname: str
    email: EmailStr
    type: str  # Should be "normal" or "premium"

class UserResponse(BaseModel):
    uid: str
    uname: str
    email: str
    type: str
    createAt: str

class RoomCreate(BaseModel):
    rname: str
    user_limit: Optional[int] = 5  # Default limit is now 5
    type: str  # Should be "casual" or "competitive"
    duration: float

class RoomResponse(BaseModel):
    rid: str
    rname: str
    user_limit: Optional[int]
    type: str
    duration: float
    createAt: str

class ChatCreate(BaseModel):
    comment: str
    targetUid: Optional[str] = None

class ChatResponse(BaseModel):
    uid: str
    rid: str
    targetUid: Optional[str]
    comment: str
    createAt: str

class BetCreate(BaseModel):
    bet: float

class BetResponse(BaseModel):
    uid: str
    rid: str
    bet: float
    createAt: str

class RoomJoinResponse(BaseModel):
    message: str
    room: RoomResponse
    isNewRoom: bool

class EmojiResponse(BaseModel):
    eid: str
    name: str
    filename: str
    uploadedBy: str
    createAt: str
    url: str
    isPremium: bool  # New field to indicate if emoji is premium

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_database()

# Emoji endpoints
@app.post("/emojis/upload/{uid}", response_model=EmojiResponse)
async def upload_emoji(
    uid: str,
    name: str,
    isPremium: bool = False,
    file: UploadFile = File(...),
    db: sqlite3.Connection = Depends(get_db)
):
    """Upload an emoji file
    
    Rules:
    - Only premium users can upload emojis
    - Premium users can mark their uploads as premium or regular
    - Normal users cannot upload any emojis
    """
    cursor = db.cursor()
    
    # Check if user exists and get user type
    cursor.execute("SELECT uid, type FROM Users WHERE uid = ?", (uid,))
    user_row = cursor.fetchone()
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_type = user_row["type"]
    
    # Only premium users can upload emojis
    if user_type != "premium":
        raise HTTPException(status_code=403, detail="Only premium users can upload emojis")
    
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only image files are allowed.")
    
    # Check if emoji name already exists
    cursor.execute("SELECT name FROM Emoji WHERE name = ?", (name,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Emoji name already exists")
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'png'
    filename = f"{name}_{uuid.uuid4().hex[:8]}.{file_extension}"
    file_path = os.path.join(EMOJI_UPLOAD_DIR, filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Save to database
    eid = str(uuid.uuid4())
    create_time = datetime.now().isoformat()
    
    cursor.execute(
        "INSERT INTO Emoji (eid, name, filename, uploadedBy, isPremium, createAt) VALUES (?, ?, ?, ?, ?, ?)",
        (eid, name, filename, uid, 1 if isPremium else 0, create_time)
    )
    db.commit()
    
    return EmojiResponse(
        eid=eid,
        name=name,
        filename=filename,
        uploadedBy=uid,
        createAt=create_time,
        url=f"/emojis/{filename}",
        isPremium=isPremium
    )

@app.get("/emojis", response_model=List[EmojiResponse])
async def get_emojis(uid: Optional[str] = None, db: sqlite3.Connection = Depends(get_db)):
    """Get all available emojis
    
    Rules:
    - All users can see all emojis (both regular and premium)
    - Only premium users can send premium emojis in chat
    """
    cursor = db.cursor()
    
    # Show all emojis to all users (both premium and regular)
    cursor.execute("SELECT * FROM Emoji ORDER BY createAt DESC")
    
    emojis = []
    for row in cursor.fetchall():
        emojis.append(EmojiResponse(
            eid=row["eid"],
            name=row["name"],
            filename=row["filename"],
            uploadedBy=row["uploadedBy"],
            createAt=row["createAt"],
            url=f"/emojis/{row['filename']}",
            isPremium=bool(row["isPremium"])
        ))
    
    return emojis

@app.delete("/emojis/{eid}/{uid}")
async def delete_emoji(eid: str, uid: str, db: sqlite3.Connection = Depends(get_db)):
    """Delete an emoji (only by the uploader)"""
    cursor = db.cursor()
    
    # Check if emoji exists and user is the uploader
    cursor.execute("SELECT * FROM Emoji WHERE eid = ? AND uploadedBy = ?", (eid, uid))
    emoji_row = cursor.fetchone()
    
    if not emoji_row:
        raise HTTPException(status_code=404, detail="Emoji not found or you don't have permission to delete it")
    
    # Delete file
    file_path = os.path.join(EMOJI_UPLOAD_DIR, emoji_row["filename"])
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Delete from database
    cursor.execute("DELETE FROM Emoji WHERE eid = ?", (eid,))
    db.commit()
    
    return {"message": "Emoji deleted successfully"}

# User endpoints
@app.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate, db: sqlite3.Connection = Depends(get_db)):
    """Create a new user"""
    # Validate user type
    if user.type not in ["normal", "premium"]:
        raise HTTPException(status_code=400, detail="User type must be 'normal' or 'premium'")
    
    uid = str(uuid.uuid4())
    try:
        cursor = db.cursor()
        cursor.execute(
            "INSERT INTO Users (uid, uname, email, type) VALUES (?, ?, ?, ?)",
            (uid, user.uname, user.email, user.type)
        )
        db.commit()
        
        # Fetch created user
        cursor.execute("SELECT * FROM Users WHERE uid = ?", (uid,))
        user_row = cursor.fetchone()
        
        return UserResponse(
            uid=user_row["uid"],
            uname=user_row["uname"],
            email=user_row["email"],
            type=user_row["type"],
            createAt=user_row["createAt"]
        )
    except sqlite3.IntegrityError as e:
        if "uname" in str(e):
            raise HTTPException(status_code=400, detail="Username already exists")
        elif "email" in str(e):
            raise HTTPException(status_code=400, detail="Email already exists")
        else:
            raise HTTPException(status_code=400, detail="User creation failed")

@app.get("/users/{uid}", response_model=UserResponse)
async def get_user(uid: str, db: sqlite3.Connection = Depends(get_db)):
    """Get user by ID"""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM Users WHERE uid = ?", (uid,))
    user_row = cursor.fetchone()
    
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        uid=user_row["uid"],
        uname=user_row["uname"],
        email=user_row["email"],
        type=user_row["type"],
        createAt=user_row["createAt"]
    )

# Room endpoints
@app.post("/rooms/{room_name}/join/{uid}", response_model=RoomJoinResponse)
async def join_or_create_room(room_name: str, uid: str, room_data: Optional[RoomCreate] = None, db: sqlite3.Connection = Depends(get_db)):
    """Join existing room or create new room if it doesn't exist"""
    cursor = db.cursor()
    
    # Check if user exists
    cursor.execute("SELECT uid FROM Users WHERE uid = ?", (uid,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if room exists
    cursor.execute("SELECT * FROM Room WHERE rname = ?", (room_name,))
    room_row = cursor.fetchone()
    
    is_new_room = False
    
    if not room_row:
        # Create new room
        if not room_data:
            raise HTTPException(status_code=400, detail="Room data required to create new room")
        
        # Validate room type
        if room_data.type not in ["casual", "competitive"]:
            raise HTTPException(status_code=400, detail="Room type must be 'casual' or 'competitive'")
        
        rid = str(uuid.uuid4())
        try:
            cursor.execute(
                "INSERT INTO Room (rid, rname, user_limit, type, duration) VALUES (?, ?, ?, ?, ?)",
                (rid, room_name, room_data.user_limit or 5, room_data.type, room_data.duration)
            )
            db.commit()
            is_new_room = True
            
            # Fetch created room
            cursor.execute("SELECT * FROM Room WHERE rid = ?", (rid,))
            room_row = cursor.fetchone()
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=400, detail="Room name already exists")
    else:
        rid = room_row["rid"]
        
        # Check room capacity
        if room_row["user_limit"]:
            cursor.execute("SELECT COUNT(*) as count FROM RoomUser WHERE rid = ? AND leaveAt IS NULL", (rid,))
            current_count = cursor.fetchone()["count"]
            if current_count >= room_row["user_limit"]:
                raise HTTPException(status_code=400, detail="Room is full")
    
    # Check if user is already in room
    cursor.execute("SELECT * FROM RoomUser WHERE uid = ? AND rid = ? AND leaveAt IS NULL", (uid, rid))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="User already in room")
    
    # Add user to room
    cursor.execute(
        "INSERT INTO RoomUser (uid, rid, joinAt, leaveAt, duration) VALUES (?, ?, ?, ?, ?)",
        (uid, rid, datetime.now().isoformat(), datetime.now().isoformat(), 0.0)
    )
    db.commit()
    
    room_response = RoomResponse(
        rid=room_row["rid"],
        rname=room_row["rname"],
        user_limit=room_row["user_limit"],
        type=room_row["type"],
        duration=room_row["duration"],
        createAt=room_row["createAt"]
    )
    
    return RoomJoinResponse(
        message=f"Successfully {'created and joined' if is_new_room else 'joined'} room {room_name}",
        room=room_response,
        isNewRoom=is_new_room
    )

@app.post("/rooms/{rid}/leave/{uid}")
async def leave_room(rid: str, uid: str, db: sqlite3.Connection = Depends(get_db)):
    """Leave a room"""
    cursor = db.cursor()
    
    # Check if user is in room
    cursor.execute("SELECT * FROM RoomUser WHERE uid = ? AND rid = ? AND leaveAt IS NULL", (uid, rid))
    room_user = cursor.fetchone()
    
    if not room_user:
        raise HTTPException(status_code=404, detail="User not in room or already left")
    
    # Update leave time and duration
    join_time = datetime.fromisoformat(room_user["joinAt"])
    leave_time = datetime.now()
    duration = (leave_time - join_time).total_seconds()
    
    cursor.execute(
        "UPDATE RoomUser SET leaveAt = ?, duration = ? WHERE uid = ? AND rid = ? AND leaveAt IS NULL",
        (leave_time.isoformat(), duration, uid, rid)
    )
    db.commit()
    
    return {"message": f"Successfully left room", "duration": duration}

@app.get("/rooms/{rid}", response_model=RoomResponse)
async def get_room(rid: str, db: sqlite3.Connection = Depends(get_db)):
    """Get room details"""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM Room WHERE rid = ?", (rid,))
    room_row = cursor.fetchone()
    
    if not room_row:
        raise HTTPException(status_code=404, detail="Room not found")
    
    return RoomResponse(
        rid=room_row["rid"],
        rname=room_row["rname"],
        user_limit=room_row["user_limit"],
        type=room_row["type"],
        duration=room_row["duration"],
        createAt=room_row["createAt"]
    )

@app.get("/rooms/{rid}/users", response_model=List[UserResponse])
async def get_room_users(rid: str, db: sqlite3.Connection = Depends(get_db)):
    """Get all users currently in a room"""
    cursor = db.cursor()
    cursor.execute("""
        SELECT u.uid, u.uname, u.email, u.type, u.createAt 
        FROM Users u 
        JOIN RoomUser ru ON u.uid = ru.uid 
        WHERE ru.rid = ? AND ru.leaveAt IS NULL
    """, (rid,))
    
    users = []
    for row in cursor.fetchall():
        users.append(UserResponse(
            uid=row["uid"],
            uname=row["uname"],
            email=row["email"],
            type=row["type"],
            createAt=row["createAt"]
        ))
    
    return users

# Chat endpoints
@app.post("/rooms/{rid}/chat/{uid}", response_model=ChatResponse)
async def send_chat(rid: str, uid: str, chat: ChatCreate, db: sqlite3.Connection = Depends(get_db)):
    """Send a chat message in a room (supports emoji references like :emoji_name:)
    
    Rules:
    - Casual rooms: Only users in the room can send chat
    - Competitive rooms: Any user can send chat (even if not in room)
    - Premium users can use premium emojis, normal users cannot
    - Also broadcasts message to WebSocket clients
    """
    cursor = db.cursor()
    
    # Check if user exists and get user type
    cursor.execute("SELECT uid, type FROM Users WHERE uid = ?", (uid,))
    user_row = cursor.fetchone()
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_type = user_row["type"]
    
    # Get room info to check type
    cursor.execute("SELECT type FROM Room WHERE rid = ?", (rid,))
    room_row = cursor.fetchone()
    if not room_row:
        raise HTTPException(status_code=404, detail="Room not found")
    
    room_type = room_row["type"]
    
    # Check room membership based on room type
    cursor.execute("SELECT * FROM RoomUser WHERE uid = ? AND rid = ? AND leaveAt IS NULL", (uid, rid))
    is_in_room = cursor.fetchone() is not None
    
    if room_type == "casual" and not is_in_room:
        raise HTTPException(status_code=403, detail="Only room members can chat in casual rooms")
    
    # For competitive rooms, allow anyone to chat (no restriction)
    
    # Verify target user exists if specified
    if chat.targetUid:
        cursor.execute("SELECT uid FROM Users WHERE uid = ?", (chat.targetUid,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Target user not found")
    
    # Process emojis in comment with user type consideration
    processed_comment = process_emoji_in_comment(chat.comment, db, user_type)
    
    # Insert chat message with processed comment
    create_time = datetime.now().isoformat()
    cursor.execute(
        "INSERT INTO Chat (uid, rid, targetUid, comment, createAt) VALUES (?, ?, ?, ?, ?)",
        (uid, rid, chat.targetUid, processed_comment, create_time)
    )
    db.commit()
    
    # Broadcast to WebSocket clients
    chat_message = {
        "type": "chat",
        "uid": uid,
        "rid": rid,
        "targetUid": chat.targetUid,
        "comment": processed_comment,
        "timestamp": create_time
    }
    
    await manager.broadcast_to_room(rid, chat_message)
    
    return ChatResponse(
        uid=uid,
        rid=rid,
        targetUid=chat.targetUid,
        comment=processed_comment,
        createAt=create_time
    )

@app.get("/rooms/{rid}/chat", response_model=List[ChatResponse])
async def get_room_chat(rid: str, limit: int = 50, db: sqlite3.Connection = Depends(get_db)):
    """Get chat messages from a room"""
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM Chat WHERE rid = ? ORDER BY createAt DESC LIMIT ?",
        (rid, limit)
    )
    
    chats = []
    for row in cursor.fetchall():
        chats.append(ChatResponse(
            uid=row["uid"],
            rid=row["rid"],
            targetUid=row["targetUid"],
            comment=row["comment"],
            createAt=row["createAt"]
        ))
    
    return list(reversed(chats))  # Return in chronological order

# Betting endpoints
@app.post("/rooms/{rid}/bet/{uid}", response_model=BetResponse)
async def place_bet(rid: str, uid: str, bet: BetCreate, db: sqlite3.Connection = Depends(get_db)):
    """Place a bet in a room
    
    Rules:
    - Only competitive rooms allow betting
    - User must exist but doesn't need to be in the room
    """
    cursor = db.cursor()
    
    # Check if user exists
    cursor.execute("SELECT uid FROM Users WHERE uid = ?", (uid,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get room info to check type
    cursor.execute("SELECT type FROM Room WHERE rid = ?", (rid,))
    room_row = cursor.fetchone()
    if not room_row:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if room_row["type"] != "competitive":
        raise HTTPException(status_code=403, detail="Betting is only allowed in competitive rooms")
    
    if bet.bet < 0:
        raise HTTPException(status_code=400, detail="Bet amount must be positive")
    
    # Insert bet (no room membership required for competitive rooms)
    create_time = datetime.now().isoformat()
    cursor.execute(
        "INSERT INTO Bet (uid, rid, bet, createAt) VALUES (?, ?, ?, ?)",
        (uid, rid, bet.bet, create_time)
    )
    db.commit()
    
    return BetResponse(
        uid=uid,
        rid=rid,
        bet=bet.bet,
        createAt=create_time
    )

@app.get("/rooms/{rid}/bets", response_model=List[BetResponse])
async def get_room_bets(rid: str, db: sqlite3.Connection = Depends(get_db)):
    """Get all bets in a room"""
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM Bet WHERE rid = ? ORDER BY createAt DESC",
        (rid,)
    )
    
    bets = []
    for row in cursor.fetchall():
        bets.append(BetResponse(
            uid=row["uid"],
            rid=row["rid"],
            bet=row["bet"],
            createAt=row["createAt"]
        ))
    
    return bets

@app.get("/users/{uid}/bets", response_model=List[BetResponse])
async def get_user_bets(uid: str, db: sqlite3.Connection = Depends(get_db)):
    """Get all bets by a user"""
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM Bet WHERE uid = ? ORDER BY createAt DESC",
        (uid,)
    )
    
    bets = []
    for row in cursor.fetchall():
        bets.append(BetResponse(
            uid=row["uid"],
            rid=row["rid"],
            bet=row["bet"],
            createAt=row["createAt"]
        ))
    
    return bets

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# WebSocket endpoint
@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, user_id: str):
    """WebSocket endpoint for real-time chat
    
    Connect with: ws://localhost:8000/ws/{room_id}/{user_id}
    
    Messages format:
    - Incoming: {"type": "chat", "comment": "Hello!", "targetUid": null}
    - Outgoing: {"type": "chat", "uid": "user123", "comment": "Hello!", "timestamp": "..."}
    """
    # Verify user exists
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT uid, type FROM Users WHERE uid = ?", (user_id,))
    user_row = cursor.fetchone()
    
    if not user_row:
        await websocket.close(code=4004, reason="User not found")
        conn.close()
        return
    
    user_type = user_row["type"]
    
    # Verify room exists
    cursor.execute("SELECT rid, type FROM Room WHERE rid = ?", (room_id,))
    room_row = cursor.fetchone()
    
    if not room_row:
        await websocket.close(code=4004, reason="Room not found")
        conn.close()
        return
    
    room_type = room_row["type"]
    conn.close()
    
    # Connect user to room
    await manager.connect(websocket, room_id, user_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "chat":
                # Handle chat message
                comment = message_data.get("comment", "")
                target_uid = message_data.get("targetUid")
                
                # Validate chat permissions based on room type
                conn = sqlite3.connect(DATABASE_PATH)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                # Check room membership for casual rooms
                if room_type == "casual":
                    cursor.execute("SELECT * FROM RoomUser WHERE uid = ? AND rid = ? AND leaveAt IS NULL", (user_id, room_id))
                    if not cursor.fetchone():
                        await manager.send_to_user(user_id, {
                            "type": "error",
                            "message": "Only room members can chat in casual rooms",
                            "timestamp": datetime.now().isoformat()
                        })
                        conn.close()
                        continue
                
                # Verify target user if specified
                if target_uid:
                    cursor.execute("SELECT uid FROM Users WHERE uid = ?", (target_uid,))
                    if not cursor.fetchone():
                        await manager.send_to_user(user_id, {
                            "type": "error",
                            "message": "Target user not found",
                            "timestamp": datetime.now().isoformat()
                        })
                        conn.close()
                        continue
                
                # Process emojis in comment
                processed_comment = process_emoji_in_comment(comment, conn, user_type)
                
                # Save to database
                create_time = datetime.now().isoformat()
                cursor.execute(
                    "INSERT INTO Chat (uid, rid, targetUid, comment, createAt) VALUES (?, ?, ?, ?, ?)",
                    (user_id, room_id, target_uid, processed_comment, create_time)
                )
                conn.commit()
                conn.close()
                
                # Broadcast message to all users in room
                chat_message = {
                    "type": "chat",
                    "uid": user_id,
                    "rid": room_id,
                    "targetUid": target_uid,
                    "comment": processed_comment,
                    "timestamp": create_time
                }
                
                await manager.broadcast_to_room(room_id, chat_message)
                
            elif message_data.get("type") == "ping":
                # Handle ping/keepalive
                await manager.send_to_user(user_id, {
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                })
    
    except WebSocketDisconnect:
        # Handle client disconnect
        await manager.disconnect_user(user_id)
    except Exception as e:
        # Handle other errors
        print(f"WebSocket error for user {user_id}: {e}")
        await manager.disconnect_user(user_id)

# Get connected users in a room
@app.get("/rooms/{rid}/connected-users")
async def get_connected_users(rid: str, db: sqlite3.Connection = Depends(get_db)):
    """Get list of users currently connected via WebSocket to a room"""
    cursor = db.cursor()
    
    # Verify room exists
    cursor.execute("SELECT rid FROM Room WHERE rid = ?", (rid,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Room not found")
    
    connected_user_ids = manager.get_room_users(rid)
    
    # Get user details
    if not connected_user_ids:
        return []
    
    placeholders = ",".join("?" * len(connected_user_ids))
    cursor.execute(f"""
        SELECT uid, uname, email, type, createAt 
        FROM Users 
        WHERE uid IN ({placeholders})
    """, connected_user_ids)
    
    users = []
    for row in cursor.fetchall():
        users.append(UserResponse(
            uid=row["uid"],
            uname=row["uname"],
            email=row["email"],
            type=row["type"],
            createAt=row["createAt"]
        ))
    
    return users

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
