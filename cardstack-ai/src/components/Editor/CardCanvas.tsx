/**
 * CardCanvas - The main editing area showing the selected card and its components.
 */

import React from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStackStore } from '../../store/stack-store';
import { ComponentRenderer } from '../shared/ComponentRenderer';
import type { Component } from '../../types/schema';

interface SortableCanvasComponentProps {
  component: Component;
  isSelected: boolean;
  onSelect: (componentId: string) => void;
}

const SortableCanvasComponent: React.FC<SortableCanvasComponentProps> = ({
  component,
  isSelected,
  onSelect,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: component.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`canvas-component ${isSelected ? 'selected' : ''} ${
        isDragging ? 'dragging' : ''
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(component.id);
      }}
    >
      <div className="canvas-component-header">
        <button
          type="button"
          className="canvas-component-drag-handle"
          aria-label={`Drag ${component.name}`}
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          &#8942;&#8942;
        </button>
        <div className="canvas-component-type">
          {component.type} &middot; {component.name}
        </div>
      </div>
      <ComponentRenderer component={component} mode="edit" />
    </div>
  );
};

export const CardCanvas: React.FC = () => {
  const { stack, editor, selectComponent, updateCard, reorderComponents } = useStackStore();

  if (!stack) {
    return (
      <div className="main-canvas">
        <div className="empty-state">
          <div className="empty-state-icon">&#128193;</div>
          <div className="empty-state-text">No stack loaded</div>
        </div>
      </div>
    );
  }

  const selectedCard = stack.cards.find((c) => c.id === editor.selectedCardId);

  if (!selectedCard) {
    return (
      <div className="main-canvas">
        <div className="empty-state">
          <div className="empty-state-icon">&#128196;</div>
          <div className="empty-state-text">Select a card from the sidebar</div>
        </div>
      </div>
    );
  }

  const orderedComponents = selectedCard.components
    .slice()
    .sort((a, b) => a.order - b.order);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const fromIndex = orderedComponents.findIndex((component) => component.id === activeId);
    const toIndex = orderedComponents.findIndex((component) => component.id === overId);

    if (fromIndex === -1 || toIndex === -1) return;

    reorderComponents(selectedCard.id, fromIndex, toIndex);
    selectComponent(activeId);
  };

  return (
    <div className="main-canvas">
      <div className="canvas-area">
        <div className="card-canvas">
          <input
            className="card-canvas-title"
            value={selectedCard.title}
            onChange={(e) => updateCard(selectedCard.id, { title: e.target.value })}
            placeholder="Card Title"
          />
          {selectedCard.description && (
            <div className="card-canvas-description">{selectedCard.description}</div>
          )}

          {selectedCard.components.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-state-text">
                Add components from the right panel, or use AI to generate them.
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(event) => selectComponent(String(event.active.id))}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedComponents.map((component) => component.id)}
                strategy={verticalListSortingStrategy}
              >
                <div>
                  {orderedComponents.map((component) => (
                    <SortableCanvasComponent
                      key={component.id}
                      component={component}
                      isSelected={editor.selectedComponentId === component.id}
                      onSelect={selectComponent}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
};
