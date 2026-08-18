const { app, BrowserWindow, dialog, session } = require("electron");
const path = require("path");
const { autoUpdater } =
    require("electron-updater");

let mainWindow = null;

function createWindow() {

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        icon: path.join(__dirname, "public", "icon.png"),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

mainWindow.loadURL("https://www.tikbabik.shop");

autoUpdater.checkForUpdatesAndNotify();

}

app.whenReady().then(() => {

    process.env.ELECTRON_APP = "true";

    createWindow();

});

/*
   Force l'écriture sur le disque des cookies (dont cp_session,
   l'identifiant qui relie chaque client à ses propres réglages)
   AVANT que l'app ne se ferme réellement. Sans ça, un cookie tout
   juste créé peut ne jamais être sauvegardé si l'app se ferme
   trop vite après, et l'utilisateur "perd" ses réglages au
   prochain lancement.
*/
let isQuitting = false;

app.on("before-quit", event => {

    if (isQuitting) {
        return;
    }

    event.preventDefault();

    session.defaultSession.cookies.flushStore()
        .catch(() => {})
        .finally(() => {
            isQuitting = true;
            app.quit();
        });

});

autoUpdater.on("checking-for-update", () => {
    console.log("Recherche mise à jour...");
});

autoUpdater.on("update-available", info => {
    console.log("Mise à jour disponible :", info.version);

    dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "Mise à jour CreatorPilot",
        message: "Une nouvelle version (" + info.version + ") a été trouvée.",
        detail: "Elle va se télécharger en arrière-plan et s'installera au prochain redémarrage de l'app.",
        buttons: ["OK"]
    });

});

autoUpdater.on("update-not-available", info => {
    console.log("Aucune mise à jour. Version actuelle :", info.version);
});

autoUpdater.on("update-downloaded", info => {

    dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "Mise à jour prête",
        message: "La version " + info.version + " a été téléchargée.",
        detail: "Redémarre CreatorPilot maintenant pour l'installer ?",
        buttons: ["Redémarrer maintenant", "Plus tard"]
    }).then(result => {
        if (result.response === 0) {
            autoUpdater.quitAndInstall();
        }
    });

});

autoUpdater.on("error", error => {
    console.log("Erreur update :", error);

    dialog.showMessageBox(mainWindow, {
        type: "error",
        title: "Erreur de mise à jour",
        message: "CreatorPilot n'a pas pu vérifier les mises à jour.",
        detail: String(error),
        buttons: ["OK"]
    });

});
