const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {

    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        icon: path.join(__dirname, "public", "icon.png"),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadURL("https://www.tikbabik.shop");
}

app.whenReady().then(() => {

    process.env.ELECTRON_APP = "true";

    require("./server.js");

    setTimeout(() => {
        createWindow();
    }, 2000);

});