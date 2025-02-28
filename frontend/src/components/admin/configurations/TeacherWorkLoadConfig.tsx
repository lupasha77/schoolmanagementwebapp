// TeacherWorkloadConfig.tsx
import React, { useState } from 'react';
import { 
  Paper, 
  Title, 
  Group, 
  NumberInput, 
  Button, 
  Divider,
  Box,
  Text,
  JsonInput,
  Alert
} from '@mantine/core';
import { IconRefresh, IconAlertCircle } from '@tabler/icons-react';
import { updateConfigSection } from '../../../utils/api/timetableConfigApis';
import { showNotification } from '@mantine/notifications';
import { TeacherWorkloadConfigProps, TeacherConstraints, Config } from './types_config';

const TeacherWorkloadConfig: React.FC<TeacherWorkloadConfigProps> = ({ config, onConfigUpdate }) => {
  const [maxTeacherWorkload, setMaxTeacherWorkload] = useState(
    config.MAX_TEACHER_WORKLOAD || 25
  );
  const [minTeacherWorkload, setMinTeacherWorkload] = useState(
    config.MIN_TEACHER_WORKLOAD || 15
  );
  const [targetLessonsPerWeek, setTargetLessonsPerWeek] = useState(
    config.TARGET_LESSONS_PER_WEEK || 24
  );
  const [teacherConstraints, setTeacherConstraints] = useState<TeacherConstraints>(
    config.TEACHER_CONSTRAINTS || {}
  );
  const [editingConstraints, setEditingConstraints] = useState(false);
  const [constraintsJson, setConstraintsJson] = useState(
    JSON.stringify(teacherConstraints, null, 2)
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Parse constraints JSON if in editing mode
      let parsedConstraints = teacherConstraints;
      if (editingConstraints) {
        try {
          parsedConstraints = JSON.parse(constraintsJson);
        } catch   {
          showNotification({
            title: 'Invalid JSON',
            message: 'Please check your constraints JSON format',
            color: 'red'
          });
          return;
        }
      }
      
      // Validate workload values
      if (minTeacherWorkload >= maxTeacherWorkload) {
        showNotification({
          title: 'Invalid Values',
          message: 'Minimum workload must be less than maximum workload',
          color: 'red'
        });
        return;
      }
      
      if (targetLessonsPerWeek < minTeacherWorkload || targetLessonsPerWeek > maxTeacherWorkload) {
        showNotification({
          title: 'Invalid Values',
          message: 'Target lessons must be between minimum and maximum workload',
          color: 'red'
        });
        return;
      }
      
      // Update configurations
      await updateConfigSection('MAX_TEACHER_WORKLOAD', { value: maxTeacherWorkload });
      await updateConfigSection('MIN_TEACHER_WORKLOAD', { value: minTeacherWorkload });
      await updateConfigSection('TARGET_LESSONS_PER_WEEK', { value: targetLessonsPerWeek });
      await updateConfigSection('TEACHER_CONSTRAINTS', parsedConstraints);
      
      // Update the full config in parent component - using a type assertion to match the expected type
      const updatedConfig = {
        ...config,
        MAX_TEACHER_WORKLOAD: maxTeacherWorkload,
        MIN_TEACHER_WORKLOAD: minTeacherWorkload,
        TARGET_LESSONS_PER_WEEK: targetLessonsPerWeek,
        TEACHER_CONSTRAINTS: parsedConstraints
      } as unknown as Config;
      
      onConfigUpdate(updatedConfig);
      
      showNotification({
        title: 'Success',
        message: 'Teacher workload settings saved successfully',
        color: 'green'
      });
      
      if (editingConstraints) {
        setTeacherConstraints(parsedConstraints);
        setEditingConstraints(false);
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to save settings',
        color: 'red'
      });
      console.error(error);
    } finally {
      setSaving(false);
    }
  };
  
  const renderValue = (val: unknown): string => {
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'number') return val.toString();
    if (val === undefined) return 'Not set';
    return String(val);
  };
  
  return (
    <Paper p="md" withBorder>
      <Title order={3} mb="md">Teacher Workload Configuration</Title>
      
      <Group grow mb="md">
        <NumberInput
          label="Maximum Teacher Workload (periods/week)"
          description="Maximum number of periods a teacher can teach per week"
          min={1}
          max={50}
          value={maxTeacherWorkload}
          onChange={(value) => setMaxTeacherWorkload(Number(value))}
          required
        />
        
        <NumberInput
          label="Minimum Teacher Workload (periods/week)"
          description="Minimum number of periods a teacher must teach per week"
          min={1}
          max={maxTeacherWorkload - 1}
          value={minTeacherWorkload}
          onChange={(value) => setMinTeacherWorkload(Number(value))}
          required
        />
      </Group>
      
      <NumberInput
        label="Target Lessons Per Week"
        description="Ideal number of lessons per week for each teacher"
        min={minTeacherWorkload}
        max={maxTeacherWorkload}
        value={targetLessonsPerWeek}
        onChange={(value) => setTargetLessonsPerWeek(Number(value))}
        required
        mb="md"
      />
      
      <Box mb="md">
        <Group justify="space-between" mb="xs">
          <Text fw={500}>Teacher Scheduling Constraints</Text>
          <Button 
            variant="subtle"  
            onClick={() => {
              setEditingConstraints(!editingConstraints);
              if (!editingConstraints) {
                setConstraintsJson(JSON.stringify(teacherConstraints, null, 2));
              }
            }}
          >
            {editingConstraints ? 'Simple View' : 'Advanced Edit'}
          </Button>
        </Group>
        
        {editingConstraints ? (
          <JsonInput
            label="Teacher Constraints JSON"
            placeholder="Enter teacher constraints configuration"
            validationError="Invalid JSON"
            formatOnBlur
            autosize
            minRows={6}
            value={constraintsJson}
            onChange={setConstraintsJson}
          />
        ) : (
          <Alert 
            icon={<IconAlertCircle size={16} />}
            color="blue" 
            mb="md"
          >
            <Title order={5} mb="xs">Current Teacher Constraints:</Title>
            <ul>
              {Object.entries(teacherConstraints).map(([key, value]) => (
                <li key={key}>
                  <strong>{key.replace(/_/g, ' ')}:</strong> {' '}
                  {typeof value === 'object' 
                    ? Object.entries(value).map(([k, v]) => (
                        <span key={k}>{k}: {renderValue(v)}; </span>
                      ))
                    : renderValue(value)
                  }
                </li>
              ))}
            </ul>
            <Text size="sm" mt="xs">
              Use Advanced Edit to modify these constraints or add new ones.
            </Text>
          </Alert>
        )}
      </Box>
      
      <Divider my="lg" />
      
      <Group justify="space-between">
        <Button 
          leftSection={<IconRefresh size={16} />}
          variant="outline"
          onClick={() => {
            setMaxTeacherWorkload(config.MAX_TEACHER_WORKLOAD || 25);
            setMinTeacherWorkload(config.MIN_TEACHER_WORKLOAD || 15);
            setTargetLessonsPerWeek(config.TARGET_LESSONS_PER_WEEK || 24);
            setTeacherConstraints(config.TEACHER_CONSTRAINTS || {});
            setEditingConstraints(false);
          }}
        >
          Reset Changes
        </Button>
        <Button 
          onClick={handleSave}
          loading={saving}
        >
          Save Settings
        </Button>
      </Group>
    </Paper>
  );
};

export default TeacherWorkloadConfig;