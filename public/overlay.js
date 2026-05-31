const socket = io();

const giftAlert = document.getElementById("giftAlert");
const giftImage = document.getElementById("giftImage");
const followAlert = document.getElementById("followAlert");

let appSettings = {};

fetch("/settings")
.then(response => response.json())
.then(settings => {
    appSettings = settings;
});

socket.on("gift", data => {
    let soundToPlay = appSettings.giftSound;
    let imageToShow = "";
    let volumeToUse = Number(appSettings.volume || 100) / 100;

    if (
        appSettings.giftRules &&
        appSettings.giftRules[data.gift]
    ) {
        const rule = appSettings.giftRules[data.gift];

        soundToPlay = rule.sound;
        imageToShow = rule.image;
        volumeToUse = Number(rule.volume || 100) / 100;
    }

    const audio = new Audio("/sounds/" + soundToPlay);
    audio.volume = volumeToUse;
    audio.play();

    giftAlert.innerHTML =
        `🎁 ${data.user} a envoyé ${data.gift}`;

    giftAlert.style.display = "block";

    if (imageToShow) {
        giftImage.src = "/images/" + imageToShow;
        giftImage.style.display = "block";
    }

    setTimeout(() => {
        giftAlert.style.display = "none";
        giftImage.style.display = "none";
    }, 3000);
});

socket.on("follow", data => {
    const audio = new Audio("/sounds/" + appSettings.followSound);
    audio.volume = Number(appSettings.volume || 100) / 100;
    audio.play();

    followAlert.innerHTML =
        `⭐ ${data.user} vient de suivre !`;

    followAlert.style.display = "block";

    setTimeout(() => {
        followAlert.style.display = "none";
    }, 3000);
});