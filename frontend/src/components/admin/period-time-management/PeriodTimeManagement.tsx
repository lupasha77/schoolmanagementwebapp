import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  Container,  
  LoadingOverlay,
  Select,
  Text,
  Title,
  Paper,
  Alert,
  Notification,
  ActionIcon,
  TextInput
} from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { showNotification } from '@mantine/notifications';
import { IconAlertCircle, IconPlus, IconCheck } from '@tabler/icons-react';
// import axios from 'axios';
import api from '../../../utils/api/axios';

// Define types for our period data
interface Period {
  start: string;
  end: string;
  type: 'lesson' | 'break' | 'assembly' | 'extracurricular';
  name?: string;
}

interface PeriodTimeInputProps {
  id: string;
  period: Period;
  updatePeriod: (id: string, field: keyof Period, value: string) => void;
}

const PeriodTimeInput: React.FC<PeriodTimeInputProps> = ({ id, period, updatePeriod }) => (
  <Box mb="xs" style={{ display: 'flex', gap: '0.5rem' }}>
    <TimeInput
      label="Start Time"
      value={period.start}
      onChange={(e) => updatePeriod(id, 'start', e.target.value)}
      required
      style={{ flex: 1 }}
    />
    <TimeInput
      label="End Time"
      value={period.end}
      onChange={(e) => updatePeriod(id, 'end', e.target.value)} 
      required
      style={{ flex: 1 }}
    />
  </Box>
);

interface PeriodsState {
  [key: string]: Period;
}

 

export default function PeriodManagement() {
  const [periods, setPeriods] = useState<PeriodsState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // CSS styles using inline style objects instead of sx prop
  const styles = {
    card: {
      backgroundColor: 'white',
    },
    header: {
      padding: '1rem',
      borderBottom: '1px solid #e9ecef',
    },
    periodItem: {
      padding: '0.5rem',
      borderRadius: '0.25rem',
      marginBottom: '0.5rem',
      backgroundColor: '#f8f9fa',
      transition: 'background-color 200ms ease',
    },
    periodItemHover: {
      backgroundColor: '#e9ecef',
    },
    break: {
      backgroundColor: 'rgba(51, 154, 240, 0.1)',
    },
    actionButtons: {
      display: 'flex',
      gap: '0.5rem',
    },
  };

  // Load periods configuration
  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/timeslots/configurations/periods`);
      setPeriods(response.data || {});
      setError(null);
    } catch (err) {
      console.error('Error fetching periods:', err);
      setError('Failed to load period configuration. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const savePeriods = async () => {
    setLoading(true);
    try {
      // Convert periods object to sorted array for validation
      const periodArr = Object.entries(periods)
        .map(([id, data]) => ({ id: parseInt(id), ...data }))
        .sort((a, b) => a.id - b.id);
      
      // Validate time order (each period should start after the previous one ends)
      for (let i = 1; i < periodArr.length; i++) {
        const prevEnd = periodArr[i-1].end;
        const currStart = periodArr[i].start;
        if (prevEnd > currStart) {
          throw new Error(`Period ${periodArr[i].id} starts before period ${periodArr[i-1].id} ends`);
        }
      }
      
      await api.post(`/timeslots/configurations/periods`, periods);
      showNotification({
        title: 'Success',
        message: 'Period configuration saved successfully',
        color: 'green',
        icon: <IconCheck size={18} />,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving periods:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save period configuration. Please check your input and try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addPeriod = () => {
    const existingIds = Object.keys(periods).map(id => parseInt(id));
    const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    
    // Find a good default time for the new period
    let defaultStart = "07:30";
    let defaultEnd = "08:10";
    
    if (existingIds.length > 0) {
      const lastPeriod = periods[Math.max(...existingIds).toString()];
      defaultStart = lastPeriod.end;
      
      // Add 40 minutes for the default duration
      const [hours, minutes] = lastPeriod.end.split(':').map(n => parseInt(n));
      let newMinutes = minutes + 40;
      let newHours = hours;
      
      if (newMinutes >= 60) {
        newHours += Math.floor(newMinutes / 60);
        newMinutes %= 60;
      }
      
      defaultEnd = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    }
    
    setPeriods({
      ...periods,
      [newId]: {
        start: defaultStart,
        end: defaultEnd,
        type: "lesson" as const,
        name: ""
      }
    });
  };

  const removePeriod = (id: string) => {
    const newPeriods = { ...periods };
    delete newPeriods[id];
    setPeriods(newPeriods);
  };

  const updatePeriod = (id: string, field: keyof Period, value: string) => {
    setPeriods({
      ...periods,
      [id]: {
        ...periods[id],
        [field]: value
      }
    });
  };

  const renderPeriods = () => {
    // Sort periods by ID before rendering
    const sortedPeriods = Object.entries(periods)
      .sort(([a], [b]) => parseInt(a) - parseInt(b));
    
    return sortedPeriods.map(([id, period]) => {
      const isBreak = period.type === 'break';
      
      return (
        <Paper 
          key={id} 
          p="md"
          withBorder
          style={{
            ...styles.periodItem,
            ...(isBreak ? styles.break : {})
          }}
        >
          <Box mb="xs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text fw={500}>Period {id}</Text>
            <Box style={{ display: 'flex', gap: '0.5rem' }}>
              <ActionIcon onClick={() => removePeriod(id)}>
                <IconPlus size={16} />
              </ActionIcon>
            </Box>
          </Box>
          
          <PeriodTimeInput id={id} period={period} updatePeriod={updatePeriod} />
          
          <Box mb="xs" style={{ display: 'flex', gap: '0.5rem' }}>
            <Select
              label="Type"
              value={period.type}
              onChange={(value) => updatePeriod(id, 'type', value as Period['type'])}
              data={[
                { value: 'practical', label: 'Practicals Lesson '},
                { value: 'registration', label: 'Registration' },
                { value: 'lesson', label: 'Lesson' },
                { value: 'break', label: 'Break' },
                { value: 'assembly', label: 'Assembly' },
                { value: 'extracurricular', label: 'Extracurricular/Sports/Clubs' }
              ]}
              required
              style={{ flex: 1 }}
            />
            {period.type === 'break' && (
              <TextInput
                label="Break Name"
                value={period.name || ''}
                onChange={(e) => updatePeriod(id, 'name', e.target.value)}
                placeholder="e.g., Lunch Break"
                style={{ flex: 2 }}
              />
            )}
          </Box>
        </Paper>
      );
    });
  };

  return (
    <Container size="lg" py="xl">
      <Card shadow="sm" p={0} style={styles.card}>
        <Box style={styles.header}>
          <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title order={2}>Period Schedule Management</Title>
            <Button
              onClick={fetchPeriods}
              variant="subtle"
              size="sm"
            >
              Refresh
            </Button>
          </Box>
        </Box>
        
        <Box p="md" style={{ position: 'relative' }}>
          <LoadingOverlay visible={loading} />
          
          {error && (
            <Alert 
              icon={<IconAlertCircle size={16} />} 
              title="Error" 
              color="red" 
              mb="md"
              withCloseButton
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}
          
          {saved && (
            <Notification
              title="Changes saved successfully"
              icon={<IconCheck size={18} />}
              color="teal"
              onClose={() => setSaved(false)}
              my="md"
            >
              The period configuration has been updated.
            </Notification>
          )}
          
          <Text color="dimmed" mb="lg">
            Configure the school day periods below. Periods represent time slots for lessons,
            breaks, and other activities. Make sure to set the correct start and end times
            and specify the period type.
          </Text>
          
          <Box mb="xl">
            {renderPeriods()}
          </Box>
          
          <Box mt="md" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={addPeriod}
              variant="outline"
            >
              Add Period
            </Button>
            
            <Button
              onClick={savePeriods}
              color="blue"
            >
              Save Changes
            </Button>
          </Box>
        </Box>
      </Card>
    </Container>
  );
}