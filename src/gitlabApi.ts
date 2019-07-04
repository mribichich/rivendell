import axios from 'axios';
import { sortBy } from 'ramda';
import config from './config';

const gitlabAxios = axios.create({
  baseURL: config.gitlabUrl,
  timeout: 15000,
  headers: { 'PRIVATE-TOKEN': config.gitlabToken }
});

export type PipelineShort = {
  id: number;
  sha: string;
};

export type Pipeline = {
  id: number;
  sha: string;
  finished_at: Date;
};

export type Commit = {
  id: string;
  message: string;
};

export type Issue = {
  id: string;
  description: string;
};

export type IssueNote = {
  id: string;
  body: string;
};

export async function getPipelines(projectId: string) {
  const pId = encodeURIComponent(projectId);

  const resp = await gitlabAxios.get<PipelineShort[]>(`projects/${pId}/pipelines`, {
    params: { status: 'success', ref: 'master', per_page: 25 }
  });

  return sortBy(m => m.id, resp.data);
}

export async function getPipeline(projectId: string, pipelineId: number) {
  const pId = encodeURIComponent(projectId);

  const resp = await gitlabAxios.get<Pipeline>(`projects/${pId}/pipelines/${pipelineId}`);

  return { ...resp.data, finished_at: new Date(resp.data.finished_at) };
}

export async function getCommit(projectId: string, sha: string) {
  const pId = encodeURIComponent(projectId);

  const resp = await gitlabAxios.get<Commit>(`projects/${pId}/repository/commits/${sha}`);

  return resp.data;
}

export async function getIssue(projectId: string, issueId: number) {
  const pId = encodeURIComponent(projectId);

  const resp = await gitlabAxios.get<Issue>(`projects/${pId}/issues/${issueId}`);

  return resp.data;
}

export async function getIssueNotes(projectId: string, issueId: number) {
  const pId = encodeURIComponent(projectId);

  const resp = await gitlabAxios.get<IssueNote[]>(`projects/${pId}/issues/${issueId}/notes`);

  return resp.data;
}
