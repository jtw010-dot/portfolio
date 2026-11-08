# John Wang portfolio

Personal website for DSC 106. Built with HTML, CSS, and JavaScript, and published with GitHub Pages.

Live website: https://jtw010-dot.github.io/portfolio/

Lab 2 adds flexible navigation, a responsive project grid using subgrid, an aligned contact form, and a resume adapted from my actual education and experience.

Project 1 includes the GroceryDB visualization, PDF write-up, and reproducible Python analysis under projects/project1/.

Lab 3 generates navigation from one shared JavaScript module, highlights the current page, and adds an Automatic/Light/Dark theme selector that remembers your choice. The contact form creates a properly encoded email draft.

To preview locally, open a terminal in this folder and run `python -m http.server 8000`, then visit http://localhost:8000/. JavaScript modules need an HTTP server rather than opening an HTML file directly.

Lab 4 stores twelve projects in lib/projects.json. Shared functions build the full gallery, its count, and the first three homepage cards. Live GitHub stats include a refresh button and an error fallback. Placeholder years are sample data; real coursework retains its actual year. Project 2 links to my chart contribution rather than an unverified group report.

Lab 6 adds `meta/`, with six code statistics, a D3 commit scatterplot, hover/focus details, area-scaled circles, and brush-linked language counts. Keyboard users can select a focused dot with Enter and clear with Escape or the Clear selection button.

The checked-in `meta/loc.csv` is an elocuent snapshot of commit `c6fb2b042e3b44f5a77d3aa790474320a5e4a747` (the completed Lab 5 site), generated before the Lab 6 changes. Keeping this explicit snapshot lets Lab 6 ship in one final commit without fabricated or uncommitted commit IDs. It contains 491 lines across nine code files and nine contributing commits; these are surviving lines, not total historical edits. The default analysis covers HTML, CSS, JS, and Svelte only.

To refresh the data later, install the development dependency with `npm ci`, then run `npm run analyze` from a clean, committed checkout. Update the snapshot reference in `meta/index.html` to that checkout's commit before saving the new CSV. Do not commit `node_modules/`. Preview through an HTTP server, as described above.
