function get(env: keyof Window['env']) {
  return process.env[env] || (window.env && window.env[env]);
}

const hobbitonUrls = get('REACT_APP_HOBBITON_URLS');

export default {
  hobbitonUrl: get('REACT_APP_HOBBITON_URL'),
  hobbitonUrls: (hobbitonUrls && hobbitonUrls.split(';')) || [],
  gitlabUrl: get('REACT_APP_GITLAB_URL'),
  gitlabToken: get('REACT_APP_GITLAB_TOKEN')
};
