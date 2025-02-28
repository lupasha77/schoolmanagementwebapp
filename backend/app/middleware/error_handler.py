# app/middleware/error_handler.py
from flask import jsonify
from mongoengine.errors import ValidationError, DoesNotExist, NotUniqueError

def register_error_handlers(app):
    @app.errorhandler(ValidationError)
    def handle_validation_error(error):
        return jsonify({'error': str(error)}), 400

    @app.errorhandler(DoesNotExist)
    def handle_not_found_error(error):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(NotUniqueError)
    def handle_not_unique_error(error):
        return jsonify({'error': 'Resource already exists'}), 409

    @app.errorhandler(Exception)
    def handle_generic_error(error):
        return jsonify({'error': 'Internal server error'}), 500
# app/middleware/error_handler.py
from flask import jsonify

def register_error_handlers(app):
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'error': 'Bad Request',
            'message': str(error.description)
        }), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            'error': 'Unauthorized',
            'message': 'Authentication required'
        }), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            'error': 'Forbidden',
            'message': 'You do not have permission to access this resource'
        }), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Not Found',
            'message': 'The requested resource was not found'
        }), 404

    @app.errorhandler(500)
    def internal_server_error(error):
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred'
        }), 500