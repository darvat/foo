/**
 * CardCanvas - The main editing area showing the selected card and its components.
 */

import React from 'react';
import { useStackStore } from '../../store/stack-store';
import { ComponentRenderer } from '../shared/ComponentRenderer';

export const CardCanvas: React.FC = () => {
  const { stack, editor, selectComponent, updateCard } = useStackStore();

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
            <div>
              {selectedCard.components
                .sort((a, b) => a.order - b.order)
                .map((component) => (
                  <div
                    key={component.id}
                    className={`canvas-component ${
                      editor.selectedComponentId === component.id ? 'selected' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectComponent(component.id);
                    }}
                  >
                    <div className="canvas-component-type">
                      {component.type} &middot; {component.name}
                    </div>
                    <ComponentRenderer component={component} mode="edit" />
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
