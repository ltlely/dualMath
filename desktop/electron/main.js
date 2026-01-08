const { app, BrowserWindow } = require("electron");
const path = require("path");
const os = require("os");

console.log("✅ USING desktop/electron/main.js");

app.setPath("userData", path.join(os.tmpdir(), "ameba-pico-math-userdata"));


function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    backgroundColor: "#0b0b12",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.webContents.openDevTools({ mode: "detach" }); // ✅ add this

  win.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
  console.log("DID_FAIL_LOAD:", { errorCode, errorDescription, validatedURL });
});

win.webContents.on("did-finish-load", () => {
  console.log("DID_FINISH_LOAD:", win.webContents.getURL());
});

app.setPath("userData", path.join(os.tmpdir(), "ameba-pico-math-userdata"));
app.setPath("cache", path.join(os.tmpdir(), "ameba-pico-math-cache"));


  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) win.loadURL(devUrl);
  else win.loadFile(path.join(__dirname, "../dist/index.html"));
}

app.whenReady().then(createWindow);
