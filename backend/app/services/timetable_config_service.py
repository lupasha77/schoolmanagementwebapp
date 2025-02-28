# app/services/timetable_config_service.py
from typing import Dict, Any, List, Optional
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config.timetable_config import TimetableConfig
from pymongo import MongoClient
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

class TimetableConfigService:
    def __init__(self, db_client):
        self.db = db_client
        self.config_collection = self.db.configurations

    def get_default_config(self) -> Dict:
        """
        Get the default configuration from TimetableConfig class
        """
        return TimetableConfig.get_config()

    def get_config(self) -> Dict:
        """
        Get the current configuration from the database or fallback to defaults
        """
        try:
            config = self.config_collection.find_one({"type": "timetable_config"})
            if config:
                # Remove MongoDB _id before returning
                if "_id" in config:
                    config["_id"] = str(config["_id"])
                return config
            else:
                # If no config exists, return default and save it
                default_config = self.get_default_config()
                default_config["type"] = "timetable_config"
                self.save_config(default_config)
                return default_config
        except Exception as e:
            logger.error(f"Error fetching timetable config: {str(e)}")
            return self.get_default_config()

    def save_config(self, config_data: Dict) -> Dict:
        """
        Save configuration to database
        """
        try:
            # Ensure the config has the correct type
            config_data["type"] = "timetable_config"
            
            # Check if config already exists
            existing_config = self.config_collection.find_one({"type": "timetable_config"})
            
            if existing_config:
                # Update existing config
                self.config_collection.update_one(
                    {"_id": existing_config["_id"]},
                    {"$set": config_data}
                )
                config_data["_id"] = str(existing_config["_id"])
            else:
                # Insert new config
                result = self.config_collection.insert_one(config_data)
                config_data["_id"] = str(result.inserted_id)
            
            return config_data
        except Exception as e:
            logger.error(f"Error saving timetable config: {str(e)}")
            raise

    def update_config_section(self, section_name: str, section_data: Dict) -> Dict:
        """
        Update a specific section of the configuration
        """
        try:
            config = self.get_config()
            
            # Update the specific section
            config[section_name] = section_data
            
            # Save the updated config
            return self.save_config(config)
        except Exception as e:
            logger.error(f"Error updating config section {section_name}: {str(e)}")
            raise
    
    def add_new_constant(self, constant_name: str, constant_value: Any) -> Dict:
        """
        Add a new constant to the configuration
        """
        try:
            config = self.get_config()
            
            # Check if constant already exists
            if constant_name in config:
                raise ValueError(f"Constant {constant_name} already exists")
            
            # Add the new constant
            config[constant_name] = constant_value
            
            # Save the updated config
            return self.save_config(config)
        except Exception as e:
            logger.error(f"Error adding new constant {constant_name}: {str(e)}")
            raise