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

const giftLibraryBody =
    document.getElementById("giftLibraryBody");

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

    const upgradeProButton =
    document.getElementById("upgradeProButton");

    Paddle.Initialize({
    token: "live_fe73a5f9b3c938fb8976ce65006"
});
console.log("Paddle initialisé");

const legalButton =
    document.getElementById("legalButton");

const legalPage =
    document.getElementById("legalPage");

legalButton.onclick = () => {

    startMainPage.style.display = "none";
    faqPage.style.display = "none";
    aboutPage.style.display = "none";
    contactPage.style.display = "none";

    legalPage.style.display = "block";

};

    


let voiceEnabled = true;
let appSettings = {};
let topGifters = {};
let giftHistory = [];

const mainPanels = [
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

/* MENUS */

settingsButton.onclick = () => {
    openPanel(settingsPanel);
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

chatButton.onclick = () => {
    openPanel(chatPanel);
};

toolsButton.onclick = () => {
    openPanel(toolsPanel);
};

pointsButton.onclick = () => {
    openPanel(pointsPanel);
};

startButton.onclick = () => {

    openPanel(startPanel);

    startMainPage.style.display = "block";

    faqPage.style.display = "none";

    aboutPage.style.display = "none";

    contactPage.style.display = "none";
};

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

};

upgradeProButton.onclick = () => {

    alert("Bouton cliqué");

    console.log("CLICK PRO");

};

homeStartButton.onclick = () => {

    startMainPage.style.display = "block";

    faqPage.style.display = "none";
    aboutPage.style.display = "none";
    contactPage.style.display = "none";
    legalPage.style.display = "none";

};

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

socket.on("chat", data => {
    const div = document.createElement("div");
    div.className = "message";
    div.innerHTML = `<strong>${data.user}</strong> : ${data.message}`;
    messages.prepend(div);

    if (voiceEnabled) {
        const speech = new SpeechSynthesisUtterance(data.message);
        speech.lang = "fr-FR";
        speechSynthesis.speak(speech);
    }
});

/* CADEAUX */

socket.on("gift", data => {
    const div = document.createElement("div");
    div.className = "message";
    div.innerHTML = `🎁 <strong>${data.user}</strong> a envoyé : ${data.gift}`;
    messages.prepend(div);

    const diamonds = Number(data.diamonds || 0);

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

socket.on("like", data => {
    likeCounter.innerHTML = `❤️ Likes : ${data.totalLikes}`;
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
    type = "Son"
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
        <input
    class="eventValue ruleInput"
    placeholder="Rose"
    value="${value}"
>
    </td>

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

    row.querySelector(".eventTrigger").value = trigger;

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

    actionRows.forEach(row => {
        const name = row.querySelector(".ruleGift")?.value.trim();
        const type =
    row.querySelector(".ruleType")?.value || "Son";
        const duration = Number(row.querySelector(".ruleDuration")?.value || 5);
        const sound = row.querySelector(".soundName")?.dataset.filename || "";
        const description = row.querySelector(".ruleDescription")?.value || "";

        if (!name) return;

        actions.push({
    name,
    type,
    duration,
    sound,
    description
});
    });

    eventRows.forEach(row => {
        const user = row.querySelector(".eventUser")?.value || "Any";
        const trigger = row.querySelector(".eventTrigger")?.value || "Gift";
        const value = row.querySelector(".eventValue")?.value || "";
        const action = row.querySelector(".actionSelect")?.value || "Aucune action";
        const enabled = row.querySelector(".eventEnabled")?.checked || false;

        events.push({
    user,
    trigger,
    value,
    action,
    enabled
});
    });

    appSettings.actions = actions;
    appSettings.actionEvents = events;

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
        li.innerHTML = `${user} - ${total} 💎`;
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
                (+${item.diamonds} 💎)
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

fetch("/settings")
.then(response => response.json())
.then(settings => {

    appSettings = settings;

    console.log("SETTINGS CHARGÉS :", appSettings);

    updateProLocks();

    if (appSettings.actions) {
        appSettings.actions.forEach(action => {
            createGiftRuleRow(
    action.name,
    action.sound || "",
    action.duration || 5,
    action.description || "",
    action.type || "Son"
);
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
});

fetch("/stats")
.then(response => response.json())
.then(stats => {
    topGifters = stats.topGifters || {};
    giftHistory = stats.giftHistory || [];

    refreshStatsDisplay();
});

loadGiftLibrary.onclick = async () => {

    try {

        const response =
            await fetch("/gift-library");

        const gifts =
            await response.json();

        giftLibraryBody.innerHTML = "";

        gifts.forEach(gift => {

            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td>
                    <img
                        src="${gift.image}"
                        style="
                            width:50px;
                            height:50px;
                            object-fit:contain;
                        "
                    >
                </td>

                <td>${gift.name}</td>

                <td>${gift.diamonds}</td>

                <td>
                    <select class="actionSelect">
                        <option>Aucune action</option>
                    </select>
                </td>
            `;

            giftLibraryBody.appendChild(row);

        });

    } catch (error) {

        console.log(error);

        alert(
            "Impossible de charger la bibliothèque cadeaux"
        );

    }

};

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

window.addEventListener("load", () => {

    const button =
        document.getElementById("upgradeProButton");

    button.onclick = () => {

        console.log("CLICK PRO");

        console.log("Paddle =", window.Paddle);

        Paddle.Checkout.open({
            items: [
                {
                    priceId: "pri_01ksx3z7y7bs2xvjz5x5ye20d1",
                    quantity: 1
                }
            ]
        });

    };

});