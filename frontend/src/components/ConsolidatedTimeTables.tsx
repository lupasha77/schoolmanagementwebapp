import React from 'react';
import { 
  Paper, Title, Table, Text, Grid, Select, LoadingOverlay, Badge,
  Stack,
  //  Button
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  //  IconCheck,
   IconX } from '@tabler/icons-react';
import { TimetableData, PeriodData } from '../types';
// import schoolApis from '../utils/api/schoolApis';

import api from '../utils/api/axios';
interface TeachingStaff {
  _id: string;
  firstName: string;
  lastName: string;
  department: string;
  subjects: string[];
  gradeLevels: string[];
}

interface StaffResponse {
  teachingStaff: TeachingStaff[];
}

interface TimetableResponse {
  success: boolean;
  data: TimetableData;
  message?: string;
}
// Constants from original code
const PERIODS_START_HOUR = 8;
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
const GRADES = ['Form 1', 'Form 2', 'Form 3', 'Form 4'] as const;

type Day = typeof DAYS_OF_WEEK[number];
type Grade = typeof GRADES[number];

// Helper function to format grade for API
const formatGradeForApi = (gradeLevel: Grade): string => {
  console.log('gradeLevel', gradeLevel);
  if (gradeLevel === 'Form 1') return 'Form 1';
  if (gradeLevel === 'Form 2') return 'Form 2';
  if (gradeLevel === 'Form 3') return 'Form 3';
  if (gradeLevel === 'Form 4') return 'Form 4';
  return gradeLevel;
};

// Utility function from original code
const getTimeForPeriod = (periodNumber: number): string => {
  const startHour = PERIODS_START_HOUR + Math.floor(periodNumber / 2);
  const isSecondHalf = periodNumber % 2 === 1;
  return `${startHour}:${isSecondHalf ? '30' : '00'} - ${startHour}:${isSecondHalf ? '59' : '29'}`;
};
// Add new interfaces for API responses
 
 
// New interfaces for consolidated views
// interface ConsolidatedPeriod {
//   subject: string;
//   teacher: string;
//   class?: string;
//   room?: string;
// }

interface TeacherSchedule {
  [period: number]: {
    subject: string;
    class: string;
    room?: string;
  };
}

// 1. Stream/Grade Level Timetable Component
export const StreamTimetable: React.FC<{
  timetable: TimetableData;
  selectedGrade: Grade;
  selectedDay: Day;
}> = ({ timetable, selectedGrade, selectedDay }) => {
  const periods = Array.from({ length: 8 }, (_, i) => i); // Assuming 8 periods per day

  const getStreamSchedule = (period: number, streamClass: string) => {
    const periodData = timetable[selectedGrade]?.[streamClass]?.[selectedDay]?.[period];
    if (!periodData || periodData === "Break") {
      return { subject: "Break", teacher: "-" };
    }
    const [subject, teacher] = periodData;
    return { subject, teacher };
  };

  return (
    <Paper p="md" radius="md" withBorder>
      <Title order={3} mb="md">{selectedGrade} Timetable - {selectedDay}</Title>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Time</Table.Th>
            {['A', 'B', 'C'].map(stream => (
              <Table.Th key={stream}>Stream {stream}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {periods.map(period => (
            <Table.Tr key={period}>
              <Table.Td>{getTimeForPeriod(period)}</Table.Td>
              {['A', 'B', 'C'].map(stream => {
                const schedule = getStreamSchedule(period, `${selectedGrade}${stream}`);
                return (
                  <Table.Td key={stream}>
                    {schedule.subject === "Break" ? (
                      <Badge color="gray">Break</Badge>
                    ) : (
                      <>
                        <Text size="sm">{schedule.subject}</Text>
                        <Text size="xs" c="dimmed">{schedule.teacher}</Text>
                      </>
                    )}
                  </Table.Td>
                );
              })}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
};

// 2. Whole School Timetable Component
export const SchoolTimetable: React.FC<{
  timetable: TimetableData;
  selectedDay: Day;
}> = ({ timetable, selectedDay }) => {
  const periods = Array.from({ length: 8 }, (_, i) => i);

  return (
    <Paper p="md" radius="md" withBorder>
      <Title order={3} mb="md">School Timetable - {selectedDay}</Title>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Time</Table.Th>
            {GRADES.map(gradeLevel => (
              ['A', 'B', 'C'].map(stream => (
                <Table.Th key={`${gradeLevel}${stream}`}>{gradeLevel} {stream}</Table.Th>
              ))
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {periods.map(period => (
            <Table.Tr key={period}>
              <Table.Td>{getTimeForPeriod(period)}</Table.Td>
              {GRADES.map(gradeLevel => (
                ['A', 'B', 'C'].map(stream => {
                  const className = `${gradeLevel}${stream}`;
                  const periodData = timetable[gradeLevel]?.[className]?.[selectedDay]?.[period];
                  return (
                    <Table.Td key={className}>
                      {periodData === "Break" ? (
                        <Badge color="gray">Break</Badge>
                      ) : periodData ? (
                        <>
                          <Text size="sm">{periodData[0]}</Text>
                          <Text size="xs" c="dimmed">{periodData[1]}</Text>
                        </>
                      ) : null}
                    </Table.Td>
                  );
                })
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
};

// 3. Teacher Timetable Component
export const TeacherTimetable: React.FC<{
  timetable: TimetableData;
  teacherId: string;
  teacherName: string;
}> = ({ timetable, teacherId, teacherName }) => {
  const extractTeacherSchedule = (day: Day): TeacherSchedule => {
    const schedule: TeacherSchedule = {};
    
    GRADES.forEach(gradeLevel => {
      Object.keys(timetable[gradeLevel] || {}).forEach(className => {
        const daySchedule = timetable[gradeLevel][className][day];
        daySchedule.forEach((period: PeriodData, index: number) => {
          if (period !== "Break" && period[1] === teacherId) {
            schedule[index] = {
              subject: period[0],
              class: className,
            };
          }
        });
      });
    });
    
    return schedule;
  };

  return (
    <Paper p="md" radius="md" withBorder>
      <Title order={3} mb="md">Teacher Timetable - {teacherName}</Title>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Time</Table.Th>
            {DAYS_OF_WEEK.map(day => (
              <Table.Th key={day}>{day}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {Array.from({ length: 8 }, (_, period) => (
            <Table.Tr key={period}>
              <Table.Td>{getTimeForPeriod(period)}</Table.Td>
              {DAYS_OF_WEEK.map(day => {
                const schedule = extractTeacherSchedule(day)[period];
                return (
                  <Table.Td key={day}>
                    {schedule ? (
                      <>
                        <Text size="sm">{schedule.subject}</Text>
                        <Text size="xs" c="dimmed">{schedule.class}</Text>
                      </>
                    ) : (
                      <Text c="dimmed">-</Text>
                    )}
                  </Table.Td>
                );
              })}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
};

// Main Container Component
export const TimetableViews: React.FC = () => {
  const [selectedDay, setSelectedDay] = React.useState<Day>(DAYS_OF_WEEK[0]);
  const [selectedGrade, setSelectedGrade] = React.useState<Grade>(GRADES[0]);
  const [selectedView, setSelectedView] = React.useState<'stream' | 'school' | 'teacher'>('stream');
  const [selectedTeacher, setSelectedTeacher] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [timetable, setTimetable] = React.useState<TimetableData | null>(null);
  const [teachers, setTeachers] = React.useState<TeachingStaff[]>([]);
  // Add your fetch timetable logic here
// Fetch teachers data
// Updated fetch teachers function to match new API response
const fetchTeachers = React.useCallback(async () => {
  try {
    const response = await api.get<StaffResponse>('/staffs/staffs/get-staff-teaching');
    if (response.data.teachingStaff) {
      setTeachers(response.data.teachingStaff);
    } else {
      throw new Error('Failed to fetch teachers');
    }
  } catch   {
    notifications.show({
      title: 'Error',
      message: 'Failed to fetch teachers list',
      color: 'red',
      icon: <IconX size={16} />
    });
  }
}, []);

// Fetch stream timetable
// Updated fetch stream timetable with correct gradeLevel formatting
const fetchStreamTimetable = React.useCallback(async () => {
  try {
    setLoading(true);
    const formattedGrade = formatGradeForApi(selectedGrade);
    const response = await api.get<TimetableResponse>(`/timetable/stream/${formattedGrade}`);
    console.log('Stream API response', response.data);
    
    if (response.data.success) {
      setTimetable(response.data.data);
    } else {
      throw new Error(response.data.message || 'Failed to fetch stream timetable');
    }
  } catch (error: unknown) {
    const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to fetch stream timetable';
    notifications.show({
      title: 'Error',
      message: errorMessage,
      color: 'red',
      icon: <IconX size={16} />
    });
    setTimetable(null);
  } finally {
    setLoading(false);
  }
}, [selectedGrade]);


const fetchSchoolTimetable = React.useCallback(async () => {
  try {
    setLoading(true);
    const response = await api.get<TimetableResponse>('/timetable/school');
    if (response.data.success) {
      setTimetable(response.data.data);
    } else {
      throw new Error(response.data.message || 'Failed to fetch school timetable');
    }
  } catch (error: unknown) {
    const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to fetch school timetable';
    notifications.show({
      title: 'Error',
      message: errorMessage,
      color: 'red',
      icon: <IconX size={16} />
    });
    setTimetable(null);
  } finally {
    setLoading(false);
  }
}, []);

// Updated fetch teacher timetable
const fetchTeacherTimetable = React.useCallback(async () => {
  try {
    setLoading(true);
    if (!selectedTeacher) {
      throw new Error('No teacher selected');
    }
    const response = await api.get<TimetableResponse>(`/timetable/teacher/${selectedTeacher}`);
    if (response.data.success) {
      setTimetable(response.data.data);
    } else {
      throw new Error(response.data.message || 'Failed to fetch teacher timetable');
    }
  } catch (error: unknown) {
    const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to fetch teachertimetable';
    notifications.show({
      title: 'Error',
      message: errorMessage,
      color: 'red',
      icon: <IconX size={16} />
    });
    setTimetable(null);
  } finally {
    setLoading(false);
  }
}, [selectedTeacher]);


// Effect to fetch teachers on component mount
React.useEffect(() => {
  fetchTeachers();
}, [fetchTeachers]);

// Effect to fetch appropriate timetable when view changes
React.useEffect(() => {
  const fetchTimetable = async () => {
    switch (selectedView) {
      case 'stream':
        await fetchStreamTimetable();
        break;
      case 'school':
        await fetchSchoolTimetable();
        break;
      case 'teacher':
        if (selectedTeacher) {
          await fetchTeacherTimetable();
        }
        break;
    }
  };

  fetchTimetable();
}, [selectedView, selectedGrade, selectedTeacher, fetchStreamTimetable, fetchSchoolTimetable, fetchTeacherTimetable]);
return (
  <>
<Stack gap="md">
      <Grid>
        <Grid.Col span={4}>
          <Select
            label="Select View"
            data={[
              { value: 'stream', label: 'Stream View' },
              { value: 'school', label: 'School View' },
              { value: 'teacher', label: 'Teacher View' }
            ]}
            value={selectedView}
            onChange={(value: string | null) => {
              if (value) {
                setSelectedView(value as 'stream' | 'school' | 'teacher');
              }
            }}
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <Select
            label="Select Day"
            data={DAYS_OF_WEEK}
            value={selectedDay}
            onChange={(value) => setSelectedDay(value as Day)}
          />
        </Grid.Col>
        {selectedView === 'stream' && (
          <Grid.Col span={4}>
            <Select
              label="Select Grade"
              data={GRADES}
              value={selectedGrade}
              onChange={(value) => setSelectedGrade(value as Grade)}
            />
          </Grid.Col>
        )}
        {selectedView === 'teacher' && (
          <Grid.Col span={4}>
            <Select
              label="Select Teacher"
              data={teachers.map(teacher => ({
                value: teacher._id,
                label: `${teacher.firstName} ${teacher.lastName}`
              }))}
              value={selectedTeacher}
              onChange={(value) => setSelectedTeacher(value || '')}
              searchable
            />
          </Grid.Col>
        )}
      </Grid>

      <LoadingOverlay visible={loading} />
      
      {timetable && (
        <>
          {selectedView === 'stream' && (
            <StreamTimetable
              timetable={timetable}
              selectedGrade={selectedGrade}
              selectedDay={selectedDay}
            />
          )}
          {selectedView === 'school' && (
            <SchoolTimetable
              timetable={timetable}
              selectedDay={selectedDay}
            />
          )}
          {selectedView === 'teacher' && selectedTeacher && (
            <TeacherTimetable
            timetable={timetable}
            teacherId={selectedTeacher}
            teacherName={
              teachers.find(t => t._id === selectedTeacher)
                ? `${teachers.find(t => t._id === selectedTeacher)?.firstName} ${teachers.find(t => t._id === selectedTeacher)?.lastName}`
                : ''
            }
          />
          )}
        </>
      )}
    </Stack>
  </>
);
};