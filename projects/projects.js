import { fetchJSON, renderProjects } from '../global.js?v=lab4';
const container = document.querySelector('.projects');
const title = document.querySelector('.projects-title');
const projects = await fetchJSON(new URL('../lib/projects.json', import.meta.url));
if (Array.isArray(projects)) {
  renderProjects(projects, container, 'h2');
  title.textContent = 'Projects (' + projects.length + ')';
} else {
  container.textContent = 'Projects could not be loaded. Please refresh to try again.';
}
