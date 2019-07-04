import React, { Component, PureComponent } from 'react';
import CheckIcon from '@material-ui/icons/Check';
import { getLatestPipeline, getMissingPipelines, getBuildFromVersion } from '../lib';
import { head, last, isEmpty, sortBy, uniq, not, partition, any } from 'ramda';
import { getPipelines, getCommit, getPipeline, getIssue, getIssueNotes } from '../gitlabApi';
import matchAll from 'string.prototype.matchall';
import moment from 'moment';
import { JellyfishSpinner } from 'react-spinners-kit';
import { getCurrentBuild, updateApp, getApps, InitialApp } from '../hobbitonApi';

type AppState = {
  name: string;
  projectId: string;
  installed: boolean;
  upToDate?: boolean;
  currentBuild?: number | null;
  currentBuildDate?: Date;
  currentBuildError?: boolean;
  missingBuilds?: number[];
  latestBuild?: number | null;
  latestBuildDate?: Date;
  latestBuildError?: boolean;
  issues?: number[];
  dependencies?: string[];
  updating?: boolean;
};

type Apps = {
  [app: string]: AppState;
};

type State = {
  loading: boolean;
  apps: Apps;
};

class App extends PureComponent<any, State> {
  state: Readonly<State> = {
    loading: true,
    apps: {}
  };

  async componentDidMount() {
    const apps = await getApps();

    this.setState({
      loading: false,
      apps: apps.reduce<Apps>(
        (acc, cur) => ({
          ...acc,
          [cur.name]: {
            name: cur.name,
            projectId: cur.projectId,
            installed: cur.installed,
            // currentBuild: cur.version,
            upToDate: false
          }
        }),
        {}
      )
    });

    for await (const app of apps) {
      const currentBuild = app.installed ? await this.processCurrentBuild(app, app.version) : undefined;
      const latestPipeline = await this.processPipelines(app, currentBuild);

      this.processVersionState(app, currentBuild, latestPipeline);
    }
  }

  async processCurrentBuild(app: InitialApp, version?: string) {
    try {
      const currentBuild = version ? getBuildFromVersion(version) : await getCurrentBuild(app.name);
      const pipeline = currentBuild ? await getPipeline(app.projectId, currentBuild) : undefined;

      const currentBuildDate = pipeline ? pipeline.finished_at : undefined;

      this.setState(prevState => ({
        apps: {
          ...prevState.apps,
          [app.name]: { ...prevState.apps[app.name], currentBuild, currentBuildDate, currentBuildError: false }
        }
      }));

      return currentBuild;
    } catch (error) {
      this.setState(prevState => ({
        apps: {
          ...prevState.apps,
          [app.name]: { ...prevState.apps[app.name], currentBuild: undefined, currentBuildError: true }
        }
      }));
    }
  }

  async processPipelines(app: InitialApp, currentBuild: number | null | undefined) {
    try {
      const pipelines = await getPipelines(app.projectId);

      const missingPipelines = currentBuild ? getMissingPipelines(pipelines, currentBuild) : [];
      const latestPipeline = last(pipelines);
      const latestBuild = latestPipeline && latestPipeline.id;
      let latestBuildDate: Date | undefined;

      let issueNumbers: number[] = [];
      let dependencies: string[] = [];

      for (let missingPipeline of missingPipelines) {
        const pipeline = await getPipeline(app.projectId, missingPipeline.id);
        const commit = await getCommit(app.projectId, pipeline.sha);

        if (missingPipeline.id === latestBuild) {
          latestBuildDate = pipeline.finished_at;
        }

        const issueRegex = new RegExp(/Closes #(\d+)/, 'gi');

        const issueMatches = matchAll(commit.message, issueRegex);

        for (let issueMatch of issueMatches) {
          const closedIssueNumber = parseInt(issueMatch[1], 10);

          issueNumbers.push(closedIssueNumber);

          // console.log(`issue found: ${closedIssueNumber}`);

          const issue = await getIssue(app.projectId, closedIssueNumber);
          const notes = await getIssueNotes(app.projectId, closedIssueNumber);

          const regex = new RegExp(/\/(dependsOn|depends) ([\w-]+\/[\w-]+)?#(\d+)/, 'gi');

          const descriptionMatches = matchAll(issue.description, regex);

          for (let item of descriptionMatches) {
            // console.log('dependsOn found: ', item[2], item[3]);

            dependencies.push(item[2]);
          }

          for (const note of notes) {
            const noteMatches = matchAll(note.body, regex);

            for (let item of noteMatches) {
              // console.log('dependsOn found: ', item[2], item[3]);

              dependencies.push(item[2]);
            }
          }
        }
      }

      this.setState(prevState => ({
        apps: {
          ...prevState.apps,
          [app.name]: {
            ...prevState.apps[app.name],
            missingBuilds: missingPipelines.map(m => m.id),
            latestBuild,
            latestBuildDate,
            latestBuildError: false,
            issues: issueNumbers,
            dependencies: sortBy(s => s, uniq(dependencies))
          }
        }
      }));

      return latestBuild;
    } catch (error) {
      this.setState(prevState => ({
        apps: {
          ...prevState.apps,
          [app.name]: { ...prevState.apps[app.name], latestBuild: undefined, latestBuildError: true }
        }
      }));
    }
  }

  processVersionState(app: InitialApp, current: number | null | undefined, latest: number | null | undefined) {
    this.setState(prevState => ({
      apps: {
        ...prevState.apps,
        [app.name]: { ...prevState.apps[app.name], upToDate: current && latest ? current >= latest : false }
      }
    }));
  }

  async processUpdateApp(app: AppState) {
    try {
      this.setState(prevState => ({
        apps: {
          ...prevState.apps,
          [app.name]: { ...prevState.apps[app.name], updating: true }
        }
      }));

      const dependencies = app.dependencies || [];

      for (const dependency of dependencies) {
        const initialAppDependency = Object.values(this.state.apps).find(f => f.projectId === dependency);

        if (initialAppDependency) {
          if (initialAppDependency.upToDate) {
            continue;
          }

          await this.processUpdateApp(initialAppDependency);
        }
      }

      await updateApp(app.projectId);

      await this.processCurrentBuild(app);
    } catch (error) {
      // this.setState(prevState => ({
      //   apps: {
      //     ...prevState.apps,
      //     [app.name]: { ...prevState.apps[app.name],updateError: error }
      //   }
      // }));
    } finally {
      this.setState(prevState => ({
        apps: {
          ...prevState.apps,
          [app.name]: { ...prevState.apps[app.name], updating: false }
        }
      }));
    }
  }

  handleOnUpdateClick = async (app: AppState) => {
    this.processUpdateApp(app);
  };

  handleOnRefreshClick = async (app: AppState) => {
    this.setState(prevState => ({
      apps: {
        ...prevState.apps,
        [app.name]: {
          ...prevState.apps[app.name],
          currentBuild: undefined,
          currentBuildDate: undefined,
          currentBuildError: false,
          missingBuilds: [],
          latestBuild: undefined,
          latestBuildDate: undefined,
          latestBuildError: false,
          upToDate: false
        }
      }
    }));

    const currentBuild = app.installed ? await this.processCurrentBuild(app) : undefined;
    const latestPipeline = await this.processPipelines(app, currentBuild);

    this.processVersionState(app, currentBuild, latestPipeline);
  };

  render() {
    if (this.state.loading) {
      return <JellyfishSpinner />;
    }

    const [installed, notInstalled] = partition(f => f.installed, Object.values(this.state.apps));

    return (
      <div>
        <div>
          <h2>Installed</h2>

          {this.renderTable(installed)}
        </div>
        <br />
        <br />
        <div>
          <h2>Not Installed</h2>

          {this.renderTable(notInstalled)}
        </div>
      </div>
    );
  }

  renderTable(apps: AppState[]) {
    const warningStyle = {
      color: '#856404',
      backgroundColor: '#fff3cd',
      borderColor: '#ffeeba'
    };

    const errorStyle = {
      color: '#721c24',
      backgroundColor: '#f8d7da',
      borderColor: '#f5c6cb'
    };

    const CellSytles = { borderSpacing: 8, borderWidth: 1, borderStyle: 'solid', padding: '8px 16px' };

    const anyInstalling = any(a => a.updating || false, apps);

    return (
      <table>
        <thead>
          <tr>
            <th>App</th>
            <th>Current Version</th>
            <th>Latest Version</th>
            <th>State</th>
            <th>Missing Versions</th>
            <th>Issues</th>
            <th>Dependencies</th>
            <th />
            <th />
          </tr>
        </thead>

        <tbody>
          {apps.map(m => (
            <tr
              key={m.name}
              style={
                m.currentBuildError || m.latestBuildError
                  ? errorStyle
                  : m.installed
                  ? not(m.upToDate)
                    ? warningStyle
                    : undefined
                  : undefined
              }
            >
              <td style={CellSytles}>{m.name}</td>
              <td style={CellSytles}>
                {m.currentBuildError ? (
                  'error'
                ) : (
                  <div>
                    {m.currentBuild}
                    {m.currentBuildDate && <span> - {moment(m.currentBuildDate).format('DD/MM/YYYY HH:mm')}hs</span>}
                  </div>
                )}
              </td>
              <td style={CellSytles}>
                {m.latestBuildError ? (
                  'error'
                ) : (
                  <div>
                    {m.latestBuild}
                    {m.latestBuildDate && <span> - {moment(m.latestBuildDate).format('DD/MM/YYYY HH:mm')}hs</span>}
                  </div>
                )}
              </td>
              <td style={CellSytles}>
                {m.upToDate ? (
                  <CheckIcon />
                ) : (
                  moment(m.latestBuildDate).diff(moment(m.currentBuildDate), 'days') + ' dias'
                )}
              </td>
              <td style={CellSytles}>
                {m.missingBuilds && not(isEmpty(m.missingBuilds)) ? m.missingBuilds.join(', ') : '-'}
              </td>
              <td style={CellSytles}>{m.issues && not(isEmpty(m.issues)) ? m.issues.join(', ') : '-'}</td>
              <td style={CellSytles}>
                {m.dependencies && not(isEmpty(m.dependencies)) ? (
                  <div>
                    {m.dependencies.map(m => (
                      <div key={m}>{m}</div>
                    ))}
                  </div>
                ) : (
                  '-'
                )}
              </td>
              <td style={CellSytles}>
                <button disabled={!m.installed || anyInstalling} onClick={() => this.handleOnUpdateClick(m)}>
                  Update
                </button>
              </td>
              <td style={CellSytles}>
                <button onClick={() => this.handleOnRefreshClick(m)}>Refresh</button>
              </td>
              <td style={{ padding: '4px 8px' }}>
                {m.updating && (
                  <JellyfishSpinner
                    size={36}
                    // color="#686769"
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}

export default App;
