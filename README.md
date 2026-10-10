# Bottle Times

A tiny Jekyll site for GitHub Pages. Log a feeding and it shows the next bottles
every 3 hours until 7:30 PM, with a live countdown to the next one.

## Files

- `_config.yml` – site title, feeding interval, and cutoff time
- `index.html` – the page (password screen + app)
- `assets/app.js` – schedule, countdown, and password logic
- `assets/style.css` – styling (follows light/dark mode)

## Publish on GitHub Pages

1. Create a new repository on GitHub and upload these files (keep the folder structure).
2. Go to **Settings → Pages**, set the source to **Deploy from a branch**, pick `main` and `/ (root)`, and save.
3. After a minute, the site is live at `https://<your-username>.github.io/<repo-name>/`.

## Change settings

Edit `_config.yml`:

```yaml
bottle:
  interval_hours: 3
  cutoff: "19:30"
```

## Change the password

The page stores a SHA-256 hash of the password, not the password itself.
To make a new hash, run this in your browser's developer console:

```js
crypto.subtle.digest("SHA-256", new TextEncoder().encode("NewPassword"))
  .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("")))
```

Paste the result into `passwordHash` near the bottom of `index.html`.

## About the password

GitHub Pages only serves static files, so the password check runs in the
browser. It keeps casual visitors out, but it isn't real security: anyone who
reads the page source can see the hash and the code. Don't put anything
private on this site. Free GitHub Pages sites also require a public repository.

Feedings are saved in the browser you log them in (localStorage), so each
phone or computer keeps its own log.
