import React, { useState } from 'react'; 
import { 
  Paper, 
  Title, 
  Group, 
  NumberInput, 
  MultiSelect,  
  Button, 
  Text,
  Box,
  Divider,
  Alert,
  JsonInput
} from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { IconClock, IconRefresh, IconAlertCircle } from '@tabler/icons-react';
import { updateConfigSection } from '../../../utils/api/timetableConfigApis';
import { showNotification } from '@mantine/notifications';
import { TimeRelatedConfigProps, Config } from './types_config';

const TimeRelatedConfig: React.FC<TimeRelatedConfigProps> = ({ config, onConfigUpdate }) => {
  const [weekDays, setWeekDays] = useState<string[]>(config.WEEK_DAYS || []);
  const [slotsPerDay, setSlotsPerDay] = useState<number>(config.SLOTS_PER_DAY || 10);
  const [startTime, setStartTime] = useState<string>(config.START_TIME_MORNING || '07:00');
  const [lessonDuration, setLessonDuration] = useState<number>(config.LESSON_DURATION || 35);

  // Ensure BREAKS contains numbers
  const [breaks, setBreaks] = useState<Record<string, number>>(
    Object.fromEntries(
      Object.entries(config.BREAKS || {}).map(([key, value]) => [key, Number(value)])
    )
  );

  const [practicalPeriods, setPracticalPeriods] = useState<number[]>(
    Array.isArray(config.PRACTICAL_PERIODS) ? config.PRACTICAL_PERIODS : []
  );

  const [saving, setSaving] = useState<boolean>(false);
  const [editingBreaks, setEditingBreaks] = useState<boolean>(false);
  const [breaksJson, setBreaksJson] = useState<string>(JSON.stringify(breaks, null, 2));

  const handleSave = async () => {
    try {
      setSaving(true);

      let parsedBreaks: Record<string, number> = { ...breaks };
      if (editingBreaks) {
        try {
          const tempParsed = JSON.parse(breaksJson);
          parsedBreaks = Object.fromEntries(
            Object.entries(tempParsed).map(([key, value]) => [key, Number(value)])
          );
        } catch {
          showNotification({
            title: 'Invalid JSON',
            message: 'Please check your breaks JSON format',
            color: 'red',
          });
          return;
        }
      }
      
      const updatedConfig: Config = {
        ...config as Config,
        WEEK_DAYS: weekDays,
        SLOTS_PER_DAY: slotsPerDay,
        START_TIME_MORNING: startTime,
        LESSON_DURATION: lessonDuration,
        BREAKS: parsedBreaks,
        PRACTICAL_PERIODS: practicalPeriods,
      };

      await Promise.all([
        updateConfigSection('WEEK_DAYS', weekDays),
        updateConfigSection('SLOTS_PER_DAY', { value: slotsPerDay }),
        updateConfigSection('START_TIME_MORNING', { value: startTime }),
        updateConfigSection('LESSON_DURATION', { value: lessonDuration }),
        updateConfigSection('BREAKS', parsedBreaks),
        updateConfigSection('PRACTICAL_PERIODS', practicalPeriods),
      ]);

      onConfigUpdate(updatedConfig);
      
      showNotification({
        title: 'Success',
        message: 'Time-related settings saved successfully',
        color: 'green',
      });

      if (editingBreaks) {
        setBreaks(parsedBreaks);
        setEditingBreaks(false);
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to save settings',
        color: 'red',
      });
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper p="md" withBorder>
      <Title order={3} mb="md">Time-Related Settings</Title>
      <Group grow mb="md">
        <MultiSelect 
          label="School Days" 
          placeholder="Select school days" 
          data={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => ({ value: day, label: day }))} 
          value={weekDays} 
          onChange={setWeekDays} 
          required 
        />
        <NumberInput 
          label="Periods Per Day" 
          min={1} 
          max={20} 
          value={slotsPerDay} 
          onChange={(value) => setSlotsPerDay(Number(value) || 1)} 
          required 
        />
      </Group>
      <Group grow mb="md">
        <TimeInput 
          label="School Start Time" 
          leftSection={<IconClock size={16} />} 
          value={startTime} 
          onChange={(event) => setStartTime(event.target.value)} 
          required 
        />
        <NumberInput 
          label="Lesson Duration (minutes)" 
          min={30} 
          max={120} 
          value={lessonDuration} 
          onChange={(value) => setLessonDuration(Number(value) || 30)} 
          required 
        />
      </Group>
      <Box mb="md">
        <Group justify="space-between" mb="xs">
          <Text fw={500}>Breaks Configuration</Text>
          <Button variant="subtle" onClick={() => setEditingBreaks((prev) => !prev)}>
            {editingBreaks ? 'Simple View' : 'Advanced Edit'}
          </Button>
        </Group>
        {editingBreaks ? (
          <JsonInput 
            label="Breaks JSON" 
            validationError="Invalid JSON" 
            formatOnBlur 
            autosize 
            minRows={4} 
            value={breaksJson} 
            onChange={setBreaksJson} 
          />
        ) : (
          <Alert icon={<IconAlertCircle size={16} />} color="blue" mb="md">
            {Object.keys(breaks).length > 0 ? `Breaks: ${JSON.stringify(breaks)}` : 'No breaks configured.'}
          </Alert>
        )}
      </Box>
      <Divider my="lg" />
      <Group justify="space-between">
        <Button 
          leftSection={<IconRefresh size={16} />} 
          variant="outline" 
          onClick={() => {
            setWeekDays(config.WEEK_DAYS || []);
            setSlotsPerDay(config.SLOTS_PER_DAY || 10);
            setStartTime(config.START_TIME_MORNING || '07:00');
            setLessonDuration(config.LESSON_DURATION || 35);
            setBreaks(Object.fromEntries(
              Object.entries(config.BREAKS || {}).map(([key, value]) => [key, Number(value)])
            ));
            setPracticalPeriods(Array.isArray(config.PRACTICAL_PERIODS) ? config.PRACTICAL_PERIODS : []);
            setEditingBreaks(false);
          }}
        >
          Reset Changes
        </Button>
        <Button onClick={handleSave} loading={saving}>Save Settings</Button>
      </Group>
    </Paper>
  );
};

export default TimeRelatedConfig;
