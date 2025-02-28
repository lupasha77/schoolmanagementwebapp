import { Menu, Button } from '@mantine/core';
import { Link } from 'react-router-dom';

const NavbarAdmin = () => {
  return (
    <div style={{ width: 250, padding: 20 }}>
      <Menu>
        <Menu.Item>
          <Button component={Link} to="/lesson-timetable">Lesson Timetable Setup</Button>
        </Menu.Item>
        <Menu.Item>
          <Button component={Link} to="/exam-timetable">Exam Timetables Setup</Button>
        </Menu.Item>
        <Menu.Item>
          <Button component={Link} to="/class-allocations">Class Allocations</Button>
        </Menu.Item>
        <Menu.Item>
          <Button component={Link} to="/teacher-allocations">Teacher Allocations</Button>
        </Menu.Item>
        <Menu.Item>
          <Button component={Link} to="/subject-allocations">Subject Allocations</Button>
        </Menu.Item>
        <Menu.Item>
          <Button component={Link} to="/sports-diary">Sports Diary</Button>
        </Menu.Item>
        <Menu.Item>
          <Button component={Link} to="/school-calendar">School Calendar</Button>
        </Menu.Item>
      </Menu>
    </div>
  );
};

export default NavbarAdmin;
