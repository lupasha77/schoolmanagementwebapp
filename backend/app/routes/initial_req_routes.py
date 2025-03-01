#routes/initial_req_routes.py
 
from flask_pymongo import PyMongo
from bson import ObjectId
from flask import Blueprint, jsonify, request, current_app
from app.services.staff_service import StaffService
from ..middleware.validation import validate_request
from ..models.schemas import Staff, Subject 
from ..utils.db_utils import serialize_mongo_doc
from bson import ObjectId
from datetime import datetime
from app.models.school_class_model import GradeLevel
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config.timetable_config import TimetableConfig
TIMETABLE_CONFIG = TimetableConfig.TIMETABLE_CONSTANTS
 
 
 
initial_req_bp = Blueprint('initial_req', __name__)

# Ensure we properly map the incoming value
gradeLevel_map = {gl.value: gl.name for gl in GradeLevel}  # Maps "Form 1" -> "FORM_1"

@initial_req_bp.route("/calculate-requirements", methods=["POST"])
def calculate_requirements():
    data = request.json
    gradeLevel_str = data.get("gradeLevel")

    print(f"Received grade level: {gradeLevel_str}")  # Debugging

    if gradeLevel_str not in gradeLevel_map:
        return jsonify({"error": f"Invalid or missing gradeLevel: {gradeLevel_str}"}), 400

    gradeLevel = GradeLevel[gradeLevel_map[gradeLevel_str]]  # Convert string to Enum key

    total_students = data.get("totalStudents")
    if not total_students or total_students <= 0:
        return jsonify({"error": "Total students must be a positive integer"}), 400

    # Determine if grade level is junior or senior
    if GradeLevel.is_junior(gradeLevel):
        max_students = TIMETABLE_CONFIG["max_students_junior"]
        max_classes = TIMETABLE_CONFIG["max_classes_junior"]
        max_subjects = TIMETABLE_CONFIG["max_subjects_junior"]
    else:
        max_students = TIMETABLE_CONFIG["max_students_senior"]
        max_classes = TIMETABLE_CONFIG["max_classes_senior"]
        max_subjects = TIMETABLE_CONFIG["max_subjects_senior"]

    required_classes = -(-total_students // max_students)  # Ceiling division

    if required_classes > max_classes:
        return jsonify({
            "error": f"Required classes ({required_classes}) exceed maximum allowed ({max_classes})"
        }), 400

    return jsonify({
        "required_classes": required_classes,
        "students_per_class": min(max_students, -(-total_students // required_classes)),
        "max_subjects": max_subjects
    })

     