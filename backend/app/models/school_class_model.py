# backend/app/models/school_class_model.py
from datetime import datetime, time
from typing import List, Optional
from enum import Enum
from bson import ObjectId
from enum import Enum 
from typing import Optional

class GradeLevel(Enum):
    FORM_1 = "Form 1"
    FORM_2 = "Form 2"
    FORM_3 = "Form 3"
    FORM_4 = "Form 4"
    UPPER_SIXTH = "Upper Sixth"
    LOWER_SIXTH = "Lower Sixth"
 
    
    @classmethod
    def is_junior(cls, gradeLevel):
        """Determine if a grade level is junior (Form 1-4) or senior (Form 5-6)"""
        junior_forms = [cls.FORM_1, cls.FORM_2, cls.FORM_3, cls.FORM_4]
        return gradeLevel in junior_forms
     
class SubjectNames(Enum):
    MATHEMATICS = "Mathematics"
    ENGLISH_LANGUAGE = "English Language"
    GENERAL_SCIENCE = "General Science"
    PHYSICS = "Physics"
    CHEMISTRY = "Chemistry"
    BIOLOGY = "Biology"
    GEOGRAPHY = "Geography"
    HISTORY = "History"
    ACCOUNTING = "Accounting"
    ECONOMICS = "Economics"
    BUSINESS_STUDIES = "Business Studies"
    COMPUTER_SCIENCE = "Computer Science"
    AGRICULTURE = "Agriculture"
    ART_AND_DESIGN = "Art and Design"
    MUSIC = "Music"
    PHYSICAL_EDUCATION = "Physical Education"
    RELIGIOUS_STUDIES = "Religious Studies"
    SHONA = "Shona"
    FRENCH = "French"

    @classmethod
    def list_subjects(cls):
        return [subject.value for subject in cls]

class Department(Enum):
    ARTS = "arts"
    SCIENCES = "sciences"
    COMMERCIAL = "commercial"
    HUMANITIES = "humanities"
    MATHEMATICS = "mathematics"
    LINGUISTICS = "linguistics"
    GEOGRAPHY = "geography"
    SOCIAL_SCIENCES= "social sciences"
    PRACTICALS = "practicals"
    COMPUTERS="ICT"
    @classmethod
    def list_departments(cls):
        return [department.value for department in cls]

class Specialty(Enum):
    ARTS = "arts"
    SCIENCES = "sciences"
    COMMERCIAL = "commercial"
    HUMANITIES = "humanities"

class TimeSlot:
    def __init__(self, start_time: time, end_time: time, day: str, 
                 is_break: bool = False, is_assembly: bool = False):
        self.start_time = start_time
        self.end_time = end_time
        self.day = day
        self.is_break = is_break
        self.is_assembly = is_assembly

    def to_dict(self):
        return {
            "start_time": self.start_time.strftime("%H:%M"),
            "end_time": self.end_time.strftime("%H:%M"),
            "day": self.day,
            "is_break": self.is_break,
            "is_assembly": self.is_assembly
        }

class Subject:
    def __init__(self, name: str, code: str, department: Department, gradeLevel: GradeLevel,
                 specialty: Optional[Specialty] = None,isCore: bool = False,
                isPractical: bool = False,
                 practical_duration: int = 0):
        self.name = name
        self.code = code
        self.department = department
        self.gradeLevel = gradeLevel
        self.specialty = specialty
        self.isPractical = isPractical
        self.isCore = isCore
        self.practical_duration = practical_duration


    def to_dict(self):
        return {
            "name": self.name,
            "code": self.code,
            "department": self.department,  # Convert Enum to string
            "gradeLevel": self.gradeLevel,
            "specialty": self.specialty.value if self.specialty else None,  # Convert Enum to string
            "isCore": self.isCore,
            "isPractical": self.isPractical,
            "practical_duration": self.practical_duration
        }

class Teacher:
    def __init__(self, name: str, employee_id: str, subjects: List[str],
                 gradeLevels: List[GradeLevel],
                 specialties: Optional[List[Specialty]] = None):
        self.name = name
        self.employee_id = employee_id
        self.subjects = subjects
        self.gradeLevels = gradeLevels
        self.specialties = specialties

    def to_dict(self):
        return {
            "name": self.name,
            "employee_id": self.employee_id,
            "subjects": self.subjects,
            "gradeLevels": [gl.value for gl in self.gradeLevels],
            "specialties": [s.value for s in self.specialties] if self.specialties else None
        }
class Student:
    def __init__(self, firstName: str, lastName: str, studentId: str, user_email: str, subjects: List[str],
                 gradeLevels: List[GradeLevel],phoneNumber:str,address:str,
                 specialties: Optional[List[Specialty]] = None):
        self.firstName = firstName
        self.lastName = lastName
        self.user_email = user_email
        self.studentId = studentId
        self.phoneNumber = phoneNumber
        self.address = address
        self.subjects = subjects
        self.gradeLevels = gradeLevels
        self.specialties = specialties
         
         

    def to_dict(self):
        return {
            "firstName": self.firstName,
            "lastName": self.lastName,
            "user_email": self.user_email,
            "studentId": self.studentId,
            "phoneNumber": self.phoneNumber,
            "address": self.address, 
            "subjects": self.subjects,
            "gradeLevels": [gl.value for gl in self.gradeLevels],
            "specialties": [s.value for s in self.specialties] if self.specialties else None
        }
 



class StreamConfig:
    def __init__(self, gradeLevel, max_students_per_stream, max_students_per_class,
                max_core_subjects=8, max_practical_subjects=2,
                current_enrolled_students=0, expected_students_enrolment=0,streams=None, calculated_classes=None):
        self.gradeLevel = gradeLevel
        self.max_students_per_stream = max_students_per_stream
        self.max_students_per_class = max_students_per_class
        self.max_core_subjects = max_core_subjects
        self.max_practical_subjects = max_practical_subjects
        self.current_enrolled_students = current_enrolled_students
        self.expected_students_enrolment=expected_students_enrolment
        self.calculated_classes = calculated_classes or self._calculate_classes()
        self.streams = streams
        self.last_updated = datetime.utcnow()
    
    def _calculate_classes(self):
        """Default calculation for number of classes"""
        if self.max_students_per_class <= 0:
            return 0
        return max(1, (self.current_enrolled_students + self.max_students_per_class - 1) // self.max_students_per_class)
    
    def to_dict(self):
        return {
            "gradeLevel": self.gradeLevel,
            "max_students_per_stream": self.max_students_per_stream,
            "max_students_per_class": self.max_students_per_class,
            "max_core_subjects": self.max_core_subjects,
            "max_practical_subjects": self.max_practical_subjects,
            "current_enrolled_students": self.current_enrolled_students,
            "expected_students_enrolment": self.expected_students_enrolment,
            "calculated_classes": self.calculated_classes,
            "streams": self.streams,
            "last_updated": self.last_updated
        }
    
    # Add this to school_class_model.py

class NonTeachingRole(Enum):
    ADMINISTRATION = "Administration"
    FINANCE = "Finance"
    SUPPORT = "Support"
    MANAGEMENT = "Management"
    SPORTS = "Sports"
    LIBRARY = "Library"

class NonTeachingPosition(Enum):
    # Administration roles
    ADMINISTRATION_OFFICER = ("Administration Officer", NonTeachingRole.ADMINISTRATION)
    CLERK = ("Clerk", NonTeachingRole.ADMINISTRATION)
    RECEPTIONIST = ("Receptionist", NonTeachingRole.ADMINISTRATION)
    
    # Finance roles
    BURSAR = ("Bursar", NonTeachingRole.FINANCE)
    ACCOUNTS_CLERK = ("Accounts Clerk", NonTeachingRole.FINANCE)
    
    # Support staff
    GROUNDSMAN = ("Groundsman", NonTeachingRole.SUPPORT)
    DRIVER = ("Driver", NonTeachingRole.SUPPORT)
    SECURITY_GUARD = ("Security Guard", NonTeachingRole.SUPPORT)
    MAINTENANCE_OFFICER = ("Maintenance Officer", NonTeachingRole.SUPPORT)
    CLEANER = ("Cleaner", NonTeachingRole.SUPPORT)
    
    # Management
    PRINCIPAL = ("Principal", NonTeachingRole.MANAGEMENT)
    DEPUTY_PRINCIPAL = ("Deputy Principal", NonTeachingRole.MANAGEMENT)
    HEAD_OF_ADMINISTRATION = ("Head of Administration", NonTeachingRole.MANAGEMENT)
    
    # Sports
    SPORTS_COACH = ("Sports Coach", NonTeachingRole.SPORTS)
    ATHLETIC_DIRECTOR = ("Athletic Director", NonTeachingRole.SPORTS)
    
    # Library
    LIBRARIAN = ("Librarian", NonTeachingRole.LIBRARY)
    ASSISTANT_LIBRARIAN = ("Assistant Librarian", NonTeachingRole.LIBRARY)

    def __init__(self, title: str, role: NonTeachingRole):
        self.title = title
        self.role = role

    @classmethod
    def get_positions_by_role(cls, role: NonTeachingRole) -> List[str]:
        """Get all position titles for a specific role."""
        return [pos.title for pos in cls if pos.role == role]

    @classmethod
    def list_all_positions(cls) -> List[str]:
        """Get all position titles."""
        return [pos.title for pos in cls]