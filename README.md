# MidnightSpin

Modern, lightweight front‑end scaffold for a sleek single‑page experience. MidnightSpin is designed for fast iteration: clean HTML, focused CSS, and a simple JS entry point you can extend without fighting a framework.

## Highlights
- Clean single‑page structure (`index.html`) with a minimal JS entry (`app.js`).
- Structured, scalable styles in `styles.css` with room for components and themes.
- No build step required — open in a browser or serve locally.

## Quick start
1) Open `index.html` directly in your browser.
2) Or serve the folder to avoid CORS issues:

```bash
# from the project root
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Project structure
```
.
├─ index.html      # App shell
├─ styles.css      # Global styles + components
├─ app.js          # Client logic
└─ LICENSE
```

## Development notes
- Keep HTML semantic and minimal; move behavior into `app.js`.
- Add new sections as components in `styles.css`.
- If you expand the JS, consider splitting modules and using ES modules.

## License
See `LICENSE`.
