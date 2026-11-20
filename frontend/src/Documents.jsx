
import { useEffect, useState } from 'react';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  Paperclip,
} from 'lucide-react';

import {
  getDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
} from './documentsApi';

import { getRequests } from './requestsApi';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'jpg',
  'jpeg',
  'png',
];

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [requests, setRequests] = useState([]);

  const [selectedRequest, setSelectedRequest] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [documentsData, requestsData] = await Promise.all([
        getDocuments(),
        getRequests(),
      ]);

      setDocuments(
        Array.isArray(documentsData) ? documentsData : []
      );

      setRequests(
        Array.isArray(requestsData) ? requestsData : []
      );
    } catch (err) {
      console.error('Documents loading error:', err);

      setError(
        err.response?.data?.message ||
        'Failed to load documents. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    setError('');
    setSuccess('');

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const extension = file.name.split('.').pop().toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError(
        'Unsupported file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG.'
      );

      setSelectedFile(null);
      event.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File size must not exceed 10 MB.');

      setSelectedFile(null);
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!selectedRequest) {
      setError('Please select a request.');
      return;
    }

    if (!selectedFile) {
      setError('Please select a file.');
      return;
    }

    try {
      setUploading(true);

      await uploadDocument(selectedFile, selectedRequest);

      setSuccess('Document uploaded successfully.');

      setSelectedFile(null);
      setSelectedRequest('');

      const fileInput = window.document.getElementById(
        'document-file-input'
      );

      if (fileInput) {
        fileInput.value = '';
      }

      await loadData();
    } catch (err) {
      console.error('Document upload error:', err);

      setError(
        err.response?.data?.message ||
        'Failed to upload document. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentItem) => {
    try {
      setError('');
      setDownloadingId(documentItem.id);

      const blob = await downloadDocument(documentItem.id);

      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');

      link.href = url;
      link.download =
        documentItem.originalName || 'document';

      window.document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Document download error:', err);

      setError(
        'Failed to download document. Please try again.'
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (documentId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this document?'
    );

    if (!confirmed) return;

    try {
      setError('');
      setSuccess('');
      setDeletingId(documentId);

      await deleteDocument(documentId);

      setDocuments((current) =>
        current.filter((item) => item.id !== documentId)
      );

      setSuccess('Document deleted successfully.');
    } catch (err) {
      console.error('Document deletion error:', err);

      setError(
        err.response?.data?.message ||
        'Failed to delete document.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDocuments = documents.filter((item) => {
    const fileName = item.originalName || '';
    const clientName = item.client?.companyName || '';
    const uploadedBy = item.uploadedBy?.name || '';

    const searchValue = search.toLowerCase();

    return (
      fileName.toLowerCase().includes(searchValue) ||
      clientName.toLowerCase().includes(searchValue) ||
      uploadedBy.toLowerCase().includes(searchValue)
    );
  });

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (date) => {
    if (!date) return '-';

    return new Date(date).toLocaleDateString();
  };

  const getFileExtension = (name = '') => {
    return name.split('.').pop()?.toUpperCase() || 'FILE';
  };

  return (
    <div className="documents-page">
      <div className="documents-heading">
        <div>
          <span className="page-eyebrow">DOCUMENT CENTER</span>
          <h1>Documents</h1>
          <p>Upload and manage files related to client requests.</p>
        </div>

        <button
          className="secondary-button"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="notification-error">
          <AlertCircle size={16} />
          {Array.isArray(error) ? error.join(', ') : error}
        </div>
      )}

      {success && (
        <div className="notification-success">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      <section className="documents-upload-panel">
        <div className="documents-section-title">
          <div className="documents-title-icon">
            <Upload size={20} />
          </div>

          <div>
            <h2>Upload a document</h2>
            <p>Attach a file to an existing client request.</p>
          </div>
        </div>

        <form
          className="documents-upload-form"
          onSubmit={handleUpload}
        >
          <div className="form-group">
            <label htmlFor="document-request">
              Related Request
            </label>

            <select
              id="document-request"
              value={selectedRequest}
              onChange={(event) =>
                setSelectedRequest(event.target.value)
              }
            >
              <option value="">Select a request</option>

              {requests.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.title || request.description || `Request #${request.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Choose File</label>

            <label
              htmlFor="document-file-input"
              className="documents-file-picker"
            >
              <Paperclip size={17} />
              <span>
                {selectedFile
                  ? selectedFile.name
                  : 'Choose a file (max 10 MB)'}
              </span>
            </label>

            <input
              id="document-file-input"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              hidden
            />
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={uploading}
          >
            {uploading ? (
              <>
                <RefreshCw size={15} className="spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={15} />
                Upload Document
              </>
            )}
          </button>
        </form>

        {selectedFile && (
          <div className="documents-selected-file">
            <span>
              Selected: {selectedFile.name} (
              {formatFileSize(selectedFile.size)})
            </span>

            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);

                const fileInput =
                  window.document.getElementById(
                    'document-file-input'
                  );

                if (fileInput) fileInput.value = '';
              }}
              aria-label="Remove selected file"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <p className="documents-upload-hint">
          Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG,
          PNG. Maximum file size: 10 MB.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>All Documents</h2>
            <p>{documents.length} documents uploaded</p>
          </div>

          <div className="search-box">
            <Search size={16} />

            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <RefreshCw size={22} className="spin" />
            <p>Loading documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="empty-state">
            <FileText size={30} />
            <strong>No documents found</strong>
            <p>
              {search
                ? 'Try another search term.'
                : 'Uploaded documents will appear here.'}
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Client</th>
                  <th>Uploaded By</th>
                  <th>Size</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredDocuments.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="documents-name-cell">
                        <div className="documents-file-icon">
                          <FileText size={17} />
                        </div>

                        <div>
                          <strong>{item.originalName}</strong>
                          <small>
                            {getFileExtension(item.originalName)}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      {item.client?.companyName || '-'}
                    </td>

                    <td>
                      {item.uploadedBy?.name || '-'}
                    </td>

                    <td>{formatFileSize(item.size)}</td>

                    <td>{formatDate(item.createdAt)}</td>

                    <td>
                      <div className="documents-actions">
                        <button
                          type="button"
                          title="Download"
                          onClick={() => handleDownload(item)}
                          disabled={downloadingId === item.id}
                        >
                          {downloadingId === item.id ? (
                            <RefreshCw size={15} className="spin" />
                          ) : (
                            <Download size={15} />
                          )}
                        </button>

                        <button
                          type="button"
                          title="Delete"
                          className="documents-delete-button"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? (
                            <RefreshCw size={15} className="spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
