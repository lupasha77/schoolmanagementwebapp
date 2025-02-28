import React, { useState, useEffect } from 'react';
import { Tabs, Title, Box, Button, Group, LoadingOverlay, Notification } from '@mantine/core';
import { IconSettings, IconClock, IconUsers, IconBooks, IconPlus } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { fetchTimetableConfig } from '../../../utils/api/timetableConfigApis';
import TimeRelatedConfig from './TimeRelatedConfig';
import TeacherWorkloadConfig from './TeacherWorkLoadConfig';
import SubjectConstraintsConfig from './SubjectConstraintsConfig';
import StreamClassConfig from './StreamClassConfig';
import AddNewConstantModal from './AddNewConstantModal';
import ResetConfigConfirmModal from './ResetConfigConfirmModal';

// Import types from the types file
import { 
  Config, 
  SubjectConstraintsConfigProps, 
  TimeRelatedConfigProps, 
  TeacherConfig, 
  PracticalPeriods, 
  SciencePeriods, 
} from './types_config';

// Interface for the constant added by AddNewConstantModal
interface Constant {
  name: string;
  value: string | number | boolean | object;
}

// Initialize a default config to ensure all required properties have values
const defaultConfig: Config = {
  WEEK_DAYS: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  SLOTS_PER_DAY: 8,
  START_TIME_MORNING: '08:00',
  LESSON_DURATION: 40,
  BREAKS: {},
  PRACTICAL_PERIODS: [],
  SCIENCE_PERIODS: {},
  SUBJECT_CONSTRAINTS: {},
  MAX_TEACHER_WORKLOAD: 30,
  MIN_TEACHER_WORKLOAD: 15,
  TARGET_LESSONS_PER_WEEK: 25,
  TEACHER_CONSTRAINTS: {},
  PRACTICAL_PERIODS_BY_FORM:{}
};

const TimetableConfigManagement: React.FC = () => {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('time');
  const [addConstantOpened, { open: openAddConstant, close: closeAddConstant }] = useDisclosure(false);
  const [resetConfirmOpened, { open: openResetConfirm, close: closeResetConfirm }] = useDisclosure(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const configData = await fetchTimetableConfig();
      // Merge with default config to ensure all required fields exist
      setConfig({...defaultConfig, ...configData});
      setError(null);
    } catch (err) {
      setError('Failed to load configuration data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigUpdate = (newConfig: Config) => {
    setConfig(newConfig);
  };

  // Handle adding a new constant from the modal
  const handleConstantAdded = (constant: Constant) => {
    setConfig({
      ...config,
      [constant.name]: constant.value
    });
  };

  // Handle reset configuration
  const handleConfigReset = (newConfig: object) => {
    console.log('Resetting config, discarding:', newConfig);
    loadConfig(); // Reload the configuration from the server
  };

  if (loading) {
    return (
      <Box pos="relative" h={400}>
        <LoadingOverlay visible={true} />
      </Box>
    );
  }

  if (error) {
    return (
      <Notification color="red" title="Error" onClose={() => setError(null)}>
        {error}
      </Notification>
    );
  }

  // Create type-safe props for TimeRelatedConfig
  const timeRelatedProps: TimeRelatedConfigProps = {
    config: {
      WEEK_DAYS: config.WEEK_DAYS,
      SLOTS_PER_DAY: config.SLOTS_PER_DAY,
      START_TIME_MORNING: config.START_TIME_MORNING,
      LESSON_DURATION: config.LESSON_DURATION,
      BREAKS: config.BREAKS as Record<string, number>,
      PRACTICAL_PERIODS: config.PRACTICAL_PERIODS
    },
    onConfigUpdate: handleConfigUpdate
  };

  // Create type-safe props for TeacherWorkloadConfig
  const teacherWorkloadProps = {
    config: {
      MAX_TEACHER_WORKLOAD: config.MAX_TEACHER_WORKLOAD,
      MIN_TEACHER_WORKLOAD: config.MIN_TEACHER_WORKLOAD,
      TARGET_LESSONS_PER_WEEK: config.TARGET_LESSONS_PER_WEEK,
      TEACHER_CONSTRAINTS: config.TEACHER_CONSTRAINTS
    } as TeacherConfig,
    onConfigUpdate: handleConfigUpdate
  };

  // Helper function to convert complex SCIENCE_PERIODS to the type expected by SubjectConstraintsConfig
  function convertToSimpleSciencePeriods(
    sciencePeriods: SciencePeriods
  ): Record<string, number> {
    const result: Record<string, number> = {};
  
    if (!sciencePeriods) {
      return result;
    }
  
    Object.entries(sciencePeriods).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        result[key] = value[0] || 0; // Use first value or 0
      } else if (typeof value === 'number') {
        result[key] = value;
      }
    });
  
    return result;
  }
  
  // Helper function to convert complex PRACTICAL_PERIODS to the type expected by SubjectConstraintsConfig
  function convertToSimplePracticalPeriods(
    practicalPeriods: PracticalPeriods
  ): Record<string, number> {
    const result: Record<string, number> = {};
  
    if (!practicalPeriods) {
      return result;
    }
  
    if (Array.isArray(practicalPeriods)) {
      practicalPeriods.forEach((period, index) => {
        result[`period_${index + 1}`] = period;
      });
    } else {
      Object.entries(practicalPeriods).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          result[key] = value[0] || 0; // Use first value or 0
        } else if (typeof value === 'number') {
          result[key] = value;
        }
      });
    }
  
    return result;
  }

  // Create type-safe props for SubjectConstraintsConfig
  const subjectConstraintsProps: SubjectConstraintsConfigProps = {
    config: {
      SUBJECT_CONSTRAINTS: config.SUBJECT_CONSTRAINTS,
      SCIENCE_PERIODS: convertToSimpleSciencePeriods(config.SCIENCE_PERIODS),
      PRACTICAL_PERIODS: convertToSimplePracticalPeriods(config.PRACTICAL_PERIODS),
      PRACTICAL_PERIODS_BY_FORM:config.PRACTICAL_PERIODS_BY_FORM
    },
    onConfigUpdate: handleConfigUpdate
  };

  return (
    <Box p="md">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Timetable Configuration Management</Title>
        <Group>
          <Button 
            leftSection={<IconPlus size={18} />} 
            onClick={openAddConstant}
          >
            Add New Constant
          </Button>
          <Button 
            color="red" 
            variant="outline" 
            onClick={openResetConfirm}
          >
            Reset to Defaults
          </Button>
        </Group>
      </Group>

      <Tabs value={activeTab} onChange={(value) => setActiveTab(value ?? 'time')}>
        <Tabs.List>
          <Tabs.Tab value="time" leftSection={<IconClock size={14} />}>Time Settings</Tabs.Tab>
          <Tabs.Tab value="teacher" leftSection={<IconUsers size={14} />}>Teacher Workload</Tabs.Tab>
          <Tabs.Tab value="subject" leftSection={<IconBooks size={14} />}>Subject Constraints</Tabs.Tab>
          <Tabs.Tab value="stream" leftSection={<IconSettings size={14} />}>Stream & Class Config</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="time" pt="xs">
          <TimeRelatedConfig {...timeRelatedProps} />
        </Tabs.Panel>

        <Tabs.Panel value="teacher" pt="xs">
          <TeacherWorkloadConfig {...teacherWorkloadProps} />
        </Tabs.Panel>

        <Tabs.Panel value="subject" pt="xs">
          <SubjectConstraintsConfig {...subjectConstraintsProps} />
        </Tabs.Panel>
        
        <Tabs.Panel value="stream" pt="xs">
          <StreamClassConfig 
            config={config} 
            onConfigUpdate={handleConfigUpdate} 
          />
        </Tabs.Panel>
      </Tabs>

      {/* Modals */}
      <AddNewConstantModal 
        opened={addConstantOpened} 
        onClose={closeAddConstant} 
        onConstantAdded={handleConstantAdded} 
      />
      
      <ResetConfigConfirmModal 
        opened={resetConfirmOpened} 
        onClose={closeResetConfirm} 
        onConfigReset={handleConfigReset} 
      />
    </Box>
  );
};

export default TimetableConfigManagement;