# app/services/auth_service.py
import logging 
from app.models.users import User
import logging 
from flask import jsonify 
from werkzeug.security import check_password_hash
from app.utils.jwt_handler import get_jwt_handler
 
# Configure detailed logging for the auth module
logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self, db, email_service):
        self.db = db
        self.email_service = email_service
        self.jwt_handler = get_jwt_handler()
        logger.info("AuthService initialized")
        logger.info("Email service initialized", extra={"service": "email"})

    def register_user(self, user_data):
        """Registers a new user and sends a verification email."""
        try:
            logger.info(f"Attempting to register user: {user_data['user_email']}")
            
            # Check if user already exists
            existing_user = self.db.users.find_one({"user_email": user_data['user_email']})
            if existing_user:
                logger.warning(f"Registration failed: User {user_data['user_email']} already exists")
                raise ValueError("User already exists")

            # Generate verification token
            verification_token = User.generate_verification_token()
            logger.debug(f"Generated verification token for {user_data['user_email']}")
            
            # Create user with verification token
            user = User(**user_data, verification_token=verification_token, verified=False)
            result = self.db.users.insert_one(user.to_dict())
            
            if not result.inserted_id:
                logger.error(f"Failed to create user: {user_data['user_email']}")
                raise Exception("Failed to create user")

            # Send verification email
            logger.info(f"Sending verification email to {user_data['user_email']}")
            self.email_service.send_verification_email(
                user_data['user_email'],
                user_data['firstName'],
                verification_token
            )
            
            logger.info(f"User registered successfully: {user_data['user_email']}")
            return user.to_dict()

        except Exception as e:
            logger.error(f"Registration error for {user_data.get('user_email', 'unknown')}: {e}", exc_info=True)
            raise

    def verify_email_token(self, token):
        """Verifies a user's email using the token."""
        logger.info(f"Verifying email with token: {token[:10]}...")
        
        # Find user with this verification token
        user = self.db.users.find_one({"verification_token": token})
        
        if not user:
            logger.warning(f"Invalid verification token: {token[:10]}...")
            raise ValueError("Invalid verification token")
            
        if user.get("verified"):
            logger.info(f"Email already verified for user: {user['user_email']}")
            return jsonify({"message": "Email already verified"}), 200

        # Update user as verified
        logger.info(f"Verifying email for user: {user['user_email']}")
        result = self.db.users.update_one(
            {"_id": user['_id']}, 
            {"$set": {"verified": True}, "$unset": {"verification_token": ""}}
        )
        
        if result.modified_count == 0:
            logger.error(f"Failed to update verification status for user: {user['user_email']}")
            raise Exception("Failed to verify email")
            
        logger.info(f"Email verified successfully for user: {user['user_email']}")
        return jsonify({"message": "Email verified successfully"}), 200

     

    def login_user(self, user_data):
        """Handles user login and token generation."""
        try:
            logger.info(f"Attempting login for user: {user_data['user_email']}")
            
            # Find the user from the database using the email
            user = self.db.users.find_one({"user_email": user_data['user_email']})
            
            # Validate user credentials
            if not user or not check_password_hash(user['password'], user_data['password']):
                logger.warning("Invalid email or password")
                raise ValueError("Invalid credentials")
            
            # Create access and refresh tokens
            access_token = self.jwt_handler.create_access_token(user['_id'])
            refresh_token = self.jwt_handler.create_refreshToken(user['_id'])
            
            # Store refresh token with a limit of 5 tokens per user
            self.db.refreshTokens.update_one(
                {"user_id": user['_id']},
                {"$push": {"tokens": {"$each": [refresh_token], "$slice": -5}}},
                upsert=True
            )
            
            logger.info(f"User {user_data['user_email']} logged in successfully")
            
            # Prepare the response data
            user_data_response = {
                
                "user_email": user['user_email'],
                "avatar": user.get('avatar', ''),  # Use empty string if avatar doesn't exist
                "firstName": user.get('firstName', ''),
                "access_token": access_token,
                "role": user.get('role', 'user'),
                "refresh_token": refresh_token,
                # "user_id":user.get('_id', ''),
            }
            
            return user_data_response
        except Exception as e:
            logger.error(f"Login error for {user_data.get('user_email', 'unknown')}: {str(e)}", exc_info=True)
            raise

    def refresh_token(self, refresh_token):
        """Handles token refreshing."""
        try:
            payload = self.jwt_handler.verify_token(refresh_token, is_refresh=True)
            user_id = payload.get('sub')
            
            # Check if token exists in DB
            token_entry = self.db.refreshTokens.find_one({"user_id": user_id, "tokens": refresh_token})
            if not token_entry:
                logger.warning("Invalid or expired refresh token")
                raise ValueError("Invalid refresh token")
            
            new_access_token = self.jwt_handler.create_access_token(user_id)
            logger.info(f"Generated new access token for user {user_id}")
            return {"access_token": new_access_token}
        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}", exc_info=True)
            raise

    def verify_token(self, token, is_refresh=False):
        """Verifies access or refresh token."""
        try:
            return self.jwt_handler.verify_token(token, is_refresh)
        except Exception as e:
            logger.error(f"Token verification error: {str(e)}", exc_info=True)
            raise
