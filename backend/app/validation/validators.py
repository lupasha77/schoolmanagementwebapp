# app/validation/validators.py
import re
from functools import wraps
from flask import jsonify, request
from marshmallow import ValidationError
from datetime import datetime

def validate_time_format(time_str):
    try:
        datetime.strptime(time_str, '%H:%M')
        return True
    except ValueError:
        raise ValidationError('Invalid time format. Use HH:MM format.')

def validate_day_of_week(day):
    valid_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    if day not in valid_days:
        raise ValidationError(f'Invalid day. Must be one of {", ".join(valid_days)}')


def validate_password(password):
    """
    Validate password strength
    - At least 8 characters long
    - Contains at least one uppercase letter
    - Contains at least one lowercase letter
    - Contains at least one number
    - Contains at least one special character
    """
    if len(password) < 8:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"\d", password):
        return False
    if not re.search(r"[ !@#$%&'()*+,-./[\\\]^_`{|}~"+r'"]', password):
        return False
    return True

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def required_fields(fields):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({"error": "Content-Type must be application/json"}), 400
            
            data = request.get_json()
            missing_fields = [field for field in fields if field not in data]
            
            if missing_fields:
                return jsonify({
                    "error": "Missing required fields",
                    "fields": missing_fields
                }), 400
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def validate_schedule_conflicts(schedule):
    # Check for teacher conflicts
    teacher_slots = {}
    for slot in schedule:
        key = f"{slot['day']}_{slot['start_time']}"
        if slot.get('teacher_id'):
            if key in teacher_slots:
                raise ValidationError(
                    f"Teacher scheduling conflict at {slot['day']} {slot['start_time']}"
                )
            teacher_slots[key] = slot['teacher_id']
    
    # Check for class conflicts
    class_slots = {}
    for slot in schedule:
        key = f"{slot['day']}_{slot['start_time']}"
        if slot.get('class_id'):
            if key in class_slots:
                raise ValidationError(
                    f"Class scheduling conflict at {slot['day']} {slot['start_time']}"
                )
            class_slots[key] = slot['class_id']