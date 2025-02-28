import { useEffect, useState } from 'react';
import { Container, Grid, Title } from '@mantine/core';
import StatisticsCard from '../../components/admin/Statistics';
import MainRequirements from '../../components/admin/creation/MainRequirements';
import schoolApis from '../../utils/api/schoolApis'; 
const AdminDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [studentStats, setStudentStats] = useState<{ level: string; count: number }[]>([]);
  const [staffStats, setStaffStats] = useState({
    teachingStaff: 0,
    nonTeachingStaff: 0,
    total: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch students data
        const studentsResponse = await schoolApis.getStudents();
        const students = studentsResponse.students || studentsResponse;

        // Process students by grade level
        const gradeLevelCounts: { [key: string]: number } = {};
        students.forEach(student => {
          if (student.gradeLevel && typeof student.gradeLevel === 'string') {
            const level = student.gradeLevel;
            gradeLevelCounts[level] = (gradeLevelCounts[level] || 0) + 1;
          }
        });

        // Convert to array format
        const formattedGradeLevelData = Object.entries(gradeLevelCounts)
          .map(([level, count]) => ({ level, count }))
          .sort((a, b) => a.level.localeCompare(b.level));

        setStudentStats(formattedGradeLevelData);

        // Fetch staff statistics
        const staffStatsResponse = await schoolApis.getStaffStats();
        setStaffStats(staffStatsResponse);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching statistics:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading statistics...</div>;
  }

  return (
    <Container fluid>
      <Grid>
        <Grid.Col span={12}>
          <Title order={1}>Welcome, </Title>
          <StatisticsCard
            studentsByGradeLevel={studentStats}
            teachingStaff={staffStats.teachingStaff}
            nonTeachingStaff={staffStats.nonTeachingStaff}
            totalStaff={staffStats.total}
          />
        </Grid.Col>
      </Grid>
      <MainRequirements />
       
    </Container>
  );
};

export default AdminDashboardPage;