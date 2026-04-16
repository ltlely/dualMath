const { app, BrowserWindow } = require("electron");
const path = require("path");
const os = require("os");

console.log("✅ USING desktop/electron/main.js");

const isDev = !!process.env.VITE_DEV_SERVER_URL;
if (isDev) {
  app.setPath("userData", path.join(os.tmpdir(), "game-userdata"));
  app.setPath("cache", path.join(os.tmpdir(), "game-cache"));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    resizable: true,
    backgroundColor: "#0b0b12",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isDev) {
    win.webContents.openDevTools({ mode: "detach" });
  }

  win.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.log("DID_FAIL_LOAD:", { errorCode, errorDescription, validatedURL });
  });

  win.webContents.on("did-finish-load", () => {
    console.log("DID_FINISH_LOAD:", win.webContents.getURL());
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;

  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});