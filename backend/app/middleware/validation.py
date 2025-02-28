# app/middleware/validation.py
from functools import wraps
from flask import request, jsonify
from marshmallow import Schema, fields, ValidationError

class RequestValidator:
    @staticmethod
    def validate_request(required_fields):
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                if not request.is_json:
                    return jsonify({'error': 'Content-Type must be application/json'}), 400
                
                data = request.json
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    return jsonify({
                        'error': f'Missing required fields: {", ".join(missing_fields)}'
                    }), 400
                
                return f(*args, **kwargs)
            return decorated_function
        return decorator

validate_request = RequestValidator.validate_request