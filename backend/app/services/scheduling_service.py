# app/services/scheduling_service.py
from typing import List, Optional
from ..models.schemas import TimeSlot, Class, Staff, Subject

class SchedulingService:
    @staticmethod
    def assign_practical_slots(class_obj: Class) -> bool:
        """Assigns practical slots for a class."""
        available_slots = TimeSlot.objects(
            is_break=False,
            class_assigned=None,
            is_practical=False
        ).limit(4)
        
        if len(available_slots) < 4:
            return False
        
        for slot in available_slots:
            slot.is_practical = True
            slot.class_assigned = class_obj
            slot.save()
        
        return True
    
    @staticmethod
    def check_teacher_availability(
        teacher: Staff,
        time_slot: TimeSlot
    ) -> bool:
        """Checks if a teacher is available for a given time slot."""
        return (
            time_slot.day in teacher.availability and
            time_slot.start_time in teacher.availability[time_slot.day]
        )
    
    @staticmethod
    def assign_teacher(
        time_slot: TimeSlot,
        teacher: Staff,
        subject: Subject
    ) -> bool:
        """Assigns a teacher to a time slot."""
        if not SchedulingService.check_teacher_availability(teacher, time_slot):
            return False
        
        time_slot.teacher = teacher
        time_slot.subject = subject
        time_slot.save()
        return True
# app/services/scheduling_service.py (Additional Logic)
class SchedulingService:
    @staticmethod
    def generate_class_schedule(class_obj: Class) -> bool:
        """Generates a complete schedule for a class."""
        try:
            # Schedule practical sessions first
            practical_slots = SchedulingService.assign_practical_slots(class_obj)
            if not practical_slots:
                return False
            
            # Get available slots for regular subjects
            available_slots = TimeSlot.objects(
                is_break=False,
                class_assigned=None,
                is_practical=False
            )
            
            # Get subjects and teachers
            subjects = Subject.objects(is_practical=False)
            teachers = Staff.objects()
            
            # Schedule regular subjects
            for slot in available_slots:
                assigned = False
                for subject in subjects:
                    for teacher in teachers:
                        if subject in teacher.subjects and \
                           SchedulingService.check_teacher_availability(teacher, slot):
                            SchedulingService.assign_teacher(slot, teacher, subject)
                            assigned = True
                            break
                    if assigned:
                        break
                if not assigned:
                    return False
            
            return True
        except Exception as e:
            print(f"Error in generate_class_schedule: {str(e)}")
            return False

    @staticmethod
    def validate_schedule(schedule: List[TimeSlot]) -> bool:
        """Validates a complete schedule for conflicts."""
        # Check for teacher conflicts
        teacher_slots = {}
        for slot in schedule:
            if slot.teacher:
                key = f"{slot.day}_{slot.start_time}"
                if key in teacher_slots and teacher_slots[key] == slot.teacher:
                    return False
                teacher_slots[key] = slot.teacher
        
        # Check for class conflicts
        class_slots = {}
        for slot in schedule:
            if slot.class_assigned:
                key = f"{slot.day}_{slot.start_time}"
                if key in class_slots and class_slots[key] == slot.class_assigned:
                    return False
                class_slots[key] = slot.class_assigned
        
        return True