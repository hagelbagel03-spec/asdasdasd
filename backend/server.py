from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import hashlib
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database connection - Use environment variable or fallback
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/stadtwache_db")
DB_NAME = os.getenv("DB_NAME", "stadtwache_db")

# Handle both local and cloud MongoDB URLs
if MONGO_URL.startswith("mongodb://localhost") or MONGO_URL.startswith("mongodb://127.0.0.1"):
    # Local development
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    print(f"🔗 Connected to local MongoDB: {MONGO_URL}")
else:
    # Production/Cloud MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]  
    print(f"🔗 Connected to cloud MongoDB: {MONGO_URL[:20]}...")

# Test connection
async def test_db_connection():
    try:
        await client.admin.command('ping')
        print("✅ MongoDB connection successful!")
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")

# Security
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Socket.IO server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# Online users tracking
online_users = {}  # {user_id: {"last_seen": datetime, "socket_id": str, "username": str}}
user_sockets = {}  # {socket_id: user_id}

# Create FastAPI app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Wrap FastAPI app with Socket.IO
socket_app = socketio.ASGIApp(sio, app)

# User roles
class UserRole:
    ADMIN = "admin"          # Eigentümer
    POLICE = "police"        # Stadtwache
    COMMUNITY = "community"  # Member
    TRAINEE = "trainee"      # Praktikant

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    username: str
    role: str
    badge_number: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    service_number: Optional[str] = None
    rank: Optional[str] = None
    status: str = "Im Dienst"  # Im Dienst, Pause, Einsatz, Streife, Nicht verfügbar
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    role: Optional[str] = UserRole.POLICE  # Default role
    badge_number: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    service_number: Optional[str] = None
    rank: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    phone: Optional[str] = None
    service_number: Optional[str] = None
    rank: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Incident(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    priority: str  # high, medium, low
    status: str = "open"  # open, in_progress, closed
    location: Dict[str, float]  # lat, lng
    address: str
    reported_by: str  # user_id
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    images: List[str] = []  # base64 encoded images
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class IncidentCreate(BaseModel):
    title: str
    description: str
    priority: str
    location: Dict[str, float]
    address: str
    images: List[str] = []

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    sender_id: str
    sender_name: str  # Add sender name field
    recipient_id: Optional[str] = None  # None for group messages
    channel: str = "general"  # general, emergency, incidents
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    message_type: str = "text"  # text, location, image

class MessageCreate(BaseModel):
    content: str
    recipient_id: Optional[str] = None
    channel: str = "general"
    message_type: str = "text"

class LocationUpdate(BaseModel):
    user_id: str
    location: Dict[str, float]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Security functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

def get_password_hash(password: str) -> str:
    """Generate password hash"""
    return pwd_context.hash(password)

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return User(**user)

# Socket.IO events
@sio.event
async def connect(sid, environ):
    print(f"Client {sid} connected")

@sio.event
async def disconnect(sid):
    print(f"Client {sid} disconnected")

@sio.event
async def join_room(sid, data):
    room = data.get('room', 'general')
    await sio.enter_room(sid, room)
    await sio.emit('joined_room', {'room': room}, room=sid)

@sio.event
async def send_message(sid, data):
    room = data.get('room', 'general')
    message = data.get('message')
    sender = data.get('sender')
    
    # Save message to database
    message_data = {
        "id": str(uuid.uuid4()),
        "content": message,
        "sender_id": sender,
        "channel": room,
        "timestamp": datetime.utcnow(),
        "message_type": "text"
    }
    await db.messages.insert_one(message_data)
    
    # Broadcast to room
    await sio.emit('new_message', message_data, room=room)

@sio.event
async def location_update(sid, data):
    # Save location update
    location_data = {
        "user_id": data.get('user_id'),
        "location": data.get('location'),
        "timestamp": datetime.utcnow()
    }
    await db.locations.insert_one(location_data)
    
    # Broadcast to all connected clients
    await sio.emit('location_updated', location_data)

# API Routes
@api_router.post("/auth/register", response_model=User)
async def register_user(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user object with all required fields
    user_dict = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "username": user_data.username,
        "role": user_data.role,
        "badge_number": user_data.badge_number,
        "department": user_data.department,
        "phone": user_data.phone,
        "service_number": user_data.service_number,
        "rank": user_data.rank,
        "status": "Im Dienst",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "hashed_password": hashed_password  # Store hashed password
    }
    
    # Insert user into database
    await db.users.insert_one(user_dict)
    
    # Return user without password
    user_dict.pop('hashed_password')
    return User(**user_dict)

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["id"]}, expires_delta=access_token_expires
    )
    
    user_obj = User(**user)
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.put("/auth/profile", response_model=User)
async def update_profile(user_updates: UserUpdate, current_user: User = Depends(get_current_user)):
    # Prepare update data
    update_data = {k: v for k, v in user_updates.dict().items() if v is not None}
    update_data['updated_at'] = datetime.utcnow()
    
    # Update user in database
    result = await db.users.update_one(
        {"id": current_user.id}, 
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get updated user
    updated_user = await db.users.find_one({"id": current_user.id})
    return User(**updated_user)

@api_router.put("/incidents/{incident_id}/assign", response_model=Incident)
async def assign_incident(incident_id: str, current_user: User = Depends(get_current_user)):
    # Only police and admin can assign incidents
    if current_user.role not in [UserRole.POLICE, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    updates = {
        'assigned_to': current_user.id,
        'assigned_to_name': current_user.username,
        'status': 'in_progress',
        'updated_at': datetime.utcnow()
    }
    
    result = await db.incidents.update_one({"id": incident_id}, {"$set": updates})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    incident = await db.incidents.find_one({"id": incident_id})
    incident_obj = Incident(**incident)
    
    # Notify about incident assignment
    await sio.emit('incident_assigned', {
        'incident_id': incident_id,
        'assigned_to': current_user.username,
        'incident': incident_obj.dict()
    })
    
    return incident_obj

@api_router.get("/users/by-status")
async def get_users_by_status(current_user: User = Depends(get_current_user)):
    users = await db.users.find({"is_active": True}).to_list(100)
    
    # Group users by status
    users_by_status = {}
    for user in users:
        status = user.get('status', 'Im Dienst')
        if status not in users_by_status:
            users_by_status[status] = []
        
        user_obj = User(**user)
        users_by_status[status].append(user_obj.dict())
    
    return users_by_status

@api_router.delete("/messages/{message_id}")
async def delete_message(message_id: str, current_user: User = Depends(get_current_user)):
    # Find the message first
    message = await db.messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Check if user owns the message or is admin
    if message["sender_id"] != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to delete this message")
    
    # Delete the message
    result = await db.messages.delete_one({"id": message_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Notify about message deletion
    await sio.emit('message_deleted', {'message_id': message_id, 'channel': message['channel']})
    
    return {"status": "success", "message": "Message deleted"}

class Report(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    author_id: str
    author_name: str
    shift_date: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "draft"  # draft, submitted, reviewed
    last_edited_by: Optional[str] = None  # ID of last editor
    last_edited_by_name: Optional[str] = None  # Name of last editor
    edit_history: List[Dict[str, Any]] = []  # Track edit history

class ReportCreate(BaseModel):
    title: str
    content: str
    shift_date: str

@api_router.post("/reports", response_model=Report)
async def create_report(report_data: ReportCreate, current_user: User = Depends(get_current_user)):
    report_dict = report_data.dict()
    report_dict['author_id'] = current_user.id
    report_dict['author_name'] = current_user.username
    report_dict['status'] = 'submitted'
    report_obj = Report(**report_dict)
    
    await db.reports.insert_one(report_obj.dict())
    
    return report_obj

@api_router.delete("/reports/{report_id}")
async def delete_report(report_id: str, current_user: User = Depends(get_current_user)):
    """Delete a report"""
    # Find the report
    report = await db.reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check if user owns the report or is admin
    if report["author_id"] != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to delete this report")
    
    # Delete the report
    result = await db.reports.delete_one({"id": report_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {"status": "success", "message": "Report deleted"}

@api_router.get("/reports", response_model=List[Report])
async def get_reports(current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.ADMIN:
        # Admin can see all reports
        reports = await db.reports.find().sort("created_at", -1).to_list(100)
    else:
        # Users can only see their own reports
        reports = await db.reports.find({"author_id": current_user.id}).sort("created_at", -1).to_list(100)
    
    return [Report(**report) for report in reports]

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Delete a user (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({"id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"status": "success", "message": "User deleted"}

@api_router.delete("/incidents/{incident_id}")
async def delete_incident(incident_id: str, current_user: User = Depends(get_current_user)):
    """Delete an incident (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.incidents.delete_one({"id": incident_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    return {"status": "success", "message": "Incident deleted"}

@api_router.put("/incidents/{incident_id}/complete", response_model=dict)
async def complete_incident(incident_id: str, current_user: User = Depends(get_current_user)):
    # Only police and admin can complete incidents
    if current_user.role not in [UserRole.POLICE, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get incident details first
    incident = await db.incidents.find_one({"id": incident_id})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Create archive report
    archive_report = {
        "id": str(uuid.uuid4()),
        "title": f"Archiv: {incident['title']}",
        "content": f"Vorfall abgeschlossen:\n\nTitel: {incident['title']}\nBeschreibung: {incident['description']}\nOrt: {incident['address']}\nPriorität: {incident['priority']}\n\nAbgeschlossen von: {current_user.username}\nDatum: {datetime.utcnow().strftime('%d.%m.%Y %H:%M')}",
        "author_id": current_user.id,
        "author_name": current_user.username,
        "shift_date": datetime.utcnow().strftime('%Y-%m-%d'),
        "status": "archived",
        "incident_id": incident_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Save to archive
    await db.reports.insert_one(archive_report)
    
    # Delete the incident from active incidents
    result = await db.incidents.delete_one({"id": incident_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Notify about incident completion
    await sio.emit('incident_completed', {
        'incident_id': incident_id,
        'completed_by': current_user.username,
        'archived_as': archive_report['id']
    })
    
    return {"status": "success", "message": "Incident completed and archived", "archive_id": archive_report['id']}

@api_router.get("/reports/folders")
async def get_report_folders(current_user: User = Depends(get_current_user)):
    """Get all report folders and their contents"""
    if current_user.role == UserRole.ADMIN:
        # Admin can see all reports
        reports = await db.reports.find().sort("created_at", -1).to_list(1000)
    else:
        # Users can only see their own reports
        reports = await db.reports.find({"author_id": current_user.id}).sort("created_at", -1).to_list(1000)
    
    # Organize reports by folders (year/month)
    folders = {}
    for report in reports:
        created_date = report['created_at']
        if isinstance(created_date, str):
            from datetime import datetime
            created_date = datetime.fromisoformat(created_date.replace('Z', '+00:00'))
        
        year = str(created_date.year)
        month = created_date.strftime('%B')  # Full month name
        
        folder_path = f"Berichte/{year}/{month}"
        
        if folder_path not in folders:
            folders[folder_path] = []
        
        folders[folder_path].append({
            "id": report["id"],
            "title": report["title"],
            "content": report["content"],
            "author_name": report["author_name"],
            "shift_date": report["shift_date"],
            "created_at": report["created_at"],
            "status": report.get("status", "submitted")
        })
    
    return folders

@api_router.put("/reports/{report_id}", response_model=Report)
async def update_report(report_id: str, updated_data: ReportCreate, current_user: User = Depends(get_current_user)):
    """Update an existing report"""
    # Find the report
    report = await db.reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check if user owns the report or is admin
    if report["author_id"] != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to edit this report")
    
    # Create edit history entry
    edit_history_entry = {
        "edited_by": current_user.id,
        "edited_by_name": current_user.username,
        "edited_at": datetime.utcnow(),
        "changes": {
            "title": {"old": report.get("title"), "new": updated_data.title},
            "content": {"old": report.get("content"), "new": updated_data.content},
            "shift_date": {"old": report.get("shift_date"), "new": updated_data.shift_date}
        }
    }
    
    # Update the report
    update_fields = {
        "title": updated_data.title,
        "content": updated_data.content,
        "shift_date": updated_data.shift_date,
        "updated_at": datetime.utcnow(),
        "last_edited_by": current_user.id,
        "last_edited_by_name": current_user.username
    }
    
    result = await db.reports.update_one(
        {"id": report_id}, 
        {
            "$set": update_fields,
            "$push": {"edit_history": edit_history_entry}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Get updated report
    updated_report = await db.reports.find_one({"id": report_id})
    return Report(**updated_report)

@api_router.post("/incidents", response_model=Incident)
async def create_incident(incident_data: IncidentCreate, current_user: User = Depends(get_current_user)):
    incident_dict = incident_data.dict()
    incident_dict['reported_by'] = current_user.id
    incident_obj = Incident(**incident_dict)
    
    await db.incidents.insert_one(incident_obj.dict())
    
    # Notify all users about new incident
    await sio.emit('new_incident', incident_obj.dict())
    
    return incident_obj

@api_router.get("/incidents", response_model=List[Incident])
async def get_incidents(current_user: User = Depends(get_current_user)):
    incidents = await db.incidents.find().sort("created_at", -1).to_list(100)
    return [Incident(**incident) for incident in incidents]

@api_router.get("/incidents/{incident_id}", response_model=Incident)
async def get_incident(incident_id: str, current_user: User = Depends(get_current_user)):
    incident = await db.incidents.find_one({"id": incident_id})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return Incident(**incident)

@api_router.put("/incidents/{incident_id}", response_model=Incident)
async def update_incident(incident_id: str, updates: Dict[str, Any], current_user: User = Depends(get_current_user)):
    # Only police and admin can update incidents
    if current_user.role not in [UserRole.POLICE, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    updates['updated_at'] = datetime.utcnow()
    result = await db.incidents.update_one({"id": incident_id}, {"$set": updates})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    incident = await db.incidents.find_one({"id": incident_id})
    incident_obj = Incident(**incident)
    
    # Notify about incident update
    await sio.emit('incident_updated', incident_obj.dict())
    
    return incident_obj

@api_router.get("/messages", response_model=List[Message])
async def get_messages(channel: str = "general", current_user: User = Depends(get_current_user)):
    messages = await db.messages.find({"channel": channel}).sort("timestamp", -1).limit(50).to_list(50)
    return [Message(**message) for message in messages]

@api_router.post("/messages", response_model=Message)
async def send_message(message_data: MessageCreate, current_user: User = Depends(get_current_user)):
    message_dict = message_data.dict()
    message_dict['sender_id'] = current_user.id
    message_dict['sender_name'] = current_user.username  # Add sender name
    message_dict['timestamp'] = datetime.utcnow()  # Add timestamp
    message_dict['created_at'] = datetime.utcnow()  # Add created_at for compatibility
    message_obj = Message(**message_dict)
    
    await db.messages.insert_one(message_obj.dict())
    
    # Emit to socket room
    await sio.emit('new_message', message_obj.dict(), room=message_data.channel)
    
    return message_obj

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find().to_list(100)
    return [User(**user) for user in users]

@api_router.get("/locations/live")
async def get_live_locations(current_user: User = Depends(get_current_user)):
    # Get latest location for each user (last 10 minutes)
    cutoff_time = datetime.utcnow() - timedelta(minutes=10)
    
    pipeline = [
        {"$match": {"timestamp": {"$gte": cutoff_time}}},
        {"$sort": {"timestamp": -1}},
        {"$group": {
            "_id": "$user_id",
            "latest_location": {"$first": "$$ROOT"}
        }}
    ]
    
    locations = await db.locations.aggregate(pipeline).to_list(100)
    
    # Convert ObjectId to string for JSON serialization
    result = []
    for loc in locations:
        location_data = loc["latest_location"]
        if "_id" in location_data:
            location_data["_id"] = str(location_data["_id"])
        result.append(location_data)
    
    return result

@api_router.post("/locations/update")
async def update_location(location_data: LocationUpdate, current_user: User = Depends(get_current_user)):
    location_data.user_id = current_user.id
    await db.locations.insert_one(location_data.dict())
    
    # Emit location update
    await sio.emit('location_updated', location_data.dict())
    
    return {"status": "success"}

# Admin routes
@api_router.get("/admin/stats")
async def get_admin_stats(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = await db.users.count_documents({})
    total_incidents = await db.incidents.count_documents({})
    open_incidents = await db.incidents.count_documents({"status": "open"})
    total_messages = await db.messages.count_documents({})
    
    return {
        "total_users": total_users,
        "total_incidents": total_incidents,
        "open_incidents": open_incidents,
        "total_messages": total_messages
    }

# Online Status Management
@api_router.post("/users/online-status")
async def set_online_status(current_user: User = Depends(get_current_user)):
    """Mark user as online and update last seen"""
    user_id = current_user.id
    now = datetime.utcnow()
    
    online_users[user_id] = {
        "last_seen": now,
        "username": current_user.username,
        "socket_id": None  # Will be updated when socket connects
    }
    
    # Notify all clients about user coming online
    await sio.emit('user_online', {
        'user_id': user_id,
        'username': current_user.username,
        'timestamp': now.isoformat()
    })
    
    return {"status": "online", "user_id": user_id, "timestamp": now}

@api_router.post("/users/heartbeat")
async def user_heartbeat(current_user: User = Depends(get_current_user)):
    """Update user's last seen timestamp (heartbeat)"""
    user_id = current_user.id
    now = datetime.utcnow()
    
    if user_id in online_users:
        online_users[user_id]["last_seen"] = now
    else:
        online_users[user_id] = {
            "last_seen": now,
            "username": current_user.username,
            "socket_id": None
        }
    
    return {"status": "heartbeat", "timestamp": now}

@api_router.get("/users/online")
async def get_online_users(current_user: User = Depends(get_current_user)):
    """Get list of currently online users"""
    now = datetime.utcnow()
    offline_threshold = timedelta(minutes=2)  # Consider offline after 2 minutes
    
    online_list = []
    users_to_remove = []
    
    for user_id, data in online_users.items():
        time_diff = now - data["last_seen"]
        if time_diff <= offline_threshold:
            online_list.append({
                "user_id": user_id,
                "username": data["username"],
                "last_seen": data["last_seen"].isoformat(),
                "minutes_ago": int(time_diff.total_seconds() / 60)
            })
        else:
            users_to_remove.append(user_id)
    
    # Clean up offline users
    for user_id in users_to_remove:
        del online_users[user_id]
        await sio.emit('user_offline', {'user_id': user_id})
    
    return online_list

@api_router.post("/users/logout")
async def logout_user(current_user: User = Depends(get_current_user)):
    """Mark user as offline when logging out"""
    user_id = current_user.id
    
    if user_id in online_users:
        del online_users[user_id]
        
    # Notify all clients about user going offline
    await sio.emit('user_offline', {'user_id': user_id})
    
    return {"status": "logged_out", "user_id": user_id}

@api_router.get("/users/by-status")
async def get_users_by_status(current_user: User = Depends(get_current_user)):
    """Get users grouped by their work status with online information"""
    users = await db.users.find().to_list(100)
    now = datetime.utcnow()
    offline_threshold = timedelta(minutes=2)
    
    # Group by status and add online info
    grouped = {}
    for user in users:
        user_obj = User(**user)
        status = user_obj.status or "Im Dienst"
        
        if status not in grouped:
            grouped[status] = []
        
        # Add online status information
        user_dict = user_obj.dict()
        user_id = user_obj.id
        
        if user_id in online_users:
            time_diff = now - online_users[user_id]["last_seen"]
            if time_diff <= offline_threshold:
                user_dict["is_online"] = True
                user_dict["last_seen"] = online_users[user_id]["last_seen"].isoformat()
                user_dict["online_status"] = "Online"
            else:
                user_dict["is_online"] = False
                user_dict["last_seen"] = online_users[user_id]["last_seen"].isoformat()
                user_dict["online_status"] = f"Vor {int(time_diff.total_seconds() / 60)} Min."
        else:
            user_dict["is_online"] = False
            user_dict["last_seen"] = None
            user_dict["online_status"] = "Offline"
        
        grouped[status].append(user_dict)
    
    return grouped

# Admin route to create first user
@api_router.post("/admin/create-first-user")
async def create_first_user(user_data: UserCreate):
    """Create the first admin user - only works if no users exist"""
    # Check if any users already exist
    existing_users = await db.users.count_documents({})
    if existing_users > 0:
        raise HTTPException(status_code=400, detail="Users already exist. Use normal registration.")
    
    # Create first admin user
    hashed_password = hash_password(user_data.password)
    user_dict = user_data.dict()
    user_dict["password"] = hashed_password
    user_dict["role"] = UserRole.ADMIN  # Force admin role for first user
    user_dict["id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.utcnow()
    
    await db.users.insert_one(user_dict)
    
    # Return user without password
    user_dict.pop("password")
    return {"message": "First admin user created successfully", "user": user_dict}

# Database reset endpoint (DANGER!)
@api_router.delete("/admin/reset-database")
async def reset_database():
    """⚠️ DANGER: Completely reset the database - removes ALL data!"""
    try:
        # List all collections
        collections = await db.list_collection_names()
        
        deleted_count = 0
        for collection_name in collections:
            result = await db[collection_name].delete_many({})
            deleted_count += result.deleted_count
            print(f"🗑️ Deleted {result.deleted_count} documents from {collection_name}")
        
        # Clear online users tracking
        global online_users, user_sockets
        online_users.clear()
        user_sockets.clear()
        
        return {
            "message": "Database completely reset!",
            "collections_cleared": len(collections),
            "total_documents_deleted": deleted_count,
            "collections": collections
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database reset failed: {str(e)}")

# Root route
@api_router.get("/")
async def root():
    return {"message": "Stadtwache API", "version": "1.0.0"}

# Statische Dateien für Frontend
static_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/dist"))
expo_static_path = os.path.join(static_path, "_expo")
assets_path = os.path.join(static_path, "assets")
fonts_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts"))

if os.path.exists(expo_static_path):
    # Mount _expo directory to /_expo path
    app.mount("/_expo", StaticFiles(directory=expo_static_path), name="expo_static")
    print(f"✅ Expo static files mounted from: {expo_static_path}")

if os.path.exists(assets_path):
    # Mount assets directory to /assets path  
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
    print(f"✅ Assets mounted from: {assets_path}")

if os.path.exists(fonts_path):
    # Mount fonts for icons
    app.mount("/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts", StaticFiles(directory=fonts_path), name="fonts")
    print(f"✅ Icon fonts mounted from: {fonts_path}")

# Root route - serviert Frontend oder JSON
@app.get("/")
async def root():
    static_index = os.path.join(static_path, "index.html")
    if os.path.exists(static_index):
        return FileResponse(static_index)
    else:
        return {"message": "Stadtwache Server", "version": "1.0.0", "status": "running"}

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Server starten
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="212.227.57.238", port=8001)