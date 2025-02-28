from flask import Blueprint,jsonify, request, current_app
from backend.app.models.school_class_model import Department, GradeLevel, Specialty, Subject, SubjectNames
import logging

# Set up logging if not already configured
logging.basicConfig(level=logging.DEBUG)
subjects_bp = Blueprint("subjects", __name__)

def __init__(self, db):
        self.db = db


@subjects_bp.route('/get-subject-names', methods=['GET'])
def get_subject_names():
    return jsonify({"subjects": SubjectNames.list_subjects()})
@subjects_bp.route('/get-department-name', methods=['GET'])
def get_department_name():
    return jsonify({"department": Department.list_departments()})
@subjects_bp.route('/get-subject-data', methods=['GET'])
def get_subject_data():
    try:
        # Get all subjects from the database
        subjects = list(current_app.db.subjects.find({}))
        
        # Convert ObjectId to string for JSON serialization
        for subject in subjects:
            if '_id' in subject:
                subject['_id'] = str(subject['_id'])
        
        # Get other enum values
        departments = [dept.value for dept in Department]
        gradeLevels = [grade.value for grade in GradeLevel]
        
        return jsonify({
            "departments": departments,
            "gradeLevels": gradeLevels,
            "subjects": subjects  # Now includes full subject data including isCore and isPractical
        }), 200
    except Exception as e:
        logging.error(f"Error in get_subject_data: {str(e)}")
        return jsonify({"error": str(e)}), 500

@subjects_bp.route("/add-subject", methods=["POST"])
def create_subject():
    data = request.json
    
    try:
        # Validate department
        if not data.get("department"):
            return jsonify({"error": "Department is required"}), 400

        # Validate grade level
        valid_grades = {"Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"}
        gradeLevel = data.get("gradeLevel")
        if gradeLevel not in valid_grades:
            return jsonify({"error": "Invalid grade level"}), 400

        # Handle specialty for senior forms
        specialty = None
        if gradeLevel in {"Form 5", "Form 6"}:
            if "specialty" not in data:
                return jsonify({"error": "Specialty is required for Form 5 and Form 6"}), 400
            specialty = Specialty(data["specialty"])
        elif "specialty" in data:
            return jsonify({"error": "Specialty is only allowed for Form 5 and Form 6"}), 400

        # Check for existing subject
        existing_subject = current_app.db.subjects.find_one({"code": data["code"]})
        if existing_subject:
            return jsonify({"error": "Subject with this code already exists"}), 409

        # Create subject with core/practical flags
        subject = Subject(
            name=data["name"],
            code=data["code"],
            department=data["department"],
            gradeLevel=gradeLevel,
            specialty=specialty,
            isCore=data.get("isCore", False),  # Default to False if not specified
            isPractical=data.get("isPractical", False),  # Default to False if not specified
            practical_duration=data.get("practical_duration", 0)
        )

        # Insert into database
        result = current_app.db.subjects.insert_one(subject.to_dict())
        logging.debug(f"Subject created with ID: {result.inserted_id}")
        
        return jsonify({
            "id": str(result.inserted_id),
            "message": "Subject created successfully"
        }), 201

    except ValueError as e:
        logging.error(f"Error in create_subject: {str(e)}")
        return jsonify({"error": f"Invalid value: {str(e)}"}), 400
    except Exception as e:
        logging.error(f"Unexpected error in create_subject: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500