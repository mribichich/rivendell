import axios from 'axios';
import { getBuildFromVersion } from './lib';
import config from './config';

const apiAxios = axios.create({
  baseURL: config.hobbitonUrl + '/api',
  timeout: 30000
});

export type InitialApp = {
  name: string;
  projectId: string;
  version?: string;
  installed: boolean;
};

export async function getApps() {
  const resp = await apiAxios.get<InitialApp[]>(`apps`);

  return resp.data;
}

export async function getCurrentBuild(name: string) {
  const resp = await apiAxios.get<{ version: string }>(`currentVersion/${name}`);

  return resp.data && getBuildFromVersion(resp.data.version);
}

export async function updateApp(projectId: string) {
  const pId = encodeURIComponent(projectId);

  const resp = await apiAxios.post(`update/${pId}`, null, { timeout: undefined });

  return resp.data;
}
