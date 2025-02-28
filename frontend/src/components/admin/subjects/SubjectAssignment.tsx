import { useState, useEffect } from 'react';
import {
  Box,
  Title,
  Group,
  Select,
  Button,
  LoadingOverlay,
  Text,
  Alert,
  Tabs,
  Card,
  Badge,
  Paper,
  Divider,
  Container,
  Tooltip
} from '@mantine/core';
import { IconAlertCircle, IconSchool, IconBookmark, IconRefresh, IconBooks } from '@tabler/icons-react';
import {
  getSubjects,
  getClasses,
  getSubjectAssignments,
  generateSubjectAssignments
} from '../../../utils/api/subjApis';
import { Subject, Class, SubjectClassAssignment } from './subject_types';
import ClassSubjectEditor from './ClassSubjectEditor';
import api from '../../../utils/api/axios';

interface GradeLevelOption {
  value: string;
  label: string;
}

const SubjectAssignment = () => {
  const [gradeLevel, setGradeLevel] = useState<string | null>(null);
  const [gradeLevelOptions, setGradeLevelOptions] = useState<GradeLevelOption[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<SubjectClassAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('all');
  const [refreshKey, setRefreshKey] = useState(0); // For forcing re-renders

  // Fetch grade levels from constants API
  useEffect(() => {
    const fetchGradeLevels = async () => {
      try {
        setLoading(true);
        const response = await api.get('/constants/grade_levels');
        const data = response?.data || [];
        // Make sure we have proper shape for Select component
        const formattedOptions = Array.isArray(data) 
          ? data.map(level => ({
              value: level?.value || level?.toString() || '',
              label: level?.label || level?.toString() || ''
            }))
          : [];
        setGradeLevelOptions(formattedOptions);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch grade levels:', err);
        setError('Failed to fetch grade levels');
      } finally {
        setLoading(false);
      }
    };

    fetchGradeLevels();
  }, []);

  // Fetch data when grade level changes
  useEffect(() => {
    const fetchData = async () => {
      if (!gradeLevel) return;
      
      try {
        setLoading(true);
        
        // Initialize with empty arrays in case API calls fail
        let fetchedSubjects: Subject[] = [];
        let fetchedClasses: Class[] = [];
        let fetchedAssignments: SubjectClassAssignment[] = [];
        
        try {
          // Fetch subjects for this grade level
          fetchedSubjects = await getSubjects(gradeLevel);
          // Ensure we have an array
          if (!Array.isArray(fetchedSubjects)) fetchedSubjects = [];
        } catch (err) {
          console.error('Failed to fetch subjects:', err);
        }
        
        try {
          // Fetch classes for this grade level
          fetchedClasses = await getClasses(gradeLevel);
          console.log('Fetched classes:', fetchedClasses);
          // Ensure we have an array
          if (!Array.isArray(fetchedClasses)) fetchedClasses = [];
        } catch (err) {
          console.error('Failed to fetch classes:', err);
        }
        
        try {
          // Fetch existing subject assignments
          fetchedAssignments = await getSubjectAssignments(gradeLevel);
          // Ensure we have an array
          if (!Array.isArray(fetchedAssignments)) fetchedAssignments = [];
        } catch (err) {
          console.error('Failed to fetch assignments:', err);
        }
        
        // Update state with fetched data (empty arrays if failed)
        setSubjects(fetchedSubjects);
        setClasses(fetchedClasses);
        setAssignments(fetchedAssignments);
        
        setError(null);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to fetch data. Please try again.');
        // Set empty arrays in case of failure
        setSubjects([]);
        setClasses([]);
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [gradeLevel, refreshKey]);

  const handleGenerateAssignments = async () => {
    if (!gradeLevel) {
      setError('Grade level is required');
      return;
    }

    try {
      setLoading(true);
      const generatedAssignments = await generateSubjectAssignments(gradeLevel);
      // Ensure we have an array
      setAssignments(Array.isArray(generatedAssignments) ? generatedAssignments : []);
      setError(null);
    } catch (err) {
      console.error('Failed to generate assignments:', err);
      setError('Failed to generate assignments. Please try again.');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Group classes by stream with defensive check
  const streamGroups = classes.reduce((groups: { [key: string]: Class[] }, classObj) => {
    if (!classObj) return groups;
    
    const stream = classObj.stream || 'Unassigned';
    if (!groups[stream]) {
      groups[stream] = [];
    }
    groups[stream].push(classObj);
    return groups;
  }, {});

  // Filter assignments based on active tab with defensive check
  const filteredAssignments = activeTab === 'all' 
    ? assignments 
    : assignments.filter(a => a && a.stream === activeTab);

  return (
    <Container size="xl" p="md">
      <Paper shadow="sm" p="xl" radius="md" withBorder pos="relative">
        <LoadingOverlay visible={loading} />
        
        <Group justify="space-between" mb="lg">
          <Title order={2} fw={700} c="blue">Subject Class Assignment</Title>
          
          <Tooltip label="Refresh data">
            <Button 
              variant="subtle" 
              onClick={refreshData} 
              leftSection={<IconRefresh size="1rem" />}
              disabled={loading}
            >
              Refresh
            </Button>
          </Tooltip>
        </Group>
        
        {error && (
          <Alert icon={<IconAlertCircle size="1.1rem" />} title="Error" color="red" mb="md" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        <Card shadow="xs" radius="md" withBorder mb="lg" p="md">
          <Group align="flex-end" mb={classes.length || subjects.length ? "md" : 0}>
            <Select
              label="Grade Level"
              description="Select a grade level to manage subject assignments"
              placeholder="Select grade level"
              value={gradeLevel}
              onChange={setGradeLevel}
              data={gradeLevelOptions.length > 0 ? gradeLevelOptions : [{ value: '', label: 'Loading...', disabled: true }]}
              style={{ width: 200 }}
              leftSection={<IconSchool size="1rem" />}
              required
            />
            
            <Button 
              onClick={handleGenerateAssignments} 
              disabled={!gradeLevel || classes.length === 0}
              leftSection={<IconBookmark size="1rem" />}
              color="green"
            >
              Generate Assignments
            </Button>
          </Group>

          {subjects.length > 0 && classes.length > 0 && (
            <Text size="sm" c="dimmed" mt="xs">
              You can now manage subject assignments for {gradeLevel} grade level.
            </Text>
          )}
        </Card>

        {subjects.length > 0 && (
          <Paper shadow="xs" p="md" radius="md" mb="lg" withBorder>
            <Group align="center" mb="xs">
              <IconBooks size="1.2rem" color="#228be6" />
              <Title order={4}>Available Subjects ({subjects.length})</Title>
            </Group>
            <Divider mb="md" />
            
            <Group mb="xs" align="flex-start">
              <Text fw={600} w={100}>Core Subjects:</Text>
              <Box>
                {subjects.filter(s => s && (s.isCore || s.type === 'core')).map(s => (
                  <Badge key={s._id || Math.random().toString()} mr="xs" mb="xs" size="md">
                    {s.name || 'Unknown'} ({s.code || 'No code'})
                  </Badge>
                ))}
              </Box>
            </Group>
            
            <Group align="flex-start">
              <Text fw={600} w={100}>Practical Subjects:</Text>
              <Box>
                {subjects.filter(s => s && (s.isPractical || s.type === 'practical')).map(s => (
                  <Badge key={s._id || Math.random().toString()} mr="xs" mb="xs" size="md" color="green">
                    {s.name || 'Unknown'} ({s.code || 'No code'})
                  </Badge>
                ))}
              </Box>
            </Group>
            <Group align="flex-start">
              <Text fw={600} w={100}>Elective  Subjects:</Text>
              <Box>
                {subjects.filter(s => s && !(s.isCore || s.isPractical)).map(s => (
                  <Badge key={s._id || Math.random().toString()} mr="xs" mb="xs" size="md" color="yellow">
                    {s.name || 'Unknown'} ({s.code || 'No code'})
                  </Badge>
                ))}
              </Box>
            </Group>
          </Paper>
        )}

        {classes.length > 0 && (
          <Paper shadow="xs" p="md" radius="md" mb="lg" withBorder>
            <Title order={4} mb="md">Available Classes ({classes.length})</Title>
            <Divider mb="md" />
            
            {Object.entries(streamGroups).map(([stream, streamClasses]) => (
              <Group key={stream} mb="xs">
                <Badge size="lg" color={stream === 'Unassigned' ? 'gray' : 'blue'}>
                  Stream {stream}
                </Badge>
                <Text>
                  Classes: {streamClasses
                    .filter(c => c) // Filter out null/undefined
                    .map(c => c.name || `${c.gradeLevel} ${c.stream}`)
                    .join(', ')}
                </Text>
                <Text size="sm" c="dimmed">
                  Max core subjects: {streamClasses[0]?.max_core_subjects || 6}, 
                  Max practical subjects: {streamClasses[0]?.max_practical_subjects || 2}
                  Max elective subjects: {streamClasses[0]?.max_elective_subjects || 2}
                </Text>
              </Group>
            ))}
          </Paper>
        )}

        {assignments.length > 0 && (
          <Box>
            <Group justify='space-between' mb="md">
              <Title order={3}>Subject Assignments</Title>
              <Text c="dimmed" size="sm">
                {assignments.length} total assignments
              </Text>
            </Group>
            
            <Tabs value={activeTab} onChange={setActiveTab} mb="md">
              <Tabs.List>
                <Tabs.Tab value="all">All Classes</Tabs.Tab>
                {Object.keys(streamGroups).map(stream => (
                  <Tabs.Tab key={stream} value={stream}>
                    Stream {stream}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs>
            
            {filteredAssignments.length === 0 ? (
              <Alert color="blue" title="No assignments found">
                No subject assignments found for the selected filter. Try selecting a different stream or generate assignments.
              </Alert>
            ) : (
              filteredAssignments.map(assignment => (
                assignment && (
                  <ClassSubjectEditor
                    key={assignment._id || Math.random().toString()}
                    assignment={assignment}
                    subjects={subjects}
                    onAssignmentsChange={refreshData}
                    maxCoreSubjects={classes.find(c => c && c.stream === assignment.stream)?.max_core_subjects || 8}
                    maxPracticalSubjects={classes.find(c => c && c.stream === assignment.stream)?.max_practical_subjects || 2}
                    maxElectiveSubjects={classes.find(c => c && c.stream === assignment.stream)?.max_elective_subjects || 2}
                  />
                )
              ))
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default SubjectAssignment;