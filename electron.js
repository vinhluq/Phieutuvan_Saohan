// electron.js - file main của Electron cho app PTVD
const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "PTVD - Phiếu tư vấn da",
    webPreferences: {
      contextIsolation: true
    }
  });

  // Khi đã build React xong, Electron sẽ load file build/index.html
  win.loadFile(path.join(__dirname, "build", "index.html"));

  // Nếu muốn ẩn menu bar:
  // win.removeMenu();
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
