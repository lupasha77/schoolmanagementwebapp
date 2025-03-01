# Restructured app/__init__.py file to fix module import issues

import logging
import os
import sys
from flask import Flask
from flask_cors import CORS
from flask_mail import Mail
from pymongo import MongoClient
from dotenv import load_dotenv
from time import sleep

# Add the project root to the Python path to allow imports
# This helps Python find the 'config' module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Constants
MAX_RETRIES = 3
RETRY_DELAY = 5  # seconds

# Initialize Flask extensions
mail = Mail()
mongodb_client = None
db = None

# Configure logger
logger = logging.getLogger('auth_service')

def load_env_file():
    """Load the appropriate .env file based on FLASK_ENV with proper encoding handling"""
    env = os.environ.get('FLASK_ENV', 'development')
    env_file = f".env.{env}"
    
    # Try different encodings to handle the file
    encodings = ['utf-8', 'latin-1', 'cp1252']
    
    # Try environment-specific file with different encodings
    if os.path.exists(env_file):
        for encoding in encodings:
            try:
                logger.info(f"Loading environment from {env_file} with {encoding} encoding")
                load_dotenv(dotenv_path=env_file, encoding=encoding)
                return env
            except UnicodeDecodeError:
                logger.warning(f"Failed to load {env_file} with {encoding} encoding, trying next")
                continue
    
    # Fallback to default .env file with different encodings
    if os.path.exists('.env'):
        for encoding in encodings:
            try:
                logger.warning(f"{env_file} not found or couldn't be loaded, trying .env with {encoding} encoding")
                load_dotenv(dotenv_path='.env', encoding=encoding)
                return env
            except UnicodeDecodeError:
                logger.warning(f"Failed to load .env with {encoding} encoding, trying next")
                continue
    
    # If all attempts fail, manually load environment variables
    logger.warning("Could not load any .env file, using manual environment configuration")
    set_default_environment_variables()
    return env

def set_default_environment_variables():
    """Set default environment variables when .env files cannot be loaded"""
    defaults = {
        'MONGO_URI': 'mongodb://localhost:27017/school_management_system',
        'JWT_SECRET_KEY': '1084ab989d0d5fa23f2147529e75540c69c777b9308394d0839da7a2f8c3c060',
        'JWT_REFRESH_SECRET_KEY': '2b22bd7da2c449090e901968000dee4dd7520b1ff4c7298e8884c22d3c4f2da7',
        'MAIL_SERVER': 'localhost',
        'MAIL_PORT': '1025',
        'MAIL_USERNAME': 'MAIL_USERNAME',
        'MAIL_PASSWORD': 'MAIL_PASSWORD',
        'MAIL_DEFAULT_SENDER': 'no-reply@hwangehighschool.org',
        'JWT_ACCESS_TOKEN_EXPIRES': '900',
        'JWT_REFRESH_TOKEN_EXPIRES': '2592000',
        'FRONTEND_URL': 'http://localhost:3000'
    }
    
    # Only set if not already in environment
    for key, value in defaults.items():
        if key not in os.environ:
            os.environ[key] = value
            logger.info(f"Setting default environment variable: {key}")

def create_app():
    # Load environment variables based on FLASK_ENV
    env = load_env_file()
    
    app = Flask(__name__)
    
    # Configure app based on environment
    try:
        if env == 'production':
            # Try absolute import first
            try:
                from config.ProdConfig import Config, configure_upload_folder
            except ImportError:
                # Try relative import if absolute import fails
                from config.ProdConfig import Config, configure_upload_folder
            app.config.from_object(Config)
        else:
            # Try absolute import first
            try:
                from config.DevConfig import Config, configure_upload_folder
            except ImportError:
                # Try relative import if absolute import fails
                from config.DevConfig import Config, configure_upload_folder
            app.config.from_object(Config)
    except ImportError as e:
        logger.error(f"Import error: {e}")
        logger.error(f"Current sys.path: {sys.path}")
        
        # Fallback to manual configuration if imports fail
        fallback_config(app)
        # Use a simplified configure_upload_folder function
        configure_upload_folder = lambda app: setup_upload_folder(app)

    # Configure the upload folder
    configure_upload_folder(app)

    # Configure logging
    setup_logging(app)

    # Initialize MongoDB
    setup_mongodb(app)

    # Initialize Mail
    mail.init_app(app)
    app.mail = mail
    
    # Initialize Services
    setup_services(app)

    # Register Blueprints
    register_blueprints(app)

    # Enable CORS
    setup_cors(app)
    
    # Setup error handlers
    setup_error_handlers(app)

    return app

def fallback_config(app):
    """Fallback configuration if imports fail"""
    logger.warning("Using fallback configuration")
    
    # Basic configuration
    app.config['MONGO_URI'] = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/school_management_system')
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key')
    app.config['JWT_REFRESH_SECRET_KEY'] = os.environ.get('JWT_REFRESH_SECRET_KEY', 'dev-refresh-secret-key')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 900))
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRES', 2592000))
    
    # Mail configuration
    app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'localhost')
    app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 1025))
    app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME', '')
    app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD', '')
    app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER', 'no-reply@hwangehighschool.org')
    
    # Frontend URL
    app.config['FRONTEND_URL'] = os.environ.get('FRONTEND_URL', 'http://localhost:5000')
    
    # Upload folder
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app.config['UPLOAD_FOLDER'] = os.path.join(project_root, 'uploads')

def setup_upload_folder(app):
    """Simplified upload folder configuration"""
    if 'UPLOAD_FOLDER' not in app.config:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        app.config['UPLOAD_FOLDER'] = os.path.join(project_root, 'uploads')
    
    upload_folder = app.config['UPLOAD_FOLDER']
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    
    logger.info(f"Upload folder configured at: {upload_folder}")

# Rest of the original code remains unchanged
def setup_logging(app):
    """Configure application logging"""
    # Configure file logging
    log_file = 'app.log'
    file_handler = logging.FileHandler(log_file)
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(file_handler)
    
    # Configure console logging
    logging.basicConfig(level=logging.INFO)
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

def setup_mongodb(app):
    """Initialize MongoDB connection with retry logic"""
    global mongodb_client, db
    
    for attempt in range(MAX_RETRIES):
        try:
            mongodb_client = MongoClient(app.config['MONGO_URI'])
            db = mongodb_client.get_database()
            db.command('ping')
            app.db = db
            logger.info("Successfully connected to MongoDB!")
            break
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB on attempt {attempt + 1}: {e}")
            if attempt < MAX_RETRIES - 1:
                sleep(RETRY_DELAY)
            else:
                raise e  # Raise the exception if all attempts fail

def setup_services(app):
    """Initialize application services"""
    try:
        from app.services.mail_service import EmailService
        from app.services.auth_service import AuthService

        email_service = EmailService(app.mail, app.config['FRONTEND_URL'])
        auth_service = AuthService(app.db, email_service)
        app.auth_service = auth_service
    except ImportError as e:
        logger.error(f"Failed to import services: {e}")
        logger.warning("Services will not be available")

def register_blueprints(app):
    """Register all application blueprints"""
    try:
        from app.routes.auth_routes import auth_bp
        from app.routes.dashboard_routes import dashboard_bp
        from app.routes.avatar_upload import avatar_bp
        from app.routes.staff_routes import staff_bp 
        from app.routes.student_routes import student_bp
        from app.routes.timetable_routes import timetable_bp
        from app.routes.initial_req_routes import initial_req_bp
        from app.routes.class_routes import class_bp
        from app.routes.subjects_routes import subjects_bp
        from app.routes.fake_user_routes import fake_user_bp
        from app.routes.subject_generation_routes import subject_gen_bp
        from app.routes.stream_config_routes import stream_config_bp
        from app.routes.constants_routes import constants_bp
        from app.routes.subject_assignment_routes import subject_assign_bp
        from app.routes.timeslots_routes import timeslots_bp

        blueprints = [
            (auth_bp, '/api/auth'),
            (fake_user_bp, '/api/fake_user'),
            (dashboard_bp, '/api/dashboard'),
            (avatar_bp, '/api'),
            (staff_bp, '/api/staffs'),
            (student_bp, '/api/students'),
            (timetable_bp, '/api/timetable'),
            (initial_req_bp, '/api/initial_req'),
            (class_bp, '/api/classes'),
            (subjects_bp, '/api/subjects'),
            (subject_gen_bp, '/api/subject-gen'),
            (stream_config_bp, '/api/stream-config'),
            (constants_bp, '/api/constants'),
            (subject_assign_bp, '/api/subject-assign'),
            (timeslots_bp, '/api/timeslots')
        ]
        
        for blueprint, url_prefix in blueprints:
            app.register_blueprint(blueprint, url_prefix=url_prefix)
    except ImportError as e:
        logger.error(f"Failed to import blueprints: {e}")
        logger.warning("Some routes may not be available")

def setup_cors(app):
    """Configure CORS for the application"""
    # Allow requests from both your configured frontend URL and the actual frontend port
    allowed_origins = [app.config['FRONTEND_URL'], 'http://localhost:5173']
    
    CORS(app, resources={
        r"/api/*": {
            "origins": allowed_origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True,
            "max_age": 600  # Cache preflight requests for 10 minutes
        }
    })

def setup_error_handlers(app):
    """Register application error handlers"""
    @app.errorhandler(401)
    def unauthorized_handler(e):
        return {
            "error": "Unauthorized",
            "message": str(e.description)
        }, 401