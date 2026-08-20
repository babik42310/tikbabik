const { app, shell, dialog } = require("electron");
const { autoUpdater } =
    require("electron-updater");

let updateHandled = false;

function finishAndQuit() {

    if (updateHandled) {
        return;
    }

    updateHandled = true;

    // Laisse un peu de temps à la boîte de dialogue de mise à
    // jour de s'afficher si une nouvelle version vient d'être
    // trouvée, avant de fermer l'app en arrière-plan.
    setTimeout(() => {
        app.quit();
    }, 3000);

}

app.whenReady().then(() => {

    process.env.ELECTRON_APP = "true";

    shell.openExternal("https://tikbabik.shop");

    autoUpdater.checkForUpdatesAndNotify();

});

autoUpdater.on("checking-for-update", () => {
    console.log("Recherche mise à jour...");
});

autoUpdater.on("update-available", info => {

    console.log("Mise à jour disponible :", info.version);

    dialog.showMessageBox({
        type: "info",
        title: "Mise à jour CreatorPilot",
        message: "Une nouvelle version (" + info.version + ") a été trouvée.",
        detail: "Elle va se télécharger en arrière-plan et s'installera au prochain lancement de l'app.",
        buttons: ["OK"]
    }).then(() => {
        finishAndQuit();
    });

});

autoUpdater.on("update-not-available", info => {
    console.log("Aucune mise à jour. Version actuelle :", info.version);
    finishAndQuit();
});

autoUpdater.on("update-downloaded", info => {

    dialog.showMessageBox({
        type: "info",
        title: "Mise à jour prête",
        message: "La version " + info.version + " a été téléchargée.",
        detail: "Redémarrer CreatorPilot maintenant pour l'installer ?",
        buttons: ["Redémarrer maintenant", "Plus tard"]
    }).then(result => {

        if (result.response === 0) {
            autoUpdater.quitAndInstall();
        } else {
            finishAndQuit();
        }

    });

});

autoUpdater.on("error", error => {
    console.log("Erreur update :", error);
    finishAndQuit();
});

app.on("window-all-closed", () => {
    // Ne rien faire — l'app n'a jamais de fenêtre, elle se ferme
    // elle-même via finishAndQuit() une fois la vérification de
    // mise à jour terminée.
});
