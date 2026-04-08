# Drift King Launcher
<img width="1514" height="951" alt="image" src="https://github.com/user-attachments/assets/e8ac3558-a112-4420-8268-33784d3ce3c3" />


A lightweight desktop client for [Drift King](https://www.drifted.com/drift-king/) with a built-in **region switcher** and **Fly macro**.

No game files are bundled — assets are downloaded from official servers on first launch and cached locally.

![Electron](https://img.shields.io/badge/Electron-35-blue?logo=electron)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)

## Features

- **Region Switcher** — Change your game server region on the fly (EU, US, Asia, Japan, Russia, and 12 more)
- **Auto-download** — Game assets are fetched from official servers and cached in IndexedDB
- **Chromium WebView** — Full GPU-accelerated rendering via Electron
- **Frameless window** — Clean borderless look on macOS (hidden inset title bar)
- **Fly Macro** — Hold `F` to fly
- **Custom Wrap Overlay (single-player)** — Upload your own wrap image as a local visual effect

## Install

### Download (recommended)

Grab the latest release from the [**Releases**](https://github.com/andronedev/drift-king-client/releases/latest) page:

- **macOS** — `Drift.King-x.x.x.dmg` → open, drag to Applications
- **Windows** — `Drift.King.Setup.x.x.x.exe` → run the installer

First launch downloads ~30MB of game data. Subsequent launches load from cache instantly.

### Build from source

```bash
git clone https://github.com/andronedev/drift-king-client.git
cd drift-king-client
npm install
npm start
```

## Build

```bash
npm run build:mac     # .dmg
npm run build:win     # .exe (NSIS)
npm run build:linux   # .AppImage
```

## How It Works

The client is a thin Electron wrapper around the official Drift King WebGL game. On startup:

1. `loader.js` downloads game files (`game.data`, `game.framework.js`, `game.wasm`) from `drifted.com`
2. Files are cached in IndexedDB for instant loading next time
3. The Unity WebGL engine is initialized with `createUnityInstance()`
4. `regionswitcher.js` hooks `WebSocket` before the game connects to Photon servers, enabling region override

The region switcher intercepts the Photon authentication packet and replaces the region parameter before it reaches the server.

## Project Structure

```
app/
├── main.js                   Electron entry point
├── package.json
└── frontend/
    ├── index.html            Loading screen + UI styles
    ├── loader.js             Asset downloader + Unity launcher
    ├── regionswitcher.js     WebSocket hook + region switcher UI
    └── macros.js             Key macros (F → hold G + spam R)
```

## Legal

This project does **not** redistribute any game assets. All game files are downloaded at runtime from official public servers. Only the client wrapper code (MIT) is included in this repository.

Drift King is developed by [FreezeNova](https://www.freezenova.com/). This project is not affiliated with or endorsed by FreezeNova or Exit Games (Photon).

## License

MIT
