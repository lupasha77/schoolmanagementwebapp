import logging
import os
from flask import Flask
from flask_cors import CORS
from flask_mail import Mail
from pymongo import MongoClient
from dotenv import load_dotenv
from time import sleep

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
    """Load the appropriate .env file based on FLASK_ENV"""
    env = os.environ.get('FLASK_ENV', 'development')
    env_file = f".env.{env}"
    
    # Check if the environment-specific file exists
    if os.path.exists(env_file):
        logger.info(f"Loading environment from {env_file}")
        load_dotenv(env_file)
    else:
        # Fallback to default .env file
        logger.warning(f"{env_file} not found, falling back to .env")
        load_dotenv()
    
    return env

def create_app():
    # Load environment variables based on FLASK_ENV
    env = load_env_file()
    
    app = Flask(__name__)
    
    # Configure app based on environment
    if env == 'production':
        from config.ProdConfig import configure_upload_folder
        app.config.from_object('config.ProdConfig')
    else:
        from config.DevConfig import configure_upload_folder
        app.config.from_object('config.DevConfig')

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
    from app.services.mail_service import EmailService
    from app.services.auth_service import AuthService

    email_service = EmailService(app.mail, app.config['FRONTEND_URL'])
    auth_service = AuthService(app.db, email_service)
    app.auth_service = auth_service

def register_blueprints(app):
    """Register all application blueprints"""
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

def setup_cors(app):
    """Configure CORS for the application"""
    CORS(app, resources={
        r"/api/*": {
            "origins": [app.config['FRONTEND_URL']],
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