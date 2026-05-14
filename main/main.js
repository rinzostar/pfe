const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const env = require('./env');
const { setupApiHandlers } = require('./api');

// Load environment variables into process.env
Object.assign(process.env, env);

// Register custom protocol to handle Next.js absolute paths
function registerAppProtocol() {
  protocol.registerFileProtocol('app', (request, callback) => {
    let url = request.url.substr(6); // Strip 'app://'
    // Ensure we handle absolute paths by rooting them in renderer/out
    let filePath = path.join(__dirname, '..', 'renderer', 'out', url);
    
    // If it's a directory or doesn't have an extension, try adding .html
    if (!path.extname(filePath)) {
      if (fs.existsSync(filePath + '.html')) {
        filePath += '.html';
      } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
        filePath = path.join(filePath, 'index.html');
      }
    }
    
    callback({ path: filePath });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    show: false, // Don't show until ready to prevent white flicker
  });

  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, use our custom app protocol
    win.loadURL('app://./index.html');
  }

  win.once('ready-to-show', () => {
    win.show();
  });
}

// Important: Standard scheme must be registered before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

app.whenReady().then(() => {
  registerAppProtocol();
  setupApiHandlers();
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
