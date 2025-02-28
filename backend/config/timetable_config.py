# app/config/timetable_config.py
from enum import Enum
from typing import Dict, List

class GradeLevel(Enum):
    FORM_1 = "Form 1"
    FORM_2 = "Form 2"
    FORM_3 = "Form 3"
    FORM_4 = "Form 4"
    LOWER_SIXTH = "Form 5 || Lower Sixth"
    UPPER_SIXTH = "Form 6 || Upper Sixth"
     
    
    @staticmethod
    def is_junior(grade):
        return grade in [GradeLevel.FORM_1, GradeLevel.FORM_2, GradeLevel.FORM_3, GradeLevel.FORM_4]

class Department(Enum):
    MATHEMATICS = "mathematics"
    ENGLISH = "english"
    SCIENCE = "science"
    HUMANITIES = "humanities"

class SubjectNames(Enum):
    MATHEMATICS = "Mathematics"
    ENGLISH = "English"
    SCIENCE = "Science"
    PHYSICS = "Physics"
    CHEMISTRY = "Chemistry"
    BIOLOGY = "Biology"
    HISTORY = "History"
    GEOGRAPHY = "Geography"

class Specialty(Enum):
    MATH_TEACHER = "math_teacher"
    SCIENCE_TEACHER = "science_teacher"
    LANGUAGE_TEACHER = "language_teacher"
    HUMANITIES_TEACHER = "humanities_teacher"

class TimetableConfig:
    """
    Static configuration values that don't change and aren't stored in the database
    """
    @staticmethod
    def get_config() -> Dict:
        return {
            # Time-related constants
            'WEEK_DAYS': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            'SLOTS_PER_DAY': 10,
            'START_TIME_MORNING': '07:00',
            'LESSON_DURATION': 35,
            'BREAKS': {4: 15, 8: 60},  # Break after 4th period (15 mins) and lunch after 6th (60 mins)
            'PRACTICAL_PERIODS': [7,8, 9, 10],
            
            # Teacher workload constraints
            'MAX_TEACHER_WORKLOAD': 25,
            'MIN_TEACHER_WORKLOAD': 15,
            'TARGET_LESSONS_PER_WEEK': 24,
            
            # Teacher scheduling constraints
            'TEACHER_CONSTRAINTS': {
                'MIN_REST_BETWEEN_CLASSES': 1,
                'MAX_DAILY_PERIODS': 6,
                'MAX_CONSECUTIVE_PERIODS': 3,
                'PREP_TIME_COMPLEX_SUBJECTS': 2
            },
            
            # Subject scheduling constraints
            'SUBJECT_CONSTRAINTS': {
                'MIN_PERIODS_PER_WEEK': 4,
                'MAX_PERIODS_PER_WEEK': 6,
                'MAX_CONSECUTIVE_PERIODS': 2
            },
            
            # Stream and class size defaults
            'DEFAULT_JUNIOR_MAX_STUDENTS_PER_STREAM': 200,
            'DEFAULT_SENIOR_MAX_STUDENTS_PER_STREAM': 160,
            'DEFAULT_JUNIOR_MAX_STUDENTS_PER_CLASS': 40,
            'DEFAULT_SENIOR_MAX_STUDENTS_PER_CLASS': 40,
            'DEFAULT_MAX_CORE_SUBJECTS': 8,
            'DEFAULT_MAX_PRACTICAL_SUBJECTS': 2,
            
            "PRACTICAL_PERIODS": {
                "Form 1": [7, 8, 9, 10],  # Example: Form 1 practicals in periods 6-9 once a week
                "Form 2": [2, 3, 4, 5],  # Different periods for Form 2
                "Form 3": [7, 8,9 ,10],
                "Form 4": [2, 3, 4, 5],
            },
            "SCIENCE_PERIODS": {
                "Form 1": [(2, 3), (7, 8)],  # Science spans two consecutive periods
                "Form 2": [(4, 5), (9, 10)],
                "Form 3": [(2, 3), (7, 8)],
                "Form 4": [(4, 5), (9, 10)],
            },
            "STREAM_CONFIG": {
                "Form 1": {
                    "streams": ["A", "B", "C", "D", "E"],
                    "max_students": 200,
                    "max_students_per_class": 40,
                    "max_core_subjects": 8,
                    "max_practical_subjects": 2
                },
                "Form 2": {
                    "streams": ["A", "B", "C", "D", "E"],
                    "max_students": 200,
                    "max_students_per_class": 40,
                    "max_core_subjects": 8,
                    "max_practical_subjects": 2
                },
                "Form 3": {
                    "streams": ["A", "B", "C", "D", "E"],
                    "max_students": 200,
                    "max_students_per_class": 40,
                    "max_core_subjects": 8,
                    "max_practical_subjects": 2
                },
                "Form 4": {
                    "streams": ["A", "B", "C", "D", "E"],
                    "max_students": 200,
                    "max_students_per_class": 40,
                    "max_core_subjects": 8,
                    "max_practical_subjects": 2
                },
                "Form 5 || lower_sixth": {
                    "streams": ["A", "B", "C", "D"],
                    "max_students": 160,
                    "max_students_per_class": 40,
                    "max_core_subjects": 8,
                    "max_practical_subjects": 2
                },
                "Form 6 || upper_sixth": {
                    "streams": ["A", "B", "C", "D"],
                    "max_students": 160,
                    "max_students_per_class": 40,
                    "max_core_subjects": 8,
                    "max_practical_subjects": 2
                }
            }
        }
    
    TIMETABLE_CONSTANTS = get_config()

    
    