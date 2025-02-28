# app/utils/db_utils.py
from bson import ObjectId
from datetime import datetime
from typing import Dict, Any

def serialize_mongo_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert MongoDB document to JSON-serializable format."""
    if doc is None:
        return None
        
    result = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = serialize_mongo_doc(value)
        elif isinstance(value, list):
            result[key] = [serialize_mongo_doc(item) if isinstance(item, dict) else str(item) if isinstance(item, ObjectId) else item for item in value]
        else:
            result[key] = value
    return result
