import { fetchJSON, renderProjects, fetchGitHubData } from './global.js?v=lab4';
async function loadLatestProjects() {
  const container = document.querySelector('.projects');
  const projects = await fetchJSON(new URL('./lib/projects.json', import.meta.url));
  if (Array.isArray(projects)) renderProjects(projects.slice(0, 3), container, 'h3');
  else container.textContent = 'Projects could not be loaded. Visit the Projects page or try refreshing.';
}
const profileStats = document.querySelector('#profile-stats');
const refreshButton = document.querySelector('#refresh-stats');
async function loadGitHubStats() {
  if (!profileStats) return;
  refreshButton.disabled = true;
  profileStats.setAttribute('aria-busy', 'true');
  const data = await fetchGitHubData('jtw010-dot');
  const fields = ['public_repos', 'public_gists', 'followers', 'following'];
  if (data && fields.every(key => Number.isInteger(data[key]) && data[key] >= 0)) {
    profileStats.innerHTML = '<dl>' + fields.map((key, i) =>
      '<dt>' + ['Public repos', 'Public gists', 'Followers', 'Following'][i] + '</dt><dd>' + data[key] + '</dd>'
    ).join('') + '</dl>';
  } else {
    profileStats.textContent = 'GitHub stats are temporarily unavailable. You can still visit my GitHub profile or try again later.';
  }
  profileStats.setAttribute('aria-busy', 'false');
  refreshButton.disabled = false;
}
refreshButton?.addEventListener('click', loadGitHubStats);
await Promise.all([loadLatestProjects(), loadGitHubStats()]);

