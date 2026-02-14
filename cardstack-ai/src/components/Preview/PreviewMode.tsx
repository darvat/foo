/**
 * PreviewMode - Runtime view for testing the stack.
 */

import React from 'react';
import { useStackStore } from '../../store/stack-store';
import { ComponentRenderer } from '../shared/ComponentRenderer';

export const PreviewMode: React.FC = () => {
  const {
    stack,
    runtime,
    navigateToCard,
    setFieldValue,
    triggerAction,
    runRules,
  } = useStackStore();

  if (!stack) return null;

  const currentCard = stack.cards.find((c) => c.id === runtime.currentCardId);

  if (!currentCard) {
    return (
      <div className="main-canvas">
        <div className="empty-state">
          <div className="empty-state-text">No card to display</div>
        </div>
      </div>
    );
  }

  const handleFieldChange = (componentName: string, value: unknown) => {
    setFieldValue(componentName, value);
    // Trigger onChange actions
    const component = currentCard.components.find((c) => c.name === componentName);
    if (component) {
      triggerAction('onChange', component.id);
    }
    // Re-evaluate rules after field change
    runRules();
  };

  const handleButtonClick = (componentId: string) => {
    triggerAction('onClick', componentId);
  };

  return (
    <div className="main-canvas" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Navigation bar */}
      {stack.settings.showNavigation && stack.cards.length > 1 && (
        <div className="preview-toolbar">
          <div className="preview-nav">
            {stack.cards.map((card) => (
              <button
                key={card.id}
                className={`preview-nav-item ${
                  runtime.currentCardId === card.id ? 'active' : ''
                }`}
                onClick={() => navigateToCard(card.id)}
              >
                {card.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Card content */}
      <div className="preview-container">
        <div className="preview-card">
          <div className="preview-card-title">{currentCard.title}</div>

          {/* Messages */}
          {runtime.messages.map((msg, i) => (
            <div key={i} className={`preview-message ${msg.type}`}>
              {msg.text}
            </div>
          ))}

          {/* Components */}
          {currentCard.components
            .sort((a, b) => a.order - b.order)
            .map((component) => {
              // Check visibility
              const visibilityKey = `__visibility.${component.id}`;
              if (runtime.fields[visibilityKey] === false) return null;

              return (
                <div key={component.id} className="preview-component">
                  <ComponentRenderer
                    component={component}
                    mode="preview"
                    value={runtime.fields[component.name]}
                    error={runtime.errors[component.id]}
                    onChange={(value) => handleFieldChange(component.name, value)}
                    onClick={() => handleButtonClick(component.id)}
                  />
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
