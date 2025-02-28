# app/utils/json_encoder.py
from bson import ObjectId
from datetime import datetime
from flask.json.provider import JSONProvider
from mongoengine.base import BaseDocument
from mongoengine.queryset.queryset import QuerySet

class MongoJSONProvider(JSONProvider):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, BaseDocument):
            return obj.to_mongo()
        if isinstance(obj, QuerySet):
            return list(obj)
        return super().default(obj)