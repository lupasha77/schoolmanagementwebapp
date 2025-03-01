# app/routes/staffs_routes.py
from flask import Blueprint, jsonify, request, current_app
from app.services.staff_service import StaffService 
from ..middleware.validation import validate_request
from ..models.schemas import Staff, Subject 
from ..utils.db_utils import serialize_mongo_doc
from bson import ObjectId
from datetime import datetime
from app.models.school_class_model import GradeLevel, Specialty, Subject
from app.services.timetable_service import TimetableService
from app.models.department_config import DEPARTMENT_CONFIG
from app.models.school_class_model import Department, Specialty

staff_bp = Blueprint('staff', __name__)

@staff_bp.route("/staffs", methods=["POST"])
def create_staffs():
    data = request.json
    staffs = Staff(
        name=data["name"],
        employee_id=data["employee_id"],
        subjects=data["subjects"],
        grade_levels=[GradeLevel(gl) for gl in data["grade_levels"]],
        specialties=[Specialty(s) for s in data["specialties"]] if data.get("specialties") else None
    )
    
    result = current_app.db.staffs.insert_one(staffs.to_dict())
    return jsonify({"id": str(result.inserted_id)}), 201

@staff_bp.route('/get-all-staffs', methods=['GET'])
def get_all_staffs():
    try:
        staffs = list(current_app.db.staffs.find())
        return jsonify([serialize_mongo_doc(staffs) for staffs in staffs])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@staff_bp.route('/update-staffs/<staffs_id>', methods=['PUT'])
def update_staffs(staffs_id):
    try:
        data = request.json
        data['updated_at'] = datetime.utcnow()
        
        result = current_app.db.staffs.update_one(
            {'_id': ObjectId(staffs_id)},
            {'$set': data}
        )
        
        if result.modified_count:
            return jsonify({'message': 'Staff updated successfully'})
        return jsonify({'message': 'No changes made'}), 304
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@staff_bp.route('/<staffs_id>', methods=['PUT'])
@validate_request(['availability'])
def update_availability(staffs_id):
    try:
        data = request.json
        StaffService.update_availability(staffs_id, data['availability'])
        return jsonify({'message': 'Availability updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@staff_bp.route("/staffs", methods=["GET"])
def get_staffs():
    staffs = list(current_app.db.staffs.find())
    for staffs in staffs:
        staffs["_id"] = str(staffs["_id"])
    return jsonify(staffs)


@staff_bp.route("/staffs/<staffs_id>", methods=["GET"])
def get_staff_by_id(staffs_id):
    staffs = current_app.db.staffs.find_one({"_id": ObjectId(staffs_id)})
    staffs["_id"] = str(staffs["_id"])
    return jsonify(staffs)

@staff_bp.route('/staffs/get-staff-stats', methods=['GET'])  # Updated route to match frontend
def get_staff_stats():
    try:
        # Get all staff members
        staffs = list(current_app.db.staffs.find())
        
        # Count teaching and non-teaching staff
        teaching_staff = sum(1 for staff in staffs if staff.get('roleArea') == 'teaching')
                        #    and 'TEACHING' in staff['specialties'])
        non_teaching_staff = len(staffs) - teaching_staff
        
        return jsonify({
            'teachingStaff': teaching_staff,
            'nonTeachingStaff': non_teaching_staff,
            'total': len(staffs)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@staff_bp.route('/staffs/get-staff-teaching', methods=['GET'])  # Updated route to match frontend
def get_staff_teaching():
    try:
        # Get all staff members
        staffs = list(current_app.db.staffs.find())
        
        # get teaching staff
        teaching_staff = [
            {**staff, '_id': str(staff['_id'])} 
            for staff in staffs if staff.get('roleArea') == 'teaching'
        ]
                         
        
        return jsonify({
            'teachingStaff': teaching_staff,
             
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@staff_bp.route('/staffs/get-department-stats', methods=['GET'])
def get_department_stats():
    try:
        # Get all staff members
        staffs = list(current_app.db.staffs.find())
        
        # Initialize stats using department config
        teaching_departments = {
            dept: {
                'name': dept,
                'count': 0,
                'specialty': config['specialty'],
                'subjects': config['subjects']
            }
            for dept, config in DEPARTMENT_CONFIG.items()
        }
        
        # Non-teaching departments from enum
        non_teaching_roles = {
            'ADMINISTRATION': 'Administration',
            'SUPPORT_STAFF': 'Support Staff',
            'FINANCE': 'Finance',
            'IT': 'IT Support',
            'MAINTENANCE': 'Maintenance',
            'LIBRARY': 'Library'
        }
        
        non_teaching_departments = {
            role: {'name': label, 'count': 0}
            for role, label in non_teaching_roles.items()
        }
        
        # Count staff by department
        for staff in staffs:
            if staff.get('roleArea') == 'teaching':
                department = staff.get('department')
                if department in teaching_departments:
                    teaching_departments[department]['count'] += 1
            else:
                role = staff.get('role', 'SUPPORT_STAFF')
                if role in non_teaching_departments:
                    non_teaching_departments[role]['count'] += 1
        
        # Format response
        response = {
            'teachingDepartments': [
                {
                    'name': dept_data['name'],
                    'count': dept_data['count'],
                    'specialty': dept_data['specialty'],
                    'subjects': dept_data['subjects']
                }
                for dept_data in teaching_departments.values()
                if dept_data['count'] > 0
            ],
            'nonTeachingDepartments': [
                {
                    'name': dept_data['name'],
                    'count': dept_data['count']
                }
                for dept_data in non_teaching_departments.values()
                if dept_data['count'] > 0
            ]
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@staff_bp.route('/staffs/teacher-workload', methods=['GET'])
def get_teacher_workload():
    """
    API endpoint to calculate and return teacher workload data
    Returns actual workload vs target workload for all teachers
    """
    try:
        # Initialize scheduler instance with the database connection
        scheduler = TimetableService(current_app.db)
        
        # Get the academic year and term from request or use defaults
        academic_year = request.args.get('academicYear', '2023-2024')
        term = request.args.get('term', '1')
        
        # Get all teacher assignments from the database
        assignments = list(current_app.db.timetables.find({
            'academicYear': academic_year,
            'term': term
        }))
        
        # Get all teachers
        teachers = list(current_app.db.staffs.find({'roleArea': 'teaching'}))
        
        # Process the data using the class method
        workload_data = StaffService.calculate_workload_stats(scheduler, assignments, teachers)
        
        return jsonify({
            'success': True,
            'data': workload_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in get_teacher_workload: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
     