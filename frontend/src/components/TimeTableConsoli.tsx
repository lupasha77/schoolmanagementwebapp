import { useState, useEffect } from 'react';
import { 
  Button, 
  Paper, 
  Title,
  Tabs, 
  Table, 
  Text, 
  Grid, 
  Select,
  LoadingOverlay,
  Badge
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import api  from '../utils/api/axios';
import { TimetableData, PeriodData, FormattedPeriod } from '../types';
import { getSubjectName, getStaffName } from '../utils/mappings';
import ConsolidatedTimetable from './ConsolidatedTimeTable';

function Timetable() {
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string>('Grade 1');
  const [selectedClass, setSelectedClass] = useState<string>('Class A');
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [grades, setGrades] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    const fetchTimetable = async (): Promise<TimetableData> => {
    const response = await api.get<TimetableData>('/generate_timetable');
    return response.data;
    };
  const getTimeForPeriod = (periodNumber: number): string => {
    const startHour = 8 + Math.floor(periodNumber / 2);
    const isSecondHalf = periodNumber % 2 === 1;
    return `${startHour}:${isSecondHalf ? '30' : '00'} - ${startHour}:${isSecondHalf ? '59' : '29'}`;
   };

  useEffect(() => {
    if (timetable) {
      setGrades(Object.keys(timetable));
      const classesInGrade = Object.keys(timetable[selectedGrade] || {});
      setClasses(classesInGrade);
    }
  }, [timetable, selectedGrade]);
 
    
   
  

  const handleGenerateTimetable = async () => {
    try {
      setLoading(true);
      const data = await fetchTimetable();
      setTimetable(data);
      notifications.show({
        title: 'Success',
        message: 'Timetable generated successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch  {
      notifications.show({
        title: 'Error',
        message: 'Failed to generate timetable. Please try again.',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPeriodData = (periodData: PeriodData, index: number): FormattedPeriod => {
    if (periodData === "Break") {
      return {
        periodNumber: index + 1,
        subject: "Break",
        staff: "-",
        time: getTimeForPeriod(index)
      };
    }
    
    const [subject, staff] = periodData;
    return {
      periodNumber: index + 1,
      subject: getSubjectName(subject),
      staff: getStaffName(staff),
      time: getTimeForPeriod(index)
    };
  };

  const renderTimetable = () => {
    if (!timetable || !selectedGrade || !selectedClass || !selectedDay) return null;

    const daySchedule = timetable[selectedGrade]?.[selectedClass]?.[selectedDay];
    if (!daySchedule) return null;

    // Explicitly type the parameters in the map function
    const periods: FormattedPeriod[] = daySchedule.map((period: PeriodData, index: number) => 
      formatPeriodData(period, index)
    );

    return (
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Td>Period</Table.Td>
            <Table.Td>Time</Table.Td>
            <Table.Td>Subject</Table.Td>
            <Table.Td>Staff</Table.Td>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {periods.map((period: FormattedPeriod) => (
            <Table.Tr key={period.periodNumber}>
              <Table.Td>{period.periodNumber}</Table.Td>
              <Table.Td>{period.time}</Table.Td>
              <Table.Td>
                {period.subject === "Break" ? (
                  <Badge color="gray">Break</Badge>
                ) : (
                  period.subject
                )}
              </Table.Td>
              <Table.Td>{period.staff}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    );
  };

  return (

    <Paper p="md" radius="md" withBorder>
      <LoadingOverlay visible={loading} />
      <Tabs defaultValue="single">
        <Tabs.List>
          <Tabs.Tab value="single">Single Class View</Tabs.Tab>
          <Tabs.Tab value="consolidated">Consolidated View</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="single">
          {/* Existing single class view code */}
          <Title order={2} mb="md">Class Timetable</Title>
          {/* ... rest of your existing JSX ... */}
          <Grid mb="md">
        <Grid.Col span={4}>
          <Select
            label="Select Grade"
            data={grades}
            value={selectedGrade}
            onChange={(value) => {
              setSelectedGrade(value || 'Grade 1');
              if (timetable && value) {
                const classesInGrade = Object.keys(timetable[value]);
                setSelectedClass(classesInGrade[0] || 'Class A');
              }
            }}
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <Select
            label="Select Class"
            data={classes}
            value={selectedClass}
            onChange={(value) => setSelectedClass(value || 'Class A')}
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <Select
            label="Select Day"
            data={days}
            value={selectedDay}
            onChange={(value) => setSelectedDay(value || 'Monday')}
          />
        </Grid.Col>
      </Grid>

      <Button 
        onClick={handleGenerateTimetable}
        mb="md"
        loading={loading}
      >
        Generate Timetable
      </Button>

      {timetable ? (
        renderTimetable()
      ) : (
        <Text c="dimmed" ta="center">
          No timetable generated yet. Click the button above to generate one.
        </Text>
        )}
        </Tabs.Panel>
      
        <Tabs.Panel value="consolidated">
          <Title order={2} mb="md">Consolidated Grade Timetable</Title>
          <ConsolidatedTimetable timetable={timetable} />
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );

}

export default Timetable;
  