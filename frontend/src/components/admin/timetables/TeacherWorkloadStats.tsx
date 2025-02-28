import { useState, useEffect } from 'react';
import {
  Card,
  Text,
  Group,
  Stack,
  Title,
  Badge,
  Grid,
  Table,
  Progress,
  Container,
  Loader,
  Alert,
  Button
} from '@mantine/core';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import api from '../../../utils/api/axios';

interface Teacher {
  teacherId: string;
  teacherName: string;
  subjects: string[];
  targetWorkload: number;
  actualWorkload: number;
  utilizationPercentage: number;
  status: 'optimal' | 'overloaded' | 'underloaded';
}

interface WorkloadResponse {
  success: boolean;
  data?: Teacher[];
  message?: string;
}

const TeacherWorkloadDashboard = () => {
  const [workloadData, setWorkloadData] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const fetchWorkloadData = async () => {
    try {
      setLoading(true);
      // Using the staffs endpoint to get teacher workload data
      const response = await api.get('/timetable/teacher/workload');
      console.log('Response:', response.data);
      const result: WorkloadResponse = response.data;
      
      if (result.success && result.data) {
        console.log('Fetched workload data:', result.data);
        setWorkloadData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch workload data');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchWorkloadData();
  }, []);
  
  const getSummaryStats = (data: Teacher[]) => {
    if (!data.length) return { total: 0, optimal: 0, overloaded: 0, underloaded: 0 };
    
    return data.reduce((stats, teacher) => {
      stats.total++;
      stats[teacher.status]++;
      return stats;
    }, { total: 0, optimal: 0, overloaded: 0, underloaded: 0 });
  };
  
  const stats = getSummaryStats(workloadData);
  
  // Get color based on utilization
  const getUtilizationColor = (utilization: number): string => {
    if (utilization < 80) return 'blue';
    if (utilization > 110) return 'red';
    return 'green';
  };
  
  // Get color and variant based on status
  const getStatusBadgeProps = (status: 'optimal' | 'overloaded' | 'underloaded') => {
    switch (status) {
      case 'overloaded': return { color: 'red', variant: 'light' as const };
      case 'underloaded': return { color: 'blue', variant: 'light' as const };
      case 'optimal': return { color: 'green', variant: 'light' as const };
      default: return { color: 'gray', variant: 'light' as const };
    }
  };
  
  if (loading) return (
    <Container p="md">
      <Group justify='center' py="xl">
        <Loader />
        <Text>Loading workload data...</Text>
      </Group>
    </Container>
  );
  
  if (error) return (
    <Container p="md">
      <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
        {error}
      </Alert>
      <Group justify="center" mt="md">
        <Button leftSection={<IconRefresh size={16} />} onClick={fetchWorkloadData}>
          Retry
        </Button>
      </Group>
    </Container>
  );
  
  return (
    <Container size="xl" p="md">
      <Stack gap="lg">
        {/* Summary Stats */}
        <Grid>
          <Grid.Col span={3}>
            <Card shadow="sm" p="md" radius="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" color="dimmed">Total Teachers</Text>
                <Title order={2}>{stats.total}</Title>
              </Stack>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={3}>
            <Card shadow="sm" p="md" radius="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" color="dimmed">Optimally Loaded</Text>
                <Group gap="xs">
                  <Title order={2} c="green">{stats.optimal}</Title>
                  <Text size="sm" color="dimmed">
                    ({stats.total ? Math.round(stats.optimal / stats.total * 100) : 0}%)
                  </Text>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={3}>
            <Card shadow="sm" p="md" radius="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" color="dimmed">Overloaded</Text>
                <Group gap="xs">
                  <Title order={2} c="red">{stats.overloaded}</Title>
                  <Text size="sm" color="dimmed">
                    ({stats.total ? Math.round(stats.overloaded / stats.total * 100) : 0}%)
                  </Text>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={3}>
            <Card shadow="sm" p="md" radius="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" color="dimmed">Underloaded</Text>
                <Group gap="xs">
                  <Title order={2} c="blue">{stats.underloaded}</Title>
                  <Text size="sm" color="dimmed">
                    ({stats.total ? Math.round(stats.underloaded / stats.total * 100) : 0}%)
                  </Text>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
        
        {/* Teacher Workload Table */}
        <Card shadow="sm" p="md" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={3}>Teacher Workload Analysis</Title>
              <Button 
                variant="light" 
                leftSection={<IconRefresh size={16} />} 
                onClick={fetchWorkloadData}
              >
                Refresh
              </Button>
            </Group>
            
            <Table striped highlightOnHover>
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Subjects</th>
                  <th style={{ textAlign: 'right' }}>Target</th>
                  <th style={{ textAlign: 'right' }}>Actual</th>
                  <th style={{ textAlign: 'right' }}>Utilization</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {workloadData.length > 0 ? (
                  workloadData.map((teacher) => {
                    const statusProps = getStatusBadgeProps(teacher.status);
                    return (
                      <tr key={teacher.teacherId}>
                        <td>
                          <Text fw={500}>{teacher.teacherName}</Text>
                        </td>
                        <td>
                          <Text size="sm">{teacher.subjects.join(', ')}</Text>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Text>{teacher.targetWorkload}</Text>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Text>{teacher.actualWorkload}</Text>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Group gap="xs" justify='flex-end'>
                            <Progress 
                              value={Math.min(teacher.utilizationPercentage, 150)} 
                              color={getUtilizationColor(teacher.utilizationPercentage)}
                              size="sm"
                              style={{ width: 80 }} 
                            />
                            <Text color={getUtilizationColor(teacher.utilizationPercentage)}>
                              {teacher.utilizationPercentage}%
                            </Text>
                          </Group>
                        </td>
                        <td>
                          <Badge 
                            color={statusProps.color} 
                            variant={statusProps.variant}
                          >
                            {teacher.status.charAt(0).toUpperCase() + teacher.status.slice(1)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <Text ta="center" py="md">No teacher workload data available</Text>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
};

export default TeacherWorkloadDashboard;