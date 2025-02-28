# //app/services/timetable_service.py
from copy import deepcopy
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
from bson import ObjectId
import random
from flask import current_app
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.app.services.timeslots_service import PeriodService
from config.timetable_config import TimetableConfig, GradeLevel, Department, SubjectNames 
import logging
from typing import Dict, List

# Initialize logger
logger = logging.getLogger(__name__)
  
 
class TimetableService:
    def __init__(self, db):
        self.db = db
        self.config = TimetableConfig.get_config()
        self.slots = self._generate_time_slots()
        self._load_academic_settings()
        self._cache_db_data()
        self.period_service = PeriodService(db)
    def _cache_db_data(self):
        """Cache necessary database queries"""
        # Cache subjects with grade level mapping
        self.subjects_by_grade = defaultdict(list)
        subjects = self.db.subjects.find()
        for subject in subjects:
            self.subjects_by_grade[subject['gradeLevel']].append({
                'code': subject['code'],
                'name': subject['name'],
                'isPractical': subject.get('isPractical', False),
                'isCore': subject.get('isCore', False)
            })

        # Cache teacher data
        self.teachers = {}
        teachers = self.db.staffs.find({'roleArea': 'teaching'})
        for teacher in teachers:
            teacher_id = str(teacher['_id'])
            self.teachers[teacher_id] = {
                'name': f"{teacher.get('firstName', '')} {teacher.get('lastName', '')}",
                'subjects': teacher.get('subjects', []),
                'gradeLevels': teacher.get('gradeLevels', []),
                'maxWorkload': self.calculate_max_teacher_workload(teacher)
            }

    def get_teacher_by_id(self, teacher_id):
            """Find teacher in staffs collection and convert ObjectId to string"""
            teacher = self.db.staffs.find_one({
                '_id': ObjectId(teacher_id),
                'roleArea': 'teaching'
            })
            
            if teacher:
                teacher['_id'] = str(teacher['_id'])
            
            return teacher
    def get_grade_levels(self):
        """Get all gradeLevels and classes"""
        return {
            "Form 1": ["Form 1A", "Form 1B", "Form 1C", "Form 1D", "Form 1E"],
            "Form 2": ["Form 2A", "Form 2B", "Form 2C", "Form 2D", "Form 2E"],
            "Form 3": ["Form 3A", "Form 3B", "Form 3C", "Form 3D", "Form 3E"],
            "Form 4": ["Form 4A", "Form 4B", "Form 4C", "Form 4D", "Form 4E"]
        }
    
    def generate_school_timetable(self) -> Dict:
        """Generate complete school timetable"""
        result = {}
        
        for grade in GradeLevel:
            result[grade.value] = {}
            streams = ['A', 'B', 'C', 'D', 'E']
            
            max_students = (self.config['DEFAULT_JUNIOR_MAX_STUDENTS_PER_CLASS'] 
                          if GradeLevel.is_junior(grade) 
                          else self.config['DEFAULT_SENIOR_MAX_STUDENTS_PER_CLASS'])
            
            for stream in streams:
                class_name = f"{grade.value}{stream}"
                result[grade.value][class_name] = self.generate_class_timetable(
                    grade.value, 
                    class_name,
                    max_students
                )
                
        return result

    

    def _select_subject(self, subjects: List[Dict], period: int, day: str, 
                       teacher_assignments: Dict) -> Dict:
        """Select appropriate subject for the period"""
        # Prioritize core subjects in morning periods
        if period < 3:
            core_subjects = [s for s in subjects if s['isCore']]
            if core_subjects:
                return random.choice(core_subjects)
        
        # Avoid consecutive practical sessions
        practical_subjects = [s for s in subjects if s['isPractical']]
        if practical_subjects and period > 0:
            return random.choice([s for s in subjects if not s['isPractical']])
            
        return random.choice(subjects)

    
    def _get_grade_subjects(self, gradeLevel: str) -> Dict[str, List[str]]:
        if not gradeLevel or gradeLevel == 'null':
            raise ValueError("Invalid grade level provided")
        
        # Initialize default result
        result = {
            'regular': [],
            'core': [],
            'practical': []
        }
        
        try:
            subjects_cursor = self.db.subjects.find({'gradeLevel': gradeLevel})
            if subjects_cursor is None:
                logger.error(f"Database query returned None for grade level: {gradeLevel}")
                return result
                
            subjects = list(subjects_cursor)
            if not subjects:
                logger.warning(f"No subjects found for grade level: {gradeLevel}")
                return result
            
            for subject in subjects:
                if not isinstance(subject, dict):
                    logger.error(f"Invalid subject format: {subject}")
                    continue
                    
                subject_code = subject.get('code')
                if not subject_code:
                    continue
                    
                if subject.get('isPractical'):
                    result['practical'].append(subject_code)
                if subject.get('isCore'):
                    result['core'].append(subject_code)
                if not subject.get('isPractical'):
                    result['regular'].append(subject_code)
                    
            return result
            
        except Exception as e:
            logger.error(f"Error fetching subjects: {str(e)}")
            return result

    def _calculate_subject_distribution(self, subjects: Dict[str, List[str]], practical_count: int) -> Dict[str, int]:
        """Calculate slots needed for each subject based on type"""
        total_slots = self.config['SLOTS_PER_DAY'] * len(self.config['WEEK_DAYS'])
        practical_slots = practical_count * 2  # Each practical takes 2 slots
        remaining_slots = total_slots - practical_slots
        
        distribution = {}
        
        # Allocate slots for core subjects
        core_subjects = subjects['core']
        core_slots_per_subject = max(4, remaining_slots // (len(core_subjects) + len(subjects['regular'])))
        
        for subject in core_subjects:
            distribution[subject] = core_slots_per_subject
            
        # Allocate remaining slots to regular subjects
        regular_slots = remaining_slots - (core_slots_per_subject * len(core_subjects))
        regular_slots_per_subject = regular_slots // len(subjects['regular'])
        
        for subject in subjects['regular']:
            if subject not in distribution:  # Avoid duplicates if subject is both core and regular
                distribution[subject] = regular_slots_per_subject
                
        return distribution

    def get_school_timetable(cls, db):
        """Get complete school timetable"""
        try:
            config = db.config.find_one({'type': 'timetable'})
            if not config:
                raise ValueError("Timetable configuration not found")
                
            timetable_service = cls(config=config, db=db)
            
            # Get all grade levels from subjects collection
            grade_levels = db.subjects.distinct('gradeLevel')
            
            result = {}
            for grade_level in grade_levels:
                result[grade_level] = {}
                
                # Get streams for this grade level
                streams = ['A', 'B', 'C', 'D', 'E']  # Could be fetched from config
                
                for stream in streams:
                    class_name = f"{grade_level}{stream}"
                    class_data = {
                        'gradeLevel': grade_level,
                        'classroom': f'Room-{class_name}'
                    }
                    
                    class_timetable = timetable_service.generate_class_timetable(class_data)
                    result[grade_level][class_name] = class_timetable
            
            return {
                'success': True,
                'data': result
            }
            
        except Exception as e:
            current_app.logger.error(f"Failed to generate school timetable: {str(e)}")
            return {
                'success': False,
                'message': str(e)
            }
    
    def _schedule_regular_subjects(
        self, 
        subject_distribution: Dict[str, int], 
        available_slots: List[Dict],
        timetable: Dict,
        gradeLevel: str,
        classroom: str
    ):
        """Schedule regular subjects with improved distribution"""
        # Sort subjects by priority (core subjects first)
        sorted_subjects = sorted(
            subject_distribution.items(),
            key=lambda x: (x[0] not in self.config['CORE_SUBJECTS'], x[1]),
            reverse=True
        )
        
        for subject, slots_needed in sorted_subjects:
            slots_allocated = 0
            while slots_allocated < slots_needed and available_slots:
                slot = self._find_optimal_slot(subject, available_slots, gradeLevel)
                if not slot:
                    break
                    
                teacher = self._assign_teacher(subject, slot, gradeLevel)
                if not teacher:
                    available_slots.remove(slot)
                    continue
                    
                lesson = {
                    'subject': subject,
                    'slot': slot,
                    'type': 'regular',
                    'teacher': teacher,
                    'room': classroom
                }
                timetable[slot['day']].append(lesson)
                self.generated_lessons[slot['day']].append(lesson)
                available_slots.remove(slot)
                slots_allocated += 1
                
            if slots_allocated < slots_needed:
                current_app.logger.warning(
                    f"Could only allocate {slots_allocated}/{slots_needed} slots for {subject}"
                )
   
    def _generate_time_slots(self) -> List[Dict]:
        """Generate time slots for the school day"""
        slots = []
        start_time = datetime.strptime(self.config['START_TIME_MORNING'], '%H:%M')
        
        for day in self.config['WEEK_DAYS']:
            current_time = start_time
            for period in range(self.config['SLOTS_PER_DAY']):
                end_time = current_time + timedelta(minutes=self.config['LESSON_DURATION'])
                
                slots.append({
                    'day': day,
                    'period': period,
                    'start_time': current_time.strftime('%H:%M'),
                    'end_time': end_time.strftime('%H:%M'),
                    'is_break': period in [3, 5]  # 4th and 6th periods are breaks
                })
                
                current_time = end_time
                if period in [3, 5]:  # Add break duration
                    current_time += timedelta(minutes=15 if period == 3 else 30)
                    
        return slots

    def _get_available_teachers(self, subject: str, slot: Dict, gradeLevel: str = None) -> List[str]:
        """Get available teachers for a subject in a specific time slot"""
        # Query the database for teachers who teach this subject
        query = {
            'roleArea': 'teaching',
            'subjects': subject
        }
        
        if gradeLevel:
            query['gradeLevels'] = gradeLevel
            
        potential_teachers = list(self.db.staffs.find(query))
        
        available_teachers = []
        for teacher in potential_teachers:
            teacher_id = str(teacher['_id'])  # Convert ObjectId to string
            
            # Check workload and availability
            if (self.teacher_workload[teacher_id] < self.config['MAX_TEACHER_WORKLOAD'] and
                slot['day'] not in self.teacher_availability[teacher_id]):
                available_teachers.append(teacher_id)
                
        return available_teachers if available_teachers else ["Unassigned"]
    def _get_subject_teachers(self, subject: str) -> List[str]:
        """Get all teachers who can teach a specific subject"""
        return [
            teacher_id for teacher_id, data in self.teacher_subjects.items()
            if subject in data['subjects']
        ]

    def _assign_teacher(self, subject: str, slot: Dict, gradeLevel: str) -> Optional[str]:
        """
        Assign teacher to a lesson with improved constraints and preferences
        """
        available_teachers = self._get_available_teachers(subject, slot, gradeLevel)
        
        if not available_teachers:
            return None
            
        # Score each available teacher
        teacher_scores = {}
        for teacher_id in available_teachers:
            teacher_data = self.teacher_subject_mapping[teacher_id]
            score = 0
            
            # Lower score is better
            score += self.teacher_workload[teacher_id] * 2  # Workload weight
            
            # Prefer teachers who specialize in this subject
            if subject in teacher_data.get('specializations', []):
                score -= 3
                
            # Check if teacher has classes immediately before/after
            if self._has_adjacent_classes(teacher_id, slot):
                score += 2
                
            # Consider teacher preferences
            if not self._matches_teacher_preferences(teacher_id, slot):
                score += 5
                
            teacher_scores[teacher_id] = score
        
        # Select teacher with lowest score
        selected_teacher = min(teacher_scores.items(), key=lambda x: x[1])[0]
        
        # Update workload and availability
        self.teacher_workload[selected_teacher] += 1
        self.teacher_availability[selected_teacher][slot['day']].append(slot['start'])
        
        return selected_teacher

    def _find_practical_room(self, practical: str, slots: List[Dict]) -> str:
        """Find available room for practical subject"""
        available_rooms = self.subject_rooms.get(practical, [])
        for room in available_rooms:
            if all(slot['start'] not in self.room_availability[room][slot['day']] 
                   for slot in slots):
                return room
        raise ValueError(f"No available rooms for {practical}")

     
    def _find_optimal_slot(self, subject: str, available_slots: List[Dict], gradeLevel: str) -> Optional[Dict]:
        """Find the best slot for a subject with improved scoring"""
        scored_slots = []
        
        for slot in available_slots:
            if not self._get_available_teachers(subject, slot, gradeLevel):
                continue
                
            score = 0
            
            # Prefer morning slots for core subjects
            if subject in self.config['CORE_SUBJECTS']:
                hour = int(slot['start'].split(':')[0])
                if hour < 12:
                    score += 2
                    
            # Avoid consecutive slots of the same subject
            if not self._has_adjacent_subject(subject, slot):
                score += 3
                
            # Ensure even distribution across the week
            if self._is_well_distributed(subject, slot):
                score += 2
                
            scored_slots.append((slot, score))
            
        return max(scored_slots, key=lambda x: x[1])[0] if scored_slots else None

    def _has_adjacent_subject(self, subject: str, slot: Dict) -> bool:
    # Check if the same subject is scheduled in adjacent slots
        slot_number = slot['slot_number']
        day = slot['day']
        
        for adj_slot in self.slots:
            if (adj_slot['day'] == day and 
                abs(adj_slot['slot_number'] - slot_number) == 1):
                if any(lesson['subject'] == subject 
                        for lesson in self.generated_lessons[day]):
                    return True
        return False

    def _is_well_distributed(self, subject: str, slot: Dict) -> bool:
        # Check if the subject is well distributed across the week
        day = slot['day']
        subject_slots = sum(1 for lesson in self.generated_lessons[day]
                          if lesson['subject'] == subject)
        return subject_slots < 2

    def _optimize_timetable(self, timetable: Dict) -> Dict:
        # Final optimization pass
        optimized = timetable.copy()
        
        for day in self.config['WEEK_DAYS']:
            # Sort slots by time
            optimized[day] = sorted(
                optimized[day],
                key=lambda x: datetime.strptime(x['slot']['start'], '%H:%M')
            )
            
            # Ensure no teacher has too many consecutive slots
            self._balance_teacher_consecutive_slots(optimized[day])
            
        return optimized
    def optimize_teacher_allocations(self, timetable):
        """
        Optimize teacher allocations to balance workload
        """
        # Get validation issues
        issues = self.validate_timetable(timetable)
        
        # Fix overallocations
        if issues['overallocated']:
            for overallocation in issues['overallocated']:
                teacher_id = overallocation['teacher']
                excess = overallocation['assigned'] - overallocation['maximum']
                
                # Find this teacher's allocations
                allocations = self._find_teacher_allocations(timetable, teacher_id)
                
                # Sort allocations by priority (lower priority first for redistribution)
                sorted_allocations = sorted(allocations, key=lambda a: self._get_subject_priority(a['subject']))
                
                # Redistribute excess lessons
                for i in range(min(excess, len(sorted_allocations))):
                    allocation = sorted_allocations[i]
                    
                    # Find alternative teacher
                    alt_teacher = self._find_alternative_teacher(allocation['subject'], teacher_id)
                    
                    if alt_teacher != "Unassigned":
                        # Update allocation
                        timetable[allocation['class']][allocation['day']][allocation['period_index']]['teacher'] = alt_teacher
        
        return timetable
    def _balance_teacher_consecutive_slots(self, day_schedule: List[Dict]):
        max_consecutive = 3
        
        for i in range(len(day_schedule) - max_consecutive):
            consecutive_lessons = day_schedule[i:i + max_consecutive + 1]
            teacher_counts = defaultdict(int)
            
            for lesson in consecutive_lessons:
                teacher_counts[lesson['teacher']] += 1
                
            for teacher, count in teacher_counts.items():
                if count > max_consecutive:
                    # Try to swap with another teacher
                    self._swap_teacher_slots(day_schedule, teacher, i, i + max_consecutive)

    def _swap_teacher_slots(self, schedule: List[Dict], teacher: str, 
                           start_idx: int, end_idx: int):
        for i in range(start_idx, end_idx + 1):
            if schedule[i]['teacher'] == teacher:
                for j in range(len(schedule)):
                    if (j < start_idx or j > end_idx) and \
                       schedule[j]['subject'] == schedule[i]['subject'] and \
                       schedule[j]['teacher'] != teacher:
                        # Swap teachers
                        schedule[i]['teacher'], schedule[j]['teacher'] = \
                            schedule[j]['teacher'], schedule[i]['teacher']
                        break

    def get_available_slots(self, existing_timetable: Dict) -> List[Dict]:
        """
        Get all available slots that haven't been assigned in the existing timetable.
        
        Args:
            existing_timetable (Dict): Current timetable with assigned slots
            
        Returns:
            List[Dict]: List of available slot dictionaries
        """
        available_slots = []
        
        # Get all lesson slots (excluding breaks)
        all_slots = [slot for slot in self.slots if slot['type'] == 'lesson']
        
        # For each slot, check if it's already used in the timetable
        for slot in all_slots:
            day = slot['day']
            is_used = False
            
            # Check if slot is used in existing timetable
            day_schedule = existing_timetable.get(day, [])
            for lesson in day_schedule:
                if lesson['slot']['start'] == slot['start']:
                    is_used = True
                    break
                    
            # If slot isn't used, it's available
            if not is_used:
                available_slots.append(slot)
        
        return available_slots
    
    
    def _find_available_teacher(
        self,
        subject: str,
        day: str,
        period: int,
        available_teachers: Dict,
        teacher_subjects: Dict
    ) -> Optional[str]:
        """Find an available teacher for a subject in the given period"""
        suitable_teachers = []
        
        for teacher_id, periods in available_teachers.items():
            teacher_data = teacher_subjects[teacher_id]
            
            if (subject in teacher_data['subjects'] and
                period in periods and
                teacher_data['workload'][day] < self.config['MAX_TEACHER_WORKLOAD']):
                
                # Score this teacher's suitability
                score = 0
                if subject in self.config['CORE_SUBJECTS']:
                    score += 2  # Prioritize core subject specialists
                if teacher_data['workload'][day] < 4:
                    score += 1  # Prefer teachers with lighter loads
                    
                suitable_teachers.append((teacher_id, score))

        if suitable_teachers:
            # Select teacher with highest score
            return max(suitable_teachers, key=lambda x: x[1])[0]
        
        return None

     
    
    def _load_academic_settings(self):
        """Load current academic year and term from database or use defaults"""
        try:
            # Try to fetch current academic settings from the database
            settings = self.db.settings.find_one({"type": "academic"})
            if settings:
                self.current_academic_year = settings.get("current_academic_year", "2025-2026")
                self.current_term = settings.get("current_term", "1")
            else:
                # Use defaults if no settings found
                self.current_academic_year = "2025-2026"
                self.current_term = "1"
        except Exception as e:
            current_app.logger.warning(f"Could not load academic settings: {str(e)}")
            # Fallback to defaults
            self.current_academic_year = "2025-2026"
            self.current_term = "1"

    def calculate_max_teacher_workload(self, teacher_id: str) -> int:
        """
        Calculate maximum teaching periods per week for a teacher
        """
        try:
            teacher = self.db.staffs.find_one({"_id": teacher_id})
            if not teacher:
                return 25  # Default workload if teacher not found
                
            # Base workload for full-time teachers
            base_workload = 25  # 25 periods per week
            
            # Adjust for employment status
            if teacher.get('employment_status') == 'part_time':
                base_workload = int(base_workload * 0.6)  # 60% of full-time
                
            # Reduce for administrative duties
            admin_duties = teacher.get('administrative_duties', [])
            if admin_duties:
                base_workload -= len(admin_duties) * 2  # Reduce 2 periods per duty
                
            # Adjust for subject complexity
            complex_subjects = ['Physics', 'Chemistry', 'Biology']
            if any(subject in complex_subjects for subject in teacher.get('subjects', [])):
                base_workload -= 2  # Extra prep time for complex subjects
                
            # Ensure minimum workload
            return max(base_workload, 15)  # Minimum 15 periods per week
            
        except Exception as e:
            current_app.logger.error(f"Error calculating workload for teacher {teacher_id}: {str(e)}")
            return 25  # Default fallback



    def calculate_teacher_workload(self, teacher_id):
        """
        Calculate the teacher's actual workload based on scheduled lessons
        
        Returns a dictionary with:
        - total_lessons: total number of lessons taught per week
        - lessons_by_day: breakdown of lessons by day
        - lessons_by_subject: breakdown of lessons by subject
        - lessons_by_grade: breakdown of lessons by grade level
        """
        teacher = self.get_teacher_by_id(teacher_id)
        
        
        if not teacher:
            return None
            
        teacher_schedule = self.generate_teacher_schedule(teacher)
        
        # Initialize workload metrics
        workload = {
            'total_lessons': 0,
            'lessons_by_day': {},
            'lessons_by_subject': {},
            'lessons_by_grade': {}
        }
        
        # Count lessons and categorize them
        for day, lessons in teacher_schedule.items():
            workload['lessons_by_day'][day] = len(lessons)
            workload['total_lessons'] += len(lessons)
            
            for lesson in lessons:
                subject = lesson.get('subject', 'Unknown')
                grade_level = lesson.get('gradeLevel', 'Unknown')
                
                # Count by subject
                if subject not in workload['lessons_by_subject']:
                    workload['lessons_by_subject'][subject] = 0
                workload['lessons_by_subject'][subject] += 1
                
                # Count by grade level
                if grade_level not in workload['lessons_by_grade']:
                    workload['lessons_by_grade'][grade_level] = 0
                workload['lessons_by_grade'][grade_level] += 1
        
        return workload
    def _calculate_teacher_base_workload(self, teacher: Dict) -> int:
            """Calculate teacher's maximum weekly workload"""
            base_workload = self.config['MAX_TEACHER_WORKLOAD']
            
            # Reduce workload for complex subjects
            if any(subject in [SubjectNames.PHYSICS.value, SubjectNames.CHEMISTRY.value, 
                            SubjectNames.BIOLOGY.value] for subject in teacher['subjects']):
                base_workload -= self.config['TEACHER_CONSTRAINTS']['PREP_TIME_COMPLEX_SUBJECTS']
                
            return base_workload

    def determine_workload_status(self, teacher_id, target_lessons_per_week):
        """
        Determine if teacher is optimally loaded, overloaded, or underloaded
        
        Parameters:
        - teacher_id: ID of the teacher
        - target_lessons_per_week: Target number of lessons per week
        
        Returns dictionary with:
        - status: 'underloaded', 'optimal', or 'overloaded'
        - actual_workload: Dictionary with workload details
        - utilization: Percentage of target workload
        - target: Target workload
        """
        workload = self.calculate_teacher_workload(teacher_id)
        
        if not workload:
            return {
                'success': False,
                'message': f'Teacher not found: {teacher_id}'
            }
            
        total_lessons = workload['total_lessons']
        utilization = (total_lessons / target_lessons_per_week) * 100
        
        status = 'optimal'
        if utilization < 80:
            status = 'underloaded'
        elif utilization > 110:
            status = 'overloaded'
        
        return {
            'success': True,
            'status': status,
            'actual_workload': workload,
            'utilization': round(utilization, 2),
            'target': target_lessons_per_week
        }
    
    def _get_subject_for_period(self, subjects: Dict, period: int, gradeLevel: str) -> str:
        """Select subject based on period timing, subject priority, and grade-level stream constraints.
        
        Args:
            subjects: Dictionary mapping subject categories to lists of subjects
            period: The current period number
            gradeLevel: The grade level (e.g., 'Form 1', 'Form 2')
            
        Returns:
            A subject name string based on the selection logic
        """
        # Get stream configurations from DB for the specific grade level
        stream_configs_collection = self.db.stream_configs
        grade_config = stream_configs_collection.find_one({"gradeLevel": gradeLevel}, {"_id": 0, "streams": 1})
        
        if not grade_config or "streams" not in grade_config:
            # Log warning and use default stream
            logging.warning(f"No stream configuration found for grade level: {gradeLevel}")
            streams = "A"  # Default stream if none found
        else:
            # Get all streams for this grade level
            available_streams = grade_config["streams"]
            if not available_streams:
                streams = "A"  # Default if empty list
            else:
                # Use the first stream as default for now
                streams = available_streams[0]
        
        # Fetch stream-specific practical and science periods
        practical_periods = self.config.get("PRACTICAL_PERIODS", {}).get(streams, [])
        science_periods = self.config.get("SCIENCE_PERIODS", {}).get(streams, [])
        
        # Debug information
        logging.debug(f"Period={period}, GradeLevel={gradeLevel}, Stream={streams}, "
                    f"Practical Periods={practical_periods}, Science Periods={science_periods}")
        
        # Assign practical sessions 
        if period in practical_periods:
            practical_subjects = subjects.get("practical", [])
            if practical_subjects:
                return random.choice(practical_subjects)
        
        # Assign science subjects with double-period allocation
        for start, end in science_periods:
            if period == start:  # Only assign on the first period of the block
                science_subjects = subjects.get("science", [])
                if science_subjects:
                    return random.choice(science_subjects)
        
        # Morning core subjects (Periods 0-2)
        if period < 3:
            core_subjects = subjects.get("core", [])
            if core_subjects:
                return random.choice(core_subjects)
        
        # Afternoon slots (periods 4-7, after lunch break which is period 3)
        if period > 3:
            # For afternoon slots, prioritize regular non-core subjects
            regular_subjects = subjects.get("regular", [])
            if regular_subjects:
                return random.choice(regular_subjects)
        
        # Use all available subjects for any other periods
        all_subjects = []
        for category in ["general", "regular", "core"]:
            all_subjects.extend(subjects.get(category, []))
        
        if all_subjects:
            return random.choice(all_subjects)
        
        return "No subject available"  # Fallback if no subjects found
 
    def _get_subjects_by_ids(self, subject_ids):
        """Fetch subject details by ID list"""
        if not subject_ids:
            return []
            
        # Safely convert string IDs to ObjectId
        object_ids = []
        for id_str in subject_ids:
            if not id_str:
                continue
            try:
                object_ids.append(ObjectId(id_str))
            except Exception as e:
                current_app.logger.warning(f"Invalid ObjectId format: {id_str}, error: {str(e)}")
                # Skip this ID and continue
        
        # Fetch subjects from the database
        subjects = list(self.db.subjects.find({'_id': {'$in': object_ids}}))
        
        return subjects

    def _get_subject_for_class_period(self, subjects, period, grade_level, stream):
        """Get a subject for a specific period based on the class's subject list."""
        # Basic distribution logic - can be enhanced with specific rules
        
        # Create a weighted list where core subjects appear more frequently
        weighted_subjects = []
        
        for subject in subjects:
            subject_name = subject.get('name', '')
            if not subject_name:
                continue
                
            # Add core subjects more times to increase their frequency
            if subject.get('department') in ['Mathematics', 'Linguistics',  'Sciences']:
                weighted_subjects.extend([subject_name] * 3)
            # Add practical subjects less frequently
            elif subject.get('department') in ['Practicals', 'ICT', ]:
                weighted_subjects.extend([subject_name] * 2)
            # Add other subjects with normal frequency
            else:
                weighted_subjects.append(subject_name)
        
        # If no subjects, return a placeholder
        if not weighted_subjects:
            return "Unassigned"
        
        # Use period as seed for consistent scheduling
        seed = hash(f"{grade_level}-{stream}-{period}")
        random.seed(seed)
    
        return random.choice(weighted_subjects)
 
    def generate_class_timetable(self, request_data: Dict) -> Dict:
        """Generate a timetable for a specific class based on frontend request data"""
        try:
            # Extract and validate request data
            selected_grade = request_data.get('selectedGrade')
            selected_class = request_data.get('selectedClass')
            
            if not selected_grade or not selected_class:
                raise ValueError("Grade and class must be specified")
            
            # Extract stream from class name - handle both "Form 2A" and "Form 2 A" formats
            if selected_class.startswith(selected_grade):
                stream_part = selected_class[len(selected_grade):].strip()
            else:
                raise ValueError(f"Invalid class name format: {selected_class}")
            
            # Debug log
            logger.info(f"Looking for assignment with: Grade={selected_grade}, Stream={stream_part}, Class={selected_class}")
            
            # Check for existing subject assignments with more flexibility
            existing_assignment = None
            
            # First, try to find by grade and stream (most reliable fields)
            existing_assignment = self.db.subject_class_assignment.find_one({
                'gradeLevel': selected_grade,
                'stream': stream_part
            })
            
            if existing_assignment:
                logger.info(f"Found assignment by grade and stream: {existing_assignment['className']}")
                
                # Update selected_class to match the database format if needed
                selected_class = existing_assignment['className']
            else:
                # Try with different class name formats
                possible_class_names = [
                    selected_class,
                    f"{selected_grade} {stream_part}",
                    f"{selected_grade}{stream_part}",
                    f"{selected_grade}-{stream_part}"
                ]
                
                for class_name in possible_class_names:
                    logger.info(f"Trying to find assignment with className: {class_name}")
                    existing_assignment = self.db.subject_class_assignment.find_one({
                        'className': class_name
                    })
                    if existing_assignment:
                        logger.info(f"Found assignment using class name: {class_name}")
                        selected_class = class_name
                        break
            
            if not existing_assignment:
                # Log all assignments again for debugging
                all_assignments = list(self.db.subject_class_assignment.find())
                logger.info(f"All assignments in database: {[a.get('className') for a in all_assignments]}")
                raise ValueError(f"No subject assignment found for class {selected_class}. Please assign subjects first.")
            
            # Generate the stream timetable
            timetable_result = self.generate_stream_timetable(selected_grade)
            
            if not timetable_result.get('success'):
                logger.error(f"Timetable generation failed: {timetable_result.get('message', 'Unknown error')}")
                return timetable_result
            
            # Extract the timetable for the requested class
            # Important: Use the actual className from the database
            timetable_data = timetable_result.get('data', {}).get(selected_grade, {})
            
            # Debug which class names are available
            available_classes = list(timetable_data.keys())
            logger.info(f"Available classes in timetable: {available_classes}")
            
            # Try to find the class in the timetable with various formats
            class_timetable = None
            for available_class in available_classes:
                # Compare normalized class names (remove spaces, convert to lowercase)
                if available_class.replace(" ", "").lower() == selected_class.replace(" ", "").lower():
                    class_timetable = timetable_data.get(available_class)
                    logger.info(f"Found matching class {available_class} in timetable")
                    break
            
            if not class_timetable:
                raise ValueError(f"Timetable data missing for {selected_class}. Available: {available_classes}")
            
            # Return formatted response
            return {
                'success': True,
                'data': {selected_grade: {selected_class: class_timetable}}
            }
        
        except Exception as e:
            logger.error(f"Failed to generate class timetable: {str(e)}")
            return {
                'success': False,
                'message': f"Failed to generate class timetable: {str(e)}"
            }
    
    def _schedule_practical_subjects(self, all_subjects, class_schedule, teacher_pool, subject_teachers, gradeLevel, stream):
        """
        Schedule practical subjects for a class:
        - 6 time slots per week total
        - 4 slots as one block on a dedicated "practical day"
        - 2 single slots on other days
        - Each class has 2 practical subjects done simultaneously (class splits)
        
        Args:
            all_subjects: List of subject objects
            class_schedule: Current schedule for the class
            teacher_pool: Pool of available teachers
            subject_teachers: Mapping of subjects to teachers
            gradeLevel: Grade level
            stream: Stream name
        
        Returns:
            Updated class schedule with practical subjects scheduled
        """
        # Filter practical subjects
        practical_subjects = [subject for subject in all_subjects 
                            if subject.get('type') == 'practical' or 
                            subject.get('category') == 'practical']
        
        if len(practical_subjects) < 2:
            current_app.logger.warning(f"Not enough practical subjects for {gradeLevel} {stream}")
            return class_schedule
        
        # Select two practical subjects for the class
        selected_practicals = practical_subjects[:2]
        
        # Choose a practical day (preferably middle of the week)
        practical_days = ['Tuesday', 'Wednesday', 'Thursday']
        practical_day = None
        
        # Find the day with the most available consecutive slots
        for day in practical_days:
            # Look for 4 consecutive lesson slots
            consecutive_slots = self._find_consecutive_lesson_slots(class_schedule[day], 4)
            if consecutive_slots:
                practical_day = day
                break
        
        # If no suitable day found, use Monday as fallback
        if not practical_day:
            practical_day = 'Monday'
            consecutive_slots = self._find_consecutive_lesson_slots(class_schedule[practical_day], 4)
        
        # Schedule the block of 4 consecutive slots on the practical day
        if consecutive_slots:
            start_idx = consecutive_slots[0]
            for i in range(4):
                slot_idx = start_idx + i
                if slot_idx < len(class_schedule[practical_day]):
                    # Get lesson periods only
                    lesson_periods = [p for p in class_schedule[practical_day] if p.get('type') == 'lesson']
                    if slot_idx < len(lesson_periods):
                        # Find the corresponding slot in the full schedule
                        for j, period in enumerate(class_schedule[practical_day]):
                            if period.get('type') == 'lesson' and period.get('subject') == 'Unassigned':
                                # Assign both practical subjects to the same slot (class splits)
                                class_schedule[practical_day][j]['type'] = 'practical'
                                class_schedule[practical_day][j]['split'] = True
                                class_schedule[practical_day][j]['subject'] = f"{selected_practicals[0].get('name')} / {selected_practicals[1].get('name')}"
                                
                                # Assign teachers
                                teacher1_id, teacher1_name = self._get_teacher_for_subject(
                                    selected_practicals[0].get('name'),
                                    practical_day,
                                    j,
                                    teacher_pool,
                                    subject_teachers,
                                    {}
                                )
                                
                                teacher2_id, teacher2_name = self._get_teacher_for_subject(
                                    selected_practicals[1].get('name'),
                                    practical_day,
                                    j,
                                    teacher_pool,
                                    subject_teachers,
                                    {}
                                )
                                
                                class_schedule[practical_day][j]['teacher'] = f"{teacher1_name} / {teacher2_name}"
                                
                                # Update teacher workloads
                                if teacher1_id:
                                    teacher_pool[teacher1_id]['current_load'][practical_day] += 1
                                if teacher2_id:
                                    teacher_pool[teacher2_id]['current_load'][practical_day] += 1
                                
                                # Mark as scheduled
                                break
        
        # Schedule 2 single slots on other days
        remaining_days = [day for day in self.config['WEEK_DAYS'] if day != practical_day]
        slots_scheduled = 0
        
        for day in remaining_days:
            if slots_scheduled >= 2:
                break
            
            for i, period in enumerate(class_schedule[day]):
                if period.get('type') == 'lesson' and period.get('subject') == 'Unassigned':
                    # Assign both practical subjects to the same slot (class splits)
                    class_schedule[day][i]['type'] = 'practical'
                    class_schedule[day][i]['split'] = True
                    class_schedule[day][i]['subject'] = f"{selected_practicals[0].get('name')} / {selected_practicals[1].get('name')}"
                    
                    # Assign teachers
                    teacher1_id, teacher1_name = self._get_teacher_for_subject(
                        selected_practicals[0].get('name'),
                        day,
                        i,
                        teacher_pool,
                        subject_teachers,
                        {}
                    )
                    
                    teacher2_id, teacher2_name = self._get_teacher_for_subject(
                        selected_practicals[1].get('name'),
                        day,
                        i,
                        teacher_pool,
                        subject_teachers,
                        {}
                    )
                    
                    class_schedule[day][i]['teacher'] = f"{teacher1_name} / {teacher2_name}"
                    
                    # Update teacher workloads
                    if teacher1_id:
                        teacher_pool[teacher1_id]['current_load'][day] += 1
                    if teacher2_id:
                        teacher_pool[teacher2_id]['current_load'][day] += 1
                    
                    slots_scheduled += 1
                    break
        
        return class_schedule

    def _schedule_math_science_subjects(self, all_subjects, class_schedule, teacher_pool, subject_teachers):
        """
        Schedule Mathematics & Science department subjects:
        - 6 time slots per week total
        - Assigned as double slots
        
        Args:
            all_subjects: List of subject objects
            class_schedule: Current schedule for the class
            teacher_pool: Pool of available teachers
            subject_teachers: Mapping of subjects to teachers
        
        Returns:
            Updated class schedule with math/science subjects scheduled
        """
        # Filter math and science subjects
        math_science_subjects = [subject for subject in all_subjects 
                                if subject.get('department') in ['Mathematics', 'Science']]
        
        for subject in math_science_subjects:
            subject_name = subject.get('name')
            slots_scheduled = 0
            double_slots_needed = 3  # 3 double slots = 6 total slots
            
            # Try to schedule double slots across different days
            for day in self.config['WEEK_DAYS']:
                if double_slots_needed == 0:
                    break
                    
                # Find two consecutive available slots
                consecutive_slots = self._find_consecutive_unassigned_slots(class_schedule[day], 2)
                
                if consecutive_slots:
                    start_idx = consecutive_slots[0]
                    
                    # Get teacher for this subject
                    teacher_id, teacher_name = self._get_teacher_for_subject(
                        subject_name,
                        day,
                        start_idx,
                        teacher_pool,
                        subject_teachers,
                        {}
                    )
                    
                    # Assign double slot
                    for i in range(2):
                        slot_idx = start_idx + i
                        
                        # Mark as double slot
                        class_schedule[day][slot_idx]['subject'] = subject_name
                        class_schedule[day][slot_idx]['teacher'] = teacher_name
                        
                        if i == 0:
                            class_schedule[day][slot_idx]['isDoubleStart'] = True
                        else:
                            class_schedule[day][slot_idx]['isDoubleContinuation'] = True
                        
                        # Update teacher workload
                        if teacher_id:
                            teacher_pool[teacher_id]['current_load'][day] += 1
                    
                    double_slots_needed -= 1
                    slots_scheduled += 2
            
            # If we couldn't schedule all double slots, add single slots to reach 6 total
            remaining_slots = 6 - slots_scheduled
            
            if remaining_slots > 0:
                for day in self.config['WEEK_DAYS']:
                    if remaining_slots == 0:
                        break
                        
                    for i, period in enumerate(class_schedule[day]):
                        if period.get('type') == 'lesson' and period.get('subject') == 'Unassigned':
                            # Get teacher for this subject
                            teacher_id, teacher_name = self._get_teacher_for_subject(
                                subject_name,
                                day,
                                i,
                                teacher_pool,
                                subject_teachers,
                                {}
                            )
                            
                            # Assign single slot
                            class_schedule[day][i]['subject'] = subject_name
                            class_schedule[day][i]['teacher'] = teacher_name
                            
                            # Update teacher workload
                            if teacher_id:
                                teacher_pool[teacher_id]['current_load'][day] += 1
                            
                            remaining_slots -= 1
                            break
        
        return class_schedule

    def _schedule_other_subjects(self, all_subjects, class_schedule, teacher_pool, subject_teachers):
        """
        Schedule other subjects:
        - Minimum of 4 time slots per week
        - At least one double time slot per week
        
        Args:
            all_subjects: List of subject objects
            class_schedule: Current schedule for the class
            teacher_pool: Pool of available teachers
            subject_teachers: Mapping of subjects to teachers
        
        Returns:
            Updated class schedule with other subjects scheduled
        """
        # Filter subjects that are neither practical nor math/science
        other_subjects = [subject for subject in all_subjects 
                        if subject.get('type') != 'practical' and
                            subject.get('category') != 'practical' and
                            subject.get('department') not in ['Mathematics', 'Science']]
        
        for subject in other_subjects:
            subject_name = subject.get('name')
            slots_scheduled = 0
            
            # Schedule one double slot first
            double_slot_scheduled = False
            
            for day in self.config['WEEK_DAYS']:
                if double_slot_scheduled:
                    break
                    
                # Find two consecutive available slots
                consecutive_slots = self._find_consecutive_unassigned_slots(class_schedule[day], 2)
                
                if consecutive_slots:
                    start_idx = consecutive_slots[0]
                    
                    # Get teacher for this subject
                    teacher_id, teacher_name = self._get_teacher_for_subject(
                        subject_name,
                        day,
                        start_idx,
                        teacher_pool,
                        subject_teachers,
                        {}
                    )
                    
                    # Assign double slot
                    for i in range(2):
                        slot_idx = start_idx + i
                        
                        # Mark as double slot
                        class_schedule[day][slot_idx]['subject'] = subject_name
                        class_schedule[day][slot_idx]['teacher'] = teacher_name
                        
                        if i == 0:
                            class_schedule[day][slot_idx]['isDoubleStart'] = True
                        else:
                            class_schedule[day][slot_idx]['isDoubleContinuation'] = True
                        
                        # Update teacher workload
                        if teacher_id:
                            teacher_pool[teacher_id]['current_load'][day] += 1
                    
                    double_slot_scheduled = True
                    slots_scheduled += 2
            
            # Then add single slots to reach minimum of 4 total
            remaining_slots = max(0, 4 - slots_scheduled)
            
            if remaining_slots > 0:
                for day in self.config['WEEK_DAYS']:
                    if remaining_slots == 0:
                        break
                        
                    for i, period in enumerate(class_schedule[day]):
                        if period.get('type') == 'lesson' and period.get('subject') == 'Unassigned':
                            # Get teacher for this subject
                            teacher_id, teacher_name = self._get_teacher_for_subject(
                                subject_name,
                                day,
                                i,
                                teacher_pool,
                                subject_teachers,
                                {}
                            )
                            
                            # Assign single slot
                            class_schedule[day][i]['subject'] = subject_name
                            class_schedule[day][i]['teacher'] = teacher_name
                            
                            # Update teacher workload
                            if teacher_id:
                                teacher_pool[teacher_id]['current_load'][day] += 1
                            
                            remaining_slots -= 1
                            break
        
        return class_schedule

    def _find_consecutive_lesson_slots(self, day_schedule, num_slots):
        """
        Find consecutive lesson slots in a day's schedule
        
        Args:
            day_schedule: Schedule for a single day
            num_slots: Number of consecutive slots needed
        
        Returns:
            List of indices for consecutive slots, or empty list if not found
        """
        lesson_slots = []
        
        for i, period in enumerate(day_schedule):
            if period.get('type') == 'lesson':
                lesson_slots.append(i)
        
        for i in range(len(lesson_slots) - num_slots + 1):
            # Check if slots are consecutive
            is_consecutive = True
            for j in range(1, num_slots):
                if lesson_slots[i+j] != lesson_slots[i+j-1] + 1:
                    is_consecutive = False
                    break
            
            if is_consecutive:
                return lesson_slots[i:i+num_slots]
        
        return []

    def _find_consecutive_unassigned_slots(self, day_schedule, num_slots):
        """
        Find consecutive unassigned lesson slots in a day's schedule
        
        Args:
            day_schedule: Schedule for a single day
            num_slots: Number of consecutive slots needed
        
        Returns:
            List of indices for consecutive unassigned slots, or empty list if not found
        """
        unassigned_slots = []
        
        for i, period in enumerate(day_schedule):
            if period.get('type') == 'lesson' and period.get('subject') == 'Unassigned':
                unassigned_slots.append(i)
        
        for i in range(len(unassigned_slots) - num_slots + 1):
            # Check if slots are consecutive
            is_consecutive = True
            for j in range(1, num_slots):
                if unassigned_slots[i+j] != unassigned_slots[i+j-1] + 1:
                    is_consecutive = False
                    break
            
            if is_consecutive:
                return unassigned_slots[i:i+num_slots]
        
        return []

    def generate_stream_timetable(self, gradeLevel: str) -> Dict:
        """
        Generate timetable for all streams in a grade level with special scheduling requirements:
        1. Practical subjects: 6 slots/week (4 as block, 2 as single slots), class splits into 2
        2. Math & Science: 6 slots/week as double slots
        3. Other subjects: min 4 slots/week with at least one double slot
        
        Args:
            gradeLevel: Grade level to generate timetable for
            
        Returns:
            Dictionary with timetable data
        """
        try:
            # Validate input
            if not gradeLevel or gradeLevel == 'null':
                raise ValueError("Invalid grade level provided")
                
            # Get stream configuration for the grade level to get the list of streams
            stream_config = self.db.stream_configs.find_one({'gradeLevel': gradeLevel})
            if not stream_config:
                raise ValueError(f"No stream configuration found for grade level: {gradeLevel}")
            
            # Get streams from the configuration
            streams = stream_config.get('streams', [])
            if not streams:
                raise ValueError(f"No streams configured for grade level: {gradeLevel}")
            
            # Get period configurations
            periods_data = self.get_period_configurations()
            
            # Create a proper ordered list of lesson periods only
            lesson_periods = []
            for period_id, data in sorted(periods_data.items(), key=lambda x: int(x[0])):
                if data.get('type') == 'lesson':
                    lesson_periods.append({
                        'id': period_id,
                        'start': data.get('start'),
                        'end': data.get('end'),
                        'name': data.get('name', f'Period {period_id}')
                    })
            
            total_lesson_periods = len(lesson_periods)
            
            # Create an ordered list of all periods for the schedule
            all_periods = []
            for period_id, data in sorted(periods_data.items(), key=lambda x: int(x[0])):
                all_periods.append({
                    'id': period_id,
                    'type': data.get('type'),
                    'start': data.get('start'),
                    'end': data.get('end'),
                    'name': data.get('name', f'Period {period_id}')
                })
            
            # Get teachers with validation
            teacher_query = {
                'roleArea': 'teaching',
                'gradeLevels': gradeLevel
            }
            
            teachers = list(self.db.staffs.find(teacher_query))
            if not teachers:
                raise ValueError(f"No teachers found for grade level: {gradeLevel}")
                
            # Initialize teacher pool with validation
            teacher_pool = {}
            for teacher in teachers:
                if not isinstance(teacher, dict):
                    continue
                    
                teacher_id = str(teacher.get('_id'))
                if not teacher_id:
                    continue
                    
                teacher_pool[teacher_id] = {
                    'id': teacher_id,
                    'name': f"{teacher.get('firstName', '')} {teacher.get('lastName', '')}",
                    'subjects': teacher.get('subjects', []),
                    'department': teacher.get('department', ''),
                    'current_load': defaultdict(int)
                }
                
            if not teacher_pool:
                raise ValueError("No valid teachers found")

            # Create subject to teacher mapping for quick lookup
            subject_teachers = defaultdict(list)
            for teacher_id, data in teacher_pool.items():
                for subject in data['subjects']:
                    subject_teachers[subject].append(teacher_id)

            # Initialize subject-teacher mapping for consistent assignments
            self._subject_teacher_mapping = {}
            
            result = {}
            
            # Process each stream
            for stream in streams:
                class_name = f"{gradeLevel} {stream}"
                
                # Get the subject assignments directly from subject_class_assignment collection
                class_subject_assignment = self.db.subject_class_assignment.find_one({
                    'gradeLevel': gradeLevel,
                    'stream': stream,
                    'className': class_name
                })
                
                if not class_subject_assignment:
                    current_app.logger.warning(f"No subject assignments found for class: {class_name}")
                    continue
                    
                # Extract subject details from the assignment
                all_subjects = []
                
                # Add core subjects
                if 'coreSubjectsDetails' in class_subject_assignment:
                    all_subjects.extend(class_subject_assignment['coreSubjectsDetails'])
                
                # Add practical subjects
                if 'practicalSubjectsDetails' in class_subject_assignment:
                    all_subjects.extend(class_subject_assignment['practicalSubjectsDetails'])
                
                # Add elective subjects
                if 'electiveSubjectsDetails' in class_subject_assignment:
                    all_subjects.extend(class_subject_assignment['electiveSubjectsDetails'])
                
                # Check if we have any subjects to work with
                if not all_subjects:
                    current_app.logger.warning(f"No subjects found for class: {class_name}")
                    continue
                    
                # Initialize the class schedule with all periods marked as unassigned
                class_schedule = {day: [] for day in self.config['WEEK_DAYS']}
                
                # Generate initial empty timetable for each day
                for day in self.config['WEEK_DAYS']:
                    # Create a schedule for this day with all periods
                    daily_schedule = []
                    
                    # Process each period in order
                    for period in all_periods:
                        period_id = period['id']
                        period_type = period['type']
                        
                        if period_type != 'lesson':
                            # For non-lesson periods (breaks, registration, etc.)
                            daily_schedule.append({
                                'period_id': period_id,
                                'start': period['start'],
                                'end': period['end'],
                                'type': period_type,
                                'name': period.get('name', period_type.capitalize())
                            })
                        else:
                            # For lesson periods, initialize as unassigned
                            daily_schedule.append({
                                'period_id': period_id,
                                'start': period['start'],
                                'end': period['end'],
                                'type': 'lesson',
                                'subject': 'Unassigned',
                                'teacher': 'Unassigned'
                            })
                    
                    class_schedule[day] = daily_schedule
                
                # 1. Schedule practical subjects first
                class_schedule = self._schedule_practical_subjects(
                    all_subjects, 
                    class_schedule, 
                    teacher_pool, 
                    subject_teachers, 
                    gradeLevel, 
                    stream
                )
                
                # 2. Schedule Mathematics & Science department subjects
                class_schedule = self._schedule_math_science_subjects(
                    all_subjects, 
                    class_schedule, 
                    teacher_pool, 
                    subject_teachers
                )
                
                # 3. Schedule remaining subjects
                class_schedule = self._schedule_other_subjects(
                    all_subjects, 
                    class_schedule, 
                    teacher_pool, 
                    subject_teachers
                )
                
                # result[class_name] = class_schedule
                result = {
                    f"{gradeLevel} A": self._generate_empty_schedule(),
                    f"{gradeLevel} B": self._generate_empty_schedule()
                }
                 

            return {
                'success': True,
                'data': {gradeLevel: result},
                'timetable_data': self._prepare_timetable_for_storage(gradeLevel, result)
            }

        except ValueError as ve:
            current_app.logger.error(f"Validation error in generate_stream_timetable: {str(ve)}")
            return {
                'success': False,
                'message': f"Validation error: {str(ve)}"
            }
        except Exception as e:
            current_app.logger.error(f"Failed to generate stream timetable: {str(e)}", exc_info=True)
            return {
                'success': False,
                'message': f"Failed to generate stream timetable: {str(e)}"
            }
    
    def _get_subject_for_class_period(self, subjects, lesson_index, grade_level, stream):
        """
        Get a subject for a specific lesson period based on the class's subject list.
        
        Args:
            subjects: List of subject dictionaries
            lesson_index: The index of the lesson period (0-based, only counting lesson periods)
            grade_level: Grade level of the class
            stream: Stream of the class
            
        Returns:
            Subject name for the period
        """
        # Group subjects by department
        subjects_by_department = defaultdict(list)
        for subject in subjects:
            subject_name = subject.get('name', '')
            department = subject.get('department', 'Other')
            if subject_name:
                subjects_by_department[department].append(subject_name)
        
        # If no subjects, return a placeholder
        if not subjects_by_department:
            return "Unassigned"
        
        # Create a distribution pattern for the week
        all_departments = list(subjects_by_department.keys())
        
        # Prioritize core departments in the morning periods
        core_departments = ['Mathematics', 'Languages', 'Sciences']
        practical_departments = ['Practicals', 'Commercials', 'ICT', 'Social Sciences', 'Humanities']
        other_departments = [dept for dept in all_departments if dept not in core_departments and dept not in practical_departments]
        
        # Make sure we have at least one department to choose from
        if not core_departments and not practical_departments and not other_departments:
            # If no departments, just use all subjects
            all_subject_names = [subject.get('name', '') for subject in subjects if subject.get('name', '')]
            if not all_subject_names:
                return "Unassigned"
            
            # Create deterministic selection based on period
            seed_value = hash(f"{grade_level}-{stream}-{lesson_index}")
            random.seed(seed_value)
            return random.choice(all_subject_names)
        
        # Create a deterministic department schedule based on the lesson index
        department_schedule = []
        
        # Create a seed for consistent scheduling
        seed_value = hash(f"{grade_level}-{stream}")
        random.seed(seed_value)
        
        # Fill morning periods with core departments (if available)
        morning_periods = min(4, 8)  # Assuming 8 total periods, use first half for morning
        for i in range(morning_periods):
            if core_departments:
                dept = core_departments[i % len(core_departments)]
                department_schedule.append(dept)
            elif practical_departments:
                dept = practical_departments[i % len(practical_departments)]
                department_schedule.append(dept)
            elif other_departments:
                dept = other_departments[i % len(other_departments)]
                department_schedule.append(dept)
        
        # Fill afternoon periods with practical and other departments
        afternoon_departments = practical_departments + other_departments
        for i in range(8 - morning_periods):
            if afternoon_departments:
                dept = afternoon_departments[i % len(afternoon_departments)]
                department_schedule.append(dept)
            elif core_departments:
                dept = core_departments[i % len(core_departments)]
                department_schedule.append(dept)
        
        # Get the department for this period
        period_department = department_schedule[lesson_index % len(department_schedule)]
        
        # Get subjects for this department
        department_subjects = subjects_by_department.get(period_department, [])
        
        # If no subjects in this department, fall back to any subject
        if not department_subjects:
            all_subjects = [s.get('name') for s in subjects if s.get('name')]
            if not all_subjects:
                return "Unassigned"
            
            # Use a consistent seed for the specific period
            random.seed(seed_value + lesson_index)
            return random.choice(all_subjects)
        
        # Use a consistent seed for the specific period
        random.seed(seed_value + lesson_index)
        return random.choice(department_subjects)

    def _get_teacher_for_subject(
        self,
        subject: str,
        day: str,
        lesson_index: int,
        teacher_pool: Dict,
        subject_teachers: Dict,
        daily_assignments: Dict
    ) -> Tuple[str, str]:
        """
        Get available teacher for subject with fallback options.
        Ensures the same teacher teaches the same subject for a class.
        
        Returns: (teacher_id, teacher_name)
        """
        max_daily_periods = 6  # Maximum periods a teacher should teach per day
        
        # Check if we've already assigned a teacher for this subject today
        # This ensures consistent teacher assignment for the same subject
        subject_key = f"{subject}_{day}"
        if hasattr(self, '_subject_teacher_mapping') and subject_key in self._subject_teacher_mapping:
            teacher_id = self._subject_teacher_mapping[subject_key]
            # Verify the teacher is available for this period
            if teacher_id in teacher_pool and (
                teacher_id not in daily_assignments or 
                lesson_index not in daily_assignments[teacher_id]
            ):
                return teacher_id, teacher_pool[teacher_id]['name']
        
        # Safely get teachers who can teach this subject
        potential_teachers = subject_teachers.get(subject, [])
        
        # Filter out teachers that don't exist in teacher_pool
        valid_teachers = [t_id for t_id in potential_teachers if t_id in teacher_pool]
        
        # If no valid teachers found in our initial list, try fallback
        if not valid_teachers:
            try:
                # Get the subject department
                subject_data = self.db.subjects.find_one({'name': subject})
                subject_department = subject_data.get('department') if subject_data else None
                
                # Fallback: Get any teacher who teaches this subject from staffs collection
                # and is in the same department
                query = {
                    'roleArea': 'teaching',
                    'subjects': subject
                }
                
                if subject_department:
                    query['department'] = subject_department
                    
                fallback_teachers = list(self.db.staffs.find(query))
                
                if fallback_teachers:
                    teacher = fallback_teachers[0]
                    teacher_id = str(teacher['_id'])
                    
                    # If this teacher isn't in our pool, add them
                    if teacher_id not in teacher_pool:
                        teacher_pool[teacher_id] = {
                            'id': teacher_id,
                            'name': f"{teacher.get('firstName', '')} {teacher.get('lastName', '')}",
                            'subjects': teacher.get('subjects', []),
                            'department': teacher.get('department', ''),
                            'current_load': defaultdict(int)
                        }
                        # Also add to subject_teachers for future use
                        subject_teachers = defaultdict(list)
                        for teacher_id, data in teacher_pool.items():
                            for subject in data['subjects']:
                                # Only add teacher to subjects they're qualified to teach
                                subject_teachers[subject].append(teacher_id)
                        # for subj in teacher.get('subjects', []):
                        #     if teacher_id not in subject_teachers[subj]:
                        #         subject_teachers[subj].append(teacher_id)
                    
                    # Store this teacher as the designated teacher for this subject
                    self._subject_teacher_mapping[subject_key] = teacher_id
                    return teacher_id, teacher_pool[teacher_id]['name']
            except Exception as e:
                current_app.logger.error(f"Error finding fallback teacher: {str(e)}")
                # Continue to next approach if this fails
        
        # Score and rank available teachers
        scored_teachers = []
        for teacher_id in valid_teachers:
            # Skip if teacher ID doesn't exist in teacher_pool
            if teacher_id not in teacher_pool:
                continue
                
            teacher_data = teacher_pool[teacher_id]
            current_day_load = teacher_data['current_load'].get(day, 0)
            
            # Skip if teacher is already at max daily load
            if current_day_load >= max_daily_periods:
                continue
                
            # Skip if teacher is already assigned to this period
            if teacher_id in daily_assignments and lesson_index in daily_assignments[teacher_id]:
                continue
            
            # Get teacher's department
            teacher_department = teacher_data.get('department', '')
            if not teacher_department:
                try:
                    teacher_info = self.db.staffs.find_one({'_id': ObjectId(teacher_id)})
                    if teacher_info:
                        teacher_department = teacher_info.get('department', '')
                        # Update our cache
                        teacher_data['department'] = teacher_department
                except Exception as e:
                    current_app.logger.warning(f"Error getting teacher department: {str(e)}")
            
            # Get subject's department
            subject_department = ''
            try:
                subject_info = self.db.subjects.find_one({'name': subject})
                if subject_info:
                    subject_department = subject_info.get('department', '')
            except Exception as e:
                current_app.logger.warning(f"Error getting subject department: {str(e)}")
            
            score = 0
            
            # Prefer teachers with lighter loads
            score += (max_daily_periods - current_day_load)
            
            # Strongly prefer teachers from the same department as the subject
            if teacher_department and subject_department and teacher_department == subject_department:
                score += 10
            
            # Prefer teachers who specialize in the subject
            if subject in teacher_data['subjects']:
                score += 5
                
            # Check if this subject is a core subject
            try:
                is_core = False
                subject_doc = self.db.subjects.find_one({'name': subject})
                if subject_doc and subject_doc.get('isCore', False):
                    is_core = True
                    
                # Give higher score for teachers teaching core subjects they specialize in
                if is_core and subject in teacher_data['subjects']:
                    score += 3
            except Exception as e:
                current_app.logger.warning(f"Error checking core subjects: {str(e)}")
                
            scored_teachers.append((teacher_id, score, teacher_data['name']))
        
        if scored_teachers:
            # Select teacher with highest score
            best_match = max(scored_teachers, key=lambda x: x[1])
            # Store this teacher as the designated teacher for this subject
            self._subject_teacher_mapping[subject_key] = best_match[0]
            return best_match[0], best_match[2]
        
        # Ultimate fallback: Try to pick any teacher from the pool if no one is available
        try:
            if teacher_pool:
                fallback_teacher_id = random.choice(list(teacher_pool.keys()))
                self._subject_teacher_mapping[subject_key] = fallback_teacher_id
                return fallback_teacher_id, teacher_pool[fallback_teacher_id]['name']
        except Exception as e:
            current_app.logger.error(f"Error selecting fallback teacher: {str(e)}")
        
        # If all else fails, return None with a clear message
        return None, "No Available Teacher"
    
    def _assign_teacher_to_subject(self, subject, available_teachers, teacher_pool):
        """
        Assign a suitable teacher to a subject, considering their department and specialties
        """
        if not available_teachers:
            return "Unassigned"
            
        # First, try to find a teacher who specializes in this subject
        specialists = [t_id for t_id in available_teachers if subject in teacher_pool[t_id]['subjects']]
        
        # If no specialists, look for teachers from the same department
        if not specialists:
            subject_info = self.get_subject_info(subject)
            if subject_info:
                department = subject_info.get('department', '')
                department_teachers = [t_id for t_id in available_teachers 
                                    if teacher_pool[t_id]['department'] == department]
                if department_teachers:
                    return min(department_teachers, 
                            key=lambda t_id: teacher_pool[t_id]['current_load'].get(subject, 0))
        else:
            return min(specialists, 
                    key=lambda t_id: teacher_pool[t_id]['current_load'].get(subject, 0))
        
        # If still no match, return unassigned
        return "Unassigned"
    
    def _can_assign_teacher(self, teacher_id, teacher_pool):
        """
        Check if a teacher can be assigned more lessons without exceeding max workload
        """
        if teacher_id == "Unassigned":
            return True
            
        # Get teacher's current total workload
        current_total = sum(teacher_pool[teacher_id]['current_load'].values())
        
        # Get teacher's maximum allowed workload
        max_workload = self.calculate_max_teacher_workload(teacher_id)
        
        # Check if adding one more lesson would exceed max workload
        return current_total < max_workload
    def generate_teacher_schedule(self, teacher):
        """Generate schedule for a specific teacher"""
        teacher_schedule = {}
        teacher_name = f"{teacher.get('firstName', '')} {teacher.get('lastName', '')}"
        teacher_subjects = teacher.get('subjects', [])
        teacher_department = teacher.get('department', '')
        logger.info(f"Generating schedule for teacher: {teacher_name}")
        logger.info(f"Subjects: {teacher_subjects}, Department: {teacher_department}")
        
        # Directly query the timetable collection for active timetables
        timetables = self.db.timetables.find({
            "status": "active"
        })
        
        for timetable in timetables:
            grade_level = timetable.get('gradeLevel')
            streams = timetable.get('streams', {})
            
            # Process each stream in the timetable
            for stream_key, stream_data in streams.items():
                class_name = stream_data.get('className')
                schedule = stream_data.get('schedule', {})
                
                # Process each day in the schedule
                for day, periods in schedule.items():
                    if day not in teacher_schedule:
                        teacher_schedule[day] = []
                    
                    # Process each period/lesson in the day
                    for period_index, lesson in enumerate(periods):
                        # Skip breaks or any non-lesson entries
                        if isinstance(lesson, str):
                            continue
                        
                        # Process lesson data
                        if isinstance(lesson, dict):
                            lesson_teacher = lesson.get('teacher')
                            subject = lesson.get('subject')
                            
                            # Check if this lesson is taught by our teacher
                            if lesson_teacher == teacher_name:
                                # Use period_index + 1 to get the actual period number
                                period_number = period_index + 1
                                
                                teacher_schedule[day].append({
                                    'subject': subject,
                                    'subjectCode': subject,
                                    'class': class_name,
                                    'gradeLevel': grade_level,
                                    'period': period_number,
                                    'time': self.get_period_time(period_number)
                                })
                        
                        # Handle list format [subject, teacher]
                        elif isinstance(lesson, list) and len(lesson) >= 2:
                            subject_code = lesson[0]
                            lesson_teacher = lesson[1]
                            
                            # Check if this lesson is taught by our teacher
                            if lesson_teacher == teacher_name:
                                # Get the subject name from the code if available
                                subject_name = self.get_subject_name_from_code(subject_code)
                                
                                # Use period_index + 1 to get the actual period number
                                period_number = period_index + 1
                                
                                teacher_schedule[day].append({
                                    'subject': subject_name or subject_code,
                                    'subjectCode': subject_code,
                                    'class': class_name,
                                    'gradeLevel': grade_level,
                                    'period': period_number,
                                    'time': self.get_period_time(period_number)
                                })
        
        # Sort the schedule by period
        for day in teacher_schedule:
            teacher_schedule[day] = sorted(teacher_schedule[day], key=lambda x: x['period'])
        
        return teacher_schedule
      
    def format_teacher_response(self, teacher, teacher_schedule, workload_stats):
        """Format the response for the teacher timetable endpoint"""
        teacher_id = str(teacher.get('_id'))
        teacher_name = f"{teacher.get('firstName', '')} {teacher.get('lastName', '')}"
        
        # Format response
        response = {
            'success': True,
            'teacherId': teacher_id,
            'teacherName': teacher_name,
            'subjects': teacher.get('subjects', []),
            'department': teacher.get('department', ''),
            'schedule': teacher_schedule,
            'workload_stats': workload_stats
        }
        
        return response

    def _schedule_subjects(self, subjects, class_schedule, teacher_pool, subject_teachers):
        """
        Schedule subjects with balanced teacher workload
        """
        # Sort subjects by priority/complexity
        subjects_to_schedule = sorted(subjects, key=lambda s: self._get_subject_priority(s))
        
        for subject in subjects_to_schedule:
            # Calculate how many slots this subject needs
            slots_needed = self._calculate_subject_slots(subject)
            
            # Get available slots in the schedule
            available_slots = self._find_available_slots(class_schedule)
            
            # Sort slots to optimize scheduling (morning for complex subjects, etc.)
            sorted_slots = self._sort_slots_by_preference(available_slots, subject)
            
            for i in range(min(slots_needed, len(sorted_slots))):
                day, period = sorted_slots[i]
                
                # Find teachers who can teach this subject and aren't overloaded
                available_teachers = [t_id for t_id in subject_teachers[subject['name']] 
                                    if self._can_assign_teacher(t_id, teacher_pool)]
                
                if available_teachers:
                    # Get least loaded teacher for this subject
                    teacher_id = min(available_teachers, 
                                    key=lambda t: sum(teacher_pool[t]['current_load'].values()))
                    
                    # Assign the subject and teacher
                    class_schedule[day][period]['subject'] = subject['name']
                    class_schedule[day][period]['teacher'] = teacher_pool[teacher_id]['name']
                    
                    # Update teacher workload
                    teacher_pool[teacher_id]['current_load'][subject['name']] += 1
                    
        return class_schedule
    def get_subject_name_from_code(self, subject_code):
        """Get subject name from code"""
        subject = self.db.subjects.find_one({"code": subject_code})
        return subject.get('name') if subject else subject_code
 
    def calculate_workload_statistics(self, teacher, teacher_schedule, target_lessons):
        """Calculate workload statistics for a teacher"""
        teacher_id = str(teacher.get('_id'))
        teacher_name = f"{teacher.get('firstName', '')} {teacher.get('lastName', '')}"
        
        # Calculate total lessons
        total_lessons = sum(len(lessons) for lessons in teacher_schedule.values())
        
        # Calculate utilization
        utilization = round((total_lessons / target_lessons) * 100, 1) if target_lessons > 0 else 0
        
        # Determine status
        status = 'optimal'
        if utilization < 80:
            status = 'underloaded'
        elif utilization > 110:
            status = 'overloaded'
        
        # Count lessons by subject and grade level
        lessons_by_subject = {}
        lessons_by_grade = {}
        
        for day, lessons in teacher_schedule.items():
            for lesson in lessons:
                subject = lesson.get('subject', 'Unknown')
                grade_level = lesson.get('gradeLevel', 'Unknown')
                
                # Count by subject
                if subject not in lessons_by_subject:
                    lessons_by_subject[subject] = 0
                lessons_by_subject[subject] += 1
                
                # Count by grade level
                if grade_level not in lessons_by_grade:
                    lessons_by_grade[grade_level] = 0
                lessons_by_grade[grade_level] += 1
        
        # Create workload stats object
        workload_stats = {
            'teacherId': teacher_id,
            'teacherName': teacher_name,
            'subjects': teacher.get('subjects', []),
            'targetWorkload': target_lessons,
            'actualWorkload': total_lessons,
            'utilizationPercentage': utilization,
            'status': status,
            'lessonsBySubject': lessons_by_subject,
            'lessonsByGrade': lessons_by_grade,
            'lessonsByDay': {day: len(lessons) for day, lessons in teacher_schedule.items()}
        }
        
        return workload_stats
    

    def save_timetable(self, timetable_data: Dict) -> Dict:
        """
        Save the generated timetable to MongoDB
        """
        try:
            logger.info("Saving timetable data")
            # Validate input data
            if not timetable_data or 'gradeLevel' not in timetable_data:
                logger.info("Invalid timetable data provided")
                raise ValueError("Invalid timetable data provided")
            
            grade_level = timetable_data['gradeLevel']
            logger.info(f"Saving timetable for {grade_level}")
            # Update status from draft to active
            timetable_data['status'] = 'active'
            timetable_data['updatedAt'] = datetime.now()
            
            # Check if timetable for this grade already exists
            existing = self.db.timetables.find_one({
                'gradeLevel': grade_level,
                'academicYear': timetable_data['academicYear'],
                'term': timetable_data['term']
            })
            
            if existing:
                # Update existing timetable
                result = self.db.timetables.update_one(
                    {'_id': existing['_id']},
                    {'$set': timetable_data}
                )
                
                if result.modified_count > 0:
                    return {
                        'success': True,
                        'message': f"Timetable for {grade_level} updated successfully",
                        'timetableId': str(existing['_id'])
                    }
                else:
                    return {
                        'success': False,
                        'message': "No changes made to the timetable"
                    }
            else:
                # Insert new timetable
                result = self.db.timetables.insert_one(timetable_data)
                
                if result.inserted_id:
                    return {
                        'success': True,
                        'message': f"Timetable for {grade_level} saved successfully",
                        'timetableId': str(result.inserted_id)
                    }
                else:
                    return {
                        'success': False,
                        'message': "Failed to save timetable"
                    }
                    
        except Exception as e:
            current_app.logger.error(f"Failed to save timetable: {str(e)}")
            return {
                'success': False,
                'message': f"Failed to save timetable: {str(e)}"
            }
  
  
        """
        Format the schedule data to match the expected format in the frontend
        
        Args:
            class_schedule: The class schedule to format
        """
        for day, periods in class_schedule.items():
            formatted_periods = []
            
            for period in periods:
                if period['type'] != 'lesson':
                    # For breaks, registration, etc.
                    formatted_periods.append(period['type'].capitalize())
                else:
                    # For lessons
                    subject = period.get('subject', 'Unassigned')
                    teacher = period.get('teacher', 'Unassigned')
                    
                    # Only add as a tuple if both subject and teacher are assigned
                    if subject != 'Unassigned' or teacher != 'Unassigned':
                        formatted_periods.append([subject, teacher])
                    else:
                        formatted_periods.append("Unassigned")
            
            # Replace the original periods with the formatted ones
            class_schedule[day] = formatted_periods
    def get_period_configurations(self):
        """Get period configurations from database or use defaults if not found"""
        try:
            # Get period configurations from database
            period_config = self.db.configurations.find_one({"type": "periods"})
            if period_config and "periods" in period_config:
                return period_config["periods"]
            
            # Return default configuration if not found
            return {
                "1": {"start": "7:00", "end": "7:05", "type": "Registration"},
                "2": {"start": "7:05", "end": "7:40", "type": "lesson"},
                "3": {"start": "7:40", "end": "8:15", "type": "lesson"},
                "4": {"start": "8:15", "end": "8:50", "type": "lesson"},
                "5": {"start": "8:50", "end": "9:25", "type": "lesson"},
                "6": {"start": "9:25", "end": "9:40", "type": "Morning Break Time", "name": "Short Break"},
                "7": {"start": "9:40", "end": "10:15", "type": "lesson"},
                "8": {"start": "10:15", "end": "10:50", "type": "lesson"},
                "9": {"start": "10:50", "end": "11:25", "type": "lesson"},
                "10": {"start": "11:25", "end": "12:00", "type": "lesson"},
                "11": {"start": "12:00", "end": "13:00", "type": "Lunch Break Time", "name": "Lunch Break"},
                "12": {"start": "13:00", "end": "16:00", "type": "Sporting/Clubs/Extracurricular"},
            }
        except Exception as e:
            current_app.logger.error(f"Error getting period configurations: {str(e)}")
            # Fallback to basic defaults if there's an error
            return {
                "1": {"start": "7:00", "end": "7:40", "type": "lesson"},
                "2": {"start": "7:40", "end": "8:20", "type": "lesson"},
                # Add minimal periods to ensure system doesn't crash
            }

    
    def get_period_time(self, period_id):
        """Get the time range for a specific period"""
        periods = self.get_period_configurations()
        period = periods.get(str(period_id))
        if period:
            return f"{period['start']} - {period['end']}"
        return "Unknown time"
    def get_saved_timetables(self, filters: dict = None) -> dict:
        """
        Retrieve saved timetables with optional filtering
        
        Args:
            filters: Optional dictionary of filter criteria
            
        Returns:
            Dictionary with success status and timetable data
        """
        try:
            query = filters or {}
            timetables = list(self.db.timetables.find(query).sort('updatedAt', -1))
            
            # Convert ObjectId to string for JSON serialization
            for timetable in timetables:
                timetable['_id'] = str(timetable['_id'])
                
                # Format the schedule data for the frontend
                if 'data' in timetable and timetable['data']:
                    for grade_level, grade_data in timetable['data'].items():
                        for class_name, class_schedule in grade_data.items():
                            # Convert the class schedule to the expected format for the frontend
                            self._format_schedule_data(class_schedule)
            
            return {
                'success': True,
                'data': timetables
            }
        except Exception as e:
            current_app.logger.error(f"Failed to retrieve timetables: {str(e)}")
            return {
                'success': False,
                'message': f"Failed to retrieve timetables: {str(e)}"
            }
    
    def get_timetable_by_id(self, timetable_id: str) -> dict:
        """
        Retrieve a specific timetable by ID
        
        Args:
            timetable_id: The ID of the timetable to retrieve
            
        Returns:
            Dictionary with success status and timetable data
        """
        try:
            from bson.objectid import ObjectId
            
            timetable = self.db.timetables.find_one({'_id': ObjectId(timetable_id)})
            if not timetable:
                return {
                    'success': False,
                    'message': f"Timetable with ID {timetable_id} not found"
                }
            
            # Convert ObjectId to string for JSON serialization
            timetable['_id'] = str(timetable['_id'])
            
            # Format the schedule data for the frontend
            if 'data' in timetable and timetable['data']:
                for grade_level, grade_data in timetable['data'].items():
                    for class_name, class_schedule in grade_data.items():
                        # Convert the class schedule to the expected format for the frontend
                        self._format_schedule_data(class_schedule)
            
            return {
                'success': True,
                'data': timetable
            }
        except Exception as e:
            current_app.logger.error(f"Failed to retrieve timetable: {str(e)}")
            return {
                'success': False,
                'message': f"Failed to retrieve timetable: {str(e)}"
            }
    
    def _format_schedule_data(self, class_schedule):
        """
        Format the schedule data to match the expected format in the frontend
        
        Args:
            class_schedule: The class schedule to format
        """
        for day, periods in class_schedule.items():
            formatted_periods = []
            
            for period in periods:
                if period['type'] != 'lesson':
                    # For breaks, registration, etc.
                    formatted_periods.append(period['type'].capitalize())
                else:
                    # For lessons
                    subject = period.get('subject', 'Unassigned')
                    teacher = period.get('teacher', 'Unassigned')
                    
                    # Only add as a tuple if both subject and teacher are assigned
                    if subject != 'Unassigned' or teacher != 'Unassigned':
                        formatted_periods.append([subject, teacher])
                    else:
                        formatted_periods.append("Unassigned")
            
            # Replace the original periods with the formatted ones
            class_schedule[day] = formatted_periods
    
     
    def get_all_teacher_workloads(self, target_lessons_per_week=None):
        """
        Calculate workload status for all teaching staff compared to their target workload.
        
        Parameters:
        - target_lessons_per_week: Target number of lessons per week (optional)
                                If not provided, uses the default from config
        
        Returns:
        - List of workload data for all teaching staff
        """
        try:
            # Get the target workload from the parameter or the config
            config = TimetableConfig.get_config()
            default_target = config.get('TARGET_LESSONS_PER_WEEK', 24)
            target_lessons = target_lessons_per_week or default_target
            
            # Get all teaching staff from staffs collection
            teaching_staff = list(self.db.staffs.find({"roleArea": "teaching"}))
            
            # Calculate workload for each teaching staff member
            workload_data = []
            for staff in teaching_staff:
                staff_id = staff['_id']
                
                # Get teacher's schedule
                teacher_schedule = self.generate_teacher_schedule(staff)
                
                # Calculate workload statistics
                workload_stats = self.calculate_workload_statistics(staff, teacher_schedule, target_lessons)
                
                workload_data.append(workload_stats)
            
            return {
                'success': True,
                'data': workload_data
            }
            
        except Exception as e:
            current_app.logger.error(f"Failed to calculate teacher workloads: {str(e)}")
            return {
                'success': False,
                'message': str(e)
            }
   
    def _prepare_timetable_for_storage(self, gradeLevel: str, timetable_data: dict) -> dict:
        """
        Prepare timetable data for storage in the database and consumption by the frontend
        
        Args:
            gradeLevel: The grade level
            timetable_data: The raw timetable data
            
        Returns:
            Formatted timetable data ready for storage
        """
        formatted_data = {
            'gradeLevel': gradeLevel,
            'academicYear': self.config.get('CURRENT_ACADEMIC_YEAR', str(datetime.now().year)),
            'term': self.config.get('CURRENT_TERM', '1'),
            'status': 'draft',
            'createdAt': datetime.now(),
            'updatedAt': datetime.now(),
            'data': {gradeLevel: {}},
            'streams': {}
        }
        
        # Process each class schedule and format it for the frontend
        for class_name, class_schedule in timetable_data.items():
            # Extract the stream from the class name (e.g., "Form 1 A" -> "A")
            stream = class_name.split(' ')[-1] if ' ' in class_name else ''
            
            # Copy the class schedule to the data field
            formatted_data['data'][gradeLevel][class_name] = deepcopy(class_schedule)
            
            # Format the schedule for the streams field
            formatted_schedule = {}
            for day, periods in class_schedule.items():
                formatted_periods = []
                for period in periods:
                    if period['type'] != 'lesson':
                        # For breaks, registration, etc.
                        formatted_periods.append(period['type'].capitalize())
                    else:
                        # For lessons
                        subject = period.get('subject', 'Unassigned')
                        teacher = period.get('teacher', 'Unassigned')
                        
                        # Only add as a tuple if both subject and teacher are assigned
                        if subject != 'Unassigned' or teacher != 'Unassigned':
                            formatted_periods.append([subject, teacher])
                        else:
                            formatted_periods.append("Unassigned")
                
                formatted_schedule[day] = formatted_periods
            
            # Add the formatted schedule to the streams field
            formatted_data['streams'][stream] = {
                'className': class_name,
                'schedule': formatted_schedule
            }
        
        return formatted_data
    
    def update_timetable(self, timetable_id: str, data: dict) -> dict:
        """
        Update an existing timetable
        
        Args:
            timetable_id: The ID of the timetable to update
            data: The new timetable data
            
        Returns:
            Dictionary with success status and updated timetable data
        """
        try:
            from bson.objectid import ObjectId
            
            # Validate that the timetable exists
            timetable = self.db.timetables.find_one({'_id': ObjectId(timetable_id)})
            if not timetable:
                return {
                    'success': False,
                    'message': f"Timetable with ID {timetable_id} not found"
                }
            
            # Update the timetable data
            update_data = {
                **data,
                'updatedAt': datetime.now()
            }
            
            result = self.db.timetables.update_one(
                {'_id': ObjectId(timetable_id)},
                {'$set': update_data}
            )
            
            if result.modified_count == 0:
                return {
                    'success': False,
                    'message': f"No changes made to timetable with ID {timetable_id}"
                }
            
            # Retrieve the updated timetable
            updated_timetable = self.db.timetables.find_one({'_id': ObjectId(timetable_id)})
            updated_timetable['_id'] = str(updated_timetable['_id'])
            
            return {
                'success': True,
                'message': f"Timetable updated successfully",
                'data': updated_timetable
            }
        except Exception as e:
            current_app.logger.error(f"Failed to update timetable: {str(e)}")
            return {
                'success': False,
                'message': f"Failed to update timetable: {str(e)}"
            }
    
    def validate_timetable(self, timetable):
        """
        Validate timetable for teacher allocation issues
        """
        issues = {
            'outside_specialty': [],
            'overallocated': []
        }
        
        # Track teacher allocations
        teacher_allocations = {}
        
        # Analyze timetable for issues
        for class_name, schedule in timetable.items():
            for day, periods in schedule.items():
                for period in periods:
                    if period['type'] == 'lesson' and period['teacher'] != 'Unassigned':
                        teacher = period['teacher']
                        subject = period['subject']
                        
                        # Initialize tracking if needed
                        if teacher not in teacher_allocations:
                            teacher_allocations[teacher] = {
                                'subjects': [],
                                'count': 0
                            }
                            
                        # Track allocation
                        teacher_allocations[teacher]['count'] += 1
                        if subject not in teacher_allocations[teacher]['subjects']:
                            teacher_allocations[teacher]['subjects'].append(subject)
        
        # Check for issues
        for teacher_id, data in teacher_allocations.items():
            # Get teacher info
            teacher_info = self.db.staffs.find_one({'_id': teacher_id})
            if not teacher_info:
                continue
                
            # Check specialty match
            for subject in data['subjects']:
                if subject not in teacher_info.get('subjects', []):
                    issues['outside_specialty'].append({
                        'teacher': teacher_id,
                        'subject': subject
                    })
            
            # Check workload
            max_workload = self.calculate_max_teacher_workload(teacher_id)
            if data['count'] > max_workload:
                issues['overallocated'].append({
                    'teacher': teacher_id,
                    'assigned': data['count'],
                    'maximum': max_workload
                })
        
        return issues
    def update_timetable_status(self, timetable_id: str, status: str) -> dict:
        """
        Update the status of a timetable
        
        Args:
            timetable_id: The ID of the timetable to update
            status: The new status ('draft', 'active', 'archived')
            
        Returns:
            Dictionary with success status and message
        """
        try:
            from bson.objectid import ObjectId
            
            # Validate that the timetable exists
            timetable = self.db.timetables.find_one({'_id': ObjectId(timetable_id)})
            if not timetable:
                return {
                    'success': False,
                    'message': f"Timetable with ID {timetable_id} not found"
                }
            
            # If setting a timetable to 'active', deactivate any other active timetables
            # for the same grade level, academic year, and term
            if status == 'active':
                self.db.timetables.update_many(
                    {
                        '_id': {'$ne': ObjectId(timetable_id)},
                        'gradeLevel': timetable.get('gradeLevel'),
                        'academicYear': timetable.get('academicYear'),
                        'term': timetable.get('term'),
                        'status': 'active'
                    },
                    {'$set': {'status': 'archived', 'updatedAt': datetime.now()}}
                )
            
            # Update the status of the timetable
            result = self.db.timetables.update_one(
                {'_id': ObjectId(timetable_id)},
                {'$set': {
                    'status': status,
                    'updatedAt': datetime.now()
                }}
            )
            
            if result.modified_count == 0:
                return {
                    'success': False,
                    'message': f"Timetable already has status '{status}'"
                }
            
            return {
                'success': True,
                'message': f"Timetable status updated to '{status}'"
            }
        except Exception as e:
            current_app.logger.error(f"Failed to update timetable status: {str(e)}")
            return {
                'success': False,
                'message': f"Failed to update timetable status: {str(e)}"
            }