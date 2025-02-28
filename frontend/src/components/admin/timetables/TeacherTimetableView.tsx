import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Table, 
  Button, 
  Group, 
  Text, 
  Card, 
  Select, 
  Loader, 
  Alert,
  Avatar,
  Badge,
  Stack,
  ScrollArea,
  Grid,
  Progress,
  RingProgress,
  Paper
} from '@mantine/core';

import { 
  IconUserCircle,
  IconAlertCircle,
  IconCheck,
  IconAlertTriangle,
  IconCalendarStats
} from '@tabler/icons-react';
import api from '../../../utils/api/axios';

// Data structure interfaces
interface StreamData {
  className: string;
  schedule: Record<string, (string | [string, string])[]>;
}

interface TimeSlot {
  start: string;
  end: string;
  label: string;
}

interface APITimeSlot {
  start: string;
  end: string;
  type: string;
}

interface TimetableData {
  _id?: string;
  academicYear: string;
  term: string;
  gradeLevel: string;
  status?: string;
  streams?: Record<string, StreamData>;
  [key: string]: string | number | Record<string, unknown> | undefined;
}

interface TimetableResponse {
  success: boolean;
  message?: string;
  data?: TimetableData[];
}

interface TeacherData {
  _id: string;
  firstName: string;
  lastName: string;
  subjects: string[];
  address?: string;
  created_at?: string;
  department?: string;
  employeeId?: string;
  gradeLevels?: string[];
  phoneNumber?: string;
  position?: string;
  roleArea?: string;
  specialties?: string[];
  updated_at?: string;
  user_email?: string;
  [key: string]: string | string[] | number | boolean | undefined;
}

interface WorkloadStat {
  teacherId: string;
  teacherName: string;
  subjects: string[];
  targetWorkload: number;
  actualWorkload: number;
  utilizationPercentage: number;
  status: 'underloaded' | 'optimal' | 'overloaded';
  lessonsBySubject: Record<string, number>;
  lessonsByGrade: Record<string, number>;
  lessonsByDay: Record<string, number>;
}

interface TeacherInfo {
  name: string;
  department: string;
  subjects: string[];
  workloadStats: WorkloadStat;
}

interface PeriodInfo {
  subject: string;
  subjectCode: string;
  class: string;
  gradeLevel: string;
  period: number;
  time: string;
}

export default function TeacherTimetableView() {
  const [loading, setLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState<string>(new Date().getFullYear().toString());
  const [term, setTerm] = useState<string>('1');
  const [error, setError] = useState<string | null>(null);
  const [timetables, setTimetables] = useState<TimetableData[]>([]);
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [workloadStats, setWorkloadStats] = useState<WorkloadStat | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const weekDays = useMemo(() => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], []);
  
  // Add proper types for teacherSchedule and teacherInfo
  const [teacherSchedule, setTeacherSchedule] = useState<Record<string, PeriodInfo[]>>({});
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);

  // Fetch timetables function
  const fetchTimetables = useCallback(async () => {
    setLoading(true);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (academicYear) params.append('academicYear', academicYear);
      if (term) params.append('term', term);
      params.append('status', 'active'); // Only fetch active timetables
      
      const response = await api.get(`/timetable/?${params.toString()}`);
      const responseData = response.data as TimetableResponse;
      
      if (responseData.success && responseData.data) {
        setTimetables(responseData.data);
      } else {
        setError('No timetables found');
        setTimetables([]);
      }
    } catch (error) {
      console.error('Failed to fetch timetables:', error);
      setError('Failed to fetch timetables');
      setTimetables([]);
    } finally {
      setLoading(false);
    }
  }, [academicYear, term]);

  // Time slots configuration
  const fetchTimeSlots = useCallback(async () => {
    try {
      const response = await api.get('/timeslots/configurations/periods');
      
      if (response.data) {
        // Convert the object with numbered keys to an array of TimeSlot objects
        const timeSlotEntries = Object.entries(response.data);
        const formattedTimeSlots = timeSlotEntries.map(([, value]) => {
          const slot = value as APITimeSlot;
          // Map the API response format to your TimeSlot interface
          return {
            start: slot.start,
            end: slot.end,
            label: `${slot.type.charAt(0).toUpperCase() + slot.type.slice(1)}` // Capitalize the type for the label
          };
        });
        
        setTimeSlots(formattedTimeSlots);
      } else {
        // Fallback to default time slots if response is empty
        setDefaultTimeSlots();
      }
    } catch (error) {
      console.error('Failed to fetch time slots configuration:', error);
      // Fallback to defaults
      setDefaultTimeSlots();
    }
  }, []);

  // Extract default time slots to a separate function for reusability
  const setDefaultTimeSlots = () => {
    setTimeSlots([
      {"start": "7:00", "end": "7:05", "label": "Registration"},
      {"start": "7:05", "end": "7:40", "label": "Lesson"},
      {"start": "7:40", "end": "8:15", "label": "Lesson"},
      {"start": "8:15", "end": "8:50", "label": "Lesson"},
      {"start": "8:50", "end": "9:25", "label": "Lesson"},
      {"start": "9:25", "end": "9:40", "label": "Morning Break Time"},
      {"start": "9:40", "end": "10:15", "label": "Lesson"},
      {"start": "10:15", "end": "10:50", "label": "Lesson"},
      {"start": "10:50", "end": "11:25", "label": "Lesson"},
      {"start": "11:25", "end": "12:00", "label": "Lesson"},
      {"start": "12:00", "end": "13:00", "label": "Lunch Break Time"},
      {"start": "13:00", "end": "16:00", "label": "Sporting/Clubs/Extracurricular"},
    ]);
  };

  // Refactored function to fetch timetables for a specific teacher
  const fetchTeacherTimetable = useCallback(async (teacherId: string) => {
    setLoading(true);
    setStatsLoading(true); // Set stats loading to true when fetching teacher data
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (academicYear) params.append('academicYear', academicYear);
      if (term) params.append('term', term);
      
      // Call the teacher-specific endpoint
      const response = await api.get(`/timetable/teacher/${teacherId}?${params.toString()}`);
      const responseData = response.data;
      
      if (responseData.success) {
        setTeacherSchedule(responseData.schedule);
        setTeacherInfo({
          name: responseData.teacherName,
          department: responseData.department,
          subjects: responseData.subjects,
          workloadStats: responseData.workload_stats
        });
        
        // Also set workload stats
        if (responseData.workload_stats) {
          setWorkloadStats(responseData.workload_stats);
        } else {
          setWorkloadStats(null);
        }
      } else {
        setError(responseData.message || 'Failed to fetch teacher timetable');
        setTeacherSchedule({});
        setTeacherInfo(null);
        setWorkloadStats(null);
      }
    } catch (error) {
      console.error('Failed to fetch teacher timetable:', error);
      setError('Failed to fetch teacher timetable');
      setTeacherSchedule({});
      setTeacherInfo(null);
      setWorkloadStats(null);
    } finally {
      setLoading(false);
      setStatsLoading(false); // Set stats loading to false when done
    }
  }, [academicYear, term]);
  
  const fetchTeachers = useCallback(async () => {
    try {
      const response = await api.get('/staffs/staffs/get-staff-teaching');
      const responseData = response.data;
      
      // Check if the teachingStaff array exists in the response
      if (responseData && responseData.teachingStaff && Array.isArray(responseData.teachingStaff)) {
        setTeachers(responseData.teachingStaff);
      } else {
        setTeachers([]);
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
      setTeachers([]);
    }
  }, []);

  // Function to render the teacher's timetable
  const renderTeacherTimetable = useCallback(() => {
    if (!selectedTeacher) {
      return (
        <Alert color="blue" title="No Teacher Selected">
          Please select a teacher to view their schedule.
        </Alert>
      );
    }

    const teacher = teachers.find(t => t._id === selectedTeacher);
    if (!teacher) return null;

    return (
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Card.Section withBorder p="xs" bg="blue.1">
          <Group>
            <Avatar color="blue" radius="xl">
              <IconUserCircle size={24} />
            </Avatar>
            <div>
              <Text fw={700} size="lg">{teacherInfo?.name || `${teacher.firstName} ${teacher.lastName}`}'s Timetable</Text>
              <Group gap={5}>
                {teacherInfo?.subjects.map((subject, index) => (
                  <Badge key={index} size="sm">{subject}</Badge>
                ))}
              </Group>
            </div>
          </Group>
        </Card.Section>
        
        <ScrollArea>
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Time</th>
                {weekDays.map(day => (
                  <th key={day}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, periodIndex) => (
                <tr key={periodIndex}>
                  <td>
                    <Text fw={500}>{slot.start} - {slot.end}</Text>
                    <Text size="xs" c="dimmed">{slot.label}</Text>
                  </td>
                  
                  {weekDays.map(day => {
                    // Check if this is a break period by the slot label
                    if (slot.label.includes('Break') || slot.label === 'Registration' || slot.label.includes('Sporting')) {
                      return (
                        <td key={day} style={{ backgroundColor: '#f0f0f0' }}>
                          <Text fw={700} c="dimmed" ta="center">{slot.label}</Text>
                        </td>
                      );
                    }
                    
                    // Find classes for this day and period
                    const classSessions = teacherSchedule[day]?.filter(
                      period => period.period === periodIndex + 1
                    );
                    
                    if (classSessions && classSessions.length > 0) {
                      return (
                        <td key={day}>
                          <Stack gap={4}>
                            {classSessions.map((session, idx) => (
                              <div key={idx}>
                                <Text size="sm" fw={500}>{session.subject}</Text>
                                <Text size="xs" c="dimmed">{session.class}</Text>
                              </div>
                            ))}
                          </Stack>
                        </td>
                      );
                    }
                    
                    return <td key={day}>-</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </Table>
        </ScrollArea>
      </Card>
    );
  }, [selectedTeacher, teacherSchedule, teachers, weekDays, timeSlots, teacherInfo]);

  const renderWorkloadSummary = useCallback(() => {
    if (!workloadStats || statsLoading) {
      return (
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Stack align="center" p="md">
            {statsLoading ? (
              <Loader size="md" />
            ) : (
              <Text>No workload statistics available</Text>
            )}
          </Stack>
        </Card>
      );
    }

    // Create status badge with appropriate color
    const getStatusBadge = (status: string) => {
      switch (status) {
        case 'optimal':
          return <Badge color="green" leftSection={<IconCheck size={14} />}>Optimal</Badge>;
        case 'underloaded':
          return <Badge color="yellow" leftSection={<IconAlertTriangle size={14} />}>Underloaded</Badge>;
        case 'overloaded':
          return <Badge color="red" leftSection={<IconAlertCircle size={14} />}>Overloaded</Badge>;
        default:
          return <Badge color="gray">Unknown</Badge>;
      }
    };

    // Function to get the color based on utilization
    const getUtilizationColor = (percentage: number) => {
      if (percentage < 80) return 'yellow';
      if (percentage > 110) return 'red';
      return 'green';
    };
    
    // Prepare data for subject distribution chart
    const subjectChartData = Object.entries(workloadStats.lessonsBySubject).map(([subject, count]) => ({
      label: subject,
      value: count,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`
    }));

    // Prepare data for days distribution
    const dayDistribution = weekDays.map(day => ({
      day,
      lessons: workloadStats.lessonsByDay[day] || 0
    }));

    return (
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Card.Section withBorder p="xs" bg="blue.1">
          <Group>
            <Text fw={700} size="lg">Workload Statistics</Text>
            {getStatusBadge(workloadStats.status)}
          </Group>
        </Card.Section>

        <Grid p="md">
          <Grid.Col span={6}>
            <Paper withBorder p="md" radius="md">
              <Text size="lg" fw={500} mb="xs">Utilization</Text>
              <RingProgress
                size={120}
                thickness={12}
                roundCaps
                label={
                  <Text size="lg" fw={700} ta="center">
                    {workloadStats.utilizationPercentage}%
                  </Text>
                }
                sections={[
                  { value: Math.min(100, workloadStats.utilizationPercentage), color: getUtilizationColor(workloadStats.utilizationPercentage) }
                ]}
              />
              <Text mt="md" size="sm">
                Target: {workloadStats.targetWorkload} lessons per week
              </Text>
              <Text size="sm">
                Actual: {workloadStats.actualWorkload} lessons per week
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={6}>
            <Paper withBorder p="md" radius="md">
              <Text size="lg" fw={500} mb="xs">Subject Distribution</Text>
              {subjectChartData.length > 0 ? (
                <Stack gap="xs">
                  {subjectChartData.map((subject, index) => (
                    <div key={index}>
                      <Group justify="space-between" mb={5}>
                        <Text size="sm">{subject.label}</Text>
                        <Text size="sm" fw={500}>{subject.value} lessons</Text>
                      </Group>
                      <Progress 
                        value={(subject.value / workloadStats.actualWorkload) * 100} 
                        color={subject.color}
                        size="sm"
                      />
                    </div>
                  ))}
                </Stack>
              ) : (
                <Text>No subjects assigned</Text>
              )}
            </Paper>
          </Grid.Col>

          <Grid.Col span={12}>
            <Paper withBorder p="md" radius="md">
              <Text size="lg" fw={500} mb="xs">Daily Distribution</Text>
              <Group grow>
                {dayDistribution.map((day, index) => (
                  <Stack key={index} align="center" gap={5}>
                    <Text size="sm">{day.day.substring(0, 3)}</Text>
                    <Text fw={700}>{day.lessons}</Text>
                    <Progress 
                      value={(day.lessons / (workloadStats.targetWorkload / 5)) * 100} 
                      color={day.lessons > (workloadStats.targetWorkload / 5) * 1.2 ? "red" : "blue"}
                      size="lg"
                      radius="xl"
                      style={{ height: 8, width: "100%" }}
                    />
                  </Stack>
                ))}
              </Group>
            </Paper>
          </Grid.Col>
        </Grid>
      </Card>
    );
  }, [workloadStats, statsLoading, weekDays]);

  // Function to render timetable status information
  const renderTimetableStatus = useCallback(() => {
    if (loading) return null;
    
    if (timetables.length === 0) {
      return (
        <Alert color="yellow" title="No Active Timetables" icon={<IconCalendarStats />} mb="md">
          There are no active timetables for the selected academic year and term. 
          Please make sure timetables have been created and activated.
        </Alert>
      );
    }
    
    return (
      <Alert color="green" title="Timetables Available" icon={<IconCheck />} mb="md">
        {timetables.length} active timetable(s) found for {academicYear}, Term {term}.
      </Alert>
    );
  }, [timetables, loading, academicYear, term]);

  // Initial data loading
  useEffect(() => {
    fetchTimeSlots();
    fetchTimetables();
    fetchTeachers();
  }, [fetchTimeSlots, fetchTimetables, fetchTeachers]);
  
  // Update teacher data when selection changes
  useEffect(() => {
    if (selectedTeacher) {
      fetchTeacherTimetable(selectedTeacher);
    } else {
      setTeacherSchedule({});
      setTeacherInfo(null);
      setWorkloadStats(null);
    }
  }, [selectedTeacher, fetchTeacherTimetable]);

  return (
    <div>
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={700}>Teacher Timetable View</Text>
      </Group>
      
      <Group mb="xl">
        <Select
          label="Academic Year"
          placeholder="Select Year"
          data={[
            (new Date().getFullYear() - 1).toString(),
            new Date().getFullYear().toString(),
            (new Date().getFullYear() + 1).toString()
          ]}
          value={academicYear}
          onChange={(value) => setAcademicYear(value || new Date().getFullYear().toString())}
          w={150}
        />
        
        <Select
          label="Term"
          placeholder="Select Term"
          data={['1', '2', '3']}
          value={term}
          onChange={(value) => setTerm(value || '1')}
          w={100}
        />
        
        <Select
          label="Teacher"
          placeholder="Select Teacher"
          data={teachers.map(t => ({ value: t._id, label: `${t.firstName} ${t.lastName}` }))}
          value={selectedTeacher}
          onChange={(value) => setSelectedTeacher(value || '')}
          searchable
          w={250}
          disabled={timetables.length === 0}
        />
        
        <Button
          onClick={() => {
            fetchTimetables();
            fetchTeachers();
            if (selectedTeacher) {
              fetchTeacherTimetable(selectedTeacher);
            }
          }}
          variant="outline"
          mt={24}
        >
          Refresh
        </Button>
      </Group>
      
      {error && (
        <Alert color="red" title="Error" mb="md">
          {error}
        </Alert>
      )}
      
      {/* Display timetable status information */}
      {renderTimetableStatus()}
      
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader size="lg" />
        </div>
      ) : (
        <>
          {selectedTeacher && (
            <Grid mb="md">
              <Grid.Col span={12}>{renderWorkloadSummary()}</Grid.Col>
              <Grid.Col span={12}>{renderTeacherTimetable()}</Grid.Col>
            </Grid>
          )}
        </>
      )}
    </div>
  );
}