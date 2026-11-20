
import api from './api';

export const getDocuments = async () => {
  const { data } = await api.get('/documents');
  return data;
};

export const uploadDocument = async (file, requestId) => {
  const formData = new FormData();

  formData.append('file', file);
  formData.append('requestId', requestId);

  const { data } = await api.post(
    '/documents/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return data;
};

export const downloadDocument = async (id) => {
  const response = await api.get(`/documents/${id}/download`, {
    responseType: 'blob',
  });

  return response.data;
};

export const deleteDocument = async (id) => {
  const { data } = await api.delete(`/documents/${id}`);
  return data;
};
