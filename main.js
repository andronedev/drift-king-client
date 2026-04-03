const { app, BrowserWindow } = require('electron');
const path = require('path');

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

  win.loadFile(path.join(__dirname, 'frontend', 'index.html'));

  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
