 "use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  useTasks,
  useTaskActions,
  useAllTags,
  useFilteredTags,
  Task,
} from '@/stores/task-store';
import { Button } from '@gnd/ui/button';
import { Input } from '@gnd/ui/input';
import { Textarea } from '@gnd/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@gnd/ui/card';
import { Badge } from '@gnd/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@gnd/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@gnd/ui/form';
import { Icons } from '@gnd/ui/icons';
import { Separator } from '@gnd/ui/separator';
import { format } from 'date-fns';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  tags: z.string().min(1, 'Tags are required (comma-separated)'),
});

export function CreateTaskForm() {
  const { addTask } = useTaskActions();
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      tags: '',
    },
  });

  function onSubmit(values: z.infer<typeof taskSchema>) {
    addTask({
      ...values,
      tags: values.tags.split(',').map((tag) => tag.trim()),
    });
    form.reset();
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Icons.Add className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new task</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Implement dark mode" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the task in detail"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. frontend, bug, feature"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Create Task</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function TaskList() {
  const tasks = useTasks();
  const { deleteTask, startTask, stopTask, completeTask } = useTaskActions();

  if (tasks.length === 0) {
    return <p>No tasks yet. Add one to get started!</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onDelete={() => deleteTask(task.id)}
          onStart={() => startTask(task.id)}
          onStop={() => stopTask(task.id)}
          onComplete={() => completeTask(task.id)}
        />
      ))}
    </div>
  );
}

function TaskItem({
  task,
  onDelete,
  onStart,
  onStop,
  onComplete,
}: {
  task: Task;
  onDelete: () => void;
  onStart: () => void;
  onStop: () => void;
  onComplete: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-start">
          <span>{task.title}</span>
          <TaskDetails task={task} />
        </CardTitle>
        <div className="flex flex-wrap gap-2 pt-2">
          {task.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{task.description}</p>
        <div className="mt-4 flex justify-between items-center">
          <Badge
            variant={
              task.status === 'completed'
                ? 'default'
                : task.status === 'in-progress'
                ? 'destructive'
                : 'outline'
            }
          >
            {task.status}
          </Badge>
          <div className="flex gap-2">
            {task.status === 'pending' && (
              <Button size="sm" onClick={onStart}>
                Start
              </Button>
            )}
            {task.status === 'in-progress' && (
              <>
                <Button size="sm" variant="outline" onClick={onStop}>
                  Stop
                </Button>
                <Button size="sm" onClick={onComplete}>
                  Complete
                </Button>
              </>
            )}
            <Button size="icon" variant="ghost" onClick={onDelete}>
              <Icons.Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskDetails({ task }: { task: Task }) {
  const { addNoteToTask } = useTaskActions();
  const [note, setNote] = useState('');

  const handleAddNote = () => {
    if (note.trim()) {
      addNoteToTask(task.id, note);
      setNote('');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Icons.MoreHoriz className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>
        <div>
          <h3 className="font-semibold mb-2">Status History</h3>
          <ul className="space-y-2">
            {task.statusHistory.map((history, index) => (
              <li key={index} className="flex justify-between text-sm">
                <span className="capitalize">{history.status}</span>
                <span className="text-muted-foreground">
                  {format(history.timestamp, 'PPpp')}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Separator />
        <div>
          <h3 className="font-semibold mb-2">Notes</h3>
          <ul className="space-y-2 mb-4">
            {task.notes.map((note, index) => (
              <li key={index} className="text-sm p-2 bg-muted rounded-md">
                {note}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a new note..."
            />
            <Button onClick={handleAddNote}>Add Note</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TagFilter() {
  const allTags = useAllTags();
  const filteredTags = useFilteredTags();
  const { toggleTagFilter } = useTaskActions();

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="font-semibold">Sort by tags:</span>
      {allTags.map((tag) => (
        <Button
          key={tag}
          variant={filteredTags.includes(tag) ? 'default' : 'outline'}
          size="sm"
          onClick={() => toggleTagFilter(tag)}
        >
          {tag}
        </Button>
      ))}
    </div>
  );
}
 