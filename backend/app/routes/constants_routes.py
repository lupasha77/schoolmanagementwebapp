from flask import Blueprint, jsonify, request, current_app
from typing import List
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Use only one import source for enums
from config.timetable_config import GradeLevel, Department, SubjectNames, Specialty

constants_bp = Blueprint("constants", __name__)

@constants_bp.route("/grade_levels", methods=['GET'])
def get_grade_levels() -> List[dict]:
    """Return all grade levels as value-label pairs"""
    return jsonify([
        {"value": grade.value, "label": grade.value}
        for grade in GradeLevel
    ])

@constants_bp.route("/departments", methods=['GET'])
def get_departments() -> List[dict]:
    """Return all departments as value-label pairs"""
    return jsonify([
        {"value": dept.value, "label": dept.value.title()}
        for dept in Department
    ])

@constants_bp.route("/subjects", methods=['GET'])
def get_subjects() -> List[dict]:
    """Return all subjects from the database"""
    try:
        subjects = list(current_app.db.subjects.find({}, {'_id': 0}))
        return jsonify(subjects)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@constants_bp.route("/specialties", methods=['GET'])
def get_specialties() -> List[dict]:
    """Return all specialties as value-label pairs"""
    return jsonify([
        {"value": spec.value, "label": spec.value.title()}
        for spec in Specialty
    ])

@constants_bp.route("/practical-rooms", methods=['GET'])
def get_practical_rooms():
    """Return practical rooms from the database"""
    try:
        rooms = list(current_app.db.practical_rooms.find({}, {'_id': 0}))
        return jsonify(rooms)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@constants_bp.route("/grade-subjects/<grade_level>", methods=['GET'])
def get_grade_subjects(grade_level):
    """Return subjects for a specific grade level from the database"""
    try:
        subjects = current_app.db.subjects.find_one(
            {"gradeLevel": grade_level},
            {'_id': 0, 'subjects': 1}
        )
        if not subjects:
            return jsonify({'error': f'No subjects found for grade level {grade_level}'}), 404
        return jsonify(subjects)
    except Exception as e:
        return jsonify({'error': str(e)}), 500