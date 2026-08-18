const { app, BrowserWindow } = require("electron");
const path = require("path");
const { autoUpdater } =
    require("electron-updater");

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

autoUpdater.checkForUpdatesAndNotify();

}

app.whenReady().then(() => {

    process.env.ELECTRON_APP = "true";

    createWindow();

});
autoUpdater.on("checking-for-update", () => {
    console.log("Recherche mise à jour...");
});

autoUpdater.on("update-available", () => {
    console.log("Mise à jour disponible");
});

autoUpdater.on("update-not-available", () => {
    console.log("Aucune mise à jour");
});

autoUpdater.on("error", error => {
    console.log("Erreur update :", error);
});
