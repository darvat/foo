/**
 * ComponentRenderer - Renders a component both in edit and preview modes.
 */

import React from 'react';
import type { Component } from '../../types/schema';

interface ComponentRendererProps {
  component: Component;
  mode: 'edit' | 'preview';
  value?: unknown;
  error?: string;
  onChange?: (value: unknown) => void;
  onClick?: () => void;
}

export const ComponentRenderer: React.FC<ComponentRendererProps> = ({
  component,
  mode,
  value,
  error,
  onChange,
  onClick,
}) => {
  const { type, props } = component;
  const isPreview = mode === 'preview';

  switch (type) {
    case 'text': {
      const sizeClass = `size-${props.fontSize || 'md'}`;
      return (
        <div className={`comp-text ${sizeClass}`} style={{ textAlign: props.align }}>
          {props.label || 'Text'}
        </div>
      );
    }

    case 'input': {
      if (props.multiline) {
        return (
          <div>
            {props.label && <div className="preview-component-label">{props.label}</div>}
            <textarea
              className="comp-textarea"
              placeholder={props.placeholder}
              rows={props.rows || 3}
              value={isPreview ? String(value ?? props.defaultValue ?? '') : ''}
              onChange={isPreview ? (e) => onChange?.(e.target.value) : undefined}
              readOnly={!isPreview}
              disabled={props.disabled}
            />
            {error && <div className="preview-error">{error}</div>}
          </div>
        );
      }
      return (
        <div>
          {props.label && <div className="preview-component-label">{props.label}</div>}
          <input
            className="comp-input"
            type="text"
            placeholder={props.placeholder}
            value={isPreview ? String(value ?? props.defaultValue ?? '') : ''}
            onChange={isPreview ? (e) => onChange?.(e.target.value) : undefined}
            readOnly={!isPreview}
            disabled={props.disabled}
          />
          {error && <div className="preview-error">{error}</div>}
        </div>
      );
    }

    case 'number':
      return (
        <div>
          {props.label && <div className="preview-component-label">{props.label}</div>}
          <input
            className="comp-number"
            type="number"
            placeholder={props.placeholder}
            value={isPreview ? String(value ?? props.defaultValue ?? '') : ''}
            onChange={isPreview ? (e) => onChange?.(e.target.value ? Number(e.target.value) : '') : undefined}
            readOnly={!isPreview}
            disabled={props.disabled}
          />
          {error && <div className="preview-error">{error}</div>}
        </div>
      );

    case 'dropdown':
      return (
        <div>
          {props.label && <div className="preview-component-label">{props.label}</div>}
          <select
            className="comp-select"
            value={isPreview ? String(value ?? props.defaultValue ?? '') : ''}
            onChange={isPreview ? (e) => onChange?.(e.target.value) : undefined}
            disabled={!isPreview || props.disabled}
          >
            <option value="">Select...</option>
            {props.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {error && <div className="preview-error">{error}</div>}
        </div>
      );

    case 'checkbox':
      return (
        <div className="comp-checkbox">
          <input
            type="checkbox"
            checked={isPreview ? Boolean(value ?? props.defaultValue) : false}
            onChange={isPreview ? (e) => onChange?.(e.target.checked) : undefined}
            readOnly={!isPreview}
            disabled={!isPreview || props.disabled}
          />
          <label>{props.label || component.name}</label>
          {error && <div className="preview-error">{error}</div>}
        </div>
      );

    case 'button': {
      const variant = props.variant || 'primary';
      return (
        <button
          className={`btn btn-${variant}`}
          onClick={isPreview ? onClick : undefined}
          disabled={props.disabled}
        >
          {props.label || 'Button'}
        </button>
      );
    }

    case 'image':
      return (
        <div>
          {props.src ? (
            <img
              src={props.src}
              alt={props.alt || ''}
              style={{ maxWidth: '100%', borderRadius: 'var(--radius-md)' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: 120,
                background: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-muted)',
                fontSize: 13,
              }}
            >
              Image placeholder
            </div>
          )}
        </div>
      );

    case 'table': {
      const columns = props.columns || [];
      return (
        <div style={{ overflowX: 'auto' }}>
          {props.label && <div className="preview-component-label">{props.label}</div>}
          <table className="comp-table">
            <thead>
              <tr>
                {columns.length > 0 ? (
                  columns.map((col) => <th key={col.key}>{col.label}</th>)
                ) : (
                  <>
                    <th>Column 1</th>
                    <th>Column 2</th>
                    <th>Column 3</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {!isPreview && (
                <tr>
                  {(columns.length > 0 ? columns : [{ key: '1' }, { key: '2' }, { key: '3' }]).map(
                    (col) => (
                      <td key={col.key} style={{ color: 'var(--color-text-muted)' }}>
                        Sample data
                      </td>
                    )
                  )}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    default:
      return <div className="text-muted text-sm">Unknown component type: {type}</div>;
  }
};
