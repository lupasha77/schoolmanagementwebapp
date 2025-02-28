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
  { link: "/student-dashboard", label: "Dashboard", icon: IconHome2 },
  { link: "/student-dashboard/messages", label: "Messages", icon: IconBellRinging },
  { link: "/student-dashboard/reports", label: "Reports", icon: IconDatabaseEdit },
  {
    label: "Time Table",
    icon: IconCalendar,
    subMenu: [
      { link: "/dashboard/timetable/view-timetable", label: "Academic TimeTable" , icon:IconBook },
      { link: "/dashboard/timetable/sports", label: "Sports", icon:IconList },
      { link: "/dashboard/timetable/view-exam-timetable", label: "Exam TimeTable",icon:IconClock },
    ],
  },
    
  // {
  //   label: "TimeTable Views",
  //   icon: IconReportAnalytics,
  //   subMenu: [
  //     { link: "/dashboard/timetable/view", label: "Consolidated" , icon:IconFaceId },
  //     { link: "/dashboard/timetable/view-by-teacher", label: "Teacher's Timetable", icon:IconClock },
  //     { link: "/dashboard/timetable/view-by-class", label: "ClassTimeTable",icon:IconEggCracked },
  //     { link: "/dashboard/timetable/view-by-grade", label: "StreamTimeTable",icon:IconReportAnalytics },
  //     { link: "/dashboard/timetable/download", label: "Download TimeTable",icon:IconDownload },
    // ],
  // },
];

export function StudentNavbar() {
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