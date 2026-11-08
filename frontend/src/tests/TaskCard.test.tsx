import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { TaskCard } from '../components/kanban/TaskCard';
import { Task } from '../types';

const mockTask: Task = {
  _id: 'task-123',
  title: 'Optimize Real-Time WebSocket Delivery',
  description: 'Ensure update latency stays below 100ms across all connected clients',
  status: 'in_progress',
  priority: 'critical',
  order: 0,
  boardId: 'board-456',
  creator: { id: 'u1', name: 'Alice', email: 'alice@syncboard.dev' },
  assignee: { id: 'u2', name: 'Bob Smith', email: 'bob@syncboard.dev' },
  dueDate: '2026-12-01T00:00:00.000Z',
  labels: ['Performance', 'RealTime'],
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('TaskCard Component Unit Tests', () => {
  it('should render task title, description, priority badge, and assignee', () => {
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    render(
      <DragDropContext onDragEnd={() => {}}>
        <Droppable droppableId="test-col">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              <TaskCard
                task={mockTask}
                index={0}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    );

    expect(screen.getByText('Optimize Real-Time WebSocket Delivery')).toBeInTheDocument();
    expect(
      screen.getByText('Ensure update latency stays below 100ms across all connected clients')
    ).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('RealTime')).toBeInTheDocument();
  });
});

