// src/api/timetableConfigAPI.js
import axios from 'axios';

const API_BASE_URL = '/api/timetable';

export const fetchTimetableConfig = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/config`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching timetable config:', error);
    throw error;
  }
};

type TimetableConfig = object;

export const updateTimetableConfig = async (configData: TimetableConfig): Promise<TimetableConfig> => {
    try {
        const response = await axios.put<{ data: TimetableConfig }>(`${API_BASE_URL}/config`, configData);
        return response.data.data;
    } catch (error) {
        console.error('Error updating timetable config:', error);
        throw error;
    }
};

type SectionData = object;

export const updateConfigSection = async (sectionName: string, sectionData: SectionData): Promise<SectionData> => {
    try {
        const response = await axios.put<{ data: SectionData }>(`${API_BASE_URL}/config/section/${sectionName}`, sectionData);
        return response.data.data;
    } catch (error) {
        console.error(`Error updating config section ${sectionName}:`, error);
        throw error;
    }
};

interface NewConstant {
    name: string;
    value: string | number | boolean; // Adjust the type based on your requirements
}

interface NewConstantResponse {
    data: NewConstant;
}

export const addNewConstant = async (name: string, value: string | number | boolean): Promise<NewConstant> => {
  try {
    const response = await axios.post<NewConstantResponse>(`${API_BASE_URL}/config/constant`, { name, value });
    return response.data.data;
  } catch (error) {
    console.error('Error adding new constant:', error);
    throw error;
  }
};

export const fetchDefaultConfig = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/config/defaults`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching default config:', error);
    throw error;
  }
};