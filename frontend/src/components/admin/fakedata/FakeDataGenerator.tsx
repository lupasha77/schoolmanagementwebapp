import { Tabs, Title } from "@mantine/core";
import FakeStudentGenerator from "./FakeStudentGenerator";
import SubjectManagement from "./SubjectGenerator";
import FakeStaffGenerator from "./FakeStaffGenerator";

const FakeDataGenerator = () => {
  return (
    <>
    <Title order={1} ta="center">Fake Data Generator</Title>
    <Tabs defaultValue="subjects">
      <Tabs.List>
        <Tabs.Tab value="students">Students</Tabs.Tab>
        <Tabs.Tab value="staff">Staff</Tabs.Tab>
        <Tabs.Tab value="subjects">Subjects</Tabs.Tab>
      </Tabs.List>

     

      <Tabs.Panel value="students">
        <FakeStudentGenerator />
      </Tabs.Panel>

      <Tabs.Panel value="staff">
        <FakeStaffGenerator />
      </Tabs.Panel>
      <Tabs.Panel value="subjects">
        <SubjectManagement />
      </Tabs.Panel>
    </Tabs>
    </>
  );
};

export default FakeDataGenerator;
