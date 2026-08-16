const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { exec } = require("child_process");
const { WebcastPushConnection } = require("tiktok-live-connector");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");
const RESET_TOKENS_FILE =
    "resetTokens.json";
const path = require("path");
const DATA_DIR =
    process.env.APPDATA
        ? path.join(process.env.APPDATA, "CreatorPilot")
        : __dirname;

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const STATS_FILE = path.join(DATA_DIR, "stats.json");
const RANKINGS_FILE = path.join(DATA_DIR, "rankings.json");
const Stripe = require("stripe");
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

async function initDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS pro_users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            pro BOOLEAN DEFAULT false,
            source TEXT DEFAULT 'manual',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);

    console.log("Base PostgreSQL prête");
}

if (process.env.DATABASE_URL) {
    initDatabase().catch(console.error);
} else {
    console.log("PostgreSQL désactivé en local");
}
if (process.env.DATABASE_URL) {
    pool.query("SELECT NOW()")
        .then(result => {
            console.log("PostgreSQL connecté :", result.rows[0]);
        })
        .catch(error => {
            console.error("Erreur PostgreSQL :", error);
        });
}

const stripeSecretKey =
    process.env.STRIPE_SECRET_KEY || "";

const stripe =
    stripeSecretKey
        ? Stripe(stripeSecretKey)
        : null;


const app = express();
const server = http.createServer(app);
const io = new Server(server);

/*
   Chaque navigateur/application rejoint une room privée.
   Les événements TikTok d'un client ne sont envoyés qu'à sa room.
*/
io.on("connection", socket => {

    socket.on("register-client", payload => {

        const clientId =
            String(payload?.clientId || "")
                .trim();

        if (!clientId) {
            return;
        }

        socket.join(
            "client:" + clientId
        );

        socket.data.creatorPilotClientId =
            clientId;

        console.log(
            "Client CreatorPilot enregistré :",
            clientId
        );
    });

});


app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});

/*
   ============================================================
   SESSION PAR CLIENT
   Chaque visiteur reçoit un identifiant stable stocké dans un
   cookie. Utilisé pour isoler les réglages de chaque client.
   ============================================================
*/

function cpParseCookies(req) {

    const raw =
        req.headers.cookie || "";

    const cookies = {};

    raw.split(";").forEach(pair => {

        const idx =
            pair.indexOf("=");

        if (idx === -1) {
            return;
        }

        const key =
            pair.slice(0, idx).trim();

        const value =
            pair.slice(idx + 1).trim();

        if (key) {
            cookies[key] = decodeURIComponent(value);
        }

    });

    return cookies;

}

app.use((req, res, next) => {

    const cookies =
        cpParseCookies(req);

    let sessionId =
        cookies.cp_session;

    if (!sessionId) {

        sessionId =
            crypto.randomUUID();

        res.setHeader(
            "Set-Cookie",
            "cp_session=" + sessionId +
            "; Path=/; Max-Age=31536000; SameSite=Lax"
        );

    }

    req.cpSessionId =
        sessionId;

    next();

});


app.use(express.static(path.join(__dirname, "public")));


app.get("/sitemap.xml", (req, res) => {
    res.type("application/xml");
    res.sendFile(path.join(__dirname, "public", "sitemap.xml"));
});

app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.sendFile(path.join(__dirname, "public", "robots.txt"));
});
app.get("/downloads/CreatorPilot-Setup.exe", (req, res) => {

    res.download(
        path.join(
            __dirname,
            "public",
            "downloads",
            "CreatorPilot-Setup.exe"
        )
    );

});
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.post(
    "/stripe-webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {

        const sig =
            req.headers["stripe-signature"];

        let event;

        try {
            event =
                stripe.webhooks.constructEvent(
                    req.body,
                    sig,
                    process.env.STRIPE_WEBHOOK_SECRET
                );
        } catch (error) {
            console.log("Erreur webhook Stripe :", error.message);
            return res.status(400).send("Webhook Error");
        }

        if (event.type === "checkout.session.completed") {

            const session =
                event.data.object;

            const email =
                (
                    session.customer_details?.email ||
                    session.customer_email ||
                    ""
                )
                .toLowerCase()
                .trim();

            if (email) {

                await pool.query(
                    `
                    INSERT INTO pro_users (
                        email,
                        pro,
                        source
                    )
                    VALUES ($1, true, 'stripe')
                    ON CONFLICT (email)
                    DO UPDATE SET
                        pro = true,
                        source = 'stripe',
                        updated_at = NOW()
                    `,
                    [email]
                );

                console.log(
                    "CreatorPilot Pro activé via Stripe pour :",
                    email
                );

            } else {

                console.log(
                    "Stripe webhook reçu mais aucun email trouvé"
                );

            }

        }

        if (event.type === "customer.subscription.deleted") {

            const subscription =
                event.data.object;

            const customer =
                await stripe.customers.retrieve(
                    subscription.customer
                );

            const email =
                (customer.email || "")
                    .toLowerCase()
                    .trim();

            if (email) {

                await pool.query(
                    `
                    UPDATE pro_users
                    SET
                        pro = false,
                        updated_at = NOW()
                    WHERE email = $1
                    `,
                    [email]
                );

                console.log(
                    "Abonnement annulé :",
                    email
                );

            }

        }

        if (event.type === "invoice.payment_failed") {

            const invoice =
                event.data.object;

            const customer =
                await stripe.customers.retrieve(
                    invoice.customer
                );

            const email =
                (customer.email || "")
                    .toLowerCase()
                    .trim();

            if (email) {

                await pool.query(
                    `
                    UPDATE pro_users
                    SET
                        pro = false,
                        updated_at = NOW()
                    WHERE email = $1
                    `,
                    [email]
                );

                console.log(
                    "Paiement échoué :",
                    email
                );

            }

        }

        res.json({
            received: true
        });

    }
);
app.use(express.json());

/* UPLOAD MEDIAS */
const soundsDir =
    path.join(DATA_DIR, "sounds");

const imagesDir =
    path.join(__dirname, "public", "images");

if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir, {
        recursive: true
    });
}

if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, {
        recursive: true
    });
}
const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        if (file.mimetype.startsWith("audio/")) {
            cb(null, soundsDir);
        } else if (file.mimetype.startsWith("image/")) {
            cb(null, imagesDir);
        } else {
            cb(null, path.join(__dirname, "public"));
        }

    },

    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }

});



const upload = multer({
    storage: storage
});

app.use(
    "/sounds",
    express.static(soundsDir)
);

app.post("/create-checkout-session", async (req, res) => {

    if (!stripe) {
    return res.status(500).json({
        error: "Stripe n'est pas configuré"
    });
}
    
     try {

        const session =
            await stripe.checkout.sessions.create({

                mode: "subscription",
                allow_promotion_codes: true,

                line_items: [
                    {
                        price: process.env.STRIPE_PRICE_ID,
                        quantity: 1
                    }
                ],

                success_url:
    process.env.APP_URL +
    "/?stripe=success&session_id={CHECKOUT_SESSION_ID}",

                cancel_url:
                    process.env.APP_URL +
                    "/?stripe=cancel"

            });

        res.json({
            url: session.url
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: error.message
        });

    }

});

app.post("/activate-free-pro", async (req, res) => {

    const code = req.body.code || "";
    const email =
        (req.body.email || "")
        .toLowerCase()
        .trim();

    if (code !== process.env.FREE_PRO_CODE) {
        return res.json({
            success: false,
            error: "Code invalide"
        });
    }

    if (!email) {
        return res.json({
            success: false,
            error: "Email manquant"
        });
    }

    await pool.query(
        `
        INSERT INTO pro_users (
            email,
            pro,
            source
        )
        VALUES ($1, true, 'free_code')
        ON CONFLICT (email)
        DO UPDATE SET
            pro = true,
            source = 'free_code',
            updated_at = NOW()
        `,
        [email]
    );

    res.json({
        success: true
    });

});

app.post("/check-pro", async (req, res) => {

    try {

        const email =
            (req.body.email || "")
                .toLowerCase()
                .trim();

        if (!email) {
            return res.json({
                pro: false
            });
        }

        const result =
            await pool.query(
                "SELECT pro FROM pro_users WHERE email = $1",
                [email]
            );

        res.json({
            pro:
                result.rows[0]?.pro === true
        });

    } catch (error) {

        console.log("Erreur check-pro :", error.message);

        res.json({
            pro: false,
            error: "check-pro unavailable"
        });

    }

});

app.post("/grant-pro", async (req, res) => {

    const email =
        (req.body.email || "")
            .toLowerCase()
            .trim();

    if (!email) {
        return res.status(400).json({
            success: false
        });
    }

    await pool.query(
        `
        INSERT INTO pro_users (
            email,
            pro
        )
        VALUES ($1, true)
        ON CONFLICT (email)
        DO UPDATE SET
            pro = true,
            updated_at = NOW()
        `,
        [email]
    );

    res.json({
        success: true
    });

});

app.post("/upload", upload.single("file"), (req, res) => {

    try {

        console.log("UPLOAD REÇU :", req.file);

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "Aucun fichier reçu"
            });
        }

        res.json({
            success: true,
            filename: req.file.filename,
            type: req.file.mimetype
        });

    } catch (error) {

        console.log("ERREUR UPLOAD :", error);

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});

/* STATS */

let stats = {
    topGifters: {},
    giftHistory: []
};

try {

    stats = JSON.parse(
        fs.readFileSync(STATS_FILE)
    );

    console.log("Statistiques chargées");

} catch (error) {

    console.log("stats.json introuvable, statistiques vides");

}

app.get("/stats", (req, res) => {
    res.json(stats);
});

app.get("/live-stats", (req, res) => {
    res.json(liveSessionStats);
});

app.post("/stats", (req, res) => {

    stats = req.body;

    fs.writeFileSync(
       STATS_FILE,
        JSON.stringify(stats, null, 2)
    );

    res.json({
        success: true
    });

});

let settings = {
    voiceEnabled: true,
    actions: [],
    actionEvents: [],
    soundAlerts: []
};

if (fs.existsSync(SETTINGS_FILE)) {

    settings =
        JSON.parse(
            fs.readFileSync(
                SETTINGS_FILE,
                "utf8"
            )
        );

}

try {

    settings = JSON.parse(
        fs.readFileSync(SETTINGS_FILE)
    );

    console.log("Paramètres chargés");

} catch (error) {

    console.log("settings.json introuvable, paramètres par défaut utilisés");

}

/* CHATBOT : valeurs par défaut si absentes du settings.json existant */
if (!settings.chatBot) {
    settings.chatBot = {
        enabled: true,
        prefix: "!",
        cooldownSeconds: 8,
        commands: {
            points: { enabled: true },
            objectif: { enabled: true },
            roue: { enabled: true }
        }
    };
}

/*
   ============================================================
   RÉGLAGES PAR CLIENT (multi-utilisateur)

   settingsByClient stocke les réglages de chaque session
   séparément, dans des fichiers distincts (un par client) au
   lieu d'un seul settings.json partagé.

   IMPORTANT : à ce stade, seules les routes GET /settings et
   POST /settings (le mécanisme générique utilisé par la
   plupart des panneaux de personnalisation) lisent/écrivent
   via ce système. Les nombreuses autres routes du fichier
   (overlays, chatbot, roue, chrono...) utilisent encore la
   variable globale "settings" ci-dessus, donc PAS ENCORE
   isolées par client. C'est la prochaine étape.
   ============================================================
*/

const CP_SETTINGS_DIR =
    path.join(DATA_DIR, "client-settings");

if (!fs.existsSync(CP_SETTINGS_DIR)) {
    fs.mkdirSync(CP_SETTINGS_DIR, { recursive: true });
}

const settingsByClient = new Map();

function cpSettingsFilePath(sessionId) {
    return path.join(CP_SETTINGS_DIR, sessionId + ".json");
}

function getClientSettings(sessionId) {

    if (settingsByClient.has(sessionId)) {
        return settingsByClient.get(sessionId);
    }

    const filePath =
        cpSettingsFilePath(sessionId);

    let clientSettings =
        JSON.parse(JSON.stringify(settings));

    if (fs.existsSync(filePath)) {

        try {
            clientSettings =
                JSON.parse(fs.readFileSync(filePath, "utf8"));
        } catch (error) {
            console.log("Réglages client illisibles pour", sessionId, "- valeurs par défaut utilisées");
        }

    }

    settingsByClient.set(sessionId, clientSettings);

    return clientSettings;

}

function saveClientSettings(sessionId, data) {

    settingsByClient.set(sessionId, data);

    fs.writeFileSync(
        cpSettingsFilePath(sessionId),
        JSON.stringify(data, null, 2)
    );

}

const chatBotCooldowns = {};

function handleChatBotCommand(data, clientId) {

    const cb = settings.chatBot;

    if (!cb || !cb.enabled) {
        return;
    }

    const raw = String(data.comment || "").trim();
    const prefix = cb.prefix || "!";

    if (!raw.startsWith(prefix)) {
        return;
    }

    const word = raw.slice(prefix.length).split(/\s+/)[0].toLowerCase();

    if (!word) {
        return;
    }

    const user = data.nickname || data.uniqueId || "user";
    const cooldownKey = clientId + ":" + user + ":" + word;
    const now = Date.now();
    const cooldownMs = (cb.cooldownSeconds || 8) * 1000;

    if (chatBotCooldowns[cooldownKey] && now - chatBotCooldowns[cooldownKey] < cooldownMs) {
        return;
    }

    const commandConfig = (cb.commands || {})[word];

    if (!commandConfig || commandConfig.enabled === false) {
        return;
    }

    chatBotCooldowns[cooldownKey] = now;

    console.log("CHATBOT COMMANDE :", user, "->", word);

    if (word === "roue") {
        if (!actionWheel.spinning) {
            spinActionWheel();
            emitToCreatorPilotClient(clientId, "chatBotTriggered", { command: word, user });
        }
        return;
    }

    if (word === "points" || word === "objectif") {
        emitToCreatorPilotClient(clientId, "chatBotCommand", { type: word, user });
        return;
    }

    if (commandConfig.actionName) {
        executeActionByName(commandConfig.actionName);
        emitToCreatorPilotClient(clientId, "chatBotTriggered", { command: word, user, actionName: commandConfig.actionName });
    }
}

function saveSettingsFile() {

    fs.writeFileSync(
        SETTINGS_FILE,
        JSON.stringify(settings, null, 2)
    );

}

app.get("/settings", (req, res) => {
    res.json(getClientSettings(req.cpSessionId));
});

app.post("/settings", (req, res) => {
    saveClientSettings(req.cpSessionId, req.body);

    res.json({
        success: true
    });
});

app.get("/api/mobile/status", (req, res) => {
    res.json({
        success: true,
        app: "CreatorPilot",
        version: "1.0.4",
        tiktokUsername: settings.tiktokUsername || "",
        pro: settings.pro === true,
        ttsEnabled: settings.ttsChat?.enabled === true,
        soundsEnabled: settings.soundsEnabled !== false,
        soundAlerts: settings.soundAlerts?.length || 0
    });
});

app.post("/api/mobile/sounds/toggle", (req, res) => {

    settings.soundsEnabled =
        settings.soundsEnabled === false;

    saveSettingsFile();

    res.json({
        success: true,
        soundsEnabled: settings.soundsEnabled
    });

});

app.post("/api/mobile/alerts/add", upload.single("sound"), (req, res) => {

    settings.soundAlerts =
        settings.soundAlerts || [];

    const trigger =
        req.body.trigger || "gift";

    const volume =
        Number(req.body.volume || 100);

    const filename =
        req.file ? req.file.filename : "";

    const existingAlert =
    settings.soundAlerts.find(alert =>
        alert.trigger === trigger
    );

if (existingAlert) {

    existingAlert.enabled = true;
    existingAlert.volume = volume;

    if (filename) {
        existingAlert.sound = filename;
    }

} else {

    settings.soundAlerts.push({
        enabled: true,
        trigger,
        sound: filename,
        volume
    });

}

    saveSettingsFile();

    res.json({
        success: true,
        soundAlerts: settings.soundAlerts
    });

});

app.post("/api/mobile/alerts/delete", (req, res) => {

    const trigger =
        req.body.trigger;

    settings.soundAlerts =
        settings.soundAlerts || [];

    settings.soundAlerts =
        settings.soundAlerts.filter(alert =>
            alert.trigger !== trigger
        );

    saveSettingsFile();

    res.json({
        success: true,
        soundAlerts: settings.soundAlerts
    });

});

app.get("/api/mobile/alerts", (req, res) => {

    const defaultTriggers = [
        "gift",
        "follow",
        "subscribe",
        "like",
        "share"
    ];

    const uniqueAlerts = {};

    (settings.soundAlerts || []).forEach(alert => {
        uniqueAlerts[alert.trigger] = alert;
    });

    defaultTriggers.forEach(trigger => {
        if (!uniqueAlerts[trigger]) {
            uniqueAlerts[trigger] = {
                enabled: true,
                trigger,
                sound: "",
                volume: 100
            };
        }
    });

    settings.soundAlerts =
        defaultTriggers.map(trigger => uniqueAlerts[trigger]);

    saveSettingsFile();

    res.json({
        success: true,
        alerts: settings.soundAlerts
    });

});

app.post("/api/mobile/tts/toggle", (req, res) => {
    settings.ttsChat = settings.ttsChat || {};
    settings.ttsChat.enabled = !settings.ttsChat.enabled;

    saveSettingsFile();

    res.json({
        success: true,
        ttsEnabled: settings.ttsChat.enabled
    });
});

app.get("/mobile", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "mobile.html")
    );
});

app.post("/tts/openai", async (req, res) => {

    try {

        const text =
            req.body.text || "";

        const voice =
            req.body.voice || "alloy";

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                error: "OPENAI_API_KEY manquante"
            });
        }

        console.log(
    "OPENAI KEY EXISTS:",
    !!process.env.OPENAI_API_KEY
);

console.log(
    "OPENAI KEY START:",
    process.env.OPENAI_API_KEY
        ? process.env.OPENAI_API_KEY.substring(0, 10)
        : "AUCUNE"
);
        const response =
            await fetch("https://api.openai.com/v1/audio/speech", {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini-tts",
                    voice,
                    input: text
                })
            });

            console.log(
    "OPENAI STATUS :",
    response.status
);

if (!response.ok) {

    const errorText =
        await response.text();

    console.log(
        "OPENAI ERROR :",
        errorText
    );

    return res.status(500).send(errorText);

}

        const audioBuffer =
            Buffer.from(
                await response.arrayBuffer()
            );

        res.set({
            "Content-Type": "audio/mpeg"
        });

        res.send(audioBuffer);

    } catch (error) {

        console.log("Erreur OpenAI TTS :", error);

        res.status(500).json({
            error: error.message
        });

    }

});

console.log("DEBUG TIKTOK BLOCK ATTEINT");
console.log("SETTINGS TIKTOK :", settings.tiktokUsername);


/* TIKTOK */

/* CONNEXION TIKTOK LOCALE
   Chaque installation se connecte uniquement
   lorsque son utilisateur clique sur Connexion.
*/


const tiktokConnections = new Map();
const tiktokUsernames = new Map();

function getTikTokConnection(clientId) {
    return tiktokConnections.get(clientId) || null;
}

function emitToCreatorPilotClient(
    clientId,
    eventName,
    payload
) {
    io
        .to("client:" + clientId)
        .emit(eventName, payload);
}


console.log(
    "TikTok en attente : aucune connexion automatique au démarrage"
);

app.post("/connect-tiktok", async (req, res) => {

    const clientId =
        String(req.body.clientId || "")
            .trim();

    try {

        const username =
            String(req.body.username || "")
                .replaceAll("@", "")
                .trim();

        if (!clientId) {
            return res.status(400).json({
                success: false,
                error:
                    "Identifiant local CreatorPilot manquant"
            });
        }

        if (!username) {
            return res.json({
                success: false,
                error: "Pseudo TikTok manquant"
            });
        }

        const previousConnection =
            getTikTokConnection(clientId);

        if (previousConnection) {
            try {
                previousConnection
                    .removeAllListeners();

                await previousConnection
                    .disconnect();
            } catch (error) {
                console.log(
                    "Ancienne connexion TikTok déjà fermée :",
                    error.message
                );
            }

            tiktokConnections.delete(clientId);
        }

        const connection =
            new WebcastPushConnection(username);

        bindTikTokEvents(
            connection,
            clientId
        );

        const state =
            await connection.connect();

        tiktokConnections.set(
            clientId,
            connection
        );

        tiktokUsernames.set(
            clientId,
            username
        );

        liveSessionStats = {
            connected: true,
            username: username,
            startTime: Date.now(),
            likes: 0,
            followers: 0,
            gifts: 0,
            diamonds: 0
        };

        emitLiveStats(clientId);

        console.log(
            "Client",
            clientId,
            "connecté au live TikTok : @" +
                username,
            "Room ID :",
            state.roomId
        );

        return res.json({
            success: true,
            username,
            roomId: state.roomId,
            clientId
        });

    } catch (error) {

        console.log(
            "Erreur connexion TikTok client",
            clientId,
            ":",
            error
        );

        const connection =
            getTikTokConnection(clientId);

        if (connection) {
            try {
                connection.removeAllListeners();
                await connection.disconnect();
            } catch {}
        }

        tiktokConnections.delete(clientId);
        tiktokUsernames.delete(clientId);

        return res.json({
            success: false,
            error:
                error.message ||
                "Erreur TikTok"
        });
    }
});




app.get("/api/tiktok-client-status", (req, res) => {

    const clientId =
        String(req.query.clientId || "")
            .trim();

    res.json({
        success: true,
        connected:
            tiktokConnections.has(clientId),
        username:
            tiktokUsernames.get(clientId) || ""
    });

});

/* IMPORT GIFTS */

app.get("/import-gifts", async (req, res) => {

    const clientId =
        String(req.query.clientId || "")
            .trim();

    const tiktok =
        getTikTokConnection(clientId);

    if (!tiktok) {
        return res.json({
            success: false,
            error:
                "Aucune connexion TikTok pour ce client"
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

let liveSessionStats = {
    connected: false,
    username: "",
    startTime: null,
    likes: 0,
    followers: 0,
    gifts: 0,
    diamonds: 0
};

function emitLiveStats(clientId) {
    emitToCreatorPilotClient(clientId, "liveStats", liveSessionStats);
}

function bindTikTokEvents(tiktokConnection, clientId) {


     if (!tiktokConnection) {
        return;
    }
    tiktokConnection.removeAllListeners();

    tiktokConnection.on("disconnected", () => {
        console.log("TikTok LIVE déconnecté (stream terminé ou coupure)");
        liveSessionStats.connected = false;
        emitLiveStats(clientId);
    });

    tiktokConnection.on("chat", data => {

        console.log("CHAT REÇU :", data.nickname, data.comment);

        applyChronoTime(chrono.settings.perChat);

        emitToCreatorPilotClient(clientId, "chat", {
            user: data.nickname,
            uniqueId: data.uniqueId,
            message: data.comment,
            isFollower: (data.followRole || 0) >= 1,
            isFriend: data.followRole === 2,
            isModerator: !!data.isModerator,
            isSubscriber: !!data.isSubscriber,
            isTopGifter: data.topGifterRank !== null && data.topGifterRank !== undefined
        });

        trackPresence(data.nickname, data.profilePictureUrl || data.profilePicture || "");

        handleChatBotCommand(data, clientId);

    });

    tiktokConnection.on("gift", data => {

        console.log("GIFT REÇU :", data.nickname, data.giftName, data.diamondCount);

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
            (
                !alert.gift ||
                alert.gift.trim().toLowerCase() ===
                giftName.trim().toLowerCase()
            )
        );

        console.log("ALERTE SON CADEAU :", matchingSoundAlert);

if (matchingSoundAlert && matchingSoundAlert.sound) {
    emitToCreatorPilotClient(clientId, "play-sound-alert", {
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

        const donorAvatar =
            data.profilePictureUrl ||
            data.user?.profilePictureUrl ||
            data.avatar ||
            "";

        if (!topDonors[user]) {
            topDonors[user] = {
                diamonds: 0,
                avatar: donorAvatar
            };
        }

        topDonors[user].diamonds +=
            Number(data.diamondCount || 0);

        if (donorAvatar) {
            topDonors[user].avatar = donorAvatar;
        }

        trackPresence(user, donorAvatar);

        liveSessionStats.gifts += 1;
        liveSessionStats.diamonds += Number(data.diamondCount || 0);
        emitLiveStats(clientId);

emitToCreatorPilotClient(clientId, "gift", {
            user: user,
            gift: giftName,
            giftId: data.giftId,
            diamonds: data.diamondCount,
            giftImage: data.giftPictureUrl
        });

    });

   tiktokConnection.on("like", data => {

        console.log("LIKE REÇU :", data.nickname, data.likeCount, data.totalLikeCount);

        currentLikesGoalCount =
    Number(data.totalLikeCount || data.likeCount || 0);

        liveSessionStats.likes =
    Number(data.totalLikeCount || currentLikesGoalCount || 0);

        emitLiveStats(clientId);

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

trackPresence(user, data.profilePictureUrl || data.profilePicture || "");

applyChronoTime(
    likes * Number(chrono.settings.perLike || 0)
);

        emitToCreatorPilotClient(clientId, "like", {
            user: data.nickname,
            likes: data.likeCount,
            totalLikes: data.totalLikeCount
        });

    });

tiktokConnection.on("social", data => {
    console.log("SOCIAL REÇU :", data);
});

 tiktokConnection.on("follow", data => {

    console.log("FOLLOW REÇU :", data.nickname);

    applyChronoTime(chrono.settings.perFollow);

    console.log("TOUTES ALERTES SON :", settings.soundAlerts);

    const matchingSoundAlert =
        (settings.soundAlerts || [])
            .find(alert =>
                alert.enabled &&
                alert.trigger === "follow"
            );

    console.log("ALERTE SON FOLLOW :", matchingSoundAlert);

    if (matchingSoundAlert && matchingSoundAlert.sound) {
        emitToCreatorPilotClient(clientId, "play-sound-alert", {
            sound: matchingSoundAlert.sound,
            volume: matchingSoundAlert.volume || 100
        });
    }

    emitToCreatorPilotClient(clientId, "follow", {
        user: data.nickname
    });

    liveSessionStats.followers += 1;
    emitLiveStats(clientId);

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

app.get("/download", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Télécharger CreatorPilot - TikBabik</title>
<meta name="description" content="Téléchargez CreatorPilot, l'application TikTok LIVE pour alertes, TTS, overlays, mini-jeux et statistiques.">
<style>
body{
    font-family:Arial;
    background:#0f1117;
    color:white;
    padding:40px;
    text-align:center;
}
.card{
    max-width:700px;
    margin:auto;
    background:#181b24;
    padding:35px;
    border-radius:20px;
}
a.download{
    display:inline-block;
    margin-top:25px;
    padding:18px 30px;
    background:#ff0050;
    color:white;
    text-decoration:none;
    border-radius:12px;
    font-size:22px;
    font-weight:bold;
}
</style>
</head>
<body>
<div class="card">
<h1>Télécharger CreatorPilot</h1>

<p>
CreatorPilot est une application TikTok LIVE pour gérer vos alertes,
TTS, overlays, mini-jeux, battles, statistiques et interactions live.
</p>

<p><strong>Compatible Windows</strong></p>
<p>Version 1.0.0</p>

<a class="download"
href="https://github.com/babik42310/tikbabik/releases/download/v1.0.0/CreatorPilot.Setup.1.0.0.exe">
</a>

<br><br>

<a href="/">Retour au site</a>
</div>
</body>
</html>
    `);
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
            SETTINGS_FILE,
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
           SETTINGS_FILE,
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

function loadResetTokens() {

    try {

        return JSON.parse(
            fs.readFileSync(
                RESET_TOKENS_FILE,
                "utf8"
            )
        );

    } catch {

        return [];

    }

}

function saveResetTokens(tokens) {

    fs.writeFileSync(
        RESET_TOKENS_FILE,
        JSON.stringify(tokens, null, 2)
    );

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

app.post("/forgot-password", express.json(), async (req, res) => {

    const email =
        (req.body.email || "").toLowerCase().trim();

    if (!email) {
        return res.json({
            success: true,
            message: "Si un compte existe, un lien sera envoyé."
        });
    }

    const resetToken =
        crypto.randomBytes(32).toString("hex");

        const tokens =
    loadResetTokens();

tokens.push({

    token: resetToken,

    email: email,

    expires:
        Date.now() +
        (60 * 60 * 1000)

});

app.get("/reset-password", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "reset-password.html")
    );
});

app.post("/reset-password", express.json(), (req, res) => {

    const token =
        req.body.token || "";

    const password =
        req.body.password || "";

    if (!token || !password) {
        return res.json({
            success: false,
            error: "Token ou mot de passe manquant"
        });
    }

    const tokens =
        loadResetTokens();

    const resetData =
        tokens.find(item =>
            item.token === token &&
            item.expires > Date.now()
        );

    if (!resetData) {
        return res.json({
            success: false,
            error: "Lien invalide ou expiré"
        });
    }

    const users =
        loadUsers();

    const user =
        users.find(u =>
            u.email.toLowerCase() === resetData.email.toLowerCase()
        );

    if (!user) {
        return res.json({
            success: false,
            error: "Compte introuvable"
        });
    }

    user.password =
        hashPassword(password);

    saveUsers(users);

    const remainingTokens =
        tokens.filter(item =>
            item.token !== token
        );

    saveResetTokens(remainingTokens);

    res.json({
        success: true,
        message: "Mot de passe modifié avec succès"
    });

});

saveResetTokens(tokens);

    const resetLink =
        (process.env.APP_URL || "https://www.tikbabik.shop") +
        "/reset-password?token=" +
        resetToken;

    console.log("RESET PASSWORD :", email, resetLink);

   const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "api-key": process.env.BREVO_API_KEY,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            sender: {
                name: "CreatorPilot",
                email: "noreply@tikbabik.shop"
            },
            to: [
                {
                    email: email
                }
            ],
            subject: "Réinitialisation de votre mot de passe CreatorPilot",
            htmlContent:
                "<h2>Réinitialisation du mot de passe</h2>" +
                "<p>Cliquez sur le lien ci-dessous pour changer votre mot de passe :</p>" +
                "<p><a href='" + resetLink + "'>Changer mon mot de passe</a></p>" +
                "<p>Si vous n'avez pas demandé cette action, ignorez cet email.</p>"
        })
    });

    const brevoText =
    await brevoResponse.text();

console.log(
    "BREVO STATUS :",
    brevoResponse.status
);

console.log(
    "BREVO RESPONSE :",
    brevoText
);

    res.json({
        success: true,
        message: "Si un compte existe, un lien de réinitialisation a été envoyé."
    });

});

let topLikes = {};
let topDonors = {};
let topPresence = {};

try {

    const savedRankings =
        JSON.parse(fs.readFileSync(RANKINGS_FILE));

    topLikes = savedRankings.topLikes || {};
    topDonors = savedRankings.topDonors || {};
    topPresence = savedRankings.topPresence || {};

    console.log("Classements (Top J'aime / Donateurs / Présence) chargés");

} catch (error) {

    console.log("rankings.json introuvable, classements vides");

}

function saveRankingsFile() {

    fs.writeFileSync(
        RANKINGS_FILE,
        JSON.stringify(
            { topLikes, topDonors, topPresence },
            null,
            2
        )
    );

}

setInterval(saveRankingsFile, 15000);

function trackPresence(user, avatar) {

    if (!user) {
        return;
    }

    if (!topPresence[user]) {
        topPresence[user] = {
            seconds: 0,
            avatar: avatar || "",
            lastSeen: Date.now()
        };
    }

    topPresence[user].lastSeen = Date.now();

    if (avatar) {
        topPresence[user].avatar = avatar;
    }
}

setInterval(() => {

    const now = Date.now();

    Object.keys(topPresence).forEach(user => {
        if (now - topPresence[user].lastSeen <= 15000) {
            topPresence[user].seconds += 5;
        }
    });

}, 5000);

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

app.get("/coin-match/settings", (req, res) => {
    res.json(
        settings.coinMatch || {
            bg: "#1f1f1f",
            border: "#ff0050",
            text: "#ffffff",
            timer: "#35cfff",
            shape: "20",
            scale: "1",
            victorySound: "victory.mp3"
        }
    );
});

app.post("/coin-match/settings", (req, res) => {
    settings.coinMatch = {
        bg: req.body.bg || "#1f1f1f",
        border: req.body.border || "#ff0050",
        text: req.body.text || "#ffffff",
        timer: req.body.timer || "#35cfff",
        shape: req.body.shape || "20",
        scale: req.body.scale || "1",
        victorySound: req.body.victorySound || "victory.mp3",
        ringColor1: req.body.ringColor1 || "#22d3ee",
        ringColor2: req.body.ringColor2 || "#a855f7",
        ringColor3: req.body.ringColor3 || "#ec4899",
        ringSpeed: Number(req.body.ringSpeed || 6)
    };

    saveSettingsFile();

    res.json({
        success: true,
        settings: settings.coinMatch
    });
});

app.get("/overlay/coin-match", (req, res) => {

   const coinSettings =
    settings.coinMatch || {};

const bg =
    req.query.bg ||
    (coinSettings.bg || "#1f1f1f").replace("#", "");

const border =
    req.query.border ||
    (coinSettings.border || "#ff0050").replace("#", "");

const text =
    req.query.text ||
    (coinSettings.text || "#ffffff").replace("#", "");

const timerColor =
    req.query.timer ||
    (coinSettings.timer || "#35cfff").replace("#", "");

const shape =
    req.query.shape ||
    coinSettings.shape ||
    "20";

const scale =
    req.query.scale ||
    coinSettings.scale ||
    "1";

const sound =
    req.query.sound ||
    coinSettings.victorySound ||
    "victory.mp3";

const ringColor1 =
    req.query.ringColor1 ||
    (coinSettings.ringColor1 || "#22d3ee").replace("#", "");

const ringColor2 =
    req.query.ringColor2 ||
    (coinSettings.ringColor2 || "#a855f7").replace("#", "");

const ringColor3 =
    req.query.ringColor3 ||
    (coinSettings.ringColor3 || "#ec4899").replace("#", "");

const ringSpeed =
    req.query.ringSpeed ||
    coinSettings.ringSpeed ||
    "6";

    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Coin Match Overlay</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Rajdhani:wght@500;700&display=swap" rel="stylesheet">

<style>
@property --angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
}

@keyframes spin {
    to { --angle: 360deg; }
}

#ring{
    display:inline-block;
    padding:3px;
    border-radius:${Number(shape) + 3}px;
    background:conic-gradient(from var(--angle), #${ringColor1}, #${ringColor2}, #${ringColor3}, #${ringColor1});
    animation:spin ${ringSpeed}s linear infinite;
    transform:scale(${scale});
}

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
    font-family: 'Rajdhani', Arial, sans-serif;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    box-sizing: border-box;
}

#box {
    width: 420px;
    height:300px;
    padding: 20px;
    border-radius: ${shape}px;
    background: #${bg};
    border: none;
    color: #${text};
    text-align: center;
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

<div id="ring">
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
            ["🎉", "✨", "🏆", "💎"][Math.floor(Math.random() * 4)];

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
        ' 💎</div>';

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
        ' 💎</div>';

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
        ' 💎</div>';

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
        " 💎</span></div>";

});
}

setInterval(load, 1000);
load();
</script>

</body>
</html>
    `);

});

app.get("/overlay/coin-match-preview", (req, res) => {

    const bg = req.query.bg || "1f1f1f";
    const border = req.query.border || "ff0050";
    const text = req.query.text || "ffffff";
    const timerColor = req.query.timer || "35cfff";
    const shape = req.query.shape || "20";
    const scale = req.query.scale || "1";
    const sound = req.query.sound || "victory.mp3";
    const ringColor1 = req.query.ringColor1 || "22d3ee";
    const ringColor2 = req.query.ringColor2 || "a855f7";
    const ringColor3 = req.query.ringColor3 || "ec4899";
    const ringSpeed = req.query.ringSpeed || "6";

    res.redirect(
        "/overlay/coin-match" +
        "?bg=" + bg +
        "&border=" + border +
        "&text=" + text +
        "&timer=" + timerColor +
        "&shape=" + shape +
        "&scale=" + scale +
        "&sound=" + encodeURIComponent(sound) +
        "&ringColor1=" + ringColor1 +
        "&ringColor2=" + ringColor2 +
        "&ringColor3=" + ringColor3 +
        "&ringSpeed=" + ringSpeed
    );

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

app.get("/gift-battle/settings", (req, res) => {
    res.json(
        settings.giftBattle || {
            redName: "Team 1",
            blueName: "Team 2",
            redColor: "#ff2a2a",
            blueColor: "#1b8cff",
            duration: 300,
            redGifts: "",
            blueGifts: ""
        }
    );
});

app.post("/gift-battle/settings", express.json(), (req, res) => {
    settings.giftBattle = {
        redName: req.body.redName || "Team 1",
        blueName: req.body.blueName || "Team 2",
        redColor: req.body.redColor || "#ff2a2a",
        blueColor: req.body.blueColor || "#1b8cff",
        duration: Number(req.body.duration || 300),
        redGifts: req.body.redGifts || "",
        blueGifts: req.body.blueGifts || ""
    };

    giftBattle.duration = settings.giftBattle.duration;

    saveSettingsFile();

    res.json({
        success: true,
        settings: settings.giftBattle
    });
});

app.get("/overlay/gift-battle", (req, res) => {

const battleSettings =
    settings.giftBattle || {};

const redName =
    req.query.redName ||
    battleSettings.redName ||
    "Team 1";

const blueName =
    req.query.blueName ||
    battleSettings.blueName ||
    "Team 2";

const redColor =
    req.query.redColor ||
    (battleSettings.redColor || "#ff2a2a").replace("#", "");

const blueColor =
    req.query.blueColor ||
    (battleSettings.blueColor || "#1b8cff").replace("#", "");

    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Rajdhani:wght@500;700&display=swap" rel="stylesheet">

<style>

body{
    margin:0;
    background:transparent;
    overflow:hidden;
    font-family:'Rajdhani', Arial, sans-serif;
}

#battleTimer{
    text-align:center;
    font-family:'Orbitron', sans-serif;
    font-size:38px;
    font-weight:800;
    color:#f5f7ff;
    text-shadow:0 0 14px rgba(168,85,247,0.8);
    margin-bottom:15px;
    letter-spacing:2px;
}

#container{
    width:100%;
    max-width:520px;
    margin:0 auto;
    padding-top:20px;
    display:flex;
    flex-direction:column;
    gap:12px;
    box-sizing:border-box;
}


.team{
    width:calc(80% - 20px);
    margin:0 auto;
    padding:15px;
    border-radius:18px;
    text-align:center;
    color:white;
    box-sizing:border-box;
    background:rgba(5,6,15,0.75);
    border:2px solid var(--teamColor);
    box-shadow:0 0 22px var(--teamGlow), inset 0 0 20px rgba(0,0,0,0.4);
}

.red{
    --teamColor:#${redColor};
    --teamGlow:#${redColor}66;
}

.blue{
    --teamColor:#${blueColor};
    --teamGlow:#${blueColor}66;
}

.score{
    font-family:'Orbitron', sans-serif;
    font-size:52px;
    font-weight:800;
    color:var(--teamColor);
    text-shadow:0 0 14px var(--teamGlow);
}

.name{
    font-size:28px;
    font-weight:700;
    margin-bottom:12px;
    color:#f5f7ff;
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

app.get("/top-likes/settings", (req, res) => {
    res.json(
        settings.topLikes || {
            titleFont: "Orbitron",
            nameFont: "Rajdhani",
            fontSize: 24,
            titleText: "Top J'aime",
            titleColorStart: "#22d3ee",
            titleColorEnd: "#ff4d6d",
            nameColor: "#ffffff",
            likesColor: "#ff4d6d",
            rankColor: "#ffd700",
            bgColor: "#05060f",
            rowColor: "#a855f7",
            ringColor1: "#22d3ee",
            ringColor2: "#a855f7",
            ringColor3: "#ec4899",
            ringSpeed: 6,
            heartIcon: "❤️",
            showAvatar: true,
            showCrown: true,
            showHeart: true
        }
    );
});

app.post("/top-likes/settings", express.json(), (req, res) => {
    settings.topLikes = {
        titleFont: req.body.titleFont || "Orbitron",
        nameFont: req.body.nameFont || "Rajdhani",
        fontSize: Number(req.body.fontSize || 24),
        titleText: req.body.titleText || "Top J'aime",
        titleColorStart: req.body.titleColorStart || "#22d3ee",
        titleColorEnd: req.body.titleColorEnd || "#ff4d6d",
        nameColor: req.body.nameColor || "#ffffff",
        likesColor: req.body.likesColor || "#ff4d6d",
        rankColor: req.body.rankColor || "#ffd700",
        bgColor: req.body.bgColor || "#05060f",
        rowColor: req.body.rowColor || "#a855f7",
        ringColor1: req.body.ringColor1 || "#22d3ee",
        ringColor2: req.body.ringColor2 || "#a855f7",
        ringColor3: req.body.ringColor3 || "#ec4899",
        ringSpeed: Number(req.body.ringSpeed || 6),
        heartIcon: req.body.heartIcon || "❤️",
        showAvatar: req.body.showAvatar !== false,
        showCrown: req.body.showCrown !== false,
        showHeart: req.body.showHeart !== false
    };

    saveSettingsFile();

    res.json({
        success: true,
        settings: settings.topLikes
    });
});

app.get("/overlay/top-likes", (req, res) => {

    const topLikesSettings =
        settings.topLikes || {};

    const titleFont =
        req.query.titleFont ||
        topLikesSettings.titleFont ||
        "Orbitron";

    const nameFont =
        req.query.nameFont ||
        topLikesSettings.nameFont ||
        "Rajdhani";

    const fontSize =
        req.query.fontSize ||
        topLikesSettings.fontSize ||
        "24";

    const titleText =
        req.query.titleText ||
        topLikesSettings.titleText ||
        "Top J'aime";

    const titleColorStart =
        req.query.titleColorStart ||
        (topLikesSettings.titleColorStart || "#22d3ee").replace("#", "");

    const titleColorEnd =
        req.query.titleColorEnd ||
        (topLikesSettings.titleColorEnd || "#ff4d6d").replace("#", "");

    const nameColor =
        req.query.nameColor ||
        (topLikesSettings.nameColor || "#ffffff").replace("#", "");

    const likesColor =
        req.query.likesColor ||
        (topLikesSettings.likesColor || "#ff4d6d").replace("#", "");

    const rankColor =
        req.query.rankColor ||
        (topLikesSettings.rankColor || "#ffd700").replace("#", "");

    const bgColor =
        req.query.bgColor ||
        (topLikesSettings.bgColor || "#05060f").replace("#", "");

    const rowColor =
        req.query.rowColor ||
        (topLikesSettings.rowColor || "#a855f7").replace("#", "");

    const ringColor1 =
        req.query.ringColor1 ||
        (topLikesSettings.ringColor1 || "#22d3ee").replace("#", "");

    const ringColor2 =
        req.query.ringColor2 ||
        (topLikesSettings.ringColor2 || "#a855f7").replace("#", "");

    const ringColor3 =
        req.query.ringColor3 ||
        (topLikesSettings.ringColor3 || "#ec4899").replace("#", "");

    const ringSpeed =
        req.query.ringSpeed ||
        topLikesSettings.ringSpeed ||
        "6";

    const heartIcon =
        req.query.heartIcon ||
        topLikesSettings.heartIcon ||
        "❤️";

    const showAvatar =
        req.query.showAvatar !== undefined
            ? req.query.showAvatar !== "false"
            : topLikesSettings.showAvatar !== false;

    const showCrown =
        req.query.showCrown !== undefined
            ? req.query.showCrown !== "false"
            : topLikesSettings.showCrown !== false;

    const showHeart =
        req.query.showHeart !== undefined
            ? req.query.showHeart !== "false"
            : topLikesSettings.showHeart !== false;

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Rajdhani:wght@500;700&family=Audiowide&family=Michroma&family=Exo+2:wght@500;700&display=swap" rel="stylesheet">

<style>
@property --angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
}

@keyframes spin {
    to { --angle: 360deg; }
}

body{
    margin:0;
    background:transparent;
    overflow:hidden;
    font-family:'${nameFont}', sans-serif;
    font-size:${fontSize}px;
}

#frame{
    position:relative;
    width:100%;
    height:100%;
    box-sizing:border-box;
    padding:3px;
    border-radius:22px;
    background:conic-gradient(from var(--angle), #${ringColor1}, #${ringColor2}, #${ringColor3}, #${ringColor1});
    animation:spin ${ringSpeed}s linear infinite;
}

#box{
    width:100%;
    height:100%;
    box-sizing:border-box;
    padding:22px 20px;
    border-radius:20px;
    background:radial-gradient(circle at 50% 0%, #${ringColor1}22, transparent 60%), #${bgColor};
    color:#f5f7ff;
}

#title{
    text-align:center;
    font-family:'${titleFont}', sans-serif;
    font-size:${Number(fontSize) - 2}px;
    font-weight:800;
    letter-spacing:2px;
    text-transform:uppercase;
    margin-bottom:16px;
    background:linear-gradient(90deg, #${titleColorStart}, #${titleColorEnd});
    -webkit-background-clip:text;
    background-clip:text;
    -webkit-text-fill-color:transparent;
}

.player{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin:8px 0;
    padding:6px 12px;
    font-size:${fontSize}px;
    font-family:'${nameFont}', sans-serif;
    background:rgba(255,255,255,0.04);
    border:1px solid #${rowColor}40;
    border-radius:10px;
}

.playerName{
    color:#${nameColor};
    font-weight:500;
}

.likes{
    font-family:'${titleFont}', sans-serif;
    color:#${likesColor};
    font-weight:600;
    text-shadow:0 0 8px #${likesColor}88;
}

#firstLike{
    text-align:center;
    font-family:'${nameFont}', sans-serif;
    font-size:${Number(fontSize) + 2}px;
    font-weight:700;
    margin-bottom:14px;
    color:#${nameColor};
}

#secondLike,
#thirdLike{
    text-align:center;
    font-family:'${nameFont}', sans-serif;
    font-size:${fontSize}px;
    font-weight:700;
    color:#${nameColor};
}

.topAvatar{
    width:84px;
    height:84px;
    border-radius:50%;
    object-fit:cover;
    padding:3px;
    background:conic-gradient(from var(--angle), #${ringColor1}, #${ringColor2}, #${ringColor3}, #${ringColor1});
    animation:spin ${ringSpeed}s linear infinite;
    margin:8px 0;
    display:${showAvatar ? "inline-block" : "none"};
}

#otherLikes{
    display:flex;
    justify-content:space-around;
    margin-bottom:12px;
}
</style>
</head>

<body>

<div id="frame">
<div id="box">
    <div id="title">
        ${showHeart ? heartIcon + " " : ""}${titleText}
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
            "<br><span class='likes'>${showHeart ? heartIcon + " " : ""}" +
            data.ranking[0][1].likes +
            "</span>";
    }

    if (data.ranking[1]) {
        secondLike.innerHTML =
            "🥈<br>" +
            data.ranking[1][0] +
            "<br><span class='likes'>${showHeart ? heartIcon + " " : ""}" +
            data.ranking[1][1].likes +
            "</span>";
    }

    if (data.ranking[2]) {
        thirdLike.innerHTML =
            "🥉<br>" +
            data.ranking[2][0] +
            "<br><span class='likes'>${showHeart ? heartIcon + " " : ""}" +
            data.ranking[2][1].likes +
            "</span>";
    }

    data.ranking.slice(3).forEach((player, index) => {
        ranking.innerHTML +=
            "<div class='player'>" +
            "<span class='playerName'>" +
            (index + 4) + ". " + player[0] +
            "</span>" +
            "<span class='likes'>${showHeart ? heartIcon + " " : ""}" +
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

app.post("/top-likes/reset", (req, res) => {

    topLikes = {};
    saveRankingsFile();

    res.json({ success: true });

});

/* ==================== TOP DONATEURS ==================== */

app.get("/top-donors/status", (req, res) => {

    const ranking =
        Object.entries(topDonors)
            .sort((a, b) => b[1].diamonds - a[1].diamonds)
            .slice(0, 10);

    res.json({ ranking });

});

app.get("/top-donors/settings", (req, res) => {
    res.json(
        settings.topDonors || {
            titleFont: "Orbitron",
            nameFont: "Rajdhani",
            fontSize: 24,
            titleText: "Top Donateurs",
            titleColorStart: "#22d3ee",
            titleColorEnd: "#00e5ff",
            nameColor: "#ffffff",
            coinsColor: "#00e5ff",
            rankColor: "#ffd700",
            bgColor: "#05060f",
            rowColor: "#a855f7",
            ringColor1: "#22d3ee",
            ringColor2: "#a855f7",
            ringColor3: "#ec4899",
            ringSpeed: 6,
            coinIcon: "🪙",
            showAvatar: true,
            showCrown: true,
            showCoin: true
        }
    );
});

app.post("/top-donors/settings", express.json(), (req, res) => {
    settings.topDonors = {
        titleFont: req.body.titleFont || "Orbitron",
        nameFont: req.body.nameFont || "Rajdhani",
        fontSize: Number(req.body.fontSize || 24),
        titleText: req.body.titleText || "Top Donateurs",
        titleColorStart: req.body.titleColorStart || "#22d3ee",
        titleColorEnd: req.body.titleColorEnd || "#00e5ff",
        nameColor: req.body.nameColor || "#ffffff",
        coinsColor: req.body.coinsColor || "#00e5ff",
        rankColor: req.body.rankColor || "#ffd700",
        bgColor: req.body.bgColor || "#05060f",
        rowColor: req.body.rowColor || "#a855f7",
        ringColor1: req.body.ringColor1 || "#22d3ee",
        ringColor2: req.body.ringColor2 || "#a855f7",
        ringColor3: req.body.ringColor3 || "#ec4899",
        ringSpeed: Number(req.body.ringSpeed || 6),
        coinIcon: req.body.coinIcon || "🪙",
        showAvatar: req.body.showAvatar !== false,
        showCrown: req.body.showCrown !== false,
        showCoin: req.body.showCoin !== false
    };

    saveSettingsFile();

    res.json({
        success: true,
        settings: settings.topDonors
    });
});

app.get("/overlay/top-donors", (req, res) => {

    const topDonorsSettings =
        settings.topDonors || {};

    const titleFont =
        req.query.titleFont ||
        topDonorsSettings.titleFont ||
        "Orbitron";

    const nameFont =
        req.query.nameFont ||
        topDonorsSettings.nameFont ||
        "Rajdhani";

    const fontSize =
        req.query.fontSize ||
        topDonorsSettings.fontSize ||
        "24";

    const titleText =
        req.query.titleText ||
        topDonorsSettings.titleText ||
        "Top Donateurs";

    const titleColorStart =
        req.query.titleColorStart ||
        (topDonorsSettings.titleColorStart || "#22d3ee").replace("#", "");

    const titleColorEnd =
        req.query.titleColorEnd ||
        (topDonorsSettings.titleColorEnd || "#00e5ff").replace("#", "");

    const nameColor =
        req.query.nameColor ||
        (topDonorsSettings.nameColor || "#ffffff").replace("#", "");

    const coinsColor =
        req.query.coinsColor ||
        (topDonorsSettings.coinsColor || "#00e5ff").replace("#", "");

    const rankColor =
        req.query.rankColor ||
        (topDonorsSettings.rankColor || "#ffd700").replace("#", "");

    const bgColor =
        req.query.bgColor ||
        (topDonorsSettings.bgColor || "#05060f").replace("#", "");

    const rowColor =
        req.query.rowColor ||
        (topDonorsSettings.rowColor || "#a855f7").replace("#", "");

    const ringColor1 =
        req.query.ringColor1 ||
        (topDonorsSettings.ringColor1 || "#22d3ee").replace("#", "");

    const ringColor2 =
        req.query.ringColor2 ||
        (topDonorsSettings.ringColor2 || "#a855f7").replace("#", "");

    const ringColor3 =
        req.query.ringColor3 ||
        (topDonorsSettings.ringColor3 || "#ec4899").replace("#", "");

    const ringSpeed =
        req.query.ringSpeed ||
        topDonorsSettings.ringSpeed ||
        "6";

    const coinIcon =
        req.query.coinIcon ||
        topDonorsSettings.coinIcon ||
        "🪙";

    const showAvatar =
        req.query.showAvatar !== undefined
            ? req.query.showAvatar !== "false"
            : topDonorsSettings.showAvatar !== false;

    const showCrown =
        req.query.showCrown !== undefined
            ? req.query.showCrown !== "false"
            : topDonorsSettings.showCrown !== false;

    const showCoin =
        req.query.showCoin !== undefined
            ? req.query.showCoin !== "false"
            : topDonorsSettings.showCoin !== false;

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Rajdhani:wght@500;700&family=Audiowide&family=Michroma&family=Exo+2:wght@500;700&display=swap" rel="stylesheet">

<style>
@property --angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
}

@keyframes spin {
    to { --angle: 360deg; }
}

body{
    margin:0;
    background:transparent;
    overflow:hidden;
    font-family:'${nameFont}', sans-serif;
    font-size:${fontSize}px;
}

#frame{
    position:relative;
    width:100%;
    height:100%;
    box-sizing:border-box;
    padding:3px;
    border-radius:22px;
    background:conic-gradient(from var(--angle), #${ringColor1}, #${ringColor2}, #${ringColor3}, #${ringColor1});
    animation:spin ${ringSpeed}s linear infinite;
}

#box{
    width:100%;
    height:100%;
    box-sizing:border-box;
    padding:22px 20px;
    border-radius:20px;
    background:radial-gradient(circle at 50% 0%, #${ringColor1}22, transparent 60%), #${bgColor};
    color:#f5f7ff;
}

#title{
    text-align:center;
    font-family:'${titleFont}', sans-serif;
    font-size:${Number(fontSize) - 2}px;
    font-weight:800;
    letter-spacing:2px;
    text-transform:uppercase;
    margin-bottom:16px;
    background:linear-gradient(90deg, #${titleColorStart}, #${titleColorEnd});
    -webkit-background-clip:text;
    background-clip:text;
    -webkit-text-fill-color:transparent;
}

.player{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin:8px 0;
    padding:6px 12px;
    font-size:${fontSize}px;
    font-family:'${nameFont}', sans-serif;
    background:rgba(255,255,255,0.04);
    border:1px solid #${rowColor}40;
    border-radius:10px;
}

.playerName{
    color:#${nameColor};
    font-weight:500;
}

.coins{
    font-family:'${titleFont}', sans-serif;
    color:#${coinsColor};
    font-weight:600;
    text-shadow:0 0 8px #${coinsColor}88;
}

#firstDonor{
    text-align:center;
    font-family:'${nameFont}', sans-serif;
    font-size:${Number(fontSize) + 2}px;
    font-weight:700;
    margin-bottom:14px;
    color:#${nameColor};
}

#secondDonor,
#thirdDonor{
    text-align:center;
    font-family:'${nameFont}', sans-serif;
    font-size:${fontSize}px;
    font-weight:700;
    color:#${nameColor};
}

.topAvatar{
    width:84px;
    height:84px;
    border-radius:50%;
    object-fit:cover;
    padding:3px;
    background:conic-gradient(from var(--angle), #${ringColor1}, #${ringColor2}, #${ringColor3}, #${ringColor1});
    animation:spin ${ringSpeed}s linear infinite;
    margin:8px 0;
    display:${showAvatar ? "inline-block" : "none"};
}

#otherDonors{
    display:flex;
    justify-content:space-around;
    margin-bottom:12px;
}
</style>
</head>

<body>

<div id="frame">
<div id="box">
    <div id="title">
        ${showCoin ? coinIcon + " " : ""}${titleText}
    </div>

    <div id="topPodium">
        <div id="firstDonor"></div>

        <div id="otherDonors">
            <div id="secondDonor"></div>
            <div id="thirdDonor"></div>
        </div>
    </div>

    <div id="ranking"></div>
</div>
</div>

<script>
async function load() {
    const response = await fetch("/top-donors/status");
    const data = await response.json();

    const ranking = document.getElementById("ranking");
    const firstDonor = document.getElementById("firstDonor");
    const secondDonor = document.getElementById("secondDonor");
    const thirdDonor = document.getElementById("thirdDonor");

    ranking.innerHTML = "";
    firstDonor.innerHTML = "";
    secondDonor.innerHTML = "";
    thirdDonor.innerHTML = "";

    if (data.ranking[0]) {
        firstDonor.innerHTML =
            "${showCrown ? "👑<br>" : ""}" +
            "<img class='topAvatar' src='" + (data.ranking[0][1].avatar || "") + "'>" +
            "<br>" +
            data.ranking[0][0] +
            "<br><span class='coins'>${showCoin ? coinIcon + " " : ""}" +
            data.ranking[0][1].diamonds +
            "</span>";
    }

    if (data.ranking[1]) {
        secondDonor.innerHTML =
            "🥈<br>" +
            data.ranking[1][0] +
            "<br><span class='coins'>${showCoin ? coinIcon + " " : ""}" +
            data.ranking[1][1].diamonds +
            "</span>";
    }

    if (data.ranking[2]) {
        thirdDonor.innerHTML =
            "🥉<br>" +
            data.ranking[2][0] +
            "<br><span class='coins'>${showCoin ? coinIcon + " " : ""}" +
            data.ranking[2][1].diamonds +
            "</span>";
    }

    data.ranking.slice(3).forEach((player, index) => {
        ranking.innerHTML +=
            "<div class='player'>" +
            "<span class='playerName'>" +
            (index + 4) + ". " + player[0] +
            "</span>" +
            "<span class='coins'>${showCoin ? coinIcon + " " : ""}" +
            player[1].diamonds +
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

app.post("/top-donors/test", (req, res) => {

    const user = "TestUser";

    if (!topDonors[user]) {
        topDonors[user] = {
            diamonds: 0,
            avatar: "https://placehold.co/80x80"
        };
    }

    topDonors[user].diamonds += 100;

    res.json({
        success: true,
        topDonors
    });

});

app.post("/top-donors/reset", (req, res) => {

    topDonors = {};
    saveRankingsFile();

    res.json({ success: true });

});

/* ==================== TOP PRÉSENCE LIVE ==================== */

function formatPresenceTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + "m " + String(seconds).padStart(2, "0") + "s";
}

app.get("/top-presence/status", (req, res) => {

    const ranking =
        Object.entries(topPresence)
            .sort((a, b) => b[1].seconds - a[1].seconds)
            .slice(0, 10)
            .map(([user, data]) => [
                user,
                { ...data, formatted: formatPresenceTime(data.seconds) }
            ]);

    res.json({ ranking });

});

app.get("/top-presence/settings", (req, res) => {
    res.json(
        settings.topPresence || {
            titleFont: "Orbitron",
            nameFont: "Rajdhani",
            fontSize: 24,
            titleText: "Top Présence LIVE",
            titleColorStart: "#22d3ee",
            titleColorEnd: "#7CFC00",
            nameColor: "#ffffff",
            timeColor: "#7CFC00",
            rankColor: "#ffd700",
            bgColor: "#05060f",
            rowColor: "#a855f7",
            ringColor1: "#22d3ee",
            ringColor2: "#a855f7",
            ringColor3: "#ec4899",
            ringSpeed: 6,
            clockIcon: "⏱️",
            showAvatar: true,
            showCrown: true,
            showClock: true
        }
    );
});

app.post("/top-presence/settings", express.json(), (req, res) => {
    settings.topPresence = {
        titleFont: req.body.titleFont || "Orbitron",
        nameFont: req.body.nameFont || "Rajdhani",
        fontSize: Number(req.body.fontSize || 24),
        titleText: req.body.titleText || "Top Présence LIVE",
        titleColorStart: req.body.titleColorStart || "#22d3ee",
        titleColorEnd: req.body.titleColorEnd || "#7CFC00",
        nameColor: req.body.nameColor || "#ffffff",
        timeColor: req.body.timeColor || "#7CFC00",
        rankColor: req.body.rankColor || "#ffd700",
        bgColor: req.body.bgColor || "#05060f",
        rowColor: req.body.rowColor || "#a855f7",
        ringColor1: req.body.ringColor1 || "#22d3ee",
        ringColor2: req.body.ringColor2 || "#a855f7",
        ringColor3: req.body.ringColor3 || "#ec4899",
        ringSpeed: Number(req.body.ringSpeed || 6),
        clockIcon: req.body.clockIcon || "⏱️",
        showAvatar: req.body.showAvatar !== false,
        showCrown: req.body.showCrown !== false,
        showClock: req.body.showClock !== false
    };

    saveSettingsFile();

    res.json({
        success: true,
        settings: settings.topPresence
    });
});

app.get("/overlay/top-presence", (req, res) => {

    const topPresenceSettings =
        settings.topPresence || {};

    const titleFont =
        req.query.titleFont ||
        topPresenceSettings.titleFont ||
        "Orbitron";

    const nameFont =
        req.query.nameFont ||
        topPresenceSettings.nameFont ||
        "Rajdhani";

    const fontSize =
        req.query.fontSize ||
        topPresenceSettings.fontSize ||
        "24";

    const titleText =
        req.query.titleText ||
        topPresenceSettings.titleText ||
        "Top Présence LIVE";

    const titleColorStart =
        req.query.titleColorStart ||
        (topPresenceSettings.titleColorStart || "#22d3ee").replace("#", "");

    const titleColorEnd =
        req.query.titleColorEnd ||
        (topPresenceSettings.titleColorEnd || "#7CFC00").replace("#", "");

    const nameColor =
        req.query.nameColor ||
        (topPresenceSettings.nameColor || "#ffffff").replace("#", "");

    const timeColor =
        req.query.timeColor ||
        (topPresenceSettings.timeColor || "#7CFC00").replace("#", "");

    const rankColor =
        req.query.rankColor ||
        (topPresenceSettings.rankColor || "#ffd700").replace("#", "");

    const bgColor =
        req.query.bgColor ||
        (topPresenceSettings.bgColor || "#05060f").replace("#", "");

    const rowColor =
        req.query.rowColor ||
        (topPresenceSettings.rowColor || "#a855f7").replace("#", "");

    const ringColor1 =
        req.query.ringColor1 ||
        (topPresenceSettings.ringColor1 || "#22d3ee").replace("#", "");

    const ringColor2 =
        req.query.ringColor2 ||
        (topPresenceSettings.ringColor2 || "#a855f7").replace("#", "");

    const ringColor3 =
        req.query.ringColor3 ||
        (topPresenceSettings.ringColor3 || "#ec4899").replace("#", "");

    const ringSpeed =
        req.query.ringSpeed ||
        topPresenceSettings.ringSpeed ||
        "6";

    const clockIcon =
        req.query.clockIcon ||
        topPresenceSettings.clockIcon ||
        "⏱️";

    const showAvatar =
        req.query.showAvatar !== undefined
            ? req.query.showAvatar !== "false"
            : topPresenceSettings.showAvatar !== false;

    const showCrown =
        req.query.showCrown !== undefined
            ? req.query.showCrown !== "false"
            : topPresenceSettings.showCrown !== false;

    const showClock =
        req.query.showClock !== undefined
            ? req.query.showClock !== "false"
            : topPresenceSettings.showClock !== false;

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Rajdhani:wght@500;700&family=Audiowide&family=Michroma&family=Exo+2:wght@500;700&display=swap" rel="stylesheet">

<style>
@property --angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
}

@keyframes spin {
    to { --angle: 360deg; }
}

body{
    margin:0;
    background:transparent;
    overflow:hidden;
    font-family:'${nameFont}', sans-serif;
    font-size:${fontSize}px;
}

#frame{
    position:relative;
    width:100%;
    height:100%;
    box-sizing:border-box;
    padding:3px;
    border-radius:22px;
    background:conic-gradient(from var(--angle), #${ringColor1}, #${ringColor2}, #${ringColor3}, #${ringColor1});
    animation:spin ${ringSpeed}s linear infinite;
}

#box{
    width:100%;
    height:100%;
    box-sizing:border-box;
    padding:22px 20px;
    border-radius:20px;
    background:radial-gradient(circle at 50% 0%, #${ringColor1}22, transparent 60%), #${bgColor};
    color:#f5f7ff;
}

#title{
    text-align:center;
    font-family:'${titleFont}', sans-serif;
    font-size:${Number(fontSize) - 2}px;
    font-weight:800;
    letter-spacing:2px;
    text-transform:uppercase;
    margin-bottom:16px;
    background:linear-gradient(90deg, #${titleColorStart}, #${titleColorEnd});
    -webkit-background-clip:text;
    background-clip:text;
    -webkit-text-fill-color:transparent;
}

.player{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin:8px 0;
    padding:6px 12px;
    font-size:${fontSize}px;
    font-family:'${nameFont}', sans-serif;
    background:rgba(255,255,255,0.04);
    border:1px solid #${rowColor}40;
    border-radius:10px;
}

.playerName{
    color:#${nameColor};
    font-weight:500;
}

.time{
    font-family:'${titleFont}', sans-serif;
    color:#${timeColor};
    font-weight:600;
    text-shadow:0 0 8px #${timeColor}88;
}

#firstPresence{
    text-align:center;
    font-family:'${nameFont}', sans-serif;
    font-size:${Number(fontSize) + 2}px;
    font-weight:700;
    margin-bottom:14px;
    color:#${nameColor};
}

#secondPresence,
#thirdPresence{
    text-align:center;
    font-family:'${nameFont}', sans-serif;
    font-size:${fontSize}px;
    font-weight:700;
    color:#${nameColor};
}

.topAvatar{
    width:84px;
    height:84px;
    border-radius:50%;
    object-fit:cover;
    padding:3px;
    background:conic-gradient(from var(--angle), #${ringColor1}, #${ringColor2}, #${ringColor3}, #${ringColor1});
    animation:spin ${ringSpeed}s linear infinite;
    margin:8px 0;
    display:${showAvatar ? "inline-block" : "none"};
}

#otherPresence{
    display:flex;
    justify-content:space-around;
    margin-bottom:12px;
}
</style>
</head>

<body>

<div id="frame">
<div id="box">
    <div id="title">
        ${showClock ? clockIcon + " " : ""}${titleText}
    </div>

    <div id="topPodium">
        <div id="firstPresence"></div>

        <div id="otherPresence">
            <div id="secondPresence"></div>
            <div id="thirdPresence"></div>
        </div>
    </div>

    <div id="ranking"></div>
</div>
</div>

<script>
async function load() {
    const response = await fetch("/top-presence/status");
    const data = await response.json();

    const ranking = document.getElementById("ranking");
    const firstPresence = document.getElementById("firstPresence");
    const secondPresence = document.getElementById("secondPresence");
    const thirdPresence = document.getElementById("thirdPresence");

    ranking.innerHTML = "";
    firstPresence.innerHTML = "";
    secondPresence.innerHTML = "";
    thirdPresence.innerHTML = "";

    if (data.ranking[0]) {
        firstPresence.innerHTML =
            "${showCrown ? "👑<br>" : ""}" +
            "<img class='topAvatar' src='" + (data.ranking[0][1].avatar || "") + "'>" +
            "<br>" +
            data.ranking[0][0] +
            "<br><span class='time'>${showClock ? clockIcon + " " : ""}" +
            data.ranking[0][1].formatted +
            "</span>";
    }

    if (data.ranking[1]) {
        secondPresence.innerHTML =
            "🥈<br>" +
            data.ranking[1][0] +
            "<br><span class='time'>${showClock ? clockIcon + " " : ""}" +
            data.ranking[1][1].formatted +
            "</span>";
    }

    if (data.ranking[2]) {
        thirdPresence.innerHTML =
            "🥉<br>" +
            data.ranking[2][0] +
            "<br><span class='time'>${showClock ? clockIcon + " " : ""}" +
            data.ranking[2][1].formatted +
            "</span>";
    }

    data.ranking.slice(3).forEach((player, index) => {
        ranking.innerHTML +=
            "<div class='player'>" +
            "<span class='playerName'>" +
            (index + 4) + ". " + player[0] +
            "</span>" +
            "<span class='time'>${showClock ? clockIcon + " " : ""}" +
            player[1].formatted +
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

app.post("/top-presence/test", (req, res) => {

    const user = "TestUser";

    if (!topPresence[user]) {
        topPresence[user] = {
            seconds: 0,
            avatar: "https://placehold.co/80x80",
            lastSeen: Date.now()
        };
    }

    topPresence[user].seconds += 60;

    res.json({
        success: true,
        topPresence
    });

});

app.post("/top-presence/reset", (req, res) => {

    topPresence = {};
    saveRankingsFile();

    res.json({ success: true });

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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Rajdhani:wght@500;700&display=swap" rel="stylesheet">
<style>
@property --angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
}

@keyframes spin {
    to { --angle: 360deg; }
}

body{
    margin:0;
    background:transparent;
    overflow:hidden;
    display:flex;
    justify-content:center;
    align-items:center;
    height:100vh;
    font-family:'Rajdhani', Arial;
}

#wheelRing{
    width:264px;
    height:264px;
    border-radius:50%;
    padding:9px;
    box-sizing:border-box;
    background:conic-gradient(from var(--angle), #22d3ee, #a855f7, #ec4899, #22d3ee);
    animation:spin 6s linear infinite;
    display:flex;
    align-items:center;
    justify-content:center;
}

#wheel{
    width:100%;
    height:100%;
    border-radius:50%;
    position:relative;
    overflow:hidden;
    transition:transform 10s ease-out;
    box-shadow:
        0 0 25px rgba(168,85,247,0.5),
        inset 0 0 20px rgba(0,0,0,0.4);
}

#wheelWinner{
    position:absolute;
    bottom:25px;
    left:50%;
    transform:translateX(-50%);
    color:#f5f7ff;
    font-family:'Orbitron', sans-serif;
    background:rgba(5,6,15,0.85);
    border:1px solid #a855f7;
    border-radius:15px;
    padding:15px 30px;
    font-size:28px;
    font-weight:700;
    text-align:center;
    display:none;
    z-index:20;
    box-shadow:0 0 25px rgba(168,85,247,0.6);
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
    top:8px;
    left:50%;
    transform:translateX(-50%);
    width:0;
    height:0;
    border-left:16px solid transparent;
    border-right:16px solid transparent;
    border-top:32px solid #22d3ee;
    z-index:10;
    filter:drop-shadow(0 0 10px #22d3ee);
}
</style>
</head>
<body>

<div id="pointer"></div>

<div id="wheelRing">
<div id="wheel">
    <div id="segmentLabels"></div>
</div>
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
    settings.font || "Rajdhani";

    wheel.style.transition =
    "transform " +
    (settings.spinDuration || 10) +
    "s ease-out";

    const ring = document.getElementById("wheelRing");
    ring.style.background =
        "conic-gradient(from var(--angle), " +
        (settings.ringColor1 || "#22d3ee") + ", " +
        (settings.ringColor2 || "#a855f7") + ", " +
        (settings.ringColor3 || "#ec4899") + ", " +
        (settings.ringColor1 || "#22d3ee") + ")";
    ring.style.animationDuration =
        (settings.ringSpeed || 6) + "s";

    const pointer = document.getElementById("pointer");
    pointer.style.borderTopColor = settings.ringColor1 || "#22d3ee";
    pointer.style.filter = "drop-shadow(0 0 10px " + (settings.ringColor1 || "#22d3ee") + ")";

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
            "conic-gradient(#22d3ee 0deg 180deg, #a855f7 180deg 360deg)";

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
        req.body.font || "Orbitron",

    fontSize:
        Number(req.body.fontSize || 42),

    letterSpacing:
        Number(req.body.letterSpacing || 4),

    textColor:
        req.body.textColor || "#b700ff",

    bgColor:
        req.body.bgColor || "#05060f",

    labelText:
        req.body.labelText || "",

    labelColor:
        req.body.labelColor || "#8b93b8",

    ringColor1:
        req.body.ringColor1 || "#22d3ee",

    ringColor2:
        req.body.ringColor2 || "#a855f7",

    ringColor3:
        req.body.ringColor3 || "#ec4899",

    ringSpeed:
        Number(req.body.ringSpeed || 6)
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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Rajdhani:wght@500;700&family=Audiowide&family=Michroma&family=Exo+2:wght@500;700&display=swap" rel="stylesheet">
<style>
@property --angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
}

@keyframes spin {
    to { --angle: 360deg; }
}

body{
    margin:0;
    background:transparent;
    overflow:hidden;
    font-family:'Rajdhani', sans-serif;
    text-align:center;
}

#frame{
    display:inline-block;
    padding:3px;
    border-radius:22px;
    background:conic-gradient(from var(--angle), #22d3ee, #a855f7, #ec4899, #22d3ee);
    animation:spin 6s linear infinite;
}

#box{
    padding:18px 34px;
    border-radius:20px;
    background:#05060f;
}

#label{
    font-size:14px;
    letter-spacing:2px;
    text-transform:uppercase;
    margin-bottom:6px;
    color:#8b93b8;
    display:none;
}

#timer{
    display:inline-block;
    font-family:'Orbitron', sans-serif;
}
</style>
</head>
<body>

<div id="frame">
<div id="box">
    <div id="label"></div>
    <div id="timer">00:05:00</div>
</div>
</div>

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

    const frame =
        document.getElementById("frame");

    const box =
        document.getElementById("box");

    const timer =
        document.getElementById("timer");

    const label =
        document.getElementById("label");

    timer.style.fontFamily =
        (settings.font || "Orbitron") + ", sans-serif";

    timer.style.fontSize =
        (settings.fontSize || 42) + "px";

    timer.style.letterSpacing =
        (settings.letterSpacing || 4) + "px";

    timer.style.color =
        settings.textColor || "#b700ff";

    timer.style.textShadow =
        "0 0 12px " + (settings.textColor || "#b700ff") + "aa";

    box.style.background =
        settings.bgColor || "#05060f";

    frame.style.background =
        "conic-gradient(from var(--angle), " +
        (settings.ringColor1 || "#22d3ee") + ", " +
        (settings.ringColor2 || "#a855f7") + ", " +
        (settings.ringColor3 || "#ec4899") + ", " +
        (settings.ringColor1 || "#22d3ee") + ")";

    frame.style.animationDuration =
        (settings.ringSpeed || 6) + "s";

    if (settings.labelText) {
        label.style.display = "block";
        label.textContent = settings.labelText;
        label.style.color = settings.labelColor || "#8b93b8";
    } else {
        label.style.display = "none";
    }

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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Rajdhani:wght@500;700&display=swap" rel="stylesheet">
<style>
@property --angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
}

@keyframes spin {
    to { --angle: 360deg; }
}

body{
    margin:0;
    background:transparent;
    overflow:hidden;
    font-family:'Rajdhani', Arial;

    display:flex;
    justify-content:center;
    align-items:center;

    width:100vw;
    height:100vh;
}

#socialRing{
    display:none;
    padding:3px;
    border-radius:18px;
    background:conic-gradient(from var(--angle), #22d3ee, #a855f7, #ec4899, #22d3ee);
    animation:spin 6s linear infinite;
}

#socialBox{
    display:none;
    padding:12px 25px;
    border-radius:15px;
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

<div id="socialRing">
<div id="socialBox">
    <span class="icon" id="icon"></span>
    <span id="text"></span>
</div>
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

    const ring = document.getElementById("socialRing");
    const box = document.getElementById("socialBox");
    const icon = document.getElementById("icon");
    const text = document.getElementById("text");

if (
    !data.settings ||
    !data.settings.fields ||
    data.settings.fields.length === 0
) {
    ring.style.display = "none";
    box.style.display = "none";
    return;
}

    const settings = data.settings;
   const field =
    settings.fields[index % settings.fields.length];

if (!field) {
    ring.style.display = "none";
    box.style.display = "none";
    return;
}

    ring.style.display = "inline-block";
    ring.style.background =
        "conic-gradient(from var(--angle), " +
        (settings.ringColor1 || "#22d3ee") + ", " +
        (settings.ringColor2 || "#a855f7") + ", " +
        (settings.ringColor3 || "#ec4899") + ", " +
        (settings.ringColor1 || "#22d3ee") + ")";
    ring.style.animationDuration =
        (settings.ringSpeed || 6) + "s";

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

    const currentSettings =
        JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));

    const webcam =
        currentSettings.webcamSimple || {};

    const color =
        webcam.color || "#35cfff";

    const border =
        webcam.border || 6;

    const radius =
        webcam.radius || 12;

    const glow =
        webcam.glow !== false;

    const futuristic =
        webcam.futuristic === true;

    const ringColor1 =
        webcam.ringColor1 || "#22d3ee";

    const ringColor2 =
        webcam.ringColor2 || "#a855f7";

    const ringColor3 =
        webcam.ringColor3 || "#ec4899";

    const ringSpeed =
        webcam.ringSpeed || 6;

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@property --angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
}

@keyframes spin {
    to { --angle: 360deg; }
}

body{
    margin:0;
    background:transparent;
    overflow:hidden;
}

#frame{
    width:500px;
    height:300px;
    box-sizing:border-box;
    border:${futuristic ? "0" : border + "px solid " + color};
    border-radius:${radius}px;
    box-shadow:${!futuristic && glow ? `0 0 20px ${color}` : "none"};
    padding:${futuristic ? border + "px" : "0"};
    background:${futuristic
        ? `conic-gradient(from var(--angle), ${ringColor1}, ${ringColor2}, ${ringColor3}, ${ringColor1})`
        : "transparent"};
    animation:${futuristic ? `spin ${ringSpeed}s linear infinite` : "none"};
}

#inner{
    width:100%;
    height:100%;
    border-radius:${Math.max(0, radius - border)}px;
    background:transparent;
}
</style>
</head>
<body>

<div id="frame">
    ${futuristic ? `<div id="inner"></div>` : ""}
</div>

</body>
</html>
`);
});
app.get("/overlay/webcam-custom", (req, res) => {

    const currentSettings =
        JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));

    const custom =
        currentSettings.webcamCustom || {};

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

    const futuristic =
        style === "futuriste";

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@property --angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
}

@keyframes spin {
    to { --angle: 360deg; }
}

body{
    margin:0;
    background:transparent;
    overflow:hidden;
}

.frame{
    width:500px;
    height:300px;
    box-sizing:border-box;
    border:${futuristic ? "0" : "6px solid " + borderColor};
    border-radius:${radius}px;
    box-shadow:${futuristic ? "none" : shadow};
    padding:${futuristic ? "4px" : "0"};
    background:${futuristic
        ? "conic-gradient(from var(--angle), #22d3ee, #a855f7, #ec4899, #22d3ee)"
        : "transparent"};
    animation:${futuristic ? "spin 6s linear infinite" : "none"};
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

    const currentSettings =
        JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));

    const likes =
        currentSettings.likesGoal || {};

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

    const ringColor1 =
        likes.ringColor1 || "#22d3ee";

    const ringColor2 =
        likes.ringColor2 || "#a855f7";

    const ringColor3 =
        likes.ringColor3 || "#ec4899";

    const ringSpeed =
        likes.ringSpeed || 6;

    const useFuturistic =
        variation === "Futuriste";

     
    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Rajdhani:wght@500;700&display=swap" rel="stylesheet">
<style>
@property --angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
}

@keyframes spin {
    to { --angle: 360deg; }
}

body{
    margin:0;
    background:transparent;
    overflow:hidden;
}

#ring{
    display:inline-block;
    padding:${useFuturistic ? "3px" : "0"};
    border-radius:16px;
    background:${useFuturistic
        ? `conic-gradient(from var(--angle), ${ringColor1}, ${ringColor2}, ${ringColor3}, ${ringColor1})`
        : "transparent"};
    animation:${useFuturistic ? `spin ${ringSpeed}s linear infinite` : "none"};
}

#likesGoal{
    color:${textColor};
    font-family:'${font}', 'Rajdhani', sans-serif;
    font-size:${fontSize}px;
    letter-spacing:${likes.letterSpacing || 2}px;
    border:${useFuturistic ? "none" : borderStyle};
box-shadow:${useFuturistic ? "none" : shadowStyle};
    border-radius:12px;
    padding:14px 20px;
    background:${useFuturistic ? "#05060f" : remainingColor};
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

<div id="ring">
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

    document.querySelector(".fill").style.width =
        percent + "%";
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

    const currentSettings =
        JSON.parse(
    fs.readFileSync(
        SETTINGS_FILE,
        "utf8"
    )
);

    const follow =
        currentSettings.followGoal || {};

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

    const ringColor1 =
        follow.ringColor1 || "#22d3ee";

    const ringColor2 =
        follow.ringColor2 || "#a855f7";

    const ringColor3 =
        follow.ringColor3 || "#ec4899";

    const ringSpeed =
        follow.ringSpeed || 6;

    const useFuturistic =
        variation === "Futuriste";

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Rajdhani:wght@500;700&display=swap" rel="stylesheet">
<style>
@property --angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
}

@keyframes spin {
    to { --angle: 360deg; }
}

body{
    margin:0;
    background:transparent;
    overflow:hidden;
}

#ring{
    display:inline-block;
    padding:${useFuturistic ? "3px" : "0"};
    border-radius:16px;
    background:${useFuturistic
        ? `conic-gradient(from var(--angle), ${ringColor1}, ${ringColor2}, ${ringColor3}, ${ringColor1})`
        : "transparent"};
    animation:${useFuturistic ? `spin ${ringSpeed}s linear infinite` : "none"};
}

#followGoal{
box-shadow:${useFuturistic ? "none" : shadowStyle};
    color:${textColor};
    font-family:'${font}', 'Rajdhani', sans-serif;
    font-size:${fontSize}px;
    letter-spacing:${follow.letterSpacing || 2}px;
    border:${useFuturistic ? "none" : borderStyle};
    border-radius:12px;
    padding:14px 20px;
    background:${useFuturistic ? "#05060f" : remainingColor};
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

<div id="ring">
<div id="followGoal">

    <div id="followGoalText">
        ${text} : 0 / ${target} (0%)
    </div>

    ${showProgress ? `
<div class="bar">
    <div class="fill"></div>
</div>
` : ""}

</div>
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

app.get("/diamonds-goal/status", (req, res) => {

    res.json({
        diamonds: liveSessionStats.diamonds || 0
    });

});

app.get("/overlay/diamonds-goal", (req, res) => {

    const currentSettings =
        JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));

    const goal =
        currentSettings.diamondsGoal || {};

    const text =
        goal.text || "Objectif Diamants";

    const target =
        goal.target || 1000;

    const font =
        goal.font || "Orbitron";

    const nameFont =
        goal.nameFont || "Rajdhani";

    const fontSize =
        goal.fontSize || 22;

    const showProgress =
        goal.showProgress !== false;

    const textColor =
        goal.textColor || "#f5f7ff";

    const progressColor =
        goal.progressColor || "#22d3ee";

    const icon =
        goal.icon || "💎";

    const ringColor1 =
        goal.ringColor1 || "#22d3ee";

    const ringColor2 =
        goal.ringColor2 || "#a855f7";

    const ringColor3 =
        goal.ringColor3 || "#ec4899";

    const ringSpeed =
        goal.ringSpeed || 6;

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Rajdhani:wght@500;700&display=swap" rel="stylesheet">
<style>
@property --angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
}

@keyframes spin {
    to { --angle: 360deg; }
}

body{
    margin:0;
    background:transparent;
    overflow:hidden;
}

#ring{
    display:inline-block;
    padding:3px;
    border-radius:18px;
    background:conic-gradient(from var(--angle), ${ringColor1}, ${ringColor2}, ${ringColor3}, ${ringColor1});
    animation:spin ${ringSpeed}s linear infinite;
}

#box{
    min-width:280px;
    box-sizing:border-box;
    padding:16px 22px;
    border-radius:16px;
    background:#05060f;
    color:${textColor};
    font-family:'${nameFont}', sans-serif;
    text-align:center;
}

#goalText{
    font-family:'${font}', sans-serif;
    font-size:${fontSize}px;
    font-weight:700;
    letter-spacing:1px;
}

.bar{
    width:100%;
    height:12px;
    margin-top:10px;
    background:rgba(255,255,255,0.08);
    border-radius:20px;
    overflow:hidden;
}

.fill{
    width:0%;
    height:100%;
    background:${progressColor};
    box-shadow:0 0 10px ${progressColor}aa;
    transition:width 0.4s ease;
}
</style>
</head>
<body>

<div id="ring">
<div id="box">
    <div id="goalText">${icon} ${text} : 0 / ${target}</div>
    ${showProgress ? `<div class="bar"><div class="fill"></div></div>` : ""}
</div>
</div>

<script>
async function updateDiamondsGoal(){

    const response =
        await fetch("/diamonds-goal/status");

    const data =
        await response.json();

    const current =
        Number(data.diamonds || 0);

    const target =
        Number("${target}" || 1000);

    const percent =
        Math.min(100, Math.round((current / target) * 100));

    document.getElementById("goalText").innerHTML =
        "${icon} ${text} : " + current + " / " + target + " (" + percent + "%)";

    const fill =
        document.querySelector(".fill");

    if (fill) {
        fill.style.width = percent + "%";
    }

}

setInterval(updateDiamondsGoal, 1000);
updateDiamondsGoal();
</script>

</body>
</html>
`);
});

app.get("/overlay/banner", (req, res) => {

    const currentSettings =
        JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));

    const banner =
        currentSettings.banner || {};

    const text =
        banner.text || "Bienvenue sur mon live !";

    const speed =
        banner.speed || 20;

    const textColor =
        banner.textColor || "#ffffff";

    const bgColor =
        banner.bgColor || "#ff0050";

    const bgColor2 =
        banner.bgColor2 || "#a855f7";

    const font =
        banner.font || "Rajdhani";

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Rajdhani:wght@500;700&display=swap" rel="stylesheet">
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

    background:linear-gradient(90deg, ${bgColor}, ${bgColor2});
    color:${textColor};
    font-family:'${font}', sans-serif;

    padding:12px 0;

    font-size:28px;
    font-weight:700;
    letter-spacing:1px;
    text-shadow:0 0 10px ${bgColor}aa;
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



/* =========================================================
   ASSISTANT LIVE API
   Ces routes doivent rester avant server.listen().
   ========================================================= */

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function defaultLiveAssistantOptions() {
    return {
        enabled: true,
        scoreEnabled: true,
        activityDetectionEnabled: false,
        suggestionsEnabled: false,
        chartsEnabled: false,
        aiEnabled: false,
        visualAlertsEnabled: true,
        soundAlertsEnabled: false,
        gameAdviceEnabled: false
    };
}

function getLiveAssistantStore() {
    if (!settings.liveAssistantByEmail || typeof settings.liveAssistantByEmail !== "object") {
        settings.liveAssistantByEmail = {};
    }
    return settings.liveAssistantByEmail;
}

async function getLiveAssistantProState(email) {

    /* Même source de vérité que le reste de CreatorPilot (Sons, Overlays, TTS...) */
    if (settings.pro === true || settings.pro === "true") {
        return true;
    }

    if (!email) return false;

    try {
        const result = await pool.query(
            "SELECT pro FROM pro_users WHERE LOWER(email) = $1 LIMIT 1",
            [email]
        );
        return result.rows[0]?.pro === true;
    } catch (error) {
        console.error("Erreur getLiveAssistantProState (DB) :", error);
        return false;
    }
}

function getLiveAssistantAccess(pro) {
    return {
        score: true,
        activityDetection: pro,
        suggestions: pro,
        charts: pro,
        ai: pro,
        soundAlerts: pro,
        gameAdvice: pro
    };
}

app.get("/api/live-assistant/status", async (req, res) => {
    try {
        const email = normalizeEmail(req.query.email);
        const pro = await getLiveAssistantProState(email);
        const store = getLiveAssistantStore();
        const saved = store[email] || {};
        const options = {
            ...defaultLiveAssistantOptions(),
            ...(saved.options || {})
        };

        res.json({
            success: true,
            pro,
            access: getLiveAssistantAccess(pro),
            options,
            score: Number(saved.score || 0),
            level: saved.level || "faible",
            latest: saved.latest || {
                viewers: 0,
                likesPerMinute: 0,
                chatPerMinute: 0,
                coinsPerMinute: 0
            },
            peakViewers: Number(saved.peakViewers || 0),
            dropDetected: saved.dropDetected === true,
            suggestion: saved.suggestion || "",
            lastAiAdvice: saved.lastAiAdvice || ""
        });
    } catch (error) {
        console.error("Erreur /api/live-assistant/status :", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post("/api/live-assistant/settings", async (req, res) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const pro = await getLiveAssistantProState(email);
        const incoming = req.body?.settings || {};
        const defaults = defaultLiveAssistantOptions();

        const options = {
            ...defaults,
            ...incoming,
            scoreEnabled: true,
            visualAlertsEnabled: incoming.visualAlertsEnabled !== false
        };

        // Les options Pro ne peuvent être activées que pour un compte Pro réel.
        if (!pro) {
            options.activityDetectionEnabled = false;
            options.suggestionsEnabled = false;
            options.chartsEnabled = false;
            options.aiEnabled = false;
            options.soundAlertsEnabled = false;
            options.gameAdviceEnabled = false;
        }

        const store = getLiveAssistantStore();
        store[email] = {
            ...(store[email] || {}),
            options
        };
        saveSettingsFile();

        res.json({
            success: true,
            pro,
            access: getLiveAssistantAccess(pro),
            options
        });
    } catch (error) {
        console.error("Erreur /api/live-assistant/settings :", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get("/api/live-assistant/history", async (req, res) => {
    try {
        const email = normalizeEmail(req.query.email);
        const pro = await getLiveAssistantProState(email);
        if (!pro) {
            return res.status(403).json({ success: false, error: "CreatorPilot Pro requis" });
        }
        const saved = getLiveAssistantStore()[email] || {};
        res.json({ success: true, history: Array.isArray(saved.history) ? saved.history : [] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post("/api/live-assistant/ai-advice", async (req, res) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const pro = await getLiveAssistantProState(email);
        if (!pro) {
            return res.status(403).json({ success: false, error: "CreatorPilot Pro requis" });
        }
        const advice = "Pose une question simple au chat, annonce un petit objectif et relance les spectateurs qui viennent d'arriver.";
        const store = getLiveAssistantStore();
        store[email] = { ...(store[email] || {}), lastAiAdvice: advice };
        saveSettingsFile();
        res.json({ success: true, advice });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post("/api/live-assistant/reset", async (req, res) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const pro = await getLiveAssistantProState(email);
        if (!pro) {
            return res.status(403).json({ success: false, error: "CreatorPilot Pro requis" });
        }
        const store = getLiveAssistantStore();
        const current = store[email] || {};
        store[email] = {
            options: current.options || defaultLiveAssistantOptions(),
            history: [],
            score: 0,
            peakViewers: 0,
            latest: {
                viewers: 0,
                likesPerMinute: 0,
                chatPerMinute: 0,
                coinsPerMinute: 0
            }
        };
        saveSettingsFile();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});



server.listen(3000, () => {
    console.log("CreatorPilot lancé");
});