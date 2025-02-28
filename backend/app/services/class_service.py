# app/services/class_service.py
from typing import Dict, List, Optional
from ..models.schemas import Class, Stream, TimeSlot, Staff, Subject
from ..validation.schemas import ClassSchema
from ..services.scheduling_service import SchedulingService
from mongoengine.errors import DoesNotExist, ValidationError
from datetime import datetime

class ClassService:
    @staticmethod
    def create_class(data: Dict) -> Class:
        """
        Create a new class with validated data.
        """
        try:
            # Validate input data
            schema = ClassSchema()
            validated_data = schema.load(data)
            
            # Get stream reference
            stream = Stream.objects.get(id=validated_data['stream_id'])
            
            # Create and save class
            class_obj = Class(
                name=validated_data['name'],
                stream=stream,
                practicals=validated_data['practicals']
            )
            class_obj.save()
            
            return class_obj
        except DoesNotExist:
            raise ValueError(f"Stream with id {data['stream_id']} not found")
        except ValidationError as e:
            raise ValueError(f"Invalid class data: {str(e)}")
    
    @staticmethod
    def get_class_by_id(class_id: str) -> Optional[Class]:
        """
        Get a class by ID.
        """
        try:
            return Class.objects.get(id=class_id)
        except DoesNotExist:
            return None
    
    @staticmethod
    def get_all_classes() -> List[Dict]:
        """
        Get all classes with their stream and practical information.
        """
        classes = Class.objects.all()
        return [{
            'id': str(class_obj.id),
            'name': class_obj.name,
            'stream': {
                'id': str(class_obj.stream.id),
                'name': class_obj.stream.name
            },
            'practicals': class_obj.practicals
        } for class_obj in classes]
    
    @staticmethod
    def schedule_class(class_id: str) -> bool:
        """
        Generate a complete schedule for a class.
        """
        try:
            class_obj = Class.objects.get(id=class_id)
            
            # Clear existing schedule
            TimeSlot.objects(class_assigned=class_obj).update(
                class_assigned=None,
                teacher=None,
                subject=None,
                is_practical=False
            )
            
            # Generate new schedule
            return SchedulingService.generate_class_schedule(class_obj)
        except DoesNotExist:
            raise ValueError(f"Class with id {class_id} not found")
        except Exception as e:
            raise ValueError(f"Scheduling failed: {str(e)}")
    
    @staticmethod
    def get_class_schedule(class_id: str) -> List[Dict]:
        """
        Get the complete schedule for a class.
        """
        try:
            class_obj = Class.objects.get(id=class_id)
            slots = TimeSlot.objects(class_assigned=class_obj).order_by('day', 'start_time')
            
            return [{
                'day': slot.day,
                'start_time': slot.start_time,
                'end_time': slot.end_time,
                'is_break': slot.is_break,
                'is_practical': slot.is_practical,
                'teacher': str(slot.teacher.id) if slot.teacher else None,
                'subject': str(slot.subject.id) if slot.subject else None
            } for slot in slots]
        except DoesNotExist:
            raise ValueError(f"Class with id {class_id} not found")
    
    @staticmethod
    def update_practicals(class_id: str, practicals: List[str]) -> bool:
        """
        Update the practical subjects for a class.
        """
        try:
            class_obj = Class.objects.get(id=class_id)
            class_obj.practicals = practicals
            class_obj.updated_at = datetime.utcnow()
            class_obj.save()
            
            # Reschedule class if practicals changed
            return ClassService.schedule_class(class_id)
        except DoesNotExist:
            raise ValueError(f"Class with id {class_id} not found")
        except ValidationError as e:
            raise ValueError(f"Invalid practicals data: {str(e)}")
    
    @staticmethod
    def get_conflicting_slots(class_id: str, time_slot: TimeSlot) -> List[TimeSlot]:
        """
        Get any conflicting slots for a given class and time slot.
        """
        return TimeSlot.objects(
            day=time_slot.day,
            start_time=time_slot.start_time,
            class_assigned=Class.objects.get(id=class_id)
        )
# Update ClassService to use the serializer
# app/services/class_service.py
from ..utils.serializers import MongoSerializer

class ClassService:
    @staticmethod
    def get_all_classes() -> List[Dict]:
        """
        Get all classes with their stream and practical information.
        """
        classes = Class.objects.all()
        return [MongoSerializer.serialize_document(class_obj) for class_obj in classes]
    
    @staticmethod
    def get_class_schedule(class_id: str) -> List[Dict]:
        """
        Get the complete schedule for a class.
        """
        try:
            class_obj = Class.objects.get(id=class_id)
            slots = TimeSlot.objects(class_assigned=class_obj).order_by('day', 'start_time')
            return [MongoSerializer.serialize_document(slot) for slot in slots]
        except DoesNotExist:
            raise ValueError(f"Class with id {class_id} not found")