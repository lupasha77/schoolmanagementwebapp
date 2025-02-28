 import { useState } from "react";
import TimeTableComplete from "../components/timetable/TimeTableAdditionals"
import { Button } from "@mantine/core";
 
// import Timetable from "../components/TimeTableComponent"
 const TimetablePage = () => {
  const [classId, setClassId] = useState('some-default-class-id');
  const [grade, setGrade] = useState('some-default-grade');
  const updateTimetableProps = (newClassId: string, newGrade: string) => {
    setClassId(newClassId);
    setGrade(newGrade);
  }
   return (
     <div>
     
        {/* <Timetable classId={classId} grade={grade}/> */}
        <TimeTableComplete classId={classId} grade={grade}/>
        <Button onClick={() => updateTimetableProps('new-class-id', 'new-grade')}>Update Props</Button>
        </div>
   )
 }
 
 export default TimetablePage