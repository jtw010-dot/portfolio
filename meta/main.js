import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

const formatCount = d3.format(',');
const tooltip = document.querySelector('#commit-tooltip');
let hideTimer;

async function loadData() {
  return d3.csv(new URL('loc.csv', import.meta.url), row => ({
    ...row,
    line: Number(row.line), depth: Number(row.depth), length: Number(row.length),
    date: new Date(`${row.date}T00:00${row.timezone}`),
    datetime: new Date(row.datetime),
  }));
}

function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([id, lines]) => {
    const { author, date, time, timezone, datetime } = lines[0];
    const commit = {
      id, author, date, time, timezone, datetime,
      url: `https://github.com/jtw010-dot/portfolio/commit/${id}`,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60 + datetime.getSeconds() / 3600,
      totalLines: lines.length,
    };
    Object.defineProperty(commit, 'lines', { value: lines, enumerable: false });
    return commit;
  });
}

function renderCommitInfo(data, commits) {
  const fileLengths = d3.rollups(data, rows => d3.max(rows, d => d.line), d => d.file);
  const stats = [
    ['Lines of code', formatCount(data.length)],
    ['Contributing commits', formatCount(commits.length)],
    ['Code files', formatCount(fileLengths.length)],
    ['Longest file (lines)', formatCount(d3.max(fileLengths, d => d[1]))],
    ['Mean line length (characters)', d3.format('.1f')(d3.mean(data, d => d.length))],
    ['Maximum indentation depth', formatCount(d3.max(data, d => d.depth))],
  ];
  const container = d3.select('#stats').attr('aria-busy', 'false');
  container.selectAll('*').remove();
  const dl = container.append('dl').attr('class', 'stats');
  const groups = dl.selectAll('div').data(stats).join('div');
  groups.append('dt').text(d => d[0]);
  groups.append('dd').text(d => d[1]);
}

function hideTooltip() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { if (!tooltip.matches(':hover, :focus-within')) tooltip.hidden = true; }, 180);
}

function showTooltip(event, commit) {
  clearTimeout(hideTimer);
  const link = document.querySelector('#commit-link');
  link.href = commit.url;
  link.textContent = commit.id;
  document.querySelector('#commit-date').textContent = commit.datetime.toLocaleDateString('en-US', {dateStyle: 'long'});
  document.querySelector('#commit-time').textContent = commit.datetime.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', timeZoneName: 'short'});
  document.querySelector('#commit-author').textContent = commit.author;
  document.querySelector('#commit-lines').textContent = formatCount(commit.totalLines);
  tooltip.hidden = false;
  const bounds = event.currentTarget.getBoundingClientRect();
  const x = event.clientX ?? bounds.x + bounds.width / 2;
  const y = event.clientY ?? bounds.y + bounds.height / 2;
  const box = tooltip.getBoundingClientRect();
  tooltip.style.left = `${Math.max(8, Math.min(x + 12, innerWidth - box.width - 8))}px`;
  tooltip.style.top = `${Math.max(8, y + box.height + 20 > innerHeight ? y - box.height - 12 : y + 12)}px`;
}

tooltip.addEventListener('mouseenter', () => clearTimeout(hideTimer));
tooltip.addEventListener('mouseleave', hideTooltip);
tooltip.addEventListener('focusout', hideTooltip);

function renderLanguageBreakdown(selected) {
  const lines = selected.flatMap(d => d.lines);
  const breakdown = d3.rollups(lines, rows => rows.length, d => d.type).sort((a, b) => b[1] - a[1]);
  const names = {js: 'JavaScript', html: 'HTML', css: 'CSS', svelte: 'Svelte'};
  const groups = d3.select('#language-breakdown').selectAll('div').data(breakdown, d => d[0]).join('div');
  groups.selectAll('*').remove();
  groups.append('dt').text(d => names[d[0]] || d[0]);
  groups.append('dd').text(d => `${formatCount(d[1])} lines (${d3.format('.1%')(d[1] / lines.length)})`);
  groups.append('dd').attr('class', 'language-bar').attr('aria-hidden', 'true')
    .append('span').style('width', d => `${100 * d[1] / lines.length}%`);
  d3.select('#selection-help').text(selected.length
    ? `${formatCount(lines.length)} current lines across ${selected.length} selected commit${selected.length === 1 ? '' : 's'}.`
    : 'Draw a rectangle above, or focus a dot and press Enter to select it.');
  const links = d3.select('#selected-commits').selectAll('a').data(selected, d => d.id).join('a')
    .attr('href', d => d.url).attr('target', '_blank').attr('rel', 'noopener noreferrer')
    .text(d => `View ${d.id} on GitHub`);
  links.attr('aria-label', d => `View commit ${d.id} from ${d.datetime.toLocaleDateString()} on GitHub`);
}

function renderScatterPlot(commits) {
  const width = 1000, height = 500;
  const area = {left: 65, right: 965, top: 40, bottom: 435};
  const extent = d3.extent(commits, d => d.datetime);
  const padding = Math.max((extent[1] - extent[0]) * .045, 86400000);
  const xScale = d3.scaleTime().domain([new Date(+extent[0] - padding), new Date(+extent[1] + padding)])
    .range([area.left, area.right]).nice();
  const yScale = d3.scaleLinear().domain([0, 24]).range([area.bottom, area.top]);
  // Starting both domains at zero makes circle area exactly proportional to line count.
  const rScale = d3.scaleSqrt().domain([0, d3.max(commits, d => d.totalLines)]).range([0, 28]);
  const svg = d3.select('#chart').append('svg').attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'group').attr('aria-labelledby', 'chart-title').attr('aria-describedby', 'chart-help');
  svg.append('g').attr('class', 'gridlines').attr('transform', `translate(${area.left},0)`)
    .call(d3.axisLeft(yScale).tickValues(d3.range(0, 25, 3)).tickFormat('').tickSize(-(area.right - area.left)));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${area.bottom})`)
    .call(d3.axisBottom(xScale).ticks(7).tickFormat(d3.timeFormat('%b %d')));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${area.left},0)`)
    .call(d3.axisLeft(yScale).tickValues(d3.range(0, 25, 3)).tickFormat(h => `${String(h).padStart(2, '0')}:00`));
  svg.append('text').attr('class', 'axis-title').attr('x', 515).attr('y', 486).attr('text-anchor', 'middle').text('Commit date');
  svg.append('text').attr('class', 'axis-title').attr('x', area.left).attr('y', 18).text('Time of day (local, 24-hour clock)');

  // Brush goes below the dots so its overlay cannot intercept their hover events.
  const brushGroup = svg.append('g').attr('class', 'brush');
  const dots = svg.append('g').attr('class', 'dots').selectAll('circle')
    .data(d3.sort(commits, d => -d.totalLines)).join('circle')
    .attr('cx', d => xScale(d.datetime)).attr('cy', d => yScale(d.hourFrac)).attr('r', d => rScale(d.totalLines))
    .attr('tabindex', 0).attr('role', 'button').attr('aria-pressed', 'false')
    .attr('aria-label', d => `Commit ${d.id}, ${d.datetime.toLocaleString()}, ${d.totalLines} current lines. Enter to select.`)
    .on('mouseenter focus', showTooltip).on('mousemove', showTooltip).on('mouseleave blur', hideTooltip)
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        brushGroup.call(brush.move, null);
        updateSelection([d]);
      }
      if (event.key === 'Escape') { brushGroup.call(brush.move, null); tooltip.hidden = true; }
    });
  function updateSelection(selected) {
    const ids = new Set(selected.map(d => d.id));
    dots.classed('selected', d => ids.has(d.id)).attr('aria-pressed', d => String(ids.has(d.id)));
    document.querySelector('#selection-count').textContent = selected.length
      ? `${selected.length} commit${selected.length === 1 ? '' : 's'} selected` : 'No commits selected';
    document.querySelector('#clear-selection').disabled = !selected.length;
    renderLanguageBreakdown(selected);
  }
  const brush = d3.brush().extent([[area.left, area.top], [area.right, area.bottom]])
    .on('start brush end', event => {
      const bounds = event.selection;
      const selected = bounds ? commits.filter(d => {
        const x = xScale(d.datetime), y = yScale(d.hourFrac);
        return x >= bounds[0][0] && x <= bounds[1][0] && y >= bounds[0][1] && y <= bounds[1][1];
      }) : [];
      updateSelection(selected);
      // A rectangle with no dots can still be cleared.
      document.querySelector('#clear-selection').disabled = !bounds;
    });
  brushGroup.call(brush);
  document.querySelector('#clear-selection').addEventListener('click', () => brushGroup.call(brush.move, null));
  const sizes = [...new Set([10, 50, d3.max(commits, d => d.totalLines)].filter(n => n <= rScale.domain()[1]))].sort((a,b) => a-b);
  const legend = d3.select('#size-legend').append('svg').attr('viewBox', '0 0 590 70').attr('role', 'img')
    .attr('aria-label', 'Circle area represents current lines per commit');
  legend.append('text').attr('x', 0).attr('y', 38).text('Current lines per commit:');
  const items = legend.selectAll('g').data(sizes).join('g').attr('transform', (_, i) => `translate(${260 + i * 115},35)`);
  items.append('circle').attr('r', d => rScale(d));
  items.append('text').attr('x', 34).attr('y', 5).text(formatCount);
}

try {
  const data = await loadData();
  if (!data.length || data.some(d => !Number.isFinite(+d.datetime) || !Number.isFinite(d.length))) throw new Error('Invalid or empty code data');
  const commits = processCommits(data);
  renderCommitInfo(data, commits);
  renderScatterPlot(commits);
  document.querySelector('#time-zone').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
} catch (error) {
  document.querySelector('#stats').setAttribute('aria-busy', 'false');
  const status = document.querySelector('#load-status') || document.querySelector('#stats').appendChild(document.createElement('p'));
  status.textContent = 'The code data could not load. Please reload this page or try again later.';
  console.error('Could not load meta analysis:', error);
}
