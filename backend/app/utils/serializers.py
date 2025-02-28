# app/utils/serializers.py
from bson import ObjectId
from datetime import datetime
from mongoengine.base import BaseDocument
from typing import Any, Dict, List, Union

class MongoSerializer:
    @staticmethod
    def serialize_document(doc: BaseDocument) -> Dict:
        """
        Serialize a MongoDB document to a dictionary.
        """
        if not doc:
            return None
            
        data = {}
        for field_name in doc._fields:
            value = getattr(doc, field_name)
            data[field_name] = MongoSerializer.serialize_value(value)
        return data
    
    @staticmethod
    def serialize_value(value: Any) -> Union[Dict, List, str, int, float, bool, None]:
        """
        Serialize a value from a MongoDB document.
        """
        if isinstance(value, ObjectId):
            return str(value)
        elif isinstance(value, datetime):
            return value.isoformat()
        elif isinstance(value, BaseDocument):
            return MongoSerializer.serialize_document(value)
        elif isinstance(value, list):
            return [MongoSerializer.serialize_value(item) for item in value]
        elif isinstance(value, dict):
            return {k: MongoSerializer.serialize_value(v) for k, v in value.items()}
        return value
