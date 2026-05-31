const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");
const fs = require("fs");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);


app.use(express.static("public"));
app.use(express.json());

/* UPLOAD MEDIAS */

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        if (file.mimetype.startsWith("audio/")) {
            cb(null, "public/sounds");
        } else if (file.mimetype.startsWith("image/")) {
            cb(null, "public/images");
        } else {
            cb(null, "public");
        }

    },

    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }

});

const upload = multer({
    storage: storage
});

app.post("/upload", upload.single("file"), (req, res) => {

    res.json({
        success: true,
        filename: req.file.originalname,
        type: req.file.mimetype
    });

});

/* SETTINGS */

let settings = {
    voiceEnabled: true,
    actions: [],
    actionEvents: []
};

try {

    settings = JSON.parse(
        fs.readFileSync("settings.json")
    );

    console.log("Paramètres chargés");

} catch (error) {

    console.log("settings.json introuvable, paramètres par défaut utilisés");

}

app.get("/settings", (req, res) => {
    res.json(settings);
});

app.post("/settings", (req, res) => {

    settings = req.body;

    fs.writeFileSync(
        "settings.json",
        JSON.stringify(settings, null, 2)
    );

    res.json({
        success: true
    });

});

/* STATS */

let stats = {
    topGifters: {},
    giftHistory: []
};

try {

    stats = JSON.parse(
        fs.readFileSync("stats.json")
    );

    console.log("Statistiques chargées");

} catch (error) {

    console.log("stats.json introuvable, statistiques vides");

}

app.get("/stats", (req, res) => {
    res.json(stats);
});

app.post("/stats", (req, res) => {

    stats = req.body;

    fs.writeFileSync(
        "stats.json",
        JSON.stringify(stats, null, 2)
    );

    res.json({
        success: true
    });

});

/* TIKTOK */

const tiktokUsername =
    settings.tiktokUsername;

let tiktok = null;

if (tiktokUsername) {
    tiktok = new WebcastPushConnection(tiktokUsername);
    console.log("Compte TikTok configuré :", tiktokUsername);
} else {
    console.log("Aucun compte TikTok configuré");
}

/* IMPORT GIFTS */

app.get("/import-gifts", async (req, res) => {

    if (!tiktok) {
        return res.json({
            success: false,
            error: "Aucun compte TikTok configuré"
        });
    }

    try {

        const gifts =
            await tiktok.fetchAvailableGifts();

        fs.writeFileSync(
            "giftLibrary.json",
            JSON.stringify(gifts, null, 2)
        );

        res.json({
            success: true,
            count: gifts.length,
            gifts: gifts
        });

    } catch (error) {

        res.json({
            success: false,
            error: error.message
        });

    }

});

/* CONNEXION LIVE */

if (tiktok) {

    tiktok.connect()
    .then(() => {
        console.log("Connecté au LIVE TikTok :", tiktokUsername);
    })
    .catch(error => {
        console.log("Erreur connexion TikTok :", error);
    });

}

/* EVENTS */

const recentGifts = {};

if (tiktok) {

    tiktok.on("chat", data => {

        io.emit("chat", {
            user: data.nickname,
            message: data.comment
        });

    });

    tiktok.on("gift", data => {

        const giftName =
            data.giftName || data.gift?.name || "gift";

        const user =
            data.nickname || data.uniqueId || "user";

        const giftKey =
            user + "-" + giftName;

        const now = Date.now();

        if (
            recentGifts[giftKey] &&
            now - recentGifts[giftKey] < 5000
        ) {
            return;
        }

        recentGifts[giftKey] = now;

        io.emit("gift", {
            user: user,
            gift: giftName,
            giftId: data.giftId,
            diamonds: data.diamondCount,
            giftImage: data.giftPictureUrl
        });

    });

    tiktok.on("like", data => {

        io.emit("like", {
            user: data.nickname,
            likes: data.likeCount,
            totalLikes: data.totalLikeCount
        });

    });

    tiktok.on("follow", data => {

        io.emit("follow", {
            user: data.nickname
        });

    });

    tiktok.on("share", data => {

        io.emit("share", {
            user: data.nickname
        });

    });

}

/* START */

app.get("/gift-library", (req, res) => {

    try {

        const gifts = JSON.parse(
            fs.readFileSync("giftLibrary.json")
        );

        res.json(gifts);

    } catch (error) {

        res.json([]);

    }

});

app.get("/import-icetok-gifts", async (req, res) => {
    try {
        const response = await fetch("https://tools.icetok.org/gifts/");
        const html = await response.text();

        const gifts = [];
        const regex = /<img[^>]+src="([^"]+)"[^>]+alt="([^"]+)"[\s\S]*?([0-9]+)\s*Pièce/g;

        let match;

        while ((match = regex.exec(html)) !== null) {
            let image = match[1];

            if (image.startsWith("/")) {
                image = "https://tools.icetok.org" + image;
            }

            gifts.push({
                name: match[2].replace("Image: ", "").trim(),
                diamonds: Number(match[3]),
                image: image
            });
        }

        fs.writeFileSync(
            "giftLibrary.json",
            JSON.stringify(gifts, null, 2)
        );

        res.json({
            success: true,
            count: gifts.length,
            gifts: gifts
        });

    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});


app.get("/pricing", (req, res) => {
    res.send(`
        <h1>Tarifs TikBabik</h1>

        <h2>Version gratuite</h2>
        <p>Accès aux fonctions de base TikBabik.</p>

        <hr>

        <h2>TikBabik Pro</h2>
        <p>Abonnement mensuel donnant accès aux fonctions avancées.</p>
        <p><strong>Prix : 7,99 € / mois</strong></p>

        <hr>

        <h2>Agence LFDLV</h2>
        <p>Offre spéciale partenaires et agences.</p>
        <p><strong>Prix : 4,99 € / mois</strong></p>
    `);
});

app.get("/terms", (req, res) => {
    res.send(`
        <h1>Conditions d'utilisation</h1>

        <p>
            En utilisant TikBabik, vous acceptez d'utiliser l'application
            conformément aux règles des plateformes utilisées.
        </p>

        <p>
            TikBabik n'est pas affilié à TikTok, OBS, Minecraft,
            Streamer.bot ou Paddle.
        </p>
    `);
});

app.get("/privacy", (req, res) => {
    res.send(`
        <h1>Politique de confidentialité</h1>

        <p>
            TikBabik stocke uniquement les informations nécessaires
            au fonctionnement de l'application.
        </p>

        <p>
            Les données ne sont pas revendues à des tiers.
        </p>
    `);
});

app.get("/refund", (req, res) => {
    res.send(`
        <h1>Politique de remboursement</h1>

        <p>
            Les demandes de remboursement peuvent être étudiées
            dans un délai de 14 jours après l'achat.
        </p>

        <p>
            Contactez le support TikBabik pour toute demande.
        </p>
    `);
});

app.post("/paddle-webhook", express.json(), (req, res) => {

    const eventType = req.body.event_type || req.body.type;

    console.log("Webhook Paddle reçu :", eventType);

    if (
        eventType === "transaction.paid" ||
        eventType === "subscription.activated" ||
        eventType === "abonnement.actif"
    ) {
        settings.pro = true;

        fs.writeFileSync(
            "settings.json",
            JSON.stringify(settings, null, 2)
        );

        console.log("TikBabik Pro activé");
    }

    if (
        eventType === "subscription.canceled" ||
        eventType === "abonnement.annulé" ||
        eventType === "transaction.annulé"
    ) {
        settings.pro = false;

        fs.writeFileSync(
            "settings.json",
            JSON.stringify(settings, null, 2)
        );

        console.log("TikBabik Pro désactivé");
    }

    res.json({
        received: true
    });

});

server.listen(3000, () => {
    console.log("TikBabik lancé");
});

