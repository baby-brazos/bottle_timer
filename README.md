# Bottle Times

A tiny Jekyll site for GitHub Pages, with a green-and-blue dinosaur theme. Log a feeding and it shows
the next bottles every 2.5 hours until 7:30 PM, with a live countdown to the next one.

## Files

- `_config.yml` – site title, feeding interval, and cutoff time
- `index.html` – the page
- `apple-touch-icon.png` – the iPhone home-screen icon (180×180)
- `assets/app.js` – schedule and countdown logic
- `assets/dinos.svg` – the dinosaur background tile
- `assets/style.css` – styling (follows light/dark mode)

## Publish on GitHub Pages

1. Create a new repository on GitHub and upload these files (keep the folder structure).
2. Go to **Settings → Pages**, set the source to **Deploy from a branch**, pick `main` and `/ (root)`, and save.
3. After a minute, the site is live at `https://<your-username>.github.io/<repo-name>/`.

## Change settings

Edit `_config.yml`:

```yaml
bottle:
  interval_hours: 2.5
  cutoff: "19:30"
```

## Notes

There's no password on this site, so anyone with the link can open it.
Feedings are saved in the browser you log them in (localStorage), so each
phone or computer keeps its own log.
