import os
import logging
from pathlib import Path
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename
from bson import ObjectId
from app.middleware.auth_middleware import token_required
from app.utils.jwt_handler import JWTHandler

logger = logging.getLogger("avatar_service")
avatar_bp = Blueprint("avatar", __name__)

def check_file_exists(filepath: Path) -> bool:
    """Helper function to check if a file exists."""
    try:
        if filepath.is_file():
            logger.info(f"File exists: {filepath}")
            return True
        logger.warning(f"File not found: {filepath}")
        return False
    except Exception as e:
        logger.error(f"Error checking file: {str(e)}")
        return False

@avatar_bp.route("/avatar/upload-avatar/<user_id>", methods=["POST"])
def upload_avatar(user_id):
    """Handle avatar upload."""
    try:
        file = request.files.get("file")
        if not file or file.filename == "":
            return jsonify({"error": "No file provided"}), 400

        filename = secure_filename(f"avatar_{user_id}{Path(file.filename).suffix}")
        avatar_folder = Path(current_app.config["AVATAR_FOLDER"])
        file_path = avatar_folder / filename
        
        avatar_folder.mkdir(parents=True, exist_ok=True)
        file.save(str(file_path))
        
        if not check_file_exists(file_path):
            return jsonify({"error": "Failed to save file"}), 500

        avatar_url = f"/uploads/avatars/{filename}"
        result = current_app.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"avatar": avatar_url}}
        )
        
        if result.modified_count == 0:
            file_path.unlink(missing_ok=True)
            return jsonify({"error": "Failed to update avatar in database"}), 500
        
        return jsonify({"message": "Avatar uploaded successfully", "avatar_path": avatar_url}), 200
    except Exception as e:
        logger.error(f"Error uploading avatar: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to upload avatar"}), 500

@avatar_bp.route("/uploads/avatars/<filename>")
def serve_avatar(filename):
    """Serve avatar images."""
    try:
        avatar_folder = Path(current_app.config["AVATAR_FOLDER"])
        file_path = avatar_folder / filename
        
        if not check_file_exists(file_path):
            return jsonify({"error": "Avatar file not found"}), 404

        return send_from_directory(directory=str(avatar_folder.resolve()), path=filename, mimetype="image/*")
    except Exception as e:
        logger.error(f"Error serving avatar: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to serve avatar"}), 500

@avatar_bp.route("/avatar/update-avatar", methods=["POST"])
@token_required
def update_avatar(current_user):
    """Update user avatar."""
    try:
        file = request.files.get("file")
        if not file or file.filename == "":
            return jsonify({"error": "No file provided"}), 400

        filename = secure_filename(f"avatar_{current_user}{Path(file.filename).suffix}")
        avatar_folder = Path(current_app.config["AVATAR_FOLDER"])
        file_path = avatar_folder / filename

        avatar_folder.mkdir(parents=True, exist_ok=True)
        file.save(str(file_path))

        avatar_url = f"/uploads/avatars/{filename}"
        result = current_app.db.users.update_one(
            {"_id": ObjectId(current_user)},
            {"$set": {"avatar": avatar_url}}
        )

        return jsonify({"message": "Avatar updated successfully", "avatar_path": avatar_url}), 200
    except Exception as e:
        logger.error(f"Error updating avatar: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to update avatar"}), 500
    
@avatar_bp.route("/avatar/get-avatar/<user_id>", methods=["GET"])
def get_avatar(user_id):
    """Retrieves the user's avatar."""
    try:
        # Fetch user data from the database
        user = current_app.db.users.find_one({"_id": ObjectId(user_id)}, {"avatar": 1})
        # logger.info(f"Retrieved user data: {user}")
        
        if not user:
            logger.warning(f"User not found: {user_id}")
            return jsonify({"error": "User not found"}), 404
        
        if not user or "avatar" not in user:
            return jsonify({"error": "Avatar not found"}), 404
        
        avatar_url = user["avatar"]
        # logger.info(f"Avatar URL: {avatar_url}")

        # Return the avatar URL (Frontend will use this to display the image)
        return jsonify({"avatar_url": avatar_url}), 200

    except Exception as e:
        logger.error(f"Error retrieving avatar: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve avatar"}), 500


 

# Error Handlers
@avatar_bp.errorhandler(401)
def handle_unauthorized(error):
    return jsonify({"error": "Unauthorized"}), 401

@avatar_bp.errorhandler(404)
def handle_not_found(error):
    return jsonify({"error": "Not found"}), 404

@avatar_bp.errorhandler(Exception)
def handle_generic_error(error):
    logger.error(f"Unexpected error: {str(error)}", exc_info=True)
    return jsonify({"error": "Internal server error"}), 500
