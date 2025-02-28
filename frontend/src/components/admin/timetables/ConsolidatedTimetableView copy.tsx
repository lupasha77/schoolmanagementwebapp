import { useState, useEffect, useCallback } from 'react';
import { 
  Table, 
  Button, 
  Group, 
  Text, 
  Card, 
  Select, 
  Loader, 
  Alert,
  Stack,
  Grid,
  ScrollArea,
  SegmentedControl,
  Center,
  Paper,
  Chip,
  Badge,
  ActionIcon,
  Tooltip,
  Title,
  Divider,
  ColorSwatch,
  Transition,
  RingProgress,
  Avatar,
  Tabs,
  Accordion,
  MediaQuery,
  Collapse,
  Box
} from '@mantine/core';

import { 
  IconCalendar, 
  IconTable, 
  IconRefresh, 
  IconPrinter, 
  IconDownload,
  IconInfoCircle,
  IconCalendarEventFilled,
  IconBook,
  IconFilter,
  IconChevronRight,
  IconAlertCircle,
  IconAdjustments
} from '@tabler/icons-react';
import api from '../../../utils/api/axios';
 
// Data structure interfaces
interface Period {
  period_id: string;
  start: string;
  end: string;
  type: string;
  subject?: string;
  teacher?: string;
  name?: string;
}

interface StreamData {
  className: string;
  schedule: Record<string, Period[]>;
}

interface TimetableData {
  _id?: string;
  academicYear: string;
  term: string;
  gradeLevel: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  streams: Record<string, StreamData>;
  [key: string]: string | Record<string, unknown> | undefined;
}

interface TimetableResponse {
  success: boolean;
  message?: string;
  data?: TimetableData[];
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

// Color mapping for subject categories
interface SubjectColorMap {
  [key: string]: string;
}

// Enhanced component for the timetable item in daily view
const TimetableItem = ({ 
  period, 
  timeSlot, 
  getSubjectColor 
}: { 
  period: Period | undefined, 
  timeSlot: TimeSlot, 
  getSubjectColor: (subject: string) => string 
}) => {
  if (!period) {
    return (
      <Table.Tr>
        <Table.Td>
          <Text fw={500} size="sm">{timeSlot.start} - {timeSlot.end}</Text>
          <Text size="xs" c="dimmed">{timeSlot.label}</Text>
        </Table.Td>
        <Table.Td colSpan={2}>
          <Text c="dimmed" ta="center" size="sm">Free Period</Text>
        </Table.Td>
      </Table.Tr>
    );
  }

  if (period.type === "Break" || period.type.toLowerCase().includes('break')) {
    return (
      <Table.Tr style={{ backgroundColor: '#f0f0f0' }}>
        <Table.Td>
          <Text fw={500} size="sm">{timeSlot.start} - {timeSlot.end}</Text>
          <Text size="xs" c="dimmed">{timeSlot.label}</Text>
        </Table.Td>
        <Table.Td colSpan={2}>
          <Text fw={700} c="dimmed" ta="center" size="sm">{period.name || 'Break'}</Text>
        </Table.Td>
      </Table.Tr>
    );
  }

  if (period.type === "lesson" && period.subject && period.teacher) {
    const subjectColor = getSubjectColor(period.subject);
    
    return (
      <Table.Tr>
        <Table.Td>
          <Text fw={500} size="sm">{timeSlot.start} - {timeSlot.end}</Text>
          <Text size="xs" c="dimmed">{timeSlot.label}</Text>
        </Table.Td>
        <Table.Td>
          <Group gap="xs">
            <ColorSwatch size={12} color={subjectColor} />
            <Text size="sm" fw={500}>{period.subject}</Text>
          </Group>
        </Table.Td>
        <Table.Td>
          <Group gap="xs">
            <Avatar size="sm" radius="xl" color="blue">
              {period.teacher.split(' ').map(n => n[0]).join('')}
            </Avatar>
            <Text size="sm">{period.teacher}</Text>
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  }

  // Default case for other period types
  return (
    <Table.Tr>
      <Table.Td>
        <Text fw={500} size="sm">{timeSlot.start} - {timeSlot.end}</Text>
        <Text size="xs" c="dimmed">{timeSlot.label}</Text>
      </Table.Td>
      <Table.Td colSpan={2}>
        <Text c="dimmed" ta="center" size="sm">{period.name || period.type}</Text>
      </Table.Td>
    </Table.Tr>
  );
};

export default function ConsolidatedTimetableView() {
  const [loading, setLoading] = useState(false);
  const [gradeLevel, setGradeLevel] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>(new Date().getFullYear().toString());
  const [term, setTerm] = useState<string>('1');
  const [error, setError] = useState<string | null>(null);
  const [timetables, setTimetables] = useState<TimetableData[]>([]);
  const [selectedTimetable, setSelectedTimetable] = useState<TimetableData | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [selectedStream, setSelectedStream] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [subjectStats, setSubjectStats] = useState<{[key: string]: number}>({});
  const [mobileFilterExpanded, setMobileFilterExpanded] = useState(false);
  
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const gradeLevels = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];
  
  // Update the function that determines if a period is a break
  const isBreakPeriod = (slot: TimeSlot): boolean => {
    return slot.label.toLowerCase().includes('break');
  };

  // Color mapping for subject visualization
  const subjectColorMap: SubjectColorMap = {
    'Mathematics': 'blue',
    'Physics': 'teal',
    'Chemistry': 'cyan',
    'Biology': 'green',
    'History': 'orange',
    'Geography': 'indigo',
    'English': 'violet',
    'Kiswahili': 'grape',
    'Computer Studies': 'pink',
    'Business Studies': 'yellow',
    'Agriculture': 'lime',
    'Home Science': 'red',
    'Shona Language': 'orange',
    'Ndebele Language': 'indigo',
  };
  
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
  
  // Call this function when the component mounts
  useEffect(() => {
    fetchTimeSlots();
  }, [fetchTimeSlots]);

  // Helper function to get subject color
  const getSubjectColor = (subject: string): string => {
    // Try to match with the map
    for (const [key, value] of Object.entries(subjectColorMap)) {
      if (subject.includes(key)) {
        return value;
      }
    }
    
    // Default color for unmapped subjects
    return 'gray';
  };
  
  // Wrap calculateSubjectStats in useCallback to prevent recreating on every render
  const calculateSubjectStats = useCallback(() => {
    if (!selectedTimetable || !selectedStream) return;
    
    const stats: {[key: string]: number} = {};
    const streamData = selectedTimetable.streams[selectedStream];
    
    if (!streamData) return;
    
    // Count occurrences of each subject across all days
    weekDays.forEach(day => {
      if (!streamData.schedule[day]) return;
      
      streamData.schedule[day].forEach(period => {
        if (period && period.type === "lesson" && period.subject) {
          stats[period.subject] = (stats[period.subject] || 0) + 1;
        }
      });
    });
    
    setSubjectStats(stats);
  }, [selectedTimetable, selectedStream, weekDays]);

  // Now we include calculateSubjectStats in the dependency array
  useEffect(() => {
    if (selectedTimetable && selectedTimetable.streams) {
      // Set the first stream as default when timetable changes
      const streams = Object.keys(selectedTimetable.streams);
      if (streams.length > 0 && !streams.includes(selectedStream)) {
        setSelectedStream(streams[0]);
      }
      
      // Calculate subject statistics
      calculateSubjectStats();
    }
  }, [selectedTimetable, selectedStream, calculateSubjectStats]);

  // Create current year and surrounding years for dropdown
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    (currentYear - 1).toString(), 
    currentYear.toString(), 
    (currentYear + 1).toString()
  ];

  // Wrap fetchTimetables in useCallback to prevent it from changing on every render
  const fetchTimetables = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (academicYear) params.append('academicYear', academicYear);
      if (term) params.append('term', term);
      if (gradeLevel) params.append('gradeLevel', gradeLevel);
      params.append('status', 'active'); // Only fetch active timetables
      
      const response = await api.get(`/timetable/?${params.toString()}`);
      const responseData = response.data as TimetableResponse;
      
      if (responseData.success && responseData.data) {
        console.log('Fetched timetables:', responseData.data);
        setTimetables(responseData.data);
        
        // Set the first timetable as selected if available
        if (responseData.data.length > 0) {
          setSelectedTimetable(responseData.data[0]);
        } else {
          setSelectedTimetable(null);
        }
      } else {
        setError(responseData.message || 'No timetables found');
        setTimetables([]);
        setSelectedTimetable(null);
      }
    } catch (error) {
      console.error('Failed to fetch timetables:', error);
      setError('Failed to fetch timetables');
      setTimetables([]);
      setSelectedTimetable(null);
    } finally {
      setLoading(false);
      setIsFirstLoad(false);
    }
  }, [academicYear, term, gradeLevel]); 

  useEffect(() => {
    fetchTimetables();
  }, [fetchTimetables]);

  const handleTimetableSelect = (timetableId: string | null) => {
    if (timetableId) {
      const selected = timetables.find(t => t._id === timetableId);
      setSelectedTimetable(selected || null);
      
      // Reset stream selection when timetable changes
      if (selected && selected.streams) {
        const streams = Object.keys(selected.streams);
        setSelectedStream(streams.length > 0 ? streams[0] : '');
      } else {
        setSelectedStream('');
      }
    } else {
      setSelectedTimetable(null);
      setSelectedStream('');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Render the daily view timetable for a specific stream
  const renderDailyTimetable = () => {
    if (!selectedTimetable || !selectedTimetable.streams || !selectedStream) {
      return (
        <Alert color="blue" title="No Data" icon={<IconInfoCircle />}>
          Please select a timetable and stream to view.
        </Alert>
      );
    }

    const streamData = selectedTimetable.streams[selectedStream];
    if (!streamData) return null;

    return (
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Card.Section withBorder p="md" bg="blue.1">
          <Stack gap="xs">
            <Group justify="space-between" wrap="nowrap">
              <Title order={3} size="h4" className="timetable-title">
                {streamData.className} - {selectedDay} Timetable
              </Title>
              
              <Group>
                <MediaQuery smallerThan="sm" styles={{ display: 'none' }}>
                  <Tooltip label="Print Timetable">
                    <ActionIcon variant="light" color="blue" onClick={handlePrint}>
                      <IconPrinter size={20} />
                    </ActionIcon>
                  </Tooltip>
                </MediaQuery>
              </Group>
            </Group>
            <Text size="sm" c="dimmed">Academic Year: {selectedTimetable.academicYear} | Term: {selectedTimetable.term}</Text>
            
            <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
              <SegmentedControl
                fullWidth
                value={selectedDay}
                onChange={(value) => setSelectedDay(value)}
                data={weekDays}
                size="xs"
              />
            </MediaQuery>
            
            <MediaQuery smallerThan="sm" styles={{ display: 'none' }}>
              <SegmentedControl
                value={selectedDay}
                onChange={(value) => setSelectedDay(value)}
                data={weekDays}
                size="xs"
              />
            </MediaQuery>
          </Stack>
        </Card.Section>
        
        <ScrollArea>
          <Table 
            striped 
            highlightOnHover 
            withTableBorder 
            withColumnBorders 
            horizontalSpacing={{ base: 'xs', md: 'md' }}
            verticalSpacing={{ base: 'xs', md: 'sm' }}
            className="print-friendly-table"
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: '20%' }}>Time</Table.Th>
                <Table.Th style={{ width: '40%' }}>Subject</Table.Th>
                <Table.Th style={{ width: '40%' }}>Teacher</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {timeSlots.map((slot, index) => {
                const periodData = streamData.schedule[selectedDay] ? 
                  streamData.schedule[selectedDay][index] : undefined;
                
                return (
                  <TimetableItem 
                    key={index} 
                    timeSlot={slot} 
                    period={periodData} 
                    getSubjectColor={getSubjectColor} 
                  />
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
        
        <Card.Section withBorder p="md" bg="gray.0">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Last Updated: {new Date(selectedTimetable.updatedAt || '').toLocaleDateString()}</Text>
            <Badge color={selectedTimetable.status === 'active' ? 'green' : 'yellow'}>
              {selectedTimetable.status?.toUpperCase()}
            </Badge>
          </Group>
        </Card.Section>
      </Card>
    );
  };

  // Render the weekly view of the whole school timetable
  const renderWeeklyTimetable = () => {
    if (!selectedTimetable || !selectedTimetable.streams) {
      return (
        <Alert color="blue" title="No Data" icon={<IconInfoCircle />}>
          Please select a timetable to view.
        </Alert>
      );
    }

    return (
      <Card shadow="sm" p={{ base: 'xs', md: 'lg' }} radius="md" withBorder>
        <Card.Section withBorder p="md" bg="blue.1">
          <Group justify="space-between">
            <Stack gap="xs">
              <Title order={3} size={{ base: 'h5', md: 'h3' }}>Weekly School Timetable - {selectedTimetable.gradeLevel}</Title>
              <Text size="sm" c="dimmed">Academic Year: {selectedTimetable.academicYear} | Term: {selectedTimetable.term}</Text>
            </Stack>
            <Tooltip label="Print Timetable">
              <ActionIcon variant="light" color="blue" onClick={handlePrint}>
                <IconPrinter size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Card.Section>
        
        <ScrollArea>
          <Box style={{ overflowX: 'auto', minWidth: '100%' }}>
            <Table 
              striped 
              highlightOnHover 
              withTableBorder 
              withColumnBorders 
              horizontalSpacing={{ base: 'xs', md: 'sm' }} 
              verticalSpacing={{ base: 'xs', md: 'sm' }} 
              className="print-friendly-table"
              style={{ minWidth: '900px' }} // Ensure table has a minimum width
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '10%' }}>Day</Table.Th>
                  {timeSlots.map((slot, index) => (
                    <Table.Th key={index}>
                      <Text size="xs">{slot.start} - {slot.end}</Text>
                      <Text size={{ base: 'xs', md: 'sm' }}>{slot.label}</Text>
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {weekDays.map((day) => (
                  <Table.Tr key={day}>
                    <Table.Td><Text fw={700}>{day}</Text></Table.Td>
                    {timeSlots.map((slot, periodIndex) => {
                      // For each time slot, gather all classes and their subjects
                      const periodContent: React.ReactNode[] = [];
                      const isBreakTime = isBreakPeriod(slot);
                      
                      Object.entries(selectedTimetable.streams || {}).forEach(([, streamData]) => {
                        if (!streamData.schedule[day] || !streamData.schedule[day][periodIndex]) {
                          return;
                        }
                        
                        const periodData = streamData.schedule[day][periodIndex];
                        
                        if (periodData && periodData.type === "lesson" && periodData.subject) {
                          const subjectColor = getSubjectColor(periodData.subject);
                          
                          periodContent.push(
                            <Paper 
                              key={streamData.className} 
                              p="xs" 
                              withBorder 
                              my="xs" 
                              bg={`${subjectColor}.0`}
                              style={{
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                ':hover': {
                                  transform: 'translateY(-2px)',
                                  boxShadow: '0 5px 10px rgba(0, 0, 0, 0.1)'
                                }
                              }}
                            >
                              <Group gap={4}>
                                <ColorSwatch size={8} color={`${subjectColor}`} />
                                <Text size="xs" fw={600}>{streamData.className}:</Text>
                                <Text size="xs">{periodData.subject}</Text>
                              </Group>
                              <Text size="xs" c="dimmed">{periodData.teacher}</Text>
                            </Paper>
                          );
                        } else if (periodData && periodData.type.toLowerCase().includes('break')) {
                          if (!isBreakTime) {
                            periodContent.push(
                              <div key={streamData.className}>
                                <Text size="xs" fw={500}>{streamData.className}: Break</Text>
                              </div>
                            );
                          }
                        }
                      });
                      
                      if (isBreakTime) {
                        return (
                          <Table.Td key={periodIndex} style={{ backgroundColor: '#f0f0f0' }}>
                            <Text fw={500} size="sm" ta="center">Break</Text>
                          </Table.Td>
                        );
                      }
                      
                      return (
                        <Table.Td key={periodIndex}>
                          {periodContent.length > 0 ? (
                            <Stack gap={2}>
                              {periodContent}
                            </Stack>
                          ) : (
                            <Text c="dimmed" ta="center" size="xs">-</Text>
                          )}
                        </Table.Td>
                      );
                    })}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        </ScrollArea>
        
        <Card.Section withBorder p="md" bg="gray.0">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Last Updated: {new Date(selectedTimetable.updatedAt || '').toLocaleDateString()}</Text>
            <Group>
              <Badge color={selectedTimetable.status === 'active' ? 'green' : 'yellow'}>
                {selectedTimetable.status?.toUpperCase()}
              </Badge>
            </Group>
          </Group>
        </Card.Section>
      </Card>
    );
  };

  // Render subject legend for reference
  const renderSubjectLegend = () => {
    if (!selectedTimetable) return null;
    
    return (
      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" mb="md">
          <Title order={5}>Subject Colors</Title>
          <Chip.Group>
            <Chip size="xs" variant="light">Legend</Chip>
          </Chip.Group>
        </Group>
        <Divider mb="md" />
        <Group wrap="wrap">
          {Object.entries(subjectColorMap).map(([subject, color]) => (
            <Chip key={subject} color={color} variant="light">
              <Group gap="xs">
                <ColorSwatch size={10} color={color} />
                <Text size="xs">{subject}</Text>
              </Group>
            </Chip>
          ))}
        </Group>
      </Paper>
    );
  };

  // Render subject statistics
  const renderSubjectStatistics = () => {
    if (!selectedTimetable || !selectedStream || Object.keys(subjectStats).length === 0) return null;
    
    const totalPeriods = Object.values(subjectStats).reduce((sum, count) => sum + count, 0);
    
    return (
      <Paper withBorder p="md" radius="md">
        <Title order={5} mb="md">Subject Distribution</Title>
        <Divider mb="md" />
        
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="sm">
              {Object.entries(subjectStats)
                .sort((a, b) => b[1] - a[1])
                .map(([subject, count]) => {
                  const percentage = Math.round((count / totalPeriods) * 100);
                  const color = getSubjectColor(subject);
                  
                  return (
                    <Group key={subject} justify="space-between" gap="xs">
                      <Group gap="xs">
                        <ColorSwatch size={10} color={color} />
                        <Text size="sm">{subject}</Text>
                      </Group>
                      <Group gap="xs">
                        <Text size="sm" fw={500}>{count} periods</Text>
                        <Badge size="sm" color={color}>{percentage}%</Badge>
                      </Group>
                    </Group>
                  );
                })}
            </Stack>
          </Grid.Col>
          
          <MediaQuery smallerThan="md" styles={{ display: 'none' }}>
            <Grid.Col span={6}>
              <Center style={{ height: '100%' }}>
                <RingProgress
                  size={200}
                  thickness={20}
                  label={
                    <Text size="xs" ta="center">
                      {totalPeriods} total periods
                    </Text>
                  }
                  sections={
                    Object.entries(subjectStats)
                      .map(([subject, count]) => ({
                        value: (count / totalPeriods) * 100,
                        color: getSubjectColor(subject),
                        tooltip: `${subject}: ${count} periods`
                      }))
                  }
                />
              </Center>
            </Grid.Col>
          </MediaQuery>
        </Grid>
      </Paper>
    );
  };

  // Render desktop filters section
  const renderDesktopFilters = () => {
    return (
      <MediaQuery smallerThan="md" styles={{ display: 'none' }}>
        <Transition mounted={showFilters} transition="slide-down" duration={300}>
          {(styles) => (
            <Paper p="md" withBorder radius="md" bg="blue.0" style={styles}>
              <Grid mb="md">
                <Grid.Col span={12}>
                  <Group align="flex-end">
                    <Select
                      label="Academic Year"
                      placeholder="Select Year"
                      data={yearOptions}
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
                      label="Grade Level"
                      placeholder="Select Grade"
                      data={gradeLevels}
                      value={gradeLevel}
                      onChange={(value) => setGradeLevel(value || '')}
                      w={150}
                    />
                    
                    {timetables.length > 0 && (
                      <Select
                        label="Timetable"
                        placeholder="Select Timetable"
                        data={timetables.map(t => ({
                          value: t._id || '',
                          label: `${t.gradeLevel} - ${t.academicYear} Term ${t.term}`
                        }))}
                        value={selectedTimetable?._id || null}
                        onChange={handleTimetableSelect}
                        w={250}
                      />
                    )}
                    
                    {viewMode === 'daily' && selectedTimetable && selectedTimetable.streams && (