# app/models/schemas.py
from mongoengine import *
from datetime import datetime

class Grade(Document):
    name = StringField(required=True)
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {'collection': 'grades'}

class Stream(Document):
    name = StringField(required=True)
    grade = ReferenceField(Grade, required=True)
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {'collection': 'streams'}

class Class(Document):
    name = StringField(required=True)
    stream = ReferenceField(Stream, required=True)
    practicals = ListField(StringField())
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {'collection': 'classes'}

class Subject(Document):
    name = StringField(required=True)
    is_practical = BooleanField(default=False)
    duration = IntField(default=1)  # Number of slots
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {'collection': 'subjects'}

class Staff(Document):
    name = StringField(required=True)
    subjects = ListField(ReferenceField(Subject))
    availability = DictField()  # Format: {"day": ["slot1", "slot2"]}
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {'collection': 'teachers'}

class TimeSlot(Document):
    day = StringField(required=True)
    start_time = StringField(required=True)
    end_time = StringField(required=True)
    is_break = BooleanField(default=False)
    is_practical = BooleanField(default=False)
    staff = ReferenceField(Staff)
    subject = ReferenceField(Subject)
    class_assigned = ReferenceField(Class)
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {'collection': 'time_slots'}