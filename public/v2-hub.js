(() => {
    const byId = id => document.getElementById(id);
    const hubButton = byId("creatorHubButton");
    const hubPanel = byId("creatorHubPanel");
    if (!hubButton || !hubPanel) return;

    const existingPanelIds = ["startPanel","settingsPanel","setupPanel","statsPanel","overlayPanel","graphicOverlayPanel","soundPanel","chatPanel","toolsPanel","pointsPanel","liveAssistantPanel"];
    const state = {likes:0,gifts:0,coins:0,follows:0,shares:0,startedAt:Date.now(),activity:Array(60).fill(0),topGifters:{},topLikes:[],events:[]};

    function hideExistingPanels(){existingPanelIds.forEach(id=>{const el=byId(id);if(el)el.style.display="none"})}
    function openHub(page="dashboard"){hideExistingPanels();hubPanel.style.display="flex";setPage(page);refreshRemoteData()}
    function closeHub(){hubPanel.style.display="none"}
    hubButton.addEventListener("click",()=>openHub("dashboard"));
    document.querySelectorAll("#sideMenu .menuButton").forEach(button=>{if(button!==hubButton)button.addEventListener("click",closeHub,true)});

    const titles={dashboard:"Dashboard LIVE",tops:"Top Center",alerts:"Alert Studio",overlays:"Overlay Studio",gaming:"Gaming Center",analytics:"Analytics",assistant:"Assistant LIVE"};
    function setPage(page){
        document.querySelectorAll(".creatorHubTab").forEach(btn=>btn.classList.toggle("active",btn.dataset.hubPage===page));
        document.querySelectorAll(".creatorHubPage").forEach(section=>section.classList.toggle("active",section.dataset.hubContent===page));
        const title=byId("creatorHubPageTitle");if(title)title.textContent=titles[page]||"Creator Hub";
        if(page==="analytics")renderAnalytics();
    }
    document.querySelectorAll(".creatorHubTab").forEach(btn=>btn.addEventListener("click",()=>setPage(btn.dataset.hubPage)));
    document.querySelectorAll("[data-open-existing]").forEach(btn=>btn.addEventListener("click",()=>{const target=byId(btn.dataset.openExisting);if(target)target.click()}));
    document.querySelectorAll("[data-open-setup-tab]").forEach(btn=>btn.addEventListener("click",()=>{const setup=byId("setupButton");if(setup)setup.click();setTimeout(()=>{const tab=byId(btn.dataset.openSetupTab);if(tab)tab.click()},50)}));
    document.querySelectorAll("[data-hub-action='refresh']").forEach(btn=>btn.addEventListener("click",refreshRemoteData));
    document.querySelectorAll("[data-hub-action='dashboard']").forEach(btn=>btn.addEventListener("click",()=>setPage("dashboard")));

    const fmt=value=>new Intl.NumberFormat("fr-FR").format(Number(value||0));
    const escapeHtml=value=>String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
    const initials=value=>String(value||"?").replace(/[^a-zA-Z0-9À-ÿ]/g," ").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase()||"?";

    function updateMetrics(){
        const map={hubMetricLikes:fmt(state.likes),hubMetricGifts:fmt(state.gifts),hubMetricCoins:fmt(state.coins),hubMetricFollows:fmt(state.follows),hubMetricShares:fmt(state.shares)};
        Object.entries(map).forEach(([id,value])=>{const el=byId(id);if(el)el.textContent=value});renderAnalytics();
    }

    function renderActivity(){
        const chart=byId("hubActivityChart");if(!chart)return;
        const vals=state.activity.map(Number);const max=Math.max(1,...vals);const w=1000,h=170,pad=6;
        const pts=vals.map((v,i)=>{const x=(i/(vals.length-1))*w;const y=h-pad-(v/max)*(h-2*pad);return [x,y]});
        const line=pts.map(p=>p.join(",")).join(" ");
        const area=`0,${h} ${line} ${w},${h}`;
        const dots=pts.filter((_,i)=>i%10===0||i===pts.length-1).map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3"/>`).join("");
        chart.innerHTML=`<svg class="hubActivitySvg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="hubLineGradient" x1="0" x2="1"><stop offset="0" stop-color="#24d7ff"/><stop offset="1" stop-color="#7c5cff"/></linearGradient><linearGradient id="hubAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#24d7ff" stop-opacity=".19"/><stop offset="1" stop-color="#7c5cff" stop-opacity="0"/></linearGradient></defs><polygon class="hubActivityArea" points="${area}"/><polyline class="hubActivityLine" points="${line}"/><g class="hubActivityDots">${dots}</g></svg>`;
    }
    function markActivity(weight=1){state.activity[state.activity.length-1]+=weight;renderActivity();setLiveState(true)}
    setInterval(()=>{state.activity.shift();state.activity.push(0);renderActivity()},1000);

    function setLiveState(active){
        [byId("creatorHubLiveDot"),byId("hubSidebarLiveDot"),byId("hubSystemTikTok")].forEach(el=>el&&el.classList.toggle("ok",!!active));
        const dot=byId("creatorHubLiveDot");if(dot)dot.classList.toggle("active",!!active);
        const label=byId("creatorHubLiveLabel");if(label)label.textContent=active?"LIVE connecté":"En attente du LIVE";
        const side=byId("hubSidebarLiveText");if(side)side.textContent=active?"TikTok connecté":"TikTok en attente";
        const sys=byId("hubSystemTikTokText");if(sys)sys.textContent=active?"CONNECTÉ":"ATTENTE";
    }

    function addEvent(icon,text){state.events.unshift({icon,text,at:new Date()});state.events=state.events.slice(0,20);const feed=byId("hubEventFeed");if(!feed)return;feed.innerHTML=state.events.map(event=>`<div class="hubEventRow"><span class="hubEventIcon">${event.icon}</span><span>${escapeHtml(event.text)}</span><small>${event.at.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</small></div>`).join("")}

    function rankingHtml(rows,type){
        if(!rows.length)return '<div class="hubEmpty">Aucune donnée pour le moment.</div>';
        const max=Math.max(1,...rows.map(r=>Number(r.value||0)));
        const medals=["♛","Ⅱ","Ⅲ","4","5"];
        return rows.map((r,i)=>`<div class="hubRankRow"><span class="hubRankBadge">${medals[i]||i+1}</span><span class="hubRankAvatar">${escapeHtml(initials(r.user))}</span><span class="hubRankIdentity"><strong>${escapeHtml(r.user)}</strong><small>${type==="gifts"?"donateur LIVE":"likeur LIVE"}</small></span><span class="hubRankValue">${fmt(r.value)} ${type==="gifts"?"●":"♥"}</span><i class="hubRankProgress" style="width:${Math.max(7,Math.round((Number(r.value||0)/max)*100))}%"></i></div>`).join("");
    }
    function renderTopGifters(){const el=byId("hubTopGifters");if(!el)return;const rows=Object.entries(state.topGifters).sort((a,b)=>Number(b[1])-Number(a[1])).slice(0,5).map(([user,value])=>({user,value}));el.innerHTML=rankingHtml(rows,"gifts")}
    function renderTopLikes(){const el=byId("hubTopLikes");if(!el)return;const ranking=Array.isArray(state.topLikes)?state.topLikes.slice(0,5):[];const rows=ranking.map(row=>{const user=Array.isArray(row)?row[0]:row.user;const info=Array.isArray(row)?row[1]:row;return {user,value:Number(info?.likes||0)}});el.innerHTML=rows.length?rankingHtml(rows,"likes"):'<div class="hubEmpty">Le classement apparaîtra pendant le LIVE.</div>'}
    function renderAnalytics(){const map={hubAnalyticsCoins:fmt(state.coins),hubAnalyticsGifters:fmt(Object.keys(state.topGifters||{}).length),hubAnalyticsGiftEvents:fmt(state.gifts),hubAnalyticsLikes:fmt(state.likes)};Object.entries(map).forEach(([id,value])=>{const el=byId(id);if(el)el.textContent=value})}

    async function refreshRemoteData(){
        try{const statsRes=await fetch("/stats",{cache:"no-store"});if(statsRes.ok){const stats=await statsRes.json();state.topGifters=stats.topGifters||state.topGifters;const history=Array.isArray(stats.giftHistory)?stats.giftHistory:[];state.gifts=Math.max(state.gifts,history.length);state.coins=Math.max(state.coins,Object.values(state.topGifters).reduce((sum,v)=>sum+Number(v||0),0));renderTopGifters();updateMetrics()}}catch(error){console.log("Creator Hub: stats indisponibles",error?.message||error)}
        try{const likesRes=await fetch("/top-likes/status",{cache:"no-store"});if(likesRes.ok){const data=await likesRes.json();state.topLikes=data.ranking||[];renderTopLikes()}}catch(error){console.log("Creator Hub: top likes indisponible",error?.message||error)}
    }

    function hookSocket(){
        if(typeof socket==="undefined"||!socket?.on)return;
        socket.on("gift",data=>{const coins=Number(data?.diamonds||0);state.gifts+=1;state.coins+=coins;if(data?.user)state.topGifters[data.user]=Number(state.topGifters[data.user]||0)+coins;addEvent("✦",`${data?.user||"Utilisateur"} a envoyé ${data?.gift||"un cadeau"}${coins?` (+${coins} pièces)`:""}`);markActivity(Math.max(1,Math.min(8,coins||1)));renderTopGifters();updateMetrics()});
        socket.on("like",data=>{state.likes=Number(data?.totalLikes??data?.likes??state.likes);addEvent("♥",`${data?.user||"Le LIVE"} a reçu des likes`);markActivity(1);updateMetrics();setTimeout(refreshRemoteData,250)});
        socket.on("follow",data=>{state.follows+=1;addEvent("★",`${data?.user||"Un viewer"} vient de suivre`);markActivity(2);updateMetrics()});
        socket.on("share",data=>{state.shares+=1;addEvent("↗",`${data?.user||"Un viewer"} a partagé le LIVE`);markActivity(2);updateMetrics()});
        socket.on("chat",data=>{markActivity(1);if(state.events.length<4)addEvent("◉",`${data?.user||"Viewer"}: ${data?.message||"message"}`)});
    }

    setInterval(()=>{const diff=Date.now()-state.startedAt;const h=String(Math.floor(diff/3600000)).padStart(2,"0"),m=String(Math.floor((diff%3600000)/60000)).padStart(2,"0"),s=String(Math.floor((diff%60000)/1000)).padStart(2,"0");const el=byId("hubMetricDuration");if(el)el.textContent=`${h}:${m}:${s}`},1000);
    renderActivity();renderTopGifters();renderTopLikes();updateMetrics();hookSocket();
})();
