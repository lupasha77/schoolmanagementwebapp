# app/routes/auth.py
from flask import Blueprint, request, jsonify, current_app 
import logging  
from app.validation.validators import required_fields, validate_password, validate_email 
from app.middleware.auth_middleware import token_required
import os
from config.config import Config

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__)
 

@auth_bp.route('/register', methods=['POST'])
@required_fields(['firstName', 'lastName', 'user_email', 'password'])
def register():
    """Handles user registration."""
    try:
        data = request.get_json()
        if not validate_email(data['user_email']):
            return jsonify({"error": "Invalid email format"}), 400
        if not validate_password(data['password']):
            return jsonify({"error": "Weak password"}), 400

        user = current_app.auth_service.register_user(data)
        return jsonify({
            "message": "Registration successful. Check email for verification.",
            "user_id": str(user['_id'])
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({"error": "Registration failed"}), 500

@auth_bp.route('/verify-email/<token>', methods=['GET'])
def verify_email_token(token):
    """Verifies a user's email."""
    try:
        current_app.auth_service.verify_email_token(token)
        return jsonify({"message": "Email verified successfully"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Verification failed: {str(e)}")
    return jsonify({"error": "Verification failed"}), 500

@auth_bp.route('/send-verification', methods=['POST'])
def send_verification():
    """Resends email verification token."""
    try:
        data = request.get_json()
        if not data or 'email' not in data:
            return jsonify({"error": "Email is required"}), 400
        return current_app.auth_service.resend_verification_email(data['email'])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login endpoint"""
    try:
        data = request.get_json()
        tokens = current_app.auth_service.login_user(data)
        return jsonify(tokens), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Login failed"}), 500

# @auth_bp.route('/refresh', methods=['POST'])
# def refresh():
#     """Token refresh endpoint"""
#     try:
#         data = request.get_json()
#         new_token = current_app.auth_service.refresh_token(data.get("refresh_token"))
#         return jsonify(new_token), 200
#     except ValueError as e:
#         return jsonify({"error": str(e)}), 400
#     except Exception as e:
#         print('refresher error',e)
#         return jsonify({"error": "Token refresh failed"}), 500
from flask import request, jsonify
import jwt

@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    try:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith("Bearer "):
            refresh_token = auth_header.split(" ")[1]
        else:
            data = request.get_json()
            refresh_token = data.get("refresh_token") if data else None

        if not refresh_token:
            return jsonify({"error": "No token provided"}), 401

        print(f"Received token: {refresh_token}")  # Debugging print

        SECRET_KEY = os.getenv('JWT_REFRESH_SECRET_KEY')

        print(f"JWT_REFRESH_SECRET_KEY: ,{SECRET_KEY}")

        # Verify token
        try:
            decoded_token = jwt.decode(refresh_token, SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        except jwt.DecodeError:
            return jsonify({"error": "Invalid token"}), 401
        
        print(f"Decoded token: {decoded_token}")  # Debugging print

        # Check if 'sub' exists instead of 'user_id'
        if 'sub' not in decoded_token:
            return jsonify({"error": "Token is missing 'sub'"}), 401

        # Use 'sub' as the user identifier
        new_access_token = jwt.encode({"user_id": decoded_token["sub"]}, SECRET_KEY, algorithm="HS256")


         

        return jsonify({"access_token": new_access_token}), 200

    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Refresh token has expired"}), 401
    except jwt.InvalidTokenError as e:
        return jsonify({"error": str(e)}), 401

@auth_bp.route('/verify', methods=['POST'])
def verify():
    """Token verification endpoint"""
    try:
        data = request.get_json()
        # Use is_refresh flag to indicate if it's a refresh token or access token
        is_refresh = data.get("is_refresh", False)  # Defaults to False (access token)
        verified_data = current_app.auth_service.verify_token(data.get("token"), is_refresh)
        return jsonify(verified_data), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Verification error: {str(e)}")
        return jsonify({"error": "Token verification failed"}), 500


@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(user_id):
    """Handles user logout."""
    return jsonify({"message": "Logged out successfully"}), 200

@auth_bp.route('/protected', methods=['GET'])
@token_required
def protected(user_id):
    """Example protected route."""
    return jsonify({"message": f"Hello User {user_id}!", "authenticated": True}), 200

 
 
def get_user_data(user_id):
    """Retrieves user data from database for verification response.

    This helper function extracts only the necessary user fields to return
    after successful token verification.
    """
    try:
        user = current_app.mongo.db.users.find_one({"user_email": user_id})
        if not user:
            return None

        return {
            "id": str(user['_id']),
            "email": user['user_email'],
            "firstName": user.get('firstName', ''),
            "lastName": user.get('lastName', ''),
            "role": user.get('role', 'user'),
            "avatar": user.get('avatar')
        }
    except Exception as e:
        logger.error(f"Error retrieving user data for {user_id}: {str(e)}")
        return None

@auth_bp.route('/admin', methods=['GET'])
@token_required
def admin(user_id):
    """Admin-only route."""
    user_data = get_user_data(user_id)
    if user_data['role'] != 'admin':
        return jsonify({"error": "Unauthorized access"}), 403
    return jsonify({"message": "Hello Admin!"})

@auth_bp.route('/student', methods=['GET'])
@token_required
def student(user_id):
    """Student-only route."""
    user_data = get_user_data(user_id)
    if user_data['role'] != 'student':
        return jsonify({"error": "Unauthorized access"}), 403
    return jsonify({"message": "Hello Student!"})

@auth_bp.route('/staff', methods=['GET'])
@token_required
def staff(user_id):
    """Staff-only route."""
    user_data = get_user_data(user_id)
    if user_data['role'] != 'staff':
        return jsonify({"error": "Unauthorized access"}), 403
    return jsonify({"message": "Hello Staff!"})

 

def get_user_data(user_id):
    """Fetches user data."""
    try:
        user = current_app.mongo.db.users.find_one({"user_email": user_id})
        if not user:
            return None

        return {
            "id": str(user['_id']),
            "email": user['user_email'],
            "firstName": user.get('firstName', ''),
            "lastName": user.get('lastName', ''),
            "role": user.get('role', 'user'),
            "avatar": user.get('avatar')
        }
    except Exception as e:
        logger.error(f"Error retrieving user data for {user_id}: {str(e)}")
        return None