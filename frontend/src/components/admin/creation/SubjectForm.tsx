import { useState, useEffect } from 'react';
import { TextInput, Switch, NumberInput, Select, Button, Stack, Alert } from '@mantine/core';
import schoolApis from '../../../utils/api/schoolApis';
import { GradeLevel, Specialty } from '../../../types/school_types';

// Fetch Subjects from API instead of using static list
const fetchSubjectNames = async () => {
  try {
    const response = await schoolApis.getSubjectNames();
    // console.log("Available Subject Names:", response.subjects);
    return response.subjects.map(subject => subject.name);
  } catch (error) {
    console.error("Error fetching subject names:", error);
    return [];
  }
};

const fetchDepartmentName = async () => {
  try {
    const response = await schoolApis.getDepartmentName();
    // console.log("Available Department Names:", response.department);
    return response.departments || []; // Return an empty array if no department names;
  } catch (error) {
    console.error("Error fetching department names:", error);
    return [];
  }
};

export function SubjectForm() {
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [department, setDepartment] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    gradeLevel: 'Form 1' as GradeLevel,
    specialty: '' as Specialty | '',
    requiresPracticals: false,
    practical_duration: 0,
    department: '',
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchSubjectNames().then(setSubjects);
    fetchDepartmentName().then(setDepartment);
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMessage(''); // Reset error message
    setSuccessMessage(''); // Reset success message
    
    try {
      const payload = {
        ...formData,
        specialty: ["Form 5", "Form 6"].includes(formData.gradeLevel)
          ? (formData.specialty as Specialty)
          : undefined,
          isCore: false, // or true, depending on your requirements
          isPractical: formData.requiresPracticals,
      };
  
      // Log payload before sending to the API
    //   console.log('Payload:', payload);
  
      await schoolApis.createSubject(payload);
      
      // Show success message if subject is created successfully
      setSuccessMessage('Subject created successfully!');
      // Reset form after successful creation
      setFormData({
        name: '',
        code: '',
        gradeLevel: GradeLevel.Form1,
        specialty: '' as Specialty | '',
        requiresPracticals: false,
        practical_duration: 0,
        department: '',
      });
    } catch (error) {
      console.error('Failed to create subject:', error);
      setErrorMessage('Failed to create subject. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Stack>
      {errorMessage && (
        <Alert color="red" onClose={() => setErrorMessage('')} title="Error">
          {errorMessage}
        </Alert>
      )}
      {successMessage && (
        <Alert color="green" onClose={() => setSuccessMessage('')} title="Success">
          {successMessage}
        </Alert>
      )}

      <Select
        label="Subject Name"
        value={formData.name}
        onChange={(value) => setFormData({ ...formData, name: value || '' })}
        data={subjects}
      />
      <TextInput
        label="Subject Code"
        value={formData.code}
        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
      />
      <Select
        label="Department"
        value={formData.department}
        onChange={(value) => setFormData({ ...formData, department: value || '' })}
        data={department}
      />
      <Select
        label="Grade Level"
        value={formData.gradeLevel}
        onChange={(value) => setFormData({ ...formData, gradeLevel: value as GradeLevel })}
        data={["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"]}
      />
      {["Form 5", "Form 6"].includes(formData.gradeLevel) && (
        <Select
          label="Specialty"
          value={formData.specialty}
          onChange={(value) => setFormData({ ...formData, specialty: value as Specialty || '' })}
          data={["Arts", "Sciences", "Commercial", "Humanities"]}
          clearable
        />
      )}
      <Switch
        label="Requires Practicals"
        checked={formData.requiresPracticals}
        onChange={(e) => setFormData({ ...formData, requiresPracticals: e.currentTarget.checked })}
      />
      {formData.requiresPracticals && (
        <NumberInput
          label="Practical Duration (minutes)"
          value={formData.practical_duration}
          onChange={(value) => setFormData({ ...formData, practical_duration: Number(value) || 0 })}
          min={0}
        />
      )}
      <Button onClick={handleSubmit} loading={loading}>
        Create Subject
      </Button>
    </Stack>
  );
}
