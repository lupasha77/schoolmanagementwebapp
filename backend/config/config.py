# backend/config/config.py
from dotenv import load_dotenv
import os
from flask import send_from_directory
from pathlib import Path
# Load environment variables from .env file
load_dotenv()

class Config:
    MONGO_URI = os.getenv('MONGO_URI')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    JWT_REFRESH_SECRET_KEY = os.getenv('JWT_REFRESH_SECRET_KEY')
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'localhost')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 1025))
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'no-reply@hwangehighschool.org')
    JWT_ACCESS_TOKEN_EXPIRES = 60 * 15  # 15 minutes
    JWT_REFRESH_TOKEN_EXPIRES = 60 * 60 * 24 * 30  # 30 days
    FRONTEND_URL = os.getenv('FRONTEND_URL')

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
    
   
def configure_upload_folder(app):
    """Configure upload folders with Path objects."""
    # Set default values if not configured
    if 'UPLOAD_FOLDER' not in app.config:
        app.config['UPLOAD_FOLDER'] = str(PROJECT_ROOT / 'uploads')
        
    if 'AVATAR_FOLDER' not in app.config:
        app.config['AVATAR_FOLDER'] = str(PROJECT_ROOT / 'uploads' / 'avatars')
    # Convert strings to Path objects
    upload_folder = Path(app.config['UPLOAD_FOLDER'])
    avatar_folder = Path(app.config['AVATAR_FOLDER'])
    
    # Create directories
    upload_folder.mkdir(parents=True, exist_ok=True)
    avatar_folder.mkdir(parents=True, exist_ok=True)
    
    # Log folder information
    print(f"Upload folder configured at: {upload_folder.resolve()}")
    print(f"Avatar folder configured at: {avatar_folder.resolve()}")
    # Check permissions
    try:
        # Test write permissions by creating and removing a test file
        test_file = avatar_folder / '.test'
        test_file.touch()
        test_file.unlink()
        print("Write permissions verified for avatar folder")
    except Exception as e:
        print(f"Warning: Permission issue with avatar folder: {e}")
    
    # Set maximum content length
    app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB


 

# Directory Structure
"""
backend/
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── timetable_routes.py
│   │   ├── class_routes.py
│   │   └── teacher_routes.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── timetable_service.py
│   │   └── scheduling_service.py
│   └── utils/
│       ├── __init__.py
│       └── time_utils.py
└── run.py
"""

