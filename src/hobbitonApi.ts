import axios from 'axios';
import { getBuildFromVersion } from './lib';
import config from './config';

export type InitialApp = {
  name: string;
  projectId: string;
  version?: string;
  installed: boolean;
};

function getAxios(baseUrl: string) {
  return axios.create({
    baseURL: baseUrl + '/api',
    timeout: 30000
  });
}

export async function getApps(baseUrl: string) {
  const resp = await getAxios(baseUrl).get<{ name: string; apps: InitialApp[] }>(`apps`);

  return resp.data;
}

export async function getCurrentBuild(baseUrl: string, name: string) {
  const resp = await getAxios(baseUrl).get<{ version: string }>(`currentVersion/${name}`);

  return resp.data && getBuildFromVersion(resp.data.version);
}

export async function updateApp(baseUrl: string, projectId: string) {
  const pId = encodeURIComponent(projectId);

  const resp = await getAxios(baseUrl).post(`update/${pId}`, null, { timeout: undefined });

  return resp.data;
}

export async function getConfig(baseUrl: string, projectId: string) {
  const pId = encodeURIComponent(projectId);

  const resp = await getAxios(baseUrl).get<{ config: string }>(`config/${pId}`, { timeout: undefined });

  return resp.data;
}
