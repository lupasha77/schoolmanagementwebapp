# tests/test_teacher_service.py
def test_create_teacher(app, db):
    from backend.app.services.staff_service import StaffService
    
    teacher_data = {
        'name': 'John Doe',
        'subjects': [],
        'availability': {
            'Monday': ['08:00', '09:00']
        }
    }
    
    teacher = StaffService.create_teacher(teacher_data)
    assert teacher.name == 'John Doe'
    assert teacher.availability == teacher_data['availability']