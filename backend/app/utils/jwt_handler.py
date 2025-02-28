# app/utils/jwt_handler.py
from datetime import datetime, timedelta
import jwt
from flask import current_app
import logging

# Configure detailed logging
logger = logging.getLogger(__name__) 
logging.basicConfig(level=logging.WARNING)  # Show only WARNING and ERROR logs

# Create singleton instance
jwt_handler = None

def get_jwt_handler():
    global jwt_handler
    if jwt_handler is None:
        jwt_handler = JWTHandler()
        logger.info("JWTHandler singleton created")
    return jwt_handler

class JWTHandler:
    def create_access_token(self, user_id, additional_claims=None):
        """Create a new access token"""
        try:
            logger.debug(f"Creating access token for user: {user_id}")
            
            # Get token expiration time from config or use default
            expiration_minutes = current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES', 15)
            expiration_time = datetime.utcnow() + timedelta(minutes=expiration_minutes)
            
            # Build token payload
            payload = {
                'user_id': str(user_id),  # Add user_id here
                'sub': str(user_id),
                'type': 'access',  # Corrected from 'refresh' to 'access'
                'iat': datetime.utcnow(),
                'exp': expiration_time
            }
            
            if additional_claims:
                payload.update(additional_claims)
                logger.debug(f"Added additional claims to access token: {list(additional_claims.keys())}")
            
            # Get secret key
            secret_key = current_app.config.get('JWT_SECRET_KEY')
            if not secret_key:
                logger.error("Missing JWT_SECRET_KEY in configuration")
                raise ValueError("JWT_SECRET_KEY not configured")
                
            # Encode token
            token = jwt.encode(
                payload,
                secret_key,
                algorithm='HS256'
            )
            
            logger.info(f"Created access token for user {user_id} (expires in {expiration_minutes} minutes)")
            return token
        except Exception as e:
            logger.error(f"Error creating access token for {user_id}: {str(e)}", exc_info=True)
            raise

    def create_refreshToken(self, user_id):
        """Create a new refresh token"""
        try:
            logger.debug(f"Creating refresh token for user: {user_id}")
            
            # Get token expiration time from config or use default (30 days)
            expiration_days = current_app.config.get('JWT_REFRESH_TOKEN_EXPIRES', 30)
            expiration_time = datetime.utcnow() + timedelta(days=expiration_days)
            
            # Build token payload
            payload = {
                'user_id': str(user_id),  # Add user_id here
                'sub': str(user_id),
                'type': 'refresh',  # This is correct for refresh token
                'iat': datetime.utcnow(),
                'exp': expiration_time
            }

            # Get secret key for refresh token
            refresh_secret_key = current_app.config.get('JWT_REFRESH_SECRET_KEY')
            if not refresh_secret_key:
                logger.error("Missing JWT_REFRESH_SECRET_KEY in configuration")
                raise ValueError("JWT_REFRESH_SECRET_KEY not configured")
            
            # Encode token
            token = jwt.encode(
                payload,
                refresh_secret_key,
                algorithm='HS256'
            )
            
            logger.info(f"Created refresh token for user {user_id} (expires in {expiration_days} days)")
            return token
        except Exception as e:
            logger.error(f"Error creating refresh token for {user_id}: {str(e)}", exc_info=True)
            raise

    def verify_token(self, token, is_refresh=False):
        """Verify and decode a JWT token"""
        try:
            logger.debug(f"Verifying {'refresh' if is_refresh else 'access'} token...")

            # Ensure token is provided
            if not token:
                logger.warning("No token provided for verification")
                raise jwt.InvalidTokenError("No token provided")
            
            logger.debug(f"Verifying {'refresh' if is_refresh else 'access'} token: {token[:20]}...")

            # Determine secret key based on token type
            secret_key_name = 'JWT_REFRESH_SECRET_KEY' if is_refresh else 'JWT_SECRET_KEY'
            secret = current_app.config.get(secret_key_name)
            if not secret:
                logger.error(f"Missing {secret_key_name} in config")
                raise jwt.InvalidTokenError(f"Server configuration error: {secret_key_name} not found")
            
            # Decode the token
            try:
                payload = jwt.decode(
                    token,
                    secret,
                    algorithms=['HS256']
                )
            except jwt.ExpiredSignatureError:
                logger.warning(f"Token has expired: {token[:20]}...")
                raise
            except jwt.InvalidTokenError as e:
                logger.warning(f"Invalid token: {str(e)}")
                raise

            # Log the decoded payload
            safe_payload = payload.copy()
            for key in ['sub', 'jti']:
                if key in safe_payload:
                    safe_payload[key] = f"{safe_payload[key][:3]}...{safe_payload[key][-3:]}" if len(safe_payload[key]) > 6 else safe_payload[key]
            logger.debug(f"Decoded token payload: {safe_payload}")

            # Verify the token type
            expected_type = 'refresh' if is_refresh else 'access'
            if payload.get('type') != expected_type:
                logger.warning(f"Invalid token type. Got {payload.get('type')}, expected {expected_type}")
                raise jwt.InvalidTokenError(f"Invalid token type. Expected {expected_type}")
                
            logger.info(f"Successfully verified {'refresh' if is_refresh else 'access'} token for user {payload.get('sub')}")
            return payload

        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            raise
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error verifying token: {str(e)}", exc_info=True)
            raise

# Convenience functions for import
def create_access_token(user_id, additional_claims=None):
    return get_jwt_handler().create_access_token(user_id, additional_claims)

def create_refreshToken(user_id):
    return get_jwt_handler().create_refreshToken(user_id)

def verify_token(token, is_refresh=False):
    return get_jwt_handler().verify_token(token, is_refresh)