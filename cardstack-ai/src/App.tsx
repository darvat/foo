/**
 * CardStack AI - Main Application
 */

import React from 'react';
import { useStackStore } from './store/stack-store';
import { WelcomeScreen } from './components/Editor/WelcomeScreen';
import { CardList } from './components/Sidebar/CardList';
import { CardCanvas } from './components/Editor/CardCanvas';
import { PropertyPanel } from './components/Editor/PropertyPanel';
import { PreviewMode } from './components/Preview/PreviewMode';
import { exportAsHtml, exportAsJson, downloadFile } from './export/bundle';

export const App: React.FC = () => {
  const { stack, editor, setMode, resetRuntime } = useStackStore();

  // No stack loaded - show welcome screen
  if (!stack) {
    return (
      <div className="app-layout">
        <WelcomeScreen />
      </div>
    );
  }

  const handleExportHtml = () => {
    if (!stack) return;
    const html = exportAsHtml(stack);
    const safeName = stack.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadFile(html, `${safeName}.html`, 'text/html');
  };

  const handleExportJson = () => {
    if (!stack) return;
    const json = exportAsJson(stack);
    const safeName = stack.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadFile(json, `${safeName}.json`, 'application/json');
  };

  const handleToggleMode = () => {
    if (editor.mode === 'edit') {
      setMode('preview');
    } else {
      resetRuntime();
      setMode('edit');
    }
  };

  const handleNewStack = () => {
    if (editor.isDirty) {
      if (!window.confirm('You have unsaved changes. Create a new stack anyway?')) {
        return;
      }
    }
    useStackStore.getState().clearStack();
  };

  return (
    <div className="app-layout">
      {/* Toolbar */}
      <div className="app-toolbar">
        <div className="app-toolbar-title">
          <img src="/cardstack.svg" alt="" className="app-toolbar-logo" />
          <span>{stack.name}</span>
          {editor.isDirty && (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>(unsaved)</span>
          )}
        </div>
        <div className="app-toolbar-spacer" />
        <div className="app-toolbar-actions">
          <button className="btn btn-sm btn-secondary" onClick={handleNewStack}>
            New
          </button>
          <button
            className={`btn btn-sm ${editor.mode === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={handleToggleMode}
          >
            {editor.mode === 'edit' ? 'Preview' : 'Edit'}
          </button>
          <button className="btn btn-sm btn-secondary" onClick={handleExportJson}>
            Export JSON
          </button>
          <button className="btn btn-sm btn-primary" onClick={handleExportHtml}>
            Publish HTML
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="app-body">
        {editor.mode === 'edit' ? (
          <>
            <CardList />
            <CardCanvas />
            <PropertyPanel />
          </>
        ) : (
          <PreviewMode />
        )}
      </div>
    </div>
  );
};
