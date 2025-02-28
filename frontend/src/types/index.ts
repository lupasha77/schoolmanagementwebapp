export type PeriodData = [string, string] | "Break";

// Change DaySchedule to be an array type
export type DaySchedule = PeriodData[];

export interface ClassData {
  [day: string]: DaySchedule;
}

export interface GradeData {
  [className: string]: ClassData;
}

export interface TimetableData {
  [grade: string]: GradeData;
}

export interface FormattedPeriod {
  periodNumber: number;
  subject: string;
  staff: string;
  time: string;
}