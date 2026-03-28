// src/components/Common/MarkdownEditorField.jsx
// Shared wrapper cho @uiw/react-md-editor — dùng ở DoctorManage, ClinicManage, SpecialtyManage
import React from 'react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import './MarkdownEditorField.scss';

/**
 * @param {string}   value       — Nội dung Markdown
 * @param {Function} onChange    — callback(markdownString)
 * @param {number}   height      — Chiều cao editor (mặc định 300)
 * @param {string}   placeholder — Placeholder text
 * @param {string}   label       — Label trên editor
 */
const MarkdownEditorField = ({
  value = '',
  onChange,
  height = 300,
  placeholder = '# Tiêu đề\n\nNhập nội dung Markdown...',
  label = 'Mô tả chi tiết (Markdown)',
}) => {
  return (
    <div className="markdown-editor-field">
      {label && <label className="editor-label">{label}</label>}
      <p className="editor-hint">
        💡 Cột trái — viết Markdown | Cột phải — preview thực tế
      </p>
      <div data-color-mode="light">
        <MDEditor
          value={value}
          onChange={(val = '') => onChange && onChange(val)}
          height={height}
          preview="live"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
};

export default MarkdownEditorField;
