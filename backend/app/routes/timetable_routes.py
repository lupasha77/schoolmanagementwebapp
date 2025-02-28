# app/routes/timetable_routes.py
import random
from flask import Blueprint, jsonify, request
from ..services.timetable_service import TimetableService
from ..models.schemas import TimeSlot 
from flask import Blueprint, jsonify, request, current_app
from ..utils.db_utils import serialize_mongo_doc
from datetime import datetime, timedelta
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config.timetable_config import TimetableConfig 
import logging
from bson import ObjectId  # Add this import at the top
from flask import Blueprint, request, jsonify
# from flask_jwt_extended import jwt_required
from services.timetable_service import TimetableService
from services.timeslots_service import PeriodService

 

# Initialize logger
logger = logging.getLogger(__name__)

timetable_bp = Blueprint('timetable', __name__)
def get_timetable_service():
    """Get an instance of TimetableService with the database."""
    return TimetableService(current_app.db)
def get_period_service():
    """Get an instance of TimetableService with the database."""
    return PeriodService(current_app.db)
@timetable_bp.route('/initialize', methods=['POST'])
def initialize_timetable():
    try:
        # Clear existing time slots
        current_app.db.time_slots.delete_many({})
        
        slots = []
        for day in current_app.config['WEEK_DAYS']:
            current_time = datetime.strptime(current_app.config['START_TIME_MORNING'], "%H:%M")
            
            # Morning session
            for i in range(current_app.config['SLOTS_PER_DAY'] // 2):
                end_time = current_time + timedelta(minutes=current_app.config['LESSON_DURATION'])
                
                # Add break after 4th lesson
                if i == 3:
                    break_end = current_time + timedelta(minutes=15)
                    slots.append({
                        'day': day,
                        'start_time': current_time.strftime("%H:%M"),
                        'end_time': break_end.strftime("%H:%M"),
                        'is_break': True,
                        'created_at': datetime.utcnow()
                    })
                    current_time = break_end
                
                slots.append({
                    'day': day,
                    'start_time': current_time.strftime("%H:%M"),
                    'end_time': end_time.strftime("%H:%M"),
                    'is_break': False,
                    'created_at': datetime.utcnow()
                })
                current_time = end_time
            
            # Lunch break
            lunch_end = current_time + timedelta(minutes=60)
            slots.append({
                'day': day,
                'start_time': current_time.strftime("%H:%M"),
                'end_time': lunch_end.strftime("%H:%M"),
                'is_break': True,
                'created_at': datetime.utcnow()
            })
            current_time = lunch_end
            
            # Afternoon session
            for i in range(current_app.config['SLOTS_PER_DAY'] // 2):
                end_time = current_time + timedelta(minutes=current_app.config['LESSON_DURATION'])
                slots.append({
                    'day': day,
                    'start_time': current_time.strftime("%H:%M"),
                    'end_time': end_time.strftime("%H:%M"),
                    'is_break': False,
                    'created_at': datetime.utcnow()
                })
                current_time = end_time
        
        # Insert all slots
        current_app.db.time_slots.insert_many(slots)
        
        return jsonify({'message': 'Timetable initialized successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@timetable_bp.route('/slots', methods=['GET'])
def get_time_slots():
    try:
        slots = list(current_app.db.time_slots.find())
        return jsonify([serialize_mongo_doc(slot) for slot in slots])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

  
  
@timetable_bp.route('/school', methods=['GET'])
def get_school_timetable():
    try:
        result = TimetableService.get_school_timetable(current_app.db)
        return jsonify(result)
    except Exception as e:
        current_app.logger.error(f"Failed to fetch school timetable: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

# @timetable_bp.route('/teacher/<teacher_id>', methods=['GET'])
# def get_teacher_timetable(teacher_id):
#     """Return the teacher's timetable with formatted periods, days, and workload statistics."""
#     try:
#         # Get the target workload from the request or the config
#         config = TimetableConfig.get_config()
#         default_target = config.get('TARGET_LESSONS_PER_WEEK', 24)
#         target_lessons = int(request.args.get('target', default_target))
        
#         # Initialize services
#         # timetable_service = TimetableService(db=current_app.db)
#         teacher_service = TimetableService(db=current_app.db)
        
#         # Get teacher data
#         teacher = teacher_service.get_teacher_by_id(teacher_id)
#         # logger.info(f'Teacher in routehandler, {teacher}')
        
#         if not teacher:
#             return jsonify({
#                 'success': False,
#                 'message': f'Teacher not found: {teacher_id}'
#             }), 404
        
#         # Generate teacher schedule
#         teacher_schedule = teacher_service.generate_teacher_schedule(teacher)
#         logger.info(f'{teacher_schedule}')
        
#         # Calculate workload metrics
#         total_lessons = sum(len(lessons) for lessons in teacher_schedule.values())
        
#         # Calculate utilization
#         utilization = round((total_lessons / target_lessons) * 100, 1) if target_lessons > 0 else 0
        
#         # Determine status
#         status = 'optimal'
#         if utilization < 80:
#             status = 'underloaded'
#         elif utilization > 110:
#             status = 'overloaded'
        
#         # Count lessons by subject and grade level
#         lessons_by_subject = {}
#         lessons_by_grade = {}
        
#         for day, lessons in teacher_schedule.items():
#             for lesson in lessons:
#                 subject = lesson.get('subject', 'Unknown')
#                 grade_level = lesson.get('gradeLevel', 'Unknown')
                
#                 # Count by subject
#                 if subject not in lessons_by_subject:
#                     lessons_by_subject[subject] = 0
#                 lessons_by_subject[subject] += 1
                
#                 # Count by grade level
#                 if grade_level not in lessons_by_grade:
#                     lessons_by_grade[grade_level] = 0
#                 lessons_by_grade[grade_level] += 1
        
#         # Format and return response with workload stats
#         response = teacher_service.format_teacher_response(teacher, teacher_schedule)
        
#         # Add workload stats to the response
#         response['workload_stats'] = {
#             'teacherId': teacher_id,
#             'teacherName': f"{teacher.get('firstName', '')} {teacher.get('lastName', '')}",
#             'subjects': teacher.get('subjects', []),
#             'targetWorkload': target_lessons,
#             'actualWorkload': total_lessons,
#             'utilizationPercentage': utilization,
#             'status': status,
#             'lessonsBySubject': lessons_by_subject,
#             'lessonsByGrade': lessons_by_grade,
#             'lessonsByDay': {day: len(lessons) for day, lessons in teacher_schedule.items()}
#         }
        
#         return jsonify(response)
        
#     except ValueError as e:
#         return jsonify({
#             'success': False,
#             'message': 'Invalid target workload value'
#         }), 400
        
#     except Exception as e:
#         current_app.logger.error(f"Failed to fetch teacher timetable: {str(e)}")
#         return jsonify({
#             'success': False,
#             'message': str(e)
#         }), 500   
# Route handler for teacher timetable
@timetable_bp.route('/teacher/<teacher_id>', methods=['GET'])
def get_teacher_timetable(teacher_id):
    """Return the teacher's timetable with formatted periods, days, and workload statistics."""
    try:
        # Get the target workload from the request or the config
        config = current_app.db.configurations.find_one({"type": "timetable_config"})
        default_target = config.get('TARGET_LESSONS_PER_WEEK', 24) if config else 24
        target_lessons = int(request.args.get('target', default_target))
        
        # Initialize services
        teacher_service = TimetableService(db=current_app.db)
        
        # Get teacher data
        teacher = teacher_service.get_teacher_by_id(teacher_id)
        
        if not teacher:
            return jsonify({
                'success': False,
                'message': f'Teacher not found: {teacher_id}'
            }), 404
        
        # Generate teacher schedule
        teacher_schedule = teacher_service.generate_teacher_schedule(teacher)
        
        # Calculate workload statistics
        workload_stats = teacher_service.calculate_workload_statistics(
            teacher, 
            teacher_schedule, 
            target_lessons
        )
        
        # Format and return response
        response = teacher_service.format_teacher_response(
            teacher, 
            teacher_schedule, 
            workload_stats
        )
        
        return jsonify(response)
    
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': 'Invalid target workload value'
        }), 400
    
    except Exception as e:
        current_app.logger.error(f"Failed to fetch teacher timetable: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@timetable_bp.route('/teacher/workload', methods=['GET']) 
def get_all_teachers_workload():
    """Return the workload status for all teaching staff compared to their target workload."""
    try:
        # Get the target workload from the request
        target_lessons = request.args.get('target')
        if target_lessons:
            target_lessons = int(target_lessons)
        
        # Initialize the timetable service with config and db
        timetable_service = TimetableService(db=current_app.db)
        
        # Get workload data for all teachers
        result = timetable_service.get_all_teacher_workloads(target_lessons)
        
        if not result['success']:
            return jsonify(result), 500
            
        return jsonify(result)
        
    except ValueError as e:
        # Return an error if the target workload could not be converted to an int
        return jsonify({
            'success': False,
            'message': 'Invalid target workload value'
        }), 400
        
    except Exception as e:
        # Log and return any other error
        current_app.logger.error(f"Failed to calculate teacher workloads: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@timetable_bp.route('/teacher/workload/<staff_id>', methods=['GET'])
def get_teacher_workload(staff_id):
    """Return the workload status for a specific teaching staff member compared to the target workload."""
    try:
        current_app.logger.info(f'Fetching workload for staff ID: {staff_id}')
        
        # Ensure staff_id is a valid ObjectId
        if not ObjectId.is_valid(staff_id):
            return jsonify({
                'success': False,
                'message': f"'{staff_id}' is not a valid ObjectId"
            }), 400

        # Convert to ObjectId
        staff_id_obj = ObjectId(staff_id)
        
        # Get the target workload from the request or the config
        config = TimetableConfig.get_config()
        default_target = config.get('TARGET_LESSONS_PER_WEEK', 24)
        target_lessons = int(request.args.get('target', default_target))
        
        # Initialize the timetable service
        timetable_service = TimetableService(db=current_app.db)
        
        # Get staff details, ensuring they are teaching staff
        staff = current_app.db.staffs.find_one({
            '_id': staff_id_obj,
            'roleArea': 'teaching'
        })
        
        if not staff:
            return jsonify({
                'success': False,
                'message': f"Teaching staff with ID '{staff_id}' not found"
            }), 404
            
        # Calculate workload
        workload = timetable_service.calculate_teacher_workload(staff_id_obj)
        
        # Get staff details
        staff_name = f"{staff.get('firstName', '')} {staff.get('lastName', '')}".strip() or 'Unknown'
        # Get subjects based on  staff ID
        subjects = staff.get('subjects', [])
        
        # Calculate utilization
        actual_workload = workload.get('actualWorkload', 0)
        utilization = round((actual_workload / target_lessons) * 100, 1) if target_lessons > 0 else 0
        
        # Determine status
        status = 'optimal'
        if utilization < 80:
            status = 'underloaded'
        elif utilization > 110:
            status = 'overloaded'
        
        return jsonify({
            'success': True,
            'data': [{
                'teacherId': staff_id,
                'teacherName': staff_name,
                'subjects': subjects,
                'targetWorkload': target_lessons,
                'actualWorkload': actual_workload,
                'utilizationPercentage': utilization,
                'status': status
            }]
        })
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': 'Invalid target workload value'
        }), 400
        
    except Exception as e:
        current_app.logger.error(f"Failed to calculate teacher workload: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@timetable_bp.route('/save', methods=['POST'])
# @jwt_required()
def save_timetable():
    """Save a generated timetable to the database"""
    timetable_data = request.json
    if not timetable_data:
        return jsonify({
            'success': False,
            'message': 'No timetable data provided'
        }), 400
    timetable_service = get_timetable_service()
    result = timetable_service.save_timetable(timetable_data)
    return jsonify(result)


@timetable_bp.route('/', methods=['GET'])
def get_timetables():
    """Get all saved timetables with optional filtering"""
    # Extract filter parameters from query string
    filters = {}
    if request.args.get('gradeLevel'):
        filters['gradeLevel'] = request.args.get('gradeLevel')
    if request.args.get('academicYear'):
        filters['academicYear'] = request.args.get('academicYear')
    if request.args.get('term'):
        filters['term'] = request.args.get('term')
    if request.args.get('status'):
        filters['status'] = request.args.get('status')
    
    timetable_service = get_timetable_service()
    result = timetable_service.get_saved_timetables(filters)
    return jsonify(result)

@timetable_bp.route('/<timetable_id>', methods=['GET'])
def get_timetable(timetable_id):
    """Get a specific timetable by ID"""
    timetable_service = get_timetable_service()
    result = timetable_service.get_timetable_by_id(timetable_id)
    return jsonify(result)

@timetable_bp.route('/generate/<grade_level>', methods=['POST'])
def generate_timetable(grade_level):
    """Generate a new timetable for a grade level"""
    timetable_service = get_timetable_service()
    result = timetable_service.generate_stream_timetable(grade_level)
    return jsonify(result)

@timetable_bp.route('/<timetable_id>', methods=['PUT'])
def update_timetable(timetable_id):
    """Update an existing timetable"""
    data = request.json
    timetable_service = get_timetable_service()
    
    # Add validation for required fields
    if not data:
        return jsonify({
            'success': False,
            'message': 'No data provided for update'
        })
    
    result = timetable_service.update_timetable(timetable_id, data)
    return jsonify(result)

@timetable_bp.route('/<timetable_id>/status/<status>', methods=['PATCH'])
def update_timetable_status(timetable_id, status):
    """Update the status of a timetable (draft, active, archived)"""
    if status not in ['draft', 'active', 'archived']:
        return jsonify({
            'success': False,
            'message': 'Invalid status. Must be one of: draft, active, archived'
        })
    
    timetable_service = get_timetable_service()
    result = timetable_service.update_timetable_status(timetable_id, status)
    return jsonify(result)
# Register the blueprint in your app.py or main file
# app.register_blueprint(timetable_bp)