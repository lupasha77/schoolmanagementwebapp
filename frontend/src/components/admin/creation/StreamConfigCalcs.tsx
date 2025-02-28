import { useState, useEffect, useCallback } from 'react';
import { Paper, Text, Stack, Radio, Group, NumberInput, Select, Button, Divider } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconX, IconCalculator, IconCheck } from '@tabler/icons-react';
import schoolApis from '../../../utils/api/schoolApis';
import{ StreamConfigData } from '../../../types/school_types';

interface StreamConfig {
  gradeLevel: string;
  current_enrolled_students: number;
  max_students_per_class: number;
  max_students_per_stream: number;
  calculated_classes?: number;
}

interface Student {
  _id: string;
  gradeLevel: string;
  // Add other student properties as needed
}

interface SelectItem {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

const StreamConfigCalcs = () => {
  const [streamConfigs, setStreamConfigs] = useState<StreamConfig[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string | null>(null);
  const [useEnrolled, setUseEnrolled] = useState(true);
  const [customStudents, setCustomStudents] = useState<number>(0);
  const [calculatedClasses, setCalculatedClasses] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectData, setSelectData] = useState<SelectItem[]>([]);
  const [hasInitializedCustomStudents, setHasInitializedCustomStudents] = useState(false);
  const [expectedEnrollment, setExpectedEnrollment] = useState<number>(0);
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch both stream configs and students in parallel
      const [configResponse, studentResponse] = await Promise.all([
        schoolApis.getStreamConfigs(),
        schoolApis.getStudents()
      ]);
      
      // Process stream configs
      if (configResponse && configResponse.configs && Array.isArray(configResponse.configs)) {
        setStreamConfigs(configResponse.configs);
      } else {
        setStreamConfigs([]);
      }
      
      // Process students
      if (studentResponse && studentResponse.students && Array.isArray(studentResponse.students)) {
        setStudents(studentResponse.students);
      } else {
        setStudents([]);
      }
      
      // Now create select options with actual student counts
      updateSelectOptions(configResponse.configs || [], studentResponse.students || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setStreamConfigs([]);
      setStudents([]);
      setSelectData([]);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to fetch data',
        color: 'red',
        icon: <IconX size={16} />
      });
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const updateSelectOptions = (configs: StreamConfig[], students: Student[]) => {
    // Count students by grade level
    const studentCounts: Record<string, number> = {};
    students.forEach(student => {
      const grade = student.gradeLevel;
      studentCounts[grade] = (studentCounts[grade] || 0) + 1;
    });
    
    // Create select options with actual student counts
    const options: SelectItem[] = configs.map((config) => ({
      value: config.gradeLevel,
      label: `${config.gradeLevel} (${studentCounts[config.gradeLevel] || 0} students)`,
    }));
    
    setSelectData(options);
    
    if (options.length > 0) {
      setSelectedGradeLevel(options[0].value);
    }
    
    // Update stream configs with actual student counts
    const updatedConfigs = configs.map(config => ({
      ...config,
      current_enrolled_students: studentCounts[config.gradeLevel] || 0
    }));
    
    setStreamConfigs(updatedConfigs);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Separate useEffect for initializing customStudents when grade level changes
  useEffect(() => {
    if (selectedGradeLevel && !hasInitializedCustomStudents) {
      const studentCount = students.filter(s => s.gradeLevel === selectedGradeLevel).length;
      setCustomStudents(studentCount);
      setHasInitializedCustomStudents(true);
    }
  }, [selectedGradeLevel, students, hasInitializedCustomStudents]);

  // Reset initialization flag when grade level changes
  useEffect(() => {
    setHasInitializedCustomStudents(false);
  }, [selectedGradeLevel]);

  // Separate useEffect for class calculations
  useEffect(() => {
    if (selectedGradeLevel) {
      const currentConfig = streamConfigs.find(
        (config) => config.gradeLevel === selectedGradeLevel
      );
      
      if (currentConfig) {
        // Get actual student count for this grade
        const actualStudentCount = students.filter(s => s.gradeLevel === selectedGradeLevel).length;
        
        // Calculate classes
        const studentsToUse = useEnrolled ? actualStudentCount: customStudents;
        const maxPerClass = currentConfig.max_students_per_class || 1;
        setCalculatedClasses(Math.ceil(studentsToUse / maxPerClass));

        // Update expected enrollment
        setExpectedEnrollment(useEnrolled ? actualStudentCount : customStudents);
      }
    }
  }, [selectedGradeLevel, useEnrolled, customStudents, streamConfigs, students]);

  const handleCustomStudentsChange = (value: number) => {
    if (value === undefined || isNaN(value)) return;
    
    const currentConfig = streamConfigs.find(
      (config) => config.gradeLevel === selectedGradeLevel
    );
    
    if (currentConfig && value > currentConfig.max_students_per_stream) {
      notifications.show({
        title: 'Warning',
        message: `Maximum ${currentConfig.max_students_per_stream} students allowed for ${selectedGradeLevel}`,
        color: 'yellow'
      });
      setCustomStudents(currentConfig.max_students_per_stream);
    } else {
      setCustomStudents(value);
    }
  };

  const saveConfiguration = async () => {
    if (!selectedGradeLevel || !currentConfig) return;
    
    setIsSaving(true);
    
    try {
      const actualStudentCount = students.filter(s => s.gradeLevel === selectedGradeLevel).length;
      
      const updateData: Partial<StreamConfigData> = {
        calculated_classes: calculatedClasses,
        current_enrolled_students: actualStudentCount,
        expected_students_enrolment: useEnrolled ? actualStudentCount : customStudents,
        max_students_per_class: currentConfig.max_students_per_class,
        max_students_per_stream: currentConfig.max_students_per_stream
      };
      
      const result = await schoolApis.updateStreamConfig(selectedGradeLevel, updateData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      await fetchData();
      
      notifications.show({
        title: 'Success',
        message: `Updated stream configuration for ${selectedGradeLevel}`,
        color: 'green',
        icon: <IconCheck size={16} />
      });
    } catch (error) {
      console.error('Error saving configuration:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update stream configuration',
        color: 'red',
        icon: <IconX size={16} />
      });
    } finally {
      setIsSaving(false);
    }
  };
  // Safely find the current config
  const currentConfig = selectedGradeLevel 
    ? streamConfigs.find((config) => config.gradeLevel === selectedGradeLevel) 
    : undefined;

  // Get actual student count for selected grade
  const actualStudentCount = selectedGradeLevel
    ? students.filter(s => s.gradeLevel === selectedGradeLevel).length
    : 0;

  // Update the students per class calculation
  const studentsPerClass = currentConfig && calculatedClasses > 0
    ? Math.round(expectedEnrollment / calculatedClasses)
    : 0;

  return (
    <Paper p="md" withBorder shadow="sm">
      <Stack gap="md">
        <Text size="xl" fw={700} c="blue.8">Stream Configuration Calculator</Text>
        <Divider />
        
        <Select
          label="Select Grade Level"
          placeholder={isLoading ? "Loading grades..." : "Choose a grade"}
          data={selectData}
          value={selectedGradeLevel}
          onChange={(value) => setSelectedGradeLevel(value)}
          disabled={isLoading || isSaving}
          searchable
          clearable
          nothingFoundMessage={isLoading ? "Loading..." : "No grades found"}
        />

        {selectedGradeLevel && currentConfig && (
          <>
            <Group>
              <Text fw={500}>Calculation Mode:</Text>
              <Radio.Group 
                value={useEnrolled.toString()} 
                onChange={(value) => setUseEnrolled(value === 'true')}
              >
                <Group>
                  <Radio 
                    value="true" 
                    label={`Current Enrolled (${actualStudentCount} students)`} 
                  />
                  <Radio value="false" label="Custom Enrollment" />
                </Group>
              </Radio.Group>
            </Group>

            {!useEnrolled && (
              <NumberInput
                label="Number of Students"
                description="Enter the projected number of students"
                value={customStudents}
                onChange={(value) => handleCustomStudentsChange(Number(value))}
                min={1}
                max={currentConfig.max_students_per_stream || 100}
                disabled={isSaving}
                allowDecimal={false}
                step={1}
              />
            )}

            <Paper p="md" withBorder bg="blue.0">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text fw={700}>Grade Level:</Text>
                  <Text>{currentConfig.gradeLevel}</Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={700}>Current Student Count:</Text>
                  <Text>{actualStudentCount}</Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={700}>Expected Student Count:</Text>
                  <Text>{expectedEnrollment}</Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={700}>Max Students Per Class:</Text>
                  <Text>{currentConfig.max_students_per_class}</Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={700}>Max Students Per Stream:</Text>
                  <Text>{currentConfig.max_students_per_stream}</Text>
                </Group>
                <Divider />
                <Group justify="space-between">
                  <Text fw={700} size="lg" c="blue.8">Calculated Classes:</Text>
                  <Text fw={700} size="lg" c="blue.8">{calculatedClasses}</Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={700} c="blue.8">Students Per Class (avg):</Text>
                  <Text fw={700} c="blue.8">{studentsPerClass}</Text>
                </Group>
              </Stack>
            </Paper>

            <Button
              leftSection={<IconCalculator size={16} />}
              onClick={saveConfiguration}
              loading={isSaving}
              disabled={isLoading}
              color="blue"
              fullWidth
              mt="md"
            >
              Save Configuration
            </Button>
          </>
        )}

        {!isLoading && selectData.length === 0 && (
          <Text c="dimmed">No stream configurations available. Please add configurations first.</Text>
        )}
      </Stack>
    </Paper>
  );
};

export default StreamConfigCalcs;