// Base Config Interface
export interface Config {
    // Basic time-related settings
    WEEK_DAYS: string[];
    SLOTS_PER_DAY: number;
    START_TIME_MORNING: string;
    LESSON_DURATION: number;
    BREAKS: Record<string, number>; // Example: { "10:00": "Morning Break" }
    
    // Periods configuration
    PRACTICAL_PERIODS: PracticalPeriods;
    SCIENCE_PERIODS: SciencePeriods;
    PRACTICAL_PERIODS_BY_FORM: PracticalPeriodsByForm;
    
    // Subject constraints
    SUBJECT_CONSTRAINTS: SubjectConstraints;
    
    // Teacher workload settings
    MAX_TEACHER_WORKLOAD: number;
    MIN_TEACHER_WORKLOAD: number;
    TARGET_LESSONS_PER_WEEK: number;
    TEACHER_CONSTRAINTS: TeacherConstraints;
    
    // Stream & class configuration
    STREAM_CLASS_CONFIG?: Record<string, string[]>;
    
    // Dynamic keys for flexibility
    [key: string]: unknown;
  }
  
  // Teacher related types
  export interface TeacherConstraints {
    [teacherId: string]: {
      maxWorkload?: number;
      minWorkload?: number;
      specialty?: string[];
      // Add other properties as needed
    };
  }
  
  export interface TeacherConfig {
    MAX_TEACHER_WORKLOAD: number;
    MIN_TEACHER_WORKLOAD: number;
    TARGET_LESSONS_PER_WEEK: number;
    TEACHER_CONSTRAINTS: TeacherConstraints;
  }
  
  // Subject related types
  export interface SubjectConstraint {
    periodsPerWeek?: number;
    isCore?: boolean;
    isPractical?: boolean;
    // Add other properties as needed
  }
  
  export interface SubjectConstraints {
    [subjectName: string]: SubjectConstraint;
  }
  
  // Either an array of periods or a record mapping subject to periods
  export type PracticalPeriods = number[] | Record<string, number | number[]>;
  export type PracticalPeriodsByForm = Record<string, number[]>;
  export type SciencePeriods = Record<string, number | number[]>;
  
  // Props interfaces for components
  export interface TimeRelatedConfigProps {
    config: {
      WEEK_DAYS: string[];
      SLOTS_PER_DAY: number;
      START_TIME_MORNING: string;
      LESSON_DURATION: number;
      BREAKS: Record<string, number>;
      PRACTICAL_PERIODS: PracticalPeriods;
    };
    onConfigUpdate: (config: Config) => void;
  }
  
  export interface SubjectConstraintsConfigProps {
    config: {
      SUBJECT_CONSTRAINTS: SubjectConstraints;
      SCIENCE_PERIODS: Record<string, number>;
      PRACTICAL_PERIODS: Record<string, number>;
      PRACTICAL_PERIODS_BY_FORM: PracticalPeriodsByForm;
    };
    onConfigUpdate: (config: Config) => void;
  }
  
  export interface TeacherWorkloadConfigProps {
    config: TeacherConfig;
    onConfigUpdate: (config: Config) => void;
  }
  
  export interface StreamClassConfigProps {
    config: Config;
    onConfigUpdate: (config: Config) => void;
  }
  
  // Define specific types for each section of the configuration
  export type BreaksConfig = Record<string, number>;