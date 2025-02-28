import  { useState, useEffect } from 'react';
import { 
  Table, 
  Select, 
  Text, 
  Badge, 
  Group,
  ActionIcon,
  Modal,
  Grid,
  Card,
  Stack,
  Button,
} from '@mantine/core';
import {  IconFileInfo, IconClock, IconUsers, IconHome2 } from '@tabler/icons-react';

interface TimetableSlot {
  subject: string;
  slot: {
    start: string;
    end: string;
    type: string;
  };
  type: 'regular' | 'practical' | 'break';
  staff: string;
  room: string;
}

interface TimetableDay {
  [key: string]: TimetableSlot[];
}

interface TimetableProps {
  classId: string;
  grade: string;
}

const TimeTable = ({ classId }: TimetableProps) => {
  const [timetable, setTimetable] = useState<TimetableDay>({});
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);
  const [view, setView] = useState<'daily' | 'weekly'>('daily');

  const timeSlots = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(2024, 0, 1, 7 + Math.floor(i * 1.5));
    const end = new Date(2024, 0, 1, 7 + Math.floor((i + 1) * 1.5));
    return {
      start: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      end: end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  });

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const response = await fetch(`/api/classes/${classId}/timetable`);
        const data = await response.json();
        setTimetable(data);
      } catch (error) {
        console.error('Error fetching timetable:', error);
      }
    };

    fetchTimetable();
  }, [classId]);

  const getSlotColor = (slot: TimetableSlot) => {
    if (slot.type === 'break') return 'gray.1';
    if (slot.type === 'practical') return 'blue.1';
    return 'white';
  };

  const getSubjectBadgeColor = (subject: string) => {
    const colors = {
      'WOODWORK': 'brown',
      'COMPUTER_SCIENCE': 'blue',
      'Math': 'red',
      'English': 'green',
      'Science': 'purple'
    };
    return colors[subject as keyof typeof colors] || 'gray';
  };

  const handleSlotClick = (slot: TimetableSlot) => {
    setSelectedSlot(slot);
    setIsDetailsOpen(true);
  };

  const WeeklyView = () => (
    <div className="overflow-x-auto">
      <Table highlightOnHover>
        <thead>
          <tr>
            <th>Time</th>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
              <th key={day}>{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((timeSlot, index) => (
            <tr key={index}>
              <td className="whitespace-nowrap">
                {timeSlot.start} - {timeSlot.end}
              </td>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                const slot = timetable[day]?.find(
                  s => s.slot.start === timeSlot.start
                );
                return (
                  <td 
                    key={day}
                    style={{ backgroundColor: slot ? getSlotColor(slot) : 'white' }}
                    className="p-2"
                  >
                    {slot && (
                      <div className="flex flex-col gap-1">
                        <Badge 
                          color={getSubjectBadgeColor(slot.subject)}
                          variant="light"
                          className="w-full"
                        >
                          {slot.subject}
                        </Badge>
                        <Text size="xs" c="gray">{slot.staff}</Text>
                        <Text size="xs" c="gray">{slot.room}</Text>
                        <ActionIcon 
                          onClick={() => handleSlotClick(slot)}
                          variant="subtle"
                          size="xs"
                          className="self-end"
                        >
                          <IconFileInfo size={12} />
                        </ActionIcon>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );

  const DailyView = () => (
    <Stack gap="md">
      {timeSlots.map((timeSlot, index) => {
        const slot = timetable[selectedDay]?.find(
          s => s.slot.start === timeSlot.start
        );
        
        return (
          <Card 
            key={index}
            shadow="sm"
            p="md"
            style={{ backgroundColor: slot ? getSlotColor(slot) : 'white' }}
          >
            <Group justify='space-between'>
              <Group>
                <IconClock size={16} />
                <Text size="sm">{timeSlot.start} - {timeSlot.end}</Text>
              </Group>
              {slot && (
                <Badge 
                  color={getSubjectBadgeColor(slot.subject)}
                  variant="light"
                >
                  {slot.subject}
                </Badge>
              )}
            </Group>
            
            {slot && (
              <Grid mt="xs">
                <Grid.Col span={6}>
                  <Group gap="xs">
                    <IconUsers size={16} />
                    <Text size="sm">{slot.staff}</Text>
                  </Group>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Group gap="xs">
                    <IconHome2 size={16} />
                    <Text size="sm">{slot.room}</Text>
                  </Group>
                </Grid.Col>
              </Grid>
            )}
          </Card>
        );
      })}
    </Stack>
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <Group justify='space-between' mb="md">
        <Text size="xl" fw={700}>
          Class Timetable
        </Text>
        <Group>
          <Button.Group>
            <Button
              variant={view === 'daily' ? 'filled' : 'light'}
              onClick={() => setView('daily')}
            >
              Daily
            </Button>
            <Button
              variant={view === 'weekly' ? 'filled' : 'light'}
              onClick={() => setView('weekly')}
            >
              Weekly
            </Button>
          </Button.Group>
          {view === 'daily' && (
            <Select
              value={selectedDay}
              onChange={(value) => setSelectedDay(value || 'Monday')}
              data={[
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday'
              ]}
              className="w-48"
            />
          )}
        </Group>
      </Group>

      {view === 'daily' ? <DailyView /> : <WeeklyView />}

      <Modal
        opened={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Lesson Details"
        size="lg"
      >
        {selectedSlot && (
          <Stack gap="md">
            <Card>
              <Group justify='space-between'>
                <Text fw={500}>Subject</Text>
                <Badge color={getSubjectBadgeColor(selectedSlot.subject)}>
                  {selectedSlot.subject}
                </Badge>
              </Group>
            </Card>
            
            <Grid>
              <Grid.Col span={6}>
                <Card>
                  <Stack gap="xs">
                    <Text fw={500}>Time</Text>
                    <Group gap="xs">
                      <IconClock size={16} />
                      <Text>{selectedSlot.slot.start} - {selectedSlot.slot.end}</Text>
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>
              
              <Grid.Col span={6}>
                <Card>
                  <Stack gap="xs">
                    <Text fw={500}>Type</Text>
                    <Badge 
                      color={selectedSlot.type === 'practical' ? 'blue' : 'gray'}
                    >
                      {selectedSlot.type}
                    </Badge>
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>
            
            <Grid>
              <Grid.Col span={6}>
                <Card>
                  <Stack gap="xs">
                    <Text fw={500}>Teacher</Text>
                    <Group gap="xs">
                      <IconUsers size={16} />
                      <Text>{selectedSlot.staff}</Text>
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>
              
              <Grid.Col span={6}>
                <Card>
                  <Stack gap="xs">
                    <Text fw={500}>Room</Text>
                    <Group gap="xs">
                      <IconHome2 size={16} />
                      <Text>{selectedSlot.room}</Text>
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>
          </Stack>
        )}
      </Modal>
    </div>
  );
};

export default TimeTable;