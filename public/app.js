const socket = io();

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

    chronoCustomize.onclick = () => {

        chronoCustomizePanel.style.display =
            chronoCustomizePanel.style.display === "none"
                ? "block"
                : "none";

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

        alert("Chrono sauvegardé !");
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
            window.location.origin + "/overlay/action-wheel";

        await navigator.clipboard.writeText(url);

        alert("URL copiée : " + url);
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
        giftOptions.style.display =
            giftOptions.style.display === "block" ? "none" : "block";
    };

    

    fetch("/gift-library")
        .then(response => response.json())
        .then(gifts => {
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

        alert("Roue sauvegardée !");
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
    "chronoBgColor"
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
            bgColor: document.getElementById("chronoBgColor").value
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

    if (frame) {
        frame.src = "/overlay/social-panel?t=" + Date.now();
    }
}

        await fetch("/social-panel/settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(settings)
        });
        refreshSocialPreview();
        

        alert("Panneau sociaux sauvegardé !");
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

        await navigator.clipboard.writeText(url);

        alert("URL copiée : " + url);
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
            window.location.origin + "/overlay/chrono";

        await navigator.clipboard.writeText(url);

        alert("URL Chrono copiée : " + url);
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
        font: document.getElementById("topLikesFont").value,
        fontSize: document.getElementById("topLikesFontSize").value,
        nameColor: document.getElementById("topLikesNameColor").value,
        likesColor: document.getElementById("topLikesLikesColor").value,
        rankColor: document.getElementById("topLikesRankColor").value,
        showAvatar: document.getElementById("topLikesShowAvatar").checked,
        showCrown: document.getElementById("topLikesShowCrown").checked,
        showHeart: document.getElementById("topLikesShowHeart").checked
    };
}

function applyTopLikesSettings() {
    const settings = getTopLikesSettings();

    const frame =
        document.querySelector('iframe[src^="/overlay/top-likes"]');

    if (frame) {
        frame.src =
            "/overlay/top-likes" +
            "?font=" + encodeURIComponent(settings.font) +
            "&fontSize=" + settings.fontSize +
            "&nameColor=" + settings.nameColor.substring(1) +
            "&likesColor=" + settings.likesColor.substring(1) +
            "&rankColor=" + settings.rankColor.substring(1) +
            "&showAvatar=" + settings.showAvatar +
            "&showCrown=" + settings.showCrown +
            "&showHeart=" + settings.showHeart +
            "&t=" + Date.now();
    }

    return settings;
}

[
    "topLikesFont",
    "topLikesFontSize",
    "topLikesNameColor",
    "topLikesLikesColor",
    "topLikesRankColor",
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

        alert("Réglages Top J'aime sauvegardés !");
    };
}

const savedTopLikesSettings =
    JSON.parse(localStorage.getItem("topLikesSettings"));

if (savedTopLikesSettings) {
    document.getElementById("topLikesFont").value =
        savedTopLikesSettings.font;

    document.getElementById("topLikesFontSize").value =
        savedTopLikesSettings.fontSize;

    document.getElementById("topLikesNameColor").value =
        savedTopLikesSettings.nameColor;

    document.getElementById("topLikesLikesColor").value =
        savedTopLikesSettings.likesColor;

    document.getElementById("topLikesRankColor").value =
        savedTopLikesSettings.rankColor;

    document.getElementById("topLikesShowAvatar").checked =
        savedTopLikesSettings.showAvatar;

    document.getElementById("topLikesShowCrown").checked =
        savedTopLikesSettings.showCrown;

    document.getElementById("topLikesShowHeart").checked =
        savedTopLikesSettings.showHeart;

    applyTopLikesSettings();
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
    victorySound: localStorage.getItem("coinVictorySound") || "victory.mp3"

    };

    const frame =
        document.querySelector(".coinMatchFrame");

    frame.src =
    "/overlay/coin-match" +
    "?bg=" + settings.bg.substring(1) +
    "&border=" + settings.border.substring(1) +
    "&text=" + settings.text.substring(1) +
    "&timer=" + settings.timer.substring(1) +
    "&shape=" + settings.shape.replace("px", "") +
    "&scale=0.55" +
    "&sound=" + encodeURIComponent(settings.victorySound);
    return settings;
}

[
    "coinBgColor",
    "coinBorderColor",
    "coinTextColor",
    "coinTimerColor",
    "coinShape",
    "coinScale"
].forEach(id => {

    document.getElementById(id).oninput = () => {
        applyCoinMatchStyle();
    };

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

    alert("Style Coin Match sauvegardé !");
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

    document.getElementById("coinShape").value =
        savedCoinStyle.shape;

    document.getElementById("coinScale").value =
        savedCoinStyle.scale;

      document.getElementById("coinDuration").value =
    savedCoinStyle.duration || "300";  

    applyCoinMatchStyle();
}

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

        alert("Paramètres auto cadeaux sauvegardés !");
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
        soundFileName.innerText.trim();

    if (!sound) {
        alert("Aucun son choisi pour cette alerte");
        return;
    }

    const audio =
        new Audio("/sounds/" + sound);

    audio.volume =
        Number(
            row.querySelector(".soundVolumeSlider")?.value || 100
        ) / 100;

    audio.play();

};


fetch("/gift-library")
    .then(response => response.json())
    .then(gifts => {

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

    giftOptions.style.display =
        giftOptions.style.display === "block"
            ? "none"
            : "block";

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

        addSoundAlertRow();

    };

}

/* MENUS */

if (topLikesCustomize && topLikesCustomizeModal) {

    topLikesCustomize.onclick = () => {
        topLikesCustomizeModal.style.display = "flex";
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

coinMatchCopyUrl.onclick = () => {
    const url = window.location.origin + "/overlay/coin-match";

    navigator.clipboard.writeText(url);

    alert("URL copiée : " + url);
};

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

const soundSettingsContent =
    document.getElementById("soundSettingsContent");

const soundAlertsContent =
    document.getElementById("soundAlertsContent");

if (soundSettingsTab) {
    soundSettingsTab.onclick = () => {

        soundSettingsContent.style.display = "block";
        soundAlertsContent.style.display = "none";
        ttsChatContent.style.display = "none";

    };
}


if (soundMainTab) {
    soundMainTab.onclick = () => {

        soundSettingsContent.style.display = "none";
        soundAlertsContent.style.display = "block";
        ttsChatContent.style.display = "none";

    };
}

if (ttsChatTab) {
    ttsChatTab.onclick = () => {

        soundSettingsContent.style.display = "none";
        soundAlertsContent.style.display = "none";
        ttsChatContent.style.display = "block";

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

    topGifters:
        document.getElementById("ttsTopGifters")?.checked || false,

    whitelist:
        document.getElementById("ttsWhitelist")?.checked || false,

    /* Types de commentaires */

    command:
        document.getElementById("ttsCommand")?.value || "!tts",

    /* Coût */

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
            alert("Paramètres TTS sauvegardés !");
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

faqButton.onclick = () => {
    startMainPage.style.display = "none";
    faqPage.style.display = "block";
};

faqButton.onclick = () => {
    startMainPage.style.display = "none";
    aboutPage.style.display = "none";
    faqPage.style.display = "block";
};

aboutButton.onclick = () => {
    startMainPage.style.display = "none";
    faqPage.style.display = "none";
    aboutPage.style.display = "block";
};

contactButton.onclick = () => {
    startMainPage.style.display = "none";
    faqPage.style.display = "none";
    aboutPage.style.display = "none";
    contactPage.style.display = "block";
};

homeStartButton.onclick = () => {

    startMainPage.style.display = "block";

    faqPage.style.display = "none";

    aboutPage.style.display = "none";

    contactPage.style.display = "none";
};


topLikesTest.onclick = async () => {

    await fetch("/top-likes/test", {
        method: "POST"
    });

};

topLikesCopyUrl.onclick = async () => {

    await navigator.clipboard.writeText(
        "http://localhost:3000/overlay/top-likes"
    );

    alert("URL copiée");

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


saveTikTokUserButton.onclick = () => {

    appSettings.tiktokUsername = tiktokUsernameInput.value.trim();

    fetch("/settings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(appSettings)
    })
    .then(response => response.json())
    .then(() => {
        alert("Compte TikTok sauvegardé !");
    });

};

startConnectTikTokButton.onclick = () => {

    openPanel(setupPanel);

    setupHome.style.display = "none";

    connectTikTokSetupPage.style.display = "block";

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



homeStartButton.onclick = () => {
    startMainPage.style.display = "block";
    faqPage.style.display = "none";
    aboutPage.style.display = "none";
    contactPage.style.display = "none";
    legalPage.style.display = "none";
    agencyPage.style.display = "none";
    loginPage.style.display = "none";
    accountSetupPage.style.display = "none";

};

agencyButton.onclick = () => {
    startMainPage.style.display = "none";
    agencyPage.style.display = "block";
    faqPage.style.display = "none";
    aboutPage.style.display = "none";
    legalPage.style.display = "none";
    contactPage.style.display = "none";
    loginPage.style.display = "none";
    accountSetupPage.style.display = "none";

};

startButton.onclick = () => {
    openPanel(startPanel);
    startMainPage.style.display = "block";
    agencyPage.style.display = "none";
    faqPage.style.display = "none";
    aboutPage.style.display = "none";
    legalPage.style.display = "none";
    contactPage.style.display = "none";
    loginPage.style.display = "none";
    accountSetupPage.style.display = "none";

};

faqButton.onclick = () => {
    startMainPage.style.display = "none";
    agencyPage.style.display = "none";
    faqPage.style.display = "block";
    aboutPage.style.display = "none";
    legalPage.style.display = "none";
    contactPage.style.display = "none";
    loginPage.style.display = "none";
    accountSetupPage.style.display = "none";

};

legalButton.onclick = () => {
    startMainPage.style.display = "none";
    agencyPage.style.display = "none";
    faqPage.style.display = "none";
    aboutPage.style.display = "none";
    legalPage.style.display = "block";
    contactPage.style.display = "none";
    loginPage.style.display = "none";
    accountSetupPage.style.display = "none";
};

contactButton.onclick = () => {
    startMainPage.style.display = "none";
    agencyPage.style.display = "none";
    faqPage.style.display = "none";
    aboutPage.style.display = "none";
    legalPage.style.display = "none";
    contactPage.style.display = "block";
    loginPage.style.display = "none";
    accountSetupPage.style.display = "none";
};

aboutButton.onclick = () => {
    startMainPage.style.display = "none";
    agencyPage.style.display = "none";
    faqPage.style.display = "none";
    aboutPage.style.display = "block";
    legalPage.style.display = "none";
    contactPage.style.display = "none";
    loginPage.style.display = "none";
    accountSetupPage.style.display = "none";

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

accountButton.onclick = () => {
    openPanel(startPanel);
    startMainPage.style.display = "none";
    agencyPage.style.display = "none";
    faqPage.style.display = "none";
    aboutPage.style.display = "none";
    legalPage.style.display = "none";
    contactPage.style.display = "none";
    loginPage.style.display = "block";
    accountSetupPage.style.display = "none";
};

registerBtn.onclick = async () => {

    const email =
        document.getElementById("registerEmail").value;

    const password =
        document.getElementById("registerPassword").value;

    const response = await fetch("/register", {

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

loginBtn.onclick = async () => {

    const email =
        document.getElementById("loginEmail").value;

    const password =
        document.getElementById("loginPassword").value;

    const response = await fetch("/login", {

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

giftBattleCopyUrl.onclick = () => {

    const url =
        window.location.origin +
        "/overlay/gift-battle";

    navigator.clipboard.writeText(url);

    alert("URL copiée : " + url);

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
        duration:
    document.getElementById("giftBattleDuration").value,
        redName: document.getElementById("giftBattleRedName").value,
        blueName: document.getElementById("giftBattleBlueName").value,
        redColor: document.getElementById("giftBattleRedColor").value,
        blueColor: document.getElementById("giftBattleBlueColor").value
    };


    [
    "giftBattleRedName",
    "giftBattleBlueName",
    "giftBattleRedColor",
    "giftBattleBlueColor"
].forEach(id => {

    document.getElementById(id).oninput = () => {

        applyGiftBattleStyle();

    };

});

    const frame = document.querySelector(".giftBattleFrame");

    frame.src =
        "/overlay/gift-battle" +
        "?redName=" + encodeURIComponent(settings.redName) +
        "&blueName=" + encodeURIComponent(settings.blueName) +
        "&redColor=" + settings.redColor.substring(1) +
        "&blueColor=" + settings.blueColor.substring(1);

    return settings;
}

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

    localStorage.setItem(
        "giftBattleStyle",
        JSON.stringify(settings)
    );

    alert("Gift Battle sauvegardé !");
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

        audio.play().catch(error => {
            console.log("Erreur audio :", error);
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
function playTtsMessage(text) {

    if (!appSettings.ttsChat || !appSettings.ttsChat.enabled) {
        return;
    }

    if (!text) {
        return;
    }

    const tts =
        appSettings.ttsChat;

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

socket.on("chat", data => {
    const div = document.createElement("div");
    div.className = "message";
    div.innerHTML = `<strong>${data.user}</strong> : ${data.message}`;
    messages.prepend(div);

    playTtsMessage(data.message);
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

    fetch("/gift-library")
    .then(response => response.json())
    .then(gifts => {

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

giftSelected.onclick = () => {

    giftOptions.style.display =
        giftOptions.style.display === "block"
            ? "none"
            : "block";

};

    

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
        alert("Paramètres sauvegardés !");
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

    updateLikesGoalPreview();
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

    document.getElementById("ttsTopGifters").checked =
        tts.topGifters;

    document.getElementById("ttsWhitelist").checked =
        tts.whitelist;

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
        await fetch("/gift-library");

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
        alert("Erreur pendant la sauvegarde");
    });
}

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
    alert("Déconnexion bientôt disponible");
};

const savedUser =
    JSON.parse(localStorage.getItem("tikbabikUser"));

if (savedUser) {

    document.getElementById("accountUserId").textContent =
        savedUser.id;

    document.getElementById("accountEmail").textContent =
        savedUser.email;

    document.getElementById("accountEmailDisplay").textContent =
        savedUser.email;

    document.getElementById("accountDate").textContent =
        savedUser.createdAt;

}

document.querySelectorAll(".copyOverlayUrl").forEach(button => {

    button.onclick = () => {

        const input =
            button.parentElement.querySelector(".overlayUrlInput");

        if (!input) {
            return;
        }

        const finalUrl =
    input.value.replace(
        "http://localhost:3000",
        window.location.origin
    );

navigator.clipboard.writeText(finalUrl);

        alert("URL copiée : " + finalUrl);
    };

});

document.querySelectorAll(".testOverlayUrl").forEach(button => {

    button.onclick = () => {

        const input =
            button.parentElement.querySelector(".overlayUrlInput");

        if (!input) {
            return;
        }

        window.open(input.value, "_blank");

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

            alert("Cadre webcam sauvegardé !");

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
            alert("Cadre personnalisé sauvegardé !");
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
                document.getElementById("likesGoalVariation")?.value || "Clean Néon"

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

            alert("Objectif Likes sauvegardé !");

        });

        document.addEventListener("click", event => {

    if (!event.target.classList.contains("copyOverlayUrl")) {
        return;
    }

    const card =
        event.target.closest(".webcamFrameCard");

    const input =
        card?.querySelector(".overlayUrlInput");

    if (!input) {
        alert("URL introuvable");
        return;
    }

    navigator.clipboard.writeText(input.value);

    alert("URL copiée !");
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
            variation: document.getElementById("followGoalVariation")?.value || "Clean Néon"
        };

        fetch("/settings", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(appSettings)
        })
        .then(response => response.json())
        .then(() => {
            alert("Objectif Abonnés sauvegardé !");
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

const bannerPreview =
    document.getElementById("bannerPreview");

const bannerPreviewText =
    document.getElementById("bannerPreviewText");

function updateBannerPreview() {

    if (!bannerPreview || !bannerPreviewText) {
        return;
    }

    bannerPreviewText.innerHTML =
        document.getElementById("bannerText")?.value ||
        "Bienvenue sur mon live !";

    bannerPreview.style.background =
        document.getElementById("bannerBgColor")?.value || "#ff0050";

    bannerPreview.style.color =
        document.getElementById("bannerTextColor")?.value || "#ffffff";

    const speed =
        document.getElementById("bannerSpeed")?.value || 20;

    bannerPreviewText.style.animationDuration =
        speed + "s";

}

[
    "bannerText",
    "bannerSpeed",
    "bannerTextColor",
    "bannerBgColor"
].forEach(id => {

    document.getElementById(id)?.addEventListener(
        "input",
        updateBannerPreview
    );

    document.getElementById(id)?.addEventListener(
        "change",
        updateBannerPreview
    );

});

updateBannerPreview();

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

            textColor:
                document.getElementById("bannerTextColor")?.value || "#ffffff",

            bgColor:
                document.getElementById("bannerBgColor")?.value || "#ff0050"

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

            alert("Bannière sauvegardée !");

        });

    };

}
document.getElementById("accountUpgradeProButton")
document.addEventListener("click", event => {

    if (event.target.id !== "accountUpgradeProButton") {
        return;
    }

    event.preventDefault();

    console.log("CLICK PRO OK");

    Paddle.Checkout.open({
        items: [
            {
                priceId: "pri_01ksx3z7y7bs2xvjz5x5ye20d1",
                quantity: 1
            }
        ]
    });

});