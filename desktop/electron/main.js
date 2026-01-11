const { app, BrowserWindow } = require("electron");
const path = require("path");
const os = require("os");

console.log("✅ USING desktop/electron/main.js");

// Put Electron's user data in a stable folder.
// (Using tmp works for dev, but it's better not to for a Steam build.)
const isDev = !!process.env.VITE_DEV_SERVER_URL;
if (isDev) {
  app.setPath("userData", path.join(os.tmpdir(), "ameba-pico-math-userdata"));
  app.setPath("cache", path.join(os.tmpdir(), "ameba-pico-math-cache"));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    backgroundColor: "#0b0b12",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      // optional hardening (turn on when you’re ready)
      // contextIsolation: true,
      // nodeIntegration: false,
    },
  });

  // Only open DevTools in development
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
    // Packaged/Steam build loads the built site from disk
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(createWindow);

// macOS behavior (optional but standard)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
