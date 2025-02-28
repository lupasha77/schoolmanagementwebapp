import { useState } from 'react';
import { 
     Table, 
  Select, 
  Grid,
  Text,
     Box,
  Stack,
  
} from '@mantine/core';
import { getSubjectName,
   getStaffName
   
   } from '../utils/mappings';
import { TimetableData,   } from '../types';

interface ConsolidatedTimetableProps {
  timetable: TimetableData | null;
}

function ConsolidatedTimetable({ timetable }: ConsolidatedTimetableProps) {
  const [selectedGrade, setSelectedGrade] = useState<string>('Grade 1');
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const getTimeSlot = (periodNumber: number): string => {
    const startHour = 8 + Math.floor(periodNumber / 2);
    const isSecondHalf = periodNumber % 2 === 1;
    return `${startHour}:${isSecondHalf ? '30' : '00'}`;
  };

  const renderConsolidatedTable = () => {
    if (!timetable || !selectedGrade) return null;

    const gradeData = timetable[selectedGrade];
    if (!gradeData) return null;

    // Get all classes for this grade
    const classes = Object.keys(gradeData);
    
    // Get the schedule for the selected day
    const daySchedules = classes.map(className => ({
      className,
      schedule: gradeData[className][selectedDay] || []
    }));

    // Find the maximum number of periods
    const maxPeriods = Math.max(...daySchedules.map(({ schedule }) => schedule.length));
    
    return (
      <Table striped highlightOnHover horizontalSpacing="md" verticalSpacing="md"  >
        <Table.Thead >
          <Table.Tr>
            <Table.Td>Class</Table.Td>
            {Array.from({ length: maxPeriods }, (_, index) => (
              <Table.Td key={index}>{getTimeSlot(index)}</Table.Td>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {daySchedules.map(({ className, schedule }) => (
            <Table.Tr key={className}>
              <Table.Td><strong>{className}</strong></Table.Td>
              {Array.from({ length: maxPeriods }, (_, index) => {
                const period = schedule[index];
                return (
                  <Table.Td key={index}>
                    {period ? (
                      period === "Break" ? (
                        <Text c="dimmed">Break</Text>
                      ) : (
                        <Stack gap={2}>
                          <Text size="sm" fw={500}>
                            {getSubjectName(period[0])}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {getStaffName(period[1])}
                          </Text>
                        </Stack>
                      )
                    ) : (
                      "-"
                    )}
                  </Table.Td>
                );
              })}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    );
  };

  return (
    <Box>
      <Grid mb="md">
        <Grid.Col span={4}>
          <Select
            label="Select Grade"
            data={timetable ? Object.keys(timetable) : []}
            value={selectedGrade}
            onChange={(value) => setSelectedGrade(value || 'Grade 1')}
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

      {renderConsolidatedTable()}
    </Box>
  );
}

export default ConsolidatedTimetable;