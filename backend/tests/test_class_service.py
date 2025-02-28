# tests/test_class_service.py
def test_create_class(app, db):
    from app.services.class_service import ClassService
    
    # Create required relationships
    grade = Grade(name="Grade 1").save()
    stream = Stream(name="Stream A", grade=grade).save()
    
    class_data = {
        'name': 'Class 1A',
        'stream_id': str(stream.id),
        'practicals': ['WOODWORK']
    }
    
    class_obj = ClassService.create_class(class_data)
    assert class_obj.name == 'Class 1A'
    assert class_obj.stream == stream

def test_schedule_class(app, db):
    from app.services.class_service import ClassService
    
    # Create test data
    grade = Grade(name="Grade 1").save()
    stream = Stream(name="Stream A", grade=grade).save()
    class_obj = Class(
        name="Class 1A",
        stream=stream,
        practicals=["WOODWORK"]
    ).save()
    
    # Create available slots
    for i in range(8):
        TimeSlot(
            day="Monday",
            start_time=f"0{8+i}:00",
            end_time=f"0{8+i}:35",
            is_break=False
        ).save()
    
    assert ClassService.schedule_class(str(class_obj.id))