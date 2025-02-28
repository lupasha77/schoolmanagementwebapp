# tests/conftest.py
import pytest
from app import create_app
from app.models.schemas import Teacher, Subject, Class, Stream, Grade
from mongoengine.connection import disconnect

@pytest.fixture
def app():
    app = create_app()
    app.config['TESTING'] = True
    app.config['MONGODB_SETTINGS'] = {
        'host': 'mongodb://localhost:27017/test_school_timetable'
    }
    return app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def db():
    disconnect()
    db = app.extensions['mongoengine']
    yield db
    # Clean up after tests
    db.connection.drop_database('test_school_timetable')
