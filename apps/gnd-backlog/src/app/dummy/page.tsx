"use client";

import {
  CreateTaskForm,
  TaskList,
  TagFilter,
} from './components';
import { PageTitle } from '@gnd/ui/custom/page-title';

export default function DummyTaskManagerPage() {
  return (
    <div className="container mx-auto p-4 space-y-8">
      <PageTitle>Dummy Task Manager</PageTitle>
      <div className="flex justify-between items-center">
        <TagFilter />
        <CreateTaskForm />
      </div>
      <TaskList />
    </div>
  );
}
 