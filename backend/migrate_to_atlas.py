#!/usr/bin/env python
"""
MongoDB Migration Script - Local to Atlas
Requires pymongo: pip install pymongo
"""
import pymongo
import sys
import time

# Connection parameters
LOCAL_URI = "mongodb://localhost:27017/"
ATLAS_URI = "mongodb+srv://lmasvaya:Pamela1977&&@hwange1.opzrn.mongodb.net/?retryWrites=true&w=majority&appName=Hwange1"
DATABASE_NAME = "school_management_system"

def migrate_collection(local_db, atlas_db, collection_name):
    """Migrate a single collection from local to Atlas"""
    print(f"Migrating collection: {collection_name}")
    local_collection = local_db[collection_name]
    atlas_collection = atlas_db[collection_name]
    
    # Get all documents from local
    documents = list(local_collection.find())
    
    if not documents:
        print(f"  No documents found in {collection_name}")
        return 0
    
    # If documents exist, insert them to Atlas
    if len(documents) > 0:
        # Remove _id if you want MongoDB to generate new ones
        # for doc in documents:
        #     if '_id' in doc:
        #         del doc['_id']
        
        # Insert in batches of 100
        batch_size = 100
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i+batch_size]
            try:
                # Use insert_many for better performance with ordered=False to continue on error
                atlas_collection.insert_many(batch, ordered=False)
            except pymongo.errors.BulkWriteError as e:
                # Some documents might have failed to insert (e.g., duplicate keys)
                print(f"  Warning: {e.details['writeErrors']} errors during batch insert")
        
        print(f"  Migrated {len(documents)} documents to {collection_name}")
        return len(documents)
    return 0

def main():
    """Main migration function"""
    try:
        # Connect to both databases
        print("Connecting to local MongoDB...")
        local_client = pymongo.MongoClient(LOCAL_URI)
        local_db = local_client[DATABASE_NAME]
        
        print("Connecting to MongoDB Atlas...")
        atlas_client = pymongo.MongoClient(ATLAS_URI)
        atlas_db = atlas_client[DATABASE_NAME]
        
        # Test connections
        local_client.admin.command('ping')
        atlas_client.admin.command('ping')
        print("Connected to both databases successfully!")
        
        # Get all collections from local database
        collection_names = local_db.list_collection_names()
        print(f"Found {len(collection_names)} collections to migrate")
        
        # Migrate each collection
        total_docs = 0
        for collection in collection_names:
            docs_migrated = migrate_collection(local_db, atlas_db, collection)
            total_docs += docs_migrated
            # Small delay to avoid overwhelming the server
            time.sleep(0.1)
        
        print(f"Migration complete! Migrated {total_docs} documents across {len(collection_names)} collections")
        
    except pymongo.errors.ConnectionFailure as e:
        print(f"Connection error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        # Close connections
        if 'local_client' in locals():
            local_client.close()
        if 'atlas_client' in locals():
            atlas_client.close()

if __name__ == "__main__":
    main()