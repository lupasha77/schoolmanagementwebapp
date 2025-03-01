import { StreamConfigData, RequirementsData, Subject, Staff,Student, StudentCountResponse } from '../../types/school_types';
import api from './axios';
// import { Department, Specialty } from '../types/school-enums';

// Define the response types
interface SubjectDataResponse {
  department: string[];
  gradeLevels: string[];
  subjects: Subject[];
}
interface DepartmentStats {
  teachingDepartments: Array<{
    name: string;
    count: number;
    specialty: string;
    subjects: string[];
  }>;
  nonTeachingDepartments: Array<{
    name: string;
    count: number;
  }>;
}
interface StaffResponse {
  staffs: Staff[];
  total: number;
}

// interface StudentResponse {
//   students: Student[];
//   gradeLevel: string;
//   total: number;
// }
interface StreamConfigResponse {
  configs: StreamConfigData[];
}

interface StudentResponse {
  students: Student[];
}
 

const schoolApis = {
  async calculateRequirements(data: RequirementsData) {
    const response = await api.post<{ requirements: RequirementsData }>('/initial_req/calculate-requirements', data);
    return response.data;
  },

  async createSubject(data: Omit<Subject, '_id'>) {
    const response = await api.post<{ subject: Subject }>('/subjects/add-subject', data);
    return response.data;
  },

  async getStaffs() {
    const response = await api.get<StaffResponse>('/staffs/get-all-staffs');
    return response.data;
  },
   
  async getStaffStats() {
    const response = await api.get<{
      teachingStaff: number;
      nonTeachingStaff: number;
      total: number;
    }>('/staffs/staffs/get-staff-stats'); // Updated endpoint to match backend
    return response.data;
  },
  async getDepartmentStats(): Promise<DepartmentStats> {
    const response = await api.get<DepartmentStats>('/staffs/staffs/get-department-stats');
    return response.data;
  },
  async getStudents() {
    const response = await api.get<StudentResponse>('/students/get-all-students');
    // console.log('SchoolApis response',response)
    return response.data;
  },
  async getStudentsByGrade(gradeLevel: string) {
    const response = await api.get<StudentResponse>(`/students/get-students-by-grade/${gradeLevel}`);
    return response.data;
  },

  async getStudentCountsByGrade() {
    const response = await api.get<StudentCountResponse>('/students/get-student-counts-by-grade');
    return response.data;
  },

  async getSubjectData() {
    try {
      const response = await api.get<SubjectDataResponse>('/subjects/get-subject-data');
       

      // Validate the response structure
      if (!response.data || !Array.isArray(response.data.subjects)) {
        throw new Error('Invalid subject data structure received');
      }

      // Transform the data if needed
      const transformedData = {
        departments: response.data.department || [],
        gradeLevels: response.data.gradeLevels || [],
        subjects: response.data.subjects.map(subject => ({
          ...subject,
          // Ensure required fields exist
          isCore: Boolean(subject.isCore),
          isPractical: Boolean(subject.isPractical)
        }))
      };

      return transformedData;
    } catch (error) {
      console.error('Error in getSubjectData:', error);
      throw error;
    }
  },

  async getSubjectDataById(id: string) {
    const response = await api.get<{ subject: Subject }>(`/subjects/get-subject-data/${id}`);
    return response.data;
  },

  async getDepartmentName() {
    const response = await api.get<{ department: string[] }>('/subjects/get-department-name');
    return response.data;
  },
  
  async getSubjectNames() {
    const response = await api.get<{ subjects: { _id: string; name: string }[] }>('/subjects/get-subject-names');
    return response.data;
  },
  
  async createStaff(data: Omit<Staff, '_id'>) {
    const response = await api.post<{ staff: Staff }>('/staffs', data);
    return response.data;
  },

  async updateStaffAvailability(staffId: string, availability: Record<string, string[]>) {
    const response = await api.put<{ staff: Staff }>(`/staffs/${staffId}`, { availability });
    return response.data;
  },
  async getStreamConfigs(): Promise<{ 
    configs: StreamConfigData[],
    error?: string 
  }> {
    try {
      const response = await api.get<StreamConfigResponse>('/stream-config/get-all-stream-configs');
  
      // Validate response structure
      if (!response.data || !Array.isArray(response.data.configs)) {
        throw new Error('Invalid stream config data structure received');
      }
  
      // Normalize and validate configs
      const validatedConfigs = response.data.configs.map(config => {
        const normalizedConfig: StreamConfigData = {
          gradeLevel: config.gradeLevel?.trim() || '',  
          current_enrolled_students: config.current_enrolled_students ?? 0,
          expected_students_enrolment: config.expected_students_enrolment ?? 0,
          max_students_per_class: config.max_students_per_class ?? 1,
          max_students_per_stream: config.max_students_per_stream ?? 1,
          max_core_subjects: config.max_core_subjects ?? 0,
          max_practical_subjects: config.max_practical_subjects ?? 0,
          last_updated: config.last_updated ?? new Date().toISOString(),
        };
  
        if (!normalizedConfig) {
          throw new Error(`Invalid stream config data for grade ${config.gradeLevel || 'unknown'}`);
        }
  
        return normalizedConfig;
      });
  
      return {
        configs: validatedConfigs
      };
    } catch (error) {
      console.error('Error fetching stream configs:', error);
      return {
        configs: [],
        error: error instanceof Error ? error.message : 'Failed to fetch stream configurations'
      };
    }
  }
  ,
    
    // async getStreamConfigs(): Promise<{ configs: StreamConfigData[] }> {
    //   const response = await api.get<{ configs: StreamConfigData[] }>('/stream-config');
    //   return response.data;
    // },
    async updateStreamConfig(
      gradeLevel: string,
      data: Partial<StreamConfigData>
    ): Promise<{ config: StreamConfigData; error?: string }> {
      try {
        const response = await api.put<StreamConfigData>(
          `/stream-config/update-stream-config/${encodeURIComponent(gradeLevel)}`,
          data
        );
  
        // Validate the response data
        if (!response.data || typeof response.data !== 'object') {
          throw new Error('Invalid response format');
        }
  
        const config = response.data;
  
        // Validate required fields
        if (
          !config.gradeLevel ||
          typeof config.current_enrolled_students !== 'number' ||
          typeof config.max_students_per_class !== 'number' ||
          typeof config.max_students_per_stream !== 'number'
        ) {
          throw new Error('Missing required fields in stream config data');
        }
  
        return { config };
      } catch (error) {
        console.error('Error updating stream config:', error);
        return {
          config: { 
            gradeLevel,
            ...data,
            // Provide default values for required fields if they don't exist
            expected_students_enrolment: data.expected_students_enrolment ?? 0,
            current_enrolled_students: data.current_enrolled_students ?? 0,
            max_students_per_class: data.max_students_per_class ?? 40,
            max_students_per_stream: data.max_students_per_stream ?? 200
          } as StreamConfigData,
          error: error instanceof Error ? error.message : 'Failed to update stream configuration'
        };
      }
    }
  }; 
 

export default schoolApis;







// Define response types
// interface StreamConfigResponse {
//   configs: Array<{
//     gradeLevel: string;
//     current_enrolled_students: number;
//     max_students_per_class: number;
//     max_students_per_stream: number;
//     max_core_subjects: number;
//     max_practical_subjects: number;
//     last_updated: string;
//   }>;
// }

// Define a type for the unknown config object
// type UnknownStreamConfig = {
//   gradeLevel?: unknown;
//   current_enrolled_students?: unknown;
//   max_students_per_class?: unknown;
//   max_students_per_stream?: unknown;
// };

// Add type guard to validate stream config data
// function isValidStreamConfig(config: unknown): config is StreamConfigData {
//   const streamConfig = config as UnknownStreamConfig;

//   return (
//     typeof config === 'object' &&
//     config !== null &&
//     typeof streamConfig.gradeLevel === 'string' &&  // Use gradeLevel, not grade_level
//     typeof streamConfig.current_enrolled_students === 'number' &&
//     typeof streamConfig.max_students_per_class === 'number' &&
//     typeof streamConfig.max_students_per_stream === 'number'
//   );
// }
