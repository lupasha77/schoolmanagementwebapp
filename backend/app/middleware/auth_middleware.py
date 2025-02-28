from functools import wraps
from flask import request, jsonify, current_app
from app.utils.jwt_handler import JWTHandler
import logging,jwt
logger = logging.getLogger(__name__)
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')

        if auth_header:
            token = auth_header.split(" ")[1] if len(auth_header.split(" ")) > 1 else None

        if not token:
            logger.warning("Token is missing from the request")
            return jsonify({"error": "Token is missing"}), 401

        try:
            payload = JWTHandler().verify_token(token)
            return f(payload['sub'], *args, **kwargs)
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            logger.warning("Invalid token")
            return jsonify({"error": "Invalid token"}), 401
        except Exception as e:
            logger.error(f"Unknown error during token verification: {str(e)}", exc_info=True)
            return jsonify({"error": "An error occurred during token verification"}), 500

    return decorated