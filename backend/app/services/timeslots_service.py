from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import logging

# Set up logger
logger = logging.getLogger(__name__)

class PeriodService:
    """Service for handling period configurations"""
    
    def __init__(self, db):
        self.db = db
        self._periods_config = None
        self._config_last_updated = None
def load_period_configuration(self, force_refresh=False):
    """Load period configuration from database or use default if not found"""
    # Return cached configuration if available and no refresh is forced
    if hasattr(self, "_periods_config") and not force_refresh:
        return self._periods_config
    
    # Try to fetch configuration from database
    config = self.db.configurations.find_one({"type": "periods"})
    
    if config and "periods" in config:
        # Convert string keys to integers for easier access
        periods = {int(k): v for k, v in config["periods"].items()}
        self._periods_config = periods
        self._config_last_updated = datetime.now()
        return periods
    
    # Default configuration if not found in database
    default_periods = {
            "1": {"start": "7:00", "end": "7:05", "type": "Registration"},
            "2": {"start": "7:05", "end": "7:40", "type": "lesson"},
            "3": {"start": "7:40", "end": "8:15", "type": "lesson"},
            "4": {"start": "8:15", "end": "8:50", "type": "lesson"},
            "5": {"start": "8:50", "end": "9:25", "type": "lesson"},
            "6": {"start": "9:25", "end": "9:40", "type": "Morning Break Time","name": "Short Break"},
            "7": {"start": "9:40", "end": "10:15", "type": "lesson"},
            "8": {"start": "10:15", "end": "10:50",  "type": "lesson"},
            "9": {"start": "10:50", "end": "11:25", "type": "lesson"},
            "10": {"start": "11:25", "end": "12:00", "type": "lesson"},
            "11": {"start": "12:00", "end": "13:00", "type": "Lunch Break Time", "name": "Lunch Break"},
            "12": {"start": "13:00", "end": "16:00", "type": "Sporting/Clubs/Extracurricular"},
    }
    
    # Store default config in database for future use
    self.db.configurations.update_one(
        {"type": "periods"},
        {"$set": {"periods": {str(k): v for k, v in default_periods.items()}}},
        upsert=True
    )
    
    self._periods_config = default_periods
    self._config_last_updated = datetime.now()
    return default_periods

def get_period_time(self, period):
    """Get the time slot for a specific period"""
    # Check if config needs refresh (every 5 minutes)
    if (hasattr(self, "_config_last_updated") and 
        (datetime.now() - self._config_last_updated).total_seconds() > 300):
        self.load_period_configuration(force_refresh=True)
    elif not hasattr(self, "_periods_config"):
        self.load_period_configuration()
    
    period = int(period)
    if period in self._periods_config:
        period_data = self._periods_config[period]
        return f"{period_data['start']} - {period_data['end']}"
    
    return "Unknown"

def is_break_period(self, period):
    """Check if a period is a break period"""
    if not hasattr(self, "_periods_config"):
        self.load_period_configuration()
    
    period = int(period)
    period_data = self._periods_config.get(period, {})
    return period_data.get("type") == "break"

def get_period_by_time(self, time_str):
    """Find which period contains a specific time"""
    if not hasattr(self, "_periods_config"):
        self.load_period_configuration()
    
    # Parse the input time
    try:
        # Handle both HH:MM and HH:MM:SS formats
        if len(time_str.split(':')) == 2:
            hours, minutes = map(int, time_str.split(':'))
            current_time = datetime.now().replace(hour=hours, minute=minutes, second=0, microsecond=0)
        else:
            hours, minutes, seconds = map(int, time_str.split(':'))
            current_time = datetime.now().replace(hour=hours, minute=minutes, second=seconds, microsecond=0)
    except ValueError:
        return None
    
    # Check each period
    for period_id, period_data in self._periods_config.items():
        start_parts = list(map(int, period_data['start'].split(':')))
        start_time = datetime.now().replace(
            hour=start_parts[0], 
            minute=start_parts[1], 
            second=0, 
            microsecond=0
        )
        
        end_parts = list(map(int, period_data['end'].split(':')))
        end_time = datetime.now().replace(
            hour=end_parts[0], 
            minute=end_parts[1], 
            second=0, 
            microsecond=0
        )
        
        if start_time <= current_time < end_time:
            return {
                'period': period_id,
                'type': period_data.get('type', 'lesson'),
                'name': period_data.get('name', ''),
                'time': f"{period_data['start']} - {period_data['end']}"
            }
    
    return None