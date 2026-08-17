const socket = io();

/*
   Notification non-bloquante (remplace les popups alert() qui
   peuvent geler l'app dans Electron si elles ne s'affichent pas
   correctement à l'écran).
*/
function showToast(message) {

    let container =
        document.getElementById("cpToastContainer");

    if (!container) {

        container =
            document.createElement("div");

        container.id = "cpToastContainer";

        container.style.cssText =
            "position:fixed;top:20px;right:20px;z-index:999999;" +
            "display:flex;flex-direction:column;gap:8px;";

        document.body.appendChild(container);

    }

    const toast =
        document.createElement("div");

    toast.textContent = message;

    toast.style.cssText =
        "background:linear-gradient(90deg,#22d3ee,#a855f7);" +
        "color:#05060f;font-weight:700;padding:12px 18px;" +
        "border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.4);" +
        "font-family:sans-serif;font-size:14px;" +
        "animation:cpToastIn 0.25s ease;max-width:320px;";

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = "opacity 0.3s ease";
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 2500);

}

const cpToastStyle =
    document.createElement("style");

cpToastStyle.textContent =
    "@keyframes cpToastIn{from{opacity:0;transform:translateX(20px);}to{opacity:1;transform:translateX(0);}}";

document.head.appendChild(cpToastStyle);


function openGiftDropdown(giftSelected, giftOptions) {

    const isOpen =
        giftOptions.style.display === "block";

    if (isOpen) {
        giftOptions.style.display = "none";
        return;
    }

    const rect =
        giftSelected.getBoundingClientRect();

    document.body.appendChild(giftOptions);

    giftOptions.style.position = "fixed";
    giftOptions.style.left = rect.left + "px";
    giftOptions.style.display = "block";

    const margin = 10;
    const desiredHeight = 350;

    const spaceBelow =
        window.innerHeight - rect.bottom - margin;

    const spaceAbove =
        rect.top - margin;

    if (spaceBelow >= 180 || spaceBelow >= spaceAbove) {

        giftOptions.style.top = (rect.bottom + 4) + "px";
        giftOptions.style.bottom = "auto";
        giftOptions.style.maxHeight =
            Math.max(120, Math.min(desiredHeight, spaceBelow)) + "px";

    } else {

        giftOptions.style.top = "auto";
        giftOptions.style.bottom =
            (window.innerHeight - rect.top + 4) + "px";
        giftOptions.style.maxHeight =
            Math.max(120, Math.min(desiredHeight, spaceAbove)) + "px";

    }

}


/* ==========================================================
   IDENTITÉ LOCALE CREATORPILOT
   Chaque installation possède son propre identifiant.
   ========================================================== */

function getCreatorPilotClientId() {

    /* Priorité au cookie de session serveur (identité partagée
       entre les requêtes HTTP classiques et les sockets) */
    const cookieMatch =
        document.cookie.match(/(?:^|;\s*)cp_session=([^;]+)/);

    if (cookieMatch) {

        const cookieId =
            decodeURIComponent(cookieMatch[1]);

        localStorage.setItem(
            "creatorpilot-client-id",
            cookieId
        );

        return cookieId;
    }

    let clientId =
        localStorage.getItem(
            "creatorpilot-client-id"
        );

    if (!clientId) {
        clientId =
            (
                window.crypto?.randomUUID?.() ||
                (
                    "cp-" +
                    Date.now() +
                    "-" +
                    Math.random()
                        .toString(36)
                        .slice(2)
                )
            );

        localStorage.setItem(
            "creatorpilot-client-id",
            clientId
        );
    }

    return clientId;
}

const CREATORPILOT_CLIENT_ID =
    getCreatorPilotClientId();

/*
   Met à jour tous les champs affichant une URL d'overlay pour
   qu'ils contiennent déjà l'identifiant du client, que
   l'utilisateur clique sur "Copier URL" ou sélectionne le
   texte du champ directement.
*/
window.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll(".overlayUrlInput").forEach(input => {

        if (!input.value.includes("client=")) {
            input.value +=
                (input.value.includes("?") ? "&" : "?") +
                "client=" +
                CREATORPILOT_CLIENT_ID;
        }

    });

});

socket.emit(
    "register-client",
    {
        clientId: CREATORPILOT_CLIENT_ID
    }
);


const messages = document.getElementById("messages");
const giftAlert = document.getElementById("giftAlert");
const giftImage = document.getElementById("giftImage");
const likeCounter = document.getElementById("likeCounter");
const followAlert = document.getElementById("followAlert");

const voiceButton = document.getElementById("voiceButton");
const settingsButton = document.getElementById("settingsButton");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettings = document.getElementById("closeSettings");
const saveSettings = document.getElementById("saveSettings");

const addGiftRule = document.getElementById("addGiftRule");

const topGiftersList = document.getElementById("topGiftersList");
const giftHistoryList = document.getElementById("giftHistoryList");

const statsButton = document.getElementById("statsButton");
const statsPanel = document.getElementById("statsPanel");
const closeStats = document.getElementById("closeStats");
const resetStats = document.getElementById("resetStats");


const setupButton = document.getElementById("setupButton");
const setupPanel = document.getElementById("setupPanel");
const closeSetup = document.getElementById("closeSetup");

const overlayButton = document.getElementById("overlayButton");
const overlayPanel = document.getElementById("overlayPanel");
const closeOverlay = document.getElementById("closeOverlay");

const actionsTab = document.getElementById("actionsTab");
const eventsTab = document.getElementById("eventsTab");
const actionsContent = document.getElementById("actionsContent");
const eventsContent = document.getElementById("eventsContent");

const addEventRule = document.getElementById("addEventRule");
const eventsBody = document.getElementById("eventsBody");

const loadGiftLibrary =
    document.getElementById("loadGiftLibrary");

    const soundButton = document.getElementById("soundButton");
const soundPanel = document.getElementById("soundPanel");
const closeSound = document.getElementById("closeSound");

const chatButton =
    document.getElementById("chatButton");

const chatPanel =
    document.getElementById("chatPanel");

const closeChat =
    document.getElementById("closeChat");

    const toolsButton =
    document.getElementById("toolsButton");

const toolsPanel =
    document.getElementById("toolsPanel");

const closeTools =
    document.getElementById("closeTools");

    const startButton =
    document.getElementById("startButton");

const startPanel =
    document.getElementById("startPanel");

const closeStart =
    document.getElementById("closeStart");

const pointsButton =
    document.getElementById("pointsButton");

const pointsPanel =
    document.getElementById("pointsPanel");

const faqButton =
    document.getElementById("faqButton");

const faqPage =
    document.getElementById("faqPage");

const startMainPage =
    document.getElementById("startMainPage");  
    
    const aboutButton =
    document.getElementById("aboutButton");

const aboutPage =
    document.getElementById("aboutPage");

    const contactButton =
    document.getElementById("contactButton");

const contactPage =
    document.getElementById("contactPage");

    const homeStartButton =
    document.getElementById("homeStartButton");

    const connectTikTokSetupTab =
    document.getElementById("connectTikTokSetupTab");

const setupHome =
    document.getElementById("setupHome");

const connectTikTokSetupPage =
    document.getElementById("connectTikTokSetupPage");

const tiktokUsernameInput =
    document.getElementById("tiktokUsernameInput");

const saveTikTokUserButton =
    document.getElementById("saveTikTokUserButton");

const startConnectTikTokButton =
    document.getElementById("startConnectTikTokButton");

const pointsSystemSetupTab =
    document.getElementById("pointsSystemSetupTab");

const pointsSystemSetupPage =
    document.getElementById("pointsSystemSetupPage");

const subscriberBonusSetupTab =
    document.getElementById("subscriberBonusSetupTab");

const subscriberBonusSetupPage =
    document.getElementById("subscriberBonusSetupPage");
    
const obsConnectionSetupTab =
    document.getElementById("obsConnectionSetupTab");

const obsConnectionSetupPage =
    document.getElementById("obsConnectionSetupPage");

    const streamerBotSetupTab =
    document.getElementById("streamerBotSetupTab");

const streamerBotSetupPage =
    document.getElementById("streamerBotSetupPage");

    const minecraftSetupTab =
    document.getElementById("minecraftSetupTab");

const minecraftSetupPage =
    document.getElementById("minecraftSetupPage");

    const resetPointsSetupTab =
    document.getElementById("resetPointsSetupTab");

const resetPointsSetupPage =
    document.getElementById("resetPointsSetupPage");

    const tikBabikProSetupTab =
    document.getElementById("tikBabikProSetupTab");

const tikBabikProSetupPage =
    document.getElementById("tikBabikProSetupPage");

    const accountButton = document.getElementById("accountButton");
const loginPage = document.getElementById("loginPage");

    const legalButton = document.getElementById("legalButton");
const legalPage = document.getElementById("legalPage");

const agencyButton = document.getElementById("agencyButton");
const agencyPage = document.getElementById("agencyPage");

const accountSetupTab =
    document.getElementById("accountSetupTab");

const accountSetupPage =
    document.getElementById("accountSetupPage");

    const savedLanguage =
localStorage.getItem("tikbabik-language") || "fr";

const registerBtn =
document.getElementById("registerBtn");

const loginBtn =
document.getElementById("loginBtn");

document.getElementById(
    "languageSelector"
).value = savedLanguage;

    const languageSelector =
document.getElementById("languageSelector");

const openGiftGalleryButton =
    document.getElementById("openGiftGalleryButton");

const giftGalleryPanel =
    document.getElementById("giftGalleryPanel");

const overlayGrid =
    document.querySelector(".overlayGrid");

const giftLibraryBody =
    document.getElementById("giftLibraryBody");


const closeGiftGalleryButton =
    document.getElementById("closeGiftGalleryButton");

languageSelector.addEventListener("change", () => {

    const lang = languageSelector.value;

    localStorage.setItem("tikbabik-language", lang);

    location.reload();

});

const graphicOverlayPanel =
    document.getElementById("graphicOverlayPanel");

    if (overlayButton && graphicOverlayPanel) {

    overlayButton.onclick = () => {

        openPanel(graphicOverlayPanel);

    };

}

const graphicOverlayButton =
    document.getElementById("graphicOverlayButton");

if (graphicOverlayButton && graphicOverlayPanel) {

    graphicOverlayButton.onclick = () => {

        openPanel(graphicOverlayPanel);

    };

}

const chronoCustomize =
    document.getElementById("chronoCustomize");

const chronoCustomizePanel =
    document.getElementById("chronoCustomizePanel");

if (chronoCustomize && chronoCustomizePanel) {

    chronoCustomize.onclick = async () => {

        chronoCustomizePanel.style.display =
            chronoCustomizePanel.style.display === "none"
                ? "block"
                : "none";

        if (chronoCustomizePanel.style.display === "block") {

            const response = await fetch("/chrono/status");
            const data = await response.json();
            const s = data.settings || {};

            document.getElementById("chronoFont").value = s.font || "Orbitron";
            document.getElementById("chronoFontSize").value = s.fontSize || 42;
            document.getElementById("chronoLetterSpacing").value = s.letterSpacing || 4;
            document.getElementById("chronoTextColor").value = s.textColor || "#b700ff";
            document.getElementById("chronoBgColor").value = s.bgColor || "#05060f";
            document.getElementById("chronoLabelText").value = s.labelText || "";
            document.getElementById("chronoLabelColor").value = s.labelColor || "#8b93b8";
            document.getElementById("chronoRingColor1").value = s.ringColor1 || "#22d3ee";
            document.getElementById("chronoRingColor2").value = s.ringColor2 || "#a855f7";
            document.getElementById("chronoRingColor3").value = s.ringColor3 || "#ec4899";
            document.getElementById("chronoRingSpeed").value = s.ringSpeed || 6;
            document.getElementById("chronoDefaultMinutes").value = s.defaultMinutes || 5;
        }

    };

}

const transactionSearch =
    document.getElementById("transactionSearch");

    if (transactionSearch) {

    transactionSearch.oninput = () => {

        refreshPointsTransactionsTable();

    };

}

const saveChronoCustomize =
    document.getElementById("saveChronoCustomize");

if (saveChronoCustomize) {
    saveChronoCustomize.onclick = async () => {

        await fetch("/chrono/settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                defaultMinutes: Number(document.getElementById("chronoDefaultMinutes").value || 5),
                secondsPerCoin: Number(document.getElementById("chronoSecondsPerCoinCustom").value || 1),
                perFollow: Number(document.getElementById("chronoPerFollow").value || 0),
                perShare: Number(document.getElementById("chronoPerShare").value || 0),
                perLike: Number(document.getElementById("chronoPerLike").value || 0),
                perChat: Number(document.getElementById("chronoPerChat").value || 0),
                giftMode: document.getElementById("chronoGiftModeCustom").value,
                giftAutoEnabled: document.getElementById("chronoGiftAutoEnabled").checked,

                font: document.getElementById("chronoFont").value,
                fontSize: Number(document.getElementById("chronoFontSize").value || 42),
                letterSpacing: Number(document.getElementById("chronoLetterSpacing").value || 4),
                textColor: document.getElementById("chronoTextColor").value,
                bgColor: document.getElementById("chronoBgColor").value
            })
        });

        document.querySelector(".chronoFrame").src =
            "/overlay/chrono?t=" + Date.now();

        showToast("Chrono sauvegardé !");
    };
}

const wheelStart =
    document.getElementById("wheelStart");

if (wheelStart) {

    wheelStart.onclick = async () => {

        const response =
            await fetch(
                "/action-wheel/spin",
                {
                    method: "POST"
                }
            );

        const data =
            await response.json();

        alert(
            "Action gagnante : " +
            data.winner
        );

    };

}

const wheelCopyUrl =
    document.getElementById("wheelCopyUrl");

if (wheelCopyUrl) {
    wheelCopyUrl.onclick = async () => {
        const url =
            window.location.origin +
            "/overlay/action-wheel?client=" +
            getCreatorPilotClientId();

        try {
    await navigator.clipboard.writeText(url);
    alert("URL copiée : " + url);
} catch (error) {
    alert("Impossible de copier automatiquement.\n\nURL : " + url);
}
    };
}

const wheelCustomize =
    document.getElementById("wheelCustomize");

const wheelCustomizePanel =
    document.getElementById("wheelCustomizePanel");

const wheelAddWheel =
    document.getElementById("wheelAddWheel");

const wheelListBody =
    document.getElementById("wheelListBody");

if (wheelCustomize && wheelCustomizePanel) {
    wheelCustomize.onclick = () => {
        wheelCustomizePanel.style.display =
            wheelCustomizePanel.style.display === "none"
                ? "block"
                : "none";
    };
}

const segmentSettingsPanel = document.getElementById("segmentSettingsPanel");
const closeSegmentSettings = document.getElementById("closeSegmentSettings");
const addWheelSegment = document.getElementById("addWheelSegment");
const segmentTableBody = document.getElementById("segmentTableBody");
const saveSegmentsButton = document.getElementById("saveSegmentsButton");
const saveWheelSettings = document.getElementById("saveWheelSettings");

let currentWheelRow = null;

function addWheelRow(data = {}) {
    const row = document.createElement("tr");

    row.innerHTML = `
        <td>
            <button class="wheelPlayButton">▶</button>
            <button class="wheelDeleteButton">🗑</button>
        </td>

        <td>
            <input type="checkbox" class="wheelEnabled" ${data.enabled !== false ? "checked" : ""}>
        </td>

        <td>
            <input class="wheelName" value="${data.name || "Roue 1"}">
        </td>

        <td>
            <div class="giftDropdown">
                <div class="giftSelected">
                    <img class="giftSelectedImage" src="" style="display:none;">
                    <span class="giftSelectedText">Choisir un cadeau</span>
                </div>
                <div class="giftOptions"></div>
            </div>
        </td>

        <td>
            <button class="wheelEditSegments">
                Edit Segments (${data.segments ? data.segments.length : 0})
            </button>
        </td>
    `;

    wheelListBody.appendChild(row);

    if (data.segments) {
        row.dataset.segments = JSON.stringify(data.segments);
    }

    const giftDropdown = row.querySelector(".giftDropdown");
    const giftSelected = row.querySelector(".giftSelected");
    const giftSelectedImage = row.querySelector(".giftSelectedImage");
    const giftSelectedText = row.querySelector(".giftSelectedText");
    const giftOptions = row.querySelector(".giftOptions");

    giftSelected.onclick = () => {
        openGiftDropdown(giftSelected, giftOptions);
    };

    

    fetch("/giftLibrary.json?t=" + Date.now())
        .then(response => response.json())
        .then(gifts => {

            console.log("CADEAUX EVENTS :", gifts.length, gifts);

            gifts.forEach((gift, index) => {

                const option = document.createElement("div");
                option.className = "giftOption";

                option.innerHTML =
                    "<img src='" + gift.image + "'>" +
                    "<span>" +
                    gift.name +
                    " (" +
                    (gift.diamonds || 0) +
                    "🪙)</span>";

                option.onclick = () => {
                    giftDropdown.dataset.triggerIndex = index;
                    giftDropdown.dataset.triggerName = gift.name;

                    giftSelectedImage.src = gift.image;
                    giftSelectedImage.style.display = "inline-block";

                    giftSelectedText.innerHTML =
                        gift.name + " (" + (gift.diamonds || 0) + "🪙)";

                    giftOptions.style.display = "none";
                };

                giftOptions.appendChild(option);
                if (
    data.gift &&
    data.gift.trim().toLowerCase() ===
    gift.name.trim().toLowerCase()
) {

    

    giftDropdown.dataset.triggerIndex =
        index;

    giftDropdown.dataset.triggerName =
        gift.name;

    giftSelectedImage.src =
        gift.image;

    giftSelectedImage.style.display =
        "inline-block";

    giftSelectedText.innerHTML =
        gift.name +
        " (" +
        (gift.diamonds || 0) +
        "🪙)";

}
            });

            if (data.triggerIndex !== undefined && data.triggerIndex !== "") {
                const savedGift = gifts[Number(data.triggerIndex)];

                if (savedGift) {
                    giftDropdown.dataset.triggerIndex = data.triggerIndex;
                    giftDropdown.dataset.triggerName = savedGift.name;

                    giftSelectedImage.src = savedGift.image;
                    giftSelectedImage.style.display = "inline-block";

                    giftSelectedText.innerHTML =
                        savedGift.name + " (" + (savedGift.diamonds || 0) + "🪙)";
                }
            }
        });

    row.querySelector(".wheelDeleteButton").onclick = () => {
        row.remove();
    };

    row.querySelector(".wheelPlayButton").onclick = async () => {
        await fetch("/action-wheel/spin", {
            method: "POST"
        });
    };

    row.querySelector(".wheelEditSegments").onclick = () => {
        currentWheelRow = row;
        segmentTableBody.innerHTML = "";

        const segments = JSON.parse(row.dataset.segments || "[]");

        if (segments.length === 0) {
            addSegmentRow("", "#FBB129");
            addSegmentRow("", "#EEF0E6");
            addSegmentRow("", "#289376");
        } else {
            segments.forEach(segment => {
                addSegmentRow(segment.text, segment.color);
            });
        }

        segmentSettingsPanel.style.display = "block";
    };
}

async function loadWheelSettings() {
    const response = await fetch("/action-wheel/status");
    const data = await response.json();

    const settings = data.settings || {};
    const wheels = settings.wheels || [];

    wheelListBody.innerHTML = "";

    wheels.forEach(wheel => {
        addWheelRow(wheel);
    });
}

loadWheelSettings();

if (wheelAddWheel && wheelListBody) {
    wheelAddWheel.onclick = () => {
        addWheelRow({
            name: "Nouvelle roue",
            trigger: "",
            triggerIndex: "",
            segments: []
        });
    };
}

if (closeSegmentSettings) {
    closeSegmentSettings.onclick = () => {
        segmentSettingsPanel.style.display = "none";
    };
}

function addSegmentRow(text = "", color = "#ff0050") {
    const row = document.createElement("tr");

    row.innerHTML = `
        <td class="segmentMove">☷</td>

        <td>
            <button class="segmentDelete">🗑</button>
        </td>

        <td>
            <input type="text" class="segmentText" value="${text}">
        </td>

        <td>
            <input type="color" class="segmentColor" value="${color}">
        </td>

        <td>
            <select class="segmentActionSelect">
    <option value="">Sélectionner une action</option>
</select>
        </td>

        <td>
            <button class="segmentRemove">✕</button>
        </td>
    `;

    segmentTableBody.appendChild(row);

    row.querySelector(".segmentDelete").onclick = () => {
        row.remove();
    };

    row.querySelector(".segmentRemove").onclick = () => {
        row.remove();
    };

    const actionSelect =
    row.querySelector(".segmentActionSelect");

const actions =
    appSettings.actions || [];

actions.forEach(action => {

    const option =
        document.createElement("option");

    option.value =
        action.name;

    option.innerText =
        action.name;

    actionSelect.appendChild(option);

});

actionSelect.onchange = () => {
    if (actionSelect.value) {
        row.querySelector(".segmentText").value =
            actionSelect.value;
    }
};
}

if (addWheelSegment) {
    addWheelSegment.onclick = () => {
        addSegmentRow("Nouvelle action", "#ff0050");
    };
}

if (saveSegmentsButton) {
    saveSegmentsButton.onclick = () => {
        const segments = [];

        document.querySelectorAll("#segmentTableBody tr").forEach(row => {
            segments.push({
                text: row.querySelector(".segmentText").value,
                color: row.querySelector(".segmentColor").value
            });
        });

        if (currentWheelRow) {
            currentWheelRow.dataset.segments = JSON.stringify(segments);

            currentWheelRow.querySelector(".wheelEditSegments").innerHTML =
                "Edit Segments (" + segments.length + ")";
        }

        segmentSettingsPanel.style.display = "none";
    };
}

function getWheelSettings() {
    const wheels = [];

    document.querySelectorAll("#wheelListBody tr").forEach(row => {
        wheels.push({
            enabled: row.querySelector(".wheelEnabled").checked,
            name: row.querySelector(".wheelName").value,

            trigger:
                row.querySelector(".giftDropdown")?.dataset.triggerName || "",

            triggerIndex:
                row.querySelector(".giftDropdown")?.dataset.triggerIndex || "",

            segments:
                JSON.parse(row.dataset.segments || "[]")
        });
    });

    return {
        font: document.getElementById("wheelFont").value,
        fontSize: Number(document.getElementById("wheelFontSize").value || 50),
        lineSpacing: Number(document.getElementById("wheelLineSpacing").value || 50),
        letterSpacing: Number(document.getElementById("wheelLetterSpacing").value || 50),
        showBase: document.getElementById("wheelShowBase").checked,
        soundActive: document.getElementById("wheelSoundActive").checked,
        announceDuration: Number(document.getElementById("wheelAnnounceDuration").value || 3),
        spinDuration: Number(document.getElementById("wheelSpinDuration").value || 10),
        waitDuration: Number(document.getElementById("wheelWaitDuration").value || 1),
        ringColor1: document.getElementById("wheelRingColor1")?.value || "#22d3ee",
        ringColor2: document.getElementById("wheelRingColor2")?.value || "#a855f7",
        ringColor3: document.getElementById("wheelRingColor3")?.value || "#ec4899",
        ringSpeed: Number(document.getElementById("wheelRingSpeed")?.value || 6),
        wheels
    };
}

if (saveWheelSettings) {
    saveWheelSettings.onclick = async () => {
        const settings = getWheelSettings();

        await fetch("/action-wheel/settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(settings)
        });

        document.querySelector(".wheelFrame").src =
            "/overlay/action-wheel?t=" + Date.now();

        showToast("Roue sauvegardée !");
    };
}

const socialAddField =
    document.getElementById("socialAddField");

const socialFieldsBody =
    document.getElementById("socialFieldsBody");

if (socialAddField && socialFieldsBody) {
    socialAddField.onclick = () => {
        addSocialField();
    };
}

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <button class="deleteSocialRow">
                    🗑
                </button>
            </td>

            <td>
                <select class="socialPlatform">
                    <option>TikTok</option>
                    <option>Twitch</option>
                    <option>YouTube</option>
                    <option>Instagram</option>
                    <option>Discord</option>
                    <option>Kick</option>
                </select>
            </td>

            <td>
                <input
                    class="socialUsername"
                    placeholder="@username">
            </td>

            <td>
                <input
                    type="color"
                    class="socialIconColor"
                    value="#ffffff">
            </td>

            <td>
                <input
                    type="color"
                    class="socialIconBg"
                    value="#ff0050">
            </td>
        `;

        socialFieldsBody.appendChild(row);

        row.querySelector(".deleteSocialRow")
            .onclick = () => {
                row.remove();
            };

            function refreshChronoPreview() {
    const frame =
        document.querySelector(".chronoFrame");

    if (frame) {
        frame.src =
            "/overlay/chrono?t=" + Date.now();
    }
}

[
    "chronoFont",
    "chronoFontSize",
    "chronoLetterSpacing",
    "chronoTextColor",
    "chronoBgColor",
    "chronoLabelText",
    "chronoLabelColor",
    "chronoRingColor1",
    "chronoRingColor2",
    "chronoRingColor3",
    "chronoRingSpeed"
].forEach(id => {

    const element =
        document.getElementById(id);

    if (element) {
        element.addEventListener("input", async () => {
            await saveChronoPreviewOnly();
        });

        element.addEventListener("change", async () => {
            await saveChronoPreviewOnly();
        });
    }

});

async function saveWheelPreviewOnly() {
    const settings =
        getWheelSettings();

    await fetch("/action-wheel/settings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
    });

    const frame =
        document.querySelector(".wheelFrame");

    if (frame) {
        frame.src =
            "/overlay/action-wheel?t=" + Date.now();
    }
}

[
    "wheelFont",
    "wheelFontSize",
    "wheelLineSpacing",
    "wheelLetterSpacing",
    "wheelShowBase",
    "wheelSoundActive",
    "wheelAnnounceDuration",
    "wheelSpinDuration",
    "wheelWaitDuration",
    "wheelRingColor1",
    "wheelRingColor2",
    "wheelRingColor3",
    "wheelRingSpeed"
].forEach(id => {
    const element =
        document.getElementById(id);

    if (!element) return;

    element.addEventListener("input", saveWheelPreviewOnly);
    element.addEventListener("change", saveWheelPreviewOnly);
});

async function saveChronoPreviewOnly() {
    await fetch("/chrono/settings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            defaultMinutes: Number(document.getElementById("chronoDefaultMinutes").value || 5),
            secondsPerCoin: Number(document.getElementById("chronoSecondsPerCoinCustom").value || 1),
            perFollow: Number(document.getElementById("chronoPerFollow").value || 0),
            perShare: Number(document.getElementById("chronoPerShare").value || 0),
            perLike: Number(document.getElementById("chronoPerLike").value || 0),
            perChat: Number(document.getElementById("chronoPerChat").value || 0),
            giftMode: document.getElementById("chronoGiftModeCustom").value,
            giftAutoEnabled: document.getElementById("chronoGiftAutoEnabled").checked,

            font: document.getElementById("chronoFont").value,
            fontSize: Number(document.getElementById("chronoFontSize").value || 42),
            letterSpacing: Number(document.getElementById("chronoLetterSpacing").value || 4),
            textColor: document.getElementById("chronoTextColor").value,
            bgColor: document.getElementById("chronoBgColor").value,
            labelText: document.getElementById("chronoLabelText").value,
            labelColor: document.getElementById("chronoLabelColor").value,
            ringColor1: document.getElementById("chronoRingColor1").value,
            ringColor2: document.getElementById("chronoRingColor2").value,
            ringColor3: document.getElementById("chronoRingColor3").value,
            ringSpeed: Number(document.getElementById("chronoRingSpeed").value || 6)
        })
    });

    refreshChronoPreview();
}
        

const saveSocialSettings =
    document.getElementById("saveSocialSettings");

function getSocialSettings() {
    const fields = [];

    document.querySelectorAll("#socialFieldsBody tr").forEach(row => {
        fields.push({
            platform: row.querySelector(".socialPlatform").value,
            username: row.querySelector(".socialUsername").value,
            iconColor: row.querySelector(".socialIconColor").value,
            iconBg: row.querySelector(".socialIconBg").value
        });
    });

    return {
        font: document.getElementById("socialFont").value,
        fontSize: document.getElementById("socialFontSize").value,
        letterSpacing: document.getElementById("socialLetterSpacing").value,
        fontColor: document.getElementById("socialFontColor").value,
        bgColor: document.getElementById("socialBgColor").value,
        animation: document.getElementById("socialAnimation").value,
        displayTime: document.getElementById("socialDisplayTime").value,
        pauseTime: document.getElementById("socialPauseTime").value,
        ringColor1: document.getElementById("socialRingColor1")?.value || "#22d3ee",
        ringColor2: document.getElementById("socialRingColor2")?.value || "#a855f7",
        ringColor3: document.getElementById("socialRingColor3")?.value || "#ec4899",
        ringSpeed: Number(document.getElementById("socialRingSpeed")?.value || 6),
        fields: fields
    };
}

if (saveSocialSettings) {
    saveSocialSettings.onclick = async () => {

        const settings = getSocialSettings();

        localStorage.setItem(
            "socialPanelSettings",
            JSON.stringify(settings)
        );
        function refreshSocialPreview() {
    const frame = document.querySelector(".socialFrame");

   if (frame && frame.src !== window.location.origin + "/overlay/social-panel") {
    frame.src = "/overlay/social-panel";
}
}

        await fetch("/social-panel/settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(settings)
        });
       // refreshSocialPreview désactivé pour éviter erreur preview
        

        showToast("Panneau sociaux sauvegardé !");
    };
}

function addSocialField(field = {}) {
    const row = document.createElement("tr");

    row.innerHTML = `
        <td>
            <button class="deleteSocialRow">🗑</button>
        </td>

        <td>
            <select class="socialPlatform">
                <option>TikTok</option>
                <option>Twitch</option>
                <option>YouTube</option>
                <option>Instagram</option>
                <option>Discord</option>
                <option>Kick</option>
            </select>
        </td>

        <td>
            <input class="socialUsername" placeholder="@username">
        </td>

        <td>
            <input type="color" class="socialIconColor" value="#ffffff">
        </td>

        <td>
            <input type="color" class="socialIconBg" value="#ff0050">
        </td>
    `;

    socialFieldsBody.appendChild(row);

    row.querySelector(".socialPlatform").value = field.platform || "TikTok";
    row.querySelector(".socialUsername").value = field.username || "";
    row.querySelector(".socialIconColor").value = field.iconColor || "#ffffff";
    row.querySelector(".socialIconBg").value = field.iconBg || "#ff0050";

    row.querySelector(".deleteSocialRow").onclick = () => {
        row.remove();
    };
}

const savedSocialSettings =
    JSON.parse(localStorage.getItem("socialPanelSettings"));

if (savedSocialSettings) {
    document.getElementById("socialFont").value = savedSocialSettings.font || "Arial";
    document.getElementById("socialFontSize").value = savedSocialSettings.fontSize || 45;
    document.getElementById("socialLetterSpacing").value = savedSocialSettings.letterSpacing || 2;
    document.getElementById("socialFontColor").value = savedSocialSettings.fontColor || "#000000";
    document.getElementById("socialBgColor").value = savedSocialSettings.bgColor || "#00ff4d";
    document.getElementById("socialAnimation").value = savedSocialSettings.animation || "fade";
    document.getElementById("socialDisplayTime").value = savedSocialSettings.displayTime || 4;
    document.getElementById("socialPauseTime").value = savedSocialSettings.pauseTime || 1;
    document.getElementById("socialRingColor1").value = savedSocialSettings.ringColor1 || "#22d3ee";
    document.getElementById("socialRingColor2").value = savedSocialSettings.ringColor2 || "#a855f7";
    document.getElementById("socialRingColor3").value = savedSocialSettings.ringColor3 || "#ec4899";
    document.getElementById("socialRingSpeed").value = savedSocialSettings.ringSpeed || 6;

    socialFieldsBody.innerHTML = "";

    savedSocialSettings.fields.forEach(field => {
        addSocialField(field);
    });
}

    Paddle.Initialize({
    token: "live_fe73a5f9b3c938fb8976ce65006"
});
console.log("Paddle initialisé");

const coinMatchStart = document.getElementById("coinMatchStart");
const coinMatchEnd = document.getElementById("coinMatchEnd");
const coinMatchReset = document.getElementById("coinMatchReset");
const coinMatchShowWinners = document.getElementById("coinMatchShowWinners");
const coinMatchCopyUrl = document.getElementById("coinMatchCopyUrl");
const giftBattleStart =
    document.getElementById("giftBattleStart");

    const giftBattleTestRed =
    document.getElementById("giftBattleTestRed");

const giftBattleTestBlue =
    document.getElementById("giftBattleTestBlue");
const giftBattleEnd =
    document.getElementById("giftBattleEnd");

const giftBattleReset =
    document.getElementById("giftBattleReset");

const giftBattleCopyUrl =
    document.getElementById("giftBattleCopyUrl");

    const giftBattleCustomize =
    document.getElementById("giftBattleCustomize");

const giftBattleCustomizePanel =
    document.getElementById("giftBattleCustomizePanel");

    const openGiftBattleGiftPicker =
    document.getElementById("openGiftBattleGiftPicker");

const giftBattleGiftPicker =
    document.getElementById("giftBattleGiftPicker");

    const saveGiftBattleCustomize =
    document.getElementById("saveGiftBattleCustomize");

const coinMatchCustomize =
    document.getElementById("coinMatchCustomize");

    const coinMatchTestGift =
    document.getElementById("coinMatchTestGift");

const coinMatchCustomizePanel =
    document.getElementById("coinMatchCustomizePanel");

if (coinMatchCustomize && coinMatchCustomizePanel) {

    coinMatchCustomize.onclick = () => {
        coinMatchCustomizePanel.style.display =
            coinMatchCustomizePanel.style.display === "none"
                ? "flex"
                : "none";
    };

}

const socialCustomizeButton =
    document.getElementById("socialCustomizeButton");

const socialCustomizePanel =
    document.getElementById("socialCustomizePanel");

const closeSocialCustomize =
    document.getElementById("closeSocialCustomize");

if (socialCustomizeButton && socialCustomizePanel) {
    socialCustomizeButton.onclick = () => {
        socialCustomizePanel.style.display = "block";
    };
}

if (closeSocialCustomize && socialCustomizePanel) {
    closeSocialCustomize.onclick = () => {
        socialCustomizePanel.style.display = "none";
    };
}

const socialCopyUrlButton =
    document.getElementById("socialCopyUrlButton");

if (socialCopyUrlButton) {
    socialCopyUrlButton.onclick = async () => {
        const url =
            window.location.origin + "/overlay/social-panel";

        try {
    await navigator.clipboard.writeText(url);
    alert("URL copiée : " + url);
} catch (error) {
    alert("Impossible de copier automatiquement.\n\nURL : " + url);
}
    };
}

const chronoStart =
    document.getElementById("chronoStart");

const chronoCopyUrl =
    document.getElementById("chronoCopyUrl");

if (chronoStart) {
    chronoStart.onclick = async () => {
        await fetch("/chrono/start", {
            method: "POST"
        });

        alert("Chrono lancé !");
    };
}

if (chronoCopyUrl) {
    chronoCopyUrl.onclick = async () => {
        const url =
            window.location.origin +
            "/overlay/chrono?client=" +
            getCreatorPilotClientId();

        try {
    await navigator.clipboard.writeText(url);
    alert("URL Chrono copiée : " + url);
} catch (error) {
    alert("Impossible de copier automatiquement.\n\nURL : " + url);
}
    };
}

const chronoResume =
    document.getElementById("chronoResume");

const chronoPause =
    document.getElementById("chronoPause");

const chronoReset =
    document.getElementById("chronoReset");

const saveTopLikesSettings =
    document.getElementById("saveTopLikesSettings");

function getTopLikesSettings() {
    return {
        titleFont: document.getElementById("topLikesTitleFont").value,
        nameFont: document.getElementById("topLikesNameFont").value,
        fontSize: document.getElementById("topLikesFontSize").value,
        titleText: document.getElementById("topLikesTitleText").value,
        titleColorStart: document.getElementById("topLikesTitleColorStart").value,
        titleColorEnd: document.getElementById("topLikesTitleColorEnd").value,
        nameColor: document.getElementById("topLikesNameColor").value,
        likesColor: document.getElementById("topLikesLikesColor").value,
        rankColor: document.getElementById("topLikesRankColor").value,
        bgColor: document.getElementById("topLikesBgColor").value,
        rowColor: document.getElementById("topLikesRowColor").value,
        ringColor1: document.getElementById("topLikesRingColor1").value,
        ringColor2: document.getElementById("topLikesRingColor2").value,
        ringColor3: document.getElementById("topLikesRingColor3").value,
        ringSpeed: document.getElementById("topLikesRingSpeed").value,
        heartIcon: document.getElementById("topLikesHeartIcon").value,
        showAvatar: document.getElementById("topLikesShowAvatar").checked,
        showCrown: document.getElementById("topLikesShowCrown").checked,
        showHeart: document.getElementById("topLikesShowHeart").checked
    };
}

function applyTopLikesSettings() {
    const settings = getTopLikesSettings();

    const frames =
        document.querySelectorAll('iframe[src^="/overlay/top-likes"]');

    if (frames.length) {
        const newSrc =
            "/overlay/top-likes" +
            "?titleFont=" + encodeURIComponent(settings.titleFont) +
            "&nameFont=" + encodeURIComponent(settings.nameFont) +
            "&fontSize=" + settings.fontSize +
            "&titleText=" + encodeURIComponent(settings.titleText) +
            "&titleColorStart=" + settings.titleColorStart.substring(1) +
            "&titleColorEnd=" + settings.titleColorEnd.substring(1) +
            "&nameColor=" + settings.nameColor.substring(1) +
            "&likesColor=" + settings.likesColor.substring(1) +
            "&rankColor=" + settings.rankColor.substring(1) +
            "&bgColor=" + settings.bgColor.substring(1) +
            "&rowColor=" + settings.rowColor.substring(1) +
            "&ringColor1=" + settings.ringColor1.substring(1) +
            "&ringColor2=" + settings.ringColor2.substring(1) +
            "&ringColor3=" + settings.ringColor3.substring(1) +
            "&ringSpeed=" + settings.ringSpeed +
            "&heartIcon=" + encodeURIComponent(settings.heartIcon) +
            "&showAvatar=" + settings.showAvatar +
            "&showCrown=" + settings.showCrown +
            "&showHeart=" + settings.showHeart +
            "&t=" + Date.now();

        frames.forEach(frame => {
            frame.src = newSrc;
        });
    }

    return settings;
}

[
    "topLikesTitleFont",
    "topLikesNameFont",
    "topLikesFontSize",
    "topLikesTitleText",
    "topLikesTitleColorStart",
    "topLikesTitleColorEnd",
    "topLikesNameColor",
    "topLikesLikesColor",
    "topLikesRankColor",
    "topLikesBgColor",
    "topLikesRowColor",
    "topLikesRingColor1",
    "topLikesRingColor2",
    "topLikesRingColor3",
    "topLikesRingSpeed",
    "topLikesHeartIcon",
    "topLikesShowAvatar",
    "topLikesShowCrown",
    "topLikesShowHeart"
].forEach(id => {
    const element = document.getElementById(id);

    if (element) {
        element.addEventListener("input", applyTopLikesSettings);
        element.addEventListener("change", applyTopLikesSettings);
    }
});

if (saveTopLikesSettings) {
    saveTopLikesSettings.onclick = () => {
        const settings = applyTopLikesSettings();

        localStorage.setItem(
            "topLikesSettings",
            JSON.stringify(settings)
        );

        fetch("/top-likes/settings", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify(settings)
});

        showToast("Réglages Top J'aime sauvegardés !");
    };
}

const savedTopLikesSettings =
    JSON.parse(localStorage.getItem("topLikesSettings"));

if (savedTopLikesSettings) {
    document.getElementById("topLikesTitleFont").value =
        savedTopLikesSettings.titleFont || "Orbitron";

    document.getElementById("topLikesNameFont").value =
        savedTopLikesSettings.nameFont || "Rajdhani";

    document.getElementById("topLikesFontSize").value =
        savedTopLikesSettings.fontSize;

    document.getElementById("topLikesTitleText").value =
        savedTopLikesSettings.titleText || "Top J'aime";

    document.getElementById("topLikesTitleColorStart").value =
        savedTopLikesSettings.titleColorStart || "#22d3ee";

    document.getElementById("topLikesTitleColorEnd").value =
        savedTopLikesSettings.titleColorEnd || "#ff4d6d";

    document.getElementById("topLikesNameColor").value =
        savedTopLikesSettings.nameColor;

    document.getElementById("topLikesLikesColor").value =
        savedTopLikesSettings.likesColor;

    document.getElementById("topLikesRankColor").value =
        savedTopLikesSettings.rankColor;

    document.getElementById("topLikesBgColor").value =
        savedTopLikesSettings.bgColor || "#05060f";

    document.getElementById("topLikesRowColor").value =
        savedTopLikesSettings.rowColor || "#a855f7";

    document.getElementById("topLikesRingColor1").value =
        savedTopLikesSettings.ringColor1 || "#22d3ee";

    document.getElementById("topLikesRingColor2").value =
        savedTopLikesSettings.ringColor2 || "#a855f7";

    document.getElementById("topLikesRingColor3").value =
        savedTopLikesSettings.ringColor3 || "#ec4899";

    document.getElementById("topLikesRingSpeed").value =
        savedTopLikesSettings.ringSpeed || 6;

    document.getElementById("topLikesHeartIcon").value =
        savedTopLikesSettings.heartIcon || "❤️";

    document.getElementById("topLikesShowAvatar").checked =
        savedTopLikesSettings.showAvatar;

    document.getElementById("topLikesShowCrown").checked =
        savedTopLikesSettings.showCrown;

    document.getElementById("topLikesShowHeart").checked =
        savedTopLikesSettings.showHeart;

    applyTopLikesSettings();
}

/* ==================== TOP DONATEURS (UI) ==================== */

const saveTopDonorsSettings =
    document.getElementById("saveTopDonorsSettings");

function getTopDonorsSettings() {
    return {
        titleFont: document.getElementById("topDonorsTitleFont").value,
        nameFont: document.getElementById("topDonorsNameFont").value,
        fontSize: document.getElementById("topDonorsFontSize").value,
        titleText: document.getElementById("topDonorsTitleText").value,
        titleColorStart: document.getElementById("topDonorsTitleColorStart").value,
        titleColorEnd: document.getElementById("topDonorsTitleColorEnd").value,
        nameColor: document.getElementById("topDonorsNameColor").value,
        coinsColor: document.getElementById("topDonorsCoinsColor").value,
        rankColor: document.getElementById("topDonorsRankColor").value,
        bgColor: document.getElementById("topDonorsBgColor").value,
        rowColor: document.getElementById("topDonorsRowColor").value,
        ringColor1: document.getElementById("topDonorsRingColor1").value,
        ringColor2: document.getElementById("topDonorsRingColor2").value,
        ringColor3: document.getElementById("topDonorsRingColor3").value,
        ringSpeed: document.getElementById("topDonorsRingSpeed").value,
        coinIcon: document.getElementById("topDonorsCoinIcon").value,
        showAvatar: document.getElementById("topDonorsShowAvatar").checked,
        showCrown: document.getElementById("topDonorsShowCrown").checked,
        showCoin: document.getElementById("topDonorsShowCoin").checked
    };
}

function applyTopDonorsSettings() {
    const settings = getTopDonorsSettings();

    const frames =
        document.querySelectorAll('iframe[src^="/overlay/top-donors"]');

    if (frames.length) {
        const newSrc =
            "/overlay/top-donors" +
            "?titleFont=" + encodeURIComponent(settings.titleFont) +
            "&nameFont=" + encodeURIComponent(settings.nameFont) +
            "&fontSize=" + settings.fontSize +
            "&titleText=" + encodeURIComponent(settings.titleText) +
            "&titleColorStart=" + settings.titleColorStart.substring(1) +
            "&titleColorEnd=" + settings.titleColorEnd.substring(1) +
            "&nameColor=" + settings.nameColor.substring(1) +
            "&coinsColor=" + settings.coinsColor.substring(1) +
            "&rankColor=" + settings.rankColor.substring(1) +
            "&bgColor=" + settings.bgColor.substring(1) +
            "&rowColor=" + settings.rowColor.substring(1) +
            "&ringColor1=" + settings.ringColor1.substring(1) +
            "&ringColor2=" + settings.ringColor2.substring(1) +
            "&ringColor3=" + settings.ringColor3.substring(1) +
            "&ringSpeed=" + settings.ringSpeed +
            "&coinIcon=" + encodeURIComponent(settings.coinIcon) +
            "&showAvatar=" + settings.showAvatar +
            "&showCrown=" + settings.showCrown +
            "&showCoin=" + settings.showCoin +
            "&t=" + Date.now();

        frames.forEach(frame => {
            frame.src = newSrc;
        });
    }

    return settings;
}

[
    "topDonorsTitleFont",
    "topDonorsNameFont",
    "topDonorsFontSize",
    "topDonorsTitleText",
    "topDonorsTitleColorStart",
    "topDonorsTitleColorEnd",
    "topDonorsNameColor",
    "topDonorsCoinsColor",
    "topDonorsRankColor",
    "topDonorsBgColor",
    "topDonorsRowColor",
    "topDonorsRingColor1",
    "topDonorsRingColor2",
    "topDonorsRingColor3",
    "topDonorsRingSpeed",
    "topDonorsCoinIcon",
    "topDonorsShowAvatar",
    "topDonorsShowCrown",
    "topDonorsShowCoin"
].forEach(id => {
    const element = document.getElementById(id);

    if (element) {
        element.addEventListener("input", applyTopDonorsSettings);
        element.addEventListener("change", applyTopDonorsSettings);
    }
});

if (saveTopDonorsSettings) {
    saveTopDonorsSettings.onclick = () => {
        const settings = applyTopDonorsSettings();

        localStorage.setItem(
            "topDonorsSettings",
            JSON.stringify(settings)
        );

        fetch("/top-donors/settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(settings)
        });

        showToast("Réglages Top Donateurs sauvegardés !");
    };
}

const savedTopDonorsSettings =
    JSON.parse(localStorage.getItem("topDonorsSettings"));

if (savedTopDonorsSettings) {
    document.getElementById("topDonorsTitleFont").value =
        savedTopDonorsSettings.titleFont || "Orbitron";

    document.getElementById("topDonorsNameFont").value =
        savedTopDonorsSettings.nameFont || "Rajdhani";

    document.getElementById("topDonorsFontSize").value =
        savedTopDonorsSettings.fontSize;

    document.getElementById("topDonorsTitleText").value =
        savedTopDonorsSettings.titleText || "Top Donateurs";

    document.getElementById("topDonorsTitleColorStart").value =
        savedTopDonorsSettings.titleColorStart || "#22d3ee";

    document.getElementById("topDonorsTitleColorEnd").value =
        savedTopDonorsSettings.titleColorEnd || "#00e5ff";

    document.getElementById("topDonorsNameColor").value =
        savedTopDonorsSettings.nameColor;

    document.getElementById("topDonorsCoinsColor").value =
        savedTopDonorsSettings.coinsColor;

    document.getElementById("topDonorsRankColor").value =
        savedTopDonorsSettings.rankColor;

    document.getElementById("topDonorsBgColor").value =
        savedTopDonorsSettings.bgColor || "#05060f";

    document.getElementById("topDonorsRowColor").value =
        savedTopDonorsSettings.rowColor || "#a855f7";

    document.getElementById("topDonorsRingColor1").value =
        savedTopDonorsSettings.ringColor1 || "#22d3ee";

    document.getElementById("topDonorsRingColor2").value =
        savedTopDonorsSettings.ringColor2 || "#a855f7";

    document.getElementById("topDonorsRingColor3").value =
        savedTopDonorsSettings.ringColor3 || "#ec4899";

    document.getElementById("topDonorsRingSpeed").value =
        savedTopDonorsSettings.ringSpeed || 6;

    document.getElementById("topDonorsCoinIcon").value =
        savedTopDonorsSettings.coinIcon || "🪙";

    document.getElementById("topDonorsShowAvatar").checked =
        savedTopDonorsSettings.showAvatar;

    document.getElementById("topDonorsShowCrown").checked =
        savedTopDonorsSettings.showCrown;

    document.getElementById("topDonorsShowCoin").checked =
        savedTopDonorsSettings.showCoin;

    applyTopDonorsSettings();
}

const topDonorsCustomize =
    document.getElementById("topDonorsCustomize");

const topDonorsCustomizeModal =
    document.getElementById("topDonorsCustomizeModal");

const closeTopDonorsSettings =
    document.getElementById("closeTopDonorsSettings");

if (topDonorsCustomize && topDonorsCustomizeModal) {
    topDonorsCustomize.onclick = () => {
        topDonorsCustomizeModal.style.display = "flex";
        applyTopDonorsSettings();
    };
}

if (closeTopDonorsSettings && topDonorsCustomizeModal) {
    closeTopDonorsSettings.onclick = () => {
        topDonorsCustomizeModal.style.display = "none";
    };
}

const topDonorsTest =
    document.getElementById("topDonorsTest");

if (topDonorsTest) {
    topDonorsTest.onclick = async () => {
        await fetch("/top-donors/test", {
            method: "POST"
        });
    };
}

const topDonorsReset =
    document.getElementById("topDonorsReset");

if (topDonorsReset) {
    topDonorsReset.onclick = async () => {
        if (!confirm("Réinitialiser le classement Top Donateurs ?")) {
            return;
        }
        await fetch("/top-donors/reset", { method: "POST" });
    };
}

const topDonorsCopyUrl =
    document.getElementById("topDonorsCopyUrl");

if (topDonorsCopyUrl) {
    topDonorsCopyUrl.onclick = async () => {

        const url =
            window.location.origin +
            "/overlay/top-donors?client=" +
            getCreatorPilotClientId();

        try {
            await navigator.clipboard.writeText(url);
            alert("URL copiée : " + url);
        } catch (error) {
            alert("Impossible de copier automatiquement.\n\nURL : " + url);
        }

    };
}

/* ==================== TOP PRÉSENCE LIVE (UI) ==================== */

const saveTopPresenceSettings =
    document.getElementById("saveTopPresenceSettings");

function getTopPresenceSettings() {
    return {
        titleFont: document.getElementById("topPresenceTitleFont").value,
        nameFont: document.getElementById("topPresenceNameFont").value,
        fontSize: document.getElementById("topPresenceFontSize").value,
        titleText: document.getElementById("topPresenceTitleText").value,
        titleColorStart: document.getElementById("topPresenceTitleColorStart").value,
        titleColorEnd: document.getElementById("topPresenceTitleColorEnd").value,
        nameColor: document.getElementById("topPresenceNameColor").value,
        timeColor: document.getElementById("topPresenceTimeColor").value,
        rankColor: document.getElementById("topPresenceRankColor").value,
        bgColor: document.getElementById("topPresenceBgColor").value,
        rowColor: document.getElementById("topPresenceRowColor").value,
        ringColor1: document.getElementById("topPresenceRingColor1").value,
        ringColor2: document.getElementById("topPresenceRingColor2").value,
        ringColor3: document.getElementById("topPresenceRingColor3").value,
        ringSpeed: document.getElementById("topPresenceRingSpeed").value,
        clockIcon: document.getElementById("topPresenceClockIcon").value,
        showAvatar: document.getElementById("topPresenceShowAvatar").checked,
        showCrown: document.getElementById("topPresenceShowCrown").checked,
        showClock: document.getElementById("topPresenceShowClock").checked
    };
}

function applyTopPresenceSettings() {
    const settings = getTopPresenceSettings();

    const frames =
        document.querySelectorAll('iframe[src^="/overlay/top-presence"]');

    if (frames.length) {
        const newSrc =
            "/overlay/top-presence" +
            "?titleFont=" + encodeURIComponent(settings.titleFont) +
            "&nameFont=" + encodeURIComponent(settings.nameFont) +
            "&fontSize=" + settings.fontSize +
            "&titleText=" + encodeURIComponent(settings.titleText) +
            "&titleColorStart=" + settings.titleColorStart.substring(1) +
            "&titleColorEnd=" + settings.titleColorEnd.substring(1) +
            "&nameColor=" + settings.nameColor.substring(1) +
            "&timeColor=" + settings.timeColor.substring(1) +
            "&rankColor=" + settings.rankColor.substring(1) +
            "&bgColor=" + settings.bgColor.substring(1) +
            "&rowColor=" + settings.rowColor.substring(1) +
            "&ringColor1=" + settings.ringColor1.substring(1) +
            "&ringColor2=" + settings.ringColor2.substring(1) +
            "&ringColor3=" + settings.ringColor3.substring(1) +
            "&ringSpeed=" + settings.ringSpeed +
            "&clockIcon=" + encodeURIComponent(settings.clockIcon) +
            "&showAvatar=" + settings.showAvatar +
            "&showCrown=" + settings.showCrown +
            "&showClock=" + settings.showClock +
            "&t=" + Date.now();

        frames.forEach(frame => {
            frame.src = newSrc;
        });
    }

    return settings;
}

[
    "topPresenceTitleFont",
    "topPresenceNameFont",
    "topPresenceFontSize",
    "topPresenceTitleText",
    "topPresenceTitleColorStart",
    "topPresenceTitleColorEnd",
    "topPresenceNameColor",
    "topPresenceTimeColor",
    "topPresenceRankColor",
    "topPresenceBgColor",
    "topPresenceRowColor",
    "topPresenceRingColor1",
    "topPresenceRingColor2",
    "topPresenceRingColor3",
    "topPresenceRingSpeed",
    "topPresenceClockIcon",
    "topPresenceShowAvatar",
    "topPresenceShowCrown",
    "topPresenceShowClock"
].forEach(id => {
    const element = document.getElementById(id);

    if (element) {
        element.addEventListener("input", applyTopPresenceSettings);
        element.addEventListener("change", applyTopPresenceSettings);
    }
});

if (saveTopPresenceSettings) {
    saveTopPresenceSettings.onclick = () => {
        const settings = applyTopPresenceSettings();

        localStorage.setItem(
            "topPresenceSettings",
            JSON.stringify(settings)
        );

        fetch("/top-presence/settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(settings)
        });

        showToast("Réglages Top Présence LIVE sauvegardés !");
    };
}

const savedTopPresenceSettings =
    JSON.parse(localStorage.getItem("topPresenceSettings"));

if (savedTopPresenceSettings) {
    document.getElementById("topPresenceTitleFont").value =
        savedTopPresenceSettings.titleFont || "Orbitron";

    document.getElementById("topPresenceNameFont").value =
        savedTopPresenceSettings.nameFont || "Rajdhani";

    document.getElementById("topPresenceFontSize").value =
        savedTopPresenceSettings.fontSize;

    document.getElementById("topPresenceTitleText").value =
        savedTopPresenceSettings.titleText || "Top Présence LIVE";

    document.getElementById("topPresenceTitleColorStart").value =
        savedTopPresenceSettings.titleColorStart || "#22d3ee";

    document.getElementById("topPresenceTitleColorEnd").value =
        savedTopPresenceSettings.titleColorEnd || "#7CFC00";

    document.getElementById("topPresenceNameColor").value =
        savedTopPresenceSettings.nameColor;

    document.getElementById("topPresenceTimeColor").value =
        savedTopPresenceSettings.timeColor;

    document.getElementById("topPresenceRankColor").value =
        savedTopPresenceSettings.rankColor;

    document.getElementById("topPresenceBgColor").value =
        savedTopPresenceSettings.bgColor || "#05060f";

    document.getElementById("topPresenceRowColor").value =
        savedTopPresenceSettings.rowColor || "#a855f7";

    document.getElementById("topPresenceRingColor1").value =
        savedTopPresenceSettings.ringColor1 || "#22d3ee";

    document.getElementById("topPresenceRingColor2").value =
        savedTopPresenceSettings.ringColor2 || "#a855f7";

    document.getElementById("topPresenceRingColor3").value =
        savedTopPresenceSettings.ringColor3 || "#ec4899";

    document.getElementById("topPresenceRingSpeed").value =
        savedTopPresenceSettings.ringSpeed || 6;

    document.getElementById("topPresenceClockIcon").value =
        savedTopPresenceSettings.clockIcon || "⏱️";

    document.getElementById("topPresenceShowAvatar").checked =
        savedTopPresenceSettings.showAvatar;

    document.getElementById("topPresenceShowCrown").checked =
        savedTopPresenceSettings.showCrown;

    document.getElementById("topPresenceShowClock").checked =
        savedTopPresenceSettings.showClock;

    applyTopPresenceSettings();
}

const topPresenceCustomize =
    document.getElementById("topPresenceCustomize");

const topPresenceCustomizeModal =
    document.getElementById("topPresenceCustomizeModal");

const closeTopPresenceSettings =
    document.getElementById("closeTopPresenceSettings");

if (topPresenceCustomize && topPresenceCustomizeModal) {
    topPresenceCustomize.onclick = () => {
        topPresenceCustomizeModal.style.display = "flex";
        applyTopPresenceSettings();
    };
}

if (closeTopPresenceSettings && topPresenceCustomizeModal) {
    closeTopPresenceSettings.onclick = () => {
        topPresenceCustomizeModal.style.display = "none";
    };
}

const topPresenceTest =
    document.getElementById("topPresenceTest");

if (topPresenceTest) {
    topPresenceTest.onclick = async () => {
        await fetch("/top-presence/test", {
            method: "POST"
        });
    };
}

const topPresenceReset =
    document.getElementById("topPresenceReset");

if (topPresenceReset) {
    topPresenceReset.onclick = async () => {
        if (!confirm("Réinitialiser le classement Top Présence LIVE ?")) {
            return;
        }
        await fetch("/top-presence/reset", { method: "POST" });
    };
}

const topPresenceCopyUrl =
    document.getElementById("topPresenceCopyUrl");

if (topPresenceCopyUrl) {
    topPresenceCopyUrl.onclick = async () => {

        const url =
            window.location.origin +
            "/overlay/top-presence?client=" +
            getCreatorPilotClientId();

        try {
            await navigator.clipboard.writeText(url);
            alert("URL copiée : " + url);
        } catch (error) {
            alert("Impossible de copier automatiquement.\n\nURL : " + url);
        }

    };
}

const topLikesTest =
    document.getElementById("topLikesTest");

    const topLikesCopyUrl =
    document.getElementById("topLikesCopyUrl");

const saveCoinCustomize = document.getElementById("saveCoinCustomize");

function applyCoinMatchStyle() {

    const settings = {

        bg: document.getElementById("coinBgColor").value,
        border: document.getElementById("coinBorderColor").value,
        text: document.getElementById("coinTextColor").value,
        timer: document.getElementById("coinTimerColor").value,
        shape: document.getElementById("coinShape").value,
        scale: document.getElementById("coinScale").value,
    duration: document.getElementById("coinDuration").value,
    victorySound: localStorage.getItem("coinVictorySound") || "victory.mp3",
    ringColor1: document.getElementById("coinRingColor1").value,
    ringColor2: document.getElementById("coinRingColor2").value,
    ringColor3: document.getElementById("coinRingColor3").value,
    ringSpeed: Number(document.getElementById("coinRingSpeed").value || 6)

    };

    const frame =
        document.querySelector(".coinMatchFrame");

   frame.src =
    "/overlay/coin-match-preview" +
    "?bg=" + settings.bg.substring(1) +
    "&border=" + settings.border.substring(1) +
    "&text=" + settings.text.substring(1) +
    "&timer=" + settings.timer.substring(1) +
    "&shape=" + settings.shape.replace("px", "") +
    "&scale=" + settings.scale +
    "&sound=" + encodeURIComponent(settings.victorySound) +
    "&ringColor1=" + settings.ringColor1.substring(1) +
    "&ringColor2=" + settings.ringColor2.substring(1) +
    "&ringColor3=" + settings.ringColor3.substring(1) +
    "&ringSpeed=" + settings.ringSpeed;
    return settings;
}

[
    "coinBgColor",
    "coinBorderColor",
    "coinTextColor",
    "coinTimerColor",
    "coinShape",
    "coinScale",
    "coinRingColor1",
    "coinRingColor2",
    "coinRingColor3",
    "coinRingSpeed"
].forEach(id => {

    const element =
        document.getElementById(id);

    if (element) {

        element.oninput = () => {

            applyCoinMatchStyle();

        };

    }

});



saveCoinCustomize.onclick = () => {

   const soundInput =
    document.getElementById("coinVictorySound");

if (soundInput.files.length > 0) {

    const formData = new FormData();
    formData.append("file", soundInput.files[0]);

    fetch("/upload", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        localStorage.setItem(
            "coinVictorySound",
            result.filename
        );
    });

}

    const settings = applyCoinMatchStyle();

    localStorage.setItem(
        "coinMatchStyle",
        JSON.stringify(settings)
    );

    fetch("/coin-match/duration", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        duration: Number(settings.duration)
    })
});

fetch("/coin-match/settings", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify(settings)
});

    showToast("Style Coin Match sauvegardé !");
};
const savedCoinStyle =
    JSON.parse(localStorage.getItem("coinMatchStyle"));

if (savedCoinStyle) {

    document.getElementById("coinBgColor").value =
        savedCoinStyle.bg;

    document.getElementById("coinBorderColor").value =
        savedCoinStyle.border;

    document.getElementById("coinTextColor").value =
        savedCoinStyle.text;

    document.getElementById("coinTimerColor").value =
        savedCoinStyle.timer;

    document.getElementById("coinRingColor1").value =
        savedCoinStyle.ringColor1 || "#22d3ee";

    document.getElementById("coinRingColor2").value =
        savedCoinStyle.ringColor2 || "#a855f7";

    document.getElementById("coinRingColor3").value =
        savedCoinStyle.ringColor3 || "#ec4899";

    document.getElementById("coinRingSpeed").value =
        savedCoinStyle.ringSpeed || 6;

    document.getElementById("coinShape").value =
        savedCoinStyle.shape;

    document.getElementById("coinScale").value =
        savedCoinStyle.scale;

      document.getElementById("coinDuration").value =
    savedCoinStyle.duration || "300";  

    applyCoinMatchStyle();
}

[
    "coinBgColor",
    "coinBorderColor",
    "coinTextColor",
    "coinTimerColor",
    "coinShape",
    "coinScale",
    "coinDuration",
    "coinRingColor1",
    "coinRingColor2",
    "coinRingColor3",
    "coinRingSpeed"
].forEach(id => {

    const element =
        document.getElementById(id);

    if (!element) return;

    element.addEventListener(
        "input",
        applyCoinMatchStyle
    );

});

const chronoMinutes =
    document.getElementById("chronoMinutes");

const chronoIncrease =
    document.getElementById("chronoIncrease");

const chronoDecrease =
    document.getElementById("chronoDecrease");

if (chronoIncrease) {
    chronoIncrease.onclick = async () => {
        const minutes = Number(chronoMinutes.value || 1);

        await fetch("/chrono/increase", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                seconds: minutes * 60
            })
        });
    };
}

if (chronoDecrease) {
    chronoDecrease.onclick = async () => {
        const minutes = Number(chronoMinutes.value || 1);

        await fetch("/chrono/decrease", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                seconds: minutes * 60
            })
        });
    };
}

const chronoGiftAutoEnabled =
    document.getElementById("chronoGiftAutoEnabled");

const chronoGiftMode =
    document.getElementById("chronoGiftMode");

const chronoSecondsPerCoin =
    document.getElementById("chronoSecondsPerCoin");

const chronoSaveGiftSettings =
    document.getElementById("chronoSaveGiftSettings");

const chronoTestGift =
    document.getElementById("chronoTestGift");

if (chronoSaveGiftSettings) {
    chronoSaveGiftSettings.onclick = async () => {
        await fetch("/chrono/settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                giftAutoEnabled: chronoGiftAutoEnabled.checked,
                giftMode: chronoGiftMode.value,
                secondsPerCoin: Number(chronoSecondsPerCoin.value || 1)
            })
        });

        showToast("Paramètres auto cadeaux sauvegardés !");
    };
}

if (chronoTestGift) {
    chronoTestGift.onclick = async () => {
        await fetch("/chrono/test-gift", {
            method: "POST"
        });

        alert("Cadeau test envoyé !");
    };
}
    
const topLikesCustomize =
    document.getElementById("topLikesCustomize");

const topLikesCustomizeModal =
    document.getElementById("topLikesCustomizeModal");

const closeTopLikesSettings =
    document.getElementById("closeTopLikesSettings");

let voiceEnabled = true;
let appSettings = {};
let topGifters = {};
let giftHistory = [];
let lastTtsTime = 0;
let ttsQueue = [];
let ttsIsSpeaking = false;
let pointsUsers = {};
let pointsTransactions = [];

const savedPointsTransactions =
    localStorage.getItem("pointsTransactions");

if (savedPointsTransactions) {
    pointsTransactions =
        JSON.parse(savedPointsTransactions);
}

const savedPointsUsers =
    localStorage.getItem("pointsUsers");

if (savedPointsUsers) {
    pointsUsers =
        JSON.parse(savedPointsUsers);
}



function loadAvailableTtsVoices() {

    if (
        appSettings?.ttsChat?.engine === "openai"
    ) {
        return;
    }

    const voiceSelect =
        document.getElementById("ttsVoice");

    if (!voiceSelect) {
        return;
    }

    const savedVoice =
        appSettings?.ttsChat?.voice || voiceSelect.value;

    const voices =
        speechSynthesis.getVoices();

    voiceSelect.innerHTML = "";

    voices.forEach(voice => {

        const option =
            document.createElement("option");

        option.value =
            voice.name;

        option.innerText =
            voice.name +
            " - " +
            voice.lang;

        voiceSelect.appendChild(option);

    });

    if (savedVoice) {
        voiceSelect.value = savedVoice;
    }

}

speechSynthesis.onvoiceschanged = loadAvailableTtsVoices;

setTimeout(loadAvailableTtsVoices, 500);

function refreshPointsUsersTable() {
    

    const body =
        document.getElementById("pointsUsersBody");

    if (!body) {
        return;
    }

    body.innerHTML = "";

  Object.values(pointsUsers)
    .sort((a, b) => b.points - a.points)
    .forEach((user, index) => {

            const row =
                document.createElement("tr");

            row.innerHTML = `
            <td>#${index + 1}</td>
                <td>${user.username}</td>
                <td>${user.points}</td>
                <td>Niv. ${user.level}</td>
                <td>${user.lastGift || "-"}</td>
                <td>${user.lastGiftDate || "-"}</td>
            `;

            body.appendChild(row);

        });

}

const ttsVoice =
    document.getElementById("ttsVoice");

if (ttsVoice) {
    ttsVoice.onchange = () => {

        if (!isProUser()) {
            alert("La modification des voix est réservée à CreatorPilot Pro.");

            ttsVoice.value =
                appSettings?.ttsChat?.voice || "";

            goToProCheckout();
            return;
        }

    };
}

function refreshPointsTransactionsTable() {

    const body =
        document.getElementById("pointsTransactionsBody");

    if (!body) {
        return;
    }

    body.innerHTML = "";

    const search =
    document.getElementById("transactionSearch")?.value
        ?.toLowerCase() || "";

pointsTransactions
    .slice()
    .reverse()
    .filter(transaction => {

        return (
            transaction.user.toLowerCase().includes(search) ||
            transaction.description.toLowerCase().includes(search)
        );

    })
    .forEach(transaction => {

            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td>${transaction.action}</td>
                <td>${transaction.user}</td>
                <td>${transaction.points}</td>
                <td>${transaction.description}</td>
                <td>${transaction.countForLevel}</td>
                <td>${transaction.manual}</td>
                <td>${transaction.date}</td>
            `;

            body.appendChild(row);

        });

}

refreshPointsTransactionsTable();

function processTtsQueue() {

    if (ttsIsSpeaking) {
        return;
    }

    if (ttsQueue.length === 0) {
        return;
    }

    const item =
        ttsQueue.shift();

    ttsIsSpeaking = true;

    speechSynthesis.speak(item.speech);

    item.speech.onend = () => {
        ttsIsSpeaking = false;
        processTtsQueue();
    };

    item.speech.onerror = (event) => {
        console.log("ERREUR SYNTHÈSE VOCALE :", event.error);
        ttsIsSpeaking = false;
        processTtsQueue();
    };

}

const mainPanels = [
    graphicOverlayPanel,
    startPanel,
    settingsPanel,
    setupPanel,
    statsPanel,
    overlayPanel,
    soundPanel,
    chatPanel,
    toolsPanel,
    pointsPanel
];

function openPanel(panel) {
    mainPanels.forEach(p => {
        if (p) {
            p.style.display = "none";
        }
    });

    panel.style.display = "flex";
}

function addSoundAlertRow(data = {}) {

    console.log("SOUND ALERT LOADED :", data);

    const body =
        document.getElementById("soundAlertsBody");

    if (!body) return;

    const row =
        document.createElement("tr");

    row.innerHTML = `
        <td>
            <button class="soundPlayButton">▶</button>
            <button class="soundDeleteButton">🗑</button>
        </td>

        <td>
            <input
                type="checkbox"
                class="soundEnabled"
                ${data.enabled !== false ? "checked" : ""}>
        </td>

        <td>
            <select class="soundTriggerSelect">


    <option value="follow">
        👤 Follow
    </option>

     <option value="gift">
        🎁 Cadeau TikTok
    </option>

    <option value="share">
        🔄 Share
    </option>

    <option value="like">
        ❤️ Like
    </option>

    <option value="chat">
        💬 Chat
    </option>

</select>

<div class="soundGiftSelector"
     style="display:none;">

    <div class="giftDropdown soundGiftDropdown">

        <div class="giftSelected">
            Choisir un cadeau TikTok...
        </div>

        <div class="giftOptions soundGiftOptions">
        </div>

    </div>

</div>
        </td>

        <td>
            <input type="file" class="soundFile" accept="audio/*">
            <div
    class="soundFileName"
    data-filename="${data.sound || ""}">
    ${data.sound || ""}
</div>

<div style="margin-top:6px;display:flex;gap:6px;align-items:center;">
    <a href="https://www.myinstants.com/fr/search/?name=tiktok" target="_blank" style="font-size:12px;">🔗 MyInstants</a>
    <input type="text" class="soundUrlInput" placeholder="Coller un lien de son..." style="font-size:11px;padding:4px;width:110px;">
    <button type="button" class="soundUrlAddButton" style="font-size:11px;padding:4px 6px;">Ajouter</button>
</div>
        </td>

        <td>
    <div class="keyShortcutBox">

        <button class="selectKeyButton">
            Choisir
        </button>

        <div class="selectedKey">
            ${data.keyShortcut || "Non défini"}
        </div>

    </div>
</td>

        <td>
            <input
                type="range"
                class="soundVolumeSlider"
                min="0"
                max="100"
                value="${data.volume || 100}">
        </td>
    `;

    body.appendChild(row);
    const triggerSelect =
    row.querySelector(".soundTriggerSelect");
    triggerSelect.value =
    data.trigger || "gift";

const giftSelector =
    row.querySelector(".soundGiftSelector");

const giftOptions =
    row.querySelector(".soundGiftOptions");

const giftSelected =
    row.querySelector(".giftSelected");

    const playButton =
    row.querySelector(".soundPlayButton");

const soundInput =
    row.querySelector(".soundFile");

const soundFileName =
    row.querySelector(".soundFileName");

const soundUrlInput =
    row.querySelector(".soundUrlInput");

const soundUrlAddButton =
    row.querySelector(".soundUrlAddButton");

if (soundUrlAddButton) {

    soundUrlAddButton.onclick = async () => {

        const url =
            soundUrlInput.value.trim();

        if (!url) {
            alert("Colle d'abord un lien de son.");
            return;
        }

        soundUrlAddButton.textContent = "...";
        soundUrlAddButton.disabled = true;

        try {

            const response =
                await fetch("/upload-sound-from-url", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url })
                });

            const result =
                await response.json();

            if (!result.success) {
                alert("Échec : " + (result.error || "erreur inconnue"));
                return;
            }

            soundFileName.innerText =
                result.filename;

            soundFileName.dataset.filename =
                result.filename;

            soundUrlInput.value = "";

            alert("Son ajouté : " + result.filename);

        } catch (error) {
            alert("Impossible de télécharger ce lien.");
        } finally {
            soundUrlAddButton.textContent = "Ajouter";
            soundUrlAddButton.disabled = false;
        }

    };

}

    const keyButton =
    row.querySelector(".selectKeyButton");

const keyLabel =
    row.querySelector(".selectedKey");

if (keyButton) {
    keyButton.onclick = () => {

        currentKeyLabel =
            keyLabel;

        selectedKeyValue =
            "";

        if (keyCtrl) keyCtrl.checked = false;
        if (keyAlt) keyAlt.checked = false;
        if (keyShift) keyShift.checked = false;

        updateKeyPreview();

        keySelectorPanel.style.display = "block";
        keySelectorPanel.style.visibility = "visible";
        keySelectorPanel.style.opacity = "1";

    };
}

    soundInput.onchange = () => {

    const file =
        soundInput.files[0];

    if (!file) {
        return;
    }

    const formData =
        new FormData();

    formData.append("file", file);

    fetch("/upload", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(result => {

        soundFileName.innerText =
            result.filename;

        soundFileName.dataset.filename =
            result.filename;

              });

};

            playButton.onclick = () => {

    const sound =
    soundFileName.dataset.filename ||
    soundFileName.innerText.replace("Choisir un fichier", "").trim();

    if (!sound) {
        alert("Aucun son choisi pour cette alerte");
        return;
    }
console.log("SON TEST :", soundFileName.innerText, soundFileName.dataset.filename);
    

console.log(
    "TEST SON URL :",
    "/sounds/" + sound
);

const audio =
    new Audio("/sounds/" + sound);

    audio.volume =
        Number(
            row.querySelector(".soundVolumeSlider")?.value || 100
        ) / 100;

    audio.play();

};


fetch("/giftLibrary.json?t=" + Date.now())
    .then(response => response.json())
    .then(gifts => {

        console.log("CADEAUX EVENTS :", gifts.length, gifts);

        gifts.forEach(gift => {

            const option =
    document.createElement("div");

option.className =
    "giftOption";

option.innerHTML = `
    <img src="${gift.image}">
    <span>${gift.name}</span>
`;

option.onclick = () => {

    giftSelected.innerHTML =
        "<img src='" + gift.image + "'>" +
        "<span>" +
        gift.name +
        " (" +
        (gift.diamonds || 0) +
        "🪙)</span>";

    giftSelected.dataset.gift =
        gift.name;

    giftOptions.style.display =
        "none";

};

giftOptions.appendChild(option);

if (
    data.gift &&
    data.gift.trim().toLowerCase() ===
    gift.name.trim().toLowerCase()
) {

    giftSelected.innerHTML =
        "<img src='" + gift.image + "'>" +
        "<span>" +
        gift.name +
        " (" +
        (gift.diamonds || 0) +
        "🪙)</span>";

    giftSelected.dataset.gift =
        gift.name;

}
giftSelected.onclick = () => {
    openGiftDropdown(giftSelected, giftOptions);
};

        });

    });

triggerSelect.onchange = () => {

    giftSelector.style.display =
        triggerSelect.value === "gift"
            ? "block"
            : "none";

};

triggerSelect.onchange();

    row.querySelector(".soundDeleteButton").onclick = () => {
        row.remove();
    };
}

const addSoundAlert =
    document.getElementById("addSoundAlert");

if (addSoundAlert) {

    addSoundAlert.onclick = () => {

    if (!isProUser()) {

        const count =
            document.querySelectorAll("#soundAlertsBody tr").length;

        if (count >= 2) {
            alert("Version gratuite : 2 alertes sonores maximum");
            return;
        }

    }

    addSoundAlertRow();

};

}

/* MENUS */

if (topLikesCustomize && topLikesCustomizeModal) {

    topLikesCustomize.onclick = () => {
        topLikesCustomizeModal.style.display = "flex";
        applyTopLikesSettings();
    };

}

if (closeTopLikesSettings && topLikesCustomizeModal) {

    closeTopLikesSettings.onclick = () => {
        topLikesCustomizeModal.style.display = "none";
    };

}

coinMatchCustomize.onclick = () => {

    if (
        coinMatchCustomizePanel.style.display === "none"
    ) {

        coinMatchCustomizePanel.style.display = "flex";

    } else {

        coinMatchCustomizePanel.style.display = "none";

    }

};

coinMatchStart.onclick = async () => {
    await fetch("/coin-match/start", { method: "POST" });
    alert("Coin Match démarré !");
};

coinMatchEnd.onclick = async () => {
    await fetch("/coin-match/end", { method: "POST" });
    alert("Coin Match terminé !");
};

coinMatchReset.onclick = async () => {
    await fetch("/coin-match/reset", { method: "POST" });
    alert("Coin Match réinitialisé !");
};

coinMatchShowWinners.onclick = async () => {
    await fetch("/coin-match/show-winners", { method: "POST" });
    alert("Gagnants affichés !");
};

if (coinMatchCopyUrl) {
    coinMatchCopyUrl.onclick = async () => {

        const url =
            window.location.origin +
            "/overlay/coin-match?client=" +
            getCreatorPilotClientId();

        try {
            await navigator.clipboard.writeText(url);
            alert("URL copiée : " + url);
        } catch (error) {
    alert("Impossible de copier automatiquement.\n\nURL : " + url);
}

    };
}

coinMatchTestGift.onclick = async () => {

    await fetch(
        "/coin-match/test-gift",
        {
            method: "POST"
        }
    );

    alert("🎁 Cadeau test envoyé");

};




settingsButton.onclick = () => {
    openPanel(settingsPanel);
};

startButton.onclick = () => {
    openPanel(startPanel);
};

setupButton.onclick = () => {
    openPanel(setupPanel);
};

statsButton.onclick = () => {
    openPanel(statsPanel);
};

overlayButton.onclick = () => {
    openPanel(overlayPanel);
};

const quickOverlayButton =
    document.getElementById("quickOverlayButton");

if (quickOverlayButton) {
    quickOverlayButton.onclick = () => {
        openPanel(graphicOverlayPanel);
    };
}

const quickMinigamesButton =
    document.getElementById("quickMinigamesButton");

if (quickMinigamesButton) {
    quickMinigamesButton.onclick = () => {
        openPanel(overlayPanel);
    };
}



soundButton.onclick = () => {
    openPanel(soundPanel);
};

const soundMainTab =
    document.querySelector(".soundTab");

const soundSettingsTab =
    document.querySelector(".soundSubTab");

    const ttsChatTab =
    document.getElementById("ttsChatTab");

const ttsChatContent =
    document.getElementById("ttsChatContent");

const chatBotTab =
    document.getElementById("chatBotTab");

const chatBotContent =
    document.getElementById("chatBotContent");

const soundSettingsContent =
    document.getElementById("soundSettingsContent");

const soundAlertsContent =
    document.getElementById("soundAlertsContent");

if (soundSettingsTab) {
    soundSettingsTab.onclick = () => {

        soundSettingsContent.style.display = "block";
        soundAlertsContent.style.display = "none";
        ttsChatContent.style.display = "none";
        if (chatBotContent) chatBotContent.style.display = "none";

    };
}


if (soundMainTab) {
    soundMainTab.onclick = () => {

        soundSettingsContent.style.display = "none";
        soundAlertsContent.style.display = "block";
        ttsChatContent.style.display = "none";
        if (chatBotContent) chatBotContent.style.display = "none";

    };
}

if (ttsChatTab) {
    ttsChatTab.onclick = () => {

        soundSettingsContent.style.display = "none";
        soundAlertsContent.style.display = "none";
        ttsChatContent.style.display = "block";
        if (chatBotContent) chatBotContent.style.display = "none";

    };
}

if (chatBotTab) {
    chatBotTab.onclick = () => {

        soundSettingsContent.style.display = "none";
        soundAlertsContent.style.display = "none";
        ttsChatContent.style.display = "none";
        chatBotContent.style.display = "block";

        populateChatBotPanel();

    };
}

const ttsTestButton =
    document.getElementById("ttsTestButton");

if (ttsTestButton) {

    ttsTestButton.onclick = () => {

        const text =
            document.getElementById("ttsTestText").value;

        playTtsMessage(text);

    };

}






const saveTtsSettings =
    document.getElementById("saveTtsSettings");

    const quickTtsEnabled =
    document.getElementById("quickTtsEnabled");

    if (quickTtsEnabled) {

    quickTtsEnabled.checked =
        appSettings?.ttsChat?.enabled ?? true;

    quickTtsEnabled.onchange = () => {

        if (!appSettings.ttsChat) {
            appSettings.ttsChat = {};
        }

        appSettings.ttsChat.enabled =
            quickTtsEnabled.checked;

        const ttsEnabled =
            document.getElementById("ttsEnabled");

        if (ttsEnabled) {
            ttsEnabled.checked =
                quickTtsEnabled.checked;
        }

        const quickTtsEnabled =
    document.getElementById("quickTtsEnabled");

if (quickTtsEnabled) {

    quickTtsEnabled.checked =
        document.getElementById("ttsEnabled")?.checked || false;

}
        fetch("/settings", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify(appSettings)
});

    };

}

const pointsUsersTab =
    document.getElementById("pointsUsersTab");

const pointsTransactionsTab =
    document.getElementById("pointsTransactionsTab");

const pointsUsersContent =
    document.getElementById("pointsUsersContent");

const pointsTransactionsContent =
    document.getElementById("pointsTransactionsContent");

    if (
    pointsUsersTab &&
    pointsTransactionsTab &&
    pointsUsersContent &&
    pointsTransactionsContent
) {

    pointsUsersTab.onclick = () => {

        pointsUsersContent.style.display =
            "block";

        pointsTransactionsContent.style.display =
            "none";

        pointsUsersTab.classList.add("active");

        pointsTransactionsTab.classList.remove("active");

    };

    pointsTransactionsTab.onclick = () => {

        pointsUsersContent.style.display =
            "none";

        pointsTransactionsContent.style.display =
            "block";

        pointsTransactionsTab.classList.add("active");

        pointsUsersTab.classList.remove("active");

    };

}

    const ttsClearQueue =
    document.getElementById("ttsClearQueue");

if (ttsClearQueue) {

    ttsClearQueue.onclick = () => {

        ttsQueue = [];

        const ttsLogs =
            document.getElementById("ttsLogs");

        if (ttsLogs) {

            const log =
                document.createElement("div");

            log.innerHTML =
                "🗑 File TTS vidée";

            ttsLogs.prepend(log);

        }

    };

}

    const ttsAddSpecialUser =
    document.getElementById("ttsAddSpecialUser");

if (ttsAddSpecialUser) {

    ttsAddSpecialUser.onclick = () => {

        const username =
            document.getElementById("ttsSpecialUser")?.value.trim();

        const voice =
            document.getElementById("ttsSpecialVoice")?.value;

        const list =
            document.getElementById("ttsSpecialUsersList");

        if (!username) {
            alert("Entre un @pseudo");
            return;
        }

        const item =
            document.createElement("div");

            item.dataset.username =
    username;

item.dataset.voice =
    voice;

        item.innerHTML =
            username + " → " + voice +
            " <button>🗑</button>";

        item.querySelector("button").onclick = () => {
            item.remove();
        };

        list.appendChild(item);

        document.getElementById("ttsSpecialUser").value = "";

    };

}




if (saveTtsSettings) {

    saveTtsSettings.onclick = () => {

        appSettings.ttsChat = {

            

    /* Paramètres généraux */

    enabled:
        document.getElementById("ttsEnabled")?.checked || false,

    language:
        document.getElementById("ttsLanguage")?.value || "",

engine:
    document.getElementById("ttsEngine")?.value || "windows",

    voice:
        document.getElementById("ttsVoice")?.value || "",

    randomVoice:
        document.getElementById("ttsRandomVoice")?.checked || false,

    speed:
        Number(
            document.getElementById("ttsSpeed")?.value || 50
        ),

    volume:
        Number(
            document.getElementById("ttsVolume")?.value || 100
        ),

        

    /* Utilisateurs autorisés */

    allUsers:
        document.getElementById("ttsAllUsers")?.checked || false,

    followers:
        document.getElementById("ttsFollowers")?.checked || false,

    subscribers:
        document.getElementById("ttsSubscribers")?.checked || false,

    moderators:
        document.getElementById("ttsModerators")?.checked || false,

    team:
        document.getElementById("ttsTeam")?.checked || false,

    teamUsernames:
        (document.getElementById("ttsTeamUsernames")?.value || "")
            .split(",")
            .map(u => u.trim().replace(/^@/, "").toLowerCase())
            .filter(Boolean),

    topGifters:
        document.getElementById("ttsTopGifters")?.checked || false,

    whitelist:
        document.getElementById("ttsWhitelist")?.checked || false,

    whitelistUsernames:
        (document.getElementById("ttsWhitelistUsernames")?.value || "")
            .split(",")
            .map(u => u.trim().replace(/^@/, "").toLowerCase())
            .filter(Boolean),

    /* Types de commentaires */

    command:
        document.getElementById("ttsCommand")?.value || "!tts",

    /* Coût */

    pointsMode:
        document.querySelector('input[name="ttsPointsMode"]:checked')?.value || "free",

    messageCost:
        Number(
            document.getElementById("ttsMessageCost")?.value || 0
        ),

    /* Anti-spam */

    cooldown:
        Number(
            document.getElementById("ttsCooldown")?.value || 0
        ),

    queueLength:
        Number(
            document.getElementById("ttsQueueLength")?.value || 5
        ),

    maxLength:
        Number(
            document.getElementById("ttsMaxLength")?.value || 300
        ),

    filterSpam:
        document.getElementById("ttsFilterSpam")?.checked || false,

    filterMentions:
        document.getElementById("ttsFilterMentions")?.checked || false,

    filterCommands:
    document.getElementById("ttsFilterCommands")?.checked || false,

specialUsers:
    Array.from(
        document.querySelectorAll("#ttsSpecialUsersList div")
    ).map(item => {
        return {
            username: item.dataset.username,
            voice: item.dataset.voice
        };
    })

};


        fetch("/settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(appSettings)
        })
        .then(response => response.json())
        .then(() => {
            showToast("Paramètres TTS sauvegardés !");
        });

    };

}

chatButton.onclick = () => {
    openPanel(chatPanel);
};



pointsButton.onclick = () => {
    openPanel(pointsPanel);
};

if (chronoResume) {

    chronoResume.onclick = async () => {

        await fetch("/chrono/resume", {
            method: "POST"
        });

    };

}

if (chronoPause) {

    chronoPause.onclick = async () => {

        await fetch("/chrono/pause", {
            method: "POST"
        });

    };

}

if (chronoReset) {

    chronoReset.onclick = async () => {

        await fetch("/chrono/reset", {
            method: "POST"
        });

    };

}


actionsTab.onclick = () => {
    actionsTab.classList.add("active");
    eventsTab.classList.remove("active");

    actionsContent.style.display = "block";
    eventsContent.style.display = "none";
};

eventsTab.onclick = () => {
    eventsTab.classList.add("active");
    actionsTab.classList.remove("active");

    actionsContent.style.display = "none";
    eventsContent.style.display = "block";
};




topLikesTest.onclick = async () => {

    await fetch("/top-likes/test", {
        method: "POST"
    });

};

const topLikesReset =
    document.getElementById("topLikesReset");

if (topLikesReset) {
    topLikesReset.onclick = async () => {
        if (!confirm("Réinitialiser le classement Top J'aime ?")) {
            return;
        }
        await fetch("/top-likes/reset", { method: "POST" });
    };
}

topLikesCopyUrl.onclick = async () => {

    const url =
        window.location.origin +
        "/overlay/top-likes?client=" +
        getCreatorPilotClientId();

    try {
    await navigator.clipboard.writeText(url);
    alert("URL copiée : " + url);
} catch (error) {
    alert("Impossible de copier automatiquement.\n\nURL : " + url);
}

};

saveObsSettings.onclick = () => {

    appSettings.obs = {
        ip: obsIp.value,
        port: Number(obsPort.value),
        password: obsPassword.value
    };

    saveAppSettings("Paramètres OBS sauvegardés !");

};

saveMinecraftSettings.onclick = () => {

    appSettings.minecraft = {
        player: minecraftPlayer.value,
        ip: minecraftIp.value,
        port: Number(minecraftPort.value),
        password: minecraftPassword.value
    };

    saveAppSettings("Paramètres Minecraft sauvegardés !");

};

saveStreamerBotSettings.onclick = () => {

    appSettings.streamerBot = {
        ip: streamerBotIp.value,
        port: Number(streamerBotPort.value),
        endpoint: streamerBotEndpoint.value
    };

    saveAppSettings("Paramètres Streamer.bot sauvegardés !");

};

savePointsSystem.onclick = () => {

    appSettings.pointsSystem = {
        currencyName: pointsCurrencyName.value,
        pointsPerCoinEnabled: pointsPerCoinEnabled.checked,
        pointsPerCoin: Number(pointsPerCoin.value),
        pointsPerShareEnabled: pointsPerShareEnabled.checked,
        pointsPerShare: Number(pointsPerShare.value),
        pointsPerChatMinuteEnabled: pointsPerChatMinuteEnabled.checked,
        pointsPerChatMinute: Number(pointsPerChatMinute.value)
    };

    saveAppSettings("Système de points sauvegardé !");

};

saveSubscriberBonus.onclick = () => {

    appSettings.subscriberBonus = {
        normal: Number(pointsNormalUser.value),
        level1: Number(pointsSub1.value),
        level2: Number(pointsSub2.value),
        level3: Number(pointsSub3.value),
        level4: Number(pointsSub4.value),
        level5: Number(pointsSub5.value)
    };

    saveAppSettings("Bonus abonnés sauvegardés !");

};


saveTikTokUserButton.onclick = async () => {

    const username = tiktokUsernameInput.value.trim().replace("@", "");

    if (!username) {
        alert("Entre ton pseudo TikTok.");
        return;
    }

    saveTikTokUserButton.disabled = true;

    try {

        const response = await fetch("/connect-tiktok", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                clientId: CREATORPILOT_CLIENT_ID
            })
        });

        const data = await response.json();

        if (data.success) {

            localStorage.setItem(
                "creatorpilot-tiktok-username",
                username
            );

            alert("Connecté au LIVE TikTok de @" + username);

        } else {

            alert(data.error || "Erreur connexion TikTok");

        }

    } catch (error) {

        console.error(error);
        alert("Impossible de contacter CreatorPilot.");

    }

    saveTikTokUserButton.disabled = false;

};

connectTikTokSetupTab.onclick = () => {
    setupHome.style.display = "none";
    connectTikTokSetupPage.style.display = "block";
    pointsSystemSetupPage.style.display = "none";
    subscriberBonusSetupPage.style.display = "none";
    obsConnectionSetupPage.style.display = "none";
    streamerBotSetupPage.style.display = "none";
    minecraftSetupPage.style.display = "none";
    resetPointsSetupPage.style.display = "none";
    tikBabikProSetupPage.style.display = "none";
    agencyPage.style.display = "none";
    accountSetupPage.style.display = "none";
};

/* CORRECTIF : bouton Accueil > Connecter à TikTok LIVE */
if (startConnectTikTokButton) {
    startConnectTikTokButton.onclick = () => {

        openPanel(setupPanel);

        if (setupHome) {
            setupHome.style.display = "none";
        }

        if (connectTikTokSetupPage) {
            connectTikTokSetupPage.style.display = "block";
        }

        [
            pointsSystemSetupPage,
            subscriberBonusSetupPage,
            obsConnectionSetupPage,
            streamerBotSetupPage,
            minecraftSetupPage,
            resetPointsSetupPage,
            tikBabikProSetupPage,
            agencyPage,
            accountSetupPage
        ].forEach(page => {
            if (page) {
                page.style.display = "none";
            }
        });

        document
            .querySelectorAll(".setupTab")
            .forEach(tab => {
                tab.classList.remove("active");
            });

        if (connectTikTokSetupTab) {
            connectTikTokSetupTab.classList.add("active");
        }

        if (tiktokUsernameInput) {
            const savedUsername =
                localStorage.getItem(
                    "creatorpilot-tiktok-username"
                ) || "";

            if (!tiktokUsernameInput.value && savedUsername) {
                tiktokUsernameInput.value = savedUsername;
            }

            setTimeout(() => {
                tiktokUsernameInput.focus();
            }, 100);
        }
    };
}


pointsSystemSetupTab.onclick = () => {
    setupHome.style.display = "none";
    connectTikTokSetupPage.style.display = "none";
    pointsSystemSetupPage.style.display = "block";
    subscriberBonusSetupPage.style.display = "none";
    obsConnectionSetupPage.style.display = "none";
    streamerBotSetupPage.style.display = "none";
    minecraftSetupPage.style.display = "none";
    resetPointsSetupPage.style.display = "none";
    tikBabikProSetupPage.style.display = "none";
    agencyPage.style.display = "none";
    accountSetupPage.style.display = "none";
};

subscriberBonusSetupTab.onclick = () => {
    setupHome.style.display = "none";
    connectTikTokSetupPage.style.display = "none";
    pointsSystemSetupPage.style.display = "none";
    subscriberBonusSetupPage.style.display = "block";
    obsConnectionSetupPage.style.display = "none";
    streamerBotSetupPage.style.display = "none";
    minecraftSetupPage.style.display = "none";
    resetPointsSetupPage.style.display = "none";
    tikBabikProSetupPage.style.display = "none";
    agencyPage.style.display = "none";
    accountSetupPage.style.display = "none";
};

obsConnectionSetupTab.onclick = () => {
    setupHome.style.display = "none";
    connectTikTokSetupPage.style.display = "none";
    pointsSystemSetupPage.style.display = "none";
    subscriberBonusSetupPage.style.display = "none";
    obsConnectionSetupPage.style.display = "block";
    streamerBotSetupPage.style.display = "none";
    minecraftSetupPage.style.display = "none";
    resetPointsSetupPage.style.display = "none";
    tikBabikProSetupPage.style.display = "none";
    agencyPage.style.display = "none";
    accountSetupPage.style.display = "none";
};

streamerBotSetupTab.onclick = () => {

    if (!requirePro()) {
        return;
    }
    setupHome.style.display = "none";
    connectTikTokSetupPage.style.display = "none";
    pointsSystemSetupPage.style.display = "none";
    subscriberBonusSetupPage.style.display = "none";
    obsConnectionSetupPage.style.display = "none";
    streamerBotSetupPage.style.display = "block";
    minecraftSetupPage.style.display = "none";
    resetPointsSetupPage.style.display = "none";
    tikBabikProSetupPage.style.display = "none";
    agencyPage.style.display = "none";
    accountSetupPage.style.display = "none";

};

minecraftSetupTab.onclick = () => {

    if (!requirePro()) {
        return;
    }
    setupHome.style.display = "none";
    connectTikTokSetupPage.style.display = "none";
    pointsSystemSetupPage.style.display = "none";
    subscriberBonusSetupPage.style.display = "none";
    obsConnectionSetupPage.style.display = "none";
    streamerBotSetupPage.style.display = "none";
    minecraftSetupPage.style.display = "block";
    resetPointsSetupPage.style.display = "none";
    tikBabikProSetupPage.style.display = "none";
    agencyPage.style.display = "none";
    accountSetupPage.style.display = "none";

};

resetPointsSetupTab.onclick = () => {
    setupHome.style.display = "none";
    connectTikTokSetupPage.style.display = "none";
    pointsSystemSetupPage.style.display = "none";
    subscriberBonusSetupPage.style.display = "none";
    obsConnectionSetupPage.style.display = "none";
    streamerBotSetupPage.style.display = "none";
    minecraftSetupPage.style.display = "none";
    resetPointsSetupPage.style.display = "block";
    tikBabikProSetupPage.style.display = "none";
    agencyPage.style.display = "none";
    accountSetupPage.style.display = "none";

};

tikBabikProSetupTab.onclick = () => {
    setupHome.style.display = "none";
    connectTikTokSetupPage.style.display = "none";
    pointsSystemSetupPage.style.display = "none";
    subscriberBonusSetupPage.style.display = "none";
    obsConnectionSetupPage.style.display = "none";
    streamerBotSetupPage.style.display = "none";
    minecraftSetupPage.style.display = "none";
    resetPointsSetupPage.style.display = "none";
    tikBabikProSetupPage.style.display = "block";
    agencyPage.style.display = "none";
    accountSetupPage.style.display = "none";

};

function showElement(element, display = "block") {
    if (element) {
        element.style.display = display;
    }
}

function hideElement(element) {
    if (element) {
        element.style.display = "none";
    }
}

function hideStartPages() {
    [
        startMainPage,
        agencyPage,
        faqPage,
        aboutPage,
        legalPage,
        contactPage,
        loginPage
    ].forEach(hideElement);
}

homeStartButton.onclick = () => {
    hideStartPages();
    showElement(startMainPage);
};

agencyButton.onclick = () => {
    hideStartPages();
    showElement(agencyPage);
};

startButton.onclick = () => {
    openPanel(startPanel);
    hideStartPages();
    showElement(startMainPage);
};

faqButton.onclick = () => {
    hideStartPages();
    showElement(faqPage);
};

legalButton.onclick = () => {
    hideStartPages();
    showElement(legalPage);
};

contactButton.onclick = () => {
    hideStartPages();
    showElement(contactPage);
};

aboutButton.onclick = () => {
    hideStartPages();
    showElement(aboutPage);
};

accountButton.onclick = () => {
    openPanel(startPanel);
    hideStartPages();
    showElement(loginPage);
};



accountSetupTab.onclick = () => {
    setupHome.style.display = "none";
    connectTikTokSetupPage.style.display = "none";
    pointsSystemSetupPage.style.display = "none";
    subscriberBonusSetupPage.style.display = "none";
    obsConnectionSetupPage.style.display = "none";
    streamerBotSetupPage.style.display = "none";
    minecraftSetupPage.style.display = "none";
    resetPointsSetupPage.style.display = "none";
    tikBabikProSetupPage.style.display = "none";
    accountSetupPage.style.display = "block";

};



registerBtn.onclick = async () => {

    const email =
        document.getElementById("registerEmail").value;

    const password =
        document.getElementById("registerPassword").value;

    const response = await fetch("https://www.tikbabik.shop/register", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            email,
            password
        })

    });

    const data = await response.json();

    if (data.success) {

        alert("Compte créé avec succès !");

    } else {

        alert(data.error);

    }

};

const forgotPasswordButton =
    document.getElementById("forgotPasswordButton");

const forgotPasswordBox =
    document.getElementById("forgotPasswordBox");

const sendResetPasswordButton =
    document.getElementById("sendResetPasswordButton");

if (forgotPasswordButton && forgotPasswordBox) {
    forgotPasswordButton.onclick = () => {
        forgotPasswordBox.style.display =
            forgotPasswordBox.style.display === "none"
                ? "block"
                : "none";
    };
}

if (sendResetPasswordButton) {

    sendResetPasswordButton.onclick = async () => {

        const email =
            document.getElementById("forgotPasswordEmail").value;

        const response =
            await fetch("https://www.tikbabik.shop/forgot-password", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email
                })

            });

        const data =
            await response.json();

        alert(
            data.message ||
            "Lien de réinitialisation envoyé."
        );

    };

}

loginBtn.onclick = async () => {

    const email =
        document.getElementById("loginEmail").value;

    const password =
        document.getElementById("loginPassword").value;

    const response = await fetch("https://www.tikbabik.shop/login", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            email,
            password
        })

    });

    const data = await response.json();

    if (data.success) {

    localStorage.setItem(
        "tikbabikUser",
        JSON.stringify(data.user)
    );

    document.getElementById("accountUserId").textContent =
        data.user.id;

    document.getElementById("accountEmail").textContent =
        data.user.email;

    document.getElementById("accountEmailDisplay").textContent =
        data.user.email;

    document.getElementById("accountDate").textContent =
        data.user.createdAt;

    alert("Connexion réussie");

} else {

        alert(data.error);

    }

};

openGiftGalleryButton.onclick = () => {

    window.open(
        "/gift-gallery?t=" + Date.now(),
        "_blank"
    );

};

closeGiftGalleryButton.onclick = () => {

    giftGalleryPanel.style.display = "none";

    overlayGrid.style.display = "grid";

};

giftBattleStart.onclick = async () => {

    await fetch("/gift-battle/start", {
        method: "POST"
    });

    alert("Gift Battle démarré");

};

giftBattleEnd.onclick = async () => {

    await fetch("/gift-battle/end", {
        method: "POST"
    });

    alert("Gift Battle terminé");

};

giftBattleReset.onclick = async () => {

    await fetch("/gift-battle/reset", {
        method: "POST"
    });

    alert("Gift Battle réinitialisé");

};

giftBattleCopyUrl.onclick = async () => {

    const url =
        window.location.origin +
        "/overlay/gift-battle?client=" +
        getCreatorPilotClientId();

    try {
    await navigator.clipboard.writeText(url);
    alert("URL copiée : " + url);
} catch (error) {
    alert("Impossible de copier automatiquement.\n\nURL : " + url);
}

};

giftBattleTestRed.onclick = async () => {

    await fetch(
        "/gift-battle/test-red",
        {
            method: "POST"
        }
    );

};

giftBattleTestBlue.onclick = async () => {

    await fetch(
        "/gift-battle/test-blue",
        {
            method: "POST"
        }
    );

};

giftBattleCustomize.onclick = () => {

    giftBattleCustomizePanel.style.display =
        giftBattleCustomizePanel.style.display === "none"
            ? "flex"
            : "none";

};

function applyGiftBattleStyle() {

    const settings = {
        duration: document.getElementById("giftBattleDuration").value,
        redName: document.getElementById("giftBattleRedName").value,
        blueName: document.getElementById("giftBattleBlueName").value,
        redColor: document.getElementById("giftBattleRedColor").value,
        blueColor: document.getElementById("giftBattleBlueColor").value
    };

    const frame =
        document.querySelector(".giftBattleFrame");

    frame.src =
        "/overlay/gift-battle" +
        "?redName=" + encodeURIComponent(settings.redName) +
        "&blueName=" + encodeURIComponent(settings.blueName) +
        "&redColor=" + settings.redColor.substring(1) +
        "&blueColor=" + settings.blueColor.substring(1);

    return settings;
}
[
    "giftBattleDuration",
    "giftBattleRedName",
    "giftBattleBlueName",
    "giftBattleRedColor",
    "giftBattleBlueColor"
].forEach(id => {

    const element =
        document.getElementById(id);

    if (!element) return;

    element.addEventListener(
        "input",
        applyGiftBattleStyle
    );

});

saveGiftBattleCustomize.onclick = () => {

    const settings = applyGiftBattleStyle();

    const redGifts =
    document.getElementById("giftBattleRedGifts").value
        .split(",")
        .map(gift => gift.trim())
        .filter(gift => gift !== "");

const blueGifts =
    document.getElementById("giftBattleBlueGifts").value
        .split(",")
        .map(gift => gift.trim())
        .filter(gift => gift !== "");

fetch("/gift-battle/gift-teams", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        red: redGifts,
        blue: blueGifts
    })
});

    fetch("/gift-battle/duration", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        duration: Number(settings.duration)
    })
});

settings.redGifts =
    document.getElementById("giftBattleRedGifts").value;

settings.blueGifts =
    document.getElementById("giftBattleBlueGifts").value;

fetch("/gift-battle/settings", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify(settings)
});

    localStorage.setItem(
        "giftBattleStyle",
        JSON.stringify(settings)
    );

    showToast("Gift Battle sauvegardé !");
};

const savedGiftBattleStyle =
    JSON.parse(localStorage.getItem("giftBattleStyle"));

if (savedGiftBattleStyle) {

    document.getElementById("giftBattleRedGifts").value =
    savedGiftBattleStyle.redGifts || "";

document.getElementById("giftBattleBlueGifts").value =
    savedGiftBattleStyle.blueGifts || "";

    document.getElementById("giftBattleDuration").value =
    savedGiftBattleStyle.duration || "300";

    document.getElementById("giftBattleRedName").value =
        savedGiftBattleStyle.redName;

    document.getElementById("giftBattleBlueName").value =
        savedGiftBattleStyle.blueName;

    document.getElementById("giftBattleRedColor").value =
        savedGiftBattleStyle.redColor;

    document.getElementById("giftBattleBlueColor").value =
        savedGiftBattleStyle.blueColor;

    applyGiftBattleStyle();
}


/* VOIX */

voiceButton.onclick = () => {
    voiceEnabled = !voiceEnabled;
    voiceButton.innerText = voiceEnabled ? "Voix ON" : "Voix OFF";

    if (!voiceEnabled) {
        speechSynthesis.cancel();
    }
};

/* START AUTOMATIQUE */

openPanel(startPanel);

/* ALERTES */

function playAlert(sound, image, volume, text) {
    if (sound) {
        const audio = new Audio("/sounds/" + sound);
        audio.volume = Number(volume || 100) / 100;

        audio.play()
    .then(() => {
        console.log("LECTURE OK");
    })
    .catch(error => {
        console.log("ERREUR SON :", error);
    });
    }

    giftAlert.innerHTML = text;
    giftAlert.style.display = "block";

    if (image) {
        giftImage.src = image.startsWith("http")
            ? image
            : "/images/" + image;

        giftImage.style.display = "block";
    }

    setTimeout(() => {
        giftAlert.style.display = "none";
        giftImage.style.display = "none";
    }, 3000);
}

/* CHAT */
/* ==================== TTS : permissions, coût en points, voix spéciales ==================== */

function isTtsUserAllowed(tts, userData) {

    if (tts.allUsers) {
        return true;
    }

    const username =
        String(userData.uniqueId || userData.user || "")
            .replace(/^@/, "")
            .toLowerCase();

    if (tts.followers && (userData.isFollower || userData.isFriend)) {
        return true;
    }

    if (tts.subscribers && userData.isSubscriber) {
        return true;
    }

    if (tts.moderators && userData.isModerator) {
        return true;
    }

    if (tts.topGifters && userData.isTopGifter) {
        return true;
    }

    if (
        tts.team &&
        Array.isArray(tts.teamUsernames) &&
        tts.teamUsernames.includes(username)
    ) {
        return true;
    }

    if (
        tts.whitelist &&
        Array.isArray(tts.whitelistUsernames) &&
        tts.whitelistUsernames.includes(username)
    ) {
        return true;
    }

    const anyToggleOn =
        tts.allUsers || tts.followers || tts.subscribers ||
        tts.moderators || tts.team || tts.topGifters || tts.whitelist;

    /* Réglages jamais sauvegardés (ancienne installation) : ne pas couper le TTS existant */
    if (!anyToggleOn) {
        return true;
    }

    return false;
}

function spendTtsPoints(username, amount) {

    if (!username || amount <= 0) {
        return true;
    }

    const entry = pointsUsers[username];

    if (!entry || (entry.points || 0) < amount) {
        return false;
    }

    entry.points -= amount;

    pointsTransactions.push({
        action: "🔊 Lecture TTS",
        user: username,
        points: "-" + amount,
        description: "Message lu à voix haute",
        countForLevel: "Non",
        manual: "Non",
        date: new Date().toLocaleString("fr-FR")
    });

    localStorage.setItem("pointsTransactions", JSON.stringify(pointsTransactions));
    localStorage.setItem("pointsUsers", JSON.stringify(pointsUsers));

    if (typeof refreshPointsTransactionsTable === "function") {
        refreshPointsTransactionsTable();
    }

    if (typeof refreshPointsUsersTable === "function") {
        refreshPointsUsersTable();
    }

    return true;
}

const TTS_SPECIAL_VOICE_PRESETS = {
    "Voix féminine": { pitch: 1.4, rate: 1 },
    "Voix masculine": { pitch: 0.7, rate: 1 },
    "Voix robot": { pitch: 0.1, rate: 0.9 },
    "Voix drôle": { pitch: 1.8, rate: 1.3 }
};

function getTtsSpecialVoicePreset(tts, userData) {

    if (!Array.isArray(tts.specialUsers)) {
        return null;
    }

    const username =
        String(userData.uniqueId || userData.user || "")
            .replace(/^@/, "")
            .toLowerCase();

    const match =
        tts.specialUsers.find(entry =>
            String(entry.username || "").replace(/^@/, "").toLowerCase() === username
        );

    if (!match) {
        return null;
    }

    return TTS_SPECIAL_VOICE_PRESETS[match.voice] || null;
}

function playTtsMessage(text, userData = {}) {

    if (!appSettings.ttsChat || !appSettings.ttsChat.enabled) {
        return;
    }

    if (!text) {
        return;
    }

    const tts =
        appSettings.ttsChat;

    if (!isTtsUserAllowed(tts, userData)) {
        return;
    }

    const ttsUsername =
        String(userData.uniqueId || userData.user || "")
            .replace(/^@/, "")
            .toLowerCase();

    if (tts.pointsMode === "paid" && tts.messageCost > 0) {

        const paid = spendTtsPoints(ttsUsername, tts.messageCost);

        if (!paid) {
            console.log("TTS ignoré : solde de points insuffisant pour", ttsUsername);
            return;
        }
    }

        console.log("TTS USER DATA :", userData);

        const now =
    Date.now();

const cooldown =
    Number(tts.cooldown || 0) * 1000;

if (
    cooldown > 0 &&
    now - lastTtsTime < cooldown
) {
    return;
}

lastTtsTime = now;

        if (
    tts.maxLength &&
    text.length > tts.maxLength
) {
    return;
}

if (
    tts.filterMentions &&
    text.includes("@")
) {
    return;
}

if (
    tts.filterCommands &&
    (
        text.startsWith("!") ||
        text.startsWith("/") ||
        text.startsWith(".")
    )
) {
    return;
}

        const selectedMode =
    document.querySelector(
        'input[name="ttsCommentMode"]:checked'
    )?.value || "all";

if (
    selectedMode === "dot" &&
    !text.startsWith(".")
) {
    return;
}

if (
    selectedMode === "slash" &&
    !text.startsWith("/")
) {
    return;
}

if (
    selectedMode === "command"
) {

    const command =
        document.getElementById("ttsCommand")?.value || "!tts";

    if (!text.startsWith(command)) {
        return;
    }

}

        if (
    tts.command &&
    text.startsWith(tts.command)
) {
    text =
        text.replace(tts.command, "").trim();
}

if (!text) {
    return;
}

if (
    tts.engine === "openai" &&
    isProUser()
) {

        console.log("OPENAI TTS ACTIF");

    fetch("https://www.tikbabik.shop/tts/openai", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text,
            voice: tts.voice || "alloy",
            volume: tts.volume || 100
        })
    })
    .then(response => response.blob())
    .then(blob => {

        console.log("TTS BLOB SIZE :", blob.size);

        if (blob.size < 1000) {
            alert("Erreur TTS : réponse vide ou erreur API");
            return;
        }

        const url =
            URL.createObjectURL(blob);

        const audio =
            new Audio(url);

        audio.volume =
            Number(tts.volume || 100) / 100;

        audio.play()
            .then(() => {
                console.log("TTS IA JOUÉ OK");
            })
            .catch(error => {
                console.log("ERREUR PLAY TTS IA :", error);
                alert(error.message);
            });

    })
    .catch(error => {
        console.log("ERREUR FETCH TTS IA :", error);
        alert(error.message);
    });

    return;

}

    const speech =
        new SpeechSynthesisUtterance(text);

       const voices =
    speechSynthesis.getVoices();

let selectedVoice = null;

if (tts.randomVoice) {
    selectedVoice =
        voices[Math.floor(Math.random() * voices.length)];
} else {
    selectedVoice =
        voices.find(voice =>
            voice.name === tts.voice
        );
}

if (
    selectedVoice &&
    isProUser()
) {
    speech.voice = selectedVoice;
}

    speech.lang =
        tts.language === "English (US)"
            ? "en-US"
            : "fr-FR";

    speech.volume =
        Number(tts.volume || 100) / 100;

    speech.rate =
        Number(tts.speed || 50) / 50;

    if (isProUser()) {

        const specialPreset =
            getTtsSpecialVoicePreset(tts, userData);

        if (specialPreset) {
            speech.pitch = specialPreset.pitch;
            speech.rate = speech.rate * specialPreset.rate;
        }
    }

    const maxQueue =
    Number(tts.queueLength || 5);

if (
    maxQueue > 0 &&
    ttsQueue.length >= maxQueue
) {
    return;
}

ttsQueue.push({
    speech
});

processTtsQueue();

const ttsLogs =
    document.getElementById("ttsLogs");

if (ttsLogs) {

    const log =
        document.createElement("div");

    log.innerHTML =
        "🔊 " + text;

    ttsLogs.prepend(log);

}
}

// Évite les listeners dupliqués après un rechargement partiel de l'interface.
socket.off("chat");

let lastChatEventKey = "";
let lastChatEventAt = 0;

/* ==================== STATS RÉELLES (page Start) ==================== */

function formatCompactNumber(value) {
    const n = Number(value || 0);

    if (n >= 1000000) {
        return (n / 1000000).toFixed(1) + "M";
    }

    if (n >= 1000) {
        return (n / 1000).toFixed(2) + "K";
    }

    return String(n);
}

let currentLiveStats = {
    connected: false,
    username: "",
    startTime: null,
    likes: 0,
    followers: 0,
    gifts: 0,
    diamonds: 0
};

function renderLiveStats() {

    const s = currentLiveStats;

    const likesEl = document.getElementById("cpMetricLikes");
    const followersEl = document.getElementById("cpMetricFollowers");
    const giftsEl = document.getElementById("cpMetricGifts");
    const diamondsEl = document.getElementById("cpMetricDiamonds");
    const durationEl = document.getElementById("cpMetricDuration");
    const liveStateEl = document.getElementById("cpMetricLiveState");
    const tiktokStatusEl = document.getElementById("cpTikTokStatus");

    if (likesEl) likesEl.textContent = formatCompactNumber(s.likes);
    if (followersEl) followersEl.textContent = formatCompactNumber(s.followers);
    if (giftsEl) giftsEl.textContent = formatCompactNumber(s.gifts);
    if (diamondsEl) diamondsEl.textContent = formatCompactNumber(s.diamonds);

    if (s.connected && s.startTime) {

        const elapsed =
            Math.max(0, Math.floor((Date.now() - s.startTime) / 1000));

        const h = Math.floor(elapsed / 3600);
        const m = Math.floor((elapsed % 3600) / 60);
        const sec = elapsed % 60;

        if (durationEl) {
            durationEl.textContent =
                String(h).padStart(2, "0") + ":" +
                String(m).padStart(2, "0") + ":" +
                String(sec).padStart(2, "0");
        }

        if (liveStateEl) {
            liveStateEl.textContent = "● En direct";
            liveStateEl.classList.remove("warning");
            liveStateEl.classList.add("live");
        }

        if (tiktokStatusEl) {
            tiktokStatusEl.textContent = "Connecté (@" + s.username + ")";
            tiktokStatusEl.classList.remove("warning");
        }

    } else {

        if (durationEl) durationEl.textContent = "00:00:00";

        if (liveStateEl) {
            liveStateEl.textContent = "● Hors ligne";
            liveStateEl.classList.remove("live");
            liveStateEl.classList.add("warning");
        }

        if (tiktokStatusEl) {
            tiktokStatusEl.textContent = "Non connecté";
            tiktokStatusEl.classList.add("warning");
        }

    }

    const heroVisual =
        document.getElementById("cpHeroVisual");

    const liveChatFeed =
        document.getElementById("cpLiveChatFeed");

    if (heroVisual && liveChatFeed) {

        if (s.connected) {
            heroVisual.style.display = "none";
            liveChatFeed.style.display = "flex";
        } else {
            heroVisual.style.display = "";
            liveChatFeed.style.display = "none";
        }

    }

}

fetch("/live-stats")
    .then(response => response.json())
    .then(data => {
        currentLiveStats = data;
        renderLiveStats();
    })
    .catch(() => {});

socket.on("liveStats", data => {
    currentLiveStats = data;
    renderLiveStats();
});

setInterval(renderLiveStats, 1000);

/* ==================== ANNONCE VOCALE D'OBJECTIF ATTEINT ==================== */

function announceGoalMessage(text) {

    if (!text) {
        return;
    }

    const tts =
        appSettings.ttsChat || {};

    const speech =
        new SpeechSynthesisUtterance(text);

    speech.lang =
        tts.language === "English (US)"
            ? "en-US"
            : "fr-FR";

    speech.volume =
        Number(tts.volume || 100) / 100;

    speech.rate =
        Number(tts.speed || 50) / 50;

    ttsQueue.push({ speech });

    processTtsQueue();

}

socket.on("goalReached", data => {

    if (!data || !data.message) {
        return;
    }

    announceGoalMessage(data.message);

});

/* ==================== TIRELIRE ANIMÉE ==================== */

socket.on("coinJarUpdated", () => {

    const frame =
        document.querySelector(".coinJarFrame");

    // L'overlay se met à jour tout seul (polling), rien à faire ici
    // sauf si on veut réagir dans le tableau de bord plus tard.

});

const customizeCoinJar =
    document.getElementById("customizeCoinJar");

const coinJarCustomize =
    document.getElementById("coinJarCustomize");

if (customizeCoinJar && coinJarCustomize) {

    customizeCoinJar.onclick = async () => {

        const isOpening =
            coinJarCustomize.style.display === "none";

        coinJarCustomize.style.display =
            isOpening ? "block" : "none";

        if (isOpening) {

            try {

                const response =
                    await fetch("/coin-jar/settings");

                const s =
                    await response.json();

                document.getElementById("coinJarEnabled").checked = s.enabled !== false;
                document.getElementById("coinJarTarget").value = s.target || 1000;
                document.getElementById("coinJarCelebrationText").value = s.celebrationText || "Tirelire pleine !";
                document.getElementById("coinJarColor").value = s.jarColor || "#22d3ee";
                document.getElementById("coinJarCoinColor").value = s.coinColor || "#ffd700";
                document.getElementById("coinJarRingColor1").value = s.ringColor1 || "#22d3ee";
                document.getElementById("coinJarRingColor2").value = s.ringColor2 || "#a855f7";
                document.getElementById("coinJarRingColor3").value = s.ringColor3 || "#ec4899";
                document.getElementById("coinJarRingSpeed").value = s.ringSpeed || 6;

            } catch (error) {}

        }

    };

}

const saveCoinJar =
    document.getElementById("saveCoinJar");

if (saveCoinJar) {

    saveCoinJar.onclick = async () => {

        const settings = {
            enabled: document.getElementById("coinJarEnabled").checked,
            target: Number(document.getElementById("coinJarTarget").value || 1000),
            celebrationText: document.getElementById("coinJarCelebrationText").value || "Tirelire pleine !",
            jarColor: document.getElementById("coinJarColor").value,
            coinColor: document.getElementById("coinJarCoinColor").value,
            ringColor1: document.getElementById("coinJarRingColor1").value,
            ringColor2: document.getElementById("coinJarRingColor2").value,
            ringColor3: document.getElementById("coinJarRingColor3").value,
            ringSpeed: Number(document.getElementById("coinJarRingSpeed").value || 6)
        };

        await fetch("/coin-jar/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settings)
        });

        const frame =
            document.querySelector(".coinJarFrame");

        if (frame) {
            frame.src = "/overlay/coin-jar?t=" + Date.now();
        }

        showToast("Tirelire sauvegardée !");

    };

}

const resetCoinJar =
    document.getElementById("resetCoinJar");

if (resetCoinJar) {

    resetCoinJar.onclick = async () => {

        if (!confirm("Vider la tirelire ?")) {
            return;
        }

        await fetch("/coin-jar/reset", { method: "POST" });

        const frame =
            document.querySelector(".coinJarFrame");

        if (frame) {
            frame.src = "/overlay/coin-jar?t=" + Date.now();
        }

    };

}

/* Bascule des onglets internes (Objectif / Annonce vocale) */
document.querySelectorAll(".goalSubTabBtn").forEach(btn => {

    btn.onclick = () => {

        const targetId =
            btn.getAttribute("data-goal-tab");

        const targetContent =
            document.getElementById(targetId);

        if (!targetContent) {
            return;
        }

        const tabGroup =
            btn.closest(".goalSubTabs");

        tabGroup.querySelectorAll(".goalSubTabBtn").forEach(b => {
            b.classList.remove("active");
        });

        btn.classList.add("active");

        let sibling =
            tabGroup.nextElementSibling;

        while (sibling && sibling.classList.contains("goalSubTabContent")) {
            sibling.style.display = "none";
            sibling = sibling.nextElementSibling;
        }

        targetContent.style.display = "block";

    };

});

socket.on("chat", data => {
    const user = String(data?.user || "");
    const message = String(data?.message || "");
    const eventKey = user + "|" + message;
    const now = Date.now();

    // Certains reconnects TikTok peuvent renvoyer le même message deux fois.
    if (eventKey === lastChatEventKey && now - lastChatEventAt < 2000) {
        console.log("CHAT DUPLIQUÉ IGNORÉ :", eventKey);
        return;
    }

    lastChatEventKey = eventKey;
    lastChatEventAt = now;

    const div = document.createElement("div");
    div.className = "message";
    div.innerHTML = `<strong>${user}</strong> : ${message}`;
    messages.prepend(div);

    const liveChatMessages =
        document.getElementById("cpLiveChatMessages");

    if (liveChatMessages) {

        const feedMsg =
            document.createElement("div");

        feedMsg.className = "cpLiveChatMsg";
        feedMsg.innerHTML = `<b>${user}</b>${message}`;

        liveChatMessages.appendChild(feedMsg);

        while (liveChatMessages.children.length > 8) {
            liveChatMessages.removeChild(liveChatMessages.firstChild);
        }

    }

    playTtsMessage(message, data);
});

/* CADEAUX */

socket.on("gift", data => {
    const div = document.createElement("div");
    div.className = "message";
    div.innerHTML = `🎁 <strong>${data.user}</strong> a envoyé : ${data.gift}`;
    messages.prepend(div);

    const diamonds = Number(data.diamonds || 0);

    const username =
    data.user || "Utilisateur";

const now =
    new Date().toLocaleString("fr-FR");

if (!pointsUsers[username]) {
    pointsUsers[username] = {
        username: username,
        points: 0,
        level: 1,
        lastGift: "-",
        lastGiftDate: "-"
    };
}

pointsUsers[username].points += diamonds;

pointsUsers[username].level =
    Math.floor(pointsUsers[username].points / 100) + 1;

pointsUsers[username].lastGift =
    data.gift || "-";

pointsUsers[username].lastGiftDate =
    now;

    pointsTransactions.push({

    action: "🎁 Cadeau",

    user: username,

    points: "+" + diamonds,

    description:
        (data.gift || "Cadeau") +
        (data.repeatCount
            ? " x" + data.repeatCount
            : ""),

    countForLevel: "Oui",

    manual: "Non",

    date:
        new Date().toLocaleString("fr-FR")

});

refreshPointsTransactionsTable();

localStorage.setItem(
    "pointsTransactions",
    JSON.stringify(pointsTransactions)
);

refreshPointsUsersTable();

localStorage.setItem(
    "pointsUsers",
    JSON.stringify(pointsUsers)
);

    if (!topGifters[data.user]) {
        topGifters[data.user] = 0;
    }

    topGifters[data.user] += diamonds;

    giftHistory.unshift({
        user: data.user,
        gift: data.gift,
        diamonds: diamonds,
        image: data.giftImage || ""
    });

    if (giftHistory.length > 50) {
        giftHistory.pop();
    }

    refreshStatsDisplay();
    saveStats();

    playAlert(
        "",
        data.giftImage || "",
        100,
        `🎁 ${data.user} a envoyé ${data.gift}`
    );
});

socket.on("play-sound-alert", data => {

    console.log("SON REÇU CÔTÉ APP :", data);

    if (!data.sound) {
        return;
    }

    const audio =
        new Audio("/sounds/" + data.sound);

    audio.volume =
        Number(data.volume || 100) / 100;

    audio.play().catch(error => {
        console.log("Erreur lecture alerte sonore :", error);
    });

});

let currentLikesGoalCount = 0;

socket.on("like", data => {

    currentLikesGoalCount =
        Number(data.totalLikes || data.likes || 0);

    likeCounter.innerHTML =
        `❤️ Likes : ${currentLikesGoalCount}`;

    updateLikesGoalPreview();

});

socket.on("follow", data => {
    playAlert(
        "",
        "",
        100,
        `⭐ ${data.user} vient de suivre !`
    );
});

socket.on("share", data => {
    playAlert(
        "",
        "",
        100,
        `🔗 ${data.user || "Quelqu'un"} a partagé le live !`
    );
});

/* ACTIONS */

function createGiftRuleRow(
    actionName = "Nouvelle action",
    sound = "",
    duration = 5,
    description = "",
    type = "Son",
    keyShortcut = ""
) {
    
    const body = document.getElementById("giftRulesBody");
    const row = document.createElement("tr");

    row.innerHTML = `
        <td><button class="smallButton testRule">▶</button></td>
        <td><button class="smallButton editRule">✏️</button></td>
        <td><button class="smallButton duplicateRule">📄</button></td>
        <td><button class="smallButton deleteRule">🗑️</button></td>

        <td>
            <input class="ruleGift ruleInput" value="${actionName}">
        </td>

        <td>
    <select class="ruleType ruleInput">
        <option>Son</option>
        <option>Image</option>
        <option>Son + Image</option>
        <option>Streamer.bot</option>
        <option>OBS</option>
        <option>Commande</option>
    </select>
</td>

<td>
    <input
        class="ruleDuration ruleInput"
        type="number"
        value="${duration}"
        min="1"
    >
</td>

        <td>
            <input class="ruleSoundFile" type="file" accept="audio/*">
            <div class="soundName" data-filename="${sound}">${sound}</div>
        </td>

        <td>
            <input class="ruleDescription ruleInput" value="${description}">
        </td>
        <td>
    <div class="keyShortcutBox">

    <button class="selectKeyButton">
        Select Keystroke
    </button>

    <div class="selectedKey">
        ${keyShortcut || "Aucune"}
    </div>

</div>
</td>
    `;

    const typeSelect =
    row.querySelector(".ruleType");

if (typeSelect) {
    typeSelect.value = type;
}



    body.appendChild(row);

    const soundInput = row.querySelector(".ruleSoundFile");
    const soundName = row.querySelector(".soundName");
    const testButton = row.querySelector(".testRule");
    const editButton = row.querySelector(".editRule");
    const duplicateButton = row.querySelector(".duplicateRule");
    const deleteButton = row.querySelector(".deleteRule");
    const keyButton =
    row.querySelector(".selectKeyButton");

const keyLabel =
    row.querySelector(".selectedKey");

if (keyButton) {
    keyButton.onclick = () => {

    openPanel(settingsPanel);

    actionsContent.style.display = "block";
    eventsContent.style.display = "none";

    actionsTab.classList.add("active");
    eventsTab.classList.remove("active");

    document.body.appendChild(keySelectorPanel);

    currentKeyLabel =
        keyLabel;

    selectedKeyValue =
        "";

    if (keyCtrl) keyCtrl.checked = false;
    if (keyAlt) keyAlt.checked = false;
    if (keyShift) keyShift.checked = false;

    updateKeyPreview();

    keySelectorPanel.style.display = "block";
    keySelectorPanel.style.visibility = "visible";
    keySelectorPanel.style.opacity = "1";

};
}

    soundInput.onchange = () => {
        const file = soundInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        fetch("/upload", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(result => {
            soundName.innerText = result.filename;
            soundName.dataset.filename = result.filename;
        });
    };

    testButton.onclick = () => {
        const name = row.querySelector(".ruleGift").value;
        const soundFile = soundName.dataset.filename;

        playAlert(
            soundFile,
            "",
            100,
            `▶ Test Action : ${name}`
        );
    };

    editButton.onclick = () => {
        const nameInput = row.querySelector(".ruleGift");
        nameInput.focus();
        nameInput.select();
    };

    duplicateButton.onclick = () => {
        const name = row.querySelector(".ruleGift").value;
        const durationValue = row.querySelector(".ruleDuration").value;
        const descriptionValue = row.querySelector(".ruleDescription").value;
        const soundFile = soundName.dataset.filename || "";

        createGiftRuleRow(
            name + " copie",
            soundFile,
            durationValue,
            descriptionValue
        );
    };

    deleteButton.onclick = () => {
        row.remove();
        refreshEventActionSelects();
    };
}

let currentKeyLabel = null;
let selectedKeyValue = "";

const keySelectorPanel = document.getElementById("keySelectorPanel");
if (keySelectorPanel) {
    keySelectorPanel.style.display = "none";
}
const closeKeySelector = document.getElementById("closeKeySelector");
const keyButtons = document.getElementById("keyButtons");
const keyPreview = document.getElementById("keyPreview");
const saveKeySelection = document.getElementById("saveKeySelection");
const keyCtrl = document.getElementById("keyCtrl");
const keyAlt = document.getElementById("keyAlt");
const keyShift = document.getElementById("keyShift");

const availableKeys = [
    "ESC","F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12",

    "²","1","2","3","4","5","6","7","8","9","0","-","=","BACKSPACE",

    "TAB","A","Z","E","R","T","Y","U","I","O","P","[","]","ENTER",

    "CAPSLOCK","Q","S","D","F","G","H","J","K","L","M",";","'","\\",

    "SHIFT","W","X","C","V","B","N",",",".","/","SHIFT",

    "CTRL","WIN","ALT","SPACE","ALTGR","MENU","CTRL",

    "INSERT","HOME","PAGEUP",
    "DELETE","END","PAGEDOWN",

    "UP",
    "LEFT","DOWN","RIGHT",

    "NUMLOCK","NUM7","NUM8","NUM9","NUM/",
    "NUM4","NUM5","NUM6","NUM*",
    "NUM1","NUM2","NUM3","NUM-",
    "NUM0","NUM.","NUM+"
];

function updateKeyPreview() {
    let value = "";

    if (keyCtrl && keyCtrl.checked) value += "^";
    if (keyAlt && keyAlt.checked) value += "%";
    if (keyShift && keyShift.checked) value += "+";

    if (selectedKeyValue) {
        value += "{" + selectedKeyValue + "}";
    }

    if (keyPreview) {
        keyPreview.innerHTML = value || "{}";
    }
}

if (keyButtons && keyButtons.children.length === 0) {
    availableKeys.forEach(key => {
        const button = document.createElement("button");

        button.className = "keyChoice";
        button.innerHTML = key;

        button.onclick = () => {
            selectedKeyValue = key;
            updateKeyPreview();
        };

        keyButtons.appendChild(button);
    });
}

[keyCtrl, keyAlt, keyShift].forEach(input => {
    if (input) {
        input.onchange = updateKeyPreview;
    }
});

if (closeKeySelector && keySelectorPanel) {
    closeKeySelector.onclick = () => {
        keySelectorPanel.style.display = "none";
    };
}

if (saveKeySelection && keySelectorPanel) {
    saveKeySelection.onclick = () => {
        if (currentKeyLabel) {
            currentKeyLabel.innerHTML =
                keyPreview.innerHTML;
        }

        keySelectorPanel.style.display = "none";
    };
}
addGiftRule.onclick = () => {

    if (!isProUser()) {

        const count =
            document.querySelectorAll("#giftRulesBody tr").length;

        if (count >= 2) {
            alert("Version gratuite : 2 actions maximum");
            return;
        }

    }

    createGiftRuleRow();

};


/* ÉVÉNEMENTS */

function getActionNames() {
    const rows = document.querySelectorAll("#giftRulesBody tr");
    const actions = [];

    rows.forEach(row => {
        const input = row.querySelector(".ruleGift");
        if (!input) return;

        const name = input.value.trim();

        if (name) {
            actions.push(name);
        }
    });

    return actions;
}

function refreshEventActionSelects() {
    const selects = document.querySelectorAll(".actionSelect");
    const actions = getActionNames();

    selects.forEach(select => {
        const currentValue = select.value;

        select.innerHTML = `<option>Aucune action</option>`;

        actions.forEach(actionName => {
            const option = document.createElement("option");
            option.value = actionName;
            option.innerText = actionName;
            select.appendChild(option);
        });

        select.value = currentValue;
    });
}

function createEventRow(
    user = "Any",
    trigger = "Gift",
    value = "",
    action = "Aucune action"
) {
    const row = document.createElement("tr");

    row.innerHTML = `
    <td>
        <button class="smallButton editEvent">✏️</button>
    </td>

    <td>
        <input class="eventEnabled" type="checkbox" checked>
    </td>

    <td>
        <input
            class="eventUser ruleInput"
            value="${user}"
        >
    </td>

    <td>
        <select class="eventTrigger ruleInput">
            <option>Gift</option>
            <option>Follow</option>
            <option>Share</option>
            <option>Like</option>
            <option>Chat</option>
        </select>
    </td>

    <td>

    <div class="giftDropdown eventGiftDropdown">

        <div class="giftSelected">
            ${value || "Choisir un cadeau TikTok..."}
        </div>

        <div class="giftOptions eventGiftOptions">
        </div>
   
 </div>
    <td>
        <select class="ruleInput actionSelect">
            <option>Aucune action</option>
        </select>
    </td>

    <td>
        <button class="smallButton deleteEvent">🗑️</button>
    </td>
`;

    eventsBody.appendChild(row);

const triggerSelect =
    row.querySelector(".eventTrigger").value = trigger;

    const giftDropdown =
    row.querySelector(".eventGiftDropdown");

const giftSelected =
    row.querySelector(".giftSelected");

const giftOptions =
    row.querySelector(".eventGiftOptions");

    giftSelected.onclick = () => {
        openGiftDropdown(giftSelected, giftOptions);
    };

    fetch("/giftLibrary.json?t=" + Date.now())
    .then(response => response.json())
    .then(gifts => {

        console.log("CADEAUX EVENTS :", gifts.length, gifts);

        gifts.forEach(gift => {

            const option =
                document.createElement("div");

            option.className =
                "giftOption";

            option.innerHTML = `
                <img src="${gift.image}">
                <span>
                    ${gift.name}
                    (${gift.diamonds || 0}🪙)
                </span>
            `;

            option.onclick = () => {

                giftSelected.innerHTML = `
                    <img src="${gift.image}">
                    <span>
                        ${gift.name}
                        (${gift.diamonds || 0}🪙)
                    </span>
                `;

                giftSelected.dataset.gift =
                    gift.name;

                giftOptions.style.display =
                    "none";
            };

            giftOptions.appendChild(option);

        });

    });

    

if (giftDropdown) {

    giftDropdown.style.display =
        trigger === "Gift"
            ? "block"
            : "none";

}

    const actionSelect = row.querySelector(".actionSelect");

    getActionNames().forEach(actionName => {
        const option = document.createElement("option");
        option.value = actionName;
        option.innerText = actionName;
        actionSelect.appendChild(option);
    });

    actionSelect.value = action;

    row.querySelector(".deleteEvent").onclick = () => {
        row.remove();
    };
}

addEventRule.onclick = () => {

    if (!isProUser()) {

        const count =
            document.querySelectorAll("#eventsBody tr").length;

        if (count >= 2) {
            alert("Version gratuite : 2 événements maximum");
            return;
        }

    }

    createEventRow();

};

/* SAUVEGARDE */

saveSettings.onclick = () => {
    const actionRows = document.querySelectorAll("#giftRulesBody tr");
    const eventRows = document.querySelectorAll("#eventsBody tr");

    const actions = [];
    const events = [];
    const soundAlerts = [];

    actionRows.forEach(row => {
        const name = row.querySelector(".ruleGift")?.value.trim();
        const type =
    row.querySelector(".ruleType")?.value || "Son";
        const duration = Number(row.querySelector(".ruleDuration")?.value || 5);
        const sound = row.querySelector(".soundName")?.dataset.filename || "";
        const description = row.querySelector(".ruleDescription")?.value || "";
        const keyShortcut =
    row.querySelector(".selectedKey")?.innerText.trim() || "";
        if (!name) return;

    actions.push({
    name,
    type,
    duration,
    sound,
    description,
    keyShortcut
});
    });

    eventRows.forEach(row => {
        const user = row.querySelector(".eventUser")?.value || "Any";
        const trigger = row.querySelector(".eventTrigger")?.value || "Gift";
const value =
    row.querySelector(".giftSelected")?.dataset.gift ||
    row.querySelector(".eventValue")?.value ||
    "";        const action = row.querySelector(".actionSelect")?.value || "Aucune action";
        const enabled = row.querySelector(".eventEnabled")?.checked || false;

        events.push({
    user,
    trigger,
    value,
    action,
    enabled
});
    });
    document.querySelectorAll("#soundAlertsBody tr").forEach(row => {

    soundAlerts.push({
        enabled:
            row.querySelector(".soundEnabled")?.checked || false,

        trigger:
            row.querySelector(".soundTriggerSelect")?.value || "Any Gift",

        gift:
    row.querySelector(".giftSelected")?.dataset.gift || "",    

        sound:
            row.querySelector(".soundFileName")?.dataset.filename ||
            row.querySelector(".soundFileName")?.innerText ||
            "",

        keyShortcut:
    row.querySelector(".selectedKey")?.innerText.trim() || "",

        volume:
            Number(row.querySelector(".soundVolumeSlider")?.value || 100)
    });

});

    appSettings.actions = actions;
    appSettings.actionEvents = events;
    appSettings.soundAlerts = soundAlerts;

    appSettings.webcamSimple = {
    color:
        document.getElementById("webcamSimpleColor")?.value || "#35cfff",

    border:
        Number(document.getElementById("webcamSimpleBorder")?.value || 6),

    radius:
        Number(document.getElementById("webcamSimpleRadius")?.value || 12),

    glow:
        document.getElementById("webcamSimpleGlow")?.checked || false,

    futuristic:
        document.getElementById("webcamSimpleFuturistic")?.checked || false
};

console.log("ENVOI SETTINGS :", appSettings);

fetch("/settings", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify(appSettings)
})
.then(response => response.json())
.then(() => {
    showToast("Paramètres sauvegardés !");
});

};

/* STATS */

resetStats.onclick = () => {
    if (!confirm("Remettre les statistiques à zéro ?")) {
        return;
    }

    topGifters = {};
    giftHistory = [];

    refreshStatsDisplay();
    saveStats();
};

function refreshStatsDisplay() {
    const ranking = Object.entries(topGifters)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    topGiftersList.innerHTML = "";

    ranking.forEach(([user, total]) => {
        const li = document.createElement("li");
        li.innerHTML = `${user} - ${total} 🪙`;
        topGiftersList.appendChild(li);
    });

    giftHistoryList.innerHTML = "";

    giftHistory.forEach(item => {
        const div = document.createElement("div");
        div.className = "giftHistoryItem";

        div.innerHTML = `
            ${
                item.image
                ? `<img src="${item.image}" class="giftHistoryImage">`
                : ""
            }

            <span>
                🎁 ${item.user} → ${item.gift}
                (+${item.diamonds} 🪙)
            </span>
        `;

        giftHistoryList.appendChild(div);
    });
}

function saveStats() {
    fetch("/stats", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            topGifters,
            giftHistory
        })
    });
}

/* CHARGEMENT */

const saveSoundAlerts =
    document.getElementById("saveSoundAlerts");

if (saveSoundAlerts) {

    saveSoundAlerts.onclick = () => {

        saveSettings.click();

    };

}

fetch("/settings")
.then(response => response.json())
.then(settings => {

    appSettings = settings;

    populateChatBotPanel();

    const savedUserAtStart =
    JSON.parse(localStorage.getItem("tikbabikUser") || "null");

if (!savedUserAtStart || !savedUserAtStart.email) {
    appSettings.pro = false;
}

    if (appSettings.banner) {

    document.getElementById("bannerText").value =
        appSettings.banner.text || "";

    document.getElementById("bannerSpeed").value =
        appSettings.banner.speed || 20;

    document.getElementById("bannerTextColor").value =
        appSettings.banner.textColor || "#ffffff";

    document.getElementById("bannerBgColor").value =
        appSettings.banner.bgColor || "#ff0050";

    updateBannerPreview();

}

    if (appSettings.followGoal) {

    document.getElementById("followGoalText").value =
        appSettings.followGoal.text || "";

    document.getElementById("followGoalTarget").value =
        appSettings.followGoal.target || 100;

    document.getElementById("followGoalShowProgress").checked =
        appSettings.followGoal.showProgress !== false;

    document.getElementById("followGoalFont").value =
        appSettings.followGoal.font || "Pacifico";

    document.getElementById("followGoalFontSize").value =
        appSettings.followGoal.fontSize || 28;

    document.getElementById("followGoalLetterSpacing").value =
        appSettings.followGoal.letterSpacing || 2;

    document.getElementById("followGoalTextColor").value =
        appSettings.followGoal.textColor || "#00ff22";

    document.getElementById("followGoalProgressColor").value =
        appSettings.followGoal.progressColor || "#ea00ff";

    document.getElementById("followGoalRemainingColor").value =
        appSettings.followGoal.remainingColor || "#010300";

    document.getElementById("followGoalBarColor").value =
        appSettings.followGoal.barColor || "#baff4a";

    document.getElementById("followGoalVariation").value =
        appSettings.followGoal.variation || "Clean Néon";

    document.getElementById("followGoalAnnounceEnabled").checked =
        appSettings.followGoal.announceEnabled || false;

    document.getElementById("followGoalAnnounceMessage").value =
        appSettings.followGoal.announceMessage || "Objectif d'abonnés atteint ! Merci à tous !";

    updateFollowGoalPreview();
}

    if (appSettings.likesGoal) {

    document.getElementById("likesGoalText").value =
        appSettings.likesGoal.text || "";

    document.getElementById("likesGoalTarget").value =
        appSettings.likesGoal.target || 10000;

     document.getElementById("likesGoalProgressColor").value =
    appSettings.likesGoal.progressColor || "#ea00ff";

document.getElementById("likesGoalRemainingColor").value =
    appSettings.likesGoal.remainingColor || "#010300";

document.getElementById("likesGoalBarColor").value =
    appSettings.likesGoal.barColor || "#baff4a";   

    document.getElementById("likesGoalShowProgress").checked =
        appSettings.likesGoal.showProgress !== false;

    document.getElementById("likesGoalFont").value =
        appSettings.likesGoal.font || "Arial";

    document.getElementById("likesGoalFontSize").value =
        appSettings.likesGoal.fontSize || 28;

    document.getElementById("likesGoalLetterSpacing").value =
        appSettings.likesGoal.letterSpacing || 2;

    document.getElementById("likesGoalTextColor").value =
        appSettings.likesGoal.textColor || "#00ff22";

    document.getElementById("likesGoalVariation").value =
        appSettings.likesGoal.variation || "Clean Néon";

    document.getElementById("likesGoalAnnounceEnabled").checked =
        appSettings.likesGoal.announceEnabled || false;

    document.getElementById("likesGoalAnnounceMessage").value =
        appSettings.likesGoal.announceMessage || "Objectif de likes atteint ! Merci à tous !";

    updateLikesGoalPreview();
}

    if (appSettings.diamondsGoal) {

    document.getElementById("diamondsGoalText").value =
        appSettings.diamondsGoal.text || "Objectif Diamants";

    document.getElementById("diamondsGoalTarget").value =
        appSettings.diamondsGoal.target || 1000;

    document.getElementById("diamondsGoalShowProgress").checked =
        appSettings.diamondsGoal.showProgress !== false;

    document.getElementById("diamondsGoalIcon").value =
        appSettings.diamondsGoal.icon || "💎";

    document.getElementById("diamondsGoalFont").value =
        appSettings.diamondsGoal.font || "Orbitron";

    document.getElementById("diamondsGoalFontSize").value =
        appSettings.diamondsGoal.fontSize || 22;

    document.getElementById("diamondsGoalTextColor").value =
        appSettings.diamondsGoal.textColor || "#f5f7ff";

    document.getElementById("diamondsGoalProgressColor").value =
        appSettings.diamondsGoal.progressColor || "#22d3ee";

    document.getElementById("diamondsGoalRingColor1").value =
        appSettings.diamondsGoal.ringColor1 || "#22d3ee";

    document.getElementById("diamondsGoalRingColor2").value =
        appSettings.diamondsGoal.ringColor2 || "#a855f7";

    document.getElementById("diamondsGoalRingColor3").value =
        appSettings.diamondsGoal.ringColor3 || "#ec4899";

    document.getElementById("diamondsGoalRingSpeed").value =
        appSettings.diamondsGoal.ringSpeed || 6;

    document.getElementById("diamondsGoalAnnounceEnabled").checked =
        appSettings.diamondsGoal.announceEnabled || false;

    document.getElementById("diamondsGoalAnnounceMessage").value =
        appSettings.diamondsGoal.announceMessage || "Objectif de diamants atteint ! Merci à tous !";

}

    if (appSettings.webcamCustom) {

    document.getElementById("webcamCustomStyle").value =
        appSettings.webcamCustom.style || "neon";

    updateWebcamCustomFrame();

}

if (appSettings.webcamSimple) {

    document.getElementById("webcamSimpleColor").value =
        appSettings.webcamSimple.color || "#35cfff";

    document.getElementById("webcamSimpleBorder").value =
        appSettings.webcamSimple.border || 6;

    document.getElementById("webcamSimpleRadius").value =
        appSettings.webcamSimple.radius || 12;

    document.getElementById("webcamSimpleGlow").checked =
        appSettings.webcamSimple.glow !== false;

    updateWebcamSimpleFrame();

}
    console.log("SETTINGS CHARGÉS :", appSettings);

    if (appSettings.ttsChat) {

    const tts =
        appSettings.ttsChat;

        if (document.getElementById("ttsEngine"))
    document.getElementById("ttsEngine").value =
        tts.engine || "windows";
        loadAvailableTtsVoices();
       

    if (document.getElementById("ttsEnabled"))
        document.getElementById("ttsEnabled").checked =
            tts.enabled;

    if (document.getElementById("ttsLanguage"))
        document.getElementById("ttsLanguage").value =
            tts.language;

    if (document.getElementById("ttsVoice"))
        document.getElementById("ttsVoice").value =
            tts.voice;

    if (document.getElementById("ttsRandomVoice"))
        document.getElementById("ttsRandomVoice").checked =
            tts.randomVoice;

    if (document.getElementById("ttsSpeed"))
        document.getElementById("ttsSpeed").value =
            tts.speed;

    if (document.getElementById("ttsVolume"))
        document.getElementById("ttsVolume").value =
            tts.volume;

            if (
    tts.specialUsers &&
    Array.isArray(tts.specialUsers)
) {

    const list =
        document.getElementById("ttsSpecialUsersList");

    list.innerHTML = "";

    tts.specialUsers.forEach(user => {

        const item =
            document.createElement("div");

        item.dataset.username =
            user.username;

        item.dataset.voice =
            user.voice;

        item.innerHTML =
            user.username +
            " → " +
            user.voice +
            " <button>🗑</button>";

        item.querySelector("button").onclick = () => {
            item.remove();
        };

        list.appendChild(item);

        

    });

}

}

    updateProLocks();

    if (appSettings.actions) {
        appSettings.actions.forEach(action => {
            createGiftRuleRow(
    action.name,
    action.sound || "",
    action.duration || 5,
    action.description || "",
    action.type || "Son",
    action.keyShortcut || ""
);
if (appSettings.ttsChat) {

    const tts =
        appSettings.ttsChat;

    document.getElementById("ttsEnabled").checked =
        tts.enabled;

    document.getElementById("ttsLanguage").value =
        tts.language;

    document.getElementById("ttsVoice").value =
        tts.voice;

    document.getElementById("ttsRandomVoice").checked =
        tts.randomVoice;

    document.getElementById("ttsSpeed").value =
        tts.speed;

    document.getElementById("ttsVolume").value =
        tts.volume;

    document.getElementById("ttsAllUsers").checked =
        tts.allUsers;

    document.getElementById("ttsFollowers").checked =
        tts.followers;

    document.getElementById("ttsSubscribers").checked =
        tts.subscribers;

    document.getElementById("ttsModerators").checked =
        tts.moderators;

    document.getElementById("ttsTeam").checked =
        tts.team;

    document.getElementById("ttsTeamUsernames").value =
        (tts.teamUsernames || []).join(", ");

    document.getElementById("ttsTopGifters").checked =
        tts.topGifters;

    document.getElementById("ttsWhitelist").checked =
        tts.whitelist;

    document.getElementById("ttsWhitelistUsernames").value =
        (tts.whitelistUsernames || []).join(", ");

    const ttsPointsModeInput =
        document.querySelector('input[name="ttsPointsMode"][value="' + (tts.pointsMode || "free") + '"]');

    if (ttsPointsModeInput) {
        ttsPointsModeInput.checked = true;
    }

    document.getElementById("ttsCommand").value =
        tts.command;

    document.getElementById("ttsMessageCost").value =
        tts.messageCost;

    document.getElementById("ttsCooldown").value =
        tts.cooldown;

    document.getElementById("ttsQueueLength").value =
        tts.queueLength;

    document.getElementById("ttsMaxLength").value =
        tts.maxLength;

    document.getElementById("ttsFilterSpam").checked =
        tts.filterSpam;

    document.getElementById("ttsFilterMentions").checked =
        tts.filterMentions;

    document.getElementById("ttsFilterCommands").checked =
        tts.filterCommands;

}
        });
    }

    if (appSettings.actionEvents) {
        appSettings.actionEvents.forEach(event => {
            createEventRow(
    event.user,
    event.trigger,
    event.value || "",
    event.action
);
        });
    }
    if (appSettings.soundAlerts) {
    appSettings.soundAlerts.forEach(alert => {
        addSoundAlertRow(alert);
    });
}

updateProLocks();

if (typeof applyProDisplay === "function") {
    applyProDisplay();
}

});

fetch("/stats")
.then(response => response.json())
.then(stats => {
    topGifters = stats.topGifters || {};
    giftHistory = stats.giftHistory || [];

    refreshStatsDisplay();
});

if (openGiftGalleryButton) {

    openGiftBattleGiftPicker.onclick = async () => {

    giftBattleGiftPicker.style.display =
        giftBattleGiftPicker.style.display === "none"
            ? "block"
            : "none";

    const list =
        document.getElementById("giftBattleGiftList");

    list.innerHTML = "Chargement...";

    const response =
    await fetch("/giftLibrary.json");

    const gifts =
        await response.json();

    list.innerHTML = "";

    gifts.forEach(gift => {

        const card =
            document.createElement("div");

        const giftName =
            gift.name || gift.giftName || "Sans nom";

        const giftImage =
            gift.image || gift.giftPictureUrl || "";

        card.className = "giftPickCard";

        card.innerHTML =
            "<img src='" + giftImage + "' style='width:50px;height:50px;object-fit:contain;'>" +
            "<br>" +
            giftName +
            "<br>" +
            "<button class='pickRed'>🔴 Team 1</button> " +
            "<button class='pickBlue'>🔵 Team 2</button>";

        card.querySelector(".pickRed").onclick = () => {

            document.getElementById("giftBattleRedGifts").value +=
                giftName + ", ";

        };

        card.querySelector(".pickBlue").onclick = () => {

            document.getElementById("giftBattleBlueGifts").value +=
                giftName + ", ";

        };

        list.appendChild(card);

    });

};

}

function showPanel(panelId) {
    document.querySelectorAll(".mainPanel").forEach(panel => {
        panel.classList.remove("active");
    });

    document.getElementById(panelId).classList.add("active");
}

function saveAppSettings(message = "Paramètres sauvegardés !") {
    fetch("/settings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(appSettings)
    })
    .then(response => response.json())
    .then(() => {
        alert(message);
    })
    .catch(error => {
        console.log("Erreur sauvegarde :", error);
        showToast("Erreur pendant la sauvegarde");
    });
}

/* ==================== CHATBOT ==================== */

function getChatBotDefaults() {
    return {
        enabled: true,
        prefix: "!",
        cooldownSeconds: 8,
        commands: {
            roue: { enabled: true },
            points: { enabled: true },
            objectif: { enabled: true }
        }
    };
}

function renderChatBotCustomCommands() {

    const list = document.getElementById("chatBotCustomCommandsList");

    if (!list) {
        return;
    }

    const cb = appSettings.chatBot || getChatBotDefaults();
    const builtins = ["roue", "points", "objectif"];

    const customEntries =
        Object.entries(cb.commands || {})
            .filter(([word]) => !builtins.includes(word));

    if (customEntries.length === 0) {
        list.innerHTML = "<p style=\"opacity:.6;\">Aucune commande personnalisée pour l'instant.</p>";
        return;
    }

    list.innerHTML = customEntries.map(([word, conf]) => {
        return "<div class=\"chatBotCustomRow\" data-word=\"" + word + "\">" +
            "<b>!" + word + "</b> → " + (conf.actionName || "?") +
            " <button type=\"button\" class=\"chatBotRemoveCommand\" data-word=\"" + word + "\">✕</button>" +
            "</div>";
    }).join("");

    list.querySelectorAll(".chatBotRemoveCommand").forEach(btn => {
        btn.onclick = () => {
            const word = btn.getAttribute("data-word");
            if (appSettings.chatBot && appSettings.chatBot.commands) {
                delete appSettings.chatBot.commands[word];
            }
            renderChatBotCustomCommands();
        };
    });
}

function populateChatBotActionSelect() {

    const select = document.getElementById("chatBotNewCommandAction");

    if (!select) {
        return;
    }

    const actionNames = (appSettings.actions || []).map(a => a.name);

    select.innerHTML = actionNames.length
        ? actionNames.map(name => "<option value=\"" + name + "\">" + name + "</option>").join("")
        : "<option value=\"\">Aucune action disponible</option>";
}

function populateChatBotPanel() {

    if (!appSettings.chatBot) {
        appSettings.chatBot = getChatBotDefaults();
    }

    const cb = appSettings.chatBot;

    const enabledEl = document.getElementById("chatBotEnabled");
    const prefixEl = document.getElementById("chatBotPrefix");
    const cooldownEl = document.getElementById("chatBotCooldown");
    const roueEl = document.getElementById("chatBotCmdRoue");
    const pointsEl = document.getElementById("chatBotCmdPoints");
    const objectifEl = document.getElementById("chatBotCmdObjectif");

    if (enabledEl) enabledEl.checked = cb.enabled !== false;
    if (prefixEl) prefixEl.value = cb.prefix || "!";
    if (cooldownEl) cooldownEl.value = cb.cooldownSeconds || 8;
    if (roueEl) roueEl.checked = !!(cb.commands && cb.commands.roue && cb.commands.roue.enabled !== false);
    if (pointsEl) pointsEl.checked = !!(cb.commands && cb.commands.points && cb.commands.points.enabled !== false);
    if (objectifEl) objectifEl.checked = !!(cb.commands && cb.commands.objectif && cb.commands.objectif.enabled !== false);

    populateChatBotActionSelect();
    renderChatBotCustomCommands();
}

const chatBotAddCommandBtn = document.getElementById("chatBotAddCommand");

if (chatBotAddCommandBtn) {

    chatBotAddCommandBtn.onclick = () => {

        const wordInput = document.getElementById("chatBotNewCommandWord");
        const actionSelect = document.getElementById("chatBotNewCommandAction");

        const word = (wordInput.value || "").trim().toLowerCase().replace(/\s+/g, "");
        const actionName = actionSelect.value;

        if (!word) {
            alert("Indique un mot-clé pour la commande.");
            return;
        }

        if (["roue", "points", "objectif"].includes(word)) {
            alert("Ce mot-clé est déjà une commande intégrée.");
            return;
        }

        if (!actionName) {
            alert("Crée d'abord une action dans Alert Studio / Actions.");
            return;
        }

        if (!appSettings.chatBot) {
            appSettings.chatBot = getChatBotDefaults();
        }
        if (!appSettings.chatBot.commands) {
            appSettings.chatBot.commands = {};
        }

        appSettings.chatBot.commands[word] = { enabled: true, actionName };

        wordInput.value = "";
        renderChatBotCustomCommands();
    };
}

const saveChatBotSettingsBtn = document.getElementById("saveChatBotSettings");

if (saveChatBotSettingsBtn) {

    saveChatBotSettingsBtn.onclick = () => {

        const cb = appSettings.chatBot || getChatBotDefaults();

        cb.enabled = document.getElementById("chatBotEnabled")?.checked !== false;
        cb.prefix = document.getElementById("chatBotPrefix")?.value || "!";
        cb.cooldownSeconds = Number(document.getElementById("chatBotCooldown")?.value || 8);

        cb.commands = cb.commands || {};
        cb.commands.roue = { enabled: document.getElementById("chatBotCmdRoue")?.checked !== false };
        cb.commands.points = { enabled: document.getElementById("chatBotCmdPoints")?.checked !== false };
        cb.commands.objectif = { enabled: document.getElementById("chatBotCmdObjectif")?.checked !== false };

        appSettings.chatBot = cb;

        saveAppSettings("Commandes du chat sauvegardées !");
    };
}

/* Réactions aux commandes du chat détectées côté serveur */

socket.on("chatBotCommand", data => {

    if (!data || !data.type) {
        return;
    }

    if (data.type === "points") {

        const entry = pointsUsers[data.user];
        const balance = entry ? Math.round(entry.points || 0) : 0;
        const currency = (appSettings.pointsSystem && appSettings.pointsSystem.currencyName) || "points";

        playTtsMessage(data.user + " a " + balance + " " + currency + " !", { nickname: data.user });
    }

    if (data.type === "objectif") {

        const goal = appSettings.followGoal;
        const text = goal && goal.text ? goal.text : "un nouvel objectif d'abonnés";

        playTtsMessage("Rappel : " + text + " !", { nickname: data.user });
    }
});

function requirePro() {

    const isPro =
        appSettings &&
        (
            appSettings.pro === true ||
            appSettings.pro === "true"
        );

    if (!isPro) {

        tikBabikProSetupTab.click();
    
        return false;
    }

    return true;
}

function updateProLocks() {

    const isPro =
        appSettings &&
        (
            appSettings.pro === true ||
            appSettings.pro === "true"
        );

    if (isPro) {
        streamerBotSetupTab.innerText = "Connexion Streamer.bot";
        minecraftSetupTab.innerText = "Connexion Minecraft";
    } else {
        streamerBotSetupTab.innerText = "🔒 Connexion Streamer.bot";
        minecraftSetupTab.innerText = "🔒 Connexion Minecraft";
    }

}


if (typeof connectTikTokAccountButton !== "undefined" && connectTikTokAccountButton) {
    connectTikTokAccountButton.onclick = () => {
        accountSetupPage.style.display = "none";
        connectTikTokSetupPage.style.display = "block";
    };
}

roadmapButton.onclick = () => {
    window.open("/roadmap", "_blank");
};

featureRequestButton.onclick = () => {
    window.open("/feature-request", "_blank");
};

signOutButton.onclick = () => {

    localStorage.removeItem("tikbabikUser");

    appSettings.pro = false;

    document.getElementById("accountUserId").textContent = "";
    document.getElementById("accountEmail").textContent = "";
    document.getElementById("accountEmailDisplay").textContent = "";
    document.getElementById("accountDate").textContent = "";

    updateProLocks();

    if (typeof applyProDisplay === "function") {
        applyProDisplay();
    }

    alert("Vous êtes déconnecté");

    location.reload();

};

async function checkProFromDatabase(email) {

    if (!email) {
        return;
    }

    try {

        const response =
            await fetch("https://www.tikbabik.shop/check-pro", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email
                })
            });

        const data =
            await response.json();

        appSettings.pro =
            data.pro === true;

            fetch("/settings", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify(appSettings)
});

        updateProLocks();

        if (typeof applyProDisplay === "function") {
            applyProDisplay();
        }

        console.log(
            "PRO DATABASE :",
            appSettings.pro
        );

    } catch (error) {

        console.log(
            "Erreur check pro :",
            error
        );

    }

}

document.getElementById("accountEmail").textContent = "";
document.getElementById("accountEmailDisplay").textContent = "-";



document.querySelectorAll(".copyOverlayUrl").forEach(button => {

    button.onclick = () => {

        if (
    button.dataset.pro === "true" &&
    !isProUser()
) {
    goToProCheckout();
    return;
}

        const input =
            button.parentElement.querySelector(".overlayUrlInput");

        if (!input) {
            return;
        }

        let url =
            input.value;

        if (!url.includes("client=")) {
            url +=
                (url.includes("?") ? "&" : "?") +
                "client=" +
                getCreatorPilotClientId();
        }

        if (url.startsWith("/")) {
            url =
                window.location.origin + url;
        }

        navigator.clipboard.writeText(url)
    .then(() => {
        alert("URL copiée : " + url);
    })
    .catch(() => {
    alert("Impossible de copier automatiquement.\n\nURL : " + url);
});

    };

});

document.querySelectorAll(".testOverlayUrl").forEach(button => {

    button.onclick = () => {

        if (
    button.dataset.pro === "true" &&
    !isProUser()
) {
    goToProCheckout();
    return;
}

        const input =
            button.parentElement.querySelector(".overlayUrlInput");

       if (!input && !button.dataset.url) {
    alert("URL introuvable");
    return;
}

let url =
    button.dataset.url || input.value;

        window.open(url, "_blank");

    };

});

const customizeWebcamSimple =
    document.getElementById("customizeWebcamSimple");

const webcamSimpleCustomize =
    document.getElementById("webcamSimpleCustomize");

if (
    customizeWebcamSimple &&
    webcamSimpleCustomize
) {

    customizeWebcamSimple.onclick = () => {

        webcamSimpleCustomize.style.display =
            webcamSimpleCustomize.style.display === "none"
                ? "block"
                : "none";

    };

}

const webcamSimplePreview =
    document.getElementById("webcamSimplePreview");

const webcamSimpleColor =
    document.getElementById("webcamSimpleColor");

const webcamSimpleBorder =
    document.getElementById("webcamSimpleBorder");

const webcamSimpleRadius =
    document.getElementById("webcamSimpleRadius");

const webcamSimpleGlow =
    document.getElementById("webcamSimpleGlow");

function updateWebcamSimpleFrame() {

    if (!webcamSimplePreview) {
        return;
    }

    const color =
        webcamSimpleColor?.value || "#35cfff";

    const border =
        webcamSimpleBorder?.value || 6;

    const radius =
        webcamSimpleRadius?.value || 12;

    webcamSimplePreview.style.border =
        border + "px solid " + color;

    webcamSimplePreview.style.borderRadius =
        radius + "px";

    if (webcamSimpleGlow?.checked) {

        webcamSimplePreview.style.boxShadow =
            "0 0 15px " + color +
            ", 0 0 30px " + color;

    } else {

        webcamSimplePreview.style.boxShadow =
            "none";

    }

}

webcamSimpleColor?.addEventListener(
    "input",
    updateWebcamSimpleFrame
);

webcamSimpleBorder?.addEventListener(
    "input",
    updateWebcamSimpleFrame
);

webcamSimpleRadius?.addEventListener(
    "input",
    updateWebcamSimpleFrame
);

webcamSimpleGlow?.addEventListener(
    "change",
    updateWebcamSimpleFrame
);

updateWebcamSimpleFrame();


const saveWebcamSimple =
    document.getElementById("saveWebcamSimple");

if (saveWebcamSimple) {

    saveWebcamSimple.onclick = () => {

        appSettings.webcamSimple = {

            color:
                document.getElementById("webcamSimpleColor")?.value || "#35cfff",

            border:
                Number(
                    document.getElementById("webcamSimpleBorder")?.value || 6
                ),

            radius:
                Number(
                    document.getElementById("webcamSimpleRadius")?.value || 12
                ),

            glow:
                document.getElementById("webcamSimpleGlow")?.checked || false

        };

        fetch("/settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(appSettings)
        })
        .then(response => response.json())
        .then(() => {

            showToast("Cadre webcam sauvegardé !");

        });

    };

}


const customizeWebcamCustom =
    document.getElementById("customizeWebcamCustom");

const webcamCustomCustomize =
    document.getElementById("webcamCustomCustomize");

if (
    customizeWebcamCustom &&
    webcamCustomCustomize
) {

    customizeWebcamCustom.onclick = () => {

        webcamCustomCustomize.style.display =
            webcamCustomCustomize.style.display === "none"
                ? "block"
                : "none";

    };

}

const webcamCustomFrame =
    document.getElementById("webcamCustomFrame");

const webcamCustomStyle =
    document.getElementById("webcamCustomStyle");

function updateWebcamCustomFrame() {

    if (!webcamCustomFrame || !webcamCustomStyle) {
        return;
    }

    const style =
        webcamCustomStyle.value;

    if (style === "neon") {
        webcamCustomFrame.style.border = "6px solid #00f2ea";
        webcamCustomFrame.style.borderRadius = "22px";
        webcamCustomFrame.style.boxShadow =
            "0 0 15px #00f2ea, 0 0 35px #00f2ea";
    }

    if (style === "gaming") {
        webcamCustomFrame.style.border = "6px solid #00ff00";
        webcamCustomFrame.style.borderRadius = "6px";
        webcamCustomFrame.style.boxShadow =
            "0 0 20px #00ff00";
    }

    if (style === "tiktok") {
        webcamCustomFrame.style.border = "6px solid #ff0050";
        webcamCustomFrame.style.borderRadius = "18px";
        webcamCustomFrame.style.boxShadow =
            "0 0 15px #ff0050, 0 0 25px #00f2ea";
    }

    if (style === "rgb") {
        webcamCustomFrame.style.border = "6px solid #ffffff";
        webcamCustomFrame.style.borderRadius = "20px";
        webcamCustomFrame.style.boxShadow =
            "0 0 15px red, 0 0 25px blue, 0 0 35px lime";
    }

}

webcamCustomStyle?.addEventListener(
    "change",
    updateWebcamCustomFrame
);

updateWebcamCustomFrame();

const saveWebcamCustom =
    document.getElementById("saveWebcamCustom");

if (saveWebcamCustom) {

    saveWebcamCustom.onclick = () => {

        appSettings.webcamCustom = {
            style:
                document.getElementById("webcamCustomStyle")?.value || "neon"
        };

        fetch("/settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(appSettings)
        })
        .then(response => response.json())
        .then(() => {
            showToast("Cadre personnalisé sauvegardé !");
        });

    };

}

const customizeLikesGoal =
    document.getElementById("customizeLikesGoal");

const likesGoalCustomize =
    document.getElementById("likesGoalCustomize");

if (customizeLikesGoal && likesGoalCustomize) {

    customizeLikesGoal.onclick = () => {

        likesGoalCustomize.style.display =
            likesGoalCustomize.style.display === "none"
                ? "block"
                : "none";

    };

}

const likesGoalPreview =
    document.getElementById("likesGoalPreview");

function updateLikesGoalPreview() {
    const customText =
    document.getElementById("likesGoalText")?.value ||
    "objectif 10k like et je vous répond";

    if (!likesGoalPreview) {
        return;
    }

    likesGoalPreview.style.fontFamily =
        document.getElementById("likesGoalFont")?.value || "Pacifico";

    likesGoalPreview.style.fontSize =
        (document.getElementById("likesGoalFontSize")?.value || 28) + "px";

    likesGoalPreview.style.letterSpacing =
        (document.getElementById("likesGoalLetterSpacing")?.value || 2) + "px";

    likesGoalPreview.style.color =
        document.getElementById("likesGoalTextColor")?.value || "#00ff22";

    const variation =
        document.getElementById("likesGoalVariation")?.value;

        const progressColor =
    document.getElementById("likesGoalProgressColor")?.value || "#ea00ff";

const remainingColor =
    document.getElementById("likesGoalRemainingColor")?.value || "#010300";

const barColor =
    document.getElementById("likesGoalBarColor")?.value || "#baff4a";

     document.getElementById("likesGoalVariation")?.value;   
       
        const target =
    document.getElementById("likesGoalTarget")?.value || 10000;

    const currentLikes = currentLikesGoalCount;



const showProgress =
    document.getElementById("likesGoalShowProgress")?.checked || false;

if (showProgress) {

    const percent =
        Math.min(
            100,
            Math.round((currentLikes / target) * 100)
        );

    likesGoalPreview.innerHTML =
        `
        <div>
            ${customText} : ${currentLikes} / ${target} (${percent}%)
        </div>

        <div class="likesProgressBar"
             style="
                background:${remainingColor};
                border:2px solid ${barColor};
             ">

            <div class="likesProgressFill"
                 style="
                    width:${percent}%;
                    background:${progressColor};
                 ">
            </div>

        </div>
        `;

} else {

    likesGoalPreview.innerHTML =
        customText;

}

    if (variation === "Clean Néon") {

        likesGoalPreview.style.border =
            "4px solid #baff4a";

        likesGoalPreview.style.boxShadow =
            "0 0 8px #baff4a, 0 0 15px #00eaff";

    }

    if (variation === "Néon Rose") {

        likesGoalPreview.style.border =
            "4px solid #ff00ff";

        likesGoalPreview.style.boxShadow =
            "0 0 10px #ff00ff, 0 0 25px #ff00ff";

    }

    if (variation === "Néon Bleu") {

        likesGoalPreview.style.border =
            "4px solid #00eaff";

        likesGoalPreview.style.boxShadow =
            "0 0 10px #00eaff, 0 0 25px #00eaff";

    }

    if (variation === "TikTok") {

        likesGoalPreview.style.border =
            "4px solid #ff0050";

        likesGoalPreview.style.boxShadow =
            "0 0 10px #ff0050, 0 0 25px #00f2ea";

    }

}
[
    "likesGoalProgressColor",
"likesGoalRemainingColor",
"likesGoalBarColor",
    "likesGoalShowProgress",
    "likesGoalTarget",
    "likesGoalText",
    "likesGoalFont",
    "likesGoalFontSize",
    "likesGoalLetterSpacing",
    "likesGoalTextColor",
    "likesGoalVariation"
].forEach(id => {

    document.getElementById(id)?.addEventListener(
        "input",
        updateLikesGoalPreview
    );

    document.getElementById(id)?.addEventListener(
        "change",
        updateLikesGoalPreview
    );

});

updateLikesGoalPreview();

const saveLikesGoal =
    document.getElementById("saveLikesGoal");
    if (saveLikesGoal) {

    saveLikesGoal.onclick = () => {

        appSettings.likesGoal = {

            progressColor:
    document.getElementById("likesGoalProgressColor")?.value || "#ea00ff",

remainingColor:
    document.getElementById("likesGoalRemainingColor")?.value || "#010300",

barColor:
    document.getElementById("likesGoalBarColor")?.value || "#baff4a",

            text:
                document.getElementById("likesGoalText")?.value || "",

            target:
                Number(
                    document.getElementById("likesGoalTarget")?.value || 10000
                ),

            showProgress:
                document.getElementById("likesGoalShowProgress")?.checked || false,

            font:
                document.getElementById("likesGoalFont")?.value || "Arial",

            fontSize:
                Number(
                    document.getElementById("likesGoalFontSize")?.value || 28
                ),

            letterSpacing:
                Number(
                    document.getElementById("likesGoalLetterSpacing")?.value || 2
                ),

            textColor:
                document.getElementById("likesGoalTextColor")?.value || "#00ff22",

            variation:
                document.getElementById("likesGoalVariation")?.value || "Clean Néon",

            ringColor1:
                document.getElementById("likesGoalRingColor1")?.value || "#22d3ee",

            ringColor2:
                document.getElementById("likesGoalRingColor2")?.value || "#a855f7",

            ringColor3:
                document.getElementById("likesGoalRingColor3")?.value || "#ec4899",

            ringSpeed:
                Number(document.getElementById("likesGoalRingSpeed")?.value || 6),

            announceEnabled:
                document.getElementById("likesGoalAnnounceEnabled")?.checked || false,

            announceMessage:
                document.getElementById("likesGoalAnnounceMessage")?.value ||
                "Objectif de likes atteint ! Merci à tous !"

        };

        fetch("/settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(appSettings)
        })
        .then(response => response.json())
        .then(() => {

            const frame =
                document.querySelector(".likesGoalFrame");

            if (frame) {
                frame.src = "/overlay/likes-goal?t=" + Date.now();
            }

            showToast("Objectif Likes sauvegardé !");

        });

    

    };

}

const customizeFollowGoal =
    document.getElementById("customizeFollowGoal");

const followGoalCustomize =
    document.getElementById("followGoalCustomize");

if (
    customizeFollowGoal &&
    followGoalCustomize
) {

    customizeFollowGoal.onclick = () => {

        followGoalCustomize.style.display =
            followGoalCustomize.style.display === "none"
                ? "block"
                : "none";

    };

}

const customizeDiamondsGoal =
    document.getElementById("customizeDiamondsGoal");

const diamondsGoalCustomize =
    document.getElementById("diamondsGoalCustomize");

if (customizeDiamondsGoal && diamondsGoalCustomize) {

    customizeDiamondsGoal.onclick = () => {

        diamondsGoalCustomize.style.display =
            diamondsGoalCustomize.style.display === "none"
                ? "block"
                : "none";

    };

}

const resetDiamondsGoal =
    document.getElementById("resetDiamondsGoal");

if (resetDiamondsGoal) {

    resetDiamondsGoal.onclick = async () => {

        if (!confirm("Réinitialiser l'objectif Diamants à zéro ?")) {
            return;
        }

        await fetch("/diamonds-goal/reset", { method: "POST" });

        const frame =
            document.querySelector(".diamondsGoalFrame");

        if (frame) {
            frame.src = "/overlay/diamonds-goal?t=" + Date.now();
        }

    };

}

const saveDiamondsGoal =
    document.getElementById("saveDiamondsGoal");

if (saveDiamondsGoal) {

    saveDiamondsGoal.onclick = () => {

        appSettings.diamondsGoal = {
            text: document.getElementById("diamondsGoalText")?.value || "Objectif Diamants",
            target: Number(document.getElementById("diamondsGoalTarget")?.value || 1000),
            showProgress: document.getElementById("diamondsGoalShowProgress")?.checked !== false,
            icon: document.getElementById("diamondsGoalIcon")?.value || "💎",
            font: document.getElementById("diamondsGoalFont")?.value || "Orbitron",
            fontSize: Number(document.getElementById("diamondsGoalFontSize")?.value || 22),
            textColor: document.getElementById("diamondsGoalTextColor")?.value || "#f5f7ff",
            progressColor: document.getElementById("diamondsGoalProgressColor")?.value || "#22d3ee",
            ringColor1: document.getElementById("diamondsGoalRingColor1")?.value || "#22d3ee",
            ringColor2: document.getElementById("diamondsGoalRingColor2")?.value || "#a855f7",
            ringColor3: document.getElementById("diamondsGoalRingColor3")?.value || "#ec4899",
            ringSpeed: Number(document.getElementById("diamondsGoalRingSpeed")?.value || 6),
            announceEnabled: document.getElementById("diamondsGoalAnnounceEnabled")?.checked || false,
            announceMessage: document.getElementById("diamondsGoalAnnounceMessage")?.value ||
                "Objectif de diamants atteint ! Merci à tous !"
        };

        fetch("/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(appSettings)
        })
        .then(response => response.json())
        .then(() => {

            const frame =
                document.querySelector(".diamondsGoalFrame");

            if (frame) {
                frame.src = "/overlay/diamonds-goal?t=" + Date.now();
            }

            showToast("Objectif Diamants sauvegardé !");

        });

    };

}

const followGoalPreview =
    document.getElementById("followGoalPreview");

function updateFollowGoalPreview() {

    if (!followGoalPreview) {
        return;
    }

    const customText =
        document.getElementById("followGoalText")?.value ||
        "objectif 100 abonnés";

    const target =
        document.getElementById("followGoalTarget")?.value || 100;

    const currentFollowers = 0;

    const showProgress =
        document.getElementById("followGoalShowProgress")?.checked || false;

    const variation =
    document.getElementById("followGoalVariation")?.value;

    followGoalPreview.style.fontFamily =
        document.getElementById("followGoalFont")?.value || "Pacifico";

    followGoalPreview.style.fontSize =
        (document.getElementById("followGoalFontSize")?.value || 28) + "px";

    followGoalPreview.style.letterSpacing =
        (document.getElementById("followGoalLetterSpacing")?.value || 2) + "px";

    followGoalPreview.style.color =
        document.getElementById("followGoalTextColor")?.value || "#00ff22";

   if (showProgress) {

    const percent =
        Math.min(
            100,
            Math.round((currentFollowers / target) * 100)
        );

    const progressColor =
        document.getElementById("followGoalProgressColor")?.value || "#ea00ff";

    const remainingColor =
        document.getElementById("followGoalRemainingColor")?.value || "#010300";

    const barColor =
        document.getElementById("followGoalBarColor")?.value || "#baff4a";

    followGoalPreview.innerHTML =
        `
        <div>
            ${customText} : ${currentFollowers} / ${target} (${percent}%)
        </div>

        <div class="likesProgressBar"
             style="background:${remainingColor}; border:2px solid ${barColor};">

            <div class="likesProgressFill"
                 style="width:${percent}%; background:${progressColor};">
            </div>

        </div>
        `;

} else {

    followGoalPreview.innerHTML =
        customText;

}
if (variation === "Clean Néon") {

    followGoalPreview.style.border =
        "4px solid #baff4a";

    followGoalPreview.style.boxShadow =
        "0 0 8px #baff4a, 0 0 15px #00eaff";

}

if (variation === "Néon Rose") {

    followGoalPreview.style.border =
        "4px solid #ff00ff";

    followGoalPreview.style.boxShadow =
        "0 0 10px #ff00ff, 0 0 25px #ff00ff";

}

if (variation === "Néon Bleu") {

    followGoalPreview.style.border =
        "4px solid #00eaff";

    followGoalPreview.style.boxShadow =
        "0 0 10px #00eaff, 0 0 25px #00eaff";

}

if (variation === "TikTok") {

    followGoalPreview.style.border =
        "4px solid #ff0050";

    followGoalPreview.style.boxShadow =
        "0 0 10px #ff0050, 0 0 25px #00f2ea";

}

}

[
    "followGoalText",
    "followGoalTarget",
    "followGoalShowProgress",
    "followGoalFont",
    "followGoalFontSize",
    "followGoalLetterSpacing",
    "followGoalTextColor",
    "followGoalVariation",
    "followGoalProgressColor",
    "followGoalRemainingColor",
    "followGoalBarColor"
].forEach(id => {

    document.getElementById(id)?.addEventListener(
        "input",
        updateFollowGoalPreview
    );

    document.getElementById(id)?.addEventListener(
        "change",
        updateFollowGoalPreview
    );

});

updateFollowGoalPreview();

const saveFollowGoal =
    document.getElementById("saveFollowGoal");

if (saveFollowGoal) {

    saveFollowGoal.onclick = () => {

        appSettings.followGoal = {
            text: document.getElementById("followGoalText")?.value || "",
            target: Number(document.getElementById("followGoalTarget")?.value || 100),
            showProgress: document.getElementById("followGoalShowProgress")?.checked || false,
            font: document.getElementById("followGoalFont")?.value || "Pacifico",
            fontSize: Number(document.getElementById("followGoalFontSize")?.value || 28),
            letterSpacing: Number(document.getElementById("followGoalLetterSpacing")?.value || 2),
            textColor: document.getElementById("followGoalTextColor")?.value || "#00ff22",
            progressColor: document.getElementById("followGoalProgressColor")?.value || "#ea00ff",
            remainingColor: document.getElementById("followGoalRemainingColor")?.value || "#010300",
            barColor: document.getElementById("followGoalBarColor")?.value || "#baff4a",
            variation: document.getElementById("followGoalVariation")?.value || "Clean Néon",
            ringColor1: document.getElementById("followGoalRingColor1")?.value || "#22d3ee",
            ringColor2: document.getElementById("followGoalRingColor2")?.value || "#a855f7",
            ringColor3: document.getElementById("followGoalRingColor3")?.value || "#ec4899",
            ringSpeed: Number(document.getElementById("followGoalRingSpeed")?.value || 6),
            announceEnabled: document.getElementById("followGoalAnnounceEnabled")?.checked || false,
            announceMessage: document.getElementById("followGoalAnnounceMessage")?.value ||
                "Objectif d'abonnés atteint ! Merci à tous !"
        };

        fetch("/settings", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(appSettings)
        })
        .then(response => response.json())
        .then(() => {

            const frame =
                document.querySelector(".followGoalFrame");

            if (frame) {
                frame.src = "/overlay/follow-goal?t=" + Date.now();
            }

            showToast("Objectif Abonnés sauvegardé !");
        });

    };

}

const customizeBanner =
    document.getElementById("customizeBanner");

const bannerCustomize =
    document.getElementById("bannerCustomize");

if (
    customizeBanner &&
    bannerCustomize
) {

    customizeBanner.onclick = () => {

        bannerCustomize.style.display =
            bannerCustomize.style.display === "none"
                ? "block"
                : "none";

    };

}

const bannerFrame =
    document.querySelector(".bannerFrame");

function refreshBannerPreview() {
    if (bannerFrame) {
        bannerFrame.src = "/overlay/banner?t=" + Date.now();
    }
}

[
    "bannerText",
    "bannerSpeed",
    "bannerFont",
    "bannerTextColor",
    "bannerBgColor",
    "bannerBgColor2"
].forEach(id => {

    document.getElementById(id)?.addEventListener(
        "change",
        refreshBannerPreview
    );

});

const saveBanner =
    document.getElementById("saveBanner");

if (saveBanner) {

    saveBanner.onclick = () => {

        appSettings.banner = {

            text:
                document.getElementById("bannerText")?.value || "",

            speed:
                Number(
                    document.getElementById("bannerSpeed")?.value || 20
                ),

            font:
                document.getElementById("bannerFont")?.value || "Rajdhani",

            textColor:
                document.getElementById("bannerTextColor")?.value || "#ffffff",

            bgColor:
                document.getElementById("bannerBgColor")?.value || "#ff0050",

            bgColor2:
                document.getElementById("bannerBgColor2")?.value || "#a855f7"

        };

        fetch("/settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(appSettings)
        })
        .then(response => response.json())
        .then(() => {

            refreshBannerPreview();

            showToast("Bannière sauvegardée !");

        });

    };

}
const accountUpgradeProButton =
    document.getElementById("accountUpgradeProButton");

if (accountUpgradeProButton) {

    accountUpgradeProButton.onclick = async event => {

        event.preventDefault();

        const response =
            await fetch("https://www.tikbabik.shop/create-checkout-session", {
                method: "POST"
            });

        const data =
            await response.json();

        if (data.url) {
            window.open(data.url, "_blank");
        } else {
            alert(data.error || "Erreur Stripe");
        }

    };

}

document.addEventListener("click", event => {

    if (!event.target.classList.contains("copyOverlayUrl")) {
        return;
    }

    const card =
        event.target.closest(".webcamFrameCard");

    const input =
        card?.querySelector(".overlayUrlInput");

    if (!input && !event.target.dataset.url) {
    alert("URL introuvable");
    return;
}

let url =
    event.target.dataset.url ||
    input?.value;

if (url.startsWith("/")) {
    url = window.location.origin + url;
}

navigator.clipboard.writeText(url)
    .then(() => {
        alert("URL copiée : " + url);
    })
    .catch(() => {
    alert("Impossible de copier automatiquement.\n\nURL : " + url);
});

});

function goToProCheckout() {
    const button =
        document.getElementById("accountUpgradeProButton");

    if (button) {
        button.click();
    } else {
        alert("Passe à CreatorPilot Pro pour débloquer cette fonction.");
    }
}

function isProUser() {

    const savedUser =
        JSON.parse(
            localStorage.getItem("tikbabikUser") || "null"
        );

    return (
        savedUser &&
        appSettings &&
        (
            appSettings.pro === true ||
            appSettings.pro === "true"
        )
    );

}

function applyProDisplay() {

    const isPro =
        isProUser();

    document.querySelectorAll("[data-pro='true']").forEach(element => {

        if (isPro) {

            element.classList.remove("proLocked");

            if (!element.dataset.originalText) {
                element.dataset.originalText =
                    element.innerHTML.replace("🔒 ", "");
            }

            element.innerHTML =
                element.dataset.originalText;

        } else {

            element.classList.add("proLocked");

            if (!element.dataset.originalText) {
                element.dataset.originalText =
                    element.innerHTML.replace("🔒 ", "");
            }

            element.innerHTML =
                "🔒 " + element.dataset.originalText;

        }

    });

    const licenseBadge =
        document.getElementById("cpLicenseBadge");

    if (licenseBadge) {
        licenseBadge.textContent = isPro ? "PRO" : "GRATUIT";
    }

}

window.addEventListener("load", () => {

    applyProDisplay();

    document.querySelectorAll("[data-pro='true']").forEach(element => {

        element.addEventListener("click", event => {

            if (isProUser()) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();

            goToProCheckout();

        }, true);

    });

});

const activateFreeProCode =
    document.getElementById("activateFreeProCode");

if (activateFreeProCode) {

    activateFreeProCode.onclick = async () => {

        const code =
            document.getElementById("freeProCode")?.value || "";

        const savedUser =
            JSON.parse(localStorage.getItem("tikbabikUser") || "null");

        const email =
            savedUser?.email ||
            document.getElementById("accountEmail")?.textContent ||
            "";

        const response =
            await fetch("https://www.tikbabik.shop/activate-free-pro", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    code,
                    email
                })
            });

        const data =
            await response.json();

        if (data.success) {

            alert("CreatorPilot Pro activé !");

            appSettings.pro = true;

            await fetch("/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(appSettings)
            });

            updateProLocks();

            if (typeof applyProDisplay === "function") {
                applyProDisplay();
            }

            location.reload();

        } else {
            alert(data.error || "Code invalide");
        }

    };

}


const savedUser =
    JSON.parse(localStorage.getItem("tikbabikUser") || "null");


appSettings.pro = false;
updateProLocks();
applyProDisplay();

if (savedUser && savedUser.email) {

    document.getElementById("accountUserId").textContent =
        savedUser.id || "";

    document.getElementById("accountEmail").textContent =
        savedUser.email;

    document.getElementById("accountEmailDisplay").textContent =
        savedUser.email;

    document.getElementById("accountDate").textContent =
        savedUser.createdAt || "";

    checkProFromDatabase(savedUser.email);

}

function fillOpenAiVoices() {
    const ttsVoiceSelect =
        document.getElementById("ttsVoice");

    if (!ttsVoiceSelect) return;

    ttsVoiceSelect.innerHTML = "";

    [
        "alloy",
        "ash",
        "coral",
        "echo",
        "fable",
        "nova",
        "onyx",
        "sage",
        "shimmer"
    ].forEach(voice => {
        const option =
            document.createElement("option");

        option.value = voice;
        option.innerText =
            voice.charAt(0).toUpperCase() + voice.slice(1);

        ttsVoiceSelect.appendChild(option);
    });
}

const ttsEngineSelect =
    document.getElementById("ttsEngine");

if (ttsEngineSelect) {
    ttsEngineSelect.addEventListener("change", () => {

        if (ttsEngineSelect.value === "openai") {
            fillOpenAiVoices();
        } else {
            setTimeout(loadAvailableTtsVoices, 200);
        }

    });
}

console.log("FIN APP JS");

/* ==========================================================
   ASSISTANT LIVE CREATORPILOT
   FREE : score | PRO : fonctions avancées
   ========================================================== */

const liveAssistantButton =
    document.getElementById("liveAssistantButton");

const liveAssistantPanel =
    document.getElementById("liveAssistantPanel");

const closeLiveAssistant =
    document.getElementById("closeLiveAssistant");

// Le HTML historique de CreatorPilot contient plusieurs panneaux imbriqués.
// On déplace l’Assistant LIVE directement dans <body> pour éviter qu’un
// parent masqué (display:none) lui donne une taille de 0 x 0.
if (liveAssistantPanel && liveAssistantPanel.parentElement !== document.body) {
    document.body.appendChild(liveAssistantPanel);
}

if (
    typeof mainPanels !== "undefined" &&
    liveAssistantPanel &&
    !mainPanels.includes(liveAssistantPanel)
) {
    mainPanels.push(liveAssistantPanel);
}

function getLiveAssistantUserEmail() {
    try {
        const user =
            JSON.parse(
                localStorage.getItem("tikbabikUser") ||
                "null"
            );

        return String(user?.email || "")
            .toLowerCase()
            .trim();
    } catch {
        return "";
    }
}

function creatorPilotIsPro() {
    return (
        appSettings?.pro === true ||
        appSettings?.pro === "true"
    );
}

if (liveAssistantButton && liveAssistantPanel) {
    liveAssistantButton.onclick = () => {
        openPanel(liveAssistantPanel);
        loadLiveAssistantStatus();
        loadLiveAssistantHistory();
    };
}

if (closeLiveAssistant && liveAssistantPanel) {
    closeLiveAssistant.onclick = () => {
        liveAssistantPanel.style.display = "none";
    };
}

const liveAssistantElements = {
    enabled:
        document.getElementById("liveAssistantEnabled"),

    activityDetectionEnabled:
        document.getElementById(
            "liveAssistantActivityDetection"
        ),

    suggestionsEnabled:
        document.getElementById(
            "liveAssistantSuggestions"
        ),

    chartsEnabled:
        document.getElementById(
            "liveAssistantCharts"
        ),

    aiEnabled:
        document.getElementById(
            "liveAssistantAi"
        ),

    visualAlertsEnabled:
        document.getElementById(
            "liveAssistantVisualAlerts"
        ),

    soundAlertsEnabled:
        document.getElementById(
            "liveAssistantSoundAlerts"
        ),

    gameAdviceEnabled:
        document.getElementById(
            "liveAssistantGameAdvice"
        )
};

let liveAssistantAccess = {
    score: true,
    activityDetection: false,
    suggestions: false,
    charts: false,
    ai: false,
    soundAlerts: false,
    gameAdvice: false
};

let liveAssistantHistory = [];
let liveAssistantLastAlertSoundAt = 0;
let liveAssistantRefreshTimer = null;

function updateLiveAssistantLocks(proState = creatorPilotIsPro()) {
    const planBadge =
        document.getElementById("liveAssistantPlanBadge");

    if (planBadge) {
        planBadge.textContent =
            proState ? "CREATORPILOT PRO" : "FREE";

        planBadge.classList.toggle(
            "pro",
            proState
        );
    }

    document
        .querySelectorAll("[data-pro-feature]")
        .forEach(input => {
            const feature =
                input.dataset.proFeature;

            const unlocked =
                proState &&
                liveAssistantAccess[feature] !== false;

            input.disabled = !unlocked;

            const option =
                input.closest(".liveAssistantOption");

            if (option) {
                option.classList.toggle(
                    "locked",
                    !unlocked
                );
            }

            if (!unlocked) {
                input.checked = false;
            }
        });

    document
        .querySelectorAll("[data-live-feature]")
        .forEach(lock => {
            const feature =
                lock.dataset.liveFeature;

            const unlocked =
                proState &&
                liveAssistantAccess[feature] !== false;

            lock.classList.toggle(
                "unlocked",
                unlocked
            );
        });

    const aiButton =
        document.getElementById(
            "liveAssistantGenerateAi"
        );

    if (aiButton) {
        aiButton.disabled =
            !proState ||
            !liveAssistantAccess.ai;
    }

    const chartLock =
        document.getElementById(
            "liveAssistantChartLock"
        );

    if (chartLock) {
        chartLock.classList.toggle(
            "active",
            !proState
        );
    }
}

function setLiveAssistantScore(score, level) {
    const safeScore =
        Math.max(
            0,
            Math.min(
                100,
                Number(score || 0)
            )
        );

    const scoreElement =
        document.getElementById(
            "liveAssistantScore"
        );

    const ring =
        document.getElementById(
            "liveAssistantScoreRing"
        );

    const levelElement =
        document.getElementById(
            "liveAssistantLevel"
        );

    if (scoreElement) {
        scoreElement.textContent =
            Math.round(safeScore);
    }

    if (ring) {
        ring.style.setProperty(
            "--score",
            safeScore
        );

        const color =
            safeScore >= 70
                ? "#32e68a"
                : safeScore >= 40
                    ? "#ffbd3b"
                    : "#ff4f67";

        ring.style.setProperty(
            "--score-color",
            color
        );
    }

    if (levelElement) {
        const label =
            level ||
            (
                safeScore >= 70
                    ? "élevée"
                    : safeScore >= 40
                        ? "moyenne"
                        : "faible"
            );

        levelElement.textContent =
            "Activité " + label;
    }
}

function applyLiveAssistantOptions(options = {}) {
    Object
        .entries(liveAssistantElements)
        .forEach(([key, input]) => {
            if (!input) return;

            if (
                Object.prototype.hasOwnProperty.call(
                    options,
                    key
                )
            ) {
                input.checked =
                    options[key] === true;
            }
        });
}

function updateLiveAssistantMetrics(data = {}) {
    const latest = data.latest || {};

    const values = {
        liveMetricViewers:
            latest.viewers || 0,

        liveMetricLikes:
            latest.likesPerMinute || 0,

        liveMetricChat:
            latest.chatPerMinute || 0,

        liveMetricCoins:
            latest.coinsPerMinute || 0,

        liveMetricPeak:
            data.peakViewers || 0
    };

    Object.entries(values).forEach(
        ([id, value]) => {
            const element =
                document.getElementById(id);

            if (element) {
                element.textContent = value;
            }
        }
    );
}

function applyLiveAssistantStatus(data) {
    if (!data || data.success === false) {
        return;
    }

    appSettings.liveAssistant =
        data.options ||
        appSettings.liveAssistant ||
        {};

    liveAssistantAccess = {
        ...liveAssistantAccess,
        ...(data.access || {})
    };

    const proState =
        data.pro === true ||
        creatorPilotIsPro();

    if (data.pro === true) {
        appSettings.pro = true;
    }

    setLiveAssistantScore(
        data.score,
        data.level
    );

    applyLiveAssistantOptions(
        data.options || {}
    );

    updateLiveAssistantLocks(proState);
    updateLiveAssistantMetrics(data);

    const advice =
        document.getElementById(
            "liveAssistantAdvice"
        );

    if (advice) {
        advice.textContent =
            data.lastAiAdvice ||
            data.suggestion ||
            (
                proState
                    ? "L'assistant analyse votre LIVE."
                    : "Le score d'activité est disponible gratuitement. Passez à Pro pour obtenir les conseils."
            );
    }

    const dropAlert =
        document.getElementById(
            "liveAssistantDropAlert"
        );

    const dropText =
        document.getElementById(
            "liveAssistantDropText"
        );

    if (dropAlert) {
        dropAlert.classList.toggle(
            "active",
            data.dropDetected === true
        );
    }

    if (dropText && data.dropDetected) {
        dropText.textContent =
            data.suggestion ||
            "L'activité du LIVE est en baisse.";
    }

    const lastUpdate =
        document.getElementById(
            "liveAssistantLastUpdate"
        );

    if (lastUpdate) {
        lastUpdate.textContent =
            "Dernière analyse : " +
            new Date().toLocaleTimeString(
                "fr-FR"
            );
    }
}

async function loadLiveAssistantStatus() {
    try {
        const email =
            getLiveAssistantUserEmail();

        const response =
            await fetch(
                "/api/live-assistant/status?email=" +
                encodeURIComponent(email),
                {
                    cache: "no-store"
                }
            );

        const data =
            await response.json();

        applyLiveAssistantStatus(data);
    } catch (error) {
        console.log(
            "Erreur statut Assistant LIVE :",
            error
        );
    }
}

function collectLiveAssistantOptions() {
    return {
        enabled:
            liveAssistantElements.enabled?.checked !== false,

        scoreEnabled: true,

        activityDetectionEnabled:
            liveAssistantElements.activityDetectionEnabled?.checked === true,

        suggestionsEnabled:
            liveAssistantElements.suggestionsEnabled?.checked === true,

        chartsEnabled:
            liveAssistantElements.chartsEnabled?.checked === true,

        aiEnabled:
            liveAssistantElements.aiEnabled?.checked === true,

        visualAlertsEnabled:
            liveAssistantElements.visualAlertsEnabled?.checked !== false,

        soundAlertsEnabled:
            liveAssistantElements.soundAlertsEnabled?.checked === true,

        gameAdviceEnabled:
            liveAssistantElements.gameAdviceEnabled?.checked !== false
    };
}

async function saveLiveAssistantOptions(showMessage = true) {
    const status =
        document.getElementById(
            "liveAssistantSaveStatus"
        );

    try {
        if (status) {
            status.textContent =
                "Sauvegarde en cours…";
            status.className = "";
        }

        const response =
            await fetch(
                "/api/live-assistant/settings",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        email:
                            getLiveAssistantUserEmail(),

                        settings:
                            collectLiveAssistantOptions()
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok || data.success === false) {
            throw new Error(
                data.error ||
                "Erreur de sauvegarde"
            );
        }

        appSettings.liveAssistant =
            data.options || {};

        applyLiveAssistantOptions(
            data.options || {}
        );

        updateLiveAssistantLocks(
            data.pro === true
        );

        if (status) {
            status.textContent =
                "Options sauvegardées.";
            status.className = "success";
        }

        if (showMessage) {
            setTimeout(() => {
                if (status) {
                    status.textContent =
                        "Les options sont sauvegardées automatiquement.";
                    status.className = "";
                }
            }, 1800);
        }

        return data;
    } catch (error) {
        console.log(
            "Erreur sauvegarde Assistant LIVE :",
            error
        );

        if (status) {
            status.textContent =
                "Erreur : " + error.message;
            status.className = "error";
        }

        return null;
    }
}

const liveAssistantSave =
    document.getElementById(
        "liveAssistantSave"
    );

if (liveAssistantSave) {
    liveAssistantSave.onclick = () =>
        saveLiveAssistantOptions(true);
}

Object
    .values(liveAssistantElements)
    .forEach(input => {
        if (!input) return;

        input.addEventListener(
            "change",
            async () => {
                if (
                    input.dataset.proFeature &&
                    !creatorPilotIsPro()
                ) {
                    input.checked = false;

                    if (
                        typeof goToProCheckout ===
                        "function"
                    ) {
                        goToProCheckout();
                    }

                    return;
                }

                await saveLiveAssistantOptions(
                    false
                );

                if (
                    input ===
                    liveAssistantElements.chartsEnabled
                ) {
                    loadLiveAssistantHistory();
                }
            }
        );
    });

async function loadLiveAssistantHistory() {
    if (
        !creatorPilotIsPro() ||
        !liveAssistantElements.chartsEnabled?.checked
    ) {
        drawLiveAssistantChart([]);
        return;
    }

    try {
        const response =
            await fetch(
                "/api/live-assistant/history?email=" +
                encodeURIComponent(
                    getLiveAssistantUserEmail()
                ),
                {
                    cache: "no-store"
                }
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            data.success === false
        ) {
            return;
        }

        liveAssistantHistory =
            Array.isArray(data.history)
                ? data.history
                : [];

        drawLiveAssistantChart(
            liveAssistantHistory
        );
    } catch (error) {
        console.log(
            "Erreur historique Assistant LIVE :",
            error
        );
    }
}

function drawLiveAssistantChart(history) {
    const canvas =
        document.getElementById(
            "liveAssistantChart"
        );

    if (!canvas) return;

    const parent =
        canvas.parentElement;

    const cssWidth =
        Math.max(
            320,
            parent.clientWidth - 20
        );

    const cssHeight = 330;
    const ratio =
        window.devicePixelRatio || 1;

    canvas.width =
        Math.floor(cssWidth * ratio);

    canvas.height =
        Math.floor(cssHeight * ratio);

    canvas.style.width =
        cssWidth + "px";

    canvas.style.height =
        cssHeight + "px";

    const ctx =
        canvas.getContext("2d");

    ctx.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
    );

    ctx.clearRect(
        0,
        0,
        cssWidth,
        cssHeight
    );

    const padding = {
        left: 44,
        right: 20,
        top: 30,
        bottom: 36
    };

    const chartWidth =
        cssWidth -
        padding.left -
        padding.right;

    const chartHeight =
        cssHeight -
        padding.top -
        padding.bottom;

    ctx.strokeStyle =
        "rgba(255,255,255,0.08)";

    ctx.lineWidth = 1;

    for (let index = 0; index <= 5; index++) {
        const y =
            padding.top +
            (chartHeight / 5) * index;

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(
            cssWidth - padding.right,
            y
        );
        ctx.stroke();
    }

    if (!history || history.length < 2) {
        ctx.fillStyle =
            "rgba(255,255,255,0.45)";

        ctx.font =
            "14px Arial";

        ctx.textAlign =
            "center";

        ctx.fillText(
            creatorPilotIsPro()
                ? "Les courbes apparaîtront pendant votre LIVE."
                : "Graphiques disponibles avec CreatorPilot Pro.",
            cssWidth / 2,
            cssHeight / 2
        );

        return;
    }

    const visible =
        history.slice(-60);

    const series = [
        {
            key: "likesPerMinute",
            label: "Likes/min",
            stroke: "#ff4f8b"
        },
        {
            key: "chatPerMinute",
            label: "Messages/min",
            stroke: "#00f2ea"
        },
        {
            key: "coinsPerMinute",
            label: "Pièces/min",
            stroke: "#ffbd3b"
        },
        {
            key: "viewers",
            label: "Spectateurs",
            stroke: "#8d7cff"
        }
    ];

    const maximum =
        Math.max(
            10,
            ...visible.flatMap(item =>
                series.map(
                    serie =>
                        Number(
                            item[serie.key] || 0
                        )
                )
            )
        );

    series.forEach((serie, serieIndex) => {
        ctx.strokeStyle =
            serie.stroke;

        ctx.lineWidth = 2;
        ctx.beginPath();

        visible.forEach((item, index) => {
            const x =
                padding.left +
                (
                    index /
                    Math.max(
                        1,
                        visible.length - 1
                    )
                ) *
                chartWidth;

            const y =
                padding.top +
                chartHeight -
                (
                    Number(
                        item[serie.key] || 0
                    ) /
                    maximum
                ) *
                chartHeight;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        const legendX =
            padding.left +
            serieIndex * 130;

        ctx.fillStyle =
            serie.stroke;

        ctx.fillRect(
            legendX,
            10,
            13,
            3
        );

        ctx.fillStyle =
            "rgba(255,255,255,0.72)";

        ctx.font =
            "11px Arial";

        ctx.textAlign =
            "left";

        ctx.fillText(
            serie.label,
            legendX + 18,
            14
        );
    });

    ctx.fillStyle =
        "rgba(255,255,255,0.4)";

    ctx.font =
        "10px Arial";

    ctx.textAlign =
        "left";

    ctx.fillText(
        visible[0]?.timeLabel || "",
        padding.left,
        cssHeight - 12
    );

    ctx.textAlign =
        "right";

    ctx.fillText(
        visible.at(-1)?.timeLabel || "",
        cssWidth - padding.right,
        cssHeight - 12
    );
}

const liveAssistantGenerateAi =
    document.getElementById(
        "liveAssistantGenerateAi"
    );

if (liveAssistantGenerateAi) {
    liveAssistantGenerateAi.onclick =
        async () => {
            if (
                !creatorPilotIsPro()
            ) {
                if (
                    typeof goToProCheckout ===
                    "function"
                ) {
                    goToProCheckout();
                }

                return;
            }

            if (
                !liveAssistantElements.aiEnabled
                    ?.checked
            ) {
                alert(
                    "Activez d'abord le Mode IA."
                );

                return;
            }

            const advice =
                document.getElementById(
                    "liveAssistantAdvice"
                );

            liveAssistantGenerateAi.disabled =
                true;

            liveAssistantGenerateAi.textContent =
                "🤖 Analyse en cours…";

            try {
                const response =
                    await fetch(
                        "/api/live-assistant/ai-advice",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify({
                                email:
                                    getLiveAssistantUserEmail()
                            })
                        }
                    );

                const data =
                    await response.json();

                if (
                    !response.ok ||
                    data.success === false
                ) {
                    throw new Error(
                        data.error ||
                        "Erreur IA"
                    );
                }

                if (advice) {
                    advice.textContent =
                        data.advice;
                }
            } catch (error) {
                alert(
                    "Assistant IA : " +
                    error.message
                );
            } finally {
                liveAssistantGenerateAi.disabled =
                    false;

                liveAssistantGenerateAi.innerHTML =
                    '🤖 Générer un conseil IA <span class="liveAssistantLock unlocked" data-live-feature="ai">🔒</span>';
            }
        };
}

const liveAssistantReset =
    document.getElementById(
        "liveAssistantReset"
    );

if (liveAssistantReset) {
    liveAssistantReset.onclick =
        async () => {
            if (!creatorPilotIsPro()) {
                if (
                    typeof goToProCheckout ===
                    "function"
                ) {
                    goToProCheckout();
                }

                return;
            }

            if (
                !confirm(
                    "Réinitialiser les statistiques de l'Assistant LIVE ?"
                )
            ) {
                return;
            }

            const response =
                await fetch(
                    "/api/live-assistant/reset",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            email:
                                getLiveAssistantUserEmail()
                        })
                    }
                );

            const data =
                await response.json();

            if (data.success) {
                liveAssistantHistory = [];
                drawLiveAssistantChart([]);
                loadLiveAssistantStatus();
            }
        };
}

const liveAssistantUpgrade =
    document.getElementById(
        "liveAssistantUpgrade"
    );

if (liveAssistantUpgrade) {
    liveAssistantUpgrade.onclick = () => {
        if (
            typeof goToProCheckout ===
            "function"
        ) {
            goToProCheckout();
        } else if (tikBabikProSetupTab) {
            tikBabikProSetupTab.click();
        }
    };
}

socket.on(
    "live-assistant-update",
    data => {
        applyLiveAssistantStatus({
            success: true,
            pro: creatorPilotIsPro(),
            access: liveAssistantAccess,
            options:
                appSettings.liveAssistant ||
                collectLiveAssistantOptions(),
            score: data.score,
            level: data.level,
            dropDetected:
                data.dropDetected,
            suggestion:
                data.suggestion,
            latest:
                data.latest
        });

        if (
            liveAssistantPanel?.style.display !==
            "none"
        ) {
            loadLiveAssistantHistory();
        }
    }
);

socket.on(
    "live-assistant-alert",
    data => {
        const options =
            appSettings.liveAssistant || {};

        if (
            options.visualAlertsEnabled !==
            false
        ) {
            const alertBox =
                document.getElementById(
                    "liveAssistantDropAlert"
                );

            const alertText =
                document.getElementById(
                    "liveAssistantDropText"
                );

            if (alertBox) {
                alertBox.classList.add(
                    "active"
                );
            }

            if (alertText) {
                alertText.textContent =
                    data.message ||
                    "Baisse d'activité détectée.";
            }
        }

        if (
            creatorPilotIsPro() &&
            options.soundAlertsEnabled ===
            true &&
            Date.now() -
                liveAssistantLastAlertSoundAt >
                15000
        ) {
            liveAssistantLastAlertSoundAt =
                Date.now();

            try {
                const audioContext =
                    new (
                        window.AudioContext ||
                        window.webkitAudioContext
                    )();

                const oscillator =
                    audioContext.createOscillator();

                const gain =
                    audioContext.createGain();

                oscillator.frequency.value =
                    620;

                gain.gain.value =
                    0.08;

                oscillator.connect(gain);
                gain.connect(
                    audioContext.destination
                );

                oscillator.start();

                setTimeout(() => {
                    oscillator.stop();
                    audioContext.close();
                }, 230);
            } catch {}
        }
    }
);

window.addEventListener(
    "resize",
    () => drawLiveAssistantChart(
        liveAssistantHistory
    )
);

setTimeout(() => {
    loadLiveAssistantStatus();

    updateLiveAssistantLocks(
        creatorPilotIsPro()
    );

    drawLiveAssistantChart([]);
}, 1200);

liveAssistantRefreshTimer =
    setInterval(() => {
        loadLiveAssistantStatus();

        if (
            liveAssistantPanel?.style.display !==
            "none"
        ) {
            loadLiveAssistantHistory();
        }
    }, 10000);

