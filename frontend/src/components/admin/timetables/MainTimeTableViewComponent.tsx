import { useState } from 'react';
import { 
  Tabs, 
  Container, 
  Title, 
  Space, 
  Text,
  Divider,
  Paper
} from '@mantine/core';
import { IconSunElectricity, IconTable, IconUserCircle } from '@tabler/icons-react';
import ConsolidatedTimetableView from './ConsolidatedTimetableView';
import TeacherTimetableView from './TeacherTimetableView';
import TimetableManager from './TimeTableStreamGenerator';
import SubjectAssignment from '../subjects/SubjectAssignment';
import TeacherWorkloadDashboard from './TeacherWorkloadStats';
import PeriodManagement from '../period-time-management/PeriodTimeManagement';
import TimetableConfigManagement from '../configurations/TimetableConfigManagement';

export default function TimetableViewsContainer() {
  const [activeTab, setActiveTab] = useState<string | null>('consolidated');

  return (
    <Container size="xl" p="md">
      <Paper p="md" shadow="xs" radius="md">
        <Title order={2} mb="xs">School Timetable Management</Title>
        <Text size="sm" color="dimmed" mb="lg">
          View and manage class schedules across all grade levels and for individual teachers
        </Text>
        <Divider mb="md" />

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="config-settings" leftSection={<IconTable size={16} />}>
            Timetable Config Management
            </Tabs.Tab>
            <Tabs.Tab value="period" leftSection={<IconTable size={16} />}>
              Period Time Management
            </Tabs.Tab>
            <Tabs.Tab value="generator" leftSection={<IconTable size={16} />}>
              TimeTable Generator
            </Tabs.Tab>
            <Tabs.Tab value="consolidated" leftSection={<IconTable size={16} />}>
              Consolidated View
            </Tabs.Tab>
            <Tabs.Tab value="teacher" leftSection={<IconUserCircle size={16} />}>
              Teacher View
            </Tabs.Tab>
            <Tabs.Tab value="workload" leftSection={<IconUserCircle size={16} />}>
              Teacher WorkLoad Stats
            </Tabs.Tab>
            <Tabs.Tab value="subject" leftSection={<IconSunElectricity size={16} />}>
              Subject Assignment
            </Tabs.Tab>
          </Tabs.List>
          
          <Space h="md" />
          
          <Tabs.Panel value="config-settings">
            <TimetableConfigManagement />
          </Tabs.Panel>
          <Tabs.Panel value="period">
            <PeriodManagement />
          </Tabs.Panel>
          <Tabs.Panel value="generator">
            <TimetableManager />
          </Tabs.Panel>
          <Tabs.Panel value="consolidated">
            <ConsolidatedTimetableView />
          </Tabs.Panel>
          
          <Tabs.Panel value="teacher">
            <TeacherTimetableView />
          </Tabs.Panel>
          <Tabs.Panel value="workload">
            <TeacherWorkloadDashboard />
          </Tabs.Panel>
          <Tabs.Panel value="subject">
            <SubjectAssignment />
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  );
}