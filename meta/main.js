import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

const formatCount = d3.format(',');
const languageNames = {js: 'JavaScript', html: 'HTML', css: 'CSS', svelte: 'Svelte'};
const languageName = type => languageNames[type] || type;
const fileColors = d3.scaleOrdinal(d3.schemeTableau10);
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
  }).sort((a, b) => a.datetime - b.datetime);
}

function renderCommitInfo(data, commits) {
  const fileLengths = d3.rollups(data, rows => rows.length, d => d.file);
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
  document.querySelector('#tooltip-commit-time').textContent = commit.datetime.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', timeZoneName: 'short'});
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
  const groups = d3.select('#language-breakdown').selectAll('div').data(breakdown, d => d[0]).join('div');
  groups.selectAll('*').remove();
  groups.append('dt').text(d => languageName(d[0]));
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
  const xScale = d3.scaleTime().range([area.left, area.right]);
  const yScale = d3.scaleLinear().domain([0, 24]).range([area.bottom, area.top]);
  // Starting both domains at zero makes circle area exactly proportional to line count.
  const rScale = d3.scaleSqrt().domain([0, d3.max(commits, d => d.totalLines)]).range([0, 28]);
  const svg = d3.select('#chart').append('svg').attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'group').attr('aria-labelledby', 'chart-title').attr('aria-describedby', 'chart-help');
  svg.append('g').attr('class', 'gridlines').attr('transform', `translate(${area.left},0)`)
    .call(d3.axisLeft(yScale).tickValues(d3.range(0, 25, 3)).tickFormat('').tickSize(-(area.right - area.left)));
  const xAxisGroup = svg.append('g').attr('class', 'axis x-axis').attr('transform', `translate(0,${area.bottom})`);
  const xAxis = d3.axisBottom(xScale).ticks(5).tickFormat(d3.timeFormat('%b %d'));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${area.left},0)`)
    .call(d3.axisLeft(yScale).tickValues(d3.range(0, 25, 3)).tickFormat(h => `${String(h).padStart(2, '0')}:00`));
  svg.append('text').attr('class', 'axis-title').attr('x', 515).attr('y', 486).attr('text-anchor', 'middle').text('Commit date');
  svg.append('text').attr('class', 'axis-title').attr('x', area.left).attr('y', 18).text('Time of day (local, 24-hour clock)');

  // Brush goes below the dots so its overlay cannot intercept their hover events.
  const brushGroup = svg.append('g').attr('class', 'brush');
  const dotGroup = svg.append('g').attr('class', 'dots');
  let dots = dotGroup.selectAll('circle');
  let visibleCommits = [];

  function updateScatterPlot(filteredCommits) {
    const [start, end] = d3.extent(filteredCommits, d => d.datetime);
    const padding = Math.max((end - start) * .045, 86400000);
    xScale.domain([new Date(+start - padding), new Date(+end + padding)]).nice();
    xAxisGroup.call(xAxis);
    visibleCommits = filteredCommits;
    dots = dotGroup.selectAll('circle')
      .data(d3.sort(visibleCommits, d => -d.totalLines), d => d.id).join('circle')
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
    brushGroup.call(brush.move, null);
    tooltip.hidden = true;
  }

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
      const selected = bounds ? visibleCommits.filter(d => {
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
  return updateScatterPlot;
}

function updateFileDisplay(lines) {
  const files = d3.groups(lines, d => d.file)
    .map(([name, rows]) => ({name, lines: d3.sort(rows, d => d.line)}))
    .sort((a, b) => b.lines.length - a.lines.length || d3.ascending(a.name, b.name));

  const groups = d3.select('#files').selectAll('.file-row')
    .data(files, d => d.name)
    .join(enter => {
      const row = enter.append('div').attr('class', 'file-row');
      const label = row.append('dt');
      label.append('code');
      label.append('small');
      row.append('dd').attr('aria-hidden', 'true');
      return row;
    });
  groups.select('code').text(d => d.name);
  groups.select('small').text(d => `${formatCount(d.lines.length)} ${d.lines.length === 1 ? 'line' : 'lines'}`);
  groups.select('dd').selectAll('.loc').data(d => d.lines, d => d.line).join('span')
    .attr('class', 'loc').style('--loc-color', d => fileColors(d.type));
}

function renderCommitStory(commits) {
  const steps = d3.select('#scatter-story').selectAll('.step')
    .data(commits, d => d.id).join('article').attr('class', 'step');
  const cards = steps.append('div');
  cards.append('time')
    .attr('datetime', d => d.datetime.toISOString())
    .text(d => d.datetime.toLocaleString(undefined, {dateStyle: 'long', timeStyle: 'short'}));
  cards.append('h3').append('a')
    .attr('href', d => d.url).attr('target', '_blank').attr('rel', 'noopener noreferrer')
    .text((d, i) => `${i === 0 ? 'First visible commit' : 'Commit'} ${d.id.slice(0, 7)}`);
  cards.append('p').text(d => {
    const files = new Set(d.lines.map(line => line.file)).size;
    const largest = d3.greatest(d3.rollups(d.lines, rows => rows.length, line => line.file), entry => entry[1]);
    return `${formatCount(d.totalLines)} surviving ${d.totalLines === 1 ? 'line' : 'lines'} across ${files} ${files === 1 ? 'file' : 'files'}. ${largest[0]} accounts for ${formatCount(largest[1])} here.`;
  });
  return steps;
}

async function setupTimeline(data, commits) {
  const updateScatterPlot = renderScatterPlot(commits);
  const steps = renderCommitStory(commits);
  const slider = document.querySelector('#commit-progress');
  const timeLabel = document.querySelector('#commit-time');
  const timeScale = d3.scaleTime().domain(d3.extent(commits, d => d.datetime)).range([0, 100]);
  const types = d3.sort(new Set(data.map(d => d.type)));
  fileColors.domain(types);
  const legend = d3.select('#file-languages').selectAll('li').data(types).join('li');
  legend.append('span').attr('class', 'loc').attr('aria-hidden', 'true')
    .style('--loc-color', fileColors);
  legend.append('span').text(languageName);

  let lastCommit;
  function showThrough(cutoff) {
    timeLabel.dateTime = cutoff.toISOString();
    timeLabel.textContent = cutoff.toLocaleString(undefined, {dateStyle: 'long', timeStyle: 'short'});
    const filtered = commits.filter(d => d.datetime <= cutoff);
    const last = filtered.at(-1);
    if (last === lastCommit) return;
    lastCommit = last;
    const lines = filtered.flatMap(d => d.lines);
    steps.classed('current', d => d === last).attr('aria-current', d => d === last ? 'step' : null);
    updateScatterPlot(filtered);
    updateFileDisplay(lines);
    renderCommitInfo(lines, filtered);
  }

  showThrough(commits.at(-1).datetime);
  slider.disabled = commits.length < 2 || +commits[0].datetime === +commits.at(-1).datetime;
  slider.addEventListener('input', () => showThrough(timeScale.invert(Number(slider.value))));

  try {
    const {default: scrollama} = await import('https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm');
    scrollama().setup({step: '#scatter-story .step', offset: 0.6})
      .onStepEnter(({index}) => {
        const cutoff = commits[index].datetime;
        slider.value = timeScale(cutoff);
        showThrough(cutoff);
      });
  } catch (error) {
    console.warn('Scroll-driven updates are unavailable. The timeline slider is still active.', error);
  }
}

try {
  const data = await loadData();
  if (!data.length || data.some(d => !Number.isFinite(+d.datetime) || !Number.isFinite(d.length))) throw new Error('Invalid or empty code data');
  const commits = processCommits(data);
  await setupTimeline(data, commits);
  document.querySelector('#time-zone').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
} catch (error) {
  document.querySelector('#stats').setAttribute('aria-busy', 'false');
  const status = document.querySelector('#load-status') || document.querySelector('#stats').appendChild(document.createElement('p'));
  status.textContent = 'The code data could not load. Please reload this page or try again later.';
  console.error('Could not load meta analysis:', error);
}
