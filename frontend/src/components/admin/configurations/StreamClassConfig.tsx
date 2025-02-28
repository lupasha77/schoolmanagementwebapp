import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Title, 
  Group, 
  Button, 
  TextInput, 
  NumberInput, 
  Divider, 
  Box, 
  Text, 
  Select, 
  SimpleGrid,
  Stack,
  ActionIcon,
  Accordion
} from '@mantine/core';
import { IconRefresh, IconPlus, IconTrash } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import { updateConfigSection } from '../../../utils/api/timetableConfigApis';
import { StreamClassConfigProps,  } from './types_config';

const StreamClassConfig: React.FC<StreamClassConfigProps> = ({ config, onConfigUpdate }) => {
  // State for the configuration values
  const [streams, setStreams] = useState<string[]>([]);
  const [selectedStream, setSelectedStream] = useState<string>('');
  const [newStreamName, setNewStreamName] = useState('');
  const [classes, setClasses] = useState<Record<string, string[]>>({});
  const [newClassName, setNewClassName] = useState('');
  
  // Form maximum students
  const [juniorMaxStudents, setJuniorMaxStudents] = useState<number>(40);
  const [seniorMaxStudents, setSeniorMaxStudents] = useState<number>(40);
  const [juniorMaxStudentsPerClass, setJuniorMaxStudentsPerClass] = useState<number>(40);
  const [seniorMaxStudentsPerClass, setSeniorMaxStudentsPerClass] = useState<number>(40);
  
  // Subject limitations
  const [maxCoreSubjects, setMaxCoreSubjects] = useState<number>(8);
  const [maxPracticalSubjects, setMaxPracticalSubjects] = useState<number>(3);
  
  // Level configuration for forms
  const [formLevels, setFormLevels] = useState<{ [key: string]: string }>({
    'Form 1': 'junior',
    'Form 2': 'junior',
    'Form 3': 'junior',
    'Form 4': 'senior',
    'Form 5': 'senior',
    'Form 6': 'senior'
  });
  
  // Maximum student configurations for different forms
  const [formMaxStudents, setFormMaxStudents] = useState<{ [key: string]: number }>({});
  
  // Load initial config values
  useEffect(() => {
    // Load streams and classes
    if (config.STREAM_CLASS_CONFIG) {
      setClasses(config.STREAM_CLASS_CONFIG);
      setStreams(Object.keys(config.STREAM_CLASS_CONFIG));
    }
    
    // Load form level configurations
    if (config.FORM_LEVELS) {
      setFormLevels(config.FORM_LEVELS as { [key: string]: string });
    }
    
    // Load max students configurations
    if (config.JUNIOR_MAX_STUDENTS) {
      setJuniorMaxStudents(config.JUNIOR_MAX_STUDENTS as number);
    }
    
    if (config.SENIOR_MAX_STUDENTS) {
      setSeniorMaxStudents(config.SENIOR_MAX_STUDENTS as number);
    }
    
    if (config.JUNIOR_MAX_STUDENTS_PER_CLASS) {
      setJuniorMaxStudentsPerClass(config.JUNIOR_MAX_STUDENTS_PER_CLASS as number);
    }
    
    if (config.SENIOR_MAX_STUDENTS_PER_CLASS) {
      setSeniorMaxStudentsPerClass(config.SENIOR_MAX_STUDENTS_PER_CLASS as number);
    }
    
    // Load subject limitation configurations
    if (config.MAX_CORE_SUBJECTS) {
      setMaxCoreSubjects(config.MAX_CORE_SUBJECTS as number);
    }
    
    if (config.MAX_PRACTICAL_SUBJECTS) {
      setMaxPracticalSubjects(config.MAX_PRACTICAL_SUBJECTS as number);
    }
  }, [config]);

  // Update form max students whenever junior/senior configurations change
  useEffect(() => {
    const newFormMaxStudents: { [key: string]: number } = {};
    
    Object.entries(formLevels).forEach(([form, level]) => {
      if (level === 'junior') {
        newFormMaxStudents[form] = juniorMaxStudents;
      } else if (level === 'senior') {
        newFormMaxStudents[form] = seniorMaxStudents;
      }
    });
    
    setFormMaxStudents(newFormMaxStudents);
  }, [formLevels, juniorMaxStudents, seniorMaxStudents, juniorMaxStudentsPerClass, seniorMaxStudentsPerClass, maxCoreSubjects, maxPracticalSubjects]);

  // Add a new stream
  const handleAddStream = () => {
    if (!newStreamName.trim()) {
      showNotification({
        title: 'Error',
        message: 'Stream name cannot be empty',
        color: 'red'
      });
      return;
    }
    
    if (streams.includes(newStreamName)) {
      showNotification({
        title: 'Error',
        message: 'Stream already exists',
        color: 'red'
      });
      return;
    }
    
    const updatedStreams = [...streams, newStreamName];
    const updatedClasses = { ...classes, [newStreamName]: [] };
    
    setStreams(updatedStreams);
    setClasses(updatedClasses);
    setNewStreamName('');
    setSelectedStream(newStreamName);
  };
  
  // Remove a stream
  const handleRemoveStream = (streamToRemove: string) => {
    const updatedStreams = streams.filter(stream => stream !== streamToRemove);
    const updatedClasses = { ...classes };
    delete updatedClasses[streamToRemove];
    
    setStreams(updatedStreams);
    setClasses(updatedClasses);
    
    if (selectedStream === streamToRemove) {
      setSelectedStream(updatedStreams[0] || '');
    }
  };
  
  // Add a new class to the selected stream
  const handleAddClass = () => {
    if (!selectedStream) {
      showNotification({
        title: 'Error',
        message: 'Please select a stream first',
        color: 'red'
      });
      return;
    }
    
    if (!newClassName.trim()) {
      showNotification({
        title: 'Error',
        message: 'Class name cannot be empty',
        color: 'red'
      });
      return;
    }
    
    if (classes[selectedStream]?.includes(newClassName)) {
      showNotification({
        title: 'Error',
        message: 'Class already exists in this stream',
        color: 'red'
      });
      return;
    }
    
    const updatedClasses = {
      ...classes,
      [selectedStream]: [...(classes[selectedStream] || []), newClassName]
    };
    
    setClasses(updatedClasses);
    setNewClassName('');
  };
  
  // Remove a class from a stream
  const handleRemoveClass = (stream: string, classToRemove: string) => {
    if (!classes[stream]) return;
    
    const updatedClasses = {
      ...classes,
      [stream]: classes[stream].filter(c => c !== classToRemove)
    };
    
    setClasses(updatedClasses);
  };
  
  // Save all configurations
  const handleSave = async () => {
    try {
      // Create a new config object with updated values
      const updatedConfig = {
        ...config,
        STREAM_CLASS_CONFIG: classes,
        FORM_LEVELS: formLevels,
        JUNIOR_MAX_STUDENTS: juniorMaxStudents,
        SENIOR_MAX_STUDENTS: seniorMaxStudents,
        JUNIOR_MAX_STUDENTS_PER_CLASS: juniorMaxStudentsPerClass,
        SENIOR_MAX_STUDENTS_PER_CLASS: seniorMaxStudentsPerClass,
        MAX_CORE_SUBJECTS: maxCoreSubjects,
        MAX_PRACTICAL_SUBJECTS: maxPracticalSubjects,
        FORM_MAX_STUDENTS: formMaxStudents
      };
      
      // Update each configuration section
      await updateConfigSection('STREAM_CLASS_CONFIG', classes);
      await updateConfigSection('FORM_LEVELS', formLevels);
      await updateConfigSection('JUNIOR_MAX_STUDENTS', { value: juniorMaxStudents });
      await updateConfigSection('SENIOR_MAX_STUDENTS', { value:seniorMaxStudents});
      await updateConfigSection('JUNIOR_MAX_STUDENTS_PER_CLASS', { value:juniorMaxStudentsPerClass});
      await updateConfigSection('SENIOR_MAX_STUDENTS_PER_CLASS', { value:seniorMaxStudentsPerClass});
      await updateConfigSection('MAX_CORE_SUBJECTS',{ value: maxCoreSubjects});
      await updateConfigSection('MAX_PRACTICAL_SUBJECTS', { value:maxPracticalSubjects});
      await updateConfigSection('FORM_MAX_STUDENTS', formMaxStudents);
      
      // Update the parent component's config
      onConfigUpdate(updatedConfig);
      
      showNotification({
        title: 'Success',
        message: 'Stream and class configuration saved successfully',
        color: 'green'
      });
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to save configuration',
        color: 'red'
      });
      console.error(error);
    }
  };
  
  // Reset to original values
  const handleReset = () => {
    if (config.STREAM_CLASS_CONFIG) {
      setClasses(config.STREAM_CLASS_CONFIG);
      setStreams(Object.keys(config.STREAM_CLASS_CONFIG));
    } else {
      setClasses({});
      setStreams([]);
    }
    
    setSelectedStream('');
    setNewStreamName('');
    setNewClassName('');
    
    // Reset other configurations
    setFormLevels(config.FORM_LEVELS as { [key: string]: string } || {
      'Form 1': 'junior',
      'Form 2': 'junior',
      'Form 3': 'junior',
      'Form 4': 'senior',
      'Form 5': 'senior',
      'Form 6': 'senior'
    });
    
    setJuniorMaxStudents(config.JUNIOR_MAX_STUDENTS as number || 40);
    setSeniorMaxStudents(config.SENIOR_MAX_STUDENTS as number || 40);
    setJuniorMaxStudentsPerClass(config.JUNIOR_MAX_STUDENTS_PER_CLASS as number || 40);
    setSeniorMaxStudentsPerClass(config.SENIOR_MAX_STUDENTS_PER_CLASS as number || 40);
    setMaxCoreSubjects(config.MAX_CORE_SUBJECTS as number || 8);
    setMaxPracticalSubjects(config.MAX_PRACTICAL_SUBJECTS as number || 3);
  };

  return (
    <Paper p="md" withBorder>
      <Title order={3} mb="md">Stream & Class Configuration</Title>
      
      <Accordion defaultValue="streams">
        <Accordion.Item value="streams">
          <Accordion.Control>
            <Title order={4}>Streams and Classes</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <Group mb="lg">
              <TextInput
                label="New Stream Name"
                placeholder="Enter stream name"
                value={newStreamName}
                onChange={(event) => setNewStreamName(event.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Button 
                leftSection={<IconPlus size={16} />}
                onClick={handleAddStream}
                mt={25}
              >
                Add Stream
              </Button>
            </Group>
            
            <SimpleGrid cols={2} spacing="md" mb="lg">
              <Box>
                <Title order={5} mb="xs">Available Streams</Title>
                {streams.length > 0 ? (
                  <Stack>
                    {streams.map(stream => (
                      <Group key={stream} justify="space-between" mb="xs">
                        <Text>{stream}</Text>
                        <Group>
                          <Button
                            variant="subtle"
                            size="xs"
                            onClick={() => setSelectedStream(stream)}
                          >
                            Select
                          </Button>
                          <ActionIcon 
                            color="red" 
                            variant="subtle" 
                            onClick={() => handleRemoveStream(stream)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    ))}
                  </Stack>
                ) : (
                  <Text color="dimmed">No streams configured yet.</Text>
                )}
              </Box>
              
              <Box>
                <Title order={5} mb="xs">
                  Classes for {selectedStream || 'No Stream Selected'}
                </Title>
                {selectedStream ? (
                  <>
                    <Group mb="md">
                      <TextInput
                        placeholder="Enter class name"
                        value={newClassName}
                        onChange={(event) => setNewClassName(event.currentTarget.value)}
                        style={{ flex: 1 }}
                      />
                      <Button 
                        leftSection={<IconPlus size={16} />}
                        onClick={handleAddClass}
                        size="sm"
                      >
                        Add
                      </Button>
                    </Group>
                    
                    {classes[selectedStream]?.length > 0 ? (
                      <Stack>
                        {classes[selectedStream].map(className => (
                          <Group key={className} justify="space-between" mb="xs">
                            <Text>{className}</Text>
                            <ActionIcon 
                              color="red" 
                              variant="subtle" 
                              onClick={() => handleRemoveClass(selectedStream, className)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        ))}
                      </Stack>
                    ) : (
                      <Text color="dimmed">No classes in this stream yet.</Text>
                    )}
                  </>
                ) : (
                  <Text color="dimmed">Select a stream to manage its classes.</Text>
                )}
              </Box>
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>
        
        <Accordion.Item value="limits">
          <Accordion.Control>
            <Title order={4}>Student Limits & Form Levels</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={2} spacing="md" mb="lg">
              <Box>
              <Title order={5} mb="md">Student Number Limits</Title>
                <NumberInput
                  label="Junior Max Students (Total)"
                  value={juniorMaxStudents}
                  onChange={(value) => setJuniorMaxStudents(Number(value) || 0)}
                  min={0}
                  mb="sm"
                />
                <NumberInput
                  label="Senior Max Students (Total)"
                  value={seniorMaxStudents}
                  onChange={(value) => setSeniorMaxStudents(Number(value) || 0)}
                  min={0}
                  mb="sm"
                />
                <NumberInput
                  label="Junior Max Students Per Class"
                  value={juniorMaxStudentsPerClass}
                  onChange={(value) => setJuniorMaxStudentsPerClass(Number(value) || 0)}
                  min={0}
                  mb="sm"
                />
                <NumberInput
                  label="Senior Max Students Per Class"
                  value={seniorMaxStudentsPerClass}
                  onChange={(value) => setSeniorMaxStudentsPerClass(Number(value) || 0)}
                  min={0}
                />
              </Box>
              
              <Box>
                <Title order={5} mb="md">Form Level Configuration</Title>
                {Object.keys(formLevels).map(form => (
                  <Select
                    key={form}
                    label={form}
                    value={formLevels[form]}
                    onChange={(value) => setFormLevels({...formLevels, [form]: value || 'junior'})}
                    data={[
                      { value: 'junior', label: 'Junior' },
                      { value: 'senior', label: 'Senior' }
                    ]}
                    mb="sm"
                  />
                ))}
              </Box>
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>
        
        <Accordion.Item value="subjects">
          <Accordion.Control>
            <Title order={4}>Subject Limitations</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={2} spacing="md">
              <NumberInput
                label="Maximum Core Subjects"
                value={maxCoreSubjects}
                onChange={(value) => setMaxCoreSubjects(Number(value) || 0)}
                min={0}
              />
              <NumberInput
                label="Maximum Practical Subjects"
                value={maxPracticalSubjects}
                onChange={(value) => setMaxPracticalSubjects(Number(value) || 0)}
                min={0}
              />
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      
      <Divider my="lg" />
      
      <Group justify="flex-end">
        <Button 
          variant="outline" 
          leftSection={<IconRefresh size={16} />} 
          onClick={handleReset}
        >
          Reset
        </Button>
        <Button 
          onClick={handleSave}
        >
          Save Configuration
        </Button>
      </Group>
    </Paper>
  );
};

export default StreamClassConfig;