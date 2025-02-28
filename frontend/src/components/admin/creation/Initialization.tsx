import { useState } from 'react';
import { Button, Group, Text, Alert, Stack, Table, Title, Card, Badge } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconRefresh } from '@tabler/icons-react';
import api from '../../../utils/api/axios';
import axios from 'axios';

interface StreamConfig {
  _id: string;
  gradeLevel: string;
  max_students_per_stream: number;
  max_students_per_class: number;
  max_core_subjects: number;
  max_practical_subjects: number;
  current_enrolled_students: number;
  expected_students_enrolment: number;
  streams: string[];
}

const StreamConfigInitializer = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configs, setConfigs] = useState<StreamConfig[]>([]);

  const handleInitialize = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
        const response = await api.post('/stream-config/initialize-stream-configs/initialize');
        console.log("API Response:", response.data);

        // Check if configs are returned, otherwise fetch separately
        if (response.data.configs?.length) {
            setConfigs(response.data.configs);
        } else {
            console.warn("Configs not included in response, fetching separately...");
            const fetchResponse = await api.get('/stream-config/list'); // Adjust API if necessary
            setConfigs(fetchResponse.data.configs || []);
        }

        setSuccess(true);
    } catch (err) {
        console.error("API Error:", err);
        if (axios.isAxiosError(err)) {
            setError(err.response?.data?.error || "Failed to initialize stream configurations");
        } else {
            setError("Failed to initialize stream configurations");
        }
    } finally {
        setLoading(false);
    }
};

  const juniorForms = ['Form 1', 'Form 2', 'Form 3', 'Form 4']
  const isJuniorForm = (gradeLevel: string): boolean =>
    juniorForms.includes(gradeLevel);

  return (
    <Card p="lg" radius="md" withBorder shadow="sm">
      <Stack gap="md">
        <Group justify='space-between'>
          <Title order={2}>Stream Configuration Initializer</Title>
          <Badge color="blue" variant="filled">System Setup</Badge>
        </Group>
        
        <Text color="dimmed">
          This tool initializes default stream configurations for all grade levels based on 
          the school timetable settings. Existing configurations will remain unchanged.
        </Text>
        
        <Group justify='flex-start'>
          <Button 
            loading={loading} 
            onClick={handleInitialize}
            color="blue"
            leftSection={<IconRefresh size={16} />}
            size="md"
          >
            Initialize Stream Configurations
          </Button>
        </Group>
        
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Initialization Failed" color="red">
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert icon={<IconCheck size={16} />} title="Initialization Complete" color="green">
            Successfully initialized stream configurations for all grade levels.
          </Alert>
        )}
        
        {configs.length > 0 && (
          <div>
            <Text fw={600} mb="xs">Initialized Grade Level Configurations:</Text>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Grade Level</Table.Th>
                  <Table.Th>Max Students/Stream</Table.Th>
                  <Table.Th>Expected Enrolment/Stream</Table.Th>
                  <Table.Th>Current Enrolled Students</Table.Th>
                  <Table.Th>Max Students/Class</Table.Th>
                  <Table.Th>Core Subjects</Table.Th>
                  <Table.Th>Practical Subjects</Table.Th>
                  <Table.Th>Streams</Table.Th>
                  <Table.Th>Type</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {configs.map((config) => (
                  <Table.Tr key={config._id}>
                    <Table.Td>{config.gradeLevel}</Table.Td>
                    <Table.Td>{config.max_students_per_stream}</Table.Td>
                    <Table.Td>{config.expected_students_enrolment}</Table.Td>
                    <Table.Td>{config.current_enrolled_students}</Table.Td>
                    <Table.Td>{config.max_students_per_class}</Table.Td>
                    <Table.Td>{config.max_core_subjects}</Table.Td>
                    <Table.Td>{config.max_practical_subjects}</Table.Td>
                    <Table.Td>{config.streams ? config.streams.join(', ') : 'N/A'}</Table.Td>
                    <Table.Td>
                      <Badge color={isJuniorForm(config.gradeLevel) ? "blue" : "green"}>
                        {isJuniorForm(config.gradeLevel) ? "Junior" : "Senior"}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        )}
      </Stack>
    </Card>
  );
};

export default StreamConfigInitializer;
