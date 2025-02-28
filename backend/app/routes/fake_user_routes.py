  
import os 
from datetime import datetime
import random
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash
from faker import Faker
from bson import ObjectId
import secrets
import logging
from app.models.users import User
from app.utils.jwt_handler import create_access_token, create_refreshToken
from typing import List, Dict, Tuple, Optional
from app.models.school_class_model import Department, GradeLevel, NonTeachingRole
from app.models.department_config import get_department_config
from app.models.school_class_model import (
    SubjectNames,
    Department,
    Specialty,
    GradeLevel,
    NonTeachingRole,
    NonTeachingPosition
)

logger = logging.getLogger(__name__)

fake_user_bp = Blueprint("fake_user", __name__)
fake = Faker()
# Load school name from config or .env
SCHOOL_NAME = os.getenv("SCHOOL_NAME", "DefaultSchool")
CURRENT_YEAR = datetime.utcnow().year

# Add pagination helper
def paginate(items, page, per_page):
    start = (page - 1) * per_page
    end = start + per_page
    total = len(items)
    items_paginated = items[start:end]
    return {
        'items': items_paginated,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page
    }

class FakeService:
    # ... (keep existing methods from your code) ...
    def __init__(self, db, email_service):
        self.db = db
        self.email_service = email_service
         


    @staticmethod
    def generate_verification_token():
        return User.generate_verification_token()
    
    @staticmethod
    def generate_password(firstName, phone_number):
        """Generate a password following the pattern: firstName + first 4 digits of phoneNumber + &&"""
        return f"{firstName}{phone_number[:4]}&&"
    def send_verification_email(self, email: str, name: str, token: str, password: str) -> None:
        """Send verification email with error handling."""
        try:
            self.email_service.send_verification_email(email, name, token, password)
            # logger.info(f"Verification email sent to: {email}")
        except Exception as e:
            logger.error(f"Failed to send email to {email}: {e}")

    def generate_tokens(self, user_id):
            """Generate both access and refresh tokens for a user."""
            try:
                access_token = create_access_token(user_id)
                refresh_token = create_refreshToken(user_id)
                # Initialize the refreshTokens array with the new token
                 # Store refresh token with a limit of 5 tokens per user
                 
                self.db.refreshTokens.update_one(
                    {"user_id": user_id},
                    {"$push": {"tokens": {"$each": [refresh_token], "$slice": -5}}},
                    upsert=True
                )
            
                return access_token, refresh_token
            except Exception as e:
                logger.error(f"Failed to generate tokens for user {user_id}: {e}")
                return None, None
    def generate_studentId(self, count):
        """Generate a student ID based on school name, year, and sequence number."""
        school_letter = SCHOOL_NAME[0].upper()
        return f"{school_letter}{CURRENT_YEAR}{str(count).zfill(4)}"

    def generate_employeeId(self, count):
        """Generate an employee ID based on school name, year, and sequence number."""
        school_prefix = SCHOOL_NAME[:2].upper()
        return f"{school_prefix}{CURRENT_YEAR}{str(count).zfill(4)}"

    def generate_email(self, firstName, lastName):
        """Generate school-based email address."""
        return f"{firstName.lower()}{lastName.lower()}@{SCHOOL_NAME.lower()}.org"

    def generate_students(self, count, gradeLevel=None):
        """Generate fake students with hashed passwords and store them."""
        students = []
        users = []
        student_count = self.db.students.count_documents({})
        
        
        for i in range(count):
            user_id = ObjectId()
            firstName = fake.first_name()
            lastName = fake.last_name()
            phone_number = fake.numerify("+2637########")
            address = fake.address()
            studentId = self.generate_studentId(student_count + i + 1)
            user_email = self.generate_email(firstName, lastName)
            
            # Generate password using the defined pattern
            password = self.generate_password(firstName, phone_number)
            hashed_password = User.hash_password(password)
            verification_token = self.generate_verification_token()
            
            # Generate tokens
            access_token, refresh_token = self.generate_tokens(user_id)
            
            student = {
                "_id": user_id,
                "firstName": firstName,
                "lastName": lastName,
                "user_email": user_email,
                "studentId": studentId,
                "phoneNumber": phone_number,
                "address": address,
                "gradeLevel": gradeLevel if gradeLevel else random.choice(["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"]),
                "gradeLevels": [],
                "specialties": [],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        
            user = {
                "_id": user_id,
                "firstName": firstName,
                "lastName": lastName,
                "user_email": user_email,
                "password": hashed_password,
                "role": "student",
                "verification_token": verification_token,
                "access_token": access_token,
                "refreshTokens": [refresh_token],
                "verified": False,
                "address": address,
                "phone_number": phone_number,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            logger.info(f"Received gradeLevel: {gradeLevel}")

            students.append(student)
            users.append(user)

            # Send verification email with temporary password
            try:
                self.email_service.send_verification_email(user_email, firstName, verification_token, password)
                # logger.info(f"Verification email sent to: {user_email}")
            except Exception as e:
                logger.error(f"Failed to send email to {user_email}: {e}")

        if students:
            # Only insert if we have data
            result_students = self.db.students.insert_many(students)
            result_users = self.db.users.insert_many(users)
            logger.info(f"Added {len(students)} students and {len(users)} users to database")
            
            # Convert ObjectId to string for JSON serialization
            students = [{**student, "_id": str(student["_id"])} for student in students]
            users = [{**user, "_id": str(user["_id"])} for user in users]
            return students
        return []


    # Add all your existing methods here (generate_verification_token, generate_password, etc.)
    
    def create_custom_student(self, data):
        """Create a single student with custom data."""
        try:
            user_id = ObjectId()
            firstName = data['firstName']
            lastName = data['lastName']
            gradeLevel = data['gradeLevel']
            
            # Generate required fields
            phone_number = fake.numerify("+2637########")
            address = fake.address()
            student_count = self.db.students.count_documents({})
            studentId = self.generate_studentId(student_count + 1)
            user_email = self.generate_email(firstName, lastName)
            
            # Generate password and tokens
            password = self.generate_password(firstName, phone_number)
            hashed_password = User.hash_password(password)
            verification_token = self.generate_verification_token()
            access_token, refresh_token = self.generate_tokens(user_id)
            
            student = {
                "_id": user_id,
                "firstName": firstName,
                "lastName": lastName,
                "user_email": user_email,
                "studentId": studentId,
                "phoneNumber": phone_number,
                "address": address,
                "gradeLevel": gradeLevel,
                "gradeLevels": [],
                "specialties": [],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            user = {
                "_id": user_id,
                "firstName": firstName,
                "lastName": lastName,
                "user_email": user_email,
                "password": hashed_password,
                "role": "student",
                "verification_token": verification_token,
                "access_token": access_token,
                "refreshTokens": [refresh_token],
                "verified": False,
                "address": address,
                "phone_number": phone_number,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Insert the documents
            self.db.students.insert_one(student)
            self.db.users.insert_one(user)
            
            # Send verification email
            try:
                self.email_service.send_verification_email(user_email, firstName, verification_token, password)
                logger.info(f"Verification email sent to: {user_email}")
            except Exception as e:
                logger.error(f"Failed to send email to {user_email}: {e}")
            
            # Convert ObjectId to string for response
            student['_id'] = str(student['_id'])
            return student
            
        except Exception as e:
            logger.error(f"Error creating custom student: {e}")
            return None

    # Keep all your other existing methods...
    def generate_staffs(self, count: int, department: str = None, role_area: str = None) -> List[Dict]:
        """
        Generate fake staff records for a specific department and role area.
        
        Args:
            count (int): Number of staff records to generate
            department (str): Specific department to generate staff for
            role_area (str): Role area ('teaching' or 'non-teaching')
        """
        staffs = []
        users = []
        teacher_count = self.db.staffs.count_documents({})

        # Normalize role_area to lowercase for comparison
        role_area = role_area.lower() if role_area else None
        department = department.lower() if department else None
        
        logger.info(f"Generating staff with parameters - count: {count}, department: {department}, role_area: {role_area}")

        for i in range(count):
            user_id = ObjectId()
            first_name = fake.first_name()
            last_name = fake.last_name()
            phone_number = fake.numerify("+2637########")
            address = fake.address()
            employee_id = self.generate_employeeId(teacher_count + i + 1)
            user_email = self.generate_email(first_name, last_name)
            
            # Generate authentication details
            password = self.generate_password(first_name, phone_number)
            hashed_password = User.hash_password(password)
            verification_token = self.generate_verification_token()
            access_token, refresh_token = self.generate_tokens(user_id)
            
            # Use specified role_area or random if not specified
            current_role_area = role_area if role_area else fake.random_element(elements=('teaching', 'non-teaching'))
            logger.info(f"Using role_area: {current_role_area}")
            
            # Base staff document
            staff = {
                "_id": user_id,
                "firstName": first_name,
                "lastName": last_name,
                "user_email": user_email,
                "employeeId": employee_id,
                "phoneNumber": phone_number,
                "address": address,
                "roleArea": current_role_area,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            if current_role_area == 'teaching':
                try:
                    # Use specified department or random if not specified
                    current_department = department or fake.random_element(elements=Department.list_departments()).lower()
                    logger.info(f"Using department: {current_department}")
                    
                    dept_config = get_department_config(current_department)
                    
                    # Select random grade levels
                    grade_levels = [
                        fake.random_element(elements=[grade.value for grade in GradeLevel])
                        for _ in range(fake.random_int(min=1, max=3))
                    ]
                    
                    # Get department-specific subjects with safe random selection
                    available_subjects = dept_config['subjects']
                    if not available_subjects:
                        available_subjects = ['General Subject']  # Fallback if no subjects defined
                    
                    # Ensure min_subjects doesn't exceed available subjects
                    min_subjects = min(dept_config['min_subjects'], len(available_subjects))
                    max_subjects = min(dept_config['max_subjects'], len(available_subjects))
                    max_subjects = max(max_subjects, min_subjects)
                    
                    num_subjects = fake.random_int(min=min_subjects, max=max_subjects)
                    selected_subjects = fake.random_elements(
                        elements=available_subjects,
                        length=num_subjects,
                        unique=True
                    )
                    
                    staff.update({
                        "subjects": selected_subjects,
                        "gradeLevels": grade_levels,
                        "specialties": [dept_config['specialty']] if dept_config.get('specialty') else [],
                        "department": current_department.capitalize(),
                        "position": f"{dept_config.get('position_prefix', 'General')} Teacher"
                    })
                    
                except Exception as e:
                    logger.error(f"Error generating teaching staff: {e}")
                    staff.update({
                        "subjects": ["General Subject"],
                        "gradeLevels": ["Form 1"],
                        "specialties": [],
                        "department": current_department.capitalize() if current_department else "General",
                        "position": "Teacher"
                    })
            else:
                # Only generate non-teaching staff if specifically requested or if no role_area specified
                try:
                    non_teaching_role = self.generate_non_teaching_role()
                    position = self.generate_non_teaching_position(non_teaching_role)
                except Exception as e:
                    logger.error(f"Error generating non-teaching staff: {e}")
                    non_teaching_role = NonTeachingRole.ADMINISTRATIVE
                    position = "Administrative Staff"
                
                staff.update({
                    "subjects": None,
                    "gradeLevels": None,
                    "specialties": None,
                    "department": getattr(non_teaching_role, 'value', 'Administrative'),
                    "position": position
                })

            # Create user document
            user = {
                "_id": user_id,
                "firstName": first_name,
                "lastName": last_name,
                "user_email": user_email,
                "password": hashed_password,
                "role": "staff",
                "verification_token": verification_token,
                "access_token": access_token,
                "refreshTokens": [refresh_token],
                "verified": False,
                "address": address,
                "phone_number": phone_number,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            staffs.append(staff)
            users.append(user)
            
            # Send verification email
            try:
                self.email_service.send_verification_email(
                    user_email, first_name, verification_token, password
                )
                logger.info(f"Verification email sent to: {user_email}")
            except Exception as e:
                logger.error(f"Failed to send email to {user_email}: {e}")

        if staffs:
            try:
                self.db.staffs.insert_many(staffs)
                self.db.users.insert_many(users)
                logger.info(f"Added {len(staffs)} staffs and {len(users)} users to database")
                return self._serialize_records(staffs)
            except Exception as e:
                logger.error(f"Failed to insert records: {e}")
                return []
        
        return []
 
    def get_all_students(self, page=1, per_page=10, search=None):
        query = {}
        if search:
            query = {
                '$or': [
                    {'firstName': {'$regex': search, '$options': 'i'}},
                    {'lastName': {'$regex': search, '$options': 'i'}},
                    {'user_email': {'$regex': search, '$options': 'i'}},
                    {'studentId': {'$regex': search, '$options': 'i'}}
                ]
            }
        
        total = self.db.students.count_documents(query)
        skip = (page - 1) * per_page
        
        students = list(self.db.students.find(query).skip(skip).limit(per_page))
        return {
            'items': students,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }

    def get_all_staffs(self, page=1, per_page=10, search=None):
        query = {}
        if search:
            query = {
                '$or': [
                    {'firstName': {'$regex': search, '$options': 'i'}},
                    {'lastName': {'$regex': search, '$options': 'i'}},
                    {'user_email': {'$regex': search, '$options': 'i'}},
                    {'employeeId': {'$regex': search, '$options': 'i'}}
                ]
            }
        
        total = self.db.staffs.count_documents(query)
        skip = (page - 1) * per_page
        
        staffs = list(self.db.staffs.find(query).skip(skip).limit(per_page))
        return {
            'items': staffs,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }

    def update_student(self, student_id, data):
        try:
            result = self.db.students.update_one(
                {'_id': ObjectId(student_id)},
                {'$set': {
                    'firstName': data['firstName'],
                    'lastName': data['lastName'],
                    'updated_at': datetime.utcnow()
                }}
            )
            if result.modified_count:
                return True
            return False
        except Exception as e:
            logger.error(f"Error updating student: {e}")
            return False

    def update_staff(self, teacher_id, data):
        try:
            result = self.db.staffs.update_one(
                {'_id': ObjectId(teacher_id)},
                {'$set': {
                    'firstName': data['firstName'],
                    'lastName': data['lastName'],
                    'updated_at': datetime.utcnow()
                }}
            )
            if result.modified_count:
                return True
            return False
        except Exception as e:
            logger.error(f"Error updating teacher: {e}")
            return False

    def delete_students(self, student_ids):
        try:
            result = self.db.students.delete_many({'_id': {'$in': [ObjectId(id) for id in student_ids]}})
            self.db.users.delete_many({'_id': {'$in': [ObjectId(id) for id in student_ids]}})
            return result.deleted_count
        except Exception as e:
            logger.error(f"Error deleting students: {e}")
            return 0

    def delete_staffs(self, teacher_ids):
        try:
            result = self.db.staffs.delete_many({'_id': {'$in': [ObjectId(id) for id in teacher_ids]}})
            self.db.users.delete_many({'_id': {'$in': [ObjectId(id) for id in teacher_ids]}})
            return result.deleted_count
        except Exception as e:
            logger.error(f"Error deleting staffs: {e}")
            return 0
 
    def _serialize_records(self, records: List[Dict]) -> List[Dict]:
        """Convert ObjectIds to strings for JSON serialization."""
        return [{**record, "_id": str(record["_id"])} for record in records]

    def generate_subjects(self) -> List[str]:
        """Generate random list of subjects from defined SubjectNames enum."""
        all_subjects = SubjectNames.list_subjects()
        num_subjects = fake.random_int(min=1, max=3)
        return fake.random_elements(
            elements=all_subjects,
            length=num_subjects,
            unique=True
        )

    def generate_grade_levels(self) -> List[str]:
        """Generate random list of grade levels from defined GradeLevel enum."""
        all_grades = [grade.value for grade in GradeLevel]
        num_grades = fake.random_int(min=1, max=3)
        return fake.random_elements(
            elements=all_grades,
            length=num_grades,
            unique=True
        )

    def generate_specialties(self) -> List[str]:
        """Generate random list of specialties from defined Specialty enum."""
        all_specialties = [specialty.value for specialty in Specialty]
        num_specialties = fake.random_int(min=1, max=2)
        return fake.random_elements(
            elements=all_specialties,
            length=num_specialties,
            unique=True
        )

    def generate_department(self) -> str:
        """Generate random department from defined Department enum."""
        return fake.random_element(elements=Department.list_departments())

    def generate_position(self) -> str:
        """Generate random position title based on department."""
        positions_by_department = {
            Department.ARTS.value: ["Art Teacher", "Music Teacher", "Drama Teacher"],
            Department.SCIENCES.value: ["Science Lab Technician", "Laboratory Assistant", "Science Coordinator"],
            Department.COMMERCIAL.value: ["Business Studies Teacher", "Accounts Teacher", "Economics Teacher"],
            Department.HUMANITIES.value: ["History Teacher", "Religious Studies Teacher", "Social Studies Coordinator"],
            Department.MATHEMATICS.value: ["Mathematics Teacher", "Statistics Teacher", "Math Department Head"],
            Department.LINGUISTICS.value: ["English Teacher", "Language Coordinator", "Literature Teacher"],
            Department.GEOGRAPHY.value: ["Geography Teacher", "Environmental Studies Coordinator"],
            Department.SOCIAL_SCIENCES.value: ["Sociology Teacher", "Psychology Teacher", "Social Sciences Head"],
            Department.PRACTICALS.value: ["Workshop Technician", "Practical Skills Instructor", "Technical Drawing Teacher"],
            Department.COMPUTERS.value: ["ICT Teacher", "Computer Lab Technician", "Digital Skills Coordinator"]
        }
        
        department = self.generate_department()
        return fake.random_element(elements=positions_by_department.get(department, ["Teacher"]))
    def generate_non_teaching_role(self) -> NonTeachingRole:
        """Generate random non-teaching role."""
        return fake.random_element(elements=list(NonTeachingRole))

    def generate_non_teaching_position(self, role: NonTeachingRole) -> str:
        """Generate random position title for a given non-teaching role."""
        positions = NonTeachingPosition.get_positions_by_role(role)
        return fake.random_element(elements=positions)

    def generate_teaching_department(self) -> str:
        """Generate random teaching department."""
        return fake.random_element(elements=Department.list_departments())

# Route Handlers
@fake_user_bp.route("/get-all-students", methods=["GET"])
def get_students():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    search = request.args.get('search', None)
    
    fake_service = FakeService(current_app.db, current_app.auth_service.email_service)
    result = fake_service.get_all_students(page, per_page, search)
    
    # Convert ObjectId to string for JSON serialization
    for item in result['items']:
        item['_id'] = str(item['_id'])
    
    return jsonify(result)

@fake_user_bp.route("/get-all-staff", methods=["GET"])
def get_staffs():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    search = request.args.get('search', None)
    
    fake_service = FakeService(current_app.db, current_app.auth_service.email_service)
    result = fake_service.get_all_staffs(page, per_page, search)
    
    # Convert ObjectId to string for JSON serialization
    for item in result['items']:
        item['_id'] = str(item['_id'])
    
    return jsonify(result)

@fake_user_bp.route("/edit-students/<student_id>", methods=["PUT"])
def update_student(student_id):
    data = request.json
    fake_service = FakeService(current_app.db, current_app.auth_service.email_service)
    success = fake_service.update_student(student_id, data)
    return jsonify({'success': success})

@fake_user_bp.route("/staffs/<teacher_id>", methods=["PUT"])
def update_teacher(teacher_id):
    data = request.json
    fake_service = FakeService(current_app.db, current_app.auth_service.email_service)
    success = fake_service.update_teacher(teacher_id, data)
    return jsonify({'success': success})

@fake_user_bp.route("/students/delete-students", methods=["POST"])
def delete_students():
    student_ids = request.json.get('ids', [])
    fake_service = FakeService(current_app.db, current_app.auth_service.email_service)
    deleted_count = fake_service.delete_students(student_ids)
    return jsonify({'deleted_count': deleted_count})

@fake_user_bp.route("/staffs/delete-satff", methods=["POST"])
def delete_staffs():
    teacher_ids = request.json.get('ids', [])
    fake_service = FakeService(current_app.db, current_app.auth_service.email_service)
    deleted_count = fake_service.delete_staffs(teacher_ids)
    return jsonify({'deleted_count': deleted_count})

# Keep existing generate routes...
@fake_user_bp.route("/generate-students", methods=["POST"])
def create_students():
    data=request.json
     
    count = request.json.get("count", 10)
     
    gradeLevel = request.json.get("gradeLevel")
     
    # Use the email_service from app context
    fake_service = FakeService(current_app.db, current_app.auth_service.email_service)
    students = fake_service.generate_students(count, gradeLevel)
    logger.info(f"Generated {len(students)} students in API endpoint")
    return jsonify({"message": "Students added successfully", "count": len(students), "students": students})

@fake_user_bp.route("/generate-staffs", methods=["POST"])
def create_staffs():
    data = request.json
    # logger.info(f"Received data: {data}")
    count = request.json.get("count", 5)
    department = data.get("department")
    role_area = data.get("role_area")  # Ensure correct key is used
    # Use the email_service from app context
    fake_service = FakeService(current_app.db, current_app.auth_service.email_service)
    staffs = fake_service.generate_staffs(count, department, role_area)
    logger.info(f"Generated {len(staffs)} staffs in API endpoint")
    return jsonify({"message": "Staffs added successfully", "count": len(staffs), "staffs": staffs})

    # Add this method to the FakeService class
# @fake_user_bp.route('/generate-staffs', methods=['POST'])
# def generate_staffs():
#     """Generate fake staff members"""
#     data = request.json
#     count = int(data.get("count", 5))
#     department = data.get("department")
#     role_area = data.get("role_area")  # Ensure correct key is used

#     if count <= 0:
#         return jsonify({"error": "Count must be greater than 0"}), 400
#     fake_service = FakeService(current_app.db, current_app.auth_service.email_service)
#     staffs = fake_service.generate_staffs(count, department, role_area)
#     return jsonify({"count": len(staffs), "staffs": staffs, "message": "Staffs added successfully"})


# Add this new route
@fake_user_bp.route("/create-student", methods=["POST"])
def create_custom_student():
    data = request.json
    if not all(key in data for key in ['firstName', 'lastName', 'gradeLevel']):
        return jsonify({
            "message": "Missing required fields",
            "error": "firstName, lastName, and gradeLevel are required"
        }), 400
    
    fake_service = FakeService(current_app.db, current_app.auth_service.email_service)
    student = fake_service.create_custom_student(data)
    
    if student:
        return jsonify({
            "message": "Student added successfully",
            "count": 1,
            "student": student
        })
    return jsonify({
        "message": "Failed to create student",
        "error": "Internal server error"
    }), 500