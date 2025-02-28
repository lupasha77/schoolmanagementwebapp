// src/App.tsx
import {  Title } from '@mantine/core';
import StreamConfigCalcs from './StreamConfigCalcs';
import { SubjectForm } from '../creation/SubjectForm';
import StreamConfigInitializer from './Initialization';
import SubjectAssignment from '../subjects/SubjectAssignment';

export default function MainRequirements() {
  return (
    
      <div className="p-4">
        <Title>School Management System</Title>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Title __size='h2'>Calculate Requirements</Title>
            <StreamConfigCalcs />
          </div>
          <div>
            <Title __size='h2'>Initialization of Streams</Title>
            <StreamConfigInitializer />
          </div>
          <div>
            <Title __size='h2'>Add Subject</Title>
            <SubjectForm />
          </div>
          <div>
            <Title> Subjects Assignment per Class</Title>
            <SubjectAssignment/>
          </div>
        </div>
      </div>
  );
}