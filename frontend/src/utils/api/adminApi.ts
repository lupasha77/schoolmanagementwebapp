// import axios from "axios";

// Simulating backend data fetches
export const fetchStatistics = async () => {
  return {
    enrolledStudents: 1200,
    teachingStaff: 50,
    nonTeachingStaff: 30,
  };
};

export const fetchTimetables = async () => {
  return [
    { name: "Lesson Timetable", link: "/lesson-timetable" },
    { name: "Exam Timetable", link: "/exam-timetable" },
    { name: "Class Allocations", link: "/class-allocations" },
    { name: "Teacher Allocations", link: "/teacher-allocations" },
    { name: "Subject Allocations", link: "/subject-allocations" },
    { name: "Sports Diary", link: "/sports-diary" },
    { name: "School Calendar", link: "/school-calendar" },
  ];
};
