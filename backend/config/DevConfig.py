# config/DevConfig.py
import os
from pathlib import Path

class Config:
    """Base configuration."""
    MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/school_management_system')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key')
    JWT_REFRESH_SECRET_KEY = os.environ.get('JWT_REFRESH_SECRET_KEY', 'dev-refresh-secret-key')
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 900))  # 15 minutes
    JWT_REFRESH_TOKEN_EXPIRES = int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRES', 2592000))  # 30 days
    
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'localhost')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 1025))
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'no-reply@hwangehighschool.org')
    
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5000')
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
def configure_upload_folder(app):
    """Configure the upload folder for the application"""
    if not os.path.exists(Config.UPLOAD_FOLDER):
        os.makedirs(Config.UPLOAD_FOLDER)
    app.config['UPLOAD_FOLDER'] = Config.UPLOAD_FOLDER

    
   
# def configure_upload_folder(app):
    # """Configure upload folders with Path objects."""
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

