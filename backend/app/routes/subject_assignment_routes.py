from flask import Flask, request, jsonify, Blueprint, current_app
from flask_cors import CORS
from bson.objectid import ObjectId
import logging
import sys
import os
import datetime

# Import GradeLevel from the config file
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config.timetable_config import GradeLevel

# Initialize the logger
logger = logging.getLogger('subject_assign_bp')
logger.setLevel(logging.INFO)

# Create Blueprint
subject_assign_bp = Blueprint("subject_assign", __name__)

# Create a helper function to convert ObjectIds to strings
def convert_objectids(obj):
    if isinstance(obj, dict):
        for key in obj:
            if isinstance(obj[key], ObjectId):
                obj[key] = str(obj[key])
            elif isinstance(obj[key], dict) or isinstance(obj[key], list):
                obj[key] = convert_objectids(obj[key])
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            if isinstance(item, ObjectId):
                obj[i] = str(item)
            elif isinstance(item, dict) or isinstance(item, list):
                obj[i] = convert_objectids(item)
    return obj

# Get subject details from IDs
def get_subject_details(subject_ids, subjects_collection):
    """
    Get detailed information for an array of subject IDs
    """
    # Convert string IDs to ObjectIds
    object_ids = [ObjectId(id) if isinstance(id, str) else id for id in subject_ids if id]
    
    # Fetch subjects
    subjects = list(subjects_collection.find({'_id': {'$in': object_ids}}))
    
    # Format for return
    return [
        {
            '_id': str(subj['_id']),
            'name': subj.get('name', ''),
            'code': subj.get('code', ''),
            'department': subj.get('department', '')
        } for subj in subjects
    ]

# Route to get subjects
@subject_assign_bp.route('/subjects', methods=['GET'])
def get_subjects():
    grade_level = request.args.get('gradeLevel')
    subject_type = request.args.get('type')  # 'core', 'practical', or None for all
    
    logger.info(f'Getting subjects for grade level {grade_level}, type {subject_type}')
    
    # Validate grade_level if provided
    if grade_level and not any(grade.value == grade_level for grade in GradeLevel):
        return jsonify({'error': f'Invalid grade level: {grade_level}'}), 400
    
    # Access database within the request context
    subjects_collection = current_app.db["subjects"]
    
    query = {}
    if grade_level:
        query['gradeLevel'] = grade_level
    
    # Filter by subject type if specified
    if subject_type == 'core':
        query['isCore'] = True
    elif subject_type == 'practical':
        query['isPractical'] = True
    
    subjects = list(subjects_collection.find(query))

    # Convert ObjectId to string for JSON serialization
    for subject in subjects:
        subject['_id'] = str(subject['_id'])
    
    return jsonify(subjects)

# Route to get streams configuration
@subject_assign_bp.route('/streams-config', methods=['GET'])
def get_stream_configs():
    grade_level = request.args.get('gradeLevel')
    
    # Validate grade_level if provided
    if grade_level and not any(grade.value == grade_level for grade in GradeLevel):
        return jsonify({'error': f'Invalid grade level: {grade_level}'}), 400
    
    # Access database within the request context
    stream_configs_collection = current_app.db["stream_configs"]

    query = {}
    if grade_level:
        query['gradeLevel'] = grade_level
    else:
        # Use default config if no specific grade level requested
        query = {"_id": ObjectId('67ba2a51b4935d6a470f1d01')}
    
    stream_configs = list(stream_configs_collection.find(query))

    # Convert ObjectId to string for JSON serialization
    for config in stream_configs:
        config['_id'] = str(config['_id'])
    
    return jsonify(stream_configs)

# Route to get classes based on streams config
@subject_assign_bp.route('/classes', methods=['GET'])
def get_classes():
    grade_level = request.args.get('gradeLevel')
    
    # Validate grade_level if provided
    if grade_level and not any(grade.value == grade_level for grade in GradeLevel):
        return jsonify({'error': f'Invalid grade level: {grade_level}'}), 400
    
    # Access database within the request context
    stream_configs_collection = current_app.db["stream_configs"]

    query = {}
    if grade_level:
        query['gradeLevel'] = grade_level
    
    # Get streams configuration
    stream_configs = stream_configs_collection.find_one(query)
    
    if not stream_configs:
        return jsonify([])
    
    # Prepare the response with class information
    classes = []
    for stream_name in stream_configs.get('streams', []):
        class_info = {
            '_id': str(stream_configs['_id']),
            'gradeLevel': stream_configs.get('gradeLevel'),
            'stream': stream_name,
            'max_students_per_class': stream_configs.get('max_students_per_class'),
            'max_core_subjects': stream_configs.get('max_core_subjects'),
            'max_practical_subjects': stream_configs.get('max_practical_subjects')
        }
        classes.append(class_info)
    
    return jsonify(classes)

# Route to get subject assignments
@subject_assign_bp.route('/subject-assignments', methods=['GET'])
def get_subject_assignments():
    grade_level = request.args.get('gradeLevel')
    stream = request.args.get('stream')
    
    logger.info(f"Getting subject assignments for grade level {grade_level}")

    # Validate grade_level if provided
    if grade_level and not any(grade.value == grade_level for grade in GradeLevel):
        return jsonify({'error': f'Invalid grade level: {grade_level}'}), 400

    # Access database within the request context
    subject_class_assignment_collection = current_app.db["subject_class_assignment"]
    subjects_collection = current_app.db["subjects"]

    query = {}
    if grade_level:
        query['gradeLevel'] = grade_level
    if stream:
        query['stream'] = stream
    
    assignments = list(subject_class_assignment_collection.find(query))

    # Get streams config to determine max subjects
    stream_configs_collection = current_app.db["stream_configs"]
    stream_configs = stream_configs_collection.find_one({
        'gradeLevel': grade_level
    }) or {}
    
    max_core_subjects = stream_configs.get('max_core_subjects', 8)
    max_practical_subjects = stream_configs.get('max_practical_subjects', 2)
    max_elective_subjects = stream_configs.get('max_elective_subjects', 0)

    # If no assignments exist or stream-specific assignments are missing, generate default ones based on subjects
    existing_streams = {assignment['stream'] for assignment in assignments}
    available_streams = stream_configs.get('streams', ['A'])
    
    # Check if there are missing streams that need default assignments
    missing_streams = [s for s in available_streams if s not in existing_streams]
    
    if missing_streams:
        # Get all subjects for this grade level
        all_subjects = list(subjects_collection.find({'gradeLevel': grade_level}))
        
        # Separate core, practical and elective subjects
        core_subjects = [subj for subj in all_subjects if subj.get('isCore', False)][:max_core_subjects]
        practical_subjects = [subj for subj in all_subjects if subj.get('isPractical', False)][:max_practical_subjects]
        elective_subjects = [subj for subj in all_subjects if not subj.get('isCore', False) and not subj.get('isPractical', False)][:max_elective_subjects]
        
        for stream_name in missing_streams:
            # Only generate for requested stream if specified
            if stream and stream_name != stream:
                continue
                
            # Generate class name based on grade level and stream
            class_name = f"{grade_level} {stream_name}"
            
            # Create a new assignment
            new_assignment = {
                'gradeLevel': grade_level,
                'stream': stream_name,
                'className': class_name,
                'coreSubjects': [subj['_id'] for subj in core_subjects],
                'practicalSubjects': [subj['_id'] for subj in practical_subjects],
                'electiveSubjects': [subj['_id'] for subj in elective_subjects],
                'lastUpdated': datetime.datetime.utcnow()
            }
            
            # For response only - don't save to DB yet
            new_assignment['_id'] = 'temp_' + stream_name  # Temporary ID
            
            # Add subjects details with name and code
            new_assignment['coreSubjectsDetails'] = [
                {
                    '_id': str(subj['_id']),
                    'name': subj.get('name', ''),
                    'code': subj.get('code', ''),
                    'department': subj.get('department', '')
                } for subj in core_subjects
            ]
            new_assignment['practicalSubjectsDetails'] = [
                {
                    '_id': str(subj['_id']),
                    'name': subj.get('name', ''),
                    'code': subj.get('code', ''),
                    'department': subj.get('department', '')
                } for subj in practical_subjects
            ]
            new_assignment['electiveSubjectsDetails'] = [
                {
                    '_id': str(subj['_id']),
                    'name': subj.get('name', ''),
                    'code': subj.get('code', ''),
                    'department': subj.get('department', '')
                } for subj in elective_subjects
            ]
            
            assignments.append(new_assignment)
    
    # Enhance existing assignments with subject details
    for assignment in assignments:
        # Convert ObjectIds to strings
        assignment['_id'] = str(assignment['_id'])
        
        # If subject details are missing or need to be refreshed
        if 'coreSubjectsDetails' not in assignment or 'practicalSubjectsDetails' not in assignment or 'electiveSubjectsDetails' not in assignment:
            # Get core subjects details
            core_subject_ids = []
            if 'coreSubjects' in assignment:
                core_subject_ids = [ObjectId(s) if isinstance(s, str) else s for s in assignment['coreSubjects']]
            
            # Get practical subjects details
            practical_subject_ids = []
            if 'practicalSubjects' in assignment:
                practical_subject_ids = [ObjectId(s) if isinstance(s, str) else s for s in assignment['practicalSubjects']]
            
            # Get elective subjects details
            elective_subject_ids = []
            if 'electiveSubjects' in assignment:
                elective_subject_ids = [ObjectId(s) if isinstance(s, str) else s for s in assignment['electiveSubjects']]
            
            # Fetch subject details
            if core_subject_ids:
                core_subjects_details = list(subjects_collection.find({'_id': {'$in': core_subject_ids}}))
                assignment['coreSubjectsDetails'] = [
                    {
                        '_id': str(subj['_id']),
                        'name': subj.get('name', ''),
                        'code': subj.get('code', ''),
                        'department': subj.get('department', '')
                    } for subj in core_subjects_details
                ]
            else:
                assignment['coreSubjectsDetails'] = []
            
            if practical_subject_ids:
                practical_subjects_details = list(subjects_collection.find({'_id': {'$in': practical_subject_ids}}))
                assignment['practicalSubjectsDetails'] = [
                    {
                        '_id': str(subj['_id']),
                        'name': subj.get('name', ''),
                        'code': subj.get('code', ''),
                        'department': subj.get('department', '')
                    } for subj in practical_subjects_details
                ]
            else:
                assignment['practicalSubjectsDetails'] = []
            
            if elective_subject_ids:
                elective_subjects_details = list(subjects_collection.find({'_id': {'$in': elective_subject_ids}}))
                assignment['electiveSubjectsDetails'] = [
                    {
                        '_id': str(subj['_id']),
                        'name': subj.get('name', ''),
                        'code': subj.get('code', ''),
                        'department': subj.get('department', '')
                    } for subj in elective_subjects_details
                ]
            else:
                assignment['electiveSubjectsDetails'] = []
    
    # Convert all ObjectIds to strings before returning
    assignments = convert_objectids(assignments)
    return jsonify(assignments)

# Route to generate subject assignments
@subject_assign_bp.route('/generate-assignments', methods=['POST'])
def generate_assignments():
    data = request.get_json()
    grade_level = data.get('gradeLevel')
    stream = data.get('stream')  # Optional - generate for specific stream only
    
    logger.info(f"Generating subject assignments for grade level {grade_level}, stream {stream}")
    
    # Validate grade_level
    if not grade_level or not any(grade.value == grade_level for grade in GradeLevel):
        return jsonify({'error': f'Invalid or missing grade level: {grade_level}'}), 400
    
    # Access database within the request context
    stream_configs_collection = current_app.db["stream_configs"]
    subjects_collection = current_app.db["subjects"]
    subject_class_assignment_collection = current_app.db["subject_class_assignment"]
    
    # Get streams configuration
    stream_configs = stream_configs_collection.find_one({
        'gradeLevel': grade_level
    })
    
    if not stream_configs:
        return jsonify({'error': f'No streams configuration found for grade level {grade_level}'}), 404
    
    # Get subjects for the grade level
    core_subjects = list(subjects_collection.find({
        'gradeLevel': grade_level,
        'isCore': True
    }))
    
    practical_subjects = list(subjects_collection.find({
        'gradeLevel': grade_level,
        'isPractical': True
    }))
    
    elective_subjects = list(subjects_collection.find({
        'gradeLevel': grade_level,
        'isCore': False,
        'isPractical': False
    }))
    
    if not core_subjects:
        return jsonify({'error': f'No core subjects found for grade level {grade_level}'}), 404
    
    # Generate assignments for each stream (or just the specified stream)
    assignments = []
    available_streams = stream_configs.get('streams', [])
    
    # Filter by stream if specified
    if stream:
        available_streams = [s for s in available_streams if s == stream]
    
    for stream_name in available_streams:
        # Generate class name
        class_name = f"{grade_level} {stream_name}"
        
        # Create assignment for this stream
        assignment = {
            'gradeLevel': grade_level,
            'stream': stream_name,
            'className': class_name,
            'coreSubjects': [subject['_id'] for subject in core_subjects[:stream_configs.get('max_core_subjects', 8)]],
            'practicalSubjects': [subject['_id'] for subject in practical_subjects[:stream_configs.get('max_practical_subjects', 2)]],
            'electiveSubjects': [subject['_id'] for subject in elective_subjects[:stream_configs.get('max_elective_subjects', 0)]],
            'lastUpdated': datetime.datetime.utcnow()
        }
        
        # Prepare subject details 
        assignment['coreSubjectsDetails'] = [
            {
                '_id': str(subject['_id']),
                'name': subject.get('name', ''),
                'code': subject.get('code', ''),
                'department': subject.get('department', '')
            } for subject in core_subjects[:stream_configs.get('max_core_subjects', 8)]
        ]
        
        assignment['practicalSubjectsDetails'] = [
            {
                '_id': str(subject['_id']),
                'name': subject.get('name', ''),
                'code': subject.get('code', ''),
                'department': subject.get('department', '')
            } for subject in practical_subjects[:stream_configs.get('max_practical_subjects', 2)]
        ]
        
        assignment['electiveSubjectsDetails'] = [
            {
                '_id': str(subject['_id']),
                'name': subject.get('name', ''),
                'code': subject.get('code', ''),
                'department': subject.get('department', '')
            } for subject in elective_subjects[:stream_configs.get('max_elective_subjects', 0)]
        ]
        
        # Insert or update the assignment
        result = subject_class_assignment_collection.update_one(
            {'gradeLevel': grade_level, 'stream': stream_name},
            {'$set': assignment},
            upsert=True
        )
        
        # Add ID to response
        if result.upserted_id:
            assignment['_id'] = str(result.upserted_id)
        else:
            existing = subject_class_assignment_collection.find_one({'gradeLevel': grade_level, 'stream': stream_name})
            if existing:
                assignment['_id'] = str(existing['_id'])
        
        assignments.append(assignment)
    
    # Convert all ObjectIds to strings before returning
    assignments = convert_objectids(assignments)
    
    return jsonify(assignments)

# Route to update subject assignments
@subject_assign_bp.route('/subject-assignments', methods=['POST'])
def update_subject_assignments():
    data = request.get_json()
    grade_level = data.get('gradeLevel')
    stream = data.get('stream')
    core_subjects = data.get('coreSubjects', [])
    practical_subjects = data.get('practicalSubjects', [])
    elective_subjects = data.get('electiveSubjects', [])
    
    logger.info(f"Updating subject assignments for grade level {grade_level}, stream {stream}")
    
    # Validate required fields
    if not grade_level or not stream:
        return jsonify({'error': 'Grade level and stream are required'}), 400
    
    # Access database within the request context
    subject_class_assignment_collection = current_app.db["subject_class_assignment"]
    subjects_collection = current_app.db["subjects"]
    
    # Generate class name
    class_name = f"{grade_level} {stream}"
    
    # Convert string IDs to ObjectIds
    core_subject_ids = [ObjectId(id) for id in core_subjects if id]
    practical_subject_ids = [ObjectId(id) for id in practical_subjects if id]
    elective_subject_ids = [ObjectId(id) for id in elective_subjects if id]
    
    # Get subject details for storage
    core_subjects_details = get_subject_details(core_subjects, subjects_collection)
    practical_subjects_details = get_subject_details(practical_subjects, subjects_collection)
    elective_subjects_details = get_subject_details(elective_subjects, subjects_collection)
    
    # Create or update assignment
    assignment = {
        'gradeLevel': grade_level,
        'stream': stream,
        'className': class_name,
        'coreSubjects': core_subject_ids,
        'practicalSubjects': practical_subject_ids,
        'coreSubjectsDetails': core_subjects_details,
        'practicalSubjectsDetails': practical_subjects_details,
        'electiveSubjects': elective_subject_ids,
        'electiveSubjectsDetails': elective_subjects_details,
        'lastUpdated': datetime.datetime.utcnow()
    }
    
    result = subject_class_assignment_collection.update_one(
        {'gradeLevel': grade_level, 'stream': stream},
        {'$set': assignment},
        upsert=True
    )
    
    # Create response
    response = {
        'success': True,
        'message': 'Subject assignments updated successfully',
        'updated': result.modified_count > 0,
        'inserted': result.upserted_id is not None,
        'assignment': convert_objectids(assignment)
    }
    
    return jsonify(response)

# Route to update subject assignment by ID
@subject_assign_bp.route('/subject-assignments/<string:id>', methods=['PUT'])
def update_subject_assignment_by_id(id):
    data = request.get_json()
    
    # Check if this is a temporary ID (starts with 'temp_')
    if id.startswith('temp_'):
        # This is a temporary ID, so we need to create a new assignment
        stream = id.replace('temp_', '')
        grade_level = data.get('gradeLevel')
        
        # Update the data with stream info and forward to the update function
        new_data = {**data, 'stream': stream}
        request._cached_json = (new_data, request._cached_json[1]) if hasattr(request, '_cached_json') else new_data
        
        return update_subject_assignments()
    
    # Regular ID - update existing record
    subject_class_assignment_collection = current_app.db["subject_class_assignment"]
    subjects_collection = current_app.db["subjects"]
    
    # Try to convert ID to ObjectId
    try:
        obj_id = ObjectId(id)
    except:
        return jsonify({'error': f'Invalid ID format: {id}'}), 400
    
    # Get the existing assignment
    existing = subject_class_assignment_collection.find_one({'_id': obj_id})
    if not existing:
        return jsonify({'error': f'Assignment not found with ID: {id}'}), 404
    
    # Update only the fields provided
    update_data = {}
    
    if 'coreSubjects' in data:
        core_subject_ids = [ObjectId(s) if isinstance(s, str) else s for s in data['coreSubjects']]
        update_data['coreSubjects'] = core_subject_ids
        # Get and store subject details
        update_data['coreSubjectsDetails'] = get_subject_details(data['coreSubjects'], subjects_collection)
    
    if 'practicalSubjects' in data:
        practical_subject_ids = [ObjectId(s) if isinstance(s, str) else s for s in data['practicalSubjects']]
        update_data['practicalSubjects'] = practical_subject_ids
        # Get and store subject details
        update_data['practicalSubjectsDetails'] = get_subject_details(data['practicalSubjects'], subjects_collection)
    
    if 'electiveSubjects' in data:
        elective_subject_ids = [ObjectId(s) if isinstance(s, str) else s for s in data['electiveSubjects']]
        update_data['electiveSubjects'] = elective_subject_ids
        # Get and store subject details
        update_data['electiveSubjectsDetails'] = get_subject_details(data['electiveSubjects'], subjects_collection)
    
    update_data['lastUpdated'] = datetime.datetime.utcnow()
    
    # Update the assignment
    result = subject_class_assignment_collection.update_one(
        {'_id': obj_id},
        {'$set': update_data}
    )
    
    # Create response
    response = {
        'success': True,
        'message': 'Subject assignment updated successfully',
        'updated': result.modified_count > 0
    }
    
    # Include updated subject details in response
    if 'coreSubjectsDetails' in update_data:
        response['coreSubjectsDetails'] = update_data['coreSubjectsDetails']
    
    if 'practicalSubjectsDetails' in update_data:
        response['practicalSubjectsDetails'] = update_data['practicalSubjectsDetails']
    
    if 'electiveSubjectsDetails' in update_data:
        response['electiveSubjectsDetails'] = update_data['electiveSubjectsDetails']
    
    return jsonify(response)

# Route to delete subject assignment
@subject_assign_bp.route('/subject-assignments/<string:id>', methods=['DELETE'])
def delete_subject_assignment(id):
    # Check if this is a temporary ID
    if id.startswith('temp_'):
        # This is a temporary ID, we don't need to delete anything
        return jsonify({'success': True, 'message': 'Temporary assignment removed'})
    
    # Try to convert ID to ObjectId
    try:
        obj_id = ObjectId(id)
    except:
        return jsonify({'error': f'Invalid ID format: {id}'}), 400
    
    # Delete the assignment
    subject_class_assignment_collection = current_app.db["subject_class_assignment"]
    result = subject_class_assignment_collection.delete_one({'_id': obj_id})
    
    if result.deleted_count == 0:
        return jsonify({'error': f'Assignment not found with ID: {id}'}), 404
    
    return jsonify({'success': True, 'message': 'Subject assignment deleted successfully'})