const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { exec } = require("child_process");
const { WebcastPushConnection } = require("tiktok-live-connector");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");


let settings = {};

if (fs.existsSync("settings.json")) {

    settings = JSON.parse(
        fs.readFileSync(
            "settings.json",
            "utf8"
        )
    );

}


const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

app.get("/settings", (req, res) => {
    res.json(settings);
});

function saveSettingsFile() {
    fs.writeFileSync(
        "settings.json",
        JSON.stringify(settings, null, 2)
    );
}

app.post("/settings", (req, res) => {

    settings = req.body;

    saveSettingsFile();

    res.json({
        success: true
    });

});

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


function saveSettingsFile() {
    fs.writeFileSync(
        "settings.json",
        JSON.stringify(settings, null, 2)
    );
}

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

function applyChronoTime(seconds) {

    seconds = Number(seconds || 0);

    if (seconds <= 0) {
        return;
    }

    chrono.remaining = getChronoRemaining();

    if (chrono.settings.giftMode === "remove") {
        setChronoRemaining(chrono.remaining - seconds);
    } else {
        setChronoRemaining(chrono.remaining + seconds);
    }

}

function sendKeyShortcut(key) {

    if (!key) {
        return;
    }

    exec(
        `powershell -Command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('${key}')"`,
        (error) => {
            if (error) {
                console.log("Erreur raccourci clavier :", error);
            }
        }
    );

}

function sendKeyShortcut(shortcut) {

    console.log(
        "ENVOI TOUCHE :",
        shortcut
    );

}

function executeActionByName(actionName) {

    console.log("================================");
console.log("ACTION REÇUE :", actionName);
console.log("================================");

    const action =
        (settings.actions || [])
            .find(a => a.name === actionName);

    if (!action) {
        console.log("Action introuvable :", actionName);
        return;
    }

    console.log("================================");
console.log("ACTION TROUVÉE");
console.log("Nom :", action.name);
console.log("Type :", action.type);
console.log("Objet :", action);
console.log("================================");

if (action.keyShortcut) {
    console.log("KEYSTROKE :", action.keyShortcut);
}

if (action.keyShortcut) {
    sendKeyShortcut(action.keyShortcut);
}

    if (action.type === "Son" && action.sound) {
        io.emit("play-action-sound", {
            sound: action.sound
        });
    }

    if (action.type === "Commande") {
        console.log("Commande à exécuter :", action.description);
    }

    if (action.type === "Streamer.bot") {
        console.log("Action Streamer.bot :", action.description);
    }
}

function spinActionWheel() {

    actionWheel.spinning = true;
    actionWheel.winner = "";

    const activeWheel =
        (actionWheel.settings.wheels || []).find(w => w.enabled) ||
        (actionWheel.settings.wheels || [])[0] ||
        null;

    const actions =
        activeWheel && activeWheel.segments
            ? activeWheel.segments
            : [];

    let winnerText = "";
    let winnerIndex = 0;

    if (actions.length > 0) {
        winnerIndex = Math.floor(Math.random() * actions.length);

        const winnerSegment =
            actions[winnerIndex];

        winnerText =
            winnerSegment.text || "";

        actionWheel.winnerIndex =
            winnerIndex;
    }

    setTimeout(() => {

    actionWheel.winner =
        winnerText;

    actionWheel.spinning =
        false;

    executeActionByName(
        winnerText
    );

}, 5000);
}
/* EVENTS */

const recentGifts = {};

if (tiktok) {

    tiktok.on("chat", data => {

        applyChronoTime(chrono.settings.perChat);

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

        const matchingSoundAlert =
    (settings.soundAlerts || [])
        .find(alert =>
            alert.enabled &&
            alert.trigger === "gift" &&
            alert.gift === giftName
        );

if (matchingSoundAlert && matchingSoundAlert.sound) {
    io.emit("play-sound-alert", {
        sound: matchingSoundAlert.sound,
        volume: matchingSoundAlert.volume || 100
    });
}

        const wheelGiftName =
    giftName;

const wheelToTrigger =
    (actionWheel.settings.wheels || [])
        .find(w =>
            w.enabled &&
           w.trigger === wheelGiftName ||
w.trigger?.startsWith(wheelGiftName + " ")
        );

if (wheelToTrigger) {
    spinActionWheel();
}

       const giftCoinsForChrono =
    Number(data.diamondCount || 0);

if (
    giftCoinsForChrono > 0 &&
    chrono.settings.giftAutoEnabled &&
    chrono.settings.giftMode !== "off"
) {

    const secondsToChange =
        giftCoinsForChrono *
        Number(chrono.settings.secondsPerCoin || 1);

    applyChronoTime(secondsToChange);

}

        if (coinMatch.active) {

    const coins =
    Number(data.diamondCount || 0);

const avatar =
    data.profilePictureUrl ||
    data.user?.profilePictureUrl ||
    data.avatar ||
    "";

if (!coinMatch.players[user]) {
    coinMatch.players[user] = {
        coins: 0,
        avatar: avatar
    };
}

coinMatch.players[user].coins += coins;

if (avatar) {
    coinMatch.players[user].avatar = avatar;
}
}

if (giftBattle.active) {

    const coins =
        Number(data.diamondCount || 0);

    if (coins > 0) {

        if (Math.random() < 0.5) {
            giftBattle.teamRed += coins;
        } else {
            giftBattle.teamBlue += coins;
        }

    }

}

io.emit("gift", {
            user: user,
            gift: giftName,
            giftId: data.giftId,
            diamonds: data.diamondCount,
            giftImage: data.giftPictureUrl
        });

    });

    tiktok.on("like", data => {

        currentLikesGoalCount =
    Number(data.totalLikeCount || data.likeCount || 0);

        const user =
    data.nickname || "Utilisateur";

const likes =
    Number(data.likeCount || 0);

if (!topLikes[user]) {
    topLikes[user] = {
        likes: 0,
        avatar:
            data.profilePictureUrl ||
            data.profilePicture ||
            ""
    };
}

topLikes[user].likes += likes;

applyChronoTime(
    likes * Number(chrono.settings.perLike || 0)
);

        io.emit("like", {
            user: data.nickname,
            likes: data.likeCount,
            totalLikes: data.totalLikeCount
        });

    });

    tiktok.on("follow", data => {

applyChronoTime(chrono.settings.perFollow);

        io.emit("follow", {
            user: data.nickname
        });

    });

    tiktok.on("share", data => {

        applyChronoTime(chrono.settings.perShare);

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

app.get("/gift-gallery", (req, res) => {

    res.sendFile(
        path.join(__dirname, "gift-gallery.html")
    );

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
<title>Tarifs - CreatorPilot</title>
<style>
body{font-family:Arial;background:#0f1117;color:white;padding:40px;}
.card{background:#181b24;padding:25px;border-radius:15px;margin:20px 0;max-width:700px;}
.price{font-size:28px;color:#ff0050;font-weight:bold;}
a{color:#ff0050;}
</style>
</head>
<body>
<h1>Tarifs CreatorPilot</h1>

<div class="card">
<h2>Version gratuite</h2>
<p>Accès aux fonctionnalités de base de CreatorPilot.</p>
<p class="price">0 €</p>
</div>

<div class="card">
<h2>🚀 CreatorPilot Pro</h2>
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

<p><a href="/">Retour à CreatorPilot</a></p>
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
<title>Conditions d'utilisation - CreatorPilot</title>
<style>
body{font-family:Arial;background:#0f1117;color:white;padding:40px;line-height:1.6;}
.container{max-width:850px;background:#181b24;padding:30px;border-radius:15px;}
a{color:#ff0050;}
</style>
</head>
<body>
<div class="container">
<h1>Conditions d'utilisation</h1>

<p>En utilisant CreatorPilot, vous acceptez les présentes conditions d'utilisation.</p>

<h2>1. Service</h2>
<p>CreatorPilot est un outil permettant d'améliorer l'interactivité des lives TikTok avec des alertes, actions, sons, points et intégrations externes.</p>

<h2>2. Abonnement</h2>
<p>L'abonnement CreatorPilot Pro donne accès aux fonctionnalités premium tant que l'abonnement est actif.</p>

<h2>3. Utilisation</h2>
<p>L'utilisateur s'engage à utiliser CreatorPilot légalement et conformément aux règles de TikTok, OBS, Minecraft, Streamer.bot et des plateformes utilisées.</p>

<h2>4. Affiliation</h2>
<p>CreatorPilot n'est pas affilié, associé ou approuvé par TikTok, OBS, Minecraft, Streamer.bot ou Paddle.</p>

<h2>5. Suspension</h2>
<p>Toute utilisation abusive, frauduleuse ou contraire aux règles peut entraîner une suspension de l'accès au service.</p>

<p><a href="/">Retour à CreatorPilot</a></p>
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
<title>Confidentialité - CreatorPilot</title>
<style>
body{font-family:Arial;background:#0f1117;color:white;padding:40px;line-height:1.6;}
.container{max-width:850px;background:#181b24;padding:30px;border-radius:15px;}
a{color:#ff0050;}
</style>
</head>
<body>
<div class="container">
<h1>Politique de confidentialité</h1>

<p>CreatorPilot respecte la confidentialité de ses utilisateurs.</p>

<h2>Données collectées</h2>
<p>CreatorPilot peut stocker les paramètres de configuration nécessaires au fonctionnement de l'application, comme le pseudo TikTok, les réglages d'alertes, les points et les préférences utilisateur.</p>

<h2>Paiements</h2>
<p>Les paiements sont traités par Paddle. CreatorPilot ne stocke pas les informations bancaires des utilisateurs.</p>

<h2>Utilisation des données</h2>
<p>Les données sont utilisées uniquement pour faire fonctionner CreatorPilot et améliorer l'expérience utilisateur.</p>

<h2>Partage des données</h2>
<p>CreatorPilot ne revend pas les données personnelles à des tiers.</p>

<h2>Contact</h2>
<p>Pour toute demande liée aux données personnelles, contactez l'équipe CreatorPilot.</p>

<p><a href="/">Retour à CreatorPilot</a></p>
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
<title>Remboursement - CreatorPilot</title>
<style>
body{font-family:Arial;background:#0f1117;color:white;padding:40px;line-height:1.6;}
.container{max-width:850px;background:#181b24;padding:30px;border-radius:15px;}
a{color:#ff0050;}
</style>
</head>
<body>
<div class="container">
<h1>Politique de remboursement</h1>

<p>Les abonnements CreatorPilot Pro sont facturés mensuellement.</p>

<h2>Annulation</h2>
<p>L'utilisateur peut annuler son abonnement à tout moment. L'accès Pro reste actif jusqu'à la fin de la période déjà payée.</p>

<h2>Remboursement</h2>
<p>Les demandes de remboursement peuvent être étudiées au cas par cas dans un délai de 14 jours après l'achat initial.</p>

<h2>Exceptions</h2>
<p>Un remboursement peut être refusé en cas d'abus, de fraude ou d'utilisation excessive du service après achat.</p>

<h2>Contact</h2>
<p>Pour toute demande de remboursement, contactez l'équipe CreatorPilot avec les informations liées à votre achat.</p>

<p><a href="/">Retour à CreatorPilot</a></p>
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

        console.log("CreatorPilot Pro activé");
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

        console.log("CreatorPilot Pro désactivé");
    }

    res.json({
        received: true
    });

});

const USERS_FILE = "users.json";

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, "[]");
    }

    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function hashPassword(password) {
    return crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");
}

app.post("/register", express.json(), (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email et mot de passe obligatoires" });
    }

    const users = loadUsers();

    if (users.find(user => user.email === email)) {
        return res.status(400).json({ error: "Compte déjà existant" });
    }

    const user = {
        id: crypto.randomUUID(),
        email,
        password: hashPassword(password),
        plan: "free",
        pro: false,
        createdAt: new Date().toLocaleDateString("fr-FR")
    };

    users.push(user);
    saveUsers(users);

    res.json({
        success: true,
        user: {
            id: user.id,
            email: user.email,
            plan: user.plan,
            pro: user.pro,
            createdAt: user.createdAt
        }
    });
});

app.post("/login", express.json(), (req, res) => {
    const { email, password } = req.body;

    const users = loadUsers();

    const user = users.find(
        u => u.email === email && u.password === hashPassword(password)
    );

    if (!user) {
        return res.status(401).json({ error: "Identifiants incorrects" });
    }

    res.json({
        success: true,
        user: {
            id: user.id,
            email: user.email,
            plan: user.plan,
            pro: user.pro,
            createdAt: user.createdAt
        }
    });
});

let topLikes = {};

let currentLikesGoalCount = 0;
let currentFollowGoalCount = 0;

let coinMatch = {
    active: false,
    ended: false,
    winnersShown: false,
    players: {},
    duration: 300,
    endTime: null
};

let giftBattle = {
    active: false,
    teamRed: 0,
    teamBlue: 0,
    winnersShown: false,
    winner: null,

    duration: 300,
endTime: null
};
let giftBattleGiftTeams = {
    red: [],
    blue: []
};

app.get("/coin-match/status", (req, res) => {

  let remaining = 0;

if (coinMatch.active && coinMatch.endTime) {

    remaining = Math.max(
        0,
        Math.floor(
            (coinMatch.endTime - Date.now()) / 1000
        )
    );

    if (remaining <= 0) {
    coinMatch.active = false;
    coinMatch.ended = true;
    coinMatch.winnersShown = true;

    coinMatch.winners =
        Object.entries(coinMatch.players)
    .sort((a, b) => b[1].coins - a[1].coins)
    .slice(0, 3);
}
}

res.json({
    ...coinMatch,
    remaining
});

});

app.post("/coin-match/start", (req, res) => {
    coinMatch.active = true;
    coinMatch.ended = false;
    coinMatch.winnersShown = false;
    coinMatch.players = {};

    coinMatch.endTime =
    Date.now() + (coinMatch.duration * 1000);

    res.json({ success: true, coinMatch });
});

app.post("/coin-match/end", (req, res) => {
    coinMatch.active = false;
    coinMatch.ended = true;

    res.json({ success: true, coinMatch });
});

app.post("/coin-match/reset", (req, res) => {
    coinMatch = {
        active: false,
        ended: false,
        winnersShown: false,
        players: {}
    };

    res.json({ success: true, coinMatch });
});

app.post("/coin-match/show-winners", (req, res) => {
    coinMatch.winnersShown = true;

    const winners =
    Object.entries(coinMatch.players)
    .sort((a, b) => b[1].coins - a[1].coins)
    .slice(0, 3);

coinMatch.winners = winners;

    res.json({ success: true, coinMatch });
});

app.get("/overlay/coin-match", (req, res) => {

    const bg = req.query.bg || "1f1f1f";
    const border = req.query.border || "ff0050";
    const text = req.query.text || "ffffff";
    const timerColor = req.query.timer || "35cfff";
    const shape = req.query.shape || "20";
    const scale = req.query.scale || "1";
    const sound =
    req.query.sound || "victory.mp3";

    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Coin Match Overlay</title>

<style>

.playerAvatar{
    width:55px;
    height:55px;
    border-radius:50%;
    object-fit:cover;
    margin:6px 0;
    border:2px solid gold;
}

#players{
    width:100%;
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:10px;
}

#firstPlace{
    text-align:center;
    font-size:22px;
    font-weight:bold;
}

#otherPlaces{
    width:100%;
    display:flex;
    justify-content:space-around;
}

#secondPlace,
#thirdPlace{
    text-align:center;
    font-size:18px;
    font-weight:bold;
}

#podiumArea{
    width:95%;
    height:200px;
    margin:15px auto 0 auto;

    border-radius:18px;

    background:rgba(0,0,0,0.20);

    display:flex;
    justify-content:center;
    align-items:center;
}

.coinCount{
    font-size:18px;
    font-weight:bold;
    color:#ffd700;
}

.coinIcon{
    width:20px;
    height:20px;
    vertical-align:middle;
}

body {
    margin: 0;
    background: transparent;
    color: white;
    font-family: Arial, sans-serif;
    overflow: hidden;
}

#box {
    width: 420px;
    height:300px;
    padding: 20px;
    border-radius: ${shape}px;
    background: #${bg};
    border: 2px solid #${border};
    color: #${text};
    text-align: center;
    transform: scale(${scale});
    position:relative;
top:-40px;
}

#titleBar{
    text-align:center;
    font-size:12px;
    font-weight:bold;
    color:gold;

    margin-bottom:15px;
}

h1 {
    color: #${border};
}

#timer {
    font-size: 50px;
    font-weight: bold;
    color: #${timerColor};
    margin: 15px 0;
}
    .winnerGlow {
    animation: winnerPulse 1s infinite alternate;
    text-shadow:
        0 0 15px gold,
        0 0 30px gold,
        0 0 50px gold;
}

@keyframes winnerPulse {

    from {
        transform: scale(1);
    }

    to {
        transform: scale(3);
    }

}

.confetti {
    position: absolute;
    font-size: 40px;
    animation: confettiFall 10s linear forwards;
    pointer-events: none;
}

@keyframes confettiFall {

    from {
        transform: translateY(-100px);
    }

    to {
        transform: translateY(120vh);
    }

}

</style>
</head>

<body>

<div id="titleBar">
    Coin Match
</div>

<div id="box">
    
    <div id="timer">05:00</div>
    <div id="status">En attente...</div>
    <div id="podiumArea">

    <div id="players">

    <div id="firstPlace"></div>

    <div id="otherPlaces">

        <div id="secondPlace"></div>

        <div id="thirdPlace"></div>

    </div>

</div>
</div>

<script>
async function load() {
    const response = await fetch("/coin-match/status");
    const data = await response.json();

    const status = document.getElementById("status");
    const timer = document.getElementById("timer");
    const playersDiv = document.getElementById("players");

    const remaining = data.remaining || 0;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;

    timer.innerHTML =
        mins + ":" + String(secs).padStart(2, "0");

    if (data.winnersShown && data.winners) {

    status.innerHTML =
        "🏆 WINNER 🏆";

        if (!window.confettiDone) {

    window.confettiDone = true;

    const victorySound =
    new Audio("/sounds/${sound}");

victorySound.volume = 1;

victorySound.play();

    for (let i = 0; i < 50; i++) {

        const confetti =
            document.createElement("div");

        confetti.className = "confetti";

        confetti.innerHTML =
            ["🎉", "✨", "🏆", "🪙"][Math.floor(Math.random() * 4)];

        confetti.style.left =
            Math.random() * 100 + "vw";

        confetti.style.animationDuration =
            (2 + Math.random() * 3) + "s";

        document.body.appendChild(confetti);

        setTimeout(() => {
            confetti.remove();
        }, 5000);

    }

}

    const firstPlace =
    document.getElementById("firstPlace");

const secondPlace =
    document.getElementById("secondPlace");

const thirdPlace =
    document.getElementById("thirdPlace");

firstPlace.innerHTML = "";
secondPlace.innerHTML = "";
thirdPlace.innerHTML = "";

if (players[0]) {

    firstPlace.innerHTML =

        "🥇<br>" +

        '<img class="playerAvatar" src="' +
        (players[0][1].avatar || "") +
        '">' +

        "<br>" +

        players[0][0] +

        '<div class="coinCount">' +
        players[0][1].coins +
        ' 🪙</div>';

}

if (players[1]) {

    secondPlace.innerHTML =

        "🥈<br>" +

        '<img class="playerAvatar" src="' +
        (players[1][1].avatar || "") +
        '">' +

        "<br>" +

        players[1][0] +

        '<div class="coinCount">' +
        players[1][1].coins +
        ' 🪙</div>';

}

if (players[2]) {

    thirdPlace.innerHTML =

        "🥉<br>" +

        '<img class="playerAvatar" src="' +
        (players[2][1].avatar || "") +
        '">' +

        "<br>" +

        players[2][0] +

        '<div class="coinCount">' +
        players[2][1].coins +
        ' 🪙</div>';

}

    return;
}

if (!data.winnersShown) {
    window.confettiDone = false;
}

    if (data.active) {
        status.innerHTML = "Match en cours 🔥";
    } else if (data.ended) {
        status.innerHTML = "Match terminé 🏁";
    } else {
        status.innerHTML = "En attente...";
    }

    const players =
    Object.entries(data.players || {})
        .sort((a, b) => b[1].coins - a[1].coins)
        .slice(0, 10);

    playersDiv.innerHTML = "";

    players.forEach(([user, info], index) => {

    playersDiv.innerHTML +=
        "<div style='display:flex;align-items:center;gap:10px;margin:6px;'>" +
        (
            info.avatar
                ? "<img src='" + info.avatar + "' style='width:35px;height:35px;border-radius:50%;object-fit:cover;'>"
                : ""
        ) +
        "<span>" +
        (index + 1) +
        ". " +
        user +
        " - " +
        info.coins +
        " 🪙</span></div>";

});
}

setInterval(load, 1000);
load();
</script>

</body>
</html>
    `);

});

app.post("/coin-match/duration", express.json(), (req, res) => {

    coinMatch.duration =
        Number(req.body.duration || 300);

    res.json({
        success: true,
        duration: coinMatch.duration
    });

});

app.post("/coin-match/test-gift", (req, res) => {

    const user = "TestUser";
    const coins = 100;
    const avatar = "https://placehold.co/80x80";

    if (!coinMatch.players[user]) {
        coinMatch.players[user] = {
            coins: 0,
            avatar: avatar
        };
    }

    coinMatch.players[user].coins += coins;

    res.json({ success: true, coinMatch });

});

app.get("/gift-battle/status", (req, res) => {

    let remaining = 0;

    if (
        giftBattle.active &&
        giftBattle.endTime
    ) {

        remaining = Math.max(
            0,
            Math.floor(
                (giftBattle.endTime - Date.now()) / 1000
            )
        );

        if (remaining <= 0) {

            giftBattle.active = false;
            giftBattle.winnersShown = true;

            if (giftBattle.teamRed > giftBattle.teamBlue) {
                giftBattle.winner = "red";
            }
            else if (giftBattle.teamBlue > giftBattle.teamRed) {
                giftBattle.winner = "blue";
            }
            else {
                giftBattle.winner = "draw";
            }
        }
    }

    res.json({
        ...giftBattle,
        remaining
    });

});

app.post("/gift-battle/start", (req, res) => {

    giftBattle.active = true;
    giftBattle.winnersShown = false;
    giftBattle.winner = null;

    giftBattle.teamRed = 0;
    giftBattle.teamBlue = 0;

    giftBattle.endTime =
        Date.now() + (giftBattle.duration * 1000);

    res.json({
        success: true,
        giftBattle
    });

});

app.post("/gift-battle/end", (req, res) => {

    giftBattle.active = false;
    giftBattle.winnersShown = true;

    if (giftBattle.teamRed > giftBattle.teamBlue) {
        giftBattle.winner = "red";
    } else if (giftBattle.teamBlue > giftBattle.teamRed) {
        giftBattle.winner = "blue";
    } else {
        giftBattle.winner = "draw";
    }

    res.json({ success: true, giftBattle });

});

app.post("/gift-battle/reset", (req, res) => {
    giftBattle = {
        active: false,
        teamRed: 0,
        teamBlue: 0,
        winnersShown: false
    };

    res.json({ success: true, giftBattle });
});

app.get("/overlay/gift-battle", (req, res) => {

    const redName =
    req.query.redName || "Team 1";

const blueName =
    req.query.blueName || "Team 2";

const redColor =
    req.query.redColor || "ff2a2a";

const blueColor =
    req.query.blueColor || "1b8cff";

    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">

<style>

body{
    margin:0;
    background:transparent;
    overflow:hidden;
    font-family:Arial;
}

#battleTimer{
    text-align:center;
    font-size:42px;
    font-weight:bold;
    color:white;
    margin-bottom:15px;
}

#container{
    width:100%;
    max-width:520px;
    margin:0 auto;
    padding-top:20px;
    display:flex;
    flex-direction:column;
    gap:12px;
}


.team{
    width:calc(80% - 20px);
    margin:0 auto;
    padding:15px;
    border-radius:18px;
    text-align:center;
    color:white;
    box-sizing:border-box;
}

.red{
    background:#${redColor};
}

.blue{
    background:#${blueColor};
}

.score{
    font-size:60px;
    font-weight:bold;
}

.name{
    font-size:32px;
    margin-bottom:15px;
}

.battleWinnerGlow{
    animation:winnerPulse 1s infinite alternate;
    text-shadow:
        0 0 10px gold,
        0 0 25px gold,
        0 0 45px gold;
}

@keyframes winnerPulse{
    from{ transform:scale(1); }
    to{ transform:scale(1.08); }
}

</style>

</head>

<body>

<div id="battleTimer">
    05:00
</div>

<div id="container">

    <div class="team red">

  <div class="name" id="redName">
    🔴 ${redName}
</div>

        <div class="score" id="redScore">
    0
</div>

    </div>

    <div class="team blue">

        <div class="name" id="blueName">
    🔵 ${blueName}
</div>

        <div class="score" id="blueScore">
    0
</div>

    </div>

</div>

<script>

async function load() {

    const response =
        await fetch("/gift-battle/status");

    const data =
        await response.json();

        const timerEl =
    document.getElementById("battleTimer");

const mins =
    Math.floor((data.remaining || 0) / 60);

const secs =
    (data.remaining || 0) % 60;

if (timerEl) {

    timerEl.innerHTML =
        mins + ":" +
        String(secs).padStart(2, "0");

}

    const redScoreEl = document.getElementById("redScore");
const blueScoreEl = document.getElementById("blueScore");

if (redScoreEl) {
    redScoreEl.innerHTML = data.teamRed;
}

if (blueScoreEl) {
    blueScoreEl.innerHTML = data.teamBlue;
}

        if (data.winnersShown) {

    if (data.winner === "red") {
        document.getElementById("redName").classList.add("battleWinnerGlow");
document.getElementById("redName").innerHTML =
    "🏆 WINNER ";
    }

    if (data.winner === "blue") {
        document.getElementById("blueName").classList.add("battleWinnerGlow");
document.getElementById("blueName").innerHTML =
    "🏆 WINNER ";
    }

    if (data.winner === "draw") {
    const redNameEl = document.getElementById("redName");
    const blueNameEl = document.getElementById("blueName");

    if (redNameEl) {
        redNameEl.innerHTML = "🤝 ÉGALITÉ";
    }

    if (blueNameEl) {
        blueNameEl.innerHTML = "🤝 ÉGALITÉ";
    }
}

}

}

setInterval(load, 1000);
load();

</script>

</body>
</html>
    `);

});

app.post("/gift-battle/test-red", (req, res) => {

    giftBattle.teamRed += 100;

    res.json({
        success: true,
        giftBattle
    });

});

app.post("/gift-battle/test-blue", (req, res) => {

    giftBattle.teamBlue += 100;

    res.json({
        success: true,
        giftBattle
    });

});

app.post("/gift-battle/duration", express.json(), (req, res) => {

    giftBattle.duration =
        Number(req.body.duration || 300);

    res.json({
        success: true,
        duration: giftBattle.duration
    });

});

app.get("/gift-battle/gift-teams", (req, res) => {
    res.json(giftBattleGiftTeams);
});

app.post("/gift-battle/gift-teams", express.json(), (req, res) => {

    giftBattleGiftTeams = {
        red: req.body.red || [],
        blue: req.body.blue || []
    };

    res.json({
        success: true,
        giftBattleGiftTeams
    });

});

app.get("/top-likes/status", (req, res) => {

    const ranking =
        Object.entries(topLikes)
            .sort((a, b) => b[1].likes - a[1].likes)
            .slice(0, 10);

    res.json({
        ranking
    });

});

app.get("/overlay/top-likes", (req, res) => {

    const font = req.query.font || "Arial";
    const fontSize = req.query.fontSize || "24";
    const nameColor = req.query.nameColor || "ffffff";
    const likesColor = req.query.likesColor || "ff4d6d";
    const rankColor = req.query.rankColor || "ffd700";
    const showAvatar = req.query.showAvatar !== "false";
    const showCrown = req.query.showCrown !== "false";
    const showHeart = req.query.showHeart !== "false";

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">

<style>
body{
    margin:0;
    background:transparent;
    overflow:hidden;
    font-family:${font};
    font-size:${fontSize}px;
}

#box{
    width:100%;
    height:100%;
    box-sizing:border-box;
    padding:20px;
    border-radius:20px;
    background:#1f1f1f;
    border:2px solid #fd9902;
    color:white;
    font-family:${font};
}

#title{
    text-align:center;
    font-size:${Number(fontSize) + 6}px;
    font-weight:bold;
    margin-bottom:15px;
    color:#${rankColor};
}

.player{
    display:flex;
    justify-content:space-between;
    margin:8px 0;
    font-size:${fontSize}px;
}

.playerName{
    color:#${nameColor};
}

.likes{
    color:#${likesColor};
    font-weight:bold;
}

#firstLike{
    text-align:center;
    font-size:${Number(fontSize) + 4}px;
    font-weight:bold;
    margin-bottom:15px;
    color:#${nameColor};
}

#secondLike,
#thirdLike{
    text-align:center;
    font-size:${fontSize}px;
    font-weight:bold;
    color:#${nameColor};
}

.topAvatar{
    width:90px;
    height:90px;
    border-radius:50%;
    object-fit:cover;
    border:3px solid gold;
    margin:8px 0;
    display:${showAvatar ? "inline-block" : "none"};
}

#otherLikes{
    display:flex;
    justify-content:space-around;
}
</style>
</head>

<body>

<div id="box">
    <div id="title">
        ${showHeart ? "❤️ " : ""}Top J'aime
    </div>

    <div id="topPodium">
        <div id="firstLike"></div>

        <div id="otherLikes">
            <div id="secondLike"></div>
            <div id="thirdLike"></div>
        </div>
    </div>

    <div id="ranking"></div>
</div>

<script>
async function load() {
    const response = await fetch("/top-likes/status");
    const data = await response.json();

    const ranking = document.getElementById("ranking");
    const firstLike = document.getElementById("firstLike");
    const secondLike = document.getElementById("secondLike");
    const thirdLike = document.getElementById("thirdLike");

    ranking.innerHTML = "";
    firstLike.innerHTML = "";
    secondLike.innerHTML = "";
    thirdLike.innerHTML = "";

    if (data.ranking[0]) {
        firstLike.innerHTML =
            "${showCrown ? "👑<br>" : ""}" +
            "<img class='topAvatar' src='" + (data.ranking[0][1].avatar || "") + "'>" +
            "<br>" +
            data.ranking[0][0] +
            "<br><span class='likes'>${showHeart ? "❤️ " : ""}" +
            data.ranking[0][1].likes +
            "</span>";
    }

    if (data.ranking[1]) {
        secondLike.innerHTML =
            "🥈<br>" +
            data.ranking[1][0] +
            "<br><span class='likes'>${showHeart ? "❤️ " : ""}" +
            data.ranking[1][1].likes +
            "</span>";
    }

    if (data.ranking[2]) {
        thirdLike.innerHTML =
            "🥉<br>" +
            data.ranking[2][0] +
            "<br><span class='likes'>${showHeart ? "❤️ " : ""}" +
            data.ranking[2][1].likes +
            "</span>";
    }

    data.ranking.slice(3).forEach((player, index) => {
        ranking.innerHTML +=
            "<div class='player'>" +
            "<span class='playerName'>" +
            (index + 4) + ". " + player[0] +
            "</span>" +
            "<span class='likes'>${showHeart ? "❤️ " : ""}" +
            player[1].likes +
            "</span>" +
            "</div>";
    });
}

setInterval(load, 1000);
load();
</script>

</body>
</html>
`);
});



app.post("/top-likes/test", (req, res) => {

    const user = "TestUser";

    if (!topLikes[user]) {
        topLikes[user] = {
            likes: 0,
            avatar: "https://placehold.co/80x80"
        };
    }

    topLikes[user].likes += 100;

    res.json({
        success: true,
        topLikes
    });

});

let chrono = {
    active: false,
    duration: 300,
    remaining: 300,
    endTime: null,

    settings: {
        defaultMinutes: 5,

        perCoin: 0,
        perSubscribe: 500,
        perFollow: 60,
        perShare: 0,
        perLike: 0,
        perChat: 0,

        giftAutoEnabled: true,
        giftMode: "add",
        secondsPerCoin: 1,

        font: "Arial",
        fontSize: 42,
        letterSpacing: 4,
        textColor: "#b700ff",
        bgColor: "#ff7b00"
    }
};

let actionWheel = {
    spinning: false,

    settings: {
        title: "Roue des actions",

        mainColor: "#ff0050",
        secondColor: "#00f2ea",
        textColor: "#ffffff",

        spinDuration: 5,

        actions: [
            "10 Pompes",
            "Boire de l'eau",
            "Danser 30 sec",
            "Chanter",
            "Choix du chat"
        ]
    },

    winner: ""
};

if (settings.actionWheel) {
    actionWheel = settings.actionWheel;
}

function getChronoRemaining() {
    if (chrono.active && chrono.endTime) {
        const remaining = Math.max(
            0,
            Math.floor((chrono.endTime - Date.now()) / 1000)
        );

        if (remaining <= 0) {
            chrono.active = false;
            chrono.remaining = 0;
            chrono.endTime = null;
            return 0;
        }

        return remaining;
    }

    return chrono.remaining;
}

function setChronoRemaining(seconds) {
    chrono.remaining = Math.max(0, Number(seconds || 0));

    if (chrono.active) {
        chrono.endTime = Date.now() + chrono.remaining * 1000;
    }
}

function applyChronoTime(seconds) {

    seconds = Number(seconds || 0);

    if (seconds <= 0) {
        return;
    }

    chrono.remaining = getChronoRemaining();

    if (chrono.settings.giftMode === "remove") {
        setChronoRemaining(chrono.remaining - seconds);
    } else {
        setChronoRemaining(chrono.remaining + seconds);
    }

}

app.get("/chrono/status", (req, res) => {
    chrono.remaining = getChronoRemaining();

    res.json({
        active: chrono.active,
        remaining: chrono.remaining,
        settings: chrono.settings
    });
});

app.get("/action-wheel/status", (req, res) => {

    res.json(actionWheel);

});

app.get("/overlay/action-wheel", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{
    margin:0;
    background:transparent;
    overflow:hidden;
    display:flex;
    justify-content:center;
    align-items:center;
    height:100vh;
    font-family:Arial;
}

#wheel{
    width:240px;
    height:240px;
    border-radius:50%;
    border:8px solid #ffffff;
    position:relative;
    overflow:hidden;
    transition:transform 10s ease-out;
    box-shadow:
        0 0 20px rgba(255,255,255,0.2),
        0 0 50px rgba(255,0,80,0.4);
}

#wheelWinner{
    position:absolute;
    bottom:25px;
    left:50%;
    transform:translateX(-50%);
    color:white;
    background:rgba(0,0,0,0.75);
    border:2px solid #ff0050;
    border-radius:15px;
    padding:15px 30px;
    font-size:34px;
    font-weight:bold;
    text-align:center;
    display:none;
    z-index:20;
    box-shadow:0 0 20px rgba(255,0,80,0.7);
}

#segmentLabels{
    position:absolute;
    inset:0;
    border-radius:50%;
}

.segmentLabel{
    position:absolute;
    left:50%;
    top:50%;
    transform-origin:0 0;
    color:white;
    font-size:13px
    font-weight:bold;
    text-shadow:0 0 4px black;
    width:90px;
     letter-spacing:0;
    line-height:1;
}

#pointer{
    position:absolute;
    top:15px;
    left:50%;
    transform:translateX(-50%);
    width:0;
    height:0;
    border-left:18px solid transparent;
    border-right:18px solid transparent;
    border-top:35px solid #ff0050;
    z-index:10;
    filter:drop-shadow(0 0 8px #000);
}
</style>
</head>
<body>

<div id="pointer"></div>

<div id="wheel">
    <div id="segmentLabels"></div>
</div>

<div id="wheelWinner"></div>

<audio id="wheelSpinSound" src="/sounds/wheel-spin.mp3"></audio>

<script>
let wasSpinning = false;

async function load(){
    const response = await fetch("/action-wheel/status");
    const data = await response.json();
    const settings = data.settings || {};

    const wheel = document.getElementById("wheel");
    wheel.style.fontFamily =
    settings.font || "Arial";

    wheel.style.transition =
    "transform " +
    (settings.spinDuration || 10) +
    "s ease-out";


    const labels = document.getElementById("segmentLabels");
    const winnerBox = document.getElementById("wheelWinner");
    const spinSound = document.getElementById("wheelSpinSound");

    const activeWheel =
        (settings.wheels || []).find(w => w.enabled) ||
        (settings.wheels || [])[0] ||
        null;

    const actions =
        activeWheel && activeWheel.segments
            ? activeWheel.segments
            : [];

    if (actions.length > 0) {
        const angle = 360 / actions.length;
        let gradient = [];

        actions.forEach((action, index) => {
            const start = index * angle;
            const end = (index + 1) * angle;

            gradient.push(
                (action.color || "#ff0050") +
                " " +
                start +
                "deg " +
                end +
                "deg"
            );
        });

        wheel.style.background =
            "conic-gradient(" +
            gradient.join(",") +
            ")";

        labels.innerHTML = "";

        actions.forEach((action, index) => {
            const label = document.createElement("div");

            label.className = "segmentLabel";
            label.innerHTML = action.text || "";

            const rotation =
    (index * angle) + (angle / 2) - 90;

            label.style.transform =
    "rotate(" + rotation + "deg) translate(65px, -8px)";
                
            labels.appendChild(label);
        });

        if (data.spinning && !wasSpinning) {
            if (spinSound.paused) {
                spinSound.currentTime = 0;
                spinSound.play().catch(() => {});
            }

            const winnerIndex =
                data.winnerIndex || 0;

            const targetAngle =
    270 - (winnerIndex * angle + angle / 2);

            const finalRotation =
                1800 + targetAngle;

            wheel.style.transform =
                "rotate(" + finalRotation + "deg)";
        }

    } else {
        wheel.style.background =
            "conic-gradient(#ff0050 0deg 180deg, #00f2ea 180deg 360deg)";

        labels.innerHTML = "";
    }

    if (data.winner) {
        winnerBox.innerHTML =
            typeof data.winner === "object"
                ? data.winner.text
                : data.winner;

        winnerBox.style.display = "block";
    } else {
        winnerBox.style.display = "none";
    }

    wasSpinning = data.spinning;
}

setInterval(load, 1000);
load();
</script>

</body>
</html>
`);
});

app.post(
    "/action-wheel/settings",
    express.json(),
    (req, res) => {

        actionWheel.settings = req.body;

        settings.actionWheel =
            actionWheel;

        saveSettingsFile();

        res.json({
            success: true
        });

    }
);

app.post("/action-wheel/spin", (req, res) => {

    actionWheel.spinning = true;
    actionWheel.winner = "";

    const activeWheel =
        (actionWheel.settings.wheels || []).find(w => w.enabled) ||
        (actionWheel.settings.wheels || [])[0] ||
        null;

    const actions =
        activeWheel && activeWheel.segments
            ? activeWheel.segments
            : [];

    let winnerText = "";
let winnerIndex = 0;

    if (actions.length > 0) {

        winnerIndex =
    Math.floor(
        Math.random() * actions.length
    );

const winnerSegment =
    actions[winnerIndex];

winnerText =
    winnerSegment.text || "";
    
    actionWheel.winnerIndex =
    winnerIndex;

actionWheel.winner =
    "";
    }


    setTimeout(() => {

        actionWheel.winner =
            winnerText;

            actionWheel.winnerIndex =
    winnerIndex;

        actionWheel.spinning =
            false;

            executeActionByName(winnerText);

    }, 5000);

    res.json({
    success: true,
    winner: winnerText,
    winnerIndex: winnerIndex
});

});


app.post("/chrono/start", (req, res) => {
    chrono.duration =
        Number(chrono.settings.defaultMinutes || 5) * 60;

    chrono.remaining = chrono.duration;
    chrono.active = true;
    chrono.endTime = Date.now() + chrono.remaining * 1000;

    res.json({
        success: true,
        chrono
    });
});

app.post("/chrono/pause", (req, res) => {
    chrono.remaining = getChronoRemaining();
    chrono.active = false;
    chrono.endTime = null;

    res.json({
        success: true,
        chrono
    });
});

app.post("/chrono/resume", (req, res) => {
    chrono.remaining = getChronoRemaining();

    if (chrono.remaining > 0) {
        chrono.active = true;
        chrono.endTime = Date.now() + chrono.remaining * 1000;
    }

    res.json({
        success: true,
        chrono
    });
});

app.post("/chrono/reset", (req, res) => {
    chrono.duration =
        Number(chrono.settings.defaultMinutes || 5) * 60;

    chrono.remaining = chrono.duration;
    chrono.active = false;
    chrono.endTime = null;

    res.json({
        success: true,
        chrono
    });
});

app.post("/chrono/increase", express.json(), (req, res) => {
    chrono.remaining = getChronoRemaining();

    const seconds = Number(req.body.seconds || 60);

    setChronoRemaining(chrono.remaining + seconds);

    res.json({
        success: true,
        chrono
    });
});

app.post("/chrono/decrease", express.json(), (req, res) => {
    chrono.remaining = getChronoRemaining();

    const seconds = Number(req.body.seconds || 60);

    setChronoRemaining(chrono.remaining - seconds);

    res.json({
        success: true,
        chrono
    });
});

app.post("/chrono/settings", express.json(), (req, res) => {

    chrono.settings = {

    defaultMinutes:
        Number(req.body.defaultMinutes || 5),

    perCoin:
        Number(req.body.perCoin || 0),

    perSubscribe:
        Number(req.body.perSubscribe || 0),

    perFollow:
        Number(req.body.perFollow || 0),

    perShare:
        Number(req.body.perShare || 0),

    perLike:
        Number(req.body.perLike || 0),

    perChat:
        Number(req.body.perChat || 0),

    giftAutoEnabled:
        req.body.giftAutoEnabled !== false,

    giftMode:
        req.body.giftMode || "add",

    secondsPerCoin:
        Number(req.body.secondsPerCoin || 1),

    font:
        req.body.font || "Arial",

    fontSize:
        Number(req.body.fontSize || 42),

    letterSpacing:
        Number(req.body.letterSpacing || 4),

    textColor:
        req.body.textColor || "#b700ff",

    bgColor:
        req.body.bgColor || "#2b2b2b"
};

settings.chrono = chrono;

saveSettingsFile();

    chrono.duration =
        chrono.settings.defaultMinutes * 60;

    if (!chrono.active) {
        chrono.remaining = chrono.duration;
    }

    res.json({
        success: true,
        chrono
    });

});

app.post("/chrono/test-gift", (req, res) => {

    const giftCoins = 100;

    if (
        chrono.settings.giftAutoEnabled &&
        chrono.settings.giftMode !== "off"
    ) {
        const secondsToChange =
            giftCoins * Number(chrono.settings.secondsPerCoin || 1);

        chrono.remaining = getChronoRemaining();

        if (chrono.settings.giftMode === "remove") {
            setChronoRemaining(chrono.remaining - secondsToChange);
        } else {
            setChronoRemaining(chrono.remaining + secondsToChange);
        }
    }

    res.json({
        success: true,
        chrono
    });

});

app.get("/overlay/chrono", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link
href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&family=Orbitron:wght@400;700&display=swap"
rel="stylesheet">
<style>
body{
    margin:0;
    background:transparent;
    overflow:hidden;
    font-family:Arial, sans-serif;
    text-align:center;
}

#timer{
    display:inline-block;
    padding:8px 16px;
    border-radius:10px;
}
</style>
</head>
<body>

<div id="timer">00:05:00</div>

<script>
async function load(){

    const response =
        await fetch("/chrono/status");

    const data =
        await response.json();

    const remaining =
        data.remaining || 0;

    const settings =
        data.settings || {};

    const timer =
        document.getElementById("timer");

    timer.style.fontFamily =
        settings.font || "Arial";

    timer.style.fontSize =
        (settings.fontSize || 42) + "px";

    timer.style.letterSpacing =
        (settings.letterSpacing || 4) + "px";

    timer.style.color =
        settings.textColor || "#b700ff";

    timer.style.background =
        settings.bgColor || "#2b2b2b";

    const h =
        Math.floor(remaining / 3600);

    const m =
        Math.floor((remaining % 3600) / 60);

    const s =
        remaining % 60;

    timer.innerHTML =
        String(h).padStart(2, "0") + ":" +
        String(m).padStart(2, "0") + ":" +
        String(s).padStart(2, "0");
}

setInterval(load, 1000);
load();
</script>

</body>
</html>
`);
});

let socialPanel = {
   
    settings: {
        font: "Arial",
        fontSize: 45,
        letterSpacing: 2,
        fontColor: "#000000",
        bgColor: "#00ff4d",
        animation: "fade",
        displayTime: 4,
        pauseTime: 1,
        fields: []
    }
};

app.get("/social-panel/status", (req, res) => {
    res.json(socialPanel);
});

app.post("/social-panel/settings", express.json(), (req, res) => {
    socialPanel.settings = req.body;
    res.json({
        success: true,
        socialPanel
    });
});

app.get("/overlay/social-panel", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{
    margin:0;
    background:transparent;
    overflow:hidden;
    font-family:Arial;

    display:flex;
    justify-content:center;
    align-items:center;

    width:100vw;
    height:100vh;
}

#socialBox{
    display:none;
    padding:12px 25px;
    border-radius:12px;
    font-weight:bold;
    align-items:center;
    gap:15px;
    width:max-content;
    margin:auto;
}

.icon{
    width:58px;
    height:58px;
    border-radius:14px;
    display:flex;
    justify-content:center;
    align-items:center;
}

.icon img{
    width:32px;
    height:32px;
    object-fit:contain;
}

.fade{
    animation:fadeIn 0.5s ease;
}

.slide{
    animation:slideIn 0.5s ease;
}

@keyframes fadeIn{
    from{opacity:0;}
    to{opacity:1;}
}

@keyframes slideIn{
    from{transform:translateX(-100px);opacity:0;}
    to{transform:translateX(0);opacity:1;}
}
</style>
</head>
<body>

<div id="socialBox">
    <span class="icon" id="icon"></span>
    <span id="text"></span>
</div>

<script>
let index = 0;

const icons = {
    TikTok: "tiktok",
    Twitch: "twitch",
    YouTube: "youtube",
    Instagram: "instagram",
    Discord: "discord",
    Kick: "kick"
};

async function loadSocial() {
    const response = await fetch("/social-panel/status");
    const data = await response.json();

    const box = document.getElementById("socialBox");
    const icon = document.getElementById("icon");
    const text = document.getElementById("text");

if (
    !data.settings ||
    !data.settings.fields ||
    data.settings.fields.length === 0
) {
    box.style.display = "none";
    return;
}

    const settings = data.settings;
   const field =
    settings.fields[index % settings.fields.length];

if (!field) {
    box.style.display = "none";
    return;
}

    box.style.display = "inline-flex";
    box.style.fontFamily = settings.font;
    box.style.fontSize = settings.fontSize + "px";
    box.style.letterSpacing = settings.letterSpacing + "px";
    box.style.color = settings.fontColor;
    box.style.background = settings.bgColor;

    box.className = settings.animation;

    icon.style.color = field.iconColor;
    icon.style.background = field.iconBg;
const iconColor =
    (field.iconColor || "#ffffff").replace("#", "");

icon.innerHTML =
    "<img src='https://cdn.simpleicons.org/" +
    icons[field.platform] +
    "/" +
    iconColor +
    "' style='width:30px;height:30px;'>";
    text.innerHTML = field.username || "";

    index++;
}

setInterval(loadSocial, 4000);
loadSocial();
</script>

</body>
</html>
`);
});

app.get("/overlay/webcam-simple", (req, res) => {

    const webcam =
    settings.webcamSimple || {};

    const color =
        webcam.color || "#35cfff";

    const border =
        webcam.border || 6;

    const radius =
        webcam.radius || 12;

    const glow =
        webcam.glow !== false;

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{
    margin:0;
    background:transparent;
    overflow:hidden;
}

#frame{
    width:500px;
    height:300px;
    border:${border}px solid ${color};
    border-radius:${radius}px;
    box-shadow:${glow ? `0 0 20px ${color}` : "none"};
}
</style>
</head>
<body>

<div id="frame"></div>

</body>
</html>
`);
});
app.get("/overlay/webcam-custom", (req, res) => {

    const custom =
        (settings && settings.webcamCustom)
            ? settings.webcamCustom
            : {};

    const style =
        custom.style || "neon";

    let borderColor = "#00f2ea";
    let radius = 22;
    let shadow = "0 0 15px #00f2ea, 0 0 35px #00f2ea";

    if (style === "gaming") {
        borderColor = "#00ff00";
        radius = 6;
        shadow = "0 0 20px #00ff00";
    }

    if (style === "tiktok") {
        borderColor = "#ff0050";
        radius = 18;
        shadow = "0 0 15px #ff0050, 0 0 25px #00f2ea";
    }

    if (style === "rgb") {
        borderColor = "#ffffff";
        radius = 20;
        shadow = "0 0 15px red, 0 0 25px blue, 0 0 35px lime";
    }

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{
    margin:0;
    background:transparent;
    overflow:hidden;
}

.frame{
    width:500px;
    height:300px;
    border:6px solid ${borderColor};
    border-radius:${radius}px;
    box-shadow:${shadow};
}
</style>
</head>
<body>
<div class="frame"></div>
</body>
</html>
`);
});
app.get("/overlay/likes-goal", (req, res) => {

   const likes =
    settings.likesGoal || {};

    const text =
        likes.text || "Objectif Likes";

    const target =
        likes.target || 10000;

    const textColor =
        likes.textColor || "#00ff22";

    const progressColor =
        likes.progressColor || "#ea00ff";

    const remainingColor =
        likes.remainingColor || "#010300";

    const barColor =
        likes.barColor || "#baff4a";

    const font =
        likes.font || "Arial";

    const fontSize =
        likes.fontSize || 28;
       
        const showProgress =
    likes.showProgress !== false;

const variation =
    likes.variation || "Clean Néon";

let borderStyle = `4px solid ${barColor}`;
let shadowStyle = "none";

if (variation === "Clean Néon") {
    borderStyle = "4px solid #baff4a";
    shadowStyle = "0 0 8px #baff4a, 0 0 15px #00eaff";
}

if (variation === "Néon Rose") {
    borderStyle = "4px solid #ff00ff";
    shadowStyle = "0 0 10px #ff00ff, 0 0 25px #ff00ff";
}

if (variation === "Néon Bleu") {
    borderStyle = "4px solid #00eaff";
    shadowStyle = "0 0 10px #00eaff, 0 0 25px #00eaff";
}

if (variation === "TikTok") {
    borderStyle = "4px solid #ff0050";
    shadowStyle = "0 0 10px #ff0050, 0 0 25px #00f2ea";
}

     
    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>

body{
    margin:0;
    background:transparent;
    overflow:hidden;
}

#likesGoal{
    color:${textColor};
    font-family:${font};
    font-size:${fontSize}px;
    border:${borderStyle};
box-shadow:${shadowStyle};
    border-radius:12px;
    padding:14px 20px;
    background:${remainingColor};
    display:inline-block;
}

.bar{
    width:100%;
    height:14px;
    margin-top:10px;
    border:2px solid ${barColor};
    border-radius:20px;
    overflow:hidden;
}

.fill{
    width:0%;
    height:100%;
    background:${progressColor};
}

</style>
</head>
<body>

<div id="likesGoal">

   <div id="likesGoalText">
    ${showProgress ? `${text} : 0 / ${target} (0%)` : text}
</div>

    ${showProgress ? `
<div class="bar">
    <div class="fill"></div>
</div>
` : ""}

</div>
<script>
async function updateLikesGoal(){

    const response =
        await fetch("/likes-goal/status");

    const data =
        await response.json();

    const current =
        Number(data.likes || 0);

    const target =
        Number("${target}" || 10000);

    const percent =
        Math.min(
            100,
            Math.round((current / target) * 100)
        );

    document.getElementById("likesGoalText").innerHTML =
        "${text} : " +
        current +
        " / " +
        target +
        " (" +
        percent +
        "%)";

    const fill =
    document.querySelector(".fill");

if (fill) {
    fill.style.width =
        percent + "%";
}
}

setInterval(updateLikesGoal, 1000);
updateLikesGoal();
</script>
</body>
</html>
`);
});

app.get("/likes-goal/status", (req, res) => {
    res.json({
        likes: currentLikesGoalCount || 0
    });
});


app.get("/overlay/follow-goal", (req, res) => {


    const follow =
       Settings.followGoal || {};

    const text =
        follow.text || "Objectif Abonnés";

    const target =
        follow.target || 100;

    const textColor =
    follow.textColor || "#00ff22";

const progressColor =
    follow.progressColor || "#ea00ff";

    const remainingColor =
        follow.remainingColor || "#010300";

    const barColor =
        follow.barColor || "#baff4a";

    const font =
        follow.font || "Arial";

    const fontSize =
        follow.fontSize || 28;

        const showProgress =
    follow.showProgress !== false;

        const variation =
    follow.variation || "Clean Néon";

let borderStyle = `4px solid ${barColor}`;
let shadowStyle = "none";

if (variation === "Clean Néon") {
    borderStyle = "4px solid #baff4a";
    shadowStyle = "0 0 8px #baff4a, 0 0 15px #00eaff";
}

if (variation === "Néon Rose") {
    borderStyle = "4px solid #ff00ff";
    shadowStyle = "0 0 10px #ff00ff, 0 0 25px #ff00ff";
}

if (variation === "Néon Bleu") {
    borderStyle = "4px solid #00eaff";
    shadowStyle = "0 0 10px #00eaff, 0 0 25px #00eaff";
}

if (variation === "TikTok") {
    borderStyle = "4px solid #ff0050";
    shadowStyle = "0 0 10px #ff0050, 0 0 25px #00f2ea";
}

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{
    margin:0;
    background:transparent;
    overflow:hidden;
}

#followGoal{
box-shadow:${shadowStyle};
    color:${textColor};
    font-family:${font};
    font-size:${fontSize}px;
    border:${borderStyle};
    border-radius:12px;
    padding:14px 20px;
    background:${remainingColor};
    display:inline-block;
}

.bar{
    width:100%;
    height:14px;
    margin-top:10px;
    border:2px solid ${barColor};
    border-radius:20px;
    overflow:hidden;
}

.fill{
    width:0%;
    height:100%;
    background:${progressColor};
}
</style>
</head>
<body>

<div id="followGoal">

    <div id="followGoalText">
        ${text} : 0 / ${target} (0%)
    </div>

    ${showProgress ? `
<div class="bar">
    <div class="fill"></div>
` : ""}

</div>

<script>
async function updateFollowGoal(){

    const response =
        await fetch("/follow-goal/status");

    const data =
        await response.json();

    const current =
        Number(data.follows || 0);

    const target =
        Number("${target}" || 100);

    const percent =
        Math.min(
            100,
            Math.round((current / target) * 100)
        );

    document.getElementById("followGoalText").innerHTML =
        "${text} : " +
        current +
        " / " +
        target +
        " (" +
        percent +
        "%)";

    const fill =
        document.querySelector(".fill");

    if (fill) {
        fill.style.width =
            percent + "%";
    }

}

setInterval(updateFollowGoal, 1000);
updateFollowGoal();
</script>

</body>
</html>
`);
});

app.get("/follow-goal/status", (req, res) => {

    res.json({
        follows: currentFollowGoalCount || 0
    });

});

app.get("/overlay/banner", (req, res) => {


    const banner =
        Settings.banner || {};

    const text =
        banner.text || "Bienvenue sur mon live !";

    const speed =
        banner.speed || 20;

    const textColor =
        banner.textColor || "#ffffff";

    const bgColor =
        banner.bgColor || "#ff0050";

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>

body{
    margin:0;
    background:transparent;
    overflow:hidden;
}

#banner{
    width:100vw;
    overflow:hidden;
    white-space:nowrap;

    background:${bgColor};
    color:${textColor};

    padding:12px 0;

    font-size:28px;
    font-weight:bold;
}

#banner span{
    display:inline-block;
    padding-left:100%;
    animation:scroll ${speed}s linear infinite;
}

@keyframes scroll{

    from{
        transform:translateX(0);
    }

    to{
        transform:translateX(-100%);
    }

}

</style>
</head>
<body>

<div id="banner">
    <span>${text}</span>
</div>

</body>
</html>
`);
});

server.listen(3000, () => {
    console.log("CreatorPilot lancé");
});