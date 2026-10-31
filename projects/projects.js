import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { fetchJSON, renderProjects } from '../global.js?v=lab4';
const container = document.querySelector('.projects');
const title = document.querySelector('.projects-title');
const search = document.querySelector('.searchBar');
const status = document.querySelector('#filter-status');
const reset = document.querySelector('#reset-filters');
const svg = d3.select('#projects-plot');
const legend = d3.select('.legend');
const projects = await fetchJSON(new URL('../lib/projects.json', import.meta.url));
let query = '';
let selectedYear = null;
const colors = d3.scaleOrdinal(d3.schemeTableau10);
const arc = d3.arc().innerRadius(0).outerRadius(48);
function selectYear(year) {
  selectedYear = selectedYear === year ? null : year;
  update();
}
function renderPieChart(matches) {
  const data = d3.rollups(matches, rows => rows.length, p => p.year)
    .sort((a, b) => b[0] - a[0]).map(([year, count]) => ({ year, count }));
  const slices = d3.pie().sort(null).value(d => d.count)(data);
  const paths = svg.selectAll('path').data(slices, d => d.data.year).join('path')
    .attr('d', arc).attr('fill', d => colors(d.data.year))
    .attr('tabindex', 0).attr('role', 'button')
    .attr('aria-label', d => d.data.year + ': ' + d.data.count + ' projects; toggle year filter')
    .attr('aria-pressed', d => String(d.data.year === selectedYear))
    .classed('selected', d => d.data.year === selectedYear)
    .on('click', (_, d) => selectYear(d.data.year))
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); selectYear(d.data.year);
      }
    });
  paths.selectAll('title').data(d => [d]).join('title')
    .text(d => d.data.year + ': ' + d.data.count + ' projects');
  const items = legend.selectAll('li').data(data, d => d.year).join('li')
    .style('--color', d => colors(d.year)).classed('selected', d => d.year === selectedYear);
  const buttons = items.selectAll('button').data(d => [d]).join('button')
    .attr('type', 'button').attr('aria-pressed', d => String(d.year === selectedYear))
    .on('click', (_, d) => selectYear(d.year));
  buttons.selectAll('.swatch').data(d => [d]).join('span').attr('class', 'swatch').attr('aria-hidden', 'true');
  buttons.selectAll('.legend-label').data(d => [d]).join('span').attr('class', 'legend-label')
    .text(d => d.year + ' (' + d.count + ')');
  document.querySelector('#chart-empty').hidden = matches.length > 0;
}
function update() {
  // Both controls share this pipeline: search first, then intersect with the selected year.
  // Store the year itself, not a slice index that can change when search removes years.
  const matches = projects.filter(p => Object.values(p).join('\n').toLowerCase().includes(query));
  const visible = matches.filter(p => selectedYear === null || p.year === selectedYear);
  renderProjects(visible, container, 'h2');
  if (!visible.length) container.textContent = 'No matching projects. Try another search or clear the filters.';
  title.textContent = 'Projects (' + visible.length + ')';
  status.textContent = visible.length + ' of ' + projects.length + ' projects shown' +
    (selectedYear === null ? ' · All years' : ' · Year: ' + selectedYear) +
    (query ? ' · Search: “' + search.value.trim() + '”' : '');
  // Keep all search-matching years available so another year can still be selected.
  renderPieChart(matches);
  reset.disabled = !query && selectedYear === null;
}
if (Array.isArray(projects)) {
  colors.domain([...new Set(projects.map(p => p.year))].sort((a,b) => b-a));
  search.addEventListener('input', () => { query = search.value.trim().toLowerCase(); update(); });
  reset.addEventListener('click', () => { query = ''; selectedYear = null; search.value = ''; update(); search.focus(); });
  update();
} else {
  status.textContent = 'Projects could not be loaded. Please refresh to try again.';
  container.textContent = ''; search.disabled = true; reset.disabled = true;
}
