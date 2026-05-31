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
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Tarifs - TikBabik</title>
<style>
body{font-family:Arial;background:#0f1117;color:white;padding:40px;}
.card{background:#181b24;padding:25px;border-radius:15px;margin:20px 0;max-width:700px;}
.price{font-size:28px;color:#ff0050;font-weight:bold;}
a{color:#ff0050;}
</style>
</head>
<body>
<h1>Tarifs TikBabik</h1>

<div class="card">
<h2>Version gratuite</h2>
<p>Accès aux fonctionnalités de base de TikBabik.</p>
<p class="price">0 €</p>
</div>

<div class="card">
<h2>🚀 TikBabik Pro</h2>
<p>Abonnement mensuel donnant accès aux fonctionnalités avancées.</p>
<ul>
<li>Actions avancées</li>
<li>Connexion Minecraft</li>
<li>Connexion Streamer.bot</li>
<li>Fonctions premium</li>
</ul>
<p class="price">7,99 € / mois</p>
</div>

<div class="card">
<h2>Agence LFDLV</h2>
<p>Offre spéciale agence et partenaires.</p>
<p class="price">4,99 € / mois</p>
</div>

<p><a href="/">Retour à TikBabik</a></p>
</body>
</html>
    `);
});

app.get("/terms", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Conditions d'utilisation - TikBabik</title>
<style>
body{font-family:Arial;background:#0f1117;color:white;padding:40px;line-height:1.6;}
.container{max-width:850px;background:#181b24;padding:30px;border-radius:15px;}
a{color:#ff0050;}
</style>
</head>
<body>
<div class="container">
<h1>Conditions d'utilisation</h1>

<p>En utilisant TikBabik, vous acceptez les présentes conditions d'utilisation.</p>

<h2>1. Service</h2>
<p>TikBabik est un outil permettant d'améliorer l'interactivité des lives TikTok avec des alertes, actions, sons, points et intégrations externes.</p>

<h2>2. Abonnement</h2>
<p>L'abonnement TikBabik Pro donne accès aux fonctionnalités premium tant que l'abonnement est actif.</p>

<h2>3. Utilisation</h2>
<p>L'utilisateur s'engage à utiliser TikBabik légalement et conformément aux règles de TikTok, OBS, Minecraft, Streamer.bot et des plateformes utilisées.</p>

<h2>4. Affiliation</h2>
<p>TikBabik n'est pas affilié, associé ou approuvé par TikTok, OBS, Minecraft, Streamer.bot ou Paddle.</p>

<h2>5. Suspension</h2>
<p>Toute utilisation abusive, frauduleuse ou contraire aux règles peut entraîner une suspension de l'accès au service.</p>

<p><a href="/">Retour à TikBabik</a></p>
</div>
</body>
</html>
    `);
});

app.get("/privacy", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Confidentialité - TikBabik</title>
<style>
body{font-family:Arial;background:#0f1117;color:white;padding:40px;line-height:1.6;}
.container{max-width:850px;background:#181b24;padding:30px;border-radius:15px;}
a{color:#ff0050;}
</style>
</head>
<body>
<div class="container">
<h1>Politique de confidentialité</h1>

<p>TikBabik respecte la confidentialité de ses utilisateurs.</p>

<h2>Données collectées</h2>
<p>TikBabik peut stocker les paramètres de configuration nécessaires au fonctionnement de l'application, comme le pseudo TikTok, les réglages d'alertes, les points et les préférences utilisateur.</p>

<h2>Paiements</h2>
<p>Les paiements sont traités par Paddle. TikBabik ne stocke pas les informations bancaires des utilisateurs.</p>

<h2>Utilisation des données</h2>
<p>Les données sont utilisées uniquement pour faire fonctionner TikBabik et améliorer l'expérience utilisateur.</p>

<h2>Partage des données</h2>
<p>TikBabik ne revend pas les données personnelles à des tiers.</p>

<h2>Contact</h2>
<p>Pour toute demande liée aux données personnelles, contactez l'équipe TikBabik.</p>

<p><a href="/">Retour à TikBabik</a></p>
</div>
</body>
</html>
    `);
});

app.get("/refund", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Remboursement - TikBabik</title>
<style>
body{font-family:Arial;background:#0f1117;color:white;padding:40px;line-height:1.6;}
.container{max-width:850px;background:#181b24;padding:30px;border-radius:15px;}
a{color:#ff0050;}
</style>
</head>
<body>
<div class="container">
<h1>Politique de remboursement</h1>

<p>Les abonnements TikBabik Pro sont facturés mensuellement.</p>

<h2>Annulation</h2>
<p>L'utilisateur peut annuler son abonnement à tout moment. L'accès Pro reste actif jusqu'à la fin de la période déjà payée.</p>

<h2>Remboursement</h2>
<p>Les demandes de remboursement peuvent être étudiées au cas par cas dans un délai de 14 jours après l'achat initial.</p>

<h2>Exceptions</h2>
<p>Un remboursement peut être refusé en cas d'abus, de fraude ou d'utilisation excessive du service après achat.</p>

<h2>Contact</h2>
<p>Pour toute demande de remboursement, contactez l'équipe TikBabik avec les informations liées à votre achat.</p>

<p><a href="/">Retour à TikBabik</a></p>
</div>
</body>
</html>
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

