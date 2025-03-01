# backend/tests/mongo_atlas_test.py
from pymongo import MongoClient
import os

mongo_uri = os.getenv('MONGO_URI')
client = MongoClient(mongo_uri)
db = "Hwange1"  # Replace 'test' with your database name
print(db.list_collection_names())  # Should list collections in the test database
