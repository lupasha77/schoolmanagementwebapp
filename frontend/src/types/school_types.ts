// src/types/index.ts
export enum GradeLevel {
     
    Form1 = "Form 1",
    Form2 = "Form 2",
    Form3 = "Form 3",
    Form4 = "Form 4",
    Form5 = "Form 5",
    Form6 = "Form 6",
  }
  
  export enum Specialty {
    SCIENCE = "SCIENCE",
    ARTS = "ARTS",
    COMMERCE = "COMMERCE"
  }
  
  export interface Subject {
    _id: string;
    name: string;
    code: string;
    department: string;
    gradeLevel: GradeLevel;
    specialty?: Specialty;
    isCore:boolean;
    practical_duration: number;
    isPractical:boolean;
  }
  
  export interface Staff {
    _id: string;
    user_email: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    subjects: string[];
    gradeLevels: GradeLevel[];
    specialties?: Specialty[];
    availability?: Record<string, string[]>;
    maxHoursPerWeek: number;
  }
  export interface Student {
    _id: string;
    user_email: string;
    firstName: string;
    lastName: string;
    studentId: string;
    gradeLevel: string;
    specialties?: Specialty[];
  }
  
  export interface RequirementsCalculation {
    requiredClasses: number;
    studentsPerClass: number;
    maxSubjects: number;
  }

  export interface RequirementsData {
    totalStudents: number;
    gradeLevel: GradeLevel;
    numberOfClasses: number;
    // gradeLevel: string;
  numberOfStudents: number;
  subjects: string[];
  }
   
// Update in your types/school_types.ts file
// export interface StreamConfigData {
//   gradeLevel: string;
//   current_enrolled_students: number;
//   max_students_per_class: number;
//   max_students_per_stream: number;
//   max_core_subjects: number;
//   max_practical_subjects: number;
//   calculated_classes?: number; // New field to store calculated classes
//   last_updated?: string;
// }
export interface StreamConfigData {
  _id?: string;
  gradeLevel: string;
  current_enrolled_students: number;
  max_students_per_class: number;
  max_students_per_stream: number;
  expected_students_enrolment?: number;
  calculated_classes?: number;
  max_core_subjects?: number;
  max_practical_subjects?: number;
  last_updated?: string;
} 

export interface StaffStats {
  teachingStaff: number;
  nonTeachingStaff: number;
}

export interface StudentStats {
  level: string;
  count: number;
}
export interface DashboardData {
  studentStats: StudentStats[];
  staffStats: StaffStats;
}
export interface StudentCountResponse {
  gradeCounts: Record<string, number>;
  total: number;
}