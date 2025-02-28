import   { useState, useCallback, useEffect } from 'react';
import { 
   Text, Badge, Group, Modal, 
  Stack, Button, Tabs, Grid, Menu, Card, LoadingOverlay,
  ActionIcon,
  Table,
  Select
} from '@mantine/core';
import { 
  IconCalendar,IconUsers, IconHome2, IconDownload, IconPrinter,
  IconCalendar as CalendarIcon, IconFileText,
  IconClock,
  IconFileInfo,  
} from '@tabler/icons-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { DropResult,  } from 'react-beautiful-dnd';
// import { Page, usePDF, View } from '@react-pdf/renderer';
import ical, { ICalEventRepeatingFreq, ICalWeekday } from 'ical-generator';
import api from '../../utils/api/axios';

interface TimetableSlot {
  id: string;
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

interface RoomUtilization {
  room: string;
  usage: number;
  schedule: TimetableSlot[];
}

interface StaffSchedule {
  staff: string;
  totalHours: number;
  schedule: TimetableSlot[];
}
 

interface TimetableProps {
  classId: string;
  grade: string;
}

const TimeTableComplete =  ({ classId }: TimetableProps) => {
  const [timetable, setTimetable] = useState<Record<string, TimetableSlot[]>>({});
  const [view, setView] = useState<'timetable' | 'staffs' | 'rooms'>('timetable');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [loading, setLoading] = useState(false);
  const [roomStats, ] = useState<RoomUtilization[]>([]);
  const [staffStats, ] = useState<StaffSchedule[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [view1, setView1] = useState<'daily' | 'weekly'>('daily');
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
          const response = await api.post(`/classes/${classId}/timetable`);
          const data = await response.data;
          setTimetable(data);
        } catch (error) {
          console.error('Error fetching timetable:', error);
        }
      };
  
      fetchTimetable();
    }, [classId]);
   
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
  const generateICalFile = useCallback(() => {
    const calendar = ical();
     
    
    // Use the correct type from ical-generator
    const weekdayMap: { [key: string]: ICalWeekday } = {
      MO: ICalWeekday.MO,
      TU: ICalWeekday.TU,
      WE: ICalWeekday.WE,
      TH: ICalWeekday.TH,
      FR: ICalWeekday.FR,
      SA: ICalWeekday.SA,
      SU: ICalWeekday.SU,
    };
    Object.entries(timetable).forEach(([day, slots]) => {
      slots.forEach(slot => {
         calendar.createEvent({ 
          start: new Date(`2024-01-01T${slot.slot.start}`),
          end: new Date(`2024-01-01T${slot.slot.end}`),
          summary: slot.subject,
          description: `Staff: ${slot.staff}\nRoom: ${slot.room}`,
          location: slot.room,
          repeating: {
            freq: ICalEventRepeatingFreq.WEEKLY,
            byDay: [weekdayMap[day.substring(0, 2).toUpperCase()]],
            until: new Date('2024-12-31')
          }
          
        });
      });
      
    });
    console.log(calendar.toString());
    
    const blob = new Blob([calendar.toString()], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'timetable.ics';
    link.click();
  }, [timetable]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const sourceDay = source.droppableId;
    const destDay = destination.droppableId;
    
    try {
      setLoading(true);
      const response = await api.post(`/classes/${classId}/reschedule`, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: result.draggableId,
          sourceDay,
          sourceIndex: source.index,
          destinationDay: destDay,
          destinationIndex: destination.index
        })
      });
      
      if (response.status === 200) {
        const updatedTimetable = { ...timetable };
        const [removed] = updatedTimetable[sourceDay].splice(source.index, 1);
        updatedTimetable[destDay].splice(destination.index, 0, removed);
        setTimetable(updatedTimetable);
      }
    } catch (error) {
      console.error('Error rescheduling:', error);
    } finally {
      setLoading(false);
    }
  }, [timetable, classId]);

  const RoomUtilizationView = () => (
    <Grid>
      {roomStats.map(room => (
        <Grid.Col key={room.room} span={4}>
          <Card shadow="sm">
            <Stack>
              <Group justify="space-between">
                <Text fw={500}>{room.room}</Text>
                <Badge>{Math.round(room.usage * 100)}% Utilized</Badge>
              </Group>
              <div className="h-32">
                {/* Add room schedule visualization */}
                {room.schedule.map(slot => (
                  <div key={slot.id} className="text-sm p-1">
                    {slot.subject} - {slot.slot.start}
                  </div>
                ))}
              </div>
            </Stack>
          </Card>
        </Grid.Col>
      ))}
    </Grid>
  );

  const StaffScheduleView = () => (
    <Grid>
      {staffStats.map(staff => (
        <Grid.Col key={staff.staff} span={6}>
          <Card shadow="sm">
            <Stack>
              <Group justify="space-between">
                <Text fw={500}>{staff.staff}</Text>
                <Badge>{staff.totalHours} Hours/Week</Badge>
              </Group>
              <div className="h-48 overflow-y-auto">
                {staff.schedule.map(slot => (
                  <div key={slot.id} className="text-sm p-1 border-b">
                    <Group justify="space-between">
                      <Text>{slot.subject}</Text>
                      <Text size="xs" color="gray">
                        {slot.slot.start} - {slot.slot.end}
                      </Text>
                    </Group>
                  </div>
                ))}
              </div>
            </Stack>
          </Card>
        </Grid.Col>
      ))}
    </Grid>
  );
  const getSlotColor = (slot: TimetableSlot) => {
    if (slot.type === 'break') return 'gray.1';
    if (slot.type === 'practical') return 'blue.1';
    return 'white';
  };
  const DraggableTimeSlot = ({ slot, index }: { slot: TimetableSlot; index: number }) => (
    <Draggable draggableId={slot.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <Card 
            shadow="sm" 
            className="mb-2 cursor-move hover:shadow-md transition-shadow"
          >
            <Group justify="space-between">
              <Badge color={getSubjectBadgeColor(slot.subject)}>
                {slot.subject}
              </Badge>
              <Text size="sm">{slot.slot.start} - {slot.slot.end}</Text>
            </Group>
            <Group justify="space-between" mt="xs">
              <Text size="sm">{slot.staff}</Text>
              <Text size="sm">{slot.room}</Text>
            </Group>
          </Card>
        </div>
      )}
    </Draggable>
  );
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
      <LoadingOverlay visible={loading} />
      
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={700}>School Timetable Management</Text>
        <Group justify='space-between' mb="md">
                <Text size="xl" fw={700}>
                  Class Timetable
                </Text>
                <Group>
                  <Button.Group>
                    <Button
                      variant={view1 === 'daily' ? 'filled' : 'light'}
                      onClick={() => setView1('daily')}
                    >
                      Daily
                    </Button>
                    <Button
                      variant={view1 === 'weekly' ? 'filled' : 'light'}
                      onClick={() => setView1('weekly')}
                    >
                      Weekly
                    </Button>
                  </Button.Group>
                  {view1 === 'daily' && (
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
        
              {view1 === 'daily' ? <DailyView /> : <WeeklyView />}
        <Group>
          <Menu>
            <Menu.Target>
              <Button leftSection={<IconDownload size={16} />}>Export</Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item 
                leftSection={<IconFileText size={16} />}
                // onClick={() => (instance as any).download()}
              >
                Export as PDF
              </Menu.Item>
              <Menu.Item 
                leftSection={<CalendarIcon size={16} />}
                onClick={generateICalFile}
              >
                Export to Calendar
              </Menu.Item>
              <Menu.Item 
                leftSection={<IconPrinter size={16} />}
                onClick={() => window.print()}
              >
                Print Timetable
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
 
      <Tabs 
  value={view} 
  onChange={(value: string | null) => setView(value as 'timetable' | 'staffs' | 'rooms')}
>
        <Tabs.List>
          <Tabs.Tab value="timetable" leftSection={<IconCalendar size={14} />}>
            Timetable
          </Tabs.Tab>
          <Tabs.Tab value="staffs" leftSection={<IconUsers size={14} />}>
            Staff Schedules
          </Tabs.Tab>
          <Tabs.Tab value="rooms" leftSection={<IconHome2 size={14} />}>
            Room Utilization
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="timetable" pt="md">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Grid>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                <Grid.Col key={day} span={12 / 5}>
                  <Card shadow="sm">
                    <Text fw={500} mb="md">{day}</Text>
                    <Droppable droppableId={day}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="min-h-[500px]"
                        >
                          {timetable[day]?.map((slot, index) => (
                            <DraggableTimeSlot 
                              key={slot.id} 
                              slot={slot} 
                              index={index}
                            />
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          </DragDropContext>
        </Tabs.Panel>

        <Tabs.Panel value="staffs" pt="md">
          <StaffScheduleView />
        </Tabs.Panel>

        <Tabs.Panel value="rooms" pt="md">
          <RoomUtilizationView />
        </Tabs.Panel>
      </Tabs>

      {/* Slot Details Modal */}
      <Modal
        opened={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Lesson Details"
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
                  <Text fw={500}>Staff</Text>
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

export default TimeTableComplete;