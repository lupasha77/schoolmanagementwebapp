from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
from pymongo import UpdateOne
from pymongo.errors import BulkWriteError

subject_gen_bp = Blueprint("subject_gen", __name__)

class SubjectService:
    def __init__(self, db):
        self.db = db

    def generate_subjects(self, grade_level=None): 
        def validate_subject_tuple(subject_tuple):
            # Expected format: (code, name, department, grade, isCore, isRegular, isPractical, practical_duration)
            if len(subject_tuple) < 8:
                code, name, department, grade = subject_tuple[0:4]
                # If missing fields, provide defaults
                isCore = subject_tuple[4] if len(subject_tuple) > 4 else False
                isRegular = True  # Default to True
                isPractical = False  # Default to False
                practical_duration = 0  # Default to 0
                
                return (code, name, department, grade, isCore, isRegular, isPractical, practical_duration)
            return subject_tuple
            
        subjects_data = [
            # Form 1 Subjects
            ("MATH101", "Mathematics", "Mathematics", "Form 1", True, True,False, 0),
            ("SHONA101", "Shona Language", "Linguistics", "Form 1", True, True,False, 0),
            ("NDEBE101", "Ndebele Language", "Linguistics", "Form 1", True, True,False, 0),
            ("NAMB101", "Nambya", "Linguistics", "Form 1", True, True,False, 0),
            ("TONG101", "Tonga", "Linguistics", "Form 1", True, True,False, 0),
            ("FRENC101", "French", "Linguistics", "Form 1", True, True,False, 0),
            ("GBL101", "Global Persectives", "Humanities", "Form 1", True, True,False, 0),
            ("RES101", "Religious Studies", "Humanities", "Form 1", False, True,False, 0),
            ("TDG101", "Technical Drawing", "Practicals", "Form 1", False, True,True, 140),
            ("MEW101", "Metal Work", "Practicals", "Form 1", False,True, True, 140),
            ("CTG101", "Clothing Technology", "Practicals", "Form 1", False, True,True, 140),
            ("FSC101", "Food Sciences", "Practicals", "Form 1", False,True,True, 140),
            ("WDW101", "Woodwork", "Practicals", "Form 1", False, True,True, 140),
            ("ENG101", "English Language", "Linguistics", "Form 1", True, True,False, 0),
            ("SCI101", "Integrated Science", "Sciences", "Form 1", True, True,False, 0),
            ("GEO101", "Geography", "Humanities", "Form 1", False, False,False, 0),
            ("HIST101", "History", "Humanities", "Form 1", False, True,False, 0),
            ("AGR101", "Agriculture", "Practicals", "Form 1", False, True,True, 140),
            ("ART101", "Art and Design", "Practicals", "Form 1", False, True,True, 140),
            ("BUS101", "Business Studies", "Commercials", "Form 1", False, True,False, 0),
            ("ACC101", "Accounting", "Commercials", "Form 1", False, True,False, 0), 
            ("ECON101", "Economics", "Commercials", "Form 1", False, True,False, 0),
            ("COM101", "Computer Science", "Sciences", "Form 1", False, True,False, 0),
            # Form 2 Subjects
            ("MATH201", "Mathematics", "Mathematics", "Form 2", True,True, False, 0),
            ("ENG201", "English Language", "Languages", "Form 2",True, True, False, 0),
            ("PHY201", "Physics", "Sciences", "Form 2", True,True, False, 0),
            ("CHEM201", "Chemistry", "Sciences", "Form 2", True, True,False, 0),
            ("BIO201", "Biology", "Sciences", "Form 2", True, True,False, 0),
            ("GEO201", "Geography", "Humanities", "Form 2", False, True,False, 0),
            ("HIST201", "History", "Humanities", "Form 2", False, True,False, 0),
            ("ICT201", "Information Technology", "Sciences", "Form 2", False, True,False, 0),
            ("SHONA201", "Shona Language", "Linguistics", "Form 2", True,True, False, 0),
            ("NDEBE201", "Ndebele Language", "Linguistics", "Form 2", True, True,False, 0),
            ("NAMB201", "Nambya", "Linguistics", "Form 2", True,True, False, 0),
            ("TONG201", "Tonga", "Linguistics", "Form 2", True, True,False, 0),
            ("FRENC201", "French", "Linguistics", "Form 2", True,True, False, 0),
            ("GBL201", "Global Persectives", "Humanities", "Form 2", True, True,False, 0),
            ("RES201", "Religious Studies", "Humanities", "Form 2", False, True,False, 0),
            ("TDG201", "Technical Drawing", "Practicals", "Form 2", False, True,True, 140),
            ("MEW201", "Metal Work", "Practicals", "Form 2", False, True,True, 140),
            ("CTG201", "Clothing Technology", "Practicals", "Form 2", False,True, True, 140),
            ("FSC201", "Food Sciences", "Practicals", "Form 2", False,True, True, 140),
            ("WDW201", "Woodwork", "Practicals", "Form 2", False,True, True, 140),
            ("AGR201", "Agriculture", "Practicals", "Form 2", False,True, True, 140),
            ("ART201", "Art and Design", "Practicals", "Form 2", False,True, True, 140),
            ("BUS201", "Business Studies", "Commercials", "Form 2", False, True,False, 0),
            ("ACC201", "Accounting", "Commercials", "Form 2", False, True,False, 0), 
            ("ECON201", "Economics", "Commercials", "Form 2", False,True, False, 0),
            ("COMP201", "Computer Science", "Sciences", "Form 2", False, True,False, 0),
            # Form 3 Subjects
            ("MATH301", "Mathematics", "Mathematics", "Form 3", True,True, False, 0),
            ("ENG301", "English Language", "Languages", "Form 3", True,True, False, 0),
            ("PHY301", "Physics", "Sciences", "Form 3", True,True, False, 0),
            ("CHEM301", "Chemistry", "Sciences", "Form 3", True,True, False, 0),
            ("BIO301", "Biology", "Sciences", "Form 3", True,True, False, 0),
            ("BUS301", "Business Studies", "Commerce", "Form 3", False,True, False, 0),
            ("COMP301", "Computer Science", "Sciences", "Form 3", False,True, False, 0),
            ("SHONA301", "Shona Language", "Linguistics", "Form 3", True,True, False, 0),
            ("NDEBE301", "Ndebele Language", "Linguistics", "Form 3", True, True,False, 0),
            ("NAM301", "Nambya", "Linguistics", "Form 3", True,True, False, 0),
            ("TONG301", "Tonga", "Linguistics", "Form 3", True,True, False, 0),
            ("FRENC301", "French", "Linguistics", "Form 3", True,True, False, 0),
            ("GB3101", "Global Persectives", "Humanities", "Form 3", True,True, False, 0),
            ("RES301", "Religious Studies", "Humanities", "Form 3", False,True, False, 0),
            ("TDG301", "Technical Drawing", "Practicals", "Form 3", False,True, True, 140),
            ("MEW301", "Metal Work", "Practicals", "Form 3", False, True,True, 140),
            ("CTG301", "Clothing Technology", "Practicals", "Form 3", False,True, True, 140),
            ("FSC301", "Food Sciences", "Practicals", "Form 3", False,True, True, 140),
            ("WDW301", "Woodwork", "Practicals", "Form 3", False,True, True, 140),
            ("AGR301", "Agriculture", "Practicals", "Form 3", False, True,True, 140),
            ("ART301", "Art and Design", "Practicals", "Form 3", False, True,True, 140),
            ("BUS301", "Business Studies", "Commercials", "Form 3", False, True,False, 0),
            ("ACC301", "Accounting", "Commercials", "Form 3", False, True,False, 0), 
            ("ECON301", "Economics", "Commercials", "Form 3", False,True, False, 0),
            ("COMP301", "Computer Science", "Sciences", "Form 3", False,True, False, 0),
            # Form 4 Subjects (O-Level Completion)
            ("MATH401", "Mathematics", "Mathematics", "Form 4", True,True, False, 0),
            ("ENG401", "English Language", "Languages", "Form 4", True,True, False, 0),
            ("PHY401", "Physics", "Sciences", "Form 4", True,True, False, 0),
            ("CHEM401", "Chemistry", "Sciences", "Form 4", True,True, False, 0),
            ("BIO401", "Biology", "Sciences", "Form 4", True,True, False, 0),
            ("GEO401", "Geography", "Humanities", "Form 4", False,True, False, 0),
            ("HIST401", "History", "Humanities", "Form 4", False,True, False, 0),
            ("SHONA401", "Shona Language", "Linguistics", "Form 4", True,True, False, 0),
            ("NDEBE401", "Ndebele Language", "Linguistics", "Form 4", True,True, False, 0),
            ("NAMB401", "Nambya", "Linguistics", "Form 4", True,True, False, 0),
            ("TON401", "Tonga", "Linguistics", "Form 4", True,True, False, 0),
            ("FRENC401", "French", "Linguistics", "Form 4", True,True, False, 0),
            ("GBL401", "Global Persectives", "Humanities", "Form 4", True,True, False, 0),
            ("RES401", "Religious Studies", "Humanities", "Form 4", False, True,False, 0),
            ("TDG401", "Technical Drawing", "Practicals", "Form 4", False, True,True, 140),
            ("MEW401", "Metal Work", "Practicals", "Form 4", False, True,True, 140),
            ("CTG401", "Clothing Technology", "Practicals", "Form 4", False,True, True, 140),
            ("FSC401", "Food Sciences", "Practicals", "Form 4", False,True, True, 140),
            ("WDW401", "Woodwork", "Practicals", "Form 4", False,True, True, 140),
            ("AGR401", "Agriculture", "Practicals", "Form 4", False,True, True, 140),
            ("ART401", "Art and Design", "Practicals", "Form 4", False,True, True, 140),
            ("BUS401", "Business Studies", "Commercials", "Form 4", False,True, False, 0),
            ("ACC401", "Accounting", "Commercials", "Form 4", False, True,False, 0), 
            ("ECON401", "Economics", "Commercials", "Form 4", False,True, False, 0),
            ("COMP401", "Computer Science", "Sciences", "Form 4", False,True, False, 0),
            # AS-Level (Form 5)
            ("MATH501", "Mathematics", "Mathematics", "Form 5", True,True, False, 0),
            ("PHY501", "Physics", "Sciences", "Form 5", True,True, False, 0),
            ("CHEM501", "Chemistry", "Sciences", "Form 5", True,True, False, 0),
            ("BIO501", "Biology", "Sciences", "Form 5", True,True, False, 0),
            ("BUS501", "Business Studies", "Commercials", "Form 5", False,True, False, 0),
            ("ACC501", "Accounting", "Commercials", "Form 5", False, True,False, 0), 
            ("ECON501", "Economics", "Commercials", "Form 5", False,True, False, 0),
            ("COMP501", "Computer Science", "Sciences", "Form 5", False, True,False, 0),
            ("SHONA501", "Shona Literature", "Linguistics", "Form 5", True,True, False, 0),
            ("NDEBE501", "Ndebele Literature", "Linguistics", "Form 5", True,True, False, 0), 
            ("FRENC501", "French", "Linguistics", "Form 5", True,True, False, 0),
            ("GBL501", "Philosophy", "Humanities", "Form 5", True,True, False, 0),
            ("RES501", "Divinity", "Humanities", "Form 5", False,True, False, 0),
            ("TDG501", "Technical Graphics", "Practicals", "Form 5", False,True, True, 140),
            ("FSC501", "Crop Sciences", "Sciences", "Form 5", False,True, False, 0),
            ("MATH502", "Additional Mathematics", "Mathematics", "Form 5", False,True, True, 140),
            
            # A-Level (Form 6)
            ("MATH601", "Mathematics", "Mathematics", "Form 6", True, True,False, 0),
            ("PHY601", "Physics", "Sciences", "Form 6", True,True,False, 0),
            ("CHEM601", "Chemistry", "Sciences", "Form 6", True,True, False, 0),
            ("BIO601", "Biology", "Sciences", "Form 6", True,True, False, 0),
            ("BUS601", "Business Studies", "Commercials", "Form 6", False,True, False, 0),
            ("COMP601", "Computer Science", "Sciences", "Form 6", False,True, False, 0),
            ("ECON601", "Economics", "Commercials", "Form 6", False,True, False, 0),
            ("SHONA601", "Shona Literature", "Linguistics", "Form 6",True, True, False, 0),
            ("NDEBE601", "Ndebele Literature", "Linguistics", "Form 6",True, True, False, 0), 
            ("FRENC601", "French", "Linguistics", "Form 6", True,True, False, 0),
            ("GBL601", "Philosophy", "Humanities", "Form 6", True,True, False, 0),
            ("RES601", "Divinity", "Humanities", "Form 6", False,True, False, 0),
            ("TDG601", "Technical Graphics", "Practicals", "Form 6", False,True, True, 140),
            ("ACC601", "Accounting", "Commercials", "Form 6", False, True,False, 0), 
            ("FSC601", "Crop Sciences", "Sciences", "Form 6", False,True, False, 0),
            ("MATH602", "Additional Mathematics", "Mathematics", "Form 6", False,True ,True, 140),
        ]
 
 # Validate and process subjects
        bulk_operations = []
        for data in subjects_data:
            validated_data = validate_subject_tuple(data)
            
            subject = {
                "code": validated_data[0],
                "name": validated_data[1],
                "department": validated_data[2],
                "gradeLevel": validated_data[3],
                "isCore": validated_data[4],
                "isRegular": validated_data[5],
                "isPractical": validated_data[6],
                "practical_duration": validated_data[7],
                "lastUpdated": datetime.utcnow()
            }
            
            # Apply grade level filter if specified
            if grade_level and subject['gradeLevel'] != grade_level:
                continue

            # Correct bulk write operation format using UpdateOne
            bulk_operations.append(
                UpdateOne(
                    {"code": subject["code"]},  # filter
                    {
                        "$set": subject,  # update
                        "$setOnInsert": {"_id": ObjectId()}  # only set _id if document is new
                    },
                    upsert=True
                )
            )

        if bulk_operations:
            try:
                result = self.db.subjects.bulk_write(bulk_operations, ordered=False)
                return {
                    "message": "Subjects updated successfully",
                    "matched_count": result.matched_count,
                    "modified_count": result.modified_count,
                    "upserted_count": len(result.upserted_ids) if result.upserted_ids else 0
                }
            except Exception as e:
                print(f"Error during bulk write: {str(e)}")
                return {"error": "Failed to update subjects", "details": str(e)}
        
        return {"message": "No subjects to process"}

    def get_subjects(self, query_params):
        # Original get_subjects implementation remains unchanged
        page = int(query_params.get('page', 1))
        page_size = int(query_params.get('pageSize', 10))
        search = query_params.get('search', '')
        sort_field = query_params.get('sortBy', 'name')
        sort_order = int(query_params.get('sortOrder', 1))
        grade_level = query_params.get('gradeLevel')

        filter_criteria = {}
        if grade_level:
            filter_criteria['gradeLevel'] = grade_level
        
        if search:
            filter_criteria['$or'] = [
                {'name': {'$regex': search, '$options': 'i'}},
                {'code': {'$regex': search, '$options': 'i'}},
                {'department': {'$regex': search, '$options': 'i'}}
            ]

        total_count = self.db.subjects.count_documents(filter_criteria)

        subjects = list(self.db.subjects.find(filter_criteria)
                       .sort(sort_field, sort_order)
                       .skip((page - 1) * page_size)
                       .limit(page_size))

        subjects = [{**subject, "_id": str(subject["_id"])} for subject in subjects]

        return {
            'subjects': subjects,
            'total': total_count,
            'page': page,
            'pageSize': page_size,
            'totalPages': (total_count + page_size - 1) // page_size
        }
    def add_subject(self, subject_data):
        subject_data['_id'] = ObjectId()
        self.db.subjects.insert_one(subject_data)
        return {**subject_data, "_id": str(subject_data["_id"])}

    def edit_subject(self, subject_id, update_data):
        result = self.db.subjects.update_one(
            {"_id": ObjectId(subject_id)}, 
            {"$set": update_data}
        )
        return result.modified_count > 0

    def delete_subject(self, subject_id):
        result = self.db.subjects.delete_one({"_id": ObjectId(subject_id)})
        return result.deleted_count > 0

# Routes
@subject_gen_bp.route("/generate_subjects", methods=["POST"])
def create_subjects():
    grade_level = request.json.get("gradeLevel")
    subject_service = SubjectService(current_app.db)
    subjects = subject_service.generate_subjects(grade_level)
    return jsonify({
        "message": "Subjects generated successfully",
        "count": len(subjects)
    })

@subject_gen_bp.route("/subjects", methods=["GET"])
def list_subjects():
    subject_service = SubjectService(current_app.db)
    result = subject_service.get_subjects(request.args)
    return jsonify(result)

@subject_gen_bp.route("/add_subject", methods=["POST"])
def add_subject():
    subject_service = SubjectService(current_app.db)
    new_subject = subject_service.add_subject(request.json)
    return jsonify({
        "message": "Subject added successfully",
        "subject": new_subject
    })

@subject_gen_bp.route("/edit_subject/<subject_id>", methods=["PUT"])
def edit_subject(subject_id):
    subject_service = SubjectService(current_app.db)
    success = subject_service.edit_subject(subject_id, request.json)
    return jsonify({
        "message": "Subject updated successfully" if success else "Subject not found"
    })

@subject_gen_bp.route("/delete_subject/<subject_id>", methods=["DELETE"])
def delete_subject(subject_id):
    subject_service = SubjectService(current_app.db)
    success = subject_service.delete_subject(subject_id)
    return jsonify({
        "message": "Subject deleted successfully" if success else "Subject not found"
    })