import { useState, useEffect } from "react";
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
import { IconEdit, IconCheck, IconX, IconSearch, IconTrash } from "@tabler/icons-react";
import { notifications } from '@mantine/notifications';
import api from "../../../utils/api/axios";

interface Staff {
  _id: string;
  firstName: string;
  lastName: string;
  user_email: string;
  employeeId: string;
  phoneNumber: string;
  address: string;
  roleArea: "teaching" | "non-teaching";
  subjects: string[] | null;
  gradeLevels: string[] | null;
  specialties: string[] | null;
  department?: string;
  position?: string;
  created_at: Date;
  updated_at: Date;
  isEditing?: boolean;
  originalData?: Partial<Staff>;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface Constants {
  gradeLevels: { value: string; label: string }[];
  departments: { value: string; label: string }[];
  subjects: { value: string; label: string }[];
  specialties: { value: string; label: string }[];
}

export default function FakeStaffGenerator() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [constants, setConstants] = useState<Constants>({
    gradeLevels: [],
    departments: [],
    subjects: [],
    specialties: []
  });
  const [isLoading, setIsLoading] = useState({
    staff: false,
    adding: false,
    constants: true
  });

  const [newStaff, setNewStaff] = useState<Partial<Staff>>({
    firstName: '',
    lastName: '',
    roleArea: 'non-teaching',
    subjects: [],
    gradeLevels: [],
    specialties: [],
    department: '',
    position: ''
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

  // Existing functions remain the same
  const handleSelectAll = (items: Staff[]) => {
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

  const startEditing = (staffMember: Staff) => {
    setStaff(staff.map(s => 
      s._id === staffMember._id 
        ? { ...s, isEditing: true, originalData: { ...s } }
        : s
    ));
  };

  const cancelEditing = (staffMember: Staff) => {
    setStaff(staff.map(s => 
      s._id === staffMember._id && staffMember.originalData
        ? { ...staffMember.originalData as Staff, isEditing: false }
        : s
    ));
  };

  const handleEdit = (staffMember: Staff, field: keyof Staff, value: string | string[] | undefined) => {
    setStaff(staff.map(s => 
      s._id === staffMember._id 
        ? { ...s, [field]: value }
        : s
    ));
  };

  const saveEditing = async (staffMember: Staff) => {
    try {
      await api.put(`/fake_user/edit-staff/${staffMember._id}`, {
        ...staffMember,
        subjects: staffMember.roleArea === 'teaching' ? staffMember.subjects : null,
        gradeLevels: staffMember.roleArea === 'teaching' ? staffMember.gradeLevels : null,
        specialties: staffMember.roleArea === 'teaching' ? staffMember.specialties : null
      });
      
      setStaff(staff.map(s => 
        s._id === staffMember._id 
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
      const response = await api.post('/fake_user/staff/delete-staff', {
        ids: Array.from(selectedItems)
      });
      
      if (response.data.deleted_count > 0) {
        fetchData();
        setSelectedItems(new Set());
        notifications.show({
          title: 'Success',
          message: `Deleted ${response.data.deleted_count} staff members`,
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

  const handleAddNewStaff = async () => {
    if (!newStaff.firstName || !newStaff.lastName || !newStaff.roleArea) {
      notifications.show({
        title: 'Error',
        message: 'Required fields are missing',
        color: 'red'
      });
      return;
    }

    setIsLoading(prev => ({ ...prev, adding: true }));
    try {
      const response = await api.post('/fake_user/create-staff', {
        ...newStaff,
        subjects: newStaff.roleArea === 'teaching' ? newStaff.subjects : null,
        gradeLevels: newStaff.roleArea === 'teaching' ? newStaff.gradeLevels : null,
        specialties: newStaff.roleArea === 'teaching' ? newStaff.specialties : null
      });
      
      if (response.data.staff) {
        fetchData();
        setNewStaff({
          firstName: '',
          lastName: '',
          roleArea: 'non-teaching',
          subjects: [],
          gradeLevels: [],
          specialties: [],
          department: '',
          position: ''
        });
        setShowInlineForm(false);
        
        notifications.show({
          title: 'Success',
          message: 'Added new staff member successfully',
          color: 'green'
        });
      }
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to add staff member',
        color: 'red'
      });
    } finally {
      setIsLoading(prev => ({ ...prev, adding: false }));
    }
  };

// Frontend fix in StaffGenerationForm component
const StaffGenerationForm = ({ onGenerate, isLoading }: { 
  onGenerate: (params: { count: number; department?: string; roleArea?: 'teaching' | 'non-teaching' | '' }) => Promise<void>;
  isLoading: boolean;
}) => {
  const [generationParams, setGenerationParams] = useState({
    count: 20,
    department: '',
    roleArea: '' as 'teaching' | 'non-teaching' | ''
  });

  const handleGenerate = () => {
    // Only send non-empty parameters
    const cleanParams = {
      count: generationParams.count,
      ...(generationParams.department && { department: generationParams.department }),
      ...(generationParams.roleArea && { role_area: generationParams.roleArea }) // Fixed roleArea -> role_area
    };
  
    onGenerate(cleanParams);
  };
  

  return (
    <Card className="p-4 mb-4">
      <Stack className="gap-4">
        <Group className="justify-between">
          <NumberInput
            label="Number of staff"
            value={generationParams.count}
            onChange={(value) => setGenerationParams(prev => ({ ...prev, count: Number(value) }))}
            min={1}
            max={1000}
            className="w-32"
          />
          <Select
            label="Department (Optional)"
            value={generationParams.department}
            onChange={(value) => setGenerationParams(prev => ({ ...prev, department: value || '' }))}
            data={constants.departments}
            clearable
            className="w-48"
          />
          <Select
            label="Role Area (Optional)"
            value={generationParams.roleArea}
            onChange={(value: string | null) => setGenerationParams(prev => ({ 
              ...prev, 
              roleArea: (value as 'teaching' | 'non-teaching' | '') || '' 
            }))}
            data={[
              { value: 'teaching', label: 'Teaching' },
              { value: 'non-teaching', label: 'Non-Teaching' }
            ]}
            clearable
            className="w-48"
          />
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="mt-6"
          >
            {isLoading ? 'Generating...' : 'Generate Staff'}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
};

// Update the handleGenerateStaff function
const handleGenerateStaff = async (params: {
  count: number;
  department?: string;
  role_area?: "teaching" | "non-teaching" | "";
}) => {
  setIsLoading(prev => ({ ...prev, staff: true }));

  try {
    // Ensure only valid properties are included
    const requestParams: Record<string, string | number> = {
      count: params.count
    };

    if (params.department) requestParams.department = params.department;
    if (params.role_area) requestParams.role_area = params.role_area; // Changed from roleArea to role_area

    console.log("Request params before sending to backend", requestParams);

    const response = await api.post('/fake_user/generate-staffs', requestParams);
    console.log("Response from backend", response.data);

    if (response.data.count > 0) {
      fetchData();
      notifications.show({
        title: 'Success',
        message: `Generated ${response.data.count} staff members successfully`,
        color: 'green'
      });
    }
  } catch (error) {
    console.error("Error generating staff:", error);
    notifications.show({
      title: 'Error',
      message: 'Failed to generate staff',
      color: 'red'
    });
  } finally {
    setIsLoading(prev => ({ ...prev, staff: false }));
  }
};


  const fetchData = async (page = 1) => {
    setIsLoading(prev => ({ ...prev, staff: true }));
    try {
      const response = await api.get('/fake_user/get-all-staff', {
        params: {
          page,
          per_page: 10,
          search: searchQuery || undefined
        }
      });
      
      const result = response.data as PaginatedResponse<Staff>;
      setStaff(result.items);
      setTotalPages(result.total_pages);
      setCurrentPage(result.page);
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch staff',
        color: 'red'
      });
    } finally {
      setIsLoading(prev => ({ ...prev, staff: false }));
    }
  };

  if (isLoading.constants) {
    return <div>Loading constants...</div>;
  }

  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Stack gap="md">
        <TextInput
          placeholder="Search..."
          leftSection={<IconSearch size={14} />}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            fetchData(1);
          }}
          className="w-72"
        />

        <StaffGenerationForm 
          onGenerate={handleGenerateStaff}
          isLoading={isLoading.staff}
        />

        <Group justify="space-between">
          <Group>
            <Button
              onClick={() => fetchData()}
              variant="outline"
              loading={isLoading.staff}
              disabled={isLoading.staff}
            >
              {isLoading.staff ? 'Loading...' : 'Refresh staff'}
            </Button>
            <Button onClick={() => setShowInlineForm(!showInlineForm)}>
              {showInlineForm ? 'Cancel' : 'Add staff member'}
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
                value={newStaff.firstName}
                onChange={(e) => setNewStaff(prev => ({ ...prev, firstName: e.target.value }))}
                required
              />
              <TextInput
                label="Last Name"
                placeholder="Enter last name"
                value={newStaff.lastName}
                onChange={(e) => setNewStaff(prev => ({ ...prev, lastName: e.target.value }))}
                required
              />
              <Select
                label="Role Area"
                placeholder="Select role area"
                value={newStaff.roleArea}
                onChange={(value: string| null) => 
                  setNewStaff(prev => ({ 
                    ...prev, 
                    roleArea: (value as "teaching" | "non-teaching"),
                    subjects: value === 'teaching' ? prev.subjects : null,
                    gradeLevels: value === 'teaching' ? prev.gradeLevels : null,
                    specialties: value === 'teaching' ? prev.specialties : null,
                    department: value === 'non-teaching' ? prev.department : '',
                    position: value === 'non-teaching' ? prev.position : ''
                  }))
                }
                data={[
                  { value: 'teaching', label: 'Teaching' },
                  { value: 'non-teaching', label: 'Non-Teaching' }
                ]}
                required
              />

              {newStaff.roleArea === 'teaching' && (
                <>
                  <Select
                    label="Subjects"
                    placeholder="Select subjects"
                    value={newStaff.subjects?.join(", ") || ''}
                    onChange={(value) => setNewStaff(prev => ({ ...prev, subjects: value as string[] | null }))}
                    data={constants.subjects}
                    multiple
                    required
                  />
                  <Select
                    label="Grade Levels"
                    placeholder="Select grade levels"
                    value={newStaff.gradeLevels?.join(", ") || ''}
                    onChange={(value) => setNewStaff(prev => ({ ...prev, gradeLevels: value as string[] | null }))}
                    data={constants.gradeLevels}
                    multiple
                    required
                  />
                  <Select
                    label="Specialties"
                    placeholder="Select specialties"
                    value={newStaff.specialties?.join(", ") || ''}
                    onChange={(value) => setNewStaff(prev => ({ ...prev, specialties: value as string[] | null }))}
                    data={constants.specialties}
                    multiple
                    required
                  />
                </>
              )}

              {newStaff.roleArea === 'non-teaching' && (
                <>
                  <Select
                    label="Department"
                    placeholder="Select department"
                    value={newStaff.department}
                    onChange={(value) => setNewStaff(prev => ({ ...prev, department: value || '' }))}
                    data={constants.departments}
                    required
                  />
                  <TextInput
                    label="Position"
                    placeholder="Enter position"
                    value={newStaff.position}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, position: e.target.value }))}
                    required
                  />
                </>
              )}

              <Group justify="flex-end" mt="md">
                <Button 
                  onClick={handleAddNewStaff}
                  loading={isLoading.adding}
                >
                  Add staff member
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
                  checked={selectedItems.size === staff.length && staff.length > 0}
                  indeterminate={selectedItems.size > 0 && selectedItems.size < staff.length}
                  onChange={() => handleSelectAll(staff)}
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
            {staff.map((staffMember) => (
              <Table.Tr key={staffMember._id}>
                <Table.Td>
                  <Checkbox
                    checked={selectedItems.has(staffMember._id)}
                    onChange={() => handleSelect(staffMember._id)}
                  />
                </Table.Td>
                <Table.Td>
                  {staffMember.isEditing ? (
                    <TextInput
                      value={staffMember.firstName}
                      onChange={(e) => handleEdit(staffMember, "firstName", e.target.value)}
                    />
                  ) : (
                    staffMember.firstName
                  )}
                </Table.Td>
                <Table.Td>
                  {staffMember.isEditing ? (
                    <TextInput
                      value={staffMember.lastName}
                      onChange={(e) => handleEdit(staffMember, "lastName", e.target.value)}
                    />
                  ) : (
                    staffMember.lastName
                  )}
                </Table.Td>
                <Table.Td>{staffMember.user_email}</Table.Td>
                <Table.Td>{staffMember.employeeId}</Table.Td>
                <Table.Td>
                  {staffMember.isEditing ? (
                    <Select
                      value={staffMember.roleArea}
                      onChange={(value: string | null) => {
                        const roleArea = value as "teaching" | "non-teaching";
                        handleEdit(staffMember, "roleArea", roleArea);
                        if (roleArea === 'non-teaching') {
                          handleEdit(staffMember, "subjects", "");
                          handleEdit(staffMember, "gradeLevels", "");
                          handleEdit(staffMember, "specialties", "");
                        } else {
                          handleEdit(staffMember, "department", "");
                          handleEdit(staffMember, "position", "");
                        }
                      }}
                      data={[
                        { value: 'teaching', label: 'Teaching' },
                        { value: 'non-teaching', label: 'Non-Teaching' }
                      ]}
                    />
                  ) : (
                    staffMember.roleArea
                  )}
                </Table.Td>
                <Table.Td>
                  {staffMember.isEditing ? (
                    staffMember.roleArea === 'teaching' ? (
                      <Stack>
                        <Select
                          label="Subjects"
                          placeholder="Select subjects"
                          value={staffMember.subjects?.join(", ") || ''}
                          onChange={(value) => handleEdit(staffMember, "subjects", value||"")}
                          data={constants.subjects}
                          multiple
                        />
                        <Select
                          label="Grade Levels"
                          placeholder="Select grade levels"
                          value={staffMember.gradeLevels?.join(", ") || ''}
                          onChange={(value) => handleEdit(staffMember, "gradeLevels", value|| '')}
                          data={constants.gradeLevels}
                          multiple
                        />
                        <Select
                          label="Specialties"
                          placeholder="Select specialties"
                          value={staffMember.specialties?.join(", ") || ''}
                          onChange={(value) => handleEdit(staffMember, "specialties", value|| '')}
                          data={constants.specialties}
                          multiple
                        />
                      </Stack>
                    ) : (
                      <Stack>
                        <Select
                          label="Department"
                          placeholder="Select department"
                          value={staffMember.department}
                          onChange={(value) => handleEdit(staffMember, "department", value || '')}
                          data={constants.departments}
                        />
                        <TextInput
                          label="Position"
                          placeholder="Enter position"
                          value={staffMember.position}
                          onChange={(e) => handleEdit(staffMember, "position", e.target.value)}
                        />
                      </Stack>
                    )
                  ) : (
                    <div>
                      {staffMember.roleArea === 'teaching' ? (
                        <>
                          <div>Subjects: {staffMember.subjects?.join(", ") || ''}</div>
                          <div>Grade Levels: {staffMember.gradeLevels?.join(", ") || ''}</div>
                          <div>Specialties: {staffMember.specialties?.join(", ") || ''}</div>
                        </>
                      ) : (
                        <>
                          <div>Department: {staffMember.department}</div>
                          <div>Position: {staffMember.position}</div>
                        </>
                      )}
                    </div>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    {staffMember.isEditing ? (
                      <>
                        <ActionIcon color="green" onClick={() => saveEditing(staffMember)}>
                          <IconCheck size={16} />
                        </ActionIcon>
                        <ActionIcon color="red" onClick={() => cancelEditing(staffMember)}>
                          <IconX size={16} />
                        </ActionIcon>
                      </>
                    ) : (
                      <ActionIcon color="blue" onClick={() => startEditing(staffMember)}>
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