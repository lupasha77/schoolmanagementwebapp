// src/components/subject_types.ts

export interface Subject {
  _id: string;
  name: string;
  code: string;
  department?: string;
  gradeLevel: string;
  isCore?: boolean;
  isPractical?: boolean;
  // For frontend compatibility
  type?: 'core' | 'practical';
}

export interface Class {
  _id: string;
  gradeLevel: string;
  stream: string;
  name?: string;
  max_students_per_class?: number;
  max_core_subjects?: number;
  max_practical_subjects?: number;
  max_elective_subjects?: number;
}

export interface SubjectDetail {
  _id: string;
  name: string;
  code: string;
  department?: string;
}

export interface SubjectClassAssignment {
  _id: string;
  gradeLevel: string;
  stream: string;
  className?: string;
  coreSubjects: string[];
  practicalSubjects: string[];
  electiveSubjects: string[];
  coreSubjectsDetails: SubjectDetail[];
  practicalSubjectsDetails: SubjectDetail[];
  electiveSubjectsDetails: SubjectDetail[];
  lastUpdated?: string;
}

export interface UpdateAssignmentPayload {
  gradeLevel: string;
  stream?: string;
  coreSubjects?: string[];
  practicalSubjects?: string[];
  electiveSubjects?: string[];
}