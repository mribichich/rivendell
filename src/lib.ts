import { getPipelines, Pipeline } from './gitlabApi';

export async function getLatestPipeline(projectId: string) {
  const data = await getPipelines(projectId);

  if (data.length === 0) {
    return null;
  }

  return data[0];
}

export function getMissingPipelines(pipelines: { id: number }[], pipelineNumber: number) {
  return pipelines.filter(m => m.id > pipelineNumber);
}

export function getBuildFromVersion(version: string | null) {
  if (!version) {
    return null;
  }

  const splits = version.split('+');

  return splits.length > 1 ? parseInt(splits[1], 10) : null;
}
