import { useState, useEffect } from 'react';
import { 
  Button, Paper, Title, Table, Text, Grid, Select, LoadingOverlay, Badge,
  NumberInput, MultiSelect, Stack,
  Group,
  Radio
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import api from '../../utils/api/axios';
import { TimetableData, PeriodData, FormattedPeriod } from '../../types';
import { StreamConfigData, Subject } from '../../types/school_types';
import schoolApis from '../../utils/api/schoolApis';

// Constants
const PERIODS_START_HOUR = 8;
const MAX_CORE_SUBJECTS = 8;
const MAX_PRACTICAL_SUBJECTS = 2;
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
const GRADES = ['Form 1', 'Form 2', 'Form 3', 'Form 4'] as const;

// Types
type Day = typeof DAYS_OF_WEEK[number];
type Grade = typeof GRADES[number];

interface StreamConfig {
  maxStudents: number;
  calculatedClasses: number;
  coreSubjects: string[];
  practicalSubjects: string[];
  useEnrolledStudents: boolean;
  
}

type StreamConfigs = {
  [K in Grade]: StreamConfig;
}

// Utilities
const getTimeForPeriod = (periodNumber: number): string => {
  const startHour = PERIODS_START_HOUR + Math.floor(periodNumber / 2);
  const isSecondHalf = periodNumber % 2 === 1;
  return `${startHour}:${isSecondHalf ? '30' : '00'} - ${startHour}:${isSecondHalf ? '59' : '29'}`;
};

const calculateClasses = (students: number, maxPerClass: number = 40) => 
  Math.ceil(students / maxPerClass);

// Components
interface SubjectSelectionProps {
  grade: Grade;
  config: StreamConfig;
  subjects: { core: Subject[]; practical: Subject[] };
  onUpdate: (grade: Grade, field: 'coreSubjects' | 'practicalSubjects', value: string[]) => void;
}
const SubjectSelection = ({ 
  grade, 
  config, 
  subjects, 
  onUpdate 
}: SubjectSelectionProps) => {
  const coreSubjectOptions = subjects.core
    .filter(s => s.gradeLevel === grade)
    .map(s => ({ 
      value: s._id, 
      label: `${s.name} (${s.code})` // Added code for better identification
    }));
  
  const practicalSubjectOptions = subjects.practical
    .filter(s => s.gradeLevel === grade)
    .map(s => ({ 
      value: s._id, 
      label: `${s.name} (${s.code})`
    }));
    return (
      <Grid>
        <Grid.Col span={3}>
          <Text fw={500}>{grade}</Text>
        </Grid.Col>
        <Grid.Col span={3}>
          <MultiSelect
            label="Core Subjects"
            data={coreSubjectOptions}
            value={config.coreSubjects}
            onChange={(value) => {
              if (value.length <= MAX_CORE_SUBJECTS) {
                onUpdate(grade, 'coreSubjects', value);
              } else {
                notifications.show({
                  title: 'Warning',
                  message: `Maximum ${MAX_CORE_SUBJECTS} core subjects allowed`,
                  color: 'yellow'
                });
              }
            }}
            max={MAX_CORE_SUBJECTS}
            placeholder="Select core subjects"
            error={coreSubjectOptions.length === 0 ? `No core subjects available for ${grade}` : null}
            searchable
            clearable
          />
        </Grid.Col>
        <Grid.Col span={3}>
          <MultiSelect
            label="Practical Subjects"
            data={practicalSubjectOptions}
            value={config.practicalSubjects}
            onChange={(value) => {
              if (value.length <= MAX_PRACTICAL_SUBJECTS) {
                onUpdate(grade, 'practicalSubjects', value);
              } else {
                notifications.show({
                  title: 'Warning',
                  message: `Maximum ${MAX_PRACTICAL_SUBJECTS} practical subjects allowed`,
                  color: 'yellow'
                });
              }
            }}
            max={MAX_PRACTICAL_SUBJECTS}
            placeholder="Select practical subjects"
            error={practicalSubjectOptions.length === 0 ? `No practical subjects available for ${grade}` : null}
            searchable
            clearable
          />
        </Grid.Col>
      </Grid>
    );
  };
interface StreamConfigSectionProps {
  grade: Grade;
  config: StreamConfig;
  dbConfig?: StreamConfigData;
  onUpdate: (grade: Grade, field: 'maxStudents' | 'useEnrolledStudents', value: number | boolean) => void;
}
const StreamConfigSection = ({
  grade,
  config,
  dbConfig,
  onUpdate
}: StreamConfigSectionProps) => {
  return (
    <Grid>
      <Grid.Col span={3}>
        <Text fw={500}>{grade}</Text>
      </Grid.Col>
      <Grid.Col span={3}>
        <Radio.Group
          value={config.useEnrolledStudents.toString()}
          onChange={(value) => onUpdate(grade, 'useEnrolledStudents', value === 'true')}
        >
          <Group>
            <Radio value="true" label="Use Enrolled Students" />
            <Radio value="false" label="Custom" />
          </Group>
        </Radio.Group>
        {!config.useEnrolledStudents && dbConfig && (
          <NumberInput
            label="Maximum Students"
            min={1}
            max={dbConfig.max_students_per_stream}
            value={config.maxStudents}
            onChange={(value) => onUpdate(grade, 'maxStudents', Number(value))}
          />
        )}
        <Text size="sm" c="dimmed">Classes: {config.calculatedClasses}</Text>
        {dbConfig && (
          <Text size="sm" c="dimmed">
            Current Enrolled: {dbConfig.current_enrolled_students}
          </Text>
        )}
      </Grid.Col>
    </Grid>
  );
};
interface TimetableDisplayProps {
  timetable: TimetableData;
  selectedGrade: Grade;
  selectedClass: string;
  selectedDay: Day;
}
const TimetableDisplay = ({
  timetable,
  selectedGrade,
  selectedClass,
  selectedDay
}: TimetableDisplayProps) => {
  const formatPeriodData = (periodData: PeriodData, index: number): FormattedPeriod => {
    if (periodData === "Break") {
      return { periodNumber: index + 1, subject: "Break", staff: "-", time: getTimeForPeriod(index) };
    }
    const [subject, staff] = periodData;
    return { periodNumber: index + 1, subject, staff, time: getTimeForPeriod(index) };
  };

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Td>Period</Table.Td>
          <Table.Td>Time</Table.Td>
          <Table.Td>Subject</Table.Td>
          <Table.Td>Teacher</Table.Td>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {timetable[selectedGrade]?.[selectedClass]?.[selectedDay]?.map((period: PeriodData, index: number) => {
          const formattedPeriod = formatPeriodData(period, index);
          return (
            <Table.Tr key={formattedPeriod.periodNumber}>
              <Table.Td>{formattedPeriod.periodNumber}</Table.Td>
              <Table.Td>{formattedPeriod.time}</Table.Td>
              <Table.Td>
                {formattedPeriod.subject === "Break" ? 
                  <Badge color="gray">Break</Badge> : 
                  formattedPeriod.subject}
              </Table.Td>
              <Table.Td>{formattedPeriod.staff}</Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
};

// Custom hooks
const initialStreamConfigs: StreamConfigs = GRADES.reduce((acc, grade) => {
  acc[grade] = {
    maxStudents: 0,
    calculatedClasses: 0,
    coreSubjects: [],
    practicalSubjects: [],
    useEnrolledStudents: true
  };
  return acc;
}, {} as StreamConfigs);
const useStreamConfigs = () => {
  const [dbStreamConfigs, setDbStreamConfigs] = useState<StreamConfigData[]>([]);
  const [streamConfigs, setStreamConfigs] = useState<StreamConfigs>(initialStreamConfigs);

  useEffect(() => {
    const fetchStreamConfigs = async () => {
      try {
        const response = await schoolApis.getStreamConfigs();
        console.log("Stream Configs:", response.configs);
        setDbStreamConfigs(response.configs);
        
        setStreamConfigs(prev => {
          const newConfigs = { ...prev };
          response.configs.forEach((config: StreamConfigData) => {
            const grade = config.gradeLevel as Grade;
            if (newConfigs[grade]) {
              newConfigs[grade].maxStudents = config.current_enrolled_students;
              newConfigs[grade].calculatedClasses = 
                calculateClasses(config.current_enrolled_students, config.max_students_per_class);
            }
          });
          console.log("New Configs:", newConfigs);
          return newConfigs;
        });
      } catch   {
        notifications.show({
          title: 'Error',
          message: 'Failed to fetch stream configurations',
          color: 'red',
          icon: <IconX size={16} />
        });
      }
    };
    fetchStreamConfigs();
  }, []);

  return { streamConfigs, setStreamConfigs, dbStreamConfigs };
};


const useSubjects = () => {
  const [subjects, setSubjects] = useState<{ core: Subject[], practical: Subject[] }>({
    core: [],
    practical: []
  });

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await schoolApis.getSubjectData();
        if (response && Array.isArray(response.subjects)) {
          setSubjects({
            core: response.subjects.filter((s: Subject) => s.isCore),
            practical: response.subjects.filter((s: Subject) => s.isPractical)
          });
          console.log('Core Subjects:', response.subjects.filter((s: Subject) => s.isCore));
          console.log('Practical Subjects:', response.subjects.filter((s: Subject) => s.isPractical));
        } else {
          throw new Error('Invalid subjects data structure');
        }
      } catch (error) {
        console.error('Subject fetch error:', error);
        notifications.show({
          title: 'Error',
          message: 'Failed to fetch subjects. Please check the data structure.',
          color: 'red',
          icon: <IconX size={16} />
        });
      }
    };
    fetchSubjects();
  }, []);

  return subjects;
};
type StreamConfigField = 'maxStudents' | 'useEnrolledStudents' | 'coreSubjects' | 'practicalSubjects';
// Main component
const CreateTimetable = () => {
  const { streamConfigs, setStreamConfigs, dbStreamConfigs } = useStreamConfigs();
  const subjects = useSubjects();
  
  const [selectedGrade, setSelectedGrade] = useState<Grade>(GRADES[0]);
  const [selectedClass, setSelectedClass] = useState<string>(`${GRADES[0]}A`);
  const [selectedDay, setSelectedDay] = useState<Day>(DAYS_OF_WEEK[0]);
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpdateStreamConfig = (
    grade: Grade, 
    field: StreamConfigField, 
    value: number | boolean | string[]
  ) => {
    setStreamConfigs(prev => {
      const newConfigs = { ...prev };
      const newConfig = { ...newConfigs[grade] };
      const dbConfig = dbStreamConfigs.find(c => c.gradeLevel=== grade);
      
      switch (field) {
        case 'useEnrolledStudents':
          newConfig.useEnrolledStudents = value as boolean;
          if (value && dbConfig) {
            newConfig.maxStudents = dbConfig.current_enrolled_students;
            newConfig.calculatedClasses = calculateClasses(
              dbConfig.current_enrolled_students,
              dbConfig.max_students_per_class
            );
          }
          break;
        case 'maxStudents':
          if (!newConfig.useEnrolledStudents && dbConfig) {
            const numValue = value as number;
            if (numValue <= dbConfig.max_students_per_stream) {
              newConfig.maxStudents = numValue;
              newConfig.calculatedClasses = calculateClasses(numValue, dbConfig.max_students_per_class);
            } else {
              notifications.show({
                title: 'Warning',
                message: `Maximum students cannot exceed ${dbConfig.max_students_per_stream}`,
                color: 'yellow'
              });
              return prev;
            }
          }
          break;
        case 'coreSubjects':
        case 'practicalSubjects':
          newConfig[field] = value as string[];
          break;
      }
      
      newConfigs[grade] = newConfig;
      return newConfigs;
    });
  };

  const handleGenerateTimetable = async () => {
    try {
      setLoading(true);
      const response = await api.post<TimetableData>('/timetable/generate-class-timetable', {
        streamConfigs,
        selectedGrade,
        selectedClass
      });
      setTimetable(response.data);
      notifications.show({
        title: 'Success',
        message: 'Timetable generated successfully',
        color: 'green',
        icon: <IconCheck size={16} />
      });
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to generate timetable. Please try again.',
        color: 'red',
        icon: <IconX size={16} />
      });
    } finally {
      setLoading(false);
    }
  };

  const getClassOptions = (grade: Grade) => {
    const numClasses = streamConfigs[grade].calculatedClasses;
    return Array.from({ length: numClasses }, (_, i) => 
      `${grade}${String.fromCharCode(65 + i)}`
    );
  };

  return (
    <Paper p="md" radius="md" withBorder>
      <LoadingOverlay visible={loading} />
      <Title order={2} mb="md">Class Timetable Configuration</Title>
      
      <Stack gap="md" mb="xl">
        <Title order={3}>Stream Configuration</Title>
        
        {GRADES.map(grade => (
          <div key={grade}>
            <StreamConfigSection
              grade={grade}
              config={streamConfigs[grade]}
              dbConfig={dbStreamConfigs.find(c => c.gradeLevel=== grade)}
              onUpdate={handleUpdateStreamConfig}
            />
            <SubjectSelection
              grade={grade}
              config={streamConfigs[grade]}
              subjects={subjects}
              onUpdate={handleUpdateStreamConfig}
            />
          </div>
        ))}
      </Stack>

      <Grid mb="md">
        <Grid.Col span={4}>
          <Select
            label="Select Grade"
            data={GRADES}
            value={selectedGrade}
            onChange={(value) => setSelectedGrade(value as Grade)}
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <Select
            label="Select Class"
            data={getClassOptions(selectedGrade)}
            value={selectedClass}
            onChange={(value) => setSelectedClass(value || getClassOptions(selectedGrade)[0])}
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
      </Grid>

      <Button onClick={handleGenerateTimetable} mb="md" loading={loading}>
        Generate Timetable
      </Button>

      {timetable ? (
        <TimetableDisplay
          timetable={timetable}
          selectedGrade={selectedGrade}
          selectedClass={selectedClass}
          selectedDay={selectedDay}
        />
      ) : (
        <Text c="dimmed" ta="center">
          No timetable generated yet. Click the button above to generate one.
        </Text>
      )}
    </Paper>
  );
};

export default CreateTimetable;