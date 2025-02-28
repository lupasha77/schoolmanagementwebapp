// timetable-types.ts

/**
 * Interface for time slots in the timetable
 */
export interface TimeSlot {
    start: string;
    end: string;
    label: string;
  }
  
  /**
   * Interface for stream data within a timetable
   */
  export interface StreamData {
    className: string;
    schedule: Record<string, (string | [string, string])[]>;
  }
  
  /**
   * Interface for timetable data structure
   */
  export interface TimetableData {
    _id?: string;
    academicYear: string;
    term: string;
    gradeLevel: string;
    status?: string;
    streams?: Record<string, StreamData>;
    [key: string]: string | number | Record<string, unknown> | undefined;
  }
  
  /**
   * Interface for API response when fetching timetables
   */
  export interface TimetableResponse {
    success: boolean;
    message?: string;
    timetable_data?: TimetableData;
    data?: {
      [gradeLevel: string]: Record<string, Record<string, (string | [string, string])[]>>;
    } | TimetableData[];
  }
  
  /**
   * Interface for a simple timetable structure
   */
  export interface Timetable {
    [gradeLevel: string]: Record<string, Record<string, (string | [string, string])[]>>;
  }