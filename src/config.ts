function get(env: keyof Window['env']) {
  return process.env[env] || (window.env && window.env[env]);
}

export default {
  hobbitonUrl: get('REACT_APP_HOBBITON_URL'),
  gitlabUrl: get('REACT_APP_GITLAB_URL'),
  gitlabToken: get('REACT_APP_GITLAB_TOKEN')
};
