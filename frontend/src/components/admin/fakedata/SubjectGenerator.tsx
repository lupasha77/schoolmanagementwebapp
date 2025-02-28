import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Group,
  Text,
  Select,
  TextInput,
  Button,
  Table,
  Grid,
  Pagination,
  NumberInput,
  LoadingOverlay,
  Stack,
  Checkbox,
  Collapse,
  Paper,
  SimpleGrid,
} from '@mantine/core';
import { IconSearch, IconArrowsSort, IconEdit, IconPlus, IconX } from '@tabler/icons-react';
import api from '../../../utils/api/axios';

interface Subject {
  _id: string;
  code: string;
  name: string;
  department: string;
}

interface SortConfig {
  field: keyof Subject;
  order: 1 | -1;
}

interface SortableHeaderProps {
  field: keyof Subject;
  children: React.ReactNode;
  sortConfig: SortConfig;
  onSort: (field: keyof Subject) => void;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ field, children, sortConfig, onSort }) => (
  <div 
    role="button"
    tabIndex={0}
    onClick={() => onSort(field)}
    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
  >
    <Text>{children}</Text>
    <IconArrowsSort 
      size={14} 
      style={{ 
        transform: sortConfig.field === field && sortConfig.order === -1 
          ? 'rotate(180deg)' 
          : 'none' 
      }} 
    />
  </div>
);

type SubjectFormData = Omit<Subject, '_id'>;

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [gradeLevel, setGradeLevel] = useState<string | null>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', order: 1 });
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [subjectBeingEdited, setSubjectBeingEdited] = useState<Subject | null>(null);
  const [formData, setFormData] = useState<SubjectFormData>({
    code: '',
    name: '',
    department: '',
  });

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search,
        sortBy: sortConfig.field,
        sortOrder: sortConfig.order.toString(),
        ...(gradeLevel && { gradeLevel })
      });

      const response = await api.get(`/subject-gen/subjects?${queryParams}`);
      setSubjects(response.data.subjects);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, sortConfig, gradeLevel]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleGenerateSubjects = async () => {
    setLoading(true);
    try {
      await api.post('/subject-gen/generate_subjects', { gradeLevel });
      fetchSubjects();
    } catch (error) {
      console.error("Error generating subjects:", error);
    }
  };

  const handleSort = (field: keyof Subject) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field ? (prev.order === 1 ? -1 : 1) : 1
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSubjects(new Set(subjects.map(subject => subject._id)));
    } else {
      setSelectedSubjects(new Set());
    }
  };

  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subjectId)) {
        newSet.delete(subjectId);
      } else {
        newSet.add(subjectId);
      }
      return newSet;
    });
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      department: '',
    });
    setIsEditing(false);
    setSubjectBeingEdited(null);
  };

  const openAddForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (subject: Subject) => {
    setSubjectBeingEdited(subject);
    setFormData({
      code: subject.code,
      name: subject.name,
      department: subject.department,
    });
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const handleFormChange = (field: keyof SubjectFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (isEditing && subjectBeingEdited) {
        await api.put(`/subject-gen/edit_subject/${subjectBeingEdited._id}`, formData);
      } else {
        await api.post('/subject-gen/add_subject', formData);
      }
      closeForm();
      fetchSubjects();
    } catch (error) {
      console.error("Error saving subject:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedSubjects.size === 0) return;
    
    setLoading(true);
    try {
      await Promise.all(
        Array.from(selectedSubjects).map(id => 
          api.delete(`/subject-gen/delete_subject/${id}`)
        )
      );
      setSelectedSubjects(new Set());
      fetchSubjects();
    } catch (error) {
      console.error("Error deleting selected subjects:", error);
    } finally {
      setLoading(false);
    }
  };

  const gradeLevelOptions = [
    { value: '', label: 'All Grades' },
    { value: 'Form 1', label: 'Form 1' },
    { value: 'Form 2', label: 'Form 2' },
    { value: 'Form 3', label: 'Form 3' },
    { value: 'Form 4', label: 'Form 4' },
    { value: 'Form 5', label: 'Form 5' },
    { value: 'Form 6', label: 'Form 6' },
  ];

  const departmentOptions = [
    { value: 'Mathematics', label: 'Mathematics' },
    { value: 'Science', label: 'Science' },
    { value: 'Languages', label: 'Languages' },
    { value: 'Humanities', label: 'Humanities' },
    { value: 'Technical', label: 'Technical' },
    { value: 'Arts', label: 'Arts' },
  ];

  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="xl" fw={500}>Subject Management</Text>
          <Button 
            leftSection={<IconPlus size={16} />}
            onClick={openAddForm}
            disabled={isFormOpen}
          >
            Add Subject
          </Button>
        </Group>

        <Collapse in={isFormOpen}>
          <Paper withBorder p="md" radius="md" mb="md">
            <Stack>
              <Group justify="space-between">
                <Text fw={500}>{isEditing ? 'Edit Subject' : 'Add New Subject'}</Text>
                <Button 
                  variant="subtle" 
                  color="gray" 
                  size="sm"
                  onClick={closeForm}
                  leftSection={<IconX size={16} />}
                >
                  Close
                </Button>
              </Group>
              
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label="Subject Code"
                  placeholder="e.g. MATH101"
                  required
                  value={formData.code}
                  onChange={(e) => handleFormChange('code', e.target.value)}
                />
                <TextInput
                  label="Subject Name"
                  placeholder="e.g. Introduction to Algebra"
                  required
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                />
                <Select
                  label="Department"
                  placeholder="Select department"
                  data={departmentOptions}
                  required
                  value={formData.department}
                  onChange={(value) => handleFormChange('department', value || '')}
                  clearable
                />
              </SimpleGrid>

              <Group justify="flex-end" mt="md">
                <Button variant="outline" onClick={closeForm}>Cancel</Button>
                <Button onClick={handleSubmit} loading={loading}>
                  {isEditing ? 'Save Changes' : 'Add Subject'}
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Collapse>
        
        <Grid>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <TextInput
              placeholder="Search subjects..."
              leftSection={<IconSearch size={14} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Select
              placeholder="Select grade"
              value={gradeLevel}
              onChange={(value) => setGradeLevel(value)}
              data={gradeLevelOptions}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Group>
              <Button
                onClick={handleGenerateSubjects}
                loading={loading}
              >
                Generate Subjects
              </Button>
              {selectedSubjects.size > 0 && (
                <Button
                  color="red"
                  onClick={handleDeleteSelected}
                  loading={loading}
                >
                  Delete Selected ({selectedSubjects.size})
                </Button>
              )}
            </Group>
          </Grid.Col>
        </Grid>

        <div style={{ position: 'relative' }}>
          <LoadingOverlay visible={loading} />
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>
                  <Checkbox
                    checked={selectedSubjects.size === subjects.length && subjects.length > 0}
                    indeterminate={selectedSubjects.size > 0 && selectedSubjects.size < subjects.length}
                    onChange={(event) => handleSelectAll(event.currentTarget.checked)}
                  />
                </Table.Th>
                <Table.Th>
                  <SortableHeader field="code" sortConfig={sortConfig} onSort={handleSort}>
                    Code
                  </SortableHeader>
                </Table.Th>
                <Table.Th>
                  <SortableHeader field="name" sortConfig={sortConfig} onSort={handleSort}>
                    Name
                  </SortableHeader>
                </Table.Th>
                <Table.Th>
                  <SortableHeader field="department" sortConfig={sortConfig} onSort={handleSort}>
                    Department
                  </SortableHeader>
                </Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {subjects.map((subject) => (
                <Table.Tr key={subject._id}>
                  <Table.Td>
                    <Checkbox
                      checked={selectedSubjects.has(subject._id)}
                      onChange={() => handleSelectSubject(subject._id)}
                    />
                  </Table.Td>
                  <Table.Td>{subject.code}</Table.Td>
                  <Table.Td>{subject.name}</Table.Td>
                  <Table.Td>{subject.department}</Table.Td>
                  <Table.Td>
                    <Group>
                      <Button
                        color="blue"
                        size="xs"
                        leftSection={<IconEdit size={14} />}
                        onClick={() => openEditForm(subject)}
                      >
                        Edit
                      </Button>
                      <Button
                        color="red"
                        size="xs"
                        onClick={async () => {
                          await api.delete(`/subject-gen/delete_subject/${subject._id}`);
                          fetchSubjects();
                        }}
                      >
                        Delete
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>

        <Grid align="center">
          <Grid.Col span={{ base: 12, sm: 8 }}>
            <Pagination
              total={totalPages}
              value={page}
              onChange={setPage}
              withEdges
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Group justify="flex-end">
              <NumberInput
                value={pageSize}
                onChange={(value) => setPageSize(Number(value))}
                min={5}
                max={100}
                step={5}
                label="Items per page"
                style={{ width: 130 }}
              />
            </Group>
          </Grid.Col>
        </Grid>
      </Stack>
    </Card>
  );
}