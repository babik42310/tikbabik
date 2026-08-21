const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { exec } = require("child_process");
const { WebcastPushConnection } = require("tiktok-live-connector");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const path = require("path");
const DATA_DIR =
    process.env.APPDATA
        ? path.join(process.env.APPDATA, "CreatorPilot")
        : process.env.RAILWAY_VOLUME_MOUNT_PATH
            ? process.env.RAILWAY_VOLUME_MOUNT_PATH
            : __dirname;

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const RESET_TOKENS_FILE =
    path.join(DATA_DIR, "resetTokens.json");

const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const STATS_FILE = path.join(DATA_DIR, "stats.json");
const RANKINGS_FILE = path.join(DATA_DIR, "rankings.json");
const LEGACY_SETTINGS_CLAIM_FILE = path.join(DATA_DIR, ".creatorpilot-legacy-settings-claimed");
const LEGACY_STATS_CLAIM_FILE = path.join(DATA_DIR, ".creatorpilot-legacy-stats-claimed");
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

/* ============================================================
   IDENTITÉ PERSISTANTE PAR COMPTE
   ============================================================ */
const clientOwnerKeyByClientId = new Map();
const userIdByOwnerKey = new Map();
const loadedPersistentOwnerKeys = new Set();
const userStateWriteQueues = new Map();

function userOwnerKey(userId) {
    return "user:" + String(userId);
}

function canonicalClientKey(clientId) {
    const raw = String(clientId || "").trim();
    return clientOwnerKeyByClientId.get(raw) || raw;
}

function userIdFromOwnerKey(ownerKey) {
    return userIdByOwnerKey.get(ownerKey) || null;
}

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

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            username TEXT,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            last_login TIMESTAMP
        )
    `).catch(async error => {

        // gen_random_uuid() nécessite l'extension pgcrypto — on
        // l'active si besoin, puis on retente une seule fois.
        if (error.message.includes("gen_random_uuid")) {
            await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
            await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    email TEXT UNIQUE NOT NULL,
                    username TEXT,
                    password_hash TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    last_login TIMESTAMP
                )
            `);
        } else {
            throw error;
        }

    });

    await pool.query(`
        CREATE TABLE IF NOT EXISTS auth_sessions (
            token TEXT PRIMARY KEY,
            user_id UUID NOT NULL,
            email TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creatorpilot_user_state (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            settings JSONB NOT NULL DEFAULT '{}'::jsonb,
            stats JSONB NOT NULL DEFAULT '{"topGifters":{},"giftHistory":[]}'::jsonb,
            rankings JSONB NOT NULL DEFAULT '{"topLikes":{},"topDonors":{},"topPresence":{}}'::jsonb,
            live_stats JSONB NOT NULL DEFAULT '{"connected":false,"username":"","startTime":null,"likes":0,"followers":0,"gifts":0,"diamonds":0}'::jsonb,
            points_state JSONB NOT NULL DEFAULT '{"users":{},"transactions":[]}'::jsonb,
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creatorpilot_client_bindings (
            client_id TEXT PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);

    const bindings = await pool.query(
        "SELECT client_id, user_id FROM creatorpilot_client_bindings"
    );

    bindings.rows.forEach(row => {
        const ownerKey = userOwnerKey(row.user_id);
        clientOwnerKeyByClientId.set(row.client_id, ownerKey);
        userIdByOwnerKey.set(ownerKey, String(row.user_id));
    });

    const uniqueUserIds = [...new Set(bindings.rows.map(row => String(row.user_id)))];
    for (const userId of uniqueUserIds) {
        await ensurePersistentUserStateLoaded(userId);
    }

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

/*
   ============================================================
   VRAIE SESSION SERVEUR (comptes / PRO)

   Séparée du cookie cp_session ci-dessus (qui reste anonyme et
   sert uniquement à isoler les réglages par appareil). Celle-ci
   n'existe que lorsqu'un compte est réellement connecté, avec un
   cookie httpOnly (illisible en JavaScript, donc protégé même en
   cas de faille XSS ailleurs) et une vraie expiration côté
   serveur.
   ============================================================
*/

const AUTH_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

async function createAuthSession(res, userId, email) {

    const token =
        crypto.randomBytes(32).toString("hex");

    const expiresAt =
        new Date(Date.now() + AUTH_SESSION_DURATION_MS);

    await pool.query(
        `
        INSERT INTO auth_sessions (token, user_id, email, expires_at)
        VALUES ($1, $2, $3, $4)
        `,
        [token, userId, email, expiresAt]
    );

    const cookieParts = [
        "cp_auth=" + token,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=" + Math.floor(AUTH_SESSION_DURATION_MS / 1000)
    ];

    res.setHeader("Set-Cookie", cookieParts.join("; "));

}

async function destroyAuthSession(req, res) {

    const cookies =
        cpParseCookies(req);

    if (cookies.cp_auth) {

        try {
            await pool.query(
                "DELETE FROM auth_sessions WHERE token = $1",
                [cookies.cp_auth]
            );
        } catch (error) {
            console.log("Erreur suppression session :", error.message);
        }

    }

    res.setHeader(
        "Set-Cookie",
        "cp_auth=; Path=/; HttpOnly; Max-Age=0"
    );

}

async function getAuthSession(req) {

    const cookies =
        cpParseCookies(req);

    const token =
        cookies.cp_auth;

    if (!token) {
        return null;
    }

    try {

        const result =
            await pool.query(
                "SELECT user_id, email, expires_at FROM auth_sessions WHERE token = $1",
                [token]
            );

        const session =
            result.rows[0];

        if (!session) {
            return null;
        }

        if (new Date(session.expires_at).getTime() < Date.now()) {
            pool.query("DELETE FROM auth_sessions WHERE token = $1", [token]).catch(() => {});
            return null;
        }

        return {
            userId: session.user_id,
            email: session.email
        };

    } catch (error) {

        console.log("Erreur lecture session :", error.message);
        return null;

    }

}

/*
   À utiliser devant toute route qui doit exiger un compte
   réellement connecté (pas juste "prétendu connecté" côté
   navigateur). Exemple : app.get("/route", requireAuthSession, ...)
*/
async function requireAuthSession(req, res, next) {

    const session =
        await getAuthSession(req);

    if (!session) {
        return res.status(401).json({
            success: false,
            error: "Non connecté"
        });
    }

    req.authUser = session;

    next();

}

setInterval(() => {

    pool.query("DELETE FROM auth_sessions WHERE expires_at < NOW()")
        .catch(error => {
            console.log("Erreur nettoyage sessions expirées :", error.message);
        });

}, 3600000);


app.use(express.static(path.join(__dirname, "public")));

app.get("/download", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "download.html"));
});


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

/* Relie les requêtes authentifiées au user_id permanent. */
app.use(async (req, res, next) => {
    try {
        const session = await getAuthSession(req);
        if (session) {
            req.authUser = session;
            req.cpOwnerKey = userOwnerKey(session.userId);
            await attachClientToUserAfterLogin(req, session.userId);
        } else {
            req.cpOwnerKey = req.cpSessionId;
        }
        next();
    } catch (error) {
        console.log("Erreur résolution propriétaire CreatorPilot :", error.message);
        req.cpOwnerKey = req.cpSessionId;
        next();
    }
});

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
const ALLOWED_UPLOAD_TYPES = {
    "audio/mpeg": { dir: () => soundsDir, ext: "mp3" },
    "audio/mp3": { dir: () => soundsDir, ext: "mp3" },
    "audio/wav": { dir: () => soundsDir, ext: "wav" },
    "audio/x-wav": { dir: () => soundsDir, ext: "wav" },
    "audio/ogg": { dir: () => soundsDir, ext: "ogg" },
    "image/png": { dir: () => imagesDir, ext: "png" },
    "image/jpeg": { dir: () => imagesDir, ext: "jpg" },
    "image/gif": { dir: () => imagesDir, ext: "gif" },
    "image/webp": { dir: () => imagesDir, ext: "webp" }
};

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        const allowed =
            ALLOWED_UPLOAD_TYPES[file.mimetype];

        if (!allowed) {
            return cb(new Error("Type de fichier non autorisé"));
        }

        cb(null, allowed.dir());

    },

    filename: (req, file, cb) => {

        const allowed =
            ALLOWED_UPLOAD_TYPES[file.mimetype];

        const safeName =
            crypto.randomBytes(16).toString("hex") +
            "." +
            (allowed ? allowed.ext : "bin");

        cb(null, safeName);

    }

});



const upload = multer({
    storage: storage,
    limits: {
        fileSize: 15 * 1024 * 1024 // 15 Mo max
    },
    fileFilter: (req, file, cb) => {

        if (!ALLOWED_UPLOAD_TYPES[file.mimetype]) {
            return cb(new Error("Type de fichier non autorisé"));
        }

        cb(null, true);

    }
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

    const providedSecret =
        req.headers["x-admin-secret"] || "";

    if (
        !process.env.ADMIN_SECRET ||
        providedSecret !== process.env.ADMIN_SECRET
    ) {
        return res.status(403).json({
            success: false,
            error: "Non autorisé"
        });
    }

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

app.post("/upload", (req, res) => {

    upload.single("file")(req, res, error => {

        if (error) {
            console.log("ERREUR UPLOAD :", error.message);
            return res.status(400).json({
                success: false,
                error:
                    error.code === "LIMIT_FILE_SIZE"
                        ? "Fichier trop volumineux (15 Mo maximum)"
                        : "Type de fichier non autorisé (images et sons uniquement)"
            });
        }

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

});

app.post("/upload-sound-from-url", express.json(), async (req, res) => {

    try {

        const soundUrl =
            req.body.url;

        if (!soundUrl || !/^https?:\/\//i.test(soundUrl)) {
            return res.status(400).json({
                success: false,
                error: "Lien invalide"
            });
        }

        const browserHeaders = {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "*/*"
        };

        let response =
            await fetch(soundUrl, { headers: browserHeaders });

        if (!response.ok) {
            return res.status(400).json({
                success: false,
                error: "Impossible de télécharger ce lien (code " + response.status + ")"
            });
        }

        let contentType =
            response.headers.get("content-type") || "";

        const looksLikeAudioUrl =
            /\.(mp3|wav|ogg)(\?|$)/i.test(soundUrl);

        /*
           Si le lien pointe vers une page (ex: la fiche d'un son
           sur MyInstants) plutôt qu'un fichier audio direct, on
           cherche automatiquement le vrai lien MP3 caché dedans.
        */
        if (
            contentType.includes("html") ||
            (!contentType.includes("audio") && !looksLikeAudioUrl)
        ) {

            const html =
                await response.text();

            const audioMatch =
                html.match(/og:audio"?\s+content="([^"]+)"/) ||
                html.match(/href="([^"]*\/media\/sounds\/[^"]+\.(?:mp3|wav|ogg))"/) ||
                html.match(/["']([^"']*\/media\/sounds\/[^"']+\.(?:mp3|wav|ogg))["']/);

            if (!audioMatch) {
                return res.status(400).json({
                    success: false,
                    error: "Aucun fichier audio trouvé sur cette page. Essaie de coller directement le lien du bouton \"Télécharger MP3\"."
                });
            }

            let audioUrl =
                audioMatch[1];

            if (audioUrl.startsWith("/")) {
                const origin =
                    new URL(soundUrl).origin;

                audioUrl =
                    origin + audioUrl;
            }

            response =
                await fetch(audioUrl, { headers: browserHeaders });

            if (!response.ok) {
                return res.status(400).json({
                    success: false,
                    error: "Le fichier audio trouvé n'a pas pu être téléchargé"
                });
            }

            contentType =
                response.headers.get("content-type") || "";

        }

        const finalLooksLikeAudio =
            contentType.includes("audio") ||
            looksLikeAudioUrl ||
            /\.(mp3|wav|ogg)(\?|$)/i.test(response.url || "");

        if (!finalLooksLikeAudio) {
            return res.status(400).json({
                success: false,
                error: "Ce lien ne pointe pas vers un fichier audio"
            });
        }

        const buffer =
            Buffer.from(await response.arrayBuffer());

        let extension = "mp3";

        const sourceForExtension =
            response.url || soundUrl;

        if (contentType.includes("wav") || /\.wav(\?|$)/i.test(sourceForExtension)) extension = "wav";
        if (contentType.includes("ogg") || /\.ogg(\?|$)/i.test(sourceForExtension)) extension = "ogg";

        const safeName =
            "web-" + Date.now() + "." + extension;

        fs.writeFileSync(
            path.join(soundsDir, safeName),
            buffer
        );

        res.json({
            success: true,
            filename: safeName
        });

    } catch (error) {

        console.log("ERREUR TÉLÉCHARGEMENT SON :", error);

        res.status(500).json({
            success: false,
            error: "Échec du téléchargement : " + error.message
        });

    }

});

/* STATS */

let legacyStats = {
    topGifters: {},
    giftHistory: []
};

try {
    legacyStats = JSON.parse(fs.readFileSync(STATS_FILE));
    console.log("Statistiques legacy chargées");
} catch (error) {
    console.log("stats.json introuvable, statistiques vides");
}

const statsByClient = new Map();

function cpStatsFilePath(clientId) {
    return path.join(CP_SETTINGS_DIR, clientId + "-stats.json");
}

function claimLegacyStatsOnce() {
    if (!fs.existsSync(STATS_FILE)) return null;

    try {
        fs.writeFileSync(LEGACY_STATS_CLAIM_FILE, new Date().toISOString(), { flag: "wx" });
        return JSON.parse(JSON.stringify(legacyStats));
    } catch (error) {
        if (error.code !== "EEXIST") {
            console.log("Erreur marqueur migration stats :", error.message);
        }
        return null;
    }
}

function getClientStats(clientId) {
    const ownerKey = canonicalClientKey(clientId);

    if (statsByClient.has(ownerKey)) {
        return statsByClient.get(ownerKey);
    }

    let data = { topGifters: {}, giftHistory: [] };

    if (!userIdFromOwnerKey(ownerKey)) {
        const filePath = cpStatsFilePath(ownerKey);
        if (fs.existsSync(filePath)) {
            try {
                data = JSON.parse(fs.readFileSync(filePath, "utf8"));
            } catch (error) {
                console.log("Stats client illisibles pour", ownerKey, "- valeurs par défaut utilisées");
            }
        }
    }

    statsByClient.set(ownerKey, data);
    return data;
}

function saveClientStats(clientId, data) {
    const ownerKey = canonicalClientKey(clientId);
    statsByClient.set(ownerKey, data);

    const userId = userIdFromOwnerKey(ownerKey);
    if (userId) {
        persistUserStateSection(userId, "stats", data);
        return;
    }

    fs.writeFileSync(cpStatsFilePath(ownerKey), JSON.stringify(data, null, 2));
}

function emptyPrivateStats() {
    return { topGifters: {}, giftHistory: [] };
}

function emptyLiveStats() {
    return {
        connected: false,
        username: "",
        startTime: null,
        likes: 0,
        followers: 0,
        gifts: 0,
        diamonds: 0
    };
}

app.get("/stats", async (req, res) => {
    // Les statistiques du tableau de bord sont strictement privées.
    // Aucun compte connecté = aucune statistique affichée.
    if (!req.authUser?.userId) {
        return res.json(emptyPrivateStats());
    }

    await ensurePersistentUserStateLoaded(req.authUser.userId);
    res.json(getClientStats(userOwnerKey(req.authUser.userId)));
});

app.get("/live-stats", (req, res) => {
    // Les overlays OBS utilisent ?client=... et restent fonctionnels.
    // Le tableau de bord sans compte, lui, ne reçoit aucune stat privée.
    if (!req.query.client && !req.authUser?.userId) {
        return res.json(emptyLiveStats());
    }

    res.json(getLiveSessionStats(req.cpOwnerKey || resolveClientId(req)));
});

app.post("/stats", async (req, res) => {
    // On n'enregistre jamais de statistiques privées sans compte.
    if (!req.authUser?.userId) {
        return res.json({ success: false, ignored: true, reason: "account_required" });
    }

    await ensurePersistentUserStateLoaded(req.authUser.userId);
    saveClientStats(userOwnerKey(req.authUser.userId), req.body);
    res.json({ success: true });
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

/*
   Sauvegarde de secours permanente par COMPTE.
   PostgreSQL reste la base centrale, mais chaque utilisateur possède
   aussi un fichier JSON sur le volume persistant Railway. Cela protège
   les réglages contre une écriture incomplète et permet une restauration
   automatique si nécessaire.
*/
const CP_USER_SETTINGS_DIR =
    path.join(DATA_DIR, "user-settings");

if (!fs.existsSync(CP_USER_SETTINGS_DIR)) {
    fs.mkdirSync(CP_USER_SETTINGS_DIR, { recursive: true });
}

function cpUserSettingsFilePath(userId) {
    return path.join(CP_USER_SETTINGS_DIR, String(userId) + ".json");
}

function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function mergeSettingsDeep(base, incoming) {
    const result = isPlainObject(base) ? { ...base } : {};
    if (!isPlainObject(incoming)) return result;

    Object.entries(incoming).forEach(([key, value]) => {
        if (isPlainObject(value) && isPlainObject(result[key])) {
            result[key] = mergeSettingsDeep(result[key], value);
        } else {
            // Les tableaux doivent être remplacés intégralement : actions,
            // alertes sonores, événements, etc.
            result[key] = value;
        }
    });

    return result;
}

function readUserSettingsBackup(userId) {
    try {
        const filePath = cpUserSettingsFilePath(userId);
        if (!fs.existsSync(filePath)) return null;
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (!parsed || !isPlainObject(parsed.settings)) return null;
        return parsed;
    } catch (error) {
        console.log("Backup réglages utilisateur illisible :", error.message);
        return null;
    }
}

function writeUserSettingsBackup(userId, settingsData) {
    if (!userId) return;

    try {
        const filePath = cpUserSettingsFilePath(userId);
        const tempPath = filePath + ".tmp";
        const payload = {
            version: 1,
            userId: String(userId),
            savedAt: new Date().toISOString(),
            settings: settingsData
        };

        fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), "utf8");
        fs.renameSync(tempPath, filePath);
    } catch (error) {
        console.log("Erreur backup réglages utilisateur :", error.message);
    }
}

const settingsByClient = new Map();

function cpSettingsFilePath(sessionId) {
    return path.join(CP_SETTINGS_DIR, sessionId + ".json");
}

function createFreshClientSettings() {
    return {
        voiceEnabled: true,
        pro: false,
        actions: [],
        actionEvents: [],
        soundAlerts: [],
        soundsEnabled: true,
        chatBot: {
            enabled: true,
            prefix: "!",
            cooldownSeconds: 8,
            commands: {
                points: { enabled: true },
                objectif: { enabled: true },
                roue: { enabled: true }
            }
        }
    };
}

function claimLegacySettingsOnce() {
    if (!fs.existsSync(SETTINGS_FILE)) return null;

    try {
        fs.writeFileSync(LEGACY_SETTINGS_CLAIM_FILE, new Date().toISOString(), { flag: "wx" });
        return JSON.parse(JSON.stringify(settings));
    } catch (error) {
        if (error.code !== "EEXIST") {
            console.log("Erreur marqueur migration settings :", error.message);
        }
        return null;
    }
}

function getClientSettings(sessionId) {

    const ownerKey = canonicalClientKey(sessionId);

    if (settingsByClient.has(ownerKey)) {
        console.log("📂 GET SETTINGS — ownerKey:", ownerKey, "→ trouvé en mémoire (cache)");
        return settingsByClient.get(ownerKey);
    }

    let clientSettings = createFreshClientSettings();

    if (!userIdFromOwnerKey(ownerKey)) {
        const filePath = cpSettingsFilePath(ownerKey);
        if (fs.existsSync(filePath)) {
            try {
                clientSettings = JSON.parse(fs.readFileSync(filePath, "utf8"));
                console.log("📂 GET SETTINGS — ownerKey:", ownerKey, "→ chargé depuis fichier anonyme:", filePath);
            } catch (error) {
                console.log("Réglages client illisibles pour", ownerKey, "- valeurs par défaut utilisées");
            }
        } else {
            console.log("📂 GET SETTINGS — ownerKey:", ownerKey, "→ AUCUN fichier trouvé, réglages VIERGES utilisés (userId lié: aucun)");
        }
    } else {
        console.log("📂 GET SETTINGS — ownerKey:", ownerKey, "→ userId lié:", userIdFromOwnerKey(ownerKey), "mais PAS ENCORE EN CACHE → réglages VIERGES retournés (ensurePersistentUserStateLoaded n'a pas encore tourné pour ce compte)");
    }

    settingsByClient.set(ownerKey, clientSettings);
    return clientSettings;
}

function saveClientSettings(sessionId, data) {

    const ownerKey = canonicalClientKey(sessionId);

    console.log("💾 SAVE SETTINGS — sessionId:", sessionId, "→ ownerKey:", ownerKey, "→ userId lié:", userIdFromOwnerKey(ownerKey) || "(aucun, anonyme)");

    // IMPORTANT : on fusionne toujours avec l'état déjà chargé.
    // Ainsi un POST partiel (ex. uniquement { pro: true }) ne peut plus
    // effacer les sons, actions, overlays ou réglages de mini-jeux.
    const currentSettings = getClientSettings(ownerKey);
    const mergedSettings = mergeSettingsDeep(currentSettings, data || {});

    settingsByClient.set(ownerKey, mergedSettings);

    const userId = userIdFromOwnerKey(ownerKey);
    if (userId) {
        // Écriture locale atomique immédiate + PostgreSQL.
        writeUserSettingsBackup(userId, mergedSettings);
        persistUserStateSection(userId, "settings", mergedSettings)
            .then(() => console.log("✅ SAVE SETTINGS réussi en base PostgreSQL pour userId:", userId))
            .catch(error => console.log("❌ SAVE SETTINGS échec PostgreSQL pour userId:", userId, "-", error.message));
        return mergedSettings;
    }

    fs.writeFileSync(
        cpSettingsFilePath(ownerKey),
        JSON.stringify(mergedSettings, null, 2)
    );

    console.log("✅ SAVE SETTINGS réussi en fichier (anonyme) :", cpSettingsFilePath(ownerKey));

    return mergedSettings;
}

const chatBotCooldowns = {};

/*
   ============================================================
   TIRELIRE ANIMÉE (coin jar)
   Se remplit à chaque cadeau, joue une animation de célébration
   et se vide automatiquement une fois pleine.
   ============================================================
*/

const coinJarByClient = new Map();

function getClientCoinJar(clientId) {

    if (!coinJarByClient.has(clientId)) {
        coinJarByClient.set(clientId, {
            current: 0,
            celebrating: false
        });
    }

    return coinJarByClient.get(clientId);
}

function addToCoinJar(clientId, diamonds) {

    const jarSettings =
        getClientSettings(clientId).coinJar;

    if (!jarSettings || !jarSettings.enabled) {
        return;
    }

    const target =
        Number(jarSettings.target || 1000);

    const jar =
        getClientCoinJar(clientId);

    if (jar.celebrating) {
        return;
    }

    jar.current += diamonds;

    if (jar.current >= target) {

        jar.current = target;
        jar.celebrating = true;

        emitToCreatorPilotClient(clientId, "coinJarUpdated", jar);

        setTimeout(() => {
            jar.current = 0;
            jar.celebrating = false;
            emitToCreatorPilotClient(clientId, "coinJarUpdated", jar);
        }, 4000);

        return;
    }

    emitToCreatorPilotClient(clientId, "coinJarUpdated", jar);

}

app.get("/coin-jar/status", (req, res) => {
    res.json(getClientCoinJar(resolveClientId(req)));
});

app.get("/coin-jar/settings", (req, res) => {

    const clientId =
        resolveClientId(req);

    res.json(
        getClientSettings(clientId).coinJar || {
            enabled: true,
            target: 1000,
            jarColor: "#22d3ee",
            coinColor: "#ffd700",
            ringColor1: "#22d3ee",
            ringColor2: "#a855f7",
            ringColor3: "#ec4899",
            ringSpeed: 6,
            celebrationText: "Tirelire pleine !"
        }
    );

});

app.post("/coin-jar/settings", express.json(), (req, res) => {

    const clientId =
        resolveClientId(req);

    const clientSettings =
        getClientSettings(clientId);

    clientSettings.coinJar = {
        enabled: req.body.enabled !== false,
        target: Number(req.body.target || 1000),
        jarColor: req.body.jarColor || "#22d3ee",
        coinColor: req.body.coinColor || "#ffd700",
        ringColor1: req.body.ringColor1 || "#22d3ee",
        ringColor2: req.body.ringColor2 || "#a855f7",
        ringColor3: req.body.ringColor3 || "#ec4899",
        ringSpeed: Number(req.body.ringSpeed || 6),
        celebrationText: req.body.celebrationText || "Tirelire pleine !"
    };

    saveClientSettings(clientId, clientSettings);

    res.json({
        success: true,
        settings: clientSettings.coinJar
    });

});

app.post("/coin-jar/reset", (req, res) => {

    const clientId =
        resolveClientId(req);

    coinJarByClient.set(clientId, {
        current: 0,
        celebrating: false
    });

    emitToCreatorPilotClient(clientId, "coinJarUpdated", getClientCoinJar(clientId));

    res.json({ success: true });

});

app.get("/overlay/coin-jar", (req, res) => {

    const clientId =
        resolveClientId(req);

    const jarSettings =
        getClientSettings(clientId).coinJar || {};

    const target =
        jarSettings.target || 1000;

    const jarColor =
        jarSettings.jarColor || "#22d3ee";

    const coinColor =
        jarSettings.coinColor || "#ffd700";

    const ringColor1 =
        jarSettings.ringColor1 || "#22d3ee";

    const ringColor2 =
        jarSettings.ringColor2 || "#a855f7";

    const ringColor3 =
        jarSettings.ringColor3 || "#ec4899";

    const ringSpeed =
        jarSettings.ringSpeed || 6;

    const celebrationText =
        jarSettings.celebrationText || "Tirelire pleine !";

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

@keyframes coinFloat {
    0% { transform: translateY(0) scale(1); opacity: 1; }
    100% { transform: translateY(-140px) scale(0.4); opacity: 0; }
}

@keyframes jarPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

@keyframes celebrationText {
    0% { transform: scale(0) rotate(-8deg); opacity: 0; }
    30% { transform: scale(1.2) rotate(3deg); opacity: 1; }
    50% { transform: scale(1) rotate(0deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 0; }
}

body{
    margin:0;
    background:transparent;
    overflow:hidden;
    display:flex;
    align-items:center;
    justify-content:center;
    height:100vh;
    font-family:'Rajdhani', sans-serif;
}

#ring{
    position:relative;
    width:220px;
    height:280px;
    padding:3px;
    border-radius:110px 110px 24px 24px;
    background:conic-gradient(from var(--angle), ${ringColor1}, ${ringColor2}, ${ringColor3}, ${ringColor1});
    animation:spin ${ringSpeed}s linear infinite;
}

#jarBox{
    width:100%;
    height:100%;
    border-radius:108px 108px 22px 22px;
    background:#05060f;
    position:relative;
    overflow:hidden;
    display:flex;
    align-items:flex-end;
    justify-content:center;
}

#fill{
    width:100%;
    height:0%;
    background:linear-gradient(180deg, ${coinColor}cc, ${jarColor});
    box-shadow:0 0 25px ${coinColor}aa;
    transition:height 0.6s ease;
    border-radius:0 0 22px 22px;
}

#label{
    position:absolute;
    top:14px;
    left:0;
    right:0;
    text-align:center;
    font-family:'Orbitron', sans-serif;
    font-size:16px;
    font-weight:800;
    color:#f5f7ff;
    text-shadow:0 0 10px ${coinColor}aa;
    z-index:5;
}

#celebration{
    position:absolute;
    top:40%;
    left:50%;
    transform:translate(-50%, -50%) scale(0);
    font-family:'Orbitron', sans-serif;
    font-size:22px;
    font-weight:800;
    color:${coinColor};
    text-shadow:0 0 20px ${coinColor};
    text-align:center;
    white-space:nowrap;
    z-index:10;
}

#celebration.active{
    animation:celebrationText 4s ease forwards;
}

.floatingCoin{
    position:absolute;
    bottom:20px;
    font-size:22px;
    animation:coinFloat 1.2s ease-out forwards;
    z-index:8;
}

#ring.pulsing{
    animation:spin ${ringSpeed}s linear infinite, jarPulse 0.6s ease infinite;
}
</style>
</head>
<body>

<div id="ring">
<div id="jarBox">
    <div id="label">0 / ${target}</div>
    <div id="fill"></div>
    <div id="celebration">🎉 ${celebrationText} 🎉</div>
</div>
</div>

<script>
let lastCurrent = 0;

async function updateCoinJar(){

    const response = await fetch("/coin-jar/status?client=${clientId}");
    const data = await response.json();

    const percent = Math.min(100, Math.round((data.current / ${target}) * 100));

    document.getElementById("fill").style.height = percent + "%";
    document.getElementById("label").textContent = data.current + " / ${target}";

    const ring = document.getElementById("ring");
    const celebration = document.getElementById("celebration");

    if (data.celebrating) {
        ring.classList.add("pulsing");
        celebration.classList.add("active");
    } else {
        ring.classList.remove("pulsing");
        celebration.classList.remove("active");
    }

    if (data.current > lastCurrent && !data.celebrating) {

        const coin = document.createElement("div");
        coin.className = "floatingCoin";
        coin.textContent = "🪙";
        coin.style.left = (40 + Math.random() * 20) + "%";
        document.getElementById("jarBox").appendChild(coin);

        setTimeout(() => coin.remove(), 1200);

    }

    lastCurrent = data.current;

}

setInterval(updateCoinJar, 1000);
updateCoinJar();
</script>

</body>
</html>
`);
});

/*
   ============================================================
   FILE D'ATTENTE MUSICALE (demandes via cadeau + message chat)
   ============================================================
*/

const musicQueueByClient = new Map();
const musicWaitingByClient = new Map();

function getClientMusicQueue(clientId) {
    if (!musicQueueByClient.has(clientId)) {
        musicQueueByClient.set(clientId, []);
    }
    return musicQueueByClient.get(clientId);
}

function getClientMusicWaiting(clientId) {
    if (!musicWaitingByClient.has(clientId)) {
        musicWaitingByClient.set(clientId, new Map());
    }
    return musicWaitingByClient.get(clientId);
}

function handleMusicGift(clientId, data, diamondCount) {

    const musicSettings =
        getClientSettings(clientId).musicQueue;

    if (!musicSettings || !musicSettings.enabled) {
        return;
    }

    const minDiamonds =
        Number(musicSettings.minDiamonds || 1);

    if (diamondCount < minDiamonds) {
        return;
    }

    const user =
        data.nickname || "Utilisateur";

    const waiting =
        getClientMusicWaiting(clientId);

    waiting.set(user, {
        avatar: data.profilePictureUrl || data.profilePicture || "",
        expiresAt: Date.now() + (Number(musicSettings.windowSeconds || 30) * 1000)
    });

}

function handleMusicChatMessage(clientId, data) {

    const musicSettings =
        getClientSettings(clientId).musicQueue;

    if (!musicSettings || !musicSettings.enabled) {
        return;
    }

    const user =
        data.nickname || "Utilisateur";

    const waiting =
        getClientMusicWaiting(clientId);

    const entry =
        waiting.get(user);

    if (!entry) {
        return;
    }

    if (Date.now() > entry.expiresAt) {
        waiting.delete(user);
        return;
    }

    const song =
        String(data.comment || "").trim().slice(0, 120);

    if (!song) {
        return;
    }

    waiting.delete(user);

    const queue =
        getClientMusicQueue(clientId);

    queue.push({
        user,
        song,
        avatar: entry.avatar,
        addedAt: Date.now()
    });

    if (queue.length > 50) {
        queue.shift();
    }

    emitToCreatorPilotClient(clientId, "musicQueueUpdated", queue);

}

function handleChatBotCommand(data, clientId) {

    const cb = getClientSettings(clientId).chatBot;

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
        if (!getClientActionWheel(clientId).spinning) {
            spinActionWheel(clientId);
            emitToCreatorPilotClient(clientId, "chatBotTriggered", { command: word, user });
        }
        return;
    }

    if (word === "points" || word === "objectif") {
        emitToCreatorPilotClient(clientId, "chatBotCommand", { type: word, user });
        return;
    }

    if (commandConfig.actionName) {
        executeActionByName(commandConfig.actionName, clientId);
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
    res.json(getClientSettings(req.cpOwnerKey || req.cpSessionId));
});

app.post("/settings", (req, res) => {
    const saved = saveClientSettings(req.cpOwnerKey || req.cpSessionId, req.body);

    res.json({
        success: true,
        settings: saved
    });
});

app.get("/api/mobile/status", (req, res) => {
    const clientId = req.cpOwnerKey || resolveClientId(req);
    const clientSettings = getClientSettings(clientId);

    res.json({
        success: true,
        app: "CreatorPilot",
        version: "2.0.7",
        tiktokUsername: clientSettings.tiktokUsername || "",
        pro: clientSettings.pro === true,
        ttsEnabled: clientSettings.ttsChat?.enabled === true,
        soundsEnabled: clientSettings.soundsEnabled !== false,
        soundAlerts: clientSettings.soundAlerts?.length || 0
    });
});

app.post("/api/mobile/sounds/toggle", (req, res) => {
    const clientId = req.cpOwnerKey || resolveClientId(req);
    const clientSettings = getClientSettings(clientId);

    clientSettings.soundsEnabled = clientSettings.soundsEnabled === false;
    saveClientSettings(clientId, clientSettings);

    res.json({ success: true, soundsEnabled: clientSettings.soundsEnabled });
});

app.post("/api/mobile/alerts/add", upload.single("sound"), (req, res) => {
    const clientId = req.cpOwnerKey || resolveClientId(req);
    const clientSettings = getClientSettings(clientId);

    clientSettings.soundAlerts = clientSettings.soundAlerts || [];

    const trigger = req.body.trigger || "gift";
    const volume = Number(req.body.volume || 100);
    const filename = req.file ? req.file.filename : "";

    const existingAlert = clientSettings.soundAlerts.find(alert => alert.trigger === trigger);

    if (existingAlert) {
        existingAlert.enabled = true;
        existingAlert.volume = volume;
        if (filename) existingAlert.sound = filename;
    } else {
        clientSettings.soundAlerts.push({ enabled: true, trigger, sound: filename, volume });
    }

    saveClientSettings(clientId, clientSettings);
    res.json({ success: true, soundAlerts: clientSettings.soundAlerts });
});

app.post("/api/mobile/alerts/delete", (req, res) => {
    const clientId = req.cpOwnerKey || resolveClientId(req);
    const clientSettings = getClientSettings(clientId);
    const trigger = req.body.trigger;

    clientSettings.soundAlerts = (clientSettings.soundAlerts || [])
        .filter(alert => alert.trigger !== trigger);

    saveClientSettings(clientId, clientSettings);
    res.json({ success: true, soundAlerts: clientSettings.soundAlerts });
});

app.get("/api/mobile/alerts", (req, res) => {
    const clientId = req.cpOwnerKey || resolveClientId(req);
    const clientSettings = getClientSettings(clientId);
    const defaultTriggers = ["gift", "follow", "subscribe", "like", "share"];
    const uniqueAlerts = {};

    (clientSettings.soundAlerts || []).forEach(alert => {
        uniqueAlerts[alert.trigger] = alert;
    });

    defaultTriggers.forEach(trigger => {
        if (!uniqueAlerts[trigger]) {
            uniqueAlerts[trigger] = { enabled: true, trigger, sound: "", volume: 100 };
        }
    });

    clientSettings.soundAlerts = defaultTriggers.map(trigger => uniqueAlerts[trigger]);
    saveClientSettings(clientId, clientSettings);

    res.json({ success: true, alerts: clientSettings.soundAlerts });
});

app.post("/api/mobile/tts/toggle", (req, res) => {
    const clientId = req.cpOwnerKey || resolveClientId(req);
    const clientSettings = getClientSettings(clientId);

    clientSettings.ttsChat = clientSettings.ttsChat || {};
    clientSettings.ttsChat.enabled = !clientSettings.ttsChat.enabled;
    saveClientSettings(clientId, clientSettings);

    res.json({ success: true, ttsEnabled: clientSettings.ttsChat.enabled });
});

app.get("/mobile", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "mobile.html")
    );
});

/*
   ============================================================
   LIMITEUR DE DÉBIT — protège les routes qui coûtent de l'argent
   ou consomment un quota partagé (OpenAI, connexion TikTok/Euler
   Stream) contre les appels automatisés ou abusifs.
   ============================================================
*/

const rateLimitHitsByKey = new Map();

function isRateLimited(key, maxRequests, windowMs) {

    const now = Date.now();

    const hits =
        (rateLimitHitsByKey.get(key) || [])
            .filter(timestamp => now - timestamp < windowMs);

    if (hits.length >= maxRequests) {
        rateLimitHitsByKey.set(key, hits);
        return true;
    }

    hits.push(now);
    rateLimitHitsByKey.set(key, hits);

    return false;

}

setInterval(() => {

    const now = Date.now();

    rateLimitHitsByKey.forEach((hits, key) => {

        const stillValid =
            hits.filter(timestamp => now - timestamp < 600000);

        if (stillValid.length === 0) {
            rateLimitHitsByKey.delete(key);
        } else {
            rateLimitHitsByKey.set(key, stillValid);
        }

    });

}, 300000);

app.post("/tts/openai", async (req, res) => {

    try {

        const clientId =
            req.cpSessionId || req.ip;

        if (isRateLimited("tts:" + clientId, 20, 60000)) {
            return res.status(429).json({
                error: "Trop de demandes de synthèse vocale, réessaie dans une minute."
            });
        }

        if (isRateLimited("tts:ip:" + req.ip, 40, 60000)) {
            return res.status(429).json({
                error: "Trop de demandes de synthèse vocale depuis cette adresse."
            });
        }

        const text =
            (req.body.text || "").slice(0, 500);

        const voice =
            req.body.voice || "alloy";

        if (!text.trim()) {
            return res.status(400).json({
                error: "Texte manquant"
            });
        }

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

    if (isRateLimited("connect:" + (clientId || req.ip), 6, 60000)) {
        return res.status(429).json({
            success: false,
            error: "Trop de tentatives de connexion TikTok, réessaie dans une minute."
        });
    }

    if (isRateLimited("connect:ip:" + req.ip, 15, 60000)) {
        return res.status(429).json({
            success: false,
            error: "Trop de tentatives de connexion TikTok depuis cette adresse."
        });
    }

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

        if (req.authUser?.userId) {
            await bindClientToUser(clientId, req.authUser.userId);
            await ensurePersistentUserStateLoaded(req.authUser.userId);
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
            new WebcastPushConnection(
                username,
                process.env.EULER_API_KEY
                    ? { signApiKey: process.env.EULER_API_KEY }
                    : {}
            );

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

        lastActiveClientId = clientId;

        reconnectAttemptsByClient.set(clientId, 0);

        const persistedLiveStats = getLiveSessionStats(clientId);
        persistedLiveStats.connected = true;
        persistedLiveStats.username = username;
        persistedLiveStats.startTime = Date.now();

        // Les compteurs restent enregistrés jusqu'à un reset explicite.
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
        lastEventAtByClient.delete(clientId);

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

function executeActionByName(actionName, clientId) {

    console.log("================================");
console.log("ACTION REÇUE :", actionName);
console.log("================================");

    const clientSettings =
        clientId ? getClientSettings(clientId) : settings;

    const action =
        (clientSettings.actions || [])
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
        if (clientId) {
            emitToCreatorPilotClient(clientId, "play-action-sound", {
                sound: action.sound
            });
        } else {
            io.emit("play-action-sound", {
                sound: action.sound
            });
        }
    }

    if (action.type === "Commande") {
        console.log("Commande à exécuter :", action.description);
    }

    if (action.type === "Streamer.bot") {
        console.log("Action Streamer.bot :", action.description);
    }
}

function spinActionWheel(clientId) {

    const actionWheel =
        getClientActionWheel(clientId);

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
        winnerText,
        clientId
    );

}, 5000);
}
/* EVENTS */


const recentGifts = {};

const liveSessionStatsByClient = new Map();

function getLiveSessionStats(clientId) {

    const ownerKey = canonicalClientKey(clientId);

    if (!liveSessionStatsByClient.has(ownerKey)) {
        liveSessionStatsByClient.set(ownerKey, {
            connected: false,
            username: "",
            startTime: null,
            likes: 0,
            followers: 0,
            gifts: 0,
            diamonds: 0
        });
    }

    return liveSessionStatsByClient.get(ownerKey);
}

const liveStatsPersistTimers = new Map();

function scheduleLiveStatsPersistence(clientId) {
    const ownerKey = canonicalClientKey(clientId);
    const userId = userIdFromOwnerKey(ownerKey);
    if (!userId) return;

    clearTimeout(liveStatsPersistTimers.get(ownerKey));
    liveStatsPersistTimers.set(ownerKey, setTimeout(() => {
        persistUserStateSection(userId, "live_stats", getLiveSessionStats(ownerKey));
        liveStatsPersistTimers.delete(ownerKey);
    }, 1500));
}

function emitLiveStats(clientId) {
    const data = getLiveSessionStats(clientId);
    emitToCreatorPilotClient(clientId, "liveStats", data);
    scheduleLiveStatsPersistence(clientId);
}

const reconnectAttemptsByClient = new Map();

function attemptTikTokReconnect(clientId) {

    const username =
        tiktokUsernames.get(clientId);

    if (!username) {
        return;
    }

    const attempts =
        (reconnectAttemptsByClient.get(clientId) || 0) + 1;

    reconnectAttemptsByClient.set(clientId, attempts);

    if (attempts > 5) {
        console.log(
            "Reconnexion TikTok abandonnée pour", clientId,
            "après 5 tentatives — reconnexion manuelle nécessaire"
        );

        emitToCreatorPilotClient(clientId, "tiktok-reconnect-failed", {
            message: "La connexion à TikTok a été perdue et n'a pas pu être rétablie automatiquement. Reconnecte-toi manuellement."
        });

        return;
    }

    const delay =
        Math.min(180000, 15000 * attempts);

    console.log(
        "Nouvelle tentative de reconnexion TikTok dans",
        Math.round(delay / 1000) + "s",
        "(essai", attempts + "/5)"
    );

    setTimeout(async () => {

        try {

            const connection =
                new WebcastPushConnection(
                    username,
                    process.env.EULER_API_KEY
                        ? { signApiKey: process.env.EULER_API_KEY }
                        : {}
                );

            bindTikTokEvents(connection, clientId);

            const state =
                await connection.connect();

            tiktokConnections.set(clientId, connection);

            const stats =
                getLiveSessionStats(clientId);

            stats.connected = true;
            emitLiveStats(clientId);

            reconnectAttemptsByClient.set(clientId, 0);

            console.log(
                "Reconnexion TikTok réussie pour", clientId,
                "Room ID :", state.roomId
            );

        } catch (error) {

            console.log(
                "Échec reconnexion TikTok pour", clientId, ":",
                error.message
            );

            attemptTikTokReconnect(clientId);

        }

    }, delay);

}

/*
   ============================================================
   CHIEN DE GARDE — détecte les connexions TikTok "zombies"

   Certaines connexions TikTok restent marquées "connectées" côté
   serveur alors que TikTok a arrêté d'envoyer quoi que ce soit
   (aucun cadeau, chat, like, ni même mise à jour du nombre de
   viewers) — sans jamais déclencher l'événement "disconnected".
   L'app semblait alors "plantée" et nécessitait un relancement
   manuel. Cette vérification périodique force une reconnexion
   dès qu'un silence anormal est détecté.
   ============================================================
*/

const STALE_CONNECTION_TIMEOUT_MS = 90000; // 90 secondes sans aucun signal

setInterval(() => {

    const now = Date.now();

    tiktokConnections.forEach((connection, clientId) => {

        const lastEventAt =
            lastEventAtByClient.get(clientId);

        if (!lastEventAt) {
            return;
        }

        const stats =
            getLiveSessionStats(clientId);

        if (!stats.connected) {
            return;
        }

        if (now - lastEventAt > STALE_CONNECTION_TIMEOUT_MS) {

            console.log(
                "⚠️  Connexion TikTok silencieuse depuis plus de",
                Math.round(STALE_CONNECTION_TIMEOUT_MS / 1000) + "s",
                "pour", clientId, "— reconnexion forcée"
            );

            try {
                connection.disconnect();
            } catch (error) {
                // La connexion était déjà morte de toute façon, sans importance.
            }

            tiktokConnections.delete(clientId);
            lastEventAtByClient.delete(clientId);

            stats.connected = false;
            emitLiveStats(clientId);

            attemptTikTokReconnect(clientId);

        }

    });

}, 30000);

const lastEventAtByClient = new Map();

function markClientActivity(clientId) {
    lastEventAtByClient.set(clientId, Date.now());
}

function bindTikTokEvents(tiktokConnection, clientId) {


     if (!tiktokConnection) {
        return;
    }
    tiktokConnection.removeAllListeners();

    markClientActivity(clientId);

    tiktokConnection.on("disconnected", () => {
        console.log("TikTok LIVE déconnecté (stream terminé ou coupure)");
        getLiveSessionStats(clientId).connected = false;
        emitLiveStats(clientId);
        attemptTikTokReconnect(clientId);
    });

    tiktokConnection.on("roomUser", data => {
        // Signal de présence fréquent envoyé par TikTok (mise à jour
        // du nombre de viewers) — sert de "battement de cœur" pour
        // détecter une connexion silencieusement morte, même quand
        // il n'y a ni chat ni cadeau pendant un moment.
        markClientActivity(clientId);
    });

    tiktokConnection.on("chat", data => {

        console.log("CHAT REÇU :", data.nickname, data.comment);

        markClientActivity(clientId);

        applyChronoTime(clientId, getClientChrono(clientId).settings.perChat);

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

        trackPresence(clientId, data.nickname, data.profilePictureUrl || data.profilePicture || "");

        handleChatBotCommand(data, clientId);

    });

    tiktokConnection.on("gift", data => {

        console.log("GIFT REÇU :", data.nickname, data.giftName, data.diamondCount, "repeatCount:", data.repeatCount, "repeatEnd:", data.repeatEnd, "giftType:", data.giftType);

        markClientActivity(clientId);

        const giftName =
            data.giftName || data.gift?.name || "gift";

        const user =
            data.nickname || data.uniqueId || "user";

        /*
           Gestion des combos TikTok (ex: 20 roses envoyées d'affilée) :
           pour un cadeau "streakable" (giftType === 1), TikTok envoie
           un événement à chaque incrément du combo, avec repeatEnd à
           false jusqu'au dernier. On attend la fin du combo pour ne
           compter qu'UNE fois le total réel (diamondCount * repeatCount),
           au lieu de traiter chaque étape comme un cadeau séparé.
        */
        const isStreakable =
            data.giftType === 1;

        const comboFinished =
            data.repeatEnd !== false;

        if (isStreakable && !comboFinished) {
            return;
        }

        const totalDiamonds =
            Number(data.diamondCount || 0) *
            Number(data.repeatCount || 1);

        const matchingSoundAlert =
    (getClientSettings(clientId).soundAlerts || [])
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
    (getClientActionWheel(clientId).settings.wheels || [])
        .find(w =>
            w.enabled &&
           w.trigger === wheelGiftName ||
w.trigger?.startsWith(wheelGiftName + " ")
        );

if (wheelToTrigger) {
    spinActionWheel(clientId);
}

       const giftCoinsForChrono =
    totalDiamonds;

const clientChronoForGift =
    getClientChrono(clientId);

if (
    giftCoinsForChrono > 0 &&
    clientChronoForGift.settings.giftAutoEnabled &&
    clientChronoForGift.settings.giftMode !== "off"
) {

    const secondsToChange =
        giftCoinsForChrono *
        Number(clientChronoForGift.settings.secondsPerCoin || 1);

    applyChronoTime(clientId, secondsToChange);

}

        const clientCoinMatch =
            getClientCoinMatch(clientId);

        if (clientCoinMatch.active) {

    const coins =
    totalDiamonds;

const avatar =
    data.profilePictureUrl ||
    data.user?.profilePictureUrl ||
    data.avatar ||
    "";

if (!clientCoinMatch.players[user]) {
    clientCoinMatch.players[user] = {
        coins: 0,
        avatar: avatar
    };
}

clientCoinMatch.players[user].coins += coins;

if (avatar) {
    clientCoinMatch.players[user].avatar = avatar;
}
}

const clientGiftBattle =
    getClientGiftBattle(clientId);

if (clientGiftBattle.active) {

    const coins =
        totalDiamonds;

    if (coins > 0) {

        if (Math.random() < 0.5) {
            clientGiftBattle.teamRed += coins;
        } else {
            clientGiftBattle.teamBlue += coins;
        }

    }

}

        const donorAvatar =
            data.profilePictureUrl ||
            data.user?.profilePictureUrl ||
            data.avatar ||
            "";

        const clientTopDonors =
            getClientRankings(clientId).topDonors;

        if (!clientTopDonors[user]) {
            clientTopDonors[user] = {
                diamonds: 0,
                avatar: donorAvatar
            };
        }

        clientTopDonors[user].diamonds +=
            totalDiamonds;

        if (donorAvatar) {
            clientTopDonors[user].avatar = donorAvatar;
        }

        trackPresence(clientId, user, donorAvatar);

        const clientLiveStats =
            getLiveSessionStats(clientId);

        clientLiveStats.gifts += 1;
        clientLiveStats.diamonds += totalDiamonds;
        emitLiveStats(clientId);

        checkGoalAnnouncement(
            clientId,
            "diamonds",
            clientLiveStats.diamonds,
            getClientSettings(clientId).diamondsGoal
        );

        addToCoinJar(clientId, totalDiamonds);

emitToCreatorPilotClient(clientId, "gift", {
            user: user,
            gift: giftName,
            giftId: data.giftId,
            diamonds: totalDiamonds,
            giftImage: data.giftPictureUrl
        });

    });

   tiktokConnection.on("like", data => {

        console.log("LIKE REÇU :", data.nickname, data.likeCount, data.totalLikeCount);

        markClientActivity(clientId);

        const newLikesCount =
            Number(data.totalLikeCount || data.likeCount || 0);

        likesGoalCountByClient.set(clientId, newLikesCount);

        getLiveSessionStats(clientId).likes =
    Number(data.totalLikeCount || newLikesCount || 0);

        emitLiveStats(clientId);

        checkGoalAnnouncement(
            clientId,
            "likes",
            newLikesCount,
            getClientSettings(clientId).likesGoal
        );

        const user =
    data.nickname || "Utilisateur";

const likes =
    Number(data.likeCount || 0);

const clientTopLikes =
    getClientRankings(clientId).topLikes;

if (!clientTopLikes[user]) {
    clientTopLikes[user] = {
        likes: 0,
        avatar:
            data.profilePictureUrl ||
            data.profilePicture ||
            ""
    };
}

clientTopLikes[user].likes += likes;

trackPresence(clientId, user, data.profilePictureUrl || data.profilePicture || "");

applyChronoTime(
    clientId,
    likes * Number(getClientChrono(clientId).settings.perLike || 0)
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

    markClientActivity(clientId);

    applyChronoTime(clientId, getClientChrono(clientId).settings.perFollow);

    console.log("TOUTES ALERTES SON :", getClientSettings(clientId).soundAlerts);

    const matchingSoundAlert =
        (getClientSettings(clientId).soundAlerts || [])
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

    const newFollowCount =
        (followGoalCountByClient.get(clientId) || 0) + 1;

    followGoalCountByClient.set(clientId, newFollowCount);

    checkGoalAnnouncement(
        clientId,
        "follow",
        newFollowCount,
        getClientSettings(clientId).followGoal
    );

    getLiveSessionStats(clientId).followers += 1;
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

const USERS_FILE = path.join(DATA_DIR, "users.json");

/*
   Migration ponctuelle : si un ancien users.json/resetTokens.json
   existait à côté du code (emplacement non persistant, utilisé
   avant qu'un vrai disque permanent soit configuré), on les copie
   une seule fois vers l'emplacement persistant, pour ne pas perdre
   les comptes déjà créés.
*/
function migrateLegacyDataFile(oldRelativeName, newAbsolutePath) {

    try {

        const oldPath =
            path.join(__dirname, oldRelativeName);

        if (
            fs.existsSync(oldPath) &&
            !fs.existsSync(newAbsolutePath)
        ) {
            fs.copyFileSync(oldPath, newAbsolutePath);
            console.log(
                "Migration : " + oldRelativeName +
                " copié vers l'emplacement persistant."
            );
        }

    } catch (error) {
        console.log(
            "Migration de " + oldRelativeName + " impossible :",
            error.message
        );
    }

}

migrateLegacyDataFile("users.json", USERS_FILE);
migrateLegacyDataFile("resetTokens.json", RESET_TOKENS_FILE);

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

function hashPasswordLegacySha256(password) {
    return crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");
}

async function getUserProStatus(email) {

    try {

        const result =
            await pool.query(
                "SELECT pro FROM pro_users WHERE LOWER(email) = $1 LIMIT 1",
                [email.toLowerCase()]
            );

        return result.rows[0]?.pro === true;

    } catch (error) {
        return false;
    }

}

function formatUserResponse(dbUser, isPro) {
    return {
        id: dbUser.id,
        email: dbUser.email,
        plan: isPro ? "pro" : "free",
        pro: isPro,
        createdAt:
            new Date(dbUser.created_at)
                .toLocaleDateString("fr-FR")
    };
}

/*
   Migration transparente : un compte encore uniquement présent
   dans l'ancien users.json (mot de passe en SHA-256) est basculé
   vers PostgreSQL (mot de passe réhashé en bcrypt) dès sa
   prochaine connexion réussie, sans action requise de sa part.
*/
async function migrateLegacyUserIfNeeded(email, password) {

    const legacyUsers =
        loadUsers();

    const legacyUser =
        legacyUsers.find(u => u.email === email);

    if (!legacyUser) {
        return null;
    }

    if (legacyUser.password !== hashPasswordLegacySha256(password)) {
        return null;
    }

    const newHash =
        await bcrypt.hash(password, 10);

    const inserted =
        await pool.query(
            `
            INSERT INTO users (email, password_hash, created_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (email) DO NOTHING
            RETURNING id, email, created_at
            `,
            [email, newHash]
        );

    console.log("Compte migré depuis l'ancien système vers PostgreSQL :", email);

    return inserted.rows[0] || null;

}

app.post("/register", express.json(), async (req, res) => {

    const email =
        (req.body.email || "").toLowerCase().trim();

    const password =
        req.body.password || "";

    if (!email || !password) {
        return res.status(400).json({ error: "Email et mot de passe obligatoires" });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères" });
    }

    try {

        const existing =
            await pool.query(
                "SELECT id FROM users WHERE email = $1",
                [email]
            );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: "Compte déjà existant" });
        }

        const passwordHash =
            await bcrypt.hash(password, 10);

        const inserted =
            await pool.query(
                `
                INSERT INTO users (email, password_hash, created_at)
                VALUES ($1, $2, NOW())
                RETURNING id, email, created_at
                `,
                [email, passwordHash]
            );

        const dbUser =
            inserted.rows[0];

        await createAuthSession(res, dbUser.id, dbUser.email);
        await attachClientToUserAfterLogin(req, dbUser.id);

        res.json({
            success: true,
            user: formatUserResponse(dbUser, false)
        });

    } catch (error) {

        console.log("ERREUR REGISTER :", error.message);

        res.status(500).json({
            error: "Erreur lors de la création du compte"
        });

    }

});

app.post("/login", express.json(), async (req, res) => {

    const email =
        (req.body.email || "").toLowerCase().trim();

    const password =
        req.body.password || "";

    if (!email || !password) {
        return res.status(400).json({ error: "Identifiants incorrects" });
    }

    try {

        let result =
            await pool.query(
                "SELECT id, email, password_hash, created_at FROM users WHERE email = $1",
                [email]
            );

        let dbUser =
            result.rows[0];

        if (!dbUser) {

            const migrated =
                await migrateLegacyUserIfNeeded(email, password);

            if (migrated) {
                dbUser = { ...migrated, password_hash: null };
            }

        }

        if (!dbUser) {
            return res.status(401).json({ error: "Identifiants incorrects" });
        }

        if (dbUser.password_hash) {

            const passwordMatches =
                await bcrypt.compare(password, dbUser.password_hash);

            if (!passwordMatches) {
                return res.status(401).json({ error: "Identifiants incorrects" });
            }

        }

        await pool.query(
            "UPDATE users SET last_login = NOW() WHERE id = $1",
            [dbUser.id]
        );

        const isPro =
            await getUserProStatus(email);

        await createAuthSession(res, dbUser.id, dbUser.email);
        await attachClientToUserAfterLogin(req, dbUser.id);

        res.json({
            success: true,
            user: formatUserResponse(dbUser, isPro)
        });

    } catch (error) {

        console.log("ERREUR LOGIN :", error.message);

        res.status(500).json({
            error: "Erreur lors de la connexion"
        });

    }

});

function clearAnonymousClientPrivateData(clientId, removeFiles = true) {
    const rawClientId = String(clientId || "").trim();
    if (!rawClientId) return;

    // IMPORTANT : on cible volontairement la clé brute de l'appareil,
    // jamais la clé user:<uuid>, afin de ne pas supprimer les données
    // persistantes du compte qui vient de se déconnecter.
    settingsByClient.delete(rawClientId);
    statsByClient.delete(rawClientId);
    rankingsByClient.delete(rawClientId);
    liveSessionStatsByClient.delete(rawClientId);
    pointsStateByClient.delete(rawClientId);

    if (removeFiles) {
        const filesToRemove = [
            cpSettingsFilePath(rawClientId),
            cpStatsFilePath(rawClientId),
            cpRankingsFilePath(rawClientId)
        ];

        filesToRemove.forEach(filePath => {
            try {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch (error) {
                console.log("Nettoyage données anonymes impossible :", error.message);
            }
        });
    }
}

app.post("/logout", async (req, res) => {
    await destroyAuthSession(req, res);
    await unbindClientFromUser(req.cpSessionId);

    // Après déconnexion, cet appareil redevient un visiteur vierge.
    // Les données du compte restent dans PostgreSQL sous son user_id.
    clearAnonymousClientPrivateData(req.cpSessionId, true);

    req.cpOwnerKey = req.cpSessionId;
    res.json({ success: true });
});

app.get("/me", async (req, res) => {

    const session =
        await getAuthSession(req);

    if (!session) {
        return res.json({
            loggedIn: false
        });
    }

    try {

        const result =
            await pool.query(
                "SELECT id, email, created_at FROM users WHERE id = $1",
                [session.userId]
            );

        const dbUser =
            result.rows[0];

        if (!dbUser) {
            await destroyAuthSession(req, res);
            return res.json({ loggedIn: false });
        }

        const isPro =
            await getUserProStatus(dbUser.email);

        res.json({
            loggedIn: true,
            user: formatUserResponse(dbUser, isPro)
        });

    } catch (error) {

        console.log("ERREUR /me :", error.message);

        res.json({ loggedIn: false });

    }

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

    saveResetTokens(tokens);

    const resetLink =
        (process.env.APP_URL || "https://www.tikbabik.shop") +
        "/reset-password?token=" +
        resetToken;

    console.log("RESET PASSWORD :", email, resetLink);

    try {

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

        console.log("BREVO STATUS :", brevoResponse.status);
        console.log("BREVO RESPONSE :", brevoText);

    } catch (error) {
        console.log("ERREUR ENVOI EMAIL RESET :", error.message);
    }

    res.json({
        success: true,
        message: "Si un compte existe, un lien de réinitialisation a été envoyé."
    });

});

app.get("/reset-password", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "reset-password.html")
    );
});

app.post("/reset-password", express.json(), async (req, res) => {

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

    if (password.length < 6) {
        return res.json({
            success: false,
            error: "Le mot de passe doit contenir au moins 6 caractères"
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

    try {

        const email =
            resetData.email.toLowerCase();

        const existing =
            await pool.query(
                "SELECT id FROM users WHERE email = $1",
                [email]
            );

        const newHash =
            await bcrypt.hash(password, 10);

        if (existing.rows.length > 0) {

            await pool.query(
                "UPDATE users SET password_hash = $1 WHERE email = $2",
                [newHash, email]
            );

        } else {

            // Compte encore uniquement dans l'ancien système : on le
            // crée directement dans PostgreSQL avec le nouveau mot
            // de passe (migration au passage).
            await pool.query(
                `
                INSERT INTO users (email, password_hash, created_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (email) DO UPDATE SET password_hash = $2
                `,
                [email, newHash]
            );

        }

        const remainingTokens =
            tokens.filter(item =>
                item.token !== token
            );

        saveResetTokens(remainingTokens);

        res.json({
            success: true,
            message: "Mot de passe modifié avec succès"
        });

    } catch (error) {

        console.log("ERREUR RESET PASSWORD :", error.message);

        res.status(500).json({
            success: false,
            error: "Erreur lors de la réinitialisation"
        });

    }

});

/*
   ============================================================
   IDENTIFICATION DU CLIENT POUR LES ROUTES PUBLIQUES (OVERLAYS)

   Un overlay OBS (Browser Source) est un navigateur séparé du
   tableau de bord : il ne partage pas forcément le cookie de
   session. On accepte donc aussi un paramètre ?client=... dans
   l'URL, utilisé par les boutons "Copier URL" du tableau de
   bord pour que chaque overlay reste lié au bon client même
   ouvert ailleurs.

   En local (PC du créateur, pas d'hébergement distant), il n'y a
   qu'un seul utilisateur réel : si aucun identifiant n'est fourni
   du tout (ni cookie, ni ?client=), on retombe sur le dernier
   client qui s'est connecté à TikTok. Ça permet de coller des
   liens courts (sans ?client=...) dans des logiciels comme TikTok
   LIVE Studio, dont le champ URL refuse parfois les adresses avec
   un point d'interrogation. Cette astuce ne s'applique jamais sur
   un hébergement distant (Railway...), où plusieurs vrais clients
   différents pourraient se marcher dessus.
   ============================================================
*/

let lastActiveClientId = null;

function resolveClientId(req) {

    if (req.query.client) {
        return req.query.client;
    }

    if (req.cpSessionId) {
        return req.cpSessionId;
    }

    if (!process.env.PORT && lastActiveClientId) {
        return lastActiveClientId;
    }

    return req.cpSessionId;
}

/* ============================================================
   PERSISTANCE POSTGRESQL PAR UTILISATEUR
   ============================================================ */

async function bindClientToUser(clientId, userId) {
    if (!clientId || !userId) return;

    const ownerKey = userOwnerKey(userId);
    const current = clientOwnerKeyByClientId.get(clientId);

    clientOwnerKeyByClientId.set(clientId, ownerKey);
    userIdByOwnerKey.set(ownerKey, String(userId));

    if (current === ownerKey) return;

    await pool.query(
        `INSERT INTO creatorpilot_client_bindings (client_id, user_id, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (client_id) DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = NOW()`,
        [clientId, userId]
    );
}

async function unbindClientFromUser(clientId) {
    if (!clientId) return;
    clientOwnerKeyByClientId.delete(clientId);
    try {
        await pool.query(
            "DELETE FROM creatorpilot_client_bindings WHERE client_id = $1",
            [clientId]
        );
    } catch (error) {
        console.log("Erreur suppression binding client :", error.message);
    }
}

async function persistUserStateSection(userId, section, value) {
    const allowed = new Set(["settings", "stats", "rankings", "live_stats", "points_state"]);
    if (!allowed.has(section) || !userId) return;

    // Les écritures d'un même compte sont mises en file d'attente.
    // Sans cela, deux sauvegardes très rapprochées peuvent finir dans
    // PostgreSQL dans le mauvais ordre et restaurer une ancienne version.
    const normalizedUserId = String(userId);
    const snapshot = JSON.stringify(value || {});
    const previous = userStateWriteQueues.get(normalizedUserId) || Promise.resolve();

    const writePromise = previous
        .catch(() => {})
        .then(() => pool.query(
            `INSERT INTO creatorpilot_user_state (user_id, ${section}, updated_at)
             VALUES ($1, $2::jsonb, NOW())
             ON CONFLICT (user_id) DO UPDATE SET ${section} = EXCLUDED.${section}, updated_at = NOW()`,
            [normalizedUserId, snapshot]
        ))
        .catch(error => {
            console.log("Erreur sauvegarde état utilisateur", section, ":", error.message);
        });

    userStateWriteQueues.set(normalizedUserId, writePromise);

    try {
        await writePromise;
    } finally {
        if (userStateWriteQueues.get(normalizedUserId) === writePromise) {
            userStateWriteQueues.delete(normalizedUserId);
        }
    }
}

async function ensurePersistentUserStateLoaded(userId) {
    if (!userId) return;

    const ownerKey = userOwnerKey(userId);
    userIdByOwnerKey.set(ownerKey, String(userId));

    if (loadedPersistentOwnerKeys.has(ownerKey)) return;

    const result = await pool.query(
        `SELECT settings, stats, rankings, live_stats, points_state
         FROM creatorpilot_user_state
         WHERE user_id = $1`,
        [userId]
    );

    const row = result.rows[0];
    if (row) {
        const backup = readUserSettingsBackup(userId);

        // Le fichier du compte est la sauvegarde de référence des
        // personnalisations. S'il existe et est lisible, il gagne toujours
        // sur une ancienne valeur PostgreSQL. PostgreSQL reste synchronisé
        // comme seconde copie et pour le reste de l'état utilisateur.
        const chosenSettings =
            backup && backup.settings
                ? backup.settings
                : (row.settings || {});

        const loadedSettings = mergeSettingsDeep(
            createFreshClientSettings(),
            chosenSettings
        );

        settingsByClient.set(ownerKey, loadedSettings);
        writeUserSettingsBackup(userId, loadedSettings);

        if (backup) {
            persistUserStateSection(userId, "settings", loadedSettings);
        }
        statsByClient.set(ownerKey, row.stats || { topGifters: {}, giftHistory: [] });
        rankingsByClient.set(ownerKey, row.rankings || { topLikes: {}, topDonors: {}, topPresence: {} });
        liveSessionStatsByClient.set(ownerKey, {
            connected: false,
            username: "",
            startTime: null,
            likes: 0,
            followers: 0,
            gifts: 0,
            diamonds: 0,
            ...(row.live_stats || {}),
            connected: false
        });
        pointsStateByClient.set(ownerKey, row.points_state || { users: {}, transactions: [] });
    }

    loadedPersistentOwnerKeys.add(ownerKey);
}

async function attachClientToUserAfterLogin(req, userId) {
    const clientId = req.cpSessionId;
    const ownerKey = userOwnerKey(userId);
    const previousOwnerKey = clientOwnerKeyByClientId.get(clientId) || null;
    const alreadyBound = previousOwnerKey === ownerKey;

    if (alreadyBound && loadedPersistentOwnerKeys.has(ownerKey)) {
        return;
    }

    const existing = await pool.query(
        "SELECT user_id FROM creatorpilot_user_state WHERE user_id = $1",
        [userId]
    );

    let migrated = false;

    if (existing.rows.length === 0) {
        // On ne migre les données locales que si ce clientId n'était
        // pas déjà rattaché à un AUTRE compte. Cela évite qu'un compte
        // B récupère les personnalisations privées du compte A sur le
        // même ordinateur.
        const canMigrateLocalData = !previousOwnerKey || previousOwnerKey === ownerKey;

        let anonymousSettings = canMigrateLocalData
            ? getClientSettings(clientId)
            : createFreshClientSettings();

        let anonymousStats = canMigrateLocalData
            ? getClientStats(clientId)
            : emptyPrivateStats();

        // Les anciens fichiers globaux ne sont repris QUE lors de la
        // première migration d'un compte, jamais par un visiteur anonyme.
        if (canMigrateLocalData && !fs.existsSync(cpSettingsFilePath(clientId))) {
            const legacySettings = claimLegacySettingsOnce();
            if (legacySettings) anonymousSettings = legacySettings;
        }

        if (canMigrateLocalData && !fs.existsSync(cpStatsFilePath(clientId))) {
            const legacyStatsForAccount = claimLegacyStatsOnce();
            if (legacyStatsForAccount) anonymousStats = legacyStatsForAccount;
        }

        const anonymousRankings = canMigrateLocalData
            ? getClientRankings(clientId)
            : { topLikes: {}, topDonors: {}, topPresence: {} };

        const anonymousLiveStats = canMigrateLocalData
            ? getLiveSessionStats(clientId)
            : { connected: false, username: "", startTime: null, likes: 0, followers: 0, gifts: 0, diamonds: 0 };

        await pool.query(
            `INSERT INTO creatorpilot_user_state
                (user_id, settings, stats, rankings, live_stats, points_state, updated_at)
             VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, NOW())
             ON CONFLICT (user_id) DO NOTHING`,
            [
                userId,
                JSON.stringify(anonymousSettings),
                JSON.stringify(anonymousStats),
                JSON.stringify(anonymousRankings),
                JSON.stringify(anonymousLiveStats),
                JSON.stringify({ users: {}, transactions: [] })
            ]
        );
        writeUserSettingsBackup(userId, anonymousSettings);
        migrated = true;

        // Les données viennent d'être transférées dans PostgreSQL : on
        // retire leur ancienne copie anonyme pour éviter toute fuite après logout.
        clearAnonymousClientPrivateData(clientId, true);
    }

    await bindClientToUser(clientId, userId);
    if (migrated) loadedPersistentOwnerKeys.delete(ownerKey);
    await ensurePersistentUserStateLoaded(userId);
}

const pointsStateByClient = new Map();

function getClientPointsState(clientId) {
    const ownerKey = canonicalClientKey(clientId);
    if (!pointsStateByClient.has(ownerKey)) {
        pointsStateByClient.set(ownerKey, { users: {}, transactions: [] });
    }
    return pointsStateByClient.get(ownerKey);
}

function saveClientPointsState(clientId, data) {
    const ownerKey = canonicalClientKey(clientId);
    const safeData = {
        users: data?.users && typeof data.users === "object" ? data.users : {},
        transactions: Array.isArray(data?.transactions) ? data.transactions.slice(-1000) : []
    };
    pointsStateByClient.set(ownerKey, safeData);
    const userId = userIdFromOwnerKey(ownerKey);
    if (userId) persistUserStateSection(userId, "points_state", safeData);
    return safeData;
}

app.get("/points/state", (req, res) => {
    res.json(getClientPointsState(req.cpOwnerKey || resolveClientId(req)));
});

app.post("/points/state", (req, res) => {
    const data = saveClientPointsState(req.cpOwnerKey || resolveClientId(req), req.body);
    res.json({ success: true, ...data });
});

const rankingsByClient = new Map();

function cpRankingsFilePath(clientId) {
    return path.join(CP_SETTINGS_DIR, clientId + "-rankings.json");
}

function getClientRankings(clientId) {

    const ownerKey = canonicalClientKey(clientId);

    if (rankingsByClient.has(ownerKey)) {
        return rankingsByClient.get(ownerKey);
    }

    let data = {
        topLikes: {},
        topDonors: {},
        topPresence: {}
    };

    const filePath =
        cpRankingsFilePath(ownerKey);

    if (!userIdFromOwnerKey(ownerKey) && fs.existsSync(filePath)) {

        try {
            data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        } catch (error) {
            console.log("Classements illisibles pour", ownerKey, "- valeurs par défaut utilisées");
        }

    }

    rankingsByClient.set(ownerKey, data);

    return data;

}

function saveClientRankings(clientId) {

    const ownerKey = canonicalClientKey(clientId);
    const data = rankingsByClient.get(ownerKey);

    if (!data) return;

    const userId = userIdFromOwnerKey(ownerKey);
    if (userId) {
        persistUserStateSection(userId, "rankings", data);
        return;
    }

    fs.writeFileSync(
        cpRankingsFilePath(ownerKey),
        JSON.stringify(data, null, 2)
    );
}

setInterval(() => {
    rankingsByClient.forEach((data, clientId) => {
        saveClientRankings(clientId);
    });
}, 15000);

function trackPresence(clientId, user, avatar) {

    if (!user || !clientId) {
        return;
    }

    const topPresence =
        getClientRankings(clientId).topPresence;

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

    rankingsByClient.forEach(data => {
        Object.keys(data.topPresence).forEach(user => {
            if (now - data.topPresence[user].lastSeen <= 15000) {
                data.topPresence[user].seconds += 5;
            }
        });
    });

}, 5000);

const likesGoalCountByClient = new Map();
const followGoalCountByClient = new Map();
const goalAnnouncedByClient = new Map();

function getLikesGoalCount(clientId) {
    return likesGoalCountByClient.get(clientId) || 0;
}

function getFollowGoalCount(clientId) {
    return followGoalCountByClient.get(clientId) || 0;
}

function getGoalAnnouncedState(clientId) {
    if (!goalAnnouncedByClient.has(clientId)) {
        goalAnnouncedByClient.set(clientId, { likes: false, follow: false, diamonds: false });
    }
    return goalAnnouncedByClient.get(clientId);
}

function checkGoalAnnouncement(clientId, type, current, goalSettings) {

    if (!goalSettings || !goalSettings.announceEnabled) {
        return;
    }

    const target =
        Number(goalSettings.target || 0);

    if (target <= 0) {
        return;
    }

    const announced =
        getGoalAnnouncedState(clientId);

    if (current >= target) {

        if (!announced[type]) {
            announced[type] = true;

            const message =
                goalSettings.announceMessage ||
                "Objectif atteint ! Merci à tous !";

            emitToCreatorPilotClient(clientId, "goalReached", {
                type,
                message
            });
        }

    } else {
        announced[type] = false;
    }

}

const coinMatchByClient = new Map();

const coinMatchDefaultTemplate = {
    active: false,
    ended: false,
    winnersShown: false,
    players: {},
    duration: 300,
    endTime: null
};

function getClientCoinMatch(clientId) {

    const ownerKey = canonicalClientKey(clientId);

    if (!coinMatchByClient.has(ownerKey)) {
        const initial = JSON.parse(JSON.stringify(coinMatchDefaultTemplate));
        const saved = getClientSettings(ownerKey).coinMatch;

        if (saved && saved.duration != null) {
            initial.duration = Number(saved.duration || 300);
        }

        coinMatchByClient.set(ownerKey, initial);
    }

    return coinMatchByClient.get(ownerKey);
}

const giftBattleByClient = new Map();

const giftBattleDefaultTemplate = {
    active: false,
    teamRed: 0,
    teamBlue: 0,
    winnersShown: false,
    winner: null,

    duration: 300,
    endTime: null
};

function getClientGiftBattle(clientId) {

    const ownerKey = canonicalClientKey(clientId);

    if (!giftBattleByClient.has(ownerKey)) {
        const initial = JSON.parse(JSON.stringify(giftBattleDefaultTemplate));
        const saved = getClientSettings(ownerKey).giftBattle;

        if (saved && saved.duration != null) {
            initial.duration = Number(saved.duration || 300);
        }

        giftBattleByClient.set(ownerKey, initial);
    }

    return giftBattleByClient.get(ownerKey);
}

const giftBattleGiftTeamsByClient = new Map();

function getClientGiftBattleTeams(clientId) {

    const ownerKey = canonicalClientKey(clientId);

    if (!giftBattleGiftTeamsByClient.has(ownerKey)) {
        const saved = getClientSettings(ownerKey).giftBattle || {};
        const toArray = value =>
            Array.isArray(value)
                ? value
                : String(value || "").split(",").map(v => v.trim()).filter(Boolean);

        giftBattleGiftTeamsByClient.set(ownerKey, {
            red: toArray(saved.redGifts),
            blue: toArray(saved.blueGifts)
        });
    }

    return giftBattleGiftTeamsByClient.get(ownerKey);
}

app.get("/coin-match/status", (req, res) => {

  const clientId =
      resolveClientId(req);

  const coinMatch =
      getClientCoinMatch(clientId);

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

    const clientId =
        resolveClientId(req);

    const coinMatch =
        getClientCoinMatch(clientId);

    coinMatch.active = true;
    coinMatch.ended = false;
    coinMatch.winnersShown = false;
    coinMatch.players = {};

    coinMatch.endTime =
    Date.now() + (coinMatch.duration * 1000);

    res.json({ success: true, coinMatch });
});

app.post("/coin-match/end", (req, res) => {

    const clientId =
        resolveClientId(req);

    const coinMatch =
        getClientCoinMatch(clientId);

    coinMatch.active = false;
    coinMatch.ended = true;

    res.json({ success: true, coinMatch });
});

app.post("/coin-match/reset", (req, res) => {

    const clientId =
        resolveClientId(req);

    const duration =
        getClientCoinMatch(clientId).duration || 300;

    coinMatchByClient.set(canonicalClientKey(clientId), {
        active: false,
        ended: false,
        winnersShown: false,
        players: {},
        duration,
        endTime: null
    });

    res.json({ success: true, coinMatch: getClientCoinMatch(clientId) });
});

app.post("/coin-match/show-winners", (req, res) => {

    const clientId =
        resolveClientId(req);

    const coinMatch =
        getClientCoinMatch(clientId);

    coinMatch.winnersShown = true;

    const winners =
    Object.entries(coinMatch.players)
    .sort((a, b) => b[1].coins - a[1].coins)
    .slice(0, 3);

coinMatch.winners = winners;

    res.json({ success: true, coinMatch });
});

app.get("/coin-match/settings", (req, res) => {

    const clientId =
        resolveClientId(req);

    res.json(
        getClientSettings(clientId).coinMatch || {
            bg: "#1f1f1f",
            border: "#ff0050",
            text: "#ffffff",
            timer: "#35cfff",
            shape: "20",
            scale: "1",
            duration: 300,
            victorySound: "victory.mp3"
        }
    );
});

app.post("/coin-match/settings", (req, res) => {

    const clientId =
        resolveClientId(req);

    const clientSettings =
        getClientSettings(clientId);

    clientSettings.coinMatch = {
        bg: req.body.bg || "#1f1f1f",
        border: req.body.border || "#ff0050",
        text: req.body.text || "#ffffff",
        timer: req.body.timer || "#35cfff",
        shape: req.body.shape || "20",
        scale: req.body.scale || "1",
        duration: Number(req.body.duration || 300),
        victorySound: req.body.victorySound || "victory.mp3",
        ringColor1: req.body.ringColor1 || "#22d3ee",
        ringColor2: req.body.ringColor2 || "#a855f7",
        ringColor3: req.body.ringColor3 || "#ec4899",
        ringSpeed: Number(req.body.ringSpeed || 6)
    };

    getClientCoinMatch(clientId).duration = clientSettings.coinMatch.duration;
    saveClientSettings(clientId, clientSettings);

    res.json({
        success: true,
        settings: clientSettings.coinMatch
    });
});

app.get("/overlay/coin-match", (req, res) => {

    const clientId =
        resolveClientId(req);

   const coinSettings =
    getClientSettings(clientId).coinMatch || {};

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
    const response = await fetch("/coin-match/status?client=${clientId}");
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

    const clientId =
        resolveClientId(req);

    const coinMatch =
        getClientCoinMatch(clientId);

    coinMatch.duration =
        Number(req.body.duration || 300);

    const clientSettings = getClientSettings(clientId);
    clientSettings.coinMatch = {
        ...(clientSettings.coinMatch || {}),
        duration: coinMatch.duration
    };
    saveClientSettings(clientId, clientSettings);

    res.json({
        success: true,
        duration: coinMatch.duration
    });

});

app.post("/coin-match/test-gift", (req, res) => {

    const clientId =
        resolveClientId(req);

    const coinMatch =
        getClientCoinMatch(clientId);

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

    const clientId =
        resolveClientId(req);

    const giftBattle =
        getClientGiftBattle(clientId);

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

    const clientId =
        resolveClientId(req);

    const giftBattle =
        getClientGiftBattle(clientId);

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

    const clientId =
        resolveClientId(req);

    const giftBattle =
        getClientGiftBattle(clientId);

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

    const clientId =
        resolveClientId(req);

    const duration =
        getClientGiftBattle(clientId).duration || 300;

    giftBattleByClient.set(canonicalClientKey(clientId), {
        active: false,
        teamRed: 0,
        teamBlue: 0,
        winnersShown: false,
        winner: null,
        duration,
        endTime: null
    });

    res.json({ success: true, giftBattle: getClientGiftBattle(clientId) });
});

app.get("/gift-battle/settings", (req, res) => {

    const clientId =
        resolveClientId(req);

    res.json(
        getClientSettings(clientId).giftBattle || {
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

    const clientId =
        resolveClientId(req);

    const clientSettings =
        getClientSettings(clientId);

    clientSettings.giftBattle = {
        redName: req.body.redName || "Team 1",
        blueName: req.body.blueName || "Team 2",
        redColor: req.body.redColor || "#ff2a2a",
        blueColor: req.body.blueColor || "#1b8cff",
        duration: Number(req.body.duration || 300),
        redGifts: req.body.redGifts || "",
        blueGifts: req.body.blueGifts || ""
    };

    getClientGiftBattle(clientId).duration = clientSettings.giftBattle.duration;

    saveClientSettings(clientId, clientSettings);

    res.json({
        success: true,
        settings: clientSettings.giftBattle
    });
});

app.get("/overlay/gift-battle", (req, res) => {

    const clientId =
        resolveClientId(req);

const battleSettings =
    getClientSettings(clientId).giftBattle || {};

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
        await fetch("/gift-battle/status?client=${clientId}");

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

    const clientId =
        resolveClientId(req);

    const giftBattle =
        getClientGiftBattle(clientId);

    giftBattle.teamRed += 100;

    res.json({
        success: true,
        giftBattle
    });

});

app.post("/gift-battle/test-blue", (req, res) => {

    const clientId =
        resolveClientId(req);

    const giftBattle =
        getClientGiftBattle(clientId);

    giftBattle.teamBlue += 100;

    res.json({
        success: true,
        giftBattle
    });

});

app.post("/gift-battle/duration", express.json(), (req, res) => {

    const clientId =
        resolveClientId(req);

    const giftBattle =
        getClientGiftBattle(clientId);

    giftBattle.duration =
        Number(req.body.duration || 300);

    const clientSettings = getClientSettings(clientId);
    clientSettings.giftBattle = {
        ...(clientSettings.giftBattle || {}),
        duration: giftBattle.duration
    };
    saveClientSettings(clientId, clientSettings);

    res.json({
        success: true,
        duration: giftBattle.duration
    });

});

app.get("/gift-battle/gift-teams", (req, res) => {
    res.json(getClientGiftBattleTeams(resolveClientId(req)));
});

app.post("/gift-battle/gift-teams", express.json(), (req, res) => {

    const clientId =
        resolveClientId(req);

    const teams = {
        red: req.body.red || [],
        blue: req.body.blue || []
    };

    giftBattleGiftTeamsByClient.set(canonicalClientKey(clientId), teams);

    const clientSettings = getClientSettings(clientId);
    clientSettings.giftBattle = {
        ...(clientSettings.giftBattle || {}),
        redGifts: teams.red.join(", "),
        blueGifts: teams.blue.join(", ")
    };
    saveClientSettings(clientId, clientSettings);

    res.json({
        success: true,
        giftBattleGiftTeams: teams
    });

});

app.get("/top-likes/status", (req, res) => {

    const clientId =
        resolveClientId(req);

    const ranking =
        Object.entries(getClientRankings(clientId).topLikes)
            .sort((a, b) => b[1].likes - a[1].likes)
            .slice(0, 10);

    res.json({
        ranking
    });

});

app.get("/top-likes/settings", (req, res) => {

    const clientId =
        resolveClientId(req);

    res.json(
        getClientSettings(clientId).topLikes || {
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

    const clientId =
        resolveClientId(req);

    const clientSettings =
        getClientSettings(clientId);

    clientSettings.topLikes = {
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

    saveClientSettings(clientId, clientSettings);

    res.json({
        success: true,
        settings: clientSettings.topLikes
    });
});

app.get("/overlay/top-likes", (req, res) => {

    const clientId =
        resolveClientId(req);

    const topLikesSettings =
        getClientSettings(clientId).topLikes || {};

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
    const response = await fetch("/top-likes/status?client=${clientId}");
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

    const clientId =
        resolveClientId(req);

    const clientTopLikes =
        getClientRankings(clientId).topLikes;

    const user = "TestUser";

    if (!clientTopLikes[user]) {
        clientTopLikes[user] = {
            likes: 0,
            avatar: "https://placehold.co/80x80"
        };
    }

    clientTopLikes[user].likes += 100;

    res.json({
        success: true,
        topLikes: clientTopLikes
    });

});

app.post("/top-likes/reset", (req, res) => {

    const clientId =
        resolveClientId(req);

    getClientRankings(clientId).topLikes = {};
    saveClientRankings(clientId);

    res.json({ success: true });

});

/* ==================== TOP DONATEURS ==================== */

app.get("/top-donors/status", (req, res) => {

    const clientId =
        resolveClientId(req);

    const ranking =
        Object.entries(getClientRankings(clientId).topDonors)
            .sort((a, b) => b[1].diamonds - a[1].diamonds)
            .slice(0, 10);

    res.json({ ranking });

});

app.get("/top-donors/settings", (req, res) => {

    const clientId =
        resolveClientId(req);

    res.json(
        getClientSettings(clientId).topDonors || {
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

    const clientId =
        resolveClientId(req);

    const clientSettings =
        getClientSettings(clientId);

    clientSettings.topDonors = {
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

    saveClientSettings(clientId, clientSettings);

    res.json({
        success: true,
        settings: clientSettings.topDonors
    });
});

app.get("/overlay/top-donors", (req, res) => {

    const clientId =
        resolveClientId(req);

    const topDonorsSettings =
        getClientSettings(clientId).topDonors || {};

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
    const response = await fetch("/top-donors/status?client=${clientId}");
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

    const clientId =
        resolveClientId(req);

    const clientTopDonors =
        getClientRankings(clientId).topDonors;

    const user = "TestUser";

    if (!clientTopDonors[user]) {
        clientTopDonors[user] = {
            diamonds: 0,
            avatar: "https://placehold.co/80x80"
        };
    }

    clientTopDonors[user].diamonds += 100;

    res.json({
        success: true,
        topDonors: clientTopDonors
    });

});

app.post("/top-donors/reset", (req, res) => {

    const clientId =
        resolveClientId(req);

    getClientRankings(clientId).topDonors = {};
    saveClientRankings(clientId);

    res.json({ success: true });

});

/* ==================== TOP PRÉSENCE LIVE ==================== */

function formatPresenceTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + "m " + String(seconds).padStart(2, "0") + "s";
}

app.get("/top-presence/status", (req, res) => {

    const clientId =
        resolveClientId(req);

    const ranking =
        Object.entries(getClientRankings(clientId).topPresence)
            .sort((a, b) => b[1].seconds - a[1].seconds)
            .slice(0, 10)
            .map(([user, data]) => [
                user,
                { ...data, formatted: formatPresenceTime(data.seconds) }
            ]);

    res.json({ ranking });

});

app.get("/top-presence/settings", (req, res) => {

    const clientId =
        resolveClientId(req);

    res.json(
        getClientSettings(clientId).topPresence || {
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

    const clientId =
        resolveClientId(req);

    const clientSettings =
        getClientSettings(clientId);

    clientSettings.topPresence = {
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

    saveClientSettings(clientId, clientSettings);

    res.json({
        success: true,
        settings: clientSettings.topPresence
    });
});

app.get("/overlay/top-presence", (req, res) => {

    const clientId =
        resolveClientId(req);

    const topPresenceSettings =
        getClientSettings(clientId).topPresence || {};

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
    const response = await fetch("/top-presence/status?client=${clientId}");
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

    const clientId =
        resolveClientId(req);

    const clientTopPresence =
        getClientRankings(clientId).topPresence;

    const user = "TestUser";

    if (!clientTopPresence[user]) {
        clientTopPresence[user] = {
            seconds: 0,
            avatar: "https://placehold.co/80x80",
            lastSeen: Date.now()
        };
    }

    clientTopPresence[user].seconds += 60;

    res.json({
        success: true,
        topPresence: clientTopPresence
    });

});

app.post("/top-presence/reset", (req, res) => {

    const clientId =
        resolveClientId(req);

    getClientRankings(clientId).topPresence = {};
    saveClientRankings(clientId);

    res.json({ success: true });

});

const chronoByClient = new Map();

const chronoDefaultTemplate = {
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

function getClientChrono(clientId) {

    const ownerKey = canonicalClientKey(clientId);

    if (!chronoByClient.has(ownerKey)) {
        const initial = JSON.parse(JSON.stringify(chronoDefaultTemplate));
        const saved = getClientSettings(ownerKey).chronoSettings;
        if (saved && typeof saved === "object") {
            initial.settings = { ...initial.settings, ...saved };
            initial.duration = Number(initial.settings.defaultMinutes || 5) * 60;
            initial.remaining = initial.duration;
        }
        chronoByClient.set(ownerKey, initial);
    }

    return chronoByClient.get(ownerKey);
}

const actionWheelByClient = new Map();

const actionWheelDefaultTemplate = {
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

function getClientActionWheel(clientId) {

    const ownerKey = canonicalClientKey(clientId);

    if (!actionWheelByClient.has(ownerKey)) {

        let initial = JSON.parse(JSON.stringify(actionWheelDefaultTemplate));
        const clientSettings = getClientSettings(ownerKey);

        if (clientSettings.actionWheel) {
            initial = clientSettings.actionWheel;
        }

        actionWheelByClient.set(ownerKey, initial);
    }

    return actionWheelByClient.get(ownerKey);
}

function getChronoRemaining(clientId) {

    const chrono =
        getClientChrono(clientId);

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

function setChronoRemaining(clientId, seconds) {

    const chrono =
        getClientChrono(clientId);

    chrono.remaining = Math.max(0, Number(seconds || 0));

    if (chrono.active) {
        chrono.endTime = Date.now() + chrono.remaining * 1000;
    }
}

function applyChronoTime(clientId, seconds) {

    seconds = Number(seconds || 0);

    if (seconds <= 0 || !clientId) {
        return;
    }

    const chrono =
        getClientChrono(clientId);

    chrono.remaining = getChronoRemaining(clientId);

    if (chrono.settings.giftMode === "remove") {
        setChronoRemaining(clientId, chrono.remaining - seconds);
    } else {
        setChronoRemaining(clientId, chrono.remaining + seconds);
    }

}

app.get("/chrono/status", (req, res) => {

    const clientId =
        resolveClientId(req);

    const chrono =
        getClientChrono(clientId);

    chrono.remaining = getChronoRemaining(clientId);

    res.json({
        active: chrono.active,
        remaining: chrono.remaining,
        settings: chrono.settings
    });
});

app.get("/action-wheel/status", (req, res) => {

    res.json(getClientActionWheel(resolveClientId(req)));

});

app.get("/overlay/action-wheel", (req, res) => {

    const clientId =
        resolveClientId(req);

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
    const response = await fetch("/action-wheel/status?client=${clientId}");
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

        const clientId =
            resolveClientId(req);

        const actionWheel =
            getClientActionWheel(clientId);

        actionWheel.settings = req.body;

        const clientSettings =
            getClientSettings(clientId);

        clientSettings.actionWheel =
            actionWheel;

        saveClientSettings(clientId, clientSettings);

        res.json({
            success: true
        });

    }
);

app.post("/action-wheel/spin", (req, res) => {

    const clientId =
        resolveClientId(req);

    const actionWheel =
        getClientActionWheel(clientId);

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

            executeActionByName(winnerText, clientId);

    }, 5000);

    res.json({
    success: true,
    winner: winnerText,
    winnerIndex: winnerIndex
});

});


app.post("/chrono/start", (req, res) => {

    const clientId =
        resolveClientId(req);

    const chrono =
        getClientChrono(clientId);

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

    const clientId =
        resolveClientId(req);

    const chrono =
        getClientChrono(clientId);

    chrono.remaining = getChronoRemaining(clientId);
    chrono.active = false;
    chrono.endTime = null;

    res.json({
        success: true,
        chrono
    });
});

app.post("/chrono/resume", (req, res) => {

    const clientId =
        resolveClientId(req);

    const chrono =
        getClientChrono(clientId);

    chrono.remaining = getChronoRemaining(clientId);

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

    const clientId =
        resolveClientId(req);

    const chrono =
        getClientChrono(clientId);

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

    const clientId =
        resolveClientId(req);

    const chrono =
        getClientChrono(clientId);

    chrono.remaining = getChronoRemaining(clientId);

    const seconds = Number(req.body.seconds || 60);

    setChronoRemaining(clientId, chrono.remaining + seconds);

    res.json({
        success: true,
        chrono
    });
});

app.post("/chrono/decrease", express.json(), (req, res) => {

    const clientId =
        resolveClientId(req);

    const chrono =
        getClientChrono(clientId);

    chrono.remaining = getChronoRemaining(clientId);

    const seconds = Number(req.body.seconds || 60);

    setChronoRemaining(clientId, chrono.remaining - seconds);

    res.json({
        success: true,
        chrono
    });
});

app.post("/chrono/settings", express.json(), (req, res) => {

    const clientId =
        resolveClientId(req);

    const chrono =
        getClientChrono(clientId);

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

    chrono.duration =
        chrono.settings.defaultMinutes * 60;

    if (!chrono.active) {
        chrono.remaining = chrono.duration;
    }

    const clientSettings = getClientSettings(clientId);
    clientSettings.chronoSettings = chrono.settings;
    saveClientSettings(clientId, clientSettings);

    res.json({
        success: true,
        chrono
    });

});

app.post("/chrono/test-gift", (req, res) => {

    const clientId =
        resolveClientId(req);

    const chrono =
        getClientChrono(clientId);

    const giftCoins = 100;

    if (
        chrono.settings.giftAutoEnabled &&
        chrono.settings.giftMode !== "off"
    ) {
        const secondsToChange =
            giftCoins * Number(chrono.settings.secondsPerCoin || 1);

        chrono.remaining = getChronoRemaining(clientId);

        if (chrono.settings.giftMode === "remove") {
            setChronoRemaining(clientId, chrono.remaining - secondsToChange);
        } else {
            setChronoRemaining(clientId, chrono.remaining + secondsToChange);
        }
    }

    res.json({
        success: true,
        chrono
    });

});

app.get("/overlay/chrono", (req, res) => {

    const clientId =
        resolveClientId(req);

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
        await fetch("/chrono/status?client=${clientId}");

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

const socialPanelByClient = new Map();

const socialPanelDefaultTemplate = {

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

function getClientSocialPanel(clientId) {

    const ownerKey = canonicalClientKey(clientId);

    if (!socialPanelByClient.has(ownerKey)) {
        const initial = JSON.parse(JSON.stringify(socialPanelDefaultTemplate));
        const saved = getClientSettings(ownerKey).socialPanel;
        if (saved && typeof saved === "object") {
            initial.settings = { ...initial.settings, ...saved };
        }
        socialPanelByClient.set(ownerKey, initial);
    }

    return socialPanelByClient.get(ownerKey);
}

app.get("/social-panel/status", (req, res) => {
    res.json(getClientSocialPanel(resolveClientId(req)));
});

app.post("/social-panel/settings", express.json(), (req, res) => {

    const clientId =
        resolveClientId(req);

    getClientSocialPanel(clientId).settings = req.body;

    const clientSettings = getClientSettings(clientId);
    clientSettings.socialPanel = req.body;
    saveClientSettings(clientId, clientSettings);

    res.json({
        success: true,
        socialPanel: getClientSocialPanel(clientId)
    });
});

app.get("/overlay/social-panel", (req, res) => {

    const clientId =
        resolveClientId(req);

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
    const response = await fetch("/social-panel/status?client=${clientId}");
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

    const webcam =
        getClientSettings(resolveClientId(req)).webcamSimple || {};

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

    const custom =
        getClientSettings(resolveClientId(req)).webcamCustom || {};

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

    const clientId =
        resolveClientId(req);

    const likes =
        getClientSettings(clientId).likesGoal || {};

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
        likes: getLikesGoalCount(resolveClientId(req))
    });
});


app.get("/overlay/follow-goal", (req, res) => {

    const clientId =
        resolveClientId(req);

    const follow =
        getClientSettings(clientId).followGoal || {};

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
        follows: getFollowGoalCount(resolveClientId(req))
    });

});

app.get("/diamonds-goal/status", (req, res) => {

    res.json({
        diamonds: getLiveSessionStats(resolveClientId(req)).diamonds || 0
    });

});

app.post("/diamonds-goal/reset", (req, res) => {

    const clientId =
        resolveClientId(req);

    getLiveSessionStats(clientId).diamonds = 0;

    getGoalAnnouncedState(clientId).diamonds = false;

    emitLiveStats(clientId);

    res.json({ success: true });

});

app.get("/overlay/diamonds-goal", (req, res) => {

    const clientId =
        resolveClientId(req);

    const goal =
        getClientSettings(clientId).diamondsGoal || {};

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
        await fetch("/diamonds-goal/status?client=${clientId}");

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

    const clientId =
        resolveClientId(req);

    const banner =
        getClientSettings(clientId).banner || {};

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



const CP_PORT =
    process.env.PORT || 3000;

server.listen(CP_PORT, () => {
    console.log("CreatorPilot lancé sur le port " + CP_PORT);
});