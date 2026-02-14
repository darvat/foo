/**
 * CardList - Sidebar showing all cards in the stack.
 */

import React, { useState } from 'react';
import { useStackStore } from '../../store/stack-store';

export const CardList: React.FC = () => {
  const { stack, editor, selectCard, addCard, deleteCard } = useStackStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

  if (!stack) return null;

  const handleAddCard = () => {
    if (newCardTitle.trim()) {
      addCard(newCardTitle.trim());
      setNewCardTitle('');
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddCard();
    if (e.key === 'Escape') {
      setIsAdding(false);
      setNewCardTitle('');
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Cards</h3>
        <button className="btn btn-sm btn-secondary" onClick={() => setIsAdding(true)}>
          +
        </button>
      </div>
      <div className="sidebar-content">
        {stack.cards.map((card, index) => (
          <div
            key={card.id}
            className={`card-list-item ${editor.selectedCardId === card.id ? 'active' : ''}`}
            onClick={() => selectCard(card.id)}
          >
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 16 }}>
              {index + 1}
            </span>
            <span className="card-list-item-title">{card.title}</span>
            <span className="card-list-item-badge">{card.components.length}</span>
            {stack.cards.length > 1 && (
              <button
                className="btn btn-link btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCard(card.id);
                }}
                style={{ padding: 2, fontSize: 11, color: 'var(--color-text-muted)' }}
              >
                x
              </button>
            )}
          </div>
        ))}

        {isAdding && (
          <div style={{ padding: '4px 8px' }}>
            <input
              className="property-input"
              placeholder="Card title..."
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newCardTitle.trim()) setIsAdding(false);
              }}
              autoFocus
            />
          </div>
        )}
      </div>
    </div>
  );
};
