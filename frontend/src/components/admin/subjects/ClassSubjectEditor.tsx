import { useState, useEffect } from 'react';
import { 
  Paper, 
  Title, 
  Group, 
  Button, 
  Text, 
  Divider, 
  Badge, 
  Tooltip, 
  ActionIcon,
  Box,
  Stack,
  ThemeIcon,
  Alert
} from '@mantine/core';
import { 
  IconFileInvoice, 
  IconTrash, 
  IconAlertCircle,
  IconBook2,
  IconRefresh
} from '@tabler/icons-react';
import { Subject, SubjectClassAssignment, SubjectDetail } from './subject_types';
import { updateSubjectAssignment, deleteSubjectAssignment, generateSubjectAssignments } from '../../../utils/api/subjApis';
import CustomSubjectSelector from './CustomSubjectSelector';

interface ClassSubjectEditorProps {
  assignment: SubjectClassAssignment;
  subjects: Subject[];
  onAssignmentsChange: () => void;
  maxCoreSubjects?: number;
  maxPracticalSubjects?: number;
  maxElectiveSubjects?: number;
}

const ClassSubjectEditor = ({ 
  assignment, 
  subjects = [], // Default to empty array
  onAssignmentsChange,
  maxCoreSubjects = 8,
  maxPracticalSubjects = 2,
  maxElectiveSubjects = 3 // Add a default value for maxElectiveSubjects
}: ClassSubjectEditorProps) => {
  const [coreSubjects, setCoreSubjects] = useState<string[]>(assignment?.coreSubjects || []);
  const [practicalSubjects, setPracticalSubjects] = useState<string[]>(assignment?.practicalSubjects || []);
  const [electiveSubjects, setElectiveSubjects] = useState<string[]>(assignment?.electiveSubjects || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Minimum number of core subjects required
  const MIN_CORE_SUBJECTS = 5;

  // Update local state when assignments change from props
  useEffect(() => {
    setCoreSubjects(assignment?.coreSubjects || []);
    setPracticalSubjects(assignment?.practicalSubjects || []);
    setElectiveSubjects(assignment?.electiveSubjects || []);
  }, [assignment]);

  // Make sure subjects is an array and not undefined or null
  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  
  // Prepare subject data for our custom selector
  const coreSubjectOptions = safeSubjects
    .filter(subject => subject && (subject.isCore || subject.type === 'core'))
    .map(subject => ({ 
      id: subject._id || '', 
      name: subject.name || 'Unknown',
      code: subject.code || 'No code',
      department: subject.department || 'General'
    }));

  const practicalSubjectOptions = safeSubjects
    .filter(subject => subject && (subject.isPractical || subject.type === 'practical'))
    .map(subject => ({ 
      id: subject._id || '', 
      name: subject.name || 'Unknown',
      code: subject.code || 'No code',
      department: subject.department || 'General'
    }));

  const electiveSubjectOptions = safeSubjects
    .filter(subject => subject && !subject.isCore && !subject.isPractical)
    .map(subject => ({
      id: subject._id || '',
      name: subject.name || 'Unknown',
      code: subject.code || 'No code',
      department: subject.department || 'General'
    }))

  // Get subject details for display with safe fallbacks
  const getSubjectBadges = (details: SubjectDetail[] = []) => {
    if (!Array.isArray(details)) return null;
    
    return details.map(detail => (
      <Badge key={detail._id || Math.random().toString()} mr="xs" mb="xs" size="sm">
        {detail.name || 'Unknown'} ({detail.code || 'No code'})
      </Badge>
    ));
  };

  const handleSave = async () => {
    // Clear any previous errors
    setError(null);
    
    // Validate constraints
    if (coreSubjects.length < MIN_CORE_SUBJECTS || coreSubjects.length > maxCoreSubjects) {
      setError(`Core subjects must be between ${MIN_CORE_SUBJECTS} and ${maxCoreSubjects}`);
      return;
    }

    if (practicalSubjects.length !== maxPracticalSubjects) {
      setError(`Exactly ${maxPracticalSubjects} practical subjects are required`);
      return;
    }

    if (electiveSubjects.length > maxElectiveSubjects) {
      setError(`Elective subjects cannot exceed ${maxElectiveSubjects}`);
      return;
    }

    try {
      setLoading(true);
      await updateSubjectAssignment(assignment._id, {
        gradeLevel: assignment.gradeLevel,
        stream: assignment.stream,
        coreSubjects,
        practicalSubjects,
        electiveSubjects
      });
      
      // Trigger parent refresh without affecting local state
      onAssignmentsChange();
    } catch (err) {
      console.error('Failed to update assignment:', err);
      setError('Failed to update assignment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete subject assignment for ${assignment.className || assignment.stream}?`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteSubjectAssignment(assignment._id);
      onAssignmentsChange(); // Refresh after delete
    } catch (err) {
      console.error('Failed to delete assignment:', err);
      setError('Failed to delete assignment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm(`Are you sure you want to reset subject assignment for ${assignment.className || assignment.stream}?`)) {
      return;
    }

    try {
      setLoading(true);
      // Generate default assignments for this specific stream only
      await generateSubjectAssignments(assignment.gradeLevel);
      onAssignmentsChange(); // Refresh after reset
    } catch (err) {
      console.error('Failed to reset assignment:', err);
      setError('Failed to reset assignment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Validate current selections
  const coreValid = coreSubjects.length >= MIN_CORE_SUBJECTS && coreSubjects.length <= maxCoreSubjects;
  const practicalValid = practicalSubjects.length === maxPracticalSubjects;
  const isValid = coreValid && practicalValid;

  // Display name is className if available, otherwise use "Grade Level Stream" format
  const displayName = assignment.className || `${assignment.gradeLevel} ${assignment.stream}`;
  
  // Ensure core and practical subjects details are arrays with fallbacks
  const coreSubjectsDetails = Array.isArray(assignment.coreSubjectsDetails) 
    ? assignment.coreSubjectsDetails 
    : [];
    
  const practicalSubjectsDetails = Array.isArray(assignment.practicalSubjectsDetails) 
    ? assignment.practicalSubjectsDetails 
    : [];
    
  const electiveSubjectsDetails = Array.isArray(assignment.electiveSubjectsDetails) 
    ? assignment.electiveSubjectsDetails 
    : [];

  return (
    <Paper p="md" shadow="sm" radius="md" mb="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group>
          <Title order={4}>{displayName}</Title>
          <Badge color="blue" size="lg">{assignment.stream}</Badge>
        </Group>
        <Group>
          <Badge color="gray" variant="light">{assignment.gradeLevel}</Badge>
          <Tooltip label="Reset to defaults">
            <ActionIcon 
              color="blue" 
              variant="subtle" 
              onClick={handleReset} 
              disabled={loading}
            >
              <IconRefresh size="1.1rem" />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete assignment">
            <ActionIcon 
              color="red" 
              variant="subtle" 
              onClick={handleDelete} 
              disabled={loading}
            >
              <IconTrash size="1.1rem" />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
      
      <Box mb="md">
        <Group align="center" mb="xs">
          <ThemeIcon color="blue" size="sm" radius="xl">
            <IconBook2 size="0.8rem" />
          </ThemeIcon>
          <Text fw={600} size="sm">Current Assignments</Text>
        </Group>

        <Stack gap="xs">
          <Group align="flex-start">
            <Text size="sm" w={120} fw={500}>Core Subjects:</Text>
            <Box>
              {coreSubjectsDetails.length > 0 
                ? getSubjectBadges(coreSubjectsDetails)
                : <Text size="sm" c="dimmed">None selected</Text>
              }
            </Box>
          </Group>
          
          <Group align="flex-start">
            <Text size="sm" w={120} fw={500}>Practical Subjects:</Text>
            <Box>
              {practicalSubjectsDetails.length > 0 
                ? getSubjectBadges(practicalSubjectsDetails)
                : <Text size="sm" c="dimmed">None selected</Text>
              }
            </Box>
            <Group align="center">
              <Badge color="red" variant="light" size="sm">Required: {maxElectiveSubjects}</Badge>
              <Text size="sm" c="dimmed"> (Elective)</Text>
              <Box>
              {electiveSubjectsDetails.length > 0 
                ? getSubjectBadges(electiveSubjectsDetails)
                : <Text size="sm" c="dimmed">None selected</Text>
              }
            </Box>
            </Group>
          </Group>
        </Stack>
      </Box>

      <Divider my="md" label="Edit Assignments" labelPosition="center" />

      {/* Using our custom subject selector instead of MultiSelect */}
      <CustomSubjectSelector
        title="Core Subjects"
        description={`Select between ${MIN_CORE_SUBJECTS} and ${maxCoreSubjects} core subjects`}
        availableSubjects={coreSubjectOptions}
        selectedSubjectIds={coreSubjects}
        onChange={setCoreSubjects}
        minCount={MIN_CORE_SUBJECTS}
        maxCount={maxCoreSubjects}
      />

      <CustomSubjectSelector
        title="Practical Subjects"
        description={`Select exactly ${maxPracticalSubjects} practical subjects`}
        availableSubjects={practicalSubjectOptions}
        selectedSubjectIds={practicalSubjects}
        onChange={setPracticalSubjects}
        minCount={maxPracticalSubjects}
        maxCount={maxPracticalSubjects}
      />

      <CustomSubjectSelector
        title="Elective Subjects"
        description={`Select up to ${maxElectiveSubjects} elective subjects`}
        availableSubjects={electiveSubjectOptions}
        selectedSubjectIds={electiveSubjects}
        onChange={setElectiveSubjects}
        minCount={0}
        maxCount={maxElectiveSubjects}
      />

      {/* Error display */}
      {error && (
        <Alert 
          icon={<IconAlertCircle size="1rem" />} 
          title="Error" 
          color="red" 
          variant="light"
          mb="md"
          withCloseButton
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Validation warning */}
      {!isValid && !error && (
        <Box mb="md">
          <Group gap="xs" justify="flex-start" align="center" mb="xs">
            <IconAlertCircle size="1rem" color="orange" />
            <Text size="sm" c="orange">
              {!coreValid 
                ? `Please select between ${MIN_CORE_SUBJECTS} and ${maxCoreSubjects} core subjects.` 
                : `Please select exactly ${maxPracticalSubjects} practical subjects.`
              }
            </Text>
          </Group>
        </Box>
      )}

      <Divider my="md" />

      <Group justify='flex-end'>
        <Button 
          onClick={handleSave} 
          loading={loading} 
          disabled={!isValid}
          leftSection={<IconFileInvoice size="1rem" />}
          color="blue"
        >
          Save Changes
        </Button>
      </Group>
    </Paper>
  );
};

export default ClassSubjectEditor;