process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const logs = require('electron-log');
logs.catchErrors();

const electron = require('electron');
const windowState = require('electron-window-state');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const url = require('url');
const isDev = require('electron-is-dev');

const app = electron.app;
const shell = electron.shell;
const BrowserWindow = electron.BrowserWindow;

// if serving enable hot reload
const args = process.argv.slice(1);

// init CMD flags
const isServing = args.some((val) => val === '--serve');
const isTesting = args.some((val) => val === '--tests');

// set test folder when testing
if (isTesting) {
  app.setPath('userData', path.resolve('./tmp'));
}

// in dev mode add local data and enable hot reloading
if (isDev && isServing) {
  mkdirp.sync('./tmp/storage/');
  fs.copyFileSync(
    path.resolve('./test/data/dev/environments.json'),
    path.resolve('./tmp/storage/environments.json')
  );
  fs.copyFileSync(
    path.resolve('./test/data/settings.json'),
    path.resolve('./tmp/storage/settings.json')
  );

  electron.app.setPath('userData', path.resolve('./tmp'));
  require('electron-reload')(__dirname, {});
}

let mainWindow;

function createWindow() {
  const mainWindowState = windowState({
    defaultWidth: 1024,
    defaultHeight: 768
  });

  const BrowserWindowConfig = {
    x: mainWindowState.x,
    y: mainWindowState.y,
    minWidth: 1024,
    minHeight: 768,
    width: mainWindowState.width,
    height: mainWindowState.height,
    title: `Mockoon`,
    backgroundColor: '#252830',
    icon: path.join(__dirname, '/icon_512x512x32.png'),
    webPreferences: {
      nodeIntegration: true,
      devTools: false
    }
  };

  // show devtools in dev
  if (isDev) {
    BrowserWindowConfig.webPreferences.devTools = true;
  }

  // Create the browser window.
  mainWindow = new BrowserWindow(BrowserWindowConfig);

  mainWindowState.manage(mainWindow);

  // and load the index.html of the app.
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true
    })
  );

  // Open the DevTools / Redux except when running functional tests
  if (isDev && !isTesting) {
    mainWindow.webContents.openDevTools();
  }

  // intercept all links and open in a new window
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();

    if (url.includes('openexternal::')) {
      shell.openExternal(url.split('::')[1]);
    }
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  var menuApplication = {
    label: 'Application',
    submenu: [
      {
        label: 'Settings',
        accelerator: 'CmdOrCtrl+,',
        click: function () {
          mainWindow.webContents.send('keydown', { action: 'OPEN_SETTINGS' });
        }
      },
      {
        label: 'Release notes',
        click: function () {
          mainWindow.webContents.send('keydown', { action: 'OPEN_CHANGELOG' });
        }
      },
      { type: 'separator' }
    ]
  };

  if (process.platform === 'darwin') {
    menuApplication.submenu.push(
      { label: 'Hide', role: 'hide' },
      { role: 'hideOthers' },
      { type: 'separator' }
    );
  }

  menuApplication.submenu.push({ label: 'Quit', role: 'quit' });

  // create prod menu
  var menu = [menuApplication];

  // add edit menu for mac because needed for copy paste
  if (process.platform === 'darwin') {
    menu.push({
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          selector: 'selectAll:'
        }
      ]
    });
  }

  // add actions menu, send action through web contents
  menu.push({
    label: 'Actions',
    submenu: [
      {
        label: 'Add new environment',
        accelerator: 'Shift+CmdOrCtrl+E',
        click: function () {
          mainWindow.webContents.send('keydown', { action: 'NEW_ENVIRONMENT' });
        }
      },
      {
        label: 'Add new route',
        accelerator: 'Shift+CmdOrCtrl+R',
        click: function () {
          mainWindow.webContents.send('keydown', { action: 'NEW_ROUTE' });
        }
      },
      { type: 'separator' },
      {
        label: 'Duplicate current environment',
        accelerator: 'CmdOrCtrl+D',
        click: function () {
          mainWindow.webContents.send('keydown', {
            action: 'DUPLICATE_ENVIRONMENT'
          });
        }
      },
      {
        label: 'Duplicate current route',
        accelerator: 'Shift+CmdOrCtrl+D',
        click: function () {
          mainWindow.webContents.send('keydown', { action: 'DUPLICATE_ROUTE' });
        }
      },
      { type: 'separator' },
      {
        label: 'Delete current environment',
        accelerator: 'Alt+CmdOrCtrl+U',
        click: function () {
          mainWindow.webContents.send('keydown', {
            action: 'DELETE_ENVIRONMENT'
          });
        }
      },
      {
        label: 'Delete current route',
        accelerator: 'Alt+Shift+CmdOrCtrl+U',
        click: function () {
          mainWindow.webContents.send('keydown', { action: 'DELETE_ROUTE' });
        }
      },
      { type: 'separator' },
      {
        label: 'Start/Stop/Reload current environment',
        accelerator: 'Shift+CmdOrCtrl+S',
        click: function () {
          mainWindow.webContents.send('keydown', {
            action: 'START_ENVIRONMENT'
          });
        }
      },
      { type: 'separator' },
      {
        label: 'Select previous environment',
        accelerator: 'CmdOrCtrl+Up',
        click: function () {
          mainWindow.webContents.send('keydown', {
            action: 'PREVIOUS_ENVIRONMENT'
          });
        }
      },
      {
        label: 'Select next environment',
        accelerator: 'CmdOrCtrl+Down',
        click: function () {
          mainWindow.webContents.send('keydown', {
            action: 'NEXT_ENVIRONMENT'
          });
        }
      },
      {
        label: 'Select previous route',
        accelerator: 'Shift+CmdOrCtrl+Up',
        click: function () {
          mainWindow.webContents.send('keydown', { action: 'PREVIOUS_ROUTE' });
        }
      },
      {
        label: 'Select next route',
        accelerator: 'Shift+CmdOrCtrl+Down',
        click: function () {
          mainWindow.webContents.send('keydown', { action: 'NEXT_ROUTE' });
        }
      }
    ]
  });

  // add tools menu, send action through web contents
  menu.push({
    label: 'Import/export',
    submenu: [
      {
        label: "Mockoon's format",
        submenu: [
          {
            label: 'Import from clipboard',
            click: function () {
              mainWindow.webContents.send('keydown', {
                action: 'IMPORT_CLIPBOARD'
              });
            }
          },
          {
            label: 'Import from a file (JSON)',
            click: function () {
              mainWindow.webContents.send('keydown', { action: 'IMPORT_FILE' });
            }
          },
          {
            label: 'Export all environments to a file (JSON)',
            accelerator: 'CmdOrCtrl+O',
            click: function () {
              mainWindow.webContents.send('keydown', { action: 'EXPORT_FILE' });
            }
          }
        ]
      },
      { type: 'separator' },
      {
        label: 'Swagger/OpenAPI',
        submenu: [
          {
            label: 'Import Swagger v2/OpenAPI v3 (JSON or YAML)',
            click: function () {
              mainWindow.webContents.send('keydown', {
                action: 'IMPORT_OPENAPI_FILE'
              });
            }
          },
          {
            label: 'Export current environment to OpenAPI v3 (JSON)',
            click: function () {
              mainWindow.webContents.send('keydown', {
                action: 'EXPORT_OPENAPI_FILE'
              });
            }
          }
        ]
      }
    ]
  });

  menu.push({
    label: 'Help',
    submenu: [
      {
        label: 'Official website',
        click: function () {
          shell.openExternal('https://mockoon.com');
        }
      },
      {
        label: 'Docs',
        click: function () {
          shell.openExternal('https://mockoon.com/docs');
        }
      },
      {
        label: 'Community / Chat',
        click: function () {
          shell.openExternal('https://spectrum.chat/mockoon');
        }
      },
      { type: 'separator' },
      {
        label: 'Send feedback',
        click: function () {
          shell.openExternal('https://github.com/mockoon/mockoon/issues');
        }
      },
      { type: 'separator' },
      {
        label: 'Show app data folder',
        click: function () {
          shell.showItemInFolder(electron.app.getPath('userData'));
        }
      }
    ]
  });

  electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate(menu));
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
