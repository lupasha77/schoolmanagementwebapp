import { useState } from 'react';
import { 
  Table, 
  Button, 
  Group, 
  Text, 
  Card, 
  Select, 
  Tabs, 
  Loader, 
  Alert,
  // Modal,
  Stack, 
} from '@mantine/core';

import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconAlertCircle } from '@tabler/icons-react';
import api from '../../../utils/api/axios';

// Improved data structure interfaces to match backend response
interface PeriodData {
  period_id: string;
  start: string;
  end: string;
  type: string;
  subject?: string;
  teacher?: string;
  name?: string;
}

interface ClassSchedule {
  [day: string]: PeriodData[];
}

interface StreamData {
  className: string;
  schedule: ClassSchedule;
}

interface TimetableData {
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
  timetable_data?: TimetableData;
  data?: {
    [gradeLevel: string]: Record<string, ClassSchedule>;
  };
}

interface Timetable {
  [gradeLevel: string]: Record<string, ClassSchedule>;
}

export default function TimetableManager() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gradeLevel, setGradeLevel] = useState('');
  const [error, setError] = useState<string | null>(null);
  // const [confirmSaveModal, setConfirmSaveModal] = useState(false);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());
  const [term, setTerm] = useState('1');
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const gradeLevels = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];
  
  const generateTimetable = async () => {
    if (!gradeLevel) {
      notifications.show({
        title: 'Error',
        message: 'Please select a grade level',
        color: 'red',
        icon: <IconAlertCircle />
      });
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post(`/timetable/generate/${gradeLevel}`);
      const responseData = response.data as TimetableResponse;
      
      if (responseData.success) {
        // console.log('API Response:', JSON.stringify(responseData, null, 2));
        
        if (responseData.data) {
          // If the response contains the data property, use it
          setTimetable(responseData.data);
        } else {
          // Otherwise, try to construct it from timetable_data if available
          if (responseData.timetable_data && responseData.timetable_data.streams) {
            const formattedData: Timetable = {
              [gradeLevel]: {}
            };
            
            Object.entries(responseData.timetable_data.streams).forEach(([, streamData]) => {
              formattedData[gradeLevel][streamData.className] = streamData.schedule;
            });
            
            setTimetable(formattedData);
          } else {
            setError('Invalid timetable data received');
          }
        }
      } else {
        setError(responseData.message || 'Unknown error');
        notifications.show({
          title: 'Error',
          message: responseData.message || 'Unknown error',
          color: 'red',
          icon: <IconX />
        });
      }
    } 
    catch (error) {
      setError('Failed to generate Timetable');
      console.error('Failed to generate Timetable:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to generate Timetable',
        color: 'red',
        icon: <IconX />
      });
    } finally {
      setLoading(false);
    }
  };
  
  const saveTimetable = async () => {
    if (!timetable || !(gradeLevel in timetable)) {
      notifications.show({
        title: 'Error',
        message: 'No timetable to save',
        color: 'red',
        icon: <IconAlertCircle />
      });
      return;
    }
    
    setSaving(true);
    
    try {
      // Create a properly typed timetable data object
      const timetableData: TimetableData = {
        gradeLevel,
        academicYear,
        term,
        status: 'draft',
        streams: {}
      };
      
      // Format the stream data from what we have
      const gradeData = timetable[gradeLevel];
      if (gradeData) {
        Object.entries(gradeData).forEach(([className, schedule]) => {
          const stream = className.replace(gradeLevel, '').trim(); // Extract stream letter
          if (!timetableData.streams) {
            timetableData.streams = {};
          }
          timetableData.streams[stream] = {
            className,
            schedule
          };
        });
      }
      
      console.log('Prepared timetable data for saving:', timetableData);
      
      const response = await api.post('/timetable/save', timetableData);
      
      if (response.data.success) {
        notifications.show({
          title: 'Success',
          message: response.data.message,
          color: 'green',
          icon: <IconCheck />
        });
        // setConfirmSaveModal(false);
      } else {
        notifications.show({
          title: 'Error',
          message: response.data.message,
          color: 'red',
          icon: <IconX />
        });
      }
    } catch (error) {
      setError('Failed to save Timetable');
      console.error('Failed to save Timetable:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save Timetable',
        color: 'red',
        icon: <IconX />
      });
    } finally {
      setSaving(false);
    }
  };
  
  
  const renderTimetable = (className: string, schedule: ClassSchedule) => {
    // Get all periods including breaks, registrations, etc.
    const allPeriods = schedule && schedule[weekDays[0]] 
      ? schedule[weekDays[0]].map(period => ({
          id: period.period_id,
          type: period.type,
          name: period.name || `Period ${period.period_id}`,
          start: period.start,
          end: period.end
        }))
      : [];
    
    if (!allPeriods.length) {
      return <Alert color="blue">No schedule data available</Alert>;
    }
    
    return (
      <Card shadow="sm" p="lg" radius="md" withBorder mb="md">
        <Card.Section withBorder p="xs" bg="blue.1">
          <Text fw={700} size="lg">{className}</Text>
        </Card.Section>
        
        <Table striped highlightOnHover>
          <thead>
            <tr>
              <th>Period</th>
              {weekDays.map(day => (
                <th key={day}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allPeriods.map((period, index) => (
              <tr key={period.id}>
                <td>
                  <strong>{period.name}</strong>
                  <Text size="xs" c="dimmed">{period.start} - {period.end}</Text>
                </td>
                {weekDays.map(day => {
                  const periodData = schedule[day][index];
                  
                  if (!periodData) {
                    return <td key={day}>-</td>;
                  }
                  
                  if (periodData.type !== 'lesson') {
                    return (
                      <td key={day} style={{ backgroundColor: '#f0f0f0' }}>
                        <Text fw={700} c="dimmed">{periodData.name || periodData.type}</Text>
                      </td>
                    );
                  }
                  
                  return (
                    <td key={day}>
                      <Text size="sm" fw={500}>{periodData.subject || '-'}</Text>
                      <Text size="xs" c="dimmed">{periodData.teacher || '-'}</Text>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    );
  };
  
  return (
    <div>
      <Group justify='space-between' mb="md">
        <Text size="xl" fw={700}>Timetable Generator</Text>
        
        <Group>
          <Select
            label="Grade Level"
            placeholder="Select Grade"
            data={gradeLevels}
            value={gradeLevel}
            onChange={(value) => setGradeLevel(value || '')}
            required
            w={200}
          />
          
          <Button 
            onClick={generateTimetable} 
            loading={loading}
            disabled={!gradeLevel}
          >
            Generate Timetable
          </Button>
        </Group>
      </Group>
      
      {error && (
        <Alert color="red" title="Error" mb="md">
          {error}
        </Alert>
      )}
      
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader size="lg" />
        </div>
      ) : timetable && gradeLevel in timetable ? (
        <>
          <Group justify='space-between' mb="md">
            <Button 
              color="green" 
              // onClick={() => setConfirmSaveModal(true)}
            >
              Save Timetable
            </Button>
          </Group>
          
          <Tabs defaultValue={Object.keys(timetable[gradeLevel])[0]}>
            <Tabs.List>
              {Object.keys(timetable[gradeLevel]).map(className => (
                <Tabs.Tab key={className} value={className}>
                  {className}
                </Tabs.Tab>
              ))}
            </Tabs.List>
            
            {Object.entries(timetable[gradeLevel]).map(([className, schedule]) => (
              <Tabs.Panel key={className} value={className} pt="md">
                {renderTimetable(className, schedule)}
              </Tabs.Panel>
            ))}
          </Tabs>
          
          {/* <Modal
            opened={confirmSaveModal}
            onClose={() => setConfirmSaveModal(false)}
            title="Save Timetable"
            size="md"
          > */}
            <Stack>
              <Text>You are about to save the timetable for {gradeLevel}. Please confirm the details:</Text>
              
              <Select
                label="Academic Year"
                value={academicYear}
                onChange={(value) => setAcademicYear(value || new Date().getFullYear().toString())}
                data={[
                  (new Date().getFullYear() - 1).toString(),
                  new Date().getFullYear().toString(),
                  (new Date().getFullYear() + 1).toString()
                ]}
                required
              />
              
              <Select
                label="Term"
                value={term}
                onChange={(value) => setTerm(value || '1')}
                data={['1', '2', '3']}
                required
              />
              
              <Group justify='flex-end' mt="md">
                <Button variant="outline"
                //  onClick={() => setConfirmSaveModal(false)}
                >
                  Cancel
                </Button>
                <Button color="green" onClick={saveTimetable} loading={saving}>
                  Confirm & Save
                </Button>
              </Group>
            </Stack>
          {/* </Modal> */}
        </>
      ) : null}
    </div>
  );
}