import { useState, useEffect, useMemo } from 'react';
import { TextInput, Switch, NumberInput, Select, Button, Stack, Alert } from '@mantine/core';
import schoolApis from '../../../utils/api/schoolApis';
import { GradeLevel, Specialty } from '../../../types/school_types';

// Type for Select item format
interface SelectItem {
  value: string;
  label: string;
}

// Fetch Subjects from API
const fetchSubjectNames = async () => {
  try {
    const response = await schoolApis.getSubjectNames(); 
    // Ensure we have the correct data structure
    if (response.subjects && Array.isArray(response.subjects)) {
      const formattedSubjects = response.subjects.map(subject => {
        // Make sure we handle both string and object formats
        const name = typeof subject === 'string' ? subject : subject.name;
        return {
          value: name,
          label: name
        };
      }); 
      return formattedSubjects;
    }
    return [];
  } catch (error) {
    console.error("Error fetching subject names:", error);
    return [];
  }
};

// Fetch Departments from API
const fetchDepartmentNames = async () => {
  try {
    const response = await schoolApis.getDepartmentName(); 
      
    if (response && response.department && Array.isArray(response.department)) {
      // Convert strings to objects with value and label properties
      const formattedDepartments = response.department.map(dept => {
        if (typeof dept !== 'string') {
          console.error("Unexpected department format:", dept);
          return { value: String(dept), label: String(dept) };
        }
        
        return {
          value: dept,
          label: dept.charAt(0).toUpperCase() + dept.slice(1)
        };
      });
       
      return formattedDepartments;
    }
    
    console.error("Unexpected API response format:", response);
    return []; // Return empty array as fallback
  } catch (error) {
    console.error("Error fetching department names:", error);
    return [];
  }
};

export function SubjectForm() {
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<SelectItem[]>([]);
  const [departments, setDepartments] = useState<SelectItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
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

  // Define static data with explicit value/label structure
  const gradeLevelOptions: SelectItem[] = [
    { value: 'Form 1', label: 'Form 1' },
    { value: 'Form 2', label: 'Form 2' },
    { value: 'Form 3', label: 'Form 3' },
    { value: 'Form 4', label: 'Form 4' },
    { value: 'Form 5', label: 'Form 5' },
    { value: 'Form 6', label: 'Form 6' }
  ];
  
  const specialtyOptions: SelectItem[] = [
    { value: 'Arts', label: 'Arts' },
    { value: 'Sciences', label: 'Sciences' },
    { value: 'Commercial', label: 'Commercial' },
    { value: 'Humanities', label: 'Humanities' }
  ];

  // Manually define fallback data
  const fallbackDepartments = useMemo(() => [
    { value: 'arts', label: 'Arts' },
    { value: 'sciences', label: 'Sciences' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'humanities', label: 'Humanities' },
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'linguistics', label: 'Linguistics' },
    { value: 'geography', label: 'Geography' },
    { value: 'social sciences', label: 'Social Sciences' },
    { value: 'practicals', label: 'Practicals' },
    { value: 'ICT', label: 'ICT' }
  ], []);

  const fallbackSubjects=useMemo(() => [
    { value: 'Mathematics', label: 'Mathematics' },
    { value: 'English', label: 'English' },
    { value: 'Physics', label: 'Physics' },
    { value: 'Chemistry', label: 'Chemistry' },
    { value: 'Biology', label: 'Biology' }
  ],[]);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      setDataLoading(true);
      
      // Set fallback data immediately to ensure something is available
      setSubjects(fallbackSubjects);
      setDepartments(fallbackDepartments);
      
      try {
        // Try to load subjects
        const subjectsData = await fetchSubjectNames();
        if (isMounted && subjectsData && subjectsData.length > 0) {
          setSubjects(subjectsData);
        }
        
        // Try to load departments
        const departmentsData = await fetchDepartmentNames();
        if (isMounted && departmentsData && departmentsData.length > 0) {
          setDepartments(departmentsData);
        }
      } catch (error) {
        console.error("Error loading form data:", error);
        if (isMounted) {
          setErrorMessage("Failed to load some data. Using fallback options.");
        }
      } finally {
        if (isMounted) {
          setDataLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [fallbackDepartments, fallbackSubjects]);

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMessage(''); 
    setSuccessMessage(''); 
    
    try {
      const payload = {
        ...formData,
        specialty: ["Form 5", "Form 6"].includes(formData.gradeLevel)
          ? (formData.specialty as Specialty)
          : undefined,
        isCore: false,
        isPractical: formData.requiresPracticals,
      };
   
      await schoolApis.createSubject(payload);
      
      setSuccessMessage('Subject created successfully!');
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
    <Stack gap="md">
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

      {dataLoading ? (
        <Alert color="blue" title="Loading">
          Loading form data...
        </Alert>
      ) : (
        <>
          <Select
            label="Subject Name"
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: value || '' })}
            data={subjects}
            placeholder="Select a subject"
            searchable
            // nothingFound="No subjects found"
          />
          <TextInput
            label="Subject Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="Enter subject code"
          />
          <Select
            label="Department"
            value={formData.department}
            onChange={(value) => setFormData({ ...formData, department: value || '' })}
            data={departments}
            placeholder="Select a department"
            searchable
            // nothingFound="No departments found"
          />
          <Select
            label="Grade Level"
            value={formData.gradeLevel}
            onChange={(value) => setFormData({ ...formData, gradeLevel: value as GradeLevel })}
            data={gradeLevelOptions}
            placeholder="Select grade level"
          />
          {["Form 5", "Form 6"].includes(formData.gradeLevel) && (
            <Select
              label="Specialty"
              value={formData.specialty}
              onChange={(value) => setFormData({ ...formData, specialty: value as Specialty || '' })}
              data={specialtyOptions}
              placeholder="Select specialty"
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
        </>
      )}
    </Stack>
  );
}