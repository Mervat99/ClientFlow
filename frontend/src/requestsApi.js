
import api from './api';

export const getRequests = async () => {
  const response = await api.get('/requests');
  return response.data;
};

export const createRequest = async (requestData) => {
  const response = await api.post('/requests', requestData);
  return response.data;
};

export const updateRequestStatus = async (id, status, reason) => {
  const response = await api.patch(`/requests/${id}/status`, {
    status,
    reason,
  });
  return response.data;
};

export const assignRequest = async (id, employeeId) => {
  const response = await api.post(`/requests/${id}/assign`, {
    employeeId,
  });
  return response.data;
};

export const getClients = async () => {
  const response = await api.get('/clients');
  return response.data;
};

export const getEmployees = async () => {
  const response = await api.get('/employees');
  return response.data;
};

export const getServices = async () => {
  const response = await api.get('/services');
  return response.data;
};
