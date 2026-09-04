import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Eye,
  Trash2,
  Plus,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { employeePortalApi } from '../../services/employeePortalApi';

const MyDocuments = () => {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    documentType: '',
    file: null,
    remarks: ''
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      // In production:
      // const response = await employeePortalApi.getMyDocuments();
      // setDocuments(response.data.documents);
      
      // Mock data
      const mockDocuments = [
        {
          id: 1,
          documentType: 'Resume',
          fileName: 'resume_2026.pdf',
          fileSize: '245 KB',
          uploadedDate: '2026-01-15',
          status: 'verified',
          remarks: 'Updated resume'
        },
        {
          id: 2,
          documentType: 'Educational Certificate',
          fileName: 'degree_certificate.pdf',
          fileSize: '1.2 MB',
          uploadedDate: '2026-01-10',
          status: 'verified',
          remarks: ''
        },
        {
          id: 3,
          documentType: 'Address Proof',
          fileName: 'aadhar_card.pdf',
          fileSize: '450 KB',
          uploadedDate: '2026-01-05',
          status: 'pending',
          remarks: 'Submitted for verification'
        },
        {
          id: 4,
          documentType: 'Experience Letter',
          fileName: 'previous_company_letter.pdf',
          fileSize: '180 KB',
          uploadedDate: '2025-12-20',
          status: 'verified',
          remarks: ''
        }
      ];
      
      setDocuments(mockDocuments);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size should not exceed 10MB');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only PDF, JPG, and PNG files are allowed');
        return;
      }
      
      setUploadData(prev => ({ ...prev, file }));
      setError(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!uploadData.documentType) {
      setError('Please select document type');
      return;
    }
    
    if (!uploadData.file) {
      setError('Please select a file to upload');
      return;
    }
    
    try {
      setUploading(true);
      setError(null);
      
      // In production:
      // const formData = new FormData();
      // formData.append('documentType', uploadData.documentType);
      // formData.append('file', uploadData.file);
      // formData.append('remarks', uploadData.remarks);
      // await employeePortalApi.uploadMyDocument(formData);
      
      // Mock success
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSuccess('Document uploaded successfully!');
      setShowUploadModal(false);
      setUploadData({ documentType: '', file: null, remarks: '' });
      
      // Refresh documents list
      fetchDocuments();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentId, fileName) => {
    try {
      // In production:
      // const response = await employeePortalApi.downloadMyDocument(documentId);
      // const blob = new Blob([response.data]);
      // const url = window.URL.createObjectURL(blob);
      // const link = document.createElement('a');
      // link.href = url;
      // link.download = fileName;
      // link.click();
      // window.URL.revokeObjectURL(url);
      
      alert('Download functionality will be connected to backend API');
    } catch (err) {
      console.error('Error downloading document:', err);
      setError('Failed to download document');
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      // In production: await employeePortalApi.deleteMyDocument(documentId);
      
      alert('Delete functionality will be connected to backend API');
      fetchDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document');
    }
  };

  const documentTypes = [
    'Resume',
    'Educational Certificate',
    'Experience Letter',
    'Address Proof',
    'PAN Card',
    'Aadhaar Card',
    'Passport',
    'Driving License',
    'Bank Statement',
    'Medical Certificate',
    'Other'
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Documents</h1>
          <p className="page-description">Upload and manage your personal documents</p>
        </div>
        <div className="page-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowUploadModal(true)}
          >
            <Plus size={16} />
            Upload Document
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'var(--success-bg)',
          color: 'var(--success-text)',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'var(--danger-bg)',
          color: 'var(--danger)',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Info Banner */}
      <div className="card" style={{ marginBottom: '24px', backgroundColor: 'var(--info-bg)' }}>
        <div className="card-body" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', color: 'var(--info-text)' }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '14px' }}>
              <strong>Document Guidelines:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>Accepted formats: PDF, JPG, PNG</li>
                <li>Maximum file size: 10MB</li>
                <li>Documents will be verified by HR team</li>
                <li>Keep your documents up to date</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Documents List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          Loading documents...
        </div>
      ) : documents.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <FileText size={48} className="empty-state-icon" />
              <h3 className="empty-state-title">No documents uploaded</h3>
              <p className="empty-state-desc">
                Upload your documents to keep your profile complete
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowUploadModal(true)}
              >
                <Plus size={16} />
                Upload Document
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Uploaded Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: 500 }}>{doc.documentType}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{doc.fileName}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{doc.fileSize}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {new Date(doc.uploadedDate).toLocaleDateString()}
                    </td>
                    <td>
                      <StatusBadge status={doc.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="icon-btn"
                          onClick={() => handleDownload(doc.id, doc.fileName)}
                          title="Download"
                        >
                          <Download size={18} />
                        </button>
                        <button 
                          className="icon-btn"
                          onClick={() => handleDelete(doc.id)}
                          title="Delete"
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => !uploading && setShowUploadModal(false)}>
          <div 
            className="card"
            style={{ maxWidth: '500px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">Upload Document</h3>
              <button 
                className="icon-btn" 
                onClick={() => !uploading && setShowUploadModal(false)}
                disabled={uploading}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpload}>
              <div className="card-body">
                {/* Document Type */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    Document Type <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <select
                    className="input-control"
                    value={uploadData.documentType}
                    onChange={(e) => setUploadData(prev => ({ ...prev, documentType: e.target.value }))}
                    required
                    style={{ width: '100%' }}
                  >
                    <option value="">Select document type</option>
                    {documentTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* File Upload */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    Select File <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: '8px',
                    padding: '24px',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-surface-hover)'
                  }}>
                    <Upload size={32} style={{ color: 'var(--text-secondary)', marginBottom: '8px' }} />
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                      {uploadData.file ? uploadData.file.name : 'Choose a file to upload'}
                    </p>
                    <input
                      type="file"
                      id="file-upload"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                      required
                    />
                    <label htmlFor="file-upload" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                      Browse Files
                    </label>
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      PDF, JPG, PNG (Max 10MB)
                    </p>
                  </div>
                </div>

                {/* Remarks */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    Remarks (Optional)
                  </label>
                  <textarea
                    className="input-control"
                    value={uploadData.remarks}
                    onChange={(e) => setUploadData(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Add any additional information"
                    rows={3}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowUploadModal(false)}
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="btn btn-primary"
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const config = {
    verified: { bg: 'var(--success-bg)', color: 'var(--success-text)', label: 'Verified' },
    pending: { bg: 'var(--warning-bg)', color: 'var(--warning-text)', label: 'Pending Verification' },
    rejected: { bg: 'var(--danger-bg)', color: 'var(--danger)', label: 'Rejected' }
  };

  const style = config[status] || config.pending;

  return (
    <span style={{
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 500,
      backgroundColor: style.bg,
      color: style.color
    }}>
      {style.label}
    </span>
  );
};

export default MyDocuments;
