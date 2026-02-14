/**
 * WelcomeScreen - Landing screen for creating or loading a stack.
 */

import React, { useState } from 'react';
import { useStackStore } from '../../store/stack-store';
import { TEMPLATES } from '../../templates';
import { processPrompt } from '../../ai/copilot';

export const WelcomeScreen: React.FC = () => {
  const { createStack, loadTemplate, setAiLoading, addAiMessage, applyAiResult, setPanel } = useStackStore();
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAiGenerate = async () => {
    const trimmed = aiPrompt.trim();
    if (!trimmed || isGenerating) return;

    setIsGenerating(true);

    // Create a stack first
    createStack('New Stack');

    // Then generate with AI
    const stack = useStackStore.getState().stack;
    setAiLoading(true);
    addAiMessage('user', trimmed);

    try {
      const result = await processPrompt(trimmed, stack, []);

      addAiMessage('assistant', result.message);

      if (result.cards) {
        // Remove the default "Welcome" card and apply AI result
        const state = useStackStore.getState();
        if (state.stack && state.stack.cards.length === 1 && state.stack.cards[0].title === 'Welcome') {
          useStackStore.getState().deleteCard(state.stack.cards[0].id);
        }
        applyAiResult(result.cards, result.components, result.rules);

        // Update stack name based on prompt
        const name = extractNameFromPrompt(trimmed);
        useStackStore.getState().updateStackName(name);
      }

      setPanel('ai');
    } catch (err) {
      addAiMessage(
        'assistant',
        `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setAiLoading(false);
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAiGenerate();
    }
  };

  return (
    <div className="welcome-screen">
      <img src="/cardstack.svg" alt="CardStack AI" className="welcome-logo" />
      <h1 className="welcome-title">CardStack AI</h1>
      <p className="welcome-subtitle">
        Build interactive tools, forms, and workflows in minutes. Describe what you need, or start
        from a template.
      </p>

      {/* AI prompt */}
      <div className="welcome-ai-prompt">
        <input
          className="welcome-ai-input"
          placeholder="Describe what you want to build..."
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isGenerating}
        />
        <button
          className="btn btn-primary"
          onClick={handleAiGenerate}
          disabled={isGenerating || !aiPrompt.trim()}
        >
          {isGenerating ? 'Generating...' : 'Build'}
        </button>
      </div>

      {/* Quick actions */}
      <div className="welcome-actions">
        <button className="btn btn-secondary" onClick={() => createStack('My Stack')}>
          Blank Stack
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                  useStackStore.getState().importStack(reader.result as string);
                };
                reader.readAsText(file);
              }
            };
            input.click();
          }}
        >
          Import JSON
        </button>
      </div>

      {/* Templates */}
      <div className="welcome-templates">
        <div className="welcome-templates-title">Start from a template</div>
        <div className="template-grid">
          {TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="template-card"
              onClick={() => loadTemplate(template)}
            >
              <div className="template-card-name">{template.name}</div>
              <div className="template-card-description">{template.description}</div>
              <div className="template-card-tags">
                {template.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="template-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function extractNameFromPrompt(prompt: string): string {
  const lower = prompt.toLowerCase();
  // Try to extract a meaningful name from common patterns
  const patterns = [
    /(?:create|build|make)\s+(?:a|an)\s+(.+?)(?:\s+(?:with|that|for|which))/i,
    /(?:create|build|make)\s+(?:a|an)\s+(.+)/i,
    /(.+?)(?:\s+(?:app|tool|form|workflow|calculator|tracker|checklist))/i,
  ];

  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match) {
      const name = match[1].trim();
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }

  return prompt.length > 40 ? prompt.slice(0, 40) + '...' : prompt;
}
