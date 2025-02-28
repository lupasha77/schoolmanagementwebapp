import React, { useState } from 'react';
import { 
  Box, 
//   Title, 
  Text, 
  Group, 
  Paper, 
  ActionIcon, 
  Badge, 
  Stack,
  Button,
  ScrollArea,
  TextInput,
//   ThemeIcon
} from '@mantine/core';
import {
    //  IconCheck,
     IconX, IconSearch, IconPlus } from '@tabler/icons-react';
// import { Subject } from './subject_types';

interface SubjectOption {
  id: string;
  name: string;
  code: string;
  department?: string;
}

interface CustomSubjectSelectorProps {
  title: string;
  description: string;
  availableSubjects: SubjectOption[];
  selectedSubjectIds: string[];
  onChange: (ids: string[]) => void;
  minCount?: number;
  maxCount?: number;
}

const CustomSubjectSelector: React.FC<CustomSubjectSelectorProps> = ({
  title,
  description,
  availableSubjects,
  selectedSubjectIds,
  onChange,
  minCount = 0,
  maxCount = Infinity
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter available subjects based on search query
  const filteredSubjects = availableSubjects.filter(subject => 
    !selectedSubjectIds.includes(subject.id) && 
    (subject.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     subject.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Get selected subjects
  const selectedSubjects = selectedSubjectIds
    .map(id => availableSubjects.find(s => s.id === id))
    .filter(Boolean) as SubjectOption[];
  
  // Check if we can add more subjects
  const canAdd = selectedSubjectIds.length < maxCount;
  
  // Check if selection is valid
  const isValid = selectedSubjectIds.length >= minCount && selectedSubjectIds.length <= maxCount;
  
  // Add a subject
  const handleAddSubject = (id: string) => {
    if (selectedSubjectIds.length < maxCount) {
      onChange([...selectedSubjectIds, id]);
    }
  };
  
  // Remove a subject
  const handleRemoveSubject = (id: string) => {
    onChange(selectedSubjectIds.filter(subjectId => subjectId !== id));
  };
  
  return (
    <Box mb="md">
      <Group justify='space-between' mb="xs">
        <Text fw={500}>{title} ({selectedSubjectIds.length}/{minCount}-{maxCount})</Text>
        <Badge color={isValid ? 'green' : 'red'}>
          {isValid ? 'Valid' : 'Invalid'}
        </Badge>
      </Group>
      
      <Text size="sm" color="dimmed" mb="md">{description}</Text>
      
      <Paper withBorder p="md" mb="md">
        <Text fw={500} size="sm" mb="md">Selected Subjects</Text>
        
        {selectedSubjects.length === 0 ? (
          <Text size="sm" color="dimmed" ta="center" py="md">No subjects selected</Text>
        ) : (
          <Stack gap="xs">
            {selectedSubjects.map(subject => (
              <Group key={subject.id} justify="space-between" p="xs" bg="gray.0" style={{ borderRadius: '4px' }}>
                <Group gap="xs">
                  <Text size="sm" fw={500}>{subject.name}</Text>
                  <Badge size="sm" variant="light">{subject.code}</Badge>
                </Group>
                <ActionIcon 
                  color="red" 
                  variant="light" 
                  onClick={() => handleRemoveSubject(subject.id)}
                >
                  <IconX size="1rem" />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>
      
      <Paper withBorder p="md">
        <Group justify="space-between" mb="md">
          <Text fw={500} size="sm">Available Subjects</Text>
          <TextInput
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            size="xs"
           leftSection={<IconSearch size="0.8rem" />}
            rightSection={
              searchQuery ? (
                <ActionIcon size="xs" onClick={() => setSearchQuery('')}>
                  <IconX size="0.8rem" />
                </ActionIcon>
              ) : null
            }
          />
        </Group>
        
        <ScrollArea.Autosize style={{ maxHeight: 200 }} mb="xs">
          {filteredSubjects.length === 0 ? (
            <Text size="sm" color="dimmed" ta="center" py="md">
              {searchQuery 
                ? "No matching subjects found" 
                : "No more subjects available"}
            </Text>
          ) : (
            <Stack gap="xs">
              {filteredSubjects.map(subject => (
                <Group key={subject.id} justify="space-between" p="xs" bg="gray.0" style={{ borderRadius: '4px' }}>
                  <Group gap="xs">
                    <Text size="sm" fw={500}>{subject.name}</Text>
                    <Badge size="sm" variant="light">{subject.code}</Badge>
                    {subject.department && (
                      <Badge size="sm" color="blue" variant="dot">{subject.department}</Badge>
                    )}
                  </Group>
                  <Button
                    variant="light"
                    size="xs"
                    disabled={!canAdd}
                    onClick={() => handleAddSubject(subject.id)}
                    leftSection={<IconPlus size="0.8rem" />}
                  >
                    Add
                  </Button>
                </Group>
              ))}
            </Stack>
          )}
        </ScrollArea.Autosize>
        
        {!canAdd && (
          <Text size="xs" color="red" ta="center">
            Maximum of {maxCount} subjects can be selected
          </Text>
        )}
      </Paper>
    </Box>
  );
};

export default CustomSubjectSelector;

// Example usage in your ClassSubjectEditor component:
// 
// <CustomSubjectSelector
//   title="Core Subjects"
//   description={`Select between ${MIN_CORE_SUBJECTS} and ${maxCoreSubjects} core subjects`}
//   availableSubjects={coreOptions.map(opt => ({
//     id: opt.value,
//     name: opt.label.split(' (')[0],
//     code: opt.label.split(' (')[1].replace(')', ''),
//     department: opt.group
//   }))}
//   selectedSubjectIds={coreSubjects}
//   onChange={setCoreSubjects}
//   minCount={MIN_CORE_SUBJECTS}
//   maxCount={maxCoreSubjects}
// />