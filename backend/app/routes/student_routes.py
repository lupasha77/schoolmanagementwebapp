# app/routes/student_routes.py
from flask import Blueprint, jsonify, request, current_app
from app.services.student_service import StudentService
from ..middleware.validation import validate_request
from ..models.school_class_model import Student, Subject 
from ..utils.db_utils import serialize_mongo_doc
from bson import ObjectId
from datetime import datetime
from app.models.school_class_model import GradeLevel, Specialty, Subject

student_bp = Blueprint('student', __name__)


@student_bp.route('/get-all-students', methods=['GET'])
def get_all_students():
    try:
        students = list(current_app.db.students.find())
        return jsonify({
            'students': [serialize_mongo_doc(student) for student in students],
            'total': len(students)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@student_bp.route('/get-students-by-grade/<grade_level>', methods=['GET'])
def get_students_by_grade(grade_level):
    try:
        students = list(current_app.db.students.find({'gradeLevel': grade_level}))
        return jsonify({
            'students': [serialize_mongo_doc(student) for student in students],
            'gradeLevel': grade_level,
            'total': len(students)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@student_bp.route('/get-student-counts-by-grade', methods=['GET'])
def get_student_counts_by_grade():
    try:
        # Use MongoDB aggregation to get student counts by grade level
        pipeline = [
            {'$group': {'_id': '$gradeLevel', 'count': {'$sum': 1}}},
            {'$sort': {'_id': 1}}
        ]
        
        result = list(current_app.db.students.aggregate(pipeline))
        
        # Format the response
        grade_counts = {doc['_id']: doc['count'] for doc in result if doc['_id']}
        
        return jsonify({
            'gradeCounts': grade_counts,
            'total': sum(grade_counts.values())
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# @student_bp.route('/<student_id >', methods=['PUT'])
# def update_student(student_id ):
#     try:
#         data = request.json
#         data['updated_at'] = datetime.utcnow()
        
#         result = current_app.db.students.update_one(
#             {'_id': ObjectId(student_id )},
#             {'$set': data}
#         )
        
#         if result.modified_count:
#             return jsonify({'message': 'Student  updated successfully'})
#         return jsonify({'message': 'No changes made'}), 304
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500


# @student_bp.route('/<student_id >', methods=['PUT'])
# @validate_request(['availability'])
# def update_availability(student_id ):
#     try:
#         data = request.json
#         StudentService.update_availability(student_id , data['availability'])
#         return jsonify({'message': 'Availability updated successfully'}), 200
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500
    
# @student_bp.route("/get-all-students-gradeLevel", methods=["GET"])
# def get_students():
#     students = list(current_app.db.students.find())
#     for student in students:
#         student ["_id"] = str(student ["_id"])
#     return jsonify(students)


# @student_bp.route("/api/students/<student_id >", methods=["GET"])
# def get_student(student_id ):
#     student = current_app.db.students.find_one({"_id": ObjectId(student_id )})
#     student ["_id"] = str(student ["_id"])
#     return jsonify(student )
# @student_bp.route("/create-student", methods=["POST"])
# def create_student():
#     data = request.json
#     student = Student (
#         name=data["name"],
#         employee_id=data["employee_id"],
#         subjects=data["subjects"],
#         grade_levels=[GradeLevel(gl) for gl in data["grade_levels"]],
#         specialties=[Specialty(s) for s in data["specialties"]] if data.get("specialties") else None
#     )
    
#     result = current_app.db.students.insert_one(student .to_dict())
#     return jsonify({"id": str(result.inserted_id)}), 201
