# app/routes/class_routes.py
from datetime import datetime
from bson import ObjectId
from flask import Blueprint, current_app, jsonify, request

from app.middleware.school_validator import SchoolValidator, ValidationError
from app.services.timetable_service import TimetableService
from config.timetable_config import TimetableConfig
from ..services.class_service import ClassService
from ..middleware.validation import validate_request
from ..models.schemas import Class, Stream
import logging
class_bp = Blueprint('class', __name__)

TIMETABLE_CONFIG= TimetableConfig.TIMETABLE_CONSTANTS

@class_bp.route("/stream-config", methods=["GET"])
def get_stream_config():
    try:
        configs = list(current_app.db.stream_configs.find({}, {"_id": 0}))
        return jsonify({"configs": configs}), 200
    except Exception as e:
        logging.error(f"Error fetching stream configs: {str(e)}")
        return jsonify({"error": str(e)}), 500

@class_bp.route("/stream-config/<gradeLevel>", methods=["PUT"])
def update_stream_config(gradeLevel):
    try:
        data = request.json
        
        # Validate the input data
        if data.get("max_students_per_stream", 0) < data.get("max_students_per_class", 0):
            return jsonify({
                "error": "Maximum students per stream cannot be less than maximum students per class"
            }), 400

        # Update the configuration
        result = current_app.db.stream_configs.update_one(
            {"gradeLevel": gradeLevel},
            {"$set": {
                "max_students_per_stream": data.get("max_students_per_stream"),
                "max_students_per_class": data.get("max_students_per_class"),
                "max_core_subjects": data.get("max_core_subjects", 8),
                "max_practical_subjects": data.get("max_practical_subjects", 2),
                "current_enrolled_students": data.get("current_enrolled_students", 0),
                "last_updated": datetime.utcnow()
            }},
            upsert=True
        )

        return jsonify({"message": "Stream configuration updated successfully"}), 200
    except Exception as e:
        logging.error(f"Error updating stream config: {str(e)}")
        return jsonify({"error": str(e)}), 500
@class_bp.route('/<class_id>/schedule', methods=['POST'])
def schedule_class(class_id):
    try:
        success = ClassService.schedule_class(class_id)
        if success:
            return jsonify({'message': 'Class scheduled successfully'}), 200
        return jsonify({'error': 'Unable to schedule class'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    # app.py (additional endpoints)
@class_bp.route("/classes", methods=["GET"])
def get_classes():
    classes = list(current_app.db.classes.find())
    for class_ in classes:
        class_["_id"] = str(class_["_id"])
    return jsonify(classes)

@class_bp.route("/classes", methods=["POST"])
def create_class():
    try:
        data = request.json
        
        # Validate class size
        if not SchoolValidator.validate_class_size(data["gradeLevel"], data["student_count"]):
            return jsonify({"error": "Class size exceeds maximum limit"}), 400
            
        # Validate subject count
        if not SchoolValidator.validate_subject_count(data["gradeLevel"], data["subjects"]):
            return jsonify({"error": "Subject count exceeds maximum limit"}), 400
            
        class_data = {
            "name": data["name"],
            "gradeLevel": data["gradeLevel"],
            "specialty": data.get("specialty"),
            "student_count": data["student_count"],
            "subjects": data["subjects"],
            "practicals": data.get("practicals", [])
        }
        
        result = current_app.db.classes.insert_one(class_data)
        return jsonify({"id": str(result.inserted_id)}), 201
        
    except ValidationError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

@class_bp.route("/classes/<class_id>/timetable", methods=["GET"])
def get_class_timetable(class_id):
    try:
        class_data = current_app.db.classes.find_one({"_id": ObjectId(class_id)})
        if not class_data:
            return jsonify({"error": "Class not found"}), 404
            
        generator = TimetableService(TIMETABLE_CONFIG)
        timetable = generator.generate_class_timetable(class_data)
        
        # Store generated timetable
        current_app.db.timetables.update_one(
            {"class_id": class_id},
            {"$set": {"timetable": timetable}},
            upsert=True
        )
        
        return jsonify(timetable)
        
    except Exception as e:
        return jsonify({"error": "Error generating timetable"}), 500

@class_bp.route("/classes/<class_id>", methods=["PUT"])
def update_class(class_id):
    try:
        data = request.json
        
        # Validate updates
        if "student_count" in data and not SchoolValidator.validate_class_size(
            data["gradeLevel"], data["student_count"]
        ):
            return jsonify({"error": "Class size exceeds maximum limit"}), 400
            
        if "subjects" in data and not SchoolValidator.validate_subject_count(
            data["gradeLevel"], data["subjects"]
        ):
            return jsonify({"error": "Subject count exceeds maximum limit"}), 400
            
        result = current_app.db.classes.update_one(
            {"_id": ObjectId(class_id)},
            {"$set": data}
        )
        
        if result.modified_count == 0:
            return jsonify({"error": "Class not found"}), 404
            
        return jsonify({"message": "Class updated successfully"})
        
    except ValidationError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

@class_bp.route("/classes/<class_id>", methods=["DELETE"])
def delete_class(class_id):
    try:
        result = current_app.db.classes.delete_one({"_id": ObjectId(class_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Class not found"}), 404
            
        # Clean up related timetables
        current_app.db.timetables.delete_many({"class_id": class_id})
        
        return jsonify({"message": "Class deleted successfully"})
        
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500