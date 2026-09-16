import React, { useRef, useState } from 'react';
import { Upload, X, File } from 'lucide-react';
import { getFileUrl } from '../../services/api';
import '../../styles/components.css';

const FileUploader = ({ 
  label = "Upload File", 
  accept = "image/*", 
  onUpload, 
  previewUrl, 
  onRemove,
  helperText,
  isImage = true,
  fileName
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onUpload(files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {label && <label className="input-label" style={{ display: 'block', marginBottom: '8px' }}>{label}</label>}
      
      {previewUrl || fileName ? (
        <div style={{ 
          position: 'relative', 
          border: '1px solid var(--border-color)', 
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          padding: isImage ? '0' : '12px',
          height: isImage ? '150px' : 'auto',
          backgroundColor: 'var(--surface-hover)'
        }}>
          {isImage ? (
            <img src={getFileUrl(previewUrl)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <File size={24} color="var(--primary-color)" />
              {previewUrl ? (
                <a href={getFileUrl(previewUrl)} target="_blank" rel="noreferrer" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--primary-color)', textDecoration: 'underline' }}>
                  {fileName || 'Document.pdf'}
                </a>
              ) : (
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{fileName || 'Document.pdf'}</span>
              )}
            </div>
          )}
          
          <button 
            type="button"
            onClick={onRemove}
            style={{ 
              position: 'absolute', 
              top: '8px', 
              right: '8px',
              backgroundColor: 'var(--danger)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div 
          className="drag-drop-zone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--primary-color)' : 'var(--border-color)'}`,
            borderRadius: '8px',
            padding: '32px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: isDragging ? 'var(--primary-bg)' : 'transparent',
            transition: 'all 0.2s ease'
          }}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept={accept} 
            onChange={handleFileChange} 
          />
          <Upload size={32} color={isDragging ? 'var(--primary-color)' : 'var(--text-muted)'} style={{ margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'var(--text-color)' }}>
            Drag & drop file here, or click to browse
          </p>
          {helperText && (
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
