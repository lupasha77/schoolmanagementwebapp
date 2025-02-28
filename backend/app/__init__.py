import logging
import os
import sys 
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config.config import Config
from flask import Flask
from flask_cors import CORS
from flask_mail import Mail
from pymongo import MongoClient
from dotenv import load_dotenv
# from flask_limiter import Limiter
# from flask_limiter.util import get_remote_address
from config.config import configure_upload_folder  # Import the function
# Load environment variables
load_dotenv()

 
# Initialize Flask extensions
mail = Mail()
mongodb_client = None
db = None

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Configure the upload folder
    configure_upload_folder(app)  # Call the function to configure uploads

    # Configure logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger('auth_service')
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    logger.addHandler(handler)
    # Initialize MongoDB
    try:
        global mongodb_client, db
        mongodb_client = MongoClient(app.config['MONGO_URI'])
        db = mongodb_client.get_database()
        db.command('ping')
        app.db = db
        logger.info("Successfully connected to MongoDB!")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

    # Initialize Mail
    mail.init_app(app)
    app.mail = mail
    
    from backend.app.services.mail_service import EmailService
    from backend.app.services.auth_service import AuthService

    # Initialize Services
    email_service = EmailService(app.mail, app.config['FRONTEND_URL'])
    auth_service = AuthService(app.db, email_service)
    app.auth_service = auth_service

    # Register Blueprints
    from app.routes.auth_routes import auth_bp
    from app.routes.dashboard_routes import dashboard_bp
    from app.routes.avatar_upload import avatar_bp
    from backend.app.routes.staff_routes import staff_bp 
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

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(fake_user_bp, url_prefix='/api/fake_user')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(avatar_bp, url_prefix='/api')
    app.register_blueprint(staff_bp, url_prefix='/api/staffs')
    app.register_blueprint(student_bp, url_prefix='/api/students')
    app.register_blueprint(timetable_bp, url_prefix='/api/timetable')
    app.register_blueprint(initial_req_bp, url_prefix='/api/initial_req')
    app.register_blueprint(class_bp, url_prefix='/api/classes')
    app.register_blueprint(subjects_bp, url_prefix='/api/subjects')
    app.register_blueprint(subject_gen_bp, url_prefix='/api/subject-gen') 
    app.register_blueprint(stream_config_bp, url_prefix='/api/stream-config')
    app.register_blueprint(constants_bp, url_prefix='/api/constants')
    app.register_blueprint(subject_assign_bp, url_prefix='/api/subject-assign')
    app.register_blueprint(timeslots_bp, url_prefix='/api/timeslots')
     

    # Enable CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": [app.config['FRONTEND_URL']],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True,
            "max_age": 600  # Cache preflight requests for 10 minutes
        }
    })
    
     
    @app.errorhandler(401)
    def unauthorized_handler(e):
        return {
            "error": "Unauthorized",
            "message": str(e.description)
        }, 401
    

    return app



# Configure rate limiting
    # limiter = Limiter(
    #     app=app,
    #     key_func=get_remote_address,
    #     default_limits=["200 per day", "50 per hour"]
    # )
    
    # Apply specific rate limits to auth endpoints
    # @limiter.limit("5 per minute")
    # @app.route("/api/auth/login", methods=["POST"])
    # def login_limit():
    #     pass
    # Apply rate limit to login route
    # @limiter.limit("5 per minute")
    # @app.route("/api/auth/login", methods=["POST"])
    # def login_limit():
    #     return login()  # Call the actual login function
    
    # @limiter.limit("3 per minute")
    # @app.route("/api/auth/refresh", methods=["POST"])
    # def refresh_limit():
    #     pass
    
    # Register error handlers
    # @app.errorhandler(429)
    # def ratelimit_handler(e):
    #     return {
    #         "error": "Too many requests",
    #         "message": str(e.description)
    #     }, 429