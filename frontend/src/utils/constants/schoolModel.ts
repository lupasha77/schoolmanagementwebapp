import { useState, useEffect } from "react";
import api from "../api/axios";

// Interfaces matching Python enums
export interface GradeLevel {
    value: string;
    label: string;
  }
  
  export interface Department {
    value: string;
    label: string;
  }
  
  export interface Subject {
    value: string;
    label: string;
  }
  
  export interface Specialty {
    value: string;
    label: string;
  }
  
  // API endpoint to fetch enum values
  const fetchEnumValues = async (enumType: string) => {
    try {
      const response = await api.get(`/constants/enums/${enumType}`);
      return await response.data;
    } catch (error) {
      console.error(`Failed to fetch ${enumType} enum values:`, error);
      return [];
    }
  };
  
  // Hook to manage enum values
  export const useSchoolEnums = () => {
    const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
  
    useEffect(() => {
      const loadEnums = async () => {
        setIsLoading(true);
        try {
          const [gradeLevelsData, departmentsData, subjectsData, specialtiesData] = await Promise.all([
            fetchEnumValues('grade_levels'),
            fetchEnumValues('departments'),
            fetchEnumValues('subjects'),
            fetchEnumValues('specialties')
          ]);
  
          setGradeLevels(gradeLevelsData);
          setDepartments(departmentsData);
          setSubjects(subjectsData);
          setSpecialties(specialtiesData);
        } catch (err) {
          setError('Failed to load school configuration data');
          console.error('Error loading enums:', err);
        } finally {
          setIsLoading(false);
        }
      };
  
      loadEnums();
    }, []);
  
    return {
      gradeLevels,
      departments,
      subjects,
      specialties,
      isLoading,
      error
    };
  };