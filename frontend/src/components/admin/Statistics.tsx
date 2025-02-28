import   { useState } from 'react';
import { Card, Text, Grid, Group, Badge, Title, useMantineTheme, Button, ActionIcon, Transition, Modal, Paper, List } from '@mantine/core';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip,  } from 'recharts';
import { Users,  Briefcase, Calendar, ChevronDown, ChevronUp, PersonStanding,  } from 'lucide-react';
// import { useSchoolEnums } from '../../utils/constants/schoolModel';
import schoolApis from '../../utils/api/schoolApis';

interface GradeLevelCount {
  level: string;
  count: number;
}
interface DepartmentStats {
  teachingDepartments: {
    name: string;
    count: number;
    specialty: string;
    subjects: string[];
  }[];
  nonTeachingDepartments: {
    name: string;
    count: number;
  }[];
}

interface DepartmentModalProps {
  opened: boolean;
  onClose: () => void;
  departmentStats: DepartmentStats | null;
}
interface StatisticsProps {
  studentsByGradeLevel: GradeLevelCount[];
  teachingStaff: number;
  nonTeachingStaff: number;
  totalStaff: number;
}
// type StatisticsProps = {
//   studentsByGradeLevel: { level: string; count: number }[];
//   teachingStaff: number;
//   nonTeachingStaff: number;
//   totalStaff: number;
// };
const DepartmentModal = ({ opened, onClose, departmentStats }: DepartmentModalProps) => {
  const theme = useMantineTheme();
  // const { departments } = useSchoolEnums();

  if (!departmentStats) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Title order={2}>Department Statistics</Title>}
      size="xl"
    >
      <Grid gutter="md">
        <Grid.Col span={6}>
          <Paper p="md" radius="md" withBorder>
            <Title order={3} mb="md" c={theme.colors.blue[7]}>Teaching Departments</Title>
            {departmentStats.teachingDepartments.map(dept => (
              <Paper key={dept.name} p="sm" mb="sm" withBorder>
                <Group justify='space-between' mb="xs">
                  <Text fw={500}>{dept.name}</Text>
                  <Badge size="lg" color="blue">{dept.count} Staff</Badge>
                </Group>
                <Text size="sm" color="dimmed">Specialty: {dept.specialty}</Text>
                <Text size="sm" mb="xs">Subjects:</Text>
                <List size="sm" spacing="xs">
                  {dept.subjects.map(subject => (
                    <List.Item key={subject}>{subject}</List.Item>
                  ))}
                </List>
              </Paper>
            ))}
          </Paper>
        </Grid.Col>
        
        <Grid.Col span={6}>
          <Paper p="md" radius="md" withBorder>
            <Title order={3} mb="md" c={theme.colors.green[7]}>Non-Teaching Departments</Title>
            {departmentStats.nonTeachingDepartments.map(dept => (
              <Paper key={dept.name} p="sm" mb="sm" withBorder>
                <Group justify='space-between'>
                  <Text fw={500}>{dept.name}</Text>
                  <Badge size="lg" color="green">{dept.count} Staff</Badge>
                </Group>
              </Paper>
            ))}
          </Paper>
        </Grid.Col>
      </Grid>
    </Modal>
  );
};

const getCurrentDateInfo = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.toLocaleString('default', { month: 'long' });
  return { year, month };
};

const StatisticsCard = ({ studentsByGradeLevel, teachingStaff, nonTeachingStaff }: StatisticsProps) => {
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const theme = useMantineTheme();
  const { year, month } = getCurrentDateInfo();
  const [expandedStudents, setExpandedStudents] = useState(false);
  const handleViewDepartments = async () => {
    try {
      setLoading(true);
      const stats = await schoolApis.getDepartmentStats();
      setDepartmentStats(stats);
      setDepartmentModalOpen(true);
    } catch (error) {
      console.error('Error fetching department stats:', error);
    } finally {
      setLoading(false);
    }
  };
  // Calculate total students
  const totalStudents = studentsByGradeLevel.reduce((sum, grade) => sum + grade.count, 0);
  
  // Prepare data for donut chart
  const chartData = studentsByGradeLevel.map(grade => ({
    name: grade.level,
    value: grade.count,
  }));
  
  // Colors for the donut chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];
  
  // Card background colors
  const studentCardBg = "#f0f7ff"; // Light blue
  const teachingCardBg = "#f0fff4"; // Light green
  const nonTeachingCardBg = "#fff0f5"; // Light pink
  
  return (
    <div>
      <Group justify='space-between' mb="md">
        <Title order={2}>School Statistics Dashboard</Title>
        <Badge size="lg" color="blue" variant="filled">
          <Group gap="xs">
            <Calendar size={16} />
            <Text>{month} {year}</Text>
          </Group>
        </Badge>
      </Group>
      
      <Grid gutter="md">
        {/* Students Card */}
        <Grid.Col  span={{ base: 12, md: 6, lg: 3 }}>
          <Card 
            shadow="sm" 
            p="lg" 
            radius="md" 
            style={{ 
              backgroundColor: studentCardBg,
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Group justify='space-between' mb="xs">
              <Group>
                <Users size={24} color={theme.colors.blue[6]} />
                <Text fw={700} size="xl">Students</Text>
              </Group>
              <ActionIcon 
                variant="subtle" 
                onClick={() => setExpandedStudents(!expandedStudents)}
                aria-label={expandedStudents ? "Collapse student details" : "Expand student details"}
              >
                {expandedStudents ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </ActionIcon>
            </Group>
            
            <Badge color="indigo" size="lg" variant="filled">{totalStudents}</Badge>
            
            <div style={{ height: 200, marginBottom: 20 , marginTop: 20, display: 'flex', justifyContent: 'center'}} >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={10}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} students`, 'Enrollment']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <Transition mounted={expandedStudents} transition="slide-down" duration={300} timingFunction="ease">
              {(styles) => (
                <div style={styles}>
                  <Text fw={600} size="sm" mb="xs" color="dimmed">Enrollment by Grade Level</Text>
                  {studentsByGradeLevel.map((grade) => (
                    <Group key={grade.level} justify='space-between' mb="xs">
                      <Text size="sm">{grade.level}</Text>
                      <Badge color="blue">{grade.count}</Badge>
                    </Group>
                  ))}
                </div>
              )}
            </Transition>
            
            <Button 
              variant="light" 
              color="blue" 
              fullWidth 
              mt="auto"
              onClick={() => setExpandedStudents(!expandedStudents)}
            >
              {expandedStudents ? "Hide Details" : "View Details"}
            </Button>
          </Card>
        </Grid.Col>
        
        {/* Teaching Staff Card */}
        <Grid.Col  span={{ base: 12, md: 6, lg: 3 }}>
          <Card 
            shadow="sm" 
            p="lg" 
            radius="md" 
            style={{ 
              backgroundColor: teachingCardBg,
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Group mb="md">
              <PersonStanding  size={24} color={theme.colors.green[6]} />
              <Text fw={700} size="xl">Teaching Staff</Text>
            </Group>
            
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <div style={{ flex: 1, display: 'flex',  justifyContent: 'center', }}>
              <Badge size="xl" color="green" circle>{teachingStaff}</Badge>

              </div>
              <Badge size="xl" color="green" variant="light">Educators</Badge>
            </div>
            
            <Group justify='space-between' mt="xl">
              <Text size="sm" color="dimmed">Staff/Student Ratio</Text>
              <Badge color="teal" variant="filled">
                1:{totalStudents > 0 ? Math.round(totalStudents / teachingStaff) : 'N/A'}
              </Badge>
            </Group>
            
            <Button 
        variant="light" 
        color="green" 
        fullWidth 
        mt="lg"
        loading={loading}
        onClick={handleViewDepartments}
      >
        View Department's Summary
      </Button>
          </Card>
        </Grid.Col>
        
        {/* Non-Teaching Staff Card */}
        <Grid.Col  span={{ base: 12, md: 6, lg: 3 }}>
          <Card 
            shadow="sm" 
            p="lg" 
            radius="md" 
            style={{ 
              backgroundColor: nonTeachingCardBg,
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Group mb="md">
              <Briefcase size={24} color={theme.colors.pink[6]} />
              <Text fw={700} size="xl">Support Staff</Text>
            </Group>
            
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <Text size="4xl" fw={700} ta="center" mb="md">{nonTeachingStaff}</Text>
              <Badge size="xl" color="pink" variant="light">Administrative & Support</Badge>
            </div>
            
            <Group justify='space-between' mt="xl">
              <Text size="sm" color="dimmed">Percentage of Total Staff</Text>
              <Badge color="grape" variant="filled">
                {teachingStaff + nonTeachingStaff > 0 
                  ? `${Math.round((nonTeachingStaff / (teachingStaff + nonTeachingStaff)) * 100)}%` 
                  : 'N/A'}
              </Badge>
            </Group>
            
            <Button variant="light" color="pink" fullWidth mt="lg">
              View Staff Details
            </Button>
          </Card>
        </Grid.Col>
      </Grid>
      <DepartmentModal
        opened={departmentModalOpen}
        onClose={() => setDepartmentModalOpen(false)}
        departmentStats={departmentStats}
      />
    </div>
  );
};

export default StatisticsCard;