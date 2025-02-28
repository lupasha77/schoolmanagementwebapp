# app/config/department_config.py

from typing import Dict
from app.models.school_class_model import Department, SubjectNames, Specialty

DEPARTMENT_CONFIG = {
    Department.SCIENCES.value: {
        'subjects': [
            SubjectNames.PHYSICS.value,
            SubjectNames.CHEMISTRY.value,
            SubjectNames.BIOLOGY.value,
            SubjectNames.GENERAL_SCIENCE.value
        ],
        'specialty': Specialty.SCIENCES.value,
        'position_prefix': 'Science',
        'min_subjects': 2,
        'max_subjects': 3
    },
    Department.MATHEMATICS.value: {
        'subjects': [SubjectNames.MATHEMATICS.value],
        'specialty': Specialty.SCIENCES.value,
        'position_prefix': 'Mathematics',
        'min_subjects': 1,
        'max_subjects': 1
    },
    Department.COMMERCIAL.value: {
        'subjects': [
            SubjectNames.ACCOUNTING.value,
            SubjectNames.ECONOMICS.value,
            SubjectNames.BUSINESS_STUDIES.value
        ],
        'specialty': Specialty.COMMERCIAL.value,
        'position_prefix': 'Commercial',
        'min_subjects': 1,
        'max_subjects': 2
    },
    Department.ARTS.value: {
        'subjects': [
            SubjectNames.ART_AND_DESIGN.value,
            SubjectNames.MUSIC.value
        ],
        'specialty': Specialty.ARTS.value,
        'position_prefix': 'Arts',
        'min_subjects': 1,
        'max_subjects': 2
    },
    Department.LINGUISTICS.value: {
        'subjects': [
            SubjectNames.ENGLISH_LANGUAGE.value,
            SubjectNames.SHONA.value,
            SubjectNames.FRENCH.value
        ],
        'specialty': Specialty.HUMANITIES.value,
        'position_prefix': 'Languages',
        'min_subjects': 1,
        'max_subjects': 2
    },
    Department.HUMANITIES.value: {
        'subjects': [
            SubjectNames.HISTORY.value,
            SubjectNames.RELIGIOUS_STUDIES.value
        ],
        'specialty': Specialty.HUMANITIES.value,
        'position_prefix': 'Humanities',
        'min_subjects': 1,
        'max_subjects': 2
    },
    Department.GEOGRAPHY.value: {
        'subjects': [SubjectNames.GEOGRAPHY.value],
        'specialty': Specialty.HUMANITIES.value,
        'position_prefix': 'Geography',
        'min_subjects': 1,
        'max_subjects': 1
    },
    Department.COMPUTERS.value: {
        'subjects': [SubjectNames.COMPUTER_SCIENCE.value],
        'specialty': Specialty.SCIENCES.value,
        'position_prefix': 'Computer Science',
        'min_subjects': 1,
        'max_subjects': 1
    },
    Department.PRACTICALS.value: {
        'subjects': [
            SubjectNames.AGRICULTURE.value,
            SubjectNames.PHYSICAL_EDUCATION.value
        ],
        'specialty': Specialty.SCIENCES.value,
        'position_prefix': 'Practical',
        'min_subjects': 1,
        'max_subjects': 2
    }
}


def get_department_config(department: str) -> Dict:
    """
    Get configuration for a specific department including subject limits and specialty.
    
    Args:
        department (str): Department name
    
    Returns:
        Dict: Department configuration including subjects, min/max subjects, etc.
    """
    base_config = {
        'min_subjects': 1,
        'max_subjects': 3,
        'specialty': None,
        'position_prefix': '',
        'subjects': []
    }
    
    dept_configs = {
        'sciences': {
            'subjects': ['Biology', 'Chemistry', 'Physics', 'Combined Science'],
            'min_subjects': 1,
            'max_subjects': 2,
            'specialty': 'Science Education',
            'position_prefix': 'Science'
        },
        'mathematics': {
            'subjects': ['Pure Mathematics', 'Statistics', 'Additional Mathematics'],
            'min_subjects': 1,
            'max_subjects': 2,
            'specialty': 'Mathematics Education',
            'position_prefix': 'Mathematics'
        },
        'languages': {
            'subjects': ['English Language', 'English Literature', 'Shona', 'Ndebele'],
            'min_subjects': 1,
            'max_subjects': 2,
            'specialty': 'Language Education',
            'position_prefix': 'Language'
        },
        'humanities': {
            'subjects': ['History', 'Geography', 'Religious Studies'],
            'min_subjects': 1,
            'max_subjects': 2,
            'specialty': 'Humanities Education',
            'position_prefix': 'Humanities'
        },
        'commercial': {
            'subjects': ['Accounting', 'Business Studies', 'Economics', 'Commerce'],
            'min_subjects': 1,
            'max_subjects': 2,
            'specialty': 'Commercial Education',
            'position_prefix': 'Commercial'
        },
        'technical': {
            'subjects': ['Computer Science', 'Technical Drawing', 'Metal Work', 'Wood Work'],
            'min_subjects': 1,
            'max_subjects': 2,
            'specialty': 'Technical Education',
            'position_prefix': 'Technical'
        }
    }
    
    config = dept_configs.get(department, base_config)
    
    # Ensure max_subjects is at least equal to min_subjects
    if config['max_subjects'] < config['min_subjects']:
        config['max_subjects'] = config['min_subjects']
    
    # Ensure max_subjects doesn't exceed available subjects
    if config['max_subjects'] > len(config['subjects']):
        config['max_subjects'] = len(config['subjects'])
    
    return config