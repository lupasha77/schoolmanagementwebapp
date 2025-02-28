import { useEffect, useState } from "react";
import {
  NumberInput,
  Table,
  TextInput,
  Group,
  ActionIcon,
  Stack,
  Card,
  Checkbox,
  Pagination,
  Select,
  Button,
  Paper,
  Collapse
} from "@mantine/core";
import { IconEdit, IconCheck, IconX, IconSearch,   IconTrash } from "@tabler/icons-react";
import { notifications } from '@mantine/notifications';
import api from "../../../utils/api/axios";

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  user_email: string;
  studentId: string;
  phoneNumber: string;
  address: string;
  subjects: string[];
  gradeLevel: string;
  specialties: string[];
  isEditing?: boolean;
  originalData?: Partial<Student>;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const GRADE_LEVELS = [
  "Form 1",
  "Form 2",
  "Form 3",
  "Form 4",
  "Lower Sixth",
  "Upper Sixth"
];

const SUBJECTS = [
  "Mathematics",
  "English Language",
  "General Science",
  "Physics",
  "Chemistry",
  "Biology",
  "Geography",
  "History",
  "Accounting",
  "Economics",
  "Business Studies",
  "Computer Science",
  "Agriculture",
  "Art and Design",
  "Music",
  "Physical Education",
  "Religious Studies",
  "Shona",
  "French"
];
interface Constants {
  gradeLevels: { value: string; label: string }[];
  departments: { value: string; label: string }[];
  subjects: { value: string; label: string }[];
  specialties: { value: string; label: string }[];
}
// const SPECIALTIES = [
//   "arts",
//   "sciences",
//   "commercial",
//   "humanities"
// ];

export default function FakeStudentGenerator() {
  const [students, setStudents] = useState<Student[]>([]);
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [studentCount, setStudentCount] = useState<number>(200);
  // const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState({
    students: false,
    adding: false,
  });
   // Selected grade level for generating students
   const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('');
const [constants, setConstants] = useState<Constants>({
    gradeLevels: [],
    departments: [],
    subjects: [],
    specialties: []
  });
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    firstName: '',
    lastName: '',
    subjects: [],
    gradeLevel: "",
    specialties: []
  });
   useEffect(() => {
      fetchConstants();
    }, []);
  const fetchConstants = async () => {
    try {
      const [gradeLevels, departments, subjects, specialties] = await Promise.all([
        api.get('/constants/grade_levels'),
        api.get('/constants/departments'),
        api.get('/constants/subjects'),
        api.get('/constants/specialties')
      ]);

      setConstants({
        gradeLevels: gradeLevels.data,
        departments: departments.data,
        subjects: subjects.data,
        specialties: specialties.data
      });
    } catch   {
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch constants',
        color: 'red'
      });
    } finally {
      setIsLoading(prev => ({ ...prev, constants: false }));
    }
  };
  
  const handleSelectAll = (items: Student[]) => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item._id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const startEditing = (student: Student) => {
      setStudents(students.map(s => 
        s._id === student._id 
          ? { ...s, isEditing: true, originalData: { ...s } }
          : s
      ));
    };
  
    const cancelEditing = (student: Student) => {
      setStudents(students.map(s => 
        s._id === student._id && student.originalData
          ? { ...student.originalData as Student, isEditing: false }
          : s
      ));
    };
  
    const handleEdit = (student: Student, field: keyof Student, value: string | string[] | undefined) => {
      setStudents(students.map(s => 
        s._id === student._id 
          ? { ...s, [field]: value }
          : s
      ));
    };
  
    const saveEditing = async (student: Student) => {
      try {
        await api.put(`/fake_user/edit-students/${student._id}`);
        
        setStudents(students.map(s => 
          s._id === student._id 
            ? { ...s, isEditing: false }
            : s
        ));
        
        notifications.show({
          title: 'Success',
          message: 'Updated successfully',
          color: 'green'
        });
      } catch {
        notifications.show({
          title: 'Error',
          message: 'Failed to update',
          color: 'red'
        });
      }
    };

  const handleDelete = async () => {
    if (selectedItems.size === 0) return;
    
    try {
      const response = await api.post('/fake_user/students/delete-students', {
        ids: Array.from(selectedItems)
      });
      
      if (response.data.deleted_count > 0) {
        fetchData();
        setSelectedItems(new Set());
        notifications.show({
          title: 'Success',
          message: `Deleted ${response.data.deleted_count} studentsmembers`,
          color: 'green'
        });
      }
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete items',
        color: 'red'
      });
    }
  };

  const handleAddNewStudent = async () => {
    if (!newStudent.firstName || !newStudent.lastName || !newStudent.gradeLevel) {
      notifications.show({
        title: 'Error',
        message: 'Required fields are missing',
        color: 'red'
      });
      return;
    }

    setIsLoading(prev => ({ ...prev, adding: true }));
    try {
      const response = await api.post('/fake_user/create-student');
      
      if (response.data.students) {
        fetchData();
        setNewStudent({
          firstName: '',
          lastName: '', 
          subjects: [],
          gradeLevel: "",
          specialties: [],
           
         
        });
        setShowInlineForm(false);
        
        notifications.show({
          title: 'Success',
          message: 'Added new studentsmember successfully',
          color: 'green'
        });
      }
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to add studentsmember',
        color: 'red'
      });
    } finally {
      setIsLoading(prev => ({ ...prev, adding: false }));
    }
  };

  const handleGenerateStudent = async () => {
    if (!selectedGradeLevel) {
      notifications.show({
        title: 'Error',
        message: 'Please select a grade level',
        color: 'red'
      });
      return;
    }
    setIsLoading(prev => ({ ...prev, students: true }));
    try {
      const response = await api.post('/fake_user/generate-students', {
        count: studentCount,
        gradeLevel: selectedGradeLevel
      });
      console.log(response.data);
      if (response.data.count > 0) {
        fetchData();
        notifications.show({
          title: 'Success',
          message: `Generated ${response.data.count} studentsmembers successfully`,
          color: 'green'
        });
      }
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to generate students',
        color: 'red'
      });
    } finally {
      setIsLoading(prev => ({ ...prev, students: false }));
    }
  };

  const fetchData = async (page = 1) => {
    setIsLoading(prev => ({ ...prev, students: true }));
    try {
      const response = await api.get('/fake_user/get-all-students', {
        params: {
          page,
          per_page: 10,
          search: searchQuery || undefined
        }
      });
      
      const result = response.data as PaginatedResponse<Student>;
      setStudents(result.items);
      setTotalPages(result.total_pages);
      setCurrentPage(result.page);
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch students',
        color: 'red'
      });
    } finally {
      setIsLoading(prev => ({ ...prev, students: false }));
    }
  };

  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <TextInput
            placeholder="Search..."
            leftSection={<IconSearch size={14} />}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              fetchData(1);
            }}
            style={{ width: 300 }}
          />
            <Group>
            <Select
              label="Grade Level"
              placeholder="Select grade level"
              value={selectedGradeLevel}
              onChange={(value) => setSelectedGradeLevel(value || '')}
              
              data={constants.gradeLevels}
               
            />
            <NumberInput
              label="Number of students"
              value={studentCount}
              onChange={(value) => setStudentCount(Number(value))}
              min={1}
              max={1000}
              style={{ width: 120 }}
            />
            <Button
              onClick={handleGenerateStudent}
              loading={isLoading.students}
              disabled={isLoading.students}
            >
              Generate
            </Button>
            </Group>
        </Group>

        <Group justify="space-between">
          <Group>
            <Button
              onClick={() => fetchData()}
              variant="outline"
              loading={isLoading.students}
              disabled={isLoading.students}
            >
              {isLoading.students ? 'Loading...' : 'Refresh students'}
            </Button>
            <Button onClick={() => setShowInlineForm(!showInlineForm)}>
              {showInlineForm ? 'Cancel' : 'Add studentsmember'}
            </Button>
          </Group>
          
          {selectedItems.size > 0 && (
            <Button
              color="red"
              leftSection={<IconTrash size={14} />}
              onClick={handleDelete}
            >
              Delete Selected
            </Button>
          )}
        </Group>

        <Collapse in={showInlineForm}>
          <Paper p="md" shadow="xs" withBorder mb="md">
            <Stack>
              <TextInput
                label="First Name"
                placeholder="Enter first name"
                value={newStudent.firstName}
                onChange={(e) => setNewStudent(prev => ({ ...prev, firstName: e.target.value }))}
                required
              />
              <TextInput
                label="Last Name"
                placeholder="Enter last name"
                value={newStudent.lastName}
                onChange={(e) => setNewStudent(prev => ({ ...prev, lastName: e.target.value }))}
                required
              />
              <Select
                label="Grade Level"
                placeholder="Select gradeLevel"
                value={newStudent.gradeLevel}
                onChange={(value) => 
                  setNewStudent(prev => ({ 
                    ...prev, 
                    
                    gradeLevel: value === 'gradeLevel' ? '' : prev.gradeLevel,
                     
                  }))
                }
                data={[
                  { value: 'gradeLevel', label: 'Grade Level' }
                ]}
                required
              />

              

              <Group justify="flex-end" mt="md">
                <Button 
                  onClick={handleAddNewStudent}
                  loading={isLoading.adding}
                >
                  Add student member
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Collapse>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>
                <Checkbox
                  checked={selectedItems.size === students.length && students.length > 0}
                  indeterminate={selectedItems.size > 0 && selectedItems.size < students.length}
                  onChange={() => handleSelectAll(students)}
                />
              </Table.Th>
              <Table.Th>First Name</Table.Th>
              <Table.Th>Last Name</Table.Th> 
                 <Table.Th>Email</Table.Th>
              <Table.Th>Employee ID</Table.Th>
              <Table.Th>Role Area</Table.Th>
              <Table.Th>Details</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {students.map((students) => (
              <Table.Tr key={students._id}>
                <Table.Td>
                  <Checkbox
                    checked={selectedItems.has(students ._id)}
                    onChange={() => handleSelect(students._id)}
                  />
                </Table.Td>
                <Table.Td>
                  {students.isEditing ? (
                    <TextInput
                      value={students.firstName}
                      onChange={(e) => handleEdit(students, "firstName", e.target.value)}
                    />
                  ) : (
                    students.firstName
                  )}
                </Table.Td>
                <Table.Td>
                  {students.isEditing ? (
                    <TextInput
                      value={students.lastName}
                      onChange={(e) => handleEdit(students, "lastName", e.target.value)}
                    />
                  ) : (
                    students .lastName
                  )}
                </Table.Td>
                <Table.Td>{students.user_email}</Table.Td>
                <Table.Td>{students .studentId}</Table.Td>
                <Table.Td>
                  {students.isEditing ? (
                    <Select
                      value={students.gradeLevel}
                      onChange={(value: string | null) => {
                        handleEdit(students, "gradeLevel", value||'');
                        if (value === 'gradeLevel') {
                          handleEdit(students, "subjects", []); 
                          handleEdit(students, "specialties", []);
                        }  
                      }}
                      data={[
                        { value: 'teaching', label: 'Teaching' },
                        { value: 'non-teaching', label: 'Non-Teaching' }
                      ]}
                    />
                  ) : (
                    students.gradeLevel
                  )}
                </Table.Td>
                <Table.Td>
                  {students.isEditing ? (
                    students.gradeLevel === 'gradeLevel' ? (
                      <Stack>
                        <Select
                          label="Subjects"
                          placeholder="Select subjects"
                          value={students.subjects.join(", ")}
                          onChange={(value) => handleEdit(students, "subjects", value||[])}
                          data={SUBJECTS}
                          multiple
                        />
                        <Select
                          label="Grade Level"
                          placeholder="Select grade level"
                          value={students.gradeLevel}
                          onChange={(value) => handleEdit(students, "gradeLevel", value||'')}
                          data={GRADE_LEVELS}
                          multiple
                        />
                         
                      </Stack>
                    ) : null
                  ) : (
                    <div>
                      {students.gradeLevel === 'gradeLevel' ? (
                        <>
                          <div>Subjects: {students.subjects.join(", ")}</div>
                          <div>Grade Level: {students.gradeLevel}</div>
                          <div>Specialties: {students.specialties}</div>
                        </>
                      ) : null}
                    </div>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    {students.isEditing ? (
                      <>
                        <ActionIcon color="green" onClick={() => saveEditing(students)}>
                          <IconCheck size={16} />
                        </ActionIcon>
                        <ActionIcon color="red" onClick={() => cancelEditing(students)}>
                          <IconX size={16} />
                        </ActionIcon>
                      </>
                    ) : (
                      <ActionIcon color="blue" onClick={() => startEditing(students)}>
                        <IconEdit size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Group justify="center">
          <Pagination
            total={totalPages}
            value={currentPage}
            onChange={(page) => {
              setCurrentPage(page);
              fetchData(page);
            }}
          />
        </Group>
      </Stack>
    </Card>
  );
}