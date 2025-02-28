from flask import Blueprint, request, jsonify, current_app
from bson.json_util import dumps
import json

# Create a Blueprint for API routes
timeslots_bp = Blueprint('timeslots', __name__)

@timeslots_bp.route('/configurations/periods', methods=['GET'])
def get_periods():
    """Get period configuration from database"""
    try:
        # Get the database connection from app context
        db = current_app.db
        
        # Try to fetch configuration from database
        config = db.configurations.find_one({"type": "periods"})
        
        if config and "periods" in config:
            # Convert ObjectId to strings for JSON serialization
            periods = json.loads(dumps(config["periods"]))
            return jsonify(periods)
        
        # Return default configuration if not found
        default_periods = {
            "1": {"start": "7:00", "end": "7:05", "type": "Registration"},
            "2": {"start": "7:05", "end": "7:40", "type": "lesson"},
            "3": {"start": "7:40", "end": "8:15", "type": "lesson"},
            "4": {"start": "8:15", "end": "8:50", "type": "lesson"},
            "5": {"start": "8:50", "end": "9:25", "type": "lesson"},
            "6": {"start": "9:25", "end": "9:40", "type": "Morning Break Time","name": "Short Break"},
            "7": {"start": "9:40", "end": "10:15", "type": "lesson"},
            "8": {"start": "10:15", "end": "10:50",  "type": "lesson"},
            "9": {"start": "10:50", "end": "11:25", "type": "lesson"},
            "10": {"start": "11:25", "end": "12:00", "type": "lesson"},
            "11": {"start": "12:00", "end": "13:00", "type": "Lunch Break Time", "name": "Lunch Break"},
            "12": {"start": "13:00", "end": "16:00", "type": "Sporting/Clubs/Extracurricular"},
        }
        
        return jsonify(default_periods)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@timeslots_bp.route('/configurations/periods', methods=['POST'])
def update_periods():
    """Update period configuration in database"""
    try:
        # Get the database connection from app context
        db = current_app.db
        
        # Get the new configuration from request
        new_config = request.json
        
        if not new_config:
            return jsonify({"error": "No data provided"}), 400
        
        # Basic validation
        for period_id, data in new_config.items():
            if not isinstance(data, dict) or "start" not in data or "end" not in data or "type" not in data:
                return jsonify({"error": f"Invalid configuration for period {period_id}"}), 400
        
        # Update in database
        result = db.configurations.update_one(
            {"type": "periods"},
            {"$set": {"periods": new_config}},
            upsert=True
        )
        
        # Send notification to invalidate cache
        # This could be a message to a Redis channel or other service to notify 
        # all running instances to reload their period configuration
        # ...
        
        return jsonify({
            "success": True,
            "message": "Period configuration updated successfully",
            "modified": result.modified_count,
            "upserted": result.upserted_id is not None
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500