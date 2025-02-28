# //app/services/timetable_service.py
from copy import deepcopy
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
from bson import ObjectId
import random
from flask import current_app
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.app.services.timeslots_service import PeriodService
from config.timetable_config import TimetableConfig, GradeLevel, Department, SubjectNames 
import logging
from typing import Dict, List
from services.timetable_service import TimetableService
# Initialize logger
logger = logging.getLogger(__name__)
  
 
class TimetableGeneratorService:
    def __init__(self, db):
        self.db = db
        self.config = TimetableConfig.get_config()
        self.slots = self._generate_time_slots()
        self._load_academic_settings()
        self._cache_db_data()
        self.period_service = PeriodService(db)
    
    def get_timetable_service():
        """Get an instance of TimetableService with the database."""
        return TimetableService(current_app.db)
    def _cache_db_data(self):
        """Cache necessary database queries"""
        # Cache subjects with grade level mapping
        self.subjects_by_grade = defaultdict(list)
        subjects = self.db.subjects.find()
        for subject in subjects:
            self.subjects_by_grade[subject['gradeLevel']].append({
                'code': subject['code'],
                'name': subject['name'],
                'isPractical': subject.get('isPractical', False),
                'isCore': subject.get('isCore', False)
            })

        # Cache teacher data
        self.teachers = {}
        teachers = self.db.staffs.find({'roleArea': 'teaching'})
        for teacher in teachers:
            teacher_id = str(teacher['_id'])
            self.teachers[teacher_id] = {
                'name': f"{teacher.get('firstName', '')} {teacher.get('lastName', '')}",
                'subjects': teacher.get('subjects', []),
                'gradeLevels': teacher.get('gradeLevels', []),
                'maxWorkload': self.calculate_max_teacher_workload(teacher)
            }

    def get_teacher_by_id(self, teacher_id):
                """Find teacher in staffs collection and convert ObjectId to string"""
                teacher = self.db.staffs.find_one({
                    '_id': ObjectId(teacher_id),
                    'roleArea': 'teaching'
                })
                
                if teacher:
                    teacher['_id'] = str(teacher['_id'])
                
                return teacher
    
    def get_subject_name_from_code(self, subject_code):
            """Get subject name from code"""
            subject = self.db.subjects.find_one({"code": subject_code})
            return subject.get('name') if subject else subject_code
 
    
    def generate_stream_timetable(self, gradeLevel: str) -> Dict:
        """
        Generate timetable for all streams in a grade level with special scheduling requirements:
        1. Practical subjects: 6 slots/week (4 as block, 2 as single slots), class splits into 2
        2. Math & Science: 6 slots/week as double slots
        3. Other subjects: min 4 slots/week with at least one double slot
        
        Args:
            gradeLevel: Grade level to generate timetable for
            
        Returns:
            Dictionary with timetable data
        """
        try:
            # Load configuration constants from MongoDB
            config_constants = self._load_configuration_constants()
            
            # Validate input
            if not gradeLevel or gradeLevel == 'null':
                raise ValueError("Invalid grade level provided")
                
            # Get stream configuration for the grade level
            stream_config = self.db.stream_configs.find_one({'gradeLevel': gradeLevel})
            if not stream_config:
                raise ValueError(f"No stream configuration found for grade level: {gradeLevel}")
            
            # Get streams from the configuration
            streams = stream_config.get('streams', [])
            if not streams:
                raise ValueError(f"No streams configured for grade level: {gradeLevel}")
            
            # Get period configurations
            periods_data = self.get_period_configurations()
            
            # Process periods data
            lesson_periods = self._extract_lesson_periods(periods_data)
            all_periods = self._extract_all_periods(periods_data)
            
            # Initialize teacher pool with specialization and department constraints
            teacher_pool = self._initialize_teacher_pool(gradeLevel)
            
            # Create subject to teacher mapping for quick lookup
            subject_teachers = self._create_subject_teacher_mapping(teacher_pool)
            
            # Initialize result dictionary
            result = {}
            
            # Process each stream
            for stream in streams:
                class_name = f"{gradeLevel} {stream}"
                
                # Get the subject assignments for this class
                class_subjects = self._get_class_subject_assignments(gradeLevel, stream, class_name)
                if not class_subjects:
                    continue
                    
                # Initialize the class schedule with all periods marked as unassigned
                class_schedule = self._initialize_empty_schedule(config_constants['WEEK_DAYS'], all_periods)
                
                # 1. Schedule practical subjects first (respecting constraints)
                class_schedule = self._schedule_practical_subjects(
                    class_subjects, 
                    class_schedule, 
                    teacher_pool, 
                    subject_teachers, 
                    gradeLevel, 
                    stream,
                    config_constants
                )
                
                # 2. Schedule Mathematics & Science department subjects
                class_schedule = self._schedule_math_science_subjects(
                    class_subjects, 
                    class_schedule, 
                    teacher_pool, 
                    subject_teachers,
                    config_constants
                )
                
                # 3. Schedule remaining subjects
                class_schedule = self._schedule_other_subjects(
                    class_subjects, 
                    class_schedule, 
                    teacher_pool, 
                    subject_teachers,
                    config_constants
                )
                
                # 4. Optimize teacher workload
                class_schedule = self._balance_teacher_workload(
                    class_schedule,
                    teacher_pool,
                    config_constants['MAX_TEACHER_WORKLOAD']
                )
                
                result[class_name] = class_schedule

            return {
                'success': True,
                'data': {gradeLevel: result},
                'timetable_data': self._prepare_timetable_for_storage(gradeLevel, result)
            }

        except ValueError as ve:
            current_app.logger.error(f"Validation error in generate_stream_timetable: {str(ve)}")
            return {
                'success': False,
                'message': f"Validation error: {str(ve)}"
            }
        except Exception as e:
            current_app.logger.error(f"Failed to generate stream timetable: {str(e)}", exc_info=True)
            return {
                'success': False,
                'message': f"Failed to generate stream timetable: {str(e)}"
            }

    def _load_configuration_constants(self) -> Dict:
        """
        Load configuration constants from MongoDB configurations collection
        
        Returns:
            Dictionary with configuration constants
        """
        # Fetch configuration from MongoDB
        config = self.db.configurations.find_one({'type': 'timetable'})
        if not config:
            # Default configuration if not found
            return {
                'WEEK_DAYS': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                'MAX_TEACHER_WORKLOAD': 30,  # Maximum periods per week
                'PRACTICAL_BLOCK_SIZE': 4,   # Size of practical block
                'MATH_SCIENCE_DOUBLE_PERIODS': True,  # Schedule math/science as double periods
                'MIN_PERIODS_PER_SUBJECT': 4,  # Minimum periods per subject per week
                'MAX_CONSECUTIVE_PERIODS': 2  # Maximum consecutive periods for a teacher
            }
        return config.get('constants', {})

    def _extract_lesson_periods(self, periods_data: Dict) -> List[Dict]:
        """Extract and sort only lesson periods from period configuration"""
        lesson_periods = []
        for period_id, data in sorted(periods_data.items(), key=lambda x: int(x[0])):
            if data.get('type') == 'lesson':
                lesson_periods.append({
                    'id': period_id,
                    'start': data.get('start'),
                    'end': data.get('end'),
                    'name': data.get('name', f'Period {period_id}')
                })
        return lesson_periods

    def _extract_all_periods(self, periods_data: Dict) -> List[Dict]:
        """Extract and sort all periods from period configuration"""
        all_periods = []
        for period_id, data in sorted(periods_data.items(), key=lambda x: int(x[0])):
            all_periods.append({
                'id': period_id,
                'type': data.get('type'),
                'start': data.get('start'),
                'end': data.get('end'),
                'name': data.get('name', f'Period {period_id}')
            })
        return all_periods

    def _initialize_teacher_pool(self, gradeLevel: str) -> Dict:
        """Initialize teacher pool with specialization and department constraints"""
        teacher_query = {
            'roleArea': 'teaching',
            'gradeLevels': gradeLevel
        }
        
        teachers = list(self.db.staffs.find(teacher_query))
        if not teachers:
            raise ValueError(f"No teachers found for grade level: {gradeLevel}")
            
        teacher_pool = {}
        for teacher in teachers:
            if not isinstance(teacher, dict):
                continue
                
            teacher_id = str(teacher.get('_id'))
            if not teacher_id:
                continue
                
            teacher_pool[teacher_id] = {
                'id': teacher_id,
                'name': f"{teacher.get('firstName', '')} {teacher.get('lastName', '')}",
                'subjects': teacher.get('subjects', []),  # Subjects they are qualified to teach
                'department': teacher.get('department', ''),
                'specialty': teacher.get('specialty', []),  # Added specialty field
                'current_load': defaultdict(int),  # Track per-day load
                'total_load': 0  # Track total weekly load
            }
        
        if not teacher_pool:
            raise ValueError("No valid teachers found")
        
        return teacher_pool

    def _create_subject_teacher_mapping(self, teacher_pool: Dict) -> Dict:
        """Create mapping of subjects to qualified teachers"""
        subject_teachers = defaultdict(list)
        for teacher_id, data in teacher_pool.items():
            for subject in data['subjects']:
                subject_teachers[subject].append({
                    'id': teacher_id,
                    'department': data['department'],
                    'specialty': data.get('specialty', [])
                })
        return subject_teachers

    def _get_class_subject_assignments(self, gradeLevel: str, stream: str, class_name: str) -> List:
        """Get subject assignments for a specific class"""
        # Get the subject assignments from subject_class_assignment collection
        class_subject_assignment = self.db.subject_class_assignment.find_one({
            'gradeLevel': gradeLevel,
            'stream': stream,
            'className': class_name
        })
        
        if not class_subject_assignment:
            current_app.logger.warning(f"No subject assignments found for class: {class_name}")
            return None
            
        # Extract subject details from the assignment
        all_subjects = []
        
        # Add core subjects
        if 'coreSubjectsDetails' in class_subject_assignment:
            all_subjects.extend(class_subject_assignment['coreSubjectsDetails'])
        
        # Add practical subjects
        if 'practicalSubjectsDetails' in class_subject_assignment:
            all_subjects.extend(class_subject_assignment['practicalSubjectsDetails'])
        
        # Add elective subjects
        if 'electiveSubjectsDetails' in class_subject_assignment:
            all_subjects.extend(class_subject_assignment['electiveSubjectsDetails'])
        
        # Check if we have any subjects to work with
        if not all_subjects:
            current_app.logger.warning(f"No subjects found for class: {class_name}")
            return None
        
        return all_subjects

    def _initialize_empty_schedule(self, week_days: List[str], all_periods: List[Dict]) -> Dict:
        """Initialize empty class schedule for the week"""
        class_schedule = {day: [] for day in week_days}
        
        # Generate initial empty timetable for each day
        for day in week_days:
            # Create a schedule for this day with all periods
            daily_schedule = []
            
            # Process each period in order
            for period in all_periods:
                period_id = period['id']
                period_type = period['type']
                
                if period_type != 'lesson':
                    # For non-lesson periods (breaks, registration, etc.)
                    daily_schedule.append({
                        'period_id': period_id,
                        'start': period['start'],
                        'end': period['end'],
                        'type': period_type,
                        'name': period.get('name', period_type.capitalize())
                    })
                else:
                    # For lesson periods, initialize as unassigned
                    daily_schedule.append({
                        'period_id': period_id,
                        'start': period['start'],
                        'end': period['end'],
                        'type': 'lesson',
                        'subject': 'Unassigned',
                        'teacher': 'Unassigned'
                    })
            
            class_schedule[day] = daily_schedule
        
        return class_schedule

    def _balance_teacher_workload(self, class_schedule: Dict, teacher_pool: Dict, max_load: int) -> Dict:
        """
        Balance teacher workload to ensure no teacher is overloaded
        This is a placeholder for the implementation
        """
        # Implementation will come later
        return class_schedule