# config/ProdConfig.py
import os
from pathlib import Path
from config.DevConfig import Config as DevConfig

class Config(DevConfig):
    """Production configuration."""
    DEBUG = False
    TESTING = False
    # Use production MongoDB URI
    MONGO_URI = os.environ.get('MONGO_URI')
    # Use different JWT keys for production
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    JWT_REFRESH_SECRET_KEY = os.environ.get('JWT_REFRESH_SECRET_KEY')
    
    # Production mail settings
    MAIL_SERVER = os.environ.get('MAIL_SERVER')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER')
    
    # Production frontend URL
    FRONTEND_URL = os.environ.get('FRONTEND_URL')

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
def configure_upload_folder(app):
    """Configure the upload folder for the production application"""
    upload_folder = os.environ.get('UPLOAD_FOLDER', os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads'))
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    app.config['UPLOAD_FOLDER'] = upload_folder

    
   
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


  