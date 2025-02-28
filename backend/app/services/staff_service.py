# app/services/staff_service.py
from collections import defaultdict
from typing import List, Dict, Optional
from ..utils.serializers import MongoSerializer
from ..models.schemas import Staff, Subject, TimeSlot
from ..validation.schemas import StaffSchema
from mongoengine.errors import DoesNotExist, ValidationError
from datetime import datetime

class StaffService:
    @staticmethod
    def create_staff(data: Dict) -> Staff:
        """
        Create a new staff with validated data.
        """
        try:
            # Validate input data
            schema = StaffSchema()
            validated_data = schema.load(data)
            
            # Convert subject names to Subject references
            subject_refs = []
            for subject_name in validated_data['subjects']:
                subject = Subject.objects(name=subject_name).first()
                if subject:
                    subject_refs.append(subject)
            
            # Create and save staff
            staff = Staff(
                name=validated_data['name'],
                subjects=subject_refs,
                availability=validated_data['availability']
            )
            staff.save()
            
            return staff
        except ValidationError as e:
            raise ValueError(f"Invalid staff data: {str(e)}")
    
    @staticmethod
    def get_all_staffs() -> List[Dict]:
        """
        Get all staffs with their subjects and availability.
        """
        staffs = Staff.objects.all()
        return [{
            'id': str(staff.id),
            'name': staff.name,
            'subjects': [str(subject.name) for subject in staff.subjects],
            'availability': staff.availability
        } for staff in staffs]
    
    @staticmethod
    def get_staff_by_id(staff_id: str) -> Optional[Staff]:
        """
        Get a staff by ID.
        """
        try:
            return Staff.objects.get(id=staff_id)
        except DoesNotExist:
            return None
    
    @staticmethod
    def update_availability(staff_id: str, availability: Dict) -> bool:
        """
        Update a staff's availability schedule.
        """
        try:
            staff = Staff.objects.get(id=staff_id)
            staff.availability = availability
            staff.updated_at = datetime.utcnow()
            staff.save()
            return True
        except DoesNotExist:
            raise ValueError(f"Staff with id {staff_id} not found")
        except ValidationError as e:
            raise ValueError(f"Invalid availability data: {str(e)}")
    
    @staticmethod
    def assign_subjects(staff_id: str, subject_ids: List[str]) -> bool:
        """
        Assign subjects to a staff.
        """
        try:
            staff = Staff.objects.get(id=staff_id)
            subjects = [Subject.objects.get(id=sid) for sid in subject_ids]
            staff.subjects = subjects
            staff.updated_at = datetime.utcnow()
            staff.save()
            return True
        except DoesNotExist as e:
            raise ValueError(f"Resource not found: {str(e)}")
        except ValidationError as e:
            raise ValueError(f"Invalid subject assignment: {str(e)}")
    
    @staticmethod
    def get_available_staffs(time_slot: TimeSlot) -> List[Staff]:
        """
        Get all staffs available for a specific time slot.
        """
        return Staff.objects(
            availability__contains=time_slot.day,
            **{f"availability__{time_slot.day}": time_slot.start_time}
        ) 
    @staticmethod
    def get_all_staffs() -> List[Dict]:
        """
        Get all staffs with their subjects and availability.
        """
        staffs = Staff.objects.all()
        return [MongoSerializer.serialize_document(staff) for staff in staffs]
    
    @staticmethod
    def get_staff_by_id(staff_id: str) -> Dict:
        """
        Get a staff by ID.
        """
        try:
            staff = Staff.objects.get(id=staff_id)
            return MongoSerializer.serialize_document(staff)
        except DoesNotExist:
            return None

    # @staticmethod
    # def calculate_workload_stats(scheduler, assignments, teachers):
    #     """
    #     Calculate workload statistics for each teacher
    #     Returns a list of teacher workload data objects
    #     """
    #     # Initialize workload counter
    #     actual_workload = defaultdict(lambda: defaultdict(int))
        
    #     # Count actual periods assigned to each teacher
    #     for assignment in assignments:
    #         teacher_id = assignment.get('teacherId')
    #         if not teacher_id:
    #             continue
                
    #         day = assignment.get('day')
    #         if day:
    #             actual_workload[teacher_id][day] += 1
                
    #     # Calculate stats for each teacher
    #     results = []
    #     for teacher in teachers:
    #         teacher_id = str(teacher['_id'])
    #         teacher_name = f"{teacher.get('firstName', '')} {teacher.get('lastName', '')}"
            
    #         # Calculate target workload
    #         target_workload = scheduler.calculate_max_teacher_workload(teacher_id)
            
    #         # Calculate total actual workload
    #         weekly_workload = sum(actual_workload[teacher_id].values())
            
    #         # Calculate daily breakdown
    #         daily_workload = {
    #             day: actual_workload[teacher_id].get(day, 0)
    #             for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    #         }
            
    #         # Calculate utilization percentage
    #         utilization = (weekly_workload / target_workload * 100) if target_workload > 0 else 0
            
    #         # Determine status based on utilization
    #         status = StaffService.determine_workload_status(weekly_workload, target_workload)
            
    #         results.append({
    #             'teacherId': teacher_id,
    #             'teacherName': teacher_name,
    #             'subjects': teacher.get('subjects', []),
    #             'targetWorkload': target_workload,
    #             'actualWorkload': weekly_workload,
    #             'dailyWorkload': daily_workload,
    #             'utilizationPercentage': round(utilization, 1),
    #             'status': status
    #         })
        
    #     # Sort results by status (underloaded -> optimal -> overloaded)
    #     status_order = {'underloaded': 0, 'optimal': 1, 'overloaded': 2}
    #     results.sort(key=lambda x: status_order[x['status']])
        
    #     return results

    # @staticmethod
    # def determine_workload_status(actual: int, target: int) -> str:
    #     """
    #     Determine if teacher is optimally loaded, overloaded, or underloaded
    #     """
    #     if actual < target * 0.8:
    #         return 'underloaded'
    #     elif actual > target * 1.1:
    #         return 'overloaded'
    #     else:
    #         return 'optimal'