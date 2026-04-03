const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true }
}]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'Drift King',
    backgroundColor: '#08080a',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 10 },
    autoHideMenuBar: true,
    frame: process.platform === 'darwin' ? true : false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webgl: true,
      backgroundThrottling: false,
    },
  });

  protocol.handle('app', (req) => {
    const filePath = path.join(__dirname, 'frontend', new URL(req.url).pathname);
    return new Response(fs.readFileSync(filePath), {
      headers: { 'Content-Type': getMime(filePath) }
    });
  });

  win.loadURL('app://host/index.html');

  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
}

function getMime(p) {
  const ext = path.extname(p).toLowerCase();
  return { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' }[ext] || 'application/octet-stream';
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
