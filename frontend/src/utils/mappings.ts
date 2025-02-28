export const subjectMap: { [key: string]: string } = {
    'Subj1': 'Mathematics',
    'Subj2': 'English',
    'Subj3': 'Science',
    'Subj4': 'History',
    'Subj5': 'Geography',
    'Subj6': 'Physical Education',
    'Subj7': 'Computer Science',
    'Subj8': 'Art',
    'Subj9': 'Music',
    'Subj10': 'Biology',
    'Subj11': 'Chemistry',
    'Subj12': 'Physics',
    'Subj13': 'Economics',
    'Subj14': 'Political Science',
    'Subj15': 'Sociology',
    'Subj16': 'Clothing Technology',
    'Subj17': 'Metalwork',
    'Subj18': 'Woodwork',
    'Subj19': 'Literature',
    'Subj20': 'Technical Graphics'
  };
  
  export const teacherMap: { [key: string]: string } = {
    'Teacher1': 'Mr. Smith',
    'Teacher2': 'Mrs. Johnson',
    'Teacher3': 'Ms. Williams',
    'Teacher4': 'Mr. Brown',
    'Teacher5': 'Mrs. Davis',
    'Teacher6': 'Mr. Miller',
    'Teacher7': 'Ms. Wilson',
    'Teacher8': 'Mrs. Moore',
    'Teacher9': 'Mr. Taylor',
    'Teacher10': 'Ms. Anderson',
    'Teacher11': 'Mrs. Masvaya'
  };
  
  export const getSubjectName = (code: string): string => {
    return subjectMap[code] || code;
  };
  
  export const getStaffName = (code: string): string => {
    return teacherMap[code] || code;
  };