# backend/app/routes/stream_config_routes.py
from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
from bson.objectid import ObjectId
from ..models.school_class_model import StreamConfig, GradeLevel
import os
import sys 
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config.timetable_config import TimetableConfig
import logging
#initialize the logger
logger = logging.getLogger('stream_config_routes')
logger.setLevel(logging.INFO)

TIMETABLE_CONSTANTS = TimetableConfig.TIMETABLE_CONSTANTS

# Then access the DEFAULT_JUNIOR_MAX_STUDENTS_PER_STREAM value like this:
# TIMETABLE_CONSTANTS['DEFAULT_JUNIOR_MAX_STUDENTS_PER_STREAM']
 

stream_config_bp = Blueprint('stream_config', __name__, url_prefix='/api/stream-configs')

# Helper functions
def validate_gradeLevel(gradeLevel: str):
    try:
        GradeLevel(gradeLevel)
        return True
    except ValueError:
        return False

def mongo_to_dict(mongo_doc):
    """Convert MongoDB document to dictionary, handling ObjectId conversion"""
    if mongo_doc is None:
        return None
    
    result = dict(mongo_doc)
    if '_id' in result:
        result['_id'] = str(result['_id'])
    return result

@stream_config_bp.route('/get-all-stream-configs', methods=['GET'])
def get_all_stream_configs():
    """Get all stream configurations"""
    collection = current_app.db.stream_configs
    stream_configs = [mongo_to_dict(config) for config in collection.find()]
    return jsonify({"configs": stream_configs})

@stream_config_bp.route('/get-stream-config/<gradeLevel>', methods=['GET'])
def get_stream_config(gradeLevel):
    """Get stream configuration by grade level"""
    if not validate_gradeLevel(gradeLevel):
        valid_grades = [grade.value for grade in GradeLevel]
        return jsonify({"error": f"Invalid grade level. Valid options are: {valid_grades}"}), 400

    collection = current_app.db.stream_configs
    config = collection.find_one({"gradeLevel": gradeLevel})
    if not config:
        return jsonify({"error": f"Stream configuration for {gradeLevel} not found"}), 404
    
    return jsonify(mongo_to_dict(config))

@stream_config_bp.route('/create-stream-config', methods=['POST'])
def create_stream_config():
    """Create a new stream configuration"""
    config = request.json
    
    if not validate_gradeLevel(config.get("gradeLevel")):
        valid_grades = [grade.value for grade in GradeLevel]
        return jsonify({"error": f"Invalid grade level. Valid options are: {valid_grades}"}), 400
    
    collection = current_app.db.stream_configs
    
    # Check if config for this grade already exists
    existing = collection.find_one({"gradeLevel": config["gradeLevel"]})
    if existing:
        return jsonify({"error": f"Stream configuration for {config['gradeLevel']} already exists"}), 400
    
    calculated_classes = config.get("calculated_classes", 0)
    streams = [chr(65 + i) for i in range(calculated_classes)]  # Generate ["A", "B", "C", ...]

    try:
        stream_config = StreamConfig(
            gradeLevel=config["gradeLevel"],
            max_students_per_stream=config["max_students_per_stream"],
            max_students_per_class=config["max_students_per_class"],
            max_core_subjects=config.get("max_core_subjects", TIMETABLE_CONSTANTS['DEFAULT_MAX_CORE_SUBJECTS']),
            max_practical_subjects=config.get("max_practical_subjects", TIMETABLE_CONSTANTS['DEFAULT_MAX_PRACTICAL_SUBJECTS']),
            current_enrolled_students=config.get("current_enrolled_students", 0),
            calculated_classes=calculated_classes,
            streams=streams  # Include streams
        )

        
        # Convert to dict for MongoDB
        config_dict = stream_config.to_dict()
        
        result = collection.insert_one(config_dict)
        config_dict["_id"] = str(result.inserted_id)
        
        return jsonify(config_dict), 201
    except KeyError as e:
        return jsonify({"error": f"Missing required field: {str(e)}"}), 400

 

@stream_config_bp.route('/update-enrolled-students/<gradeLevel>/enrolled-students', methods=['PATCH'])
def update_enrolled_students(gradeLevel):
    """Update only the enrolled students count for a grade level"""
    if not validate_gradeLevel(gradeLevel):
        valid_grades = [grade.value for grade in GradeLevel]
        return jsonify({"error": f"Invalid grade level. Valid options are: {valid_grades}"}), 400
    
    data = request.json
    current_enrolled_students = data.get('current_enrolled_students')
    
    if current_enrolled_students is None:
        return jsonify({"error": "Missing required field: current_enrolled_students"}), 400
    
    if current_enrolled_students < 0:
        return jsonify({"error": "Enrolled students count cannot be negative"}), 400
    
    collection = current_app.db.stream_configs
    
    # Check if config exists
    existing = collection.find_one({"gradeLevel": gradeLevel})
    if not existing:
        return jsonify({"error": f"Stream configuration for {gradeLevel} not found"}), 404
    
    # Check if new count exceeds max per stream
    if current_enrolled_students > existing["max_students_per_stream"]:
        return jsonify({
            "error": f"Enrolled students count ({current_enrolled_students}) exceeds maximum allowed per stream ({existing['max_students_per_stream']})"
        }), 400
    
    result = collection.update_one(
        {"gradeLevel": gradeLevel},
        {"$set": {
            "current_enrolled_students": current_enrolled_students,
            "last_updated": datetime.utcnow()
        }}
    )
    
    if result.modified_count == 0:
        return jsonify({"error": "No changes made to configuration"}), 400
    
    updated = collection.find_one({"gradeLevel": gradeLevel})
    return jsonify(mongo_to_dict(updated))

@stream_config_bp.route('/delete-stream-config/<gradeLevel>', methods=['DELETE'])
def delete_stream_config(gradeLevel):
    """Delete a stream configuration"""
    if not validate_gradeLevel(gradeLevel):
        valid_grades = [grade.value for grade in GradeLevel]
        return jsonify({"error": f"Invalid grade level. Valid options are: {valid_grades}"}), 400
    
    collection = current_app.db.stream_configs
    
    # Check if config exists
    existing = collection.find_one({"gradeLevel": gradeLevel})
    if not existing:
        return jsonify({"error": f"Stream configuration for {gradeLevel} not found"}), 404
    
    result = collection.delete_one({"gradeLevel": gradeLevel})
    
    if result.deleted_count == 0:
        return jsonify({"error": "Failed to delete configuration"}), 400
    
    return jsonify({"message": f"Stream configuration for {gradeLevel} successfully deleted"})

# Update the update_stream_config route in stream_config_routes.py
@stream_config_bp.route('/update-stream-config/<gradeLevel>', methods=['PUT'])
def update_stream_config(gradeLevel):
    """Update an existing stream configuration"""
    if not validate_gradeLevel(gradeLevel):
        valid_grades = [grade.value for grade in GradeLevel]
        return jsonify({"error": f"Invalid grade level. Valid options are: {valid_grades}"}), 400
    
    updated_config = request.json
    collection = current_app.db.stream_configs
    
    # Check if config exists
    existing = collection.find_one({"gradeLevel": gradeLevel})
    if not existing:
        return jsonify({"error": f"Stream configuration for {gradeLevel} not found"}), 404
    
    total_students = max(existing.get('current_enrolled_students', 0), updated_config.get('expected_students_enrolment', 0))

    if total_students > 0:
        max_per_class = existing.get('max_students_per_class', 40)  # Default to 40 if missing
        updated_config['calculated_classes'] = max(1, (total_students + max_per_class - 1) // max_per_class)
    else:
        updated_config['calculated_classes'] = 1  # Default to at least 1 class


    
    # Ensure gradeLevel stays the same
    updated_config["gradeLevel"] = gradeLevel
    
    result = collection.update_one(
        {"gradeLevel": gradeLevel},
        {"$set": updated_config}
    )
    
    if result.modified_count == 0:
        return jsonify({"error": "No changes made to configuration"}), 400
    
    updated = collection.find_one({"gradeLevel": gradeLevel})
    return jsonify(mongo_to_dict(updated))

# Update the initialize_stream_configs function too
@stream_config_bp.route('/initialize-stream-configs/initialize', methods=['POST'])
def initialize_stream_configs():
    """Initialize default stream configurations for all grade levels while preserving enrollment"""
    db = current_app.db
    stream_collection = db.stream_configs
    students_collection = db.students
    
    # Get student enrollment count per grade level from students collection
    enrollment_counts = {
        doc['_id']: doc['count']
        for doc in students_collection.aggregate([
            {"$group": {"_id": "$gradeLevel", "count": {"$sum": 1}}}
        ])
    }
    
    # Get existing stream configurations to preserve calculated classes
    existing_configs = {
        config["gradeLevel"]: {
            "calculated_classes": config.get("calculated_classes", 0),
            "expected_students_enrolment": config.get("expected_students_enrolment", 0)
        }
        for config in stream_collection.find()
    }
    
    # Default configurations
    default_configs = []
    for grade in GradeLevel:
        max_per_class = (
            TIMETABLE_CONSTANTS['DEFAULT_JUNIOR_MAX_STUDENTS_PER_CLASS']
            if GradeLevel.is_junior(grade)
            else TIMETABLE_CONSTANTS['DEFAULT_SENIOR_MAX_STUDENTS_PER_CLASS']
        )
        
        max_per_stream = (
            TIMETABLE_CONSTANTS['DEFAULT_JUNIOR_MAX_STUDENTS_PER_STREAM']
            if GradeLevel.is_junior(grade)
            else TIMETABLE_CONSTANTS['DEFAULT_SENIOR_MAX_STUDENTS_PER_STREAM']
        )
        

        max_core = TIMETABLE_CONSTANTS.get('DEFAULT_MAX_CORE_SUBJECTS', 8)
        max_practical = TIMETABLE_CONSTANTS.get('DEFAULT_MAX_PRACTICAL_SUBJECTS', 2)
        
        # Get the current enrolled students from students collection
        current_enrolled = enrollment_counts.get(grade.value, 0) 
        # Get the expected students enrollment from existing configs
        expected_enrolment = existing_configs.get(grade.value, {}).get("expected_students_enrolment", 0) 
        
        # Use the maximum of `current_enrolled` or `expected_students_enrolment`
        total_students = max(current_enrolled, expected_enrolment)
        
        # Preserve or calculate the number of classes 
        calculated_classes = max(1, (total_students + max_per_class - 1) // max_per_class)
        if calculated_classes == 0 and max_per_class > 0 and total_students > 0: 
            calculated_classes = max(1, (total_students + max_per_class - 1) // max_per_class)
        
        # Generate streams dynamically
        streams = [chr(65 + i) for i in range(calculated_classes)]  # ["A", "B", "C", ...] 

        config = StreamConfig(
            gradeLevel=grade.value,
            max_students_per_stream=max_per_stream,
            max_students_per_class=max_per_class,
            max_core_subjects=max_core,
            max_practical_subjects=max_practical,
            expected_students_enrolment=expected_enrolment,
            current_enrolled_students=current_enrolled,
            calculated_classes=calculated_classes,
            streams=streams  # Add generated streams
        )
        default_configs.append(config.to_dict())
    
    # Upsert stream configurations
    inserted_count = 0
    updated_count = 0
    
    for config in default_configs:
        result = stream_collection.update_one(
            {"gradeLevel": config["gradeLevel"]},
            {"$set": config},
            upsert=True
        )
        if result.upserted_id:
            inserted_count += 1
        else:
            updated_count += result.modified_count
    
    return jsonify({
        "message": "Stream configurations initialized successfully",
        "inserted": inserted_count,
        "updated": updated_count,
        "configs": list(stream_collection.find({}, {"_id": 0}))  # Return updated configs
    }), 200
