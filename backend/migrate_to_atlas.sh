#!/bin/bash

# Step 1: Dump your local database
echo "Dumping local database..."
mongodump --db school_management_system --out ./mongo_backup

# Step 2: Restore to Atlas
# Replace the connection string with your actual Atlas connection string
echo "Restoring to MongoDB Atlas..."
mongorestore --uri "mongodb+srv://lmasvaya:Pamela1977&&@hwange1.opzrn.mongodb.net" --db school_management_system ./mongo_backup/school_management_system

echo "Migration complete!"