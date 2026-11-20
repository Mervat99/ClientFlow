
import api from './api';

export const getClients = async () => {
  const { data } = await api.get('/clients');
  return data;
};

export const createClient = async (client) => {
  const { data } = await api.post('/clients', client);
  return data;
};

export const getEmployees = async () => {
  const { data } = await api.get('/employees');
  return data;
};

export const createEmployee = async (employee) => {
  const { data } = await api.post('/employees', employee);
  return data;
};

export const getDepartments = async () => {
  const { data } = await api.get('/departments');
  return data;
};

export const getServices = async () => {
  const { data } = await api.get('/services');
  return data;
};

export const createService = async (service) => {
  const { data } = await api.post('/services', service);
  return data;
};
