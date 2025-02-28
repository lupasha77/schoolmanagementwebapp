# app/routes/dashboard_routes.py
from flask import Blueprint, jsonify, request, current_app
from bson import ObjectId
from app.middleware.auth_middleware import token_required
from werkzeug.security import generate_password_hash, check_password_hash 
from flask import Blueprint, jsonify, request, current_app
from bson import ObjectId
from app.middleware.auth_middleware import token_required
from werkzeug.utils import secure_filename
import os
import logging
 

logger = logging.getLogger(__name__)
dashboard_bp = Blueprint('dashboard', __name__)
  
@dashboard_bp.route('/profile', methods=['GET']) 
@token_required
def get_profile(current_user):
    """Get user profile information"""
    try:
        user = current_app.db.users.find_one({'_id': ObjectId(current_user)})
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Remove sensitive information
        user.pop('password', None)
        user.pop('verification_token', None)
        user['_id'] = str(user['_id'])
        
        return jsonify(user), 200
        
    except Exception as e:
        logger.error(f"Error retrieving profile: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@dashboard_bp.route('/profile', methods=['PUT']) 
@token_required
def update_profile(current_user):
    """Update user profile information"""
    try:
        data = request.get_json()
        user = current_app.db.users.find_one({'_id': ObjectId(current_user)})
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        allowed_fields = {'firstName', 'lastName', 'address', 'phone_number'}
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400
            
        result = current_app.db.users.update_one(
            {'_id': ObjectId(current_user)},
            {'$set': update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'No changes made'}), 400
            
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@dashboard_bp.route('/profile/password', methods=['PUT']) 
@token_required
def update_password(current_user):
    """Update user password"""
    try:
        data = request.get_json()
        
        if not all(k in data for k in ('currentPassword', 'newPassword')):
            return jsonify({'error': 'Current and new password required'}), 400
            
        user = current_app.db.users.find_one({'_id': ObjectId(current_user)})
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        if not check_password_hash(user['password'], data['currentPassword']):
            return jsonify({'error': 'Current password is incorrect'}), 400
            
        if len(data['newPassword']) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400
            
        new_password_hash = generate_password_hash(data['newPassword'])
        result = current_app.db.users.update_one(
            {'_id': ObjectId(current_user)},
            {'$set': {'password': new_password_hash}}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Password update failed'}), 400
            
        return jsonify({'message': 'Password updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error updating password: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
     



# @dashboard_bp.route('/profile/avatar/<string:_id>', methods=['POST'])
# @token_required
# def upload_avatar(current_user, _id):
    """Handle avatar upload with security checks"""
    logger.debug(f"Upload avatar request received for _id: {_id}")
    logger.debug(f"Current user from token: {current_user}")
    logger.debug(f"Request method: {request.method}")
    
    try:
        # Verify user authorization
        if str(current_user) != _id:
            logger.warning(f"Unauthorized: current_user {current_user} != requested _id {_id}")
            return jsonify({'error': 'Unauthorized'}), 403
            
        if 'file' not in request.files:
            logger.warning("No file in request")
            return jsonify({'error': 'No file provided'}), 400
            
        file = request.files['file']
        if not file or not file.filename:
            logger.warning("Empty file or filename")
            return jsonify({'error': 'No file selected'}), 400
            
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        file_ext = os.path.splitext(file.filename.lower())[1][1:]
        if file_ext not in allowed_extensions:
            logger.warning(f"Invalid file type: {file_ext}")
            return jsonify({'error': 'Invalid file type'}), 400
            
        # Create secure filename
        new_filename = f"avatar_{_id}.{file_ext}"
        logger.debug(f"New filename: {new_filename}")
        
        # Ensure upload directory exists
        upload_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'avatars')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(upload_dir, new_filename)
        file.save(file_path)
        logger.debug(f"File saved to: {file_path}")
        
        # Update user's avatar path in database
        avatar_url = f"/uploads/avatars/{new_filename}"
        result = current_app.db.users.update_one(
            {'_id': ObjectId(_id)},
            {'$set': {'avatar': avatar_url}}
        )
        
        if result.modified_count == 0:
            logger.error("Database update failed")
            os.remove(file_path)
            return jsonify({'error': 'Failed to update avatar in database'}), 500
            
        logger.info(f"Avatar successfully uploaded for user {_id}")
        return jsonify({
            'message': 'Avatar uploaded successfully',
            'avatar_path': avatar_url
        }), 200
        
    except Exception as e:
        logger.error(f"Error uploading avatar: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500
 

# @dashboard_bp.route('/profile/avatar/<string:_id>', methods=['POST', 'OPTIONS'])
# @token_required
# def upload_avatar(current_user, _id):
    """Handle avatar upload with enhanced debugging"""
    logger.debug(f"Starting avatar upload process for user_id: {_id}")
    logger.debug(f"Current user from token: {current_user}")
    logger.debug(f"Request method: {request.method}")
    
    
    
    try:
        logger.debug("Checking user authorization")
        if str(current_user) != _id:
            logger.warning(f"Unauthorized access attempt: current_user={current_user}, user._id={_id}")
            return jsonify({'error': 'Unauthorized'}), 403
        
        logger.debug("Checking for file in request")
        if 'file' not in request.files:
            logger.warning("No file found in request")
            logger.debug(f"Request files: {request.files}")
            logger.debug(f"Request form: {request.form}")
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if not file or not file.filename:
            logger.warning("Empty file or filename")
            return jsonify({'error': 'No file selected'}), 400
        
        logger.debug(f"File received: {file.filename}")
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        file_ext = os.path.splitext(file.filename.lower())[1][1:]
        logger.debug(f"File extension: {file_ext}")
        
        if file_ext not in allowed_extensions:
            logger.warning(f"Invalid file type: {file_ext}")
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Create secure filename
        filename = secure_filename(file.filename)
        new_filename = f"avatar_{_id}.{file_ext}"
        logger.debug(f"New filename: {new_filename}")
        
        # Ensure upload directory exists
        upload_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'avatars')
        logger.debug(f"Upload directory: {upload_dir}")
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(upload_dir, new_filename)
        logger.debug(f"Saving file to: {file_path}")
        file.save(file_path)
        
        # Update user's avatar path in database
        avatar_url = f"/uploads/avatars/{new_filename}"
        logger.debug(f"Updating database with avatar URL: {avatar_url}")
        
        result = current_app.db.users.update_one(
            {'_id': ObjectId(current_user)},
            {'$set': {'avatar': avatar_url}}
        )
        
        if result.modified_count == 0:
            logger.error("Database update failed")
            os.remove(file_path)  # Clean up file if database update fails
            return jsonify({'error': 'Failed to update avatar in database'}), 500
        
        logger.info(f"Avatar successfully uploaded for user {_id}")
        return jsonify({
            'message': 'Avatar uploaded successfully',
            'avatar_path': avatar_url
        }), 200
        
    except Exception as e:
        logger.error(f"Error uploading avatar: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

# @dashboard_bp.route('/profile/avatar/<user_id>', methods=['POST'])
# @token_required
# def upload_avatar(current_user, user_id):
    """Handle avatar upload with security checks"""
    try:
        if str(current_user) != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
            
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
            
        file = request.files['file']
        if not file or not file.filename:
            return jsonify({'error': 'No file selected'}), 400
            
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        file_ext = os.path.splitext(file.filename.lower())[1][1:]
        if file_ext not in allowed_extensions:
            return jsonify({'error': 'Invalid file type'}), 400
            
        # Create secure filename
        filename = secure_filename(file.filename)
        new_filename = f"avatar_{user_id}.{file_ext}"
        
        # Ensure upload directory exists
        upload_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'avatars')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(upload_dir, new_filename)
        file.save(file_path)
        
        # Update user's avatar path in database
        avatar_url = f"/uploads/avatars/{new_filename}"
        result = current_app.db.users.update_one(
            {'_id': ObjectId(current_user)},
            {'$set': {'avatar': avatar_url}}
        )
        
        if result.modified_count == 0:
            os.remove(file_path)  # Clean up file if database update fails
            return jsonify({'error': 'Failed to update avatar in database'}), 500
            
        return jsonify({
            'message': 'Avatar uploaded successfully',
            'avatar_path': avatar_url
        }), 200
        
    except Exception as e:
        logger.error(f"Error uploading avatar: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500