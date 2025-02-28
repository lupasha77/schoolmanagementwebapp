import { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import for navigation
import {  Group } from "@mantine/core";
import {  
  IconClock, 
  // IconCalendarTime, 
  IconBook, 
  IconList ,
  IconBellRinging,
  IconCalendar,
  IconHome2, 
  // IconReportAnalytics,
  // IconFaceId,
  // IconDownload,
  // IconEggCracked,
  IconDatabaseEdit,
  
} from "@tabler/icons-react";
import classes from "./NavbarSimpleColored.module.css";
import type { JSX } from 'react';
type MenuItem = {
  label: string;
  icon: JSX.ElementType; 
  link?: string;
  subMenu?: { link: string; label: string; icon: JSX.ElementType; }[];
};
 
const data: MenuItem[] = [
  { link: "/staff-dashboard", label: "Dashboard", icon: IconHome2 },
  { link: "/staff-dashboard/messages", label: "Messages", icon: IconBellRinging },
  { link: "/staff-dashboard/fake-data", label: "FakeData", icon: IconDatabaseEdit },
  {
    label: "Time Table",
    icon: IconCalendar,
    subMenu: [
      { link: "/staff-dashboard/timetable/create-timetable", label: "Create" , icon:IconBook },
      { link: "/staff-dashboard/timetable/edit", label: "Edit", icon:IconList },
      { link: "/staff-dashboard/timetable/configure", label: "Configure",icon:IconClock },
    ],
  },
  // {
  //   label: "Reports",
  //   icon: IconReportAnalytics,
  //   subMenu: [
  //     { link: "/staff-dashboard/reports/student", label: "Student Report" , icon:IconFaceId },
  //     { link: "/staff-dashboard/reports/performance", label: "Performance Report", icon:IconClock },
  //     { link: "/staff-dashboard/reports/attendance", label: "Attendance Report",icon:IconCalendarTime },
  //   ],
  // },
  
  // {
  //   label: "TimeTable Views",
  //   icon: IconReportAnalytics,
  //   subMenu: [
  //     { link: "/staff-dashboard/timetable/view", label: "Consolidated" , icon:IconFaceId },
  //     { link: "/staff-dashboard/timetable/view-by-teacher", label: "Teacher's Timetable", icon:IconClock },
  //     { link: "/staff-dashboard/timetable/view-by-class", label: "ClassTimeTable",icon:IconEggCracked },
  //     { link: "/staff-dashboard/timetable/view-by-grade", label: "StreamTimeTable",icon:IconReportAnalytics },
  //     { link: "/staff-dashboard/timetable/download", label: "Download TimeTable",icon:IconDownload },
  //   ],
  // },
];

export function StaffNavbar() {
  const [active, setActive] = useState<string>("Home");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navigate = useNavigate();

  const toggleMenu = (label: string) => {
    setOpenMenu(openMenu === label ? null : label);
  };

  const menuItems = data.map((item) => (
    <div key={item.label}>
      <div
        className={classes.link}
        data-active={item.label === active || undefined}
        onClick={() => {
          if (item.subMenu) {
            toggleMenu(item.label);
          } else if (item.link) {
            setActive(item.label);
            navigate(item.link);
          }
        }}
        style={{ cursor: "pointer" }}
      >
        <item.icon className={classes.linkIcon} stroke={1.5} />
        <span>{item.label}</span>
      </div>

      {item.subMenu && openMenu === item.label && (
  <div className={classes.subMenu}>
    {item.subMenu.map((subItem) => (
      <div
        key={subItem.label}
        className={classes.subMenuItem}
        onClick={() => {
          setActive(subItem.label);
          navigate(subItem.link);
        }}
        style={{ cursor: "pointer", paddingLeft: "20px", display: "flex", alignItems: "center", gap: "10px" }}
      >
        <subItem.icon className={classes.linkIcon} stroke={1.5} />
        <span>{subItem.label}</span>
      </div>
    ))}
  </div>
)}

    </div>
  ));

   
  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        <Group className={classes.header} justify="space-between">
          {/* Header Section */}
        </Group>
        {menuItems}
         
        
      </div>
    </nav>
  );
} 