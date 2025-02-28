// src/utils/api/subjApis.ts

import api from './axios';
import { Subject, Class, SubjectClassAssignment, UpdateAssignmentPayload } from '../../components/admin/subjects/subject_types';

// Function to get subjects
export const getSubjects = async (gradeLevel?: string, type?: 'core' | 'practical'): Promise<Subject[]> => {
  const url = '/subject-assign/subjects';
  const params: Record<string, string> = {};
  
  if (gradeLevel) params.gradeLevel = gradeLevel;
  if (type) params.type = type;
  
  const response = await api.get(url, { params });
  
  // Map backend model to frontend model
  return response.data.map((subject: Subject) => ({
    ...subject,
    type: subject.isCore ? 'core' : subject.isPractical ? 'practical' : undefined
  }));
};

// Function to get classes
export const getClasses = async (gradeLevel: string): Promise<Class[]> => {
  const url = '/subject-assign/classes';
  const params: Record<string, string> = {};
  console.log(gradeLevel + ' is the grade level');
  console.log('Params',params);
  
  if (gradeLevel) params.gradeLevel = gradeLevel;
   
  
  const response = await api.get(url, { params });
  
  // Map backend response to frontend model
  return response.data.map((classObj: Class) => ({
    ...classObj,
    name: `${classObj.gradeLevel} ${classObj.stream}`
  }));
};

// Function to get subject assignments
export const getSubjectAssignments = async (gradeLevel?: string, stream?: string, classId?: string): Promise<SubjectClassAssignment[]> => {
  const url = '/subject-assign/subject-assignments';
  const params: Record<string, string> = {};
  
  if (gradeLevel) params.gradeLevel = gradeLevel;
  if (stream) params.stream = stream;
  if (classId) params.classId = classId;
  
  const response = await api.get(url, { params });
  return response.data;
};

// Function to generate subject assignments
export const generateSubjectAssignments = async (gradeLevel: string): Promise<SubjectClassAssignment[]> => {
  const response = await api.post('/subject-assign/generate-assignments', { gradeLevel });
  return response.data;
};

// Function to update subject assignment
export const updateSubjectAssignment = async (id: string, data: UpdateAssignmentPayload): Promise<void> => {
  const response = await api.put(`/subject-assign/subject-assignments/${id}`, data);
  return response.data;
};

// Function to delete subject assignment
export const deleteSubjectAssignment = async (id: string): Promise<void> => {
  const response = await api.delete(`/subject-assign/subject-assignments/${id}`);
  return response.data;
};