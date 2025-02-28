# app/services/student_service.py
from ..utils.serializers import MongoSerializer
from typing import List, Dict, Optional
from ..models.school_class_model import Student, Subject, TimeSlot
from ..validation.schemas import StudentSchema
from mongoengine.errors import DoesNotExist, ValidationError
from datetime import datetime

class StudentService:
    # @staticmethod
    # def create_student(data: Dict) -> Student:
    #     """
    #     Create a new student with validated data.
    #     """
    #     try:
    #         # Validate input data
    #         schema = StudentSchema()
    #         validated_data = schema.load(data)
            
    #         # Convert subject names to Subject references
    #         subject_refs = []
    #         for subject_name in validated_data['subjects']:
    #             subject = Subject.objects(name=subject_name).first()
    #             if subject:
    #                 subject_refs.append(subject)
            
    #         # Create and save student
    #         student = Student(
    #             name=validated_data['name'],
    #             subjects=subject_refs,
    #             availability=validated_data['availability']
    #         )
    #         student.save()
            
    #         return student
    #     except ValidationError as e:
    #         raise ValueError(f"Invalid student data: {str(e)}")
    
    @staticmethod
    def get_all_students() -> List[Dict]:
        """
        Get all students with their subjects and availability.
        """
        students = Student.objects.all()
        return [{
            'id': str(student.id),
            'name': student.name,
            'subjects': [str(subject.name) for subject in student.subjects],
            
        } for student in students]
    
#     @staticmethod
#     def get_student_by_id(student_id: str) -> Optional[Student]:
#         """
#         Get a student by ID.
#         """
#         try:
#             return Student.objects.get(id=student_id)
#         except DoesNotExist:
#             return None
    
#     @staticmethod
#     def update_availability(student_id: str, availability: Dict) -> bool:
#         """
#         Update a student's availability schedule.
#         """
#         try:
#             student = Student.objects.get(id=student_id)
#             student.availability = availability
#             student.updated_at = datetime.utcnow()
#             student.save()
#             return True
#         except DoesNotExist:
#             raise ValueError(f"Student with id {student_id} not found")
#         except ValidationError as e:
#             raise ValueError(f"Invalid availability data: {str(e)}")
    
#     @staticmethod
#     def assign_subjects(student_id: str, subject_ids: List[str]) -> bool:
#         """
#         Assign subjects to a student.
#         """
#         try:
#             student = Student.objects.get(id=student_id)
#             subjects = [Subject.objects.get(id=sid) for sid in subject_ids]
#             student.subjects = subjects
#             student.updated_at = datetime.utcnow()
#             student.save()
#             return True
#         except DoesNotExist as e:
#             raise ValueError(f"Resource not found: {str(e)}")
#         except ValidationError as e:
#             raise ValueError(f"Invalid subject assignment: {str(e)}")
    
#     @staticmethod
#     def get_available_students(time_slot: TimeSlot) -> List[Student]:
#         """
#         Get all students available for a specific time slot.
#         """
#         return Student.objects(
#             availability__contains=time_slot.day,
#             **{f"availability__{time_slot.day}": time_slot.start_time}
#         )
    

# # Update StudentService to use the serializer
# # app/services/student_service.py

# class StudentService:
#     @staticmethod
#     def get_all_students() -> List[Dict]:
#         """
#         Get all students with their subjects and availability.
#         """
#         students = Student.objects.all()
#         return [MongoSerializer.serialize_document(student) for student in students]
    
#     @staticmethod
#     def get_student_by_id(student_id: str) -> Dict:
#         """
#         Get a student by ID.
#         """
#         try:
#             student = Student.objects.get(id=student_id)
#             return MongoSerializer.serialize_document(student)
#         except DoesNotExist:
#             return None

