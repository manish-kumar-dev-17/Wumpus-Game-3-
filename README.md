# Wumpus World Game

This is an open-source, browser-playable Wumpus World game made with plain HTML, CSS, and JavaScript.

## Run locally

Open `index.html` directly, or start the included local server:

```bat
run-wumpus-server.bat
```

Then open:

```text
http://127.0.0.1:8000/index.html
```

## Publish Online

To make a link anyone can open, run:

```bat
login-github.bat
publish-github-pages.bat
```

Then run `publish-github-pages.bat`. The script creates a public repository, enables GitHub Pages, and prints the public link.

## Controls

- `Move` or Arrow Up: move forward
- `L` / Arrow Left: turn left
- `R` / Arrow Right: turn right
- `Shoot` or `S`: shoot arrow
- `Grab` or `G`: collect treasure
- `Run Agent`: let the simple agent explore

## License

MIT License. See `LICENSE`.
