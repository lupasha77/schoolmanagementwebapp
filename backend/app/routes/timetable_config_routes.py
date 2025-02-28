# app/routes/timetable_config_routes.py
from flask import Blueprint, request, jsonify
from app.services.timetable_config_service import TimetableConfigService
from app.middleware.auth_middleware import auth_required
import logging

logger = logging.getLogger(__name__)

timetable_config_bp = Blueprint('timetable_config', __name__)

def init_timetable_config_routes(app, db_client):
    """
    Initialize timetable configuration routes
    """
    config_service = TimetableConfigService(db_client)

    @timetable_config_bp.route('/config', methods=['GET'])
    def get_config():
        """
        Get current timetable configuration
        """
        try:
            config = config_service.get_config()
            return jsonify({"success": True, "data": config}), 200
        except Exception as e:
            logger.error(f"Error in get_config: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 500

    @timetable_config_bp.route('/config', methods=['PUT'])
    @auth_required(['admin'])
    def update_config():
        """
        Update entire timetable configuration
        """
        try:
            config_data = request.json
            updated_config = config_service.save_config(config_data)
            return jsonify({"success": True, "data": updated_config}), 200
        except Exception as e:
            logger.error(f"Error in update_config: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 500

    @timetable_config_bp.route('/config/section/<section_name>', methods=['PUT'])
    @auth_required(['admin'])
    def update_config_section(section_name):
        """
        Update a specific section of timetable configuration
        """
        try:
            section_data = request.json
            updated_config = config_service.update_config_section(section_name, section_data)
            return jsonify({"success": True, "data": updated_config}), 200
        except Exception as e:
            logger.error(f"Error in update_config_section: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 500

    @timetable_config_bp.route('/config/constant', methods=['POST'])
    @auth_required(['admin'])
    def add_new_constant():
        """
        Add a new constant to the configuration
        """
        try:
            data = request.json
            if 'name' not in data or 'value' not in data:
                return jsonify({"success": False, "error": "Missing name or value for constant"}), 400
                
            updated_config = config_service.add_new_constant(data['name'], data['value'])
            return jsonify({"success": True, "data": updated_config}), 201
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 400
        except Exception as e:
            logger.error(f"Error in add_new_constant: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 500

    @timetable_config_bp.route('/config/defaults', methods=['GET'])
    def get_default_config():
        """
        Get default timetable configuration
        """
        try:
            default_config = config_service.get_default_config()
            return jsonify({"success": True, "data": default_config}), 200
        except Exception as e:
            logger.error(f"Error in get_default_config: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 500

    # Add the blueprint to the app
    app.register_blueprint(timetable_config_bp, url_prefix='/api/timetable')
    
    return app