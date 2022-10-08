// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu, ipcMain, Tray, dialog} = require('electron')
const path = require('path');
const shell = require('electron').shell;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let tray

function createWindow () {
  const gotTheLock = app.requestSingleInstanceLock()
  if (!gotTheLock) {
    app.quit()
  } else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      // 当运行第二个实例时,将会聚焦到mainWindow这个窗口
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
        mainWindow.show()
      }
    })
    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: 1066,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
      frame: false,
      resizable: false
    })
    require('@electron/remote/main').initialize()  //添加语句
    require('@electron/remote/main').enable(mainWindow.webContents)   //添加语句

    // and load the index.html of the app.
    mainWindow.loadFile('index.html')

    // 当我们点击关闭时触发close事件，我们按照之前的思路在关闭时，隐藏窗口，隐藏任务栏窗口
    // event.preventDefault(); 禁止关闭行为(非常必要，因为我们并不是想要关闭窗口，所以需要禁止默认行为)
    // mainWindow.on('show', () => {
    //   tray.setHighlightMode('always')
    // })
    // mainWindow.on('hide', () => {
    //   tray.setHighlightMode('never')
    // })
    //创建系统通知区菜单
    tray = new Tray(path.join(__dirname, 'icon.ico'));
    const contextMenu = Menu.buildFromTemplate([
      {label: '退出', click: () => {mainWindow.destroy()}},//我们需要在这里有一个真正的退出（这里直接强制退出）
    ])
    tray.setToolTip('Bing Wallpaper')
    tray.setContextMenu(contextMenu)
    tray.on('click', ()=>{ //我们这里模拟桌面程序点击通知区图标实现打开关闭应用的功能
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
      mainWindow.isVisible() ? mainWindow.setSkipTaskbar(false) : mainWindow.setSkipTaskbar(true);
    })

    let argv = process.argv
    for(var i = 0; i < argv.length; i++) {
      if(argv[i] == 'autoOpen') {
        mainWindow.hide()
      }
    }

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      mainWindow = null
    })

    mainWindow.on('show', function () {
      needReload()
    })
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow()
 
  Menu.setApplicationMenu(null)
  //mainWindow.webContents.openDevTools();

})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on('close', e=> mainWindow.close());
ipcMain.on('min', e=> mainWindow.hide());
ipcMain.on('getAppPath', e=> e.returnValue = app.getPath('userData'));
ipcMain.on('openAutoOpen', function() {
  app.setLoginItemSettings({
    openAtLogin: true,
    args: [
      'autoOpen'
    ]
  })
})
ipcMain.on('closeAutoOpen', function() {
  app.setLoginItemSettings({
    openAtLogin: false
  })
})
ipcMain.on('choseFilePath', function(e) {
  var filePath = dialog.showOpenDialogSync(mainWindow, {
    properties: ['openFile', 'openDirectory']
  })
  e.returnValue = filePath
})

ipcMain.on('getVersion', function(e) {
  e.returnValue = app.getVersion()
})

ipcMain.on('needUpdate', function(e, data) {
  let res = dialog.showMessageBoxSync(mainWindow, {
     'type' : 'info',
     'buttons' : ['取消', '确定'],
     'title' : '有新版本',
     'message' : '旧版本：' + app.getVersion() + '\n新版本：' + data.version + "\n\n" + data.note
  })
  if (res == 1) {
    shell.openExternal(data.url)
  }
})

function needReload() {
  mainWindow.webContents.send('reload');
}