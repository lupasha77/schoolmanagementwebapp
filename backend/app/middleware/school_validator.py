# validation.py
from datetime import datetime, time
from typing import List, Dict, Any
import re

class ValidationError(Exception):
    pass

class SchoolValidator:
    @staticmethod
    def validate_class_size(grade_level: str, student_count: int) -> bool:
        max_students = 40 if grade_level == "1-4" else 20
        return student_count <= max_students

    @staticmethod
    def validate_subject_count(grade_level: str, subjects: List[str]) -> bool:
        max_subjects = 9 if grade_level == "1-4" else 4
        return len(subjects) <= max_subjects

    @staticmethod
    def validate_teacher_availability(teacher_schedule: Dict[str, List[str]], 
                                    proposed_slots: List[str]) -> bool:
        return not any(slot in teacher_schedule.get(day, []) 
                      for day, slot in proposed_slots)

    @staticmethod
    def validate_time_format(time_str: str) -> bool:
        return bool(re.match(r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$', time_str))