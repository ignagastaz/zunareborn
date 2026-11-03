(() => {
  const KEY = 'zunareborn.v2';
  const LEGACY_KEY = 'zunareborn.v1';
  // Fechas calendario locales: sin el desfase UTC y resistentes al horario de verano.
  const dateKey = date => [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  const isoToday = () => dateKey(new Date());
  const localDate = d => new Date(d + 'T12:00:00');
  const addDays = (d,n) => { const result=localDate(d);result.setDate(result.getDate()+n);return dateKey(result); };
  const utcCalendarTime = d => {const [y,m,day]=d.split('-').map(Number);return Date.UTC(y,m-1,day)};
  const daysBetween = (a,b) => Math.round((utcCalendarTime(b)-utcCalendarTime(a))/86400000);
  const categories = {
    fitness:{name:'Físico',icon:'◉',desc:'Entrenamiento, movimiento y cuidado corporal'},
    mind:{name:'Mentalidad',icon:'✧',desc:'Lectura, reflexión y aprendizaje'},
    discipline:{name:'Disciplina',icon:'◇',desc:'Constancia y compromisos personales'},
    productivity:{name:'Productividad',icon:'▤',desc:'Estudio, trabajo y organización'},
    energy:{name:'Energía',icon:'☼',desc:'Descanso, hidratación y recuperación'}
  };
  const defaults = [
    {id:'water',name:'Tomar suficiente agua',category:'energy',xp:10,frequency:'daily',custom:false},
    {id:'move',name:'Mover el cuerpo o entrenar',category:'fitness',xp:20,frequency:'daily',custom:false},
    {id:'learn',name:'Aprender algo durante 20 minutos',category:'mind',xp:20,frequency:'daily',custom:false},
    {id:'plan',name:'Organizar mis prioridades',category:'productivity',xp:10,frequency:'weekdays',custom:false},
    {id:'promise',name:'Cumplir una promesa que me hice',category:'discipline',xp:20,frequency:'daily',custom:false},
    {id:'sleep',name:'Respetar mi descanso',category:'energy',xp:10,frequency:'daily',custom:false}
  ];
  const quotes = [
    'La disciplina es elegir lo que querés más, por encima de lo que querés ahora.',
    'No necesitás motivación todos los días. Necesitás un sistema al que volver.',
    'Un mal día no destruye tu progreso. Abandonar sí puede hacerlo.',
    'La versión que buscás se construye con decisiones pequeñas y repetidas.',
    'No compitas con nadie. Superá la versión de vos que se rendía antes.'
  ];
  const achievements = [
    {id:'first',icon:'✦',name:'Primer paso',copy:'Completá tu primera misión.',test:s=>totalDone(s)>=1},
    {id:'ten',icon:'⚡',name:'En marcha',copy:'Completá 10 misiones.',test:s=>totalDone(s)>=10},
    {id:'streak3',icon:'🔥',name:'Constancia',copy:'Alcanzá una racha de 3 días.',test:s=>s.bestStreak>=3},
    {id:'streak7',icon:'🏆',name:'Una semana',copy:'Alcanzá una racha de 7 días.',test:s=>s.bestStreak>=7},
    {id:'xp1000',icon:'◆',name:'Mil puntos',copy:'Acumulá 1.000 XP.',test:s=>s.xp>=1000},
    {id:'day30',icon:'◌',name:'30 días',copy:'Llegá al día 30 del programa.',test:s=>programDay(s)>=30}
  ];
  function fresh(){return {version:2,onboarded:false,name:'',goal:'balance',mode:'66',startDate:isoToday(),xp:0,streak:0,bestStreak:0,lastActive:null,missions:defaults.map(x=>({...x})),completions:{},journal:{},mood:{},createdAt:isoToday(),weeklyRewards:{}}}
  function load(){
    try{
      const raw=localStorage.getItem(KEY); if(raw) return {...fresh(),...JSON.parse(raw)};
      const old=localStorage.getItem(LEGACY_KEY); if(old){ const l=JSON.parse(old); return {...fresh(),...l,version:2,onboarded:true,missions:(l.missions||defaults).map(m=>({...m,frequency:m.frequency||'daily',custom:m.custom??String(m.id).startsWith('custom-')}))}; }
    }catch(e){}
    return fresh();
  }
  let state=load(), activeFilter='all', selectedMood=null, toastTimer;
  const $=id=>document.getElementById(id);
  const saveRaw=()=>localStorage.setItem(KEY,JSON.stringify(state));
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function programDay(s=state){return Math.max(1,daysBetween(s.startDate,isoToday())+1)}
  function frequencyLabel(f){return ({daily:'Todos los días',weekdays:'Lun–Vie',weekends:'Fin de semana','3x':'3× semana'})[f]||'Todos los días'}
  function dueToday(m,date=isoToday()){
    const d=localDate(date), day=d.getDay();
    if(m.frequency==='weekdays') return day>=1&&day<=5;
    if(m.frequency==='weekends') return day===0||day===6;
    if(m.frequency==='3x') return [1,3,5].includes(day);
    return true;
  }
  function dueMissions(date=isoToday()){return state.missions.filter(m=>!m.archived && dueToday(m,date))}
  function doneIds(date=isoToday()){return state.completions[date]||[]}
  function totalDone(s=state){return Object.values(s.completions||{}).reduce((n,a)=>n+a.length,0)}
  function dayXP(date=isoToday()){return doneIds(date).reduce((n,id)=>n+(state.missions.find(m=>m.id===id)?.xp||0),0)}
  function levelInfo(){const level=Math.floor(state.xp/500)+1,within=state.xp%500;const titles=['El despertar','La construcción','La constancia','La transformación','La disciplina','La evolución','La excelencia','El renacer'];const ranks=['INICIANTE','DISCIPLINADO','CONSTANTE','IMPARABLE','TRANSFORMADO','MAESTRO'];return {level,within,title:titles[Math.min(level-1,titles.length-1)],rank:ranks[Math.min(Math.floor((level-1)/2),ranks.length-1)]}}
  function weekKey(date=isoToday()){const day=(localDate(date).getDay()+6)%7;return addDays(date,-day)}
  function weekDates(){const start=weekKey();return Array.from({length:7},(_,i)=>addDays(start,i))}
  function weeklyCount(){return weekDates().reduce((n,d)=>n+doneIds(d).length,0)}
  function updateStreak(){
    const dates=Object.keys(state.completions).filter(d=>(state.completions[d]||[]).length>0).sort();
    if(!dates.length){state.streak=0;state.bestStreak=Math.max(state.bestStreak||0,0);return}
    const t=isoToday(), y=addDays(t,-1);
    let anchor=dates.includes(t)?t:(dates.includes(y)?y:null); if(!anchor){state.streak=0;return}
    let streak=0, key=anchor;
    while((state.completions[key]||[]).length>0 && streak<10000){streak++;key=addDays(key,-1)}
    state.streak=streak;state.bestStreak=Math.max(state.bestStreak||0,streak);
  }
  function grantWeeklyReward(){
    const key=weekKey();
    // Recompensa única por semana: no se vuelve a otorgar si se desmarca una misión.
    if(weeklyCount()>=20&&!state.weeklyRewards[key]){
      state.weeklyRewards[key]=true;state.xp+=150;showToast('Desafío semanal completado · +150 XP');
    }
  }
  function save(){updateStreak();grantWeeklyReward();saveRaw();render()}
  function showToast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2300)}
  function navigate(view){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+view));document.querySelectorAll('.nav-item').forEach(v=>v.classList.toggle('active',v.dataset.view===view));window.scrollTo({top:0,behavior:'smooth'});if(view==='missions')renderMissions()}
  document.addEventListener('click',e=>{const nav=e.target.closest('[data-view]');if(nav){navigate(nav.dataset.view);return}const close=e.target.closest('[data-close]');if(close) closeModal(close.dataset.close)});
  function render(){
    updateStreak(); const day=programDay(), li=levelInfo(), due=dueMissions(), done=doneIds().filter(id=>due.some(m=>m.id===id)), pct=state.mode==='66'?Math.min(100,Math.round((Math.min(day-1,66)/66)*100)):Math.min(100,Math.round((done.length/Math.max(1,due.length))*100));
    $('topStreak').textContent=state.streak; const initial=(state.name||'Z').trim().charAt(0).toUpperCase();$('avatarInitial').textContent=initial;$('profileAvatar').textContent=initial;$('profileName').textContent=state.name||'Tu perfil';$('profileSince').textContent='Miembro desde '+localDate(state.createdAt).toLocaleDateString('es-AR',{day:'numeric',month:'short'});$('profileLevel').textContent=li.level;$('nameInput').value=state.name||'';$('goalInput').value=state.goal||'balance';
    $('dayNumber').textContent=String(day).padStart(2,'0');$('dayTotal').textContent=state.mode==='66'?'/ 66':'/ ∞';$('programModeLabel').textContent=state.mode==='66'?'PROGRAMA ACTIVO':'MODO PERMANENTE';$('completionPct').textContent=pct+'%';$('mainProgress').style.width=pct+'%';$('progressDays').textContent=state.mode==='66'?Math.min(day-1,66)+' de 66 días transcurridos':'Modo permanente';$('xpLabel').textContent=state.xp+' XP';$('homeXP').textContent=state.xp;$('homeStreak').textContent=state.streak;$('homeDone').textContent=done.length+'/'+due.length;
    $('missionCount').textContent=done.length+' / '+due.length;$('missionProgress').style.width=(due.length?done.length/due.length*100:0)+'%';$('missionXP').textContent='+'+dayXP()+' XP';
    $('levelNumber').textContent=li.level;$('rankName').textContent=li.rank;$('levelTitle').textContent=li.title;$('levelNext').textContent=li.within+' / 500 XP para el próximo nivel';$('levelProgress').style.width=(li.within/500*100)+'%';$('totalCompleted').textContent=totalDone();$('daysActive').textContent=Object.keys(state.completions).filter(k=>(state.completions[k]||[]).length).length;$('bestStreak').textContent=state.bestStreak||0;
    $('modeSetting').textContent=state.mode==='66'?'66 DÍAS':'PERMANENTE';$('modeDescription').textContent=state.mode==='66'?'66 días de enfoque y progreso':'Sin fecha de finalización';$('toggleMode').textContent=state.mode==='66'?'CAMBIAR A MODO PERMANENTE':'VOLVER AL PROGRAMA DE 66 DÍAS';
    $('todayLabel').textContent=new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'}).toUpperCase();$('greeting').textContent=(state.name?state.name+', ':'')+'un día a la vez. Sin excusas, sin perfección.';$('dailyQuote').textContent=quotes[new Date().getDate()%quotes.length];
    const wc=weeklyCount();$('weeklyProgressText').textContent=Math.min(wc,20)+' / 20';$('weeklyProgress').style.width=Math.min(100,wc/20*100)+'%';$('weeklyReward').textContent=state.weeklyRewards[weekKey()]?'RECOMPENSA OBTENIDA':'+150 XP';
    renderPillars();renderMissions();renderActivity();renderAchievements();renderPillarProgress();renderJournal();
  }
  function renderPillars(){const due=dueMissions(),done=doneIds();$('pillarList').innerHTML=Object.entries(categories).map(([key,c])=>{const ms=due.filter(m=>m.category===key),count=ms.filter(m=>done.includes(m.id)).length;return `<div class="pillar-row"><div class="pillar-icon">${c.icon}</div><div class="pillar-main"><b>${c.name}</b><small>${c.desc}</small></div><span class="pillar-value">${count}/${ms.length}</span></div>`}).join('')}
  function renderMissions(){const due=dueMissions(),done=doneIds();let list=due.filter(m=>activeFilter==='all'||(activeFilter==='done'?done.includes(m.id):!done.includes(m.id)));$('missionList').innerHTML=list.length?list.map(m=>{const isDone=done.includes(m.id),c=categories[m.category]||categories.discipline;return `<article class="mission-item ${isDone?'done':''}"><button class="mission-check" data-toggle="${esc(m.id)}" aria-label="${isDone?'Desmarcar':'Completar'}">${isDone?'✓':''}</button><div class="mission-copy"><b>${esc(m.name)}</b><small>${c.name} · ${frequencyLabel(m.frequency)} · ${isDone?'Completada':'Pendiente'}</small></div><span class="mission-xp">+${m.xp} XP</span>${m.custom?`<button class="mission-menu" data-delete="${esc(m.id)}" aria-label="Eliminar">×</button>`:''}</article>`}).join(''):`<div class="empty-state"><b>Todo al día.</b>No hay misiones en esta categoría.</div>`;document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.filter===activeFilter))}
  function renderActivity(){const cells=[];for(let i=29;i>=0;i--){const d=addDays(isoToday(),-i),due=state.missions.filter(m=>!m.archived&&dueToday(m,d)).length,count=doneIds(d).length,level=count===0?'':count>=Math.max(1,due)?'high':'mid';cells.push(`<div class="activity-cell ${level}" title="${d}: ${count}"><span>${localDate(d).getDate()}</span></div>`)}$('activityGrid').innerHTML=cells.join('')}
  function renderAchievements(){$('achievementGrid').innerHTML=achievements.map(a=>{const ok=a.test(state);return `<article class="achievement ${ok?'':'locked'}"><span>${a.icon}</span><b>${a.name}</b><small>${ok?'Desbloqueado':a.copy}</small></article>`}).join('')}
  function renderPillarProgress(){$('pillarProgress').innerHTML=Object.entries(categories).map(([key,c])=>{let due=0,done=0;weekDates().forEach(d=>{const ms=state.missions.filter(m=>!m.archived&&m.category===key&&dueToday(m,d));due+=ms.length;done+=ms.filter(m=>doneIds(d).includes(m.id)).length});const pct=due?Math.round(done/due*100):0;return `<div class="pillar-row"><div class="pillar-icon">${c.icon}</div><div class="pillar-main"><b>${c.name}</b><div class="pillar-bar"><i style="width:${pct}%"></i></div></div><span class="pillar-value">${pct}%</span></div>`}).join('')}
  function renderJournal(){if(document.activeElement!==$('journalInput'))$('journalInput').value=state.journal[isoToday()]||'';selectedMood=state.mood[isoToday()]||null;document.querySelectorAll('#moodRow button').forEach(b=>b.classList.toggle('active',Number(b.dataset.mood)===selectedMood))}
  $('missionFilters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(b){activeFilter=b.dataset.filter;renderMissions()}});
  $('missionList').addEventListener('click',e=>{const t=e.target.closest('[data-toggle]');if(t){const id=t.dataset.toggle,arr=doneIds(),m=dueMissions().find(x=>x.id===id);if(!m)return;const was=arr.includes(id);state.completions[isoToday()]=was?arr.filter(x=>x!==id):[...arr,id];state.xp=Math.max(0,state.xp+(was?-(m?.xp||0):(m?.xp||0)));save();showToast(was?'Misión desmarcada':'Misión completada · +'+(m?.xp||0)+' XP');return}const del=e.target.closest('[data-delete]');if(del&&confirm('¿Archivar esta misión? Ya no aparecerá, pero conservarás tus XP y tu historial.')){const m=state.missions.find(m=>m.id===del.dataset.delete);if(m&&m.custom){m.archived=true;save();showToast('Misión archivada; historial conservado')}}});
  function openModal(id){$(id).classList.add('open');$(id).setAttribute('aria-hidden','false')} function closeModal(id){$(id).classList.remove('open');$(id).setAttribute('aria-hidden','true')}
  document.querySelectorAll('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m&&m.id!=='onboardingModal')closeModal(m.id)}));
  $('addMissionBtn').addEventListener('click',()=>{openModal('missionModal');setTimeout(()=>$('newMissionName').focus(),100)});
  $('saveNewMission').addEventListener('click',()=>{const name=$('newMissionName').value.trim();if(!name){showToast('Escribí un nombre');return}state.missions.push({id:'custom-'+Date.now(),name,category:$('newMissionCategory').value,frequency:$('newMissionFrequency').value,xp:Number($('newMissionXP').value),custom:true});$('newMissionName').value='';closeModal('missionModal');save();showToast('Misión creada')});
  $('moodRow').addEventListener('click',e=>{const b=e.target.closest('[data-mood]');if(b){selectedMood=Number(b.dataset.mood);document.querySelectorAll('#moodRow button').forEach(x=>x.classList.toggle('active',x===b))}});
  $('saveJournal').addEventListener('click',()=>{state.journal[isoToday()]=$('journalInput').value.trim();if(selectedMood)state.mood[isoToday()]=selectedMood;saveRaw();$('journalSaved').textContent='Reflexión guardada.';showToast('Reflexión guardada')});
  $('saveProfile').addEventListener('click',()=>{state.name=$('nameInput').value.trim()||'Usuario';state.goal=$('goalInput').value;save();showToast('Perfil actualizado')});
  $('toggleMode').addEventListener('click',()=>{state.mode=state.mode==='66'?'infinite':'66';save();showToast(state.mode==='66'?'Programa de 66 días activado':'Modo permanente activado')});
  $('restartProgram').addEventListener('click',()=>{if(confirm('¿Reiniciar el contador? Tu historial y XP se conservan.')){state.startDate=isoToday();state.mode='66';save();showToast('Nuevo ciclo iniciado')}});
  $('installHelp').addEventListener('click',()=>openModal('helpModal'));
  $('exportData').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='zunareborn-backup-'+isoToday()+'.json';a.click();URL.revokeObjectURL(url);showToast('Copia exportada')});
  function validateBackup(obj){
    if(!obj || typeof obj!=='object' || Array.isArray(obj) || !Array.isArray(obj.missions) || !obj.completions || typeof obj.completions!=='object' || Array.isArray(obj.completions))throw Error('Formato inválido');
    if(obj.missions.length>5000 || Object.keys(obj.completions).length>20000)throw Error('Copia excesiva');
    if(!obj.missions.every(m=>m&&typeof m.id==='string'&&m.id.length<120&&typeof m.name==='string'&&m.name.length<=100&&Number.isInteger(Number(m.xp))&&Number(m.xp)>=0&&Number(m.xp)<=500))throw Error('Misiones inválidas');
    if(!Object.entries(obj.completions).every(([d,ids])=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Array.isArray(ids)&&ids.length<=5000&&ids.every(id=>typeof id==='string')))throw Error('Historial inválido');
    if(typeof obj.xp!=='number'||!Number.isFinite(obj.xp)||obj.xp<0||obj.xp>100000000)throw Error('XP inválido');
    const clean={...fresh(),...obj,version:2,onboarded:true};
    clean.missions=obj.missions.map(m=>({...m,frequency:['daily','weekdays','weekends','3x'].includes(m.frequency)?m.frequency:'daily',archived:!!m.archived,custom:!!m.custom,xp:Number(m.xp)}));
    clean.name=String(clean.name||'Usuario').slice(0,24);
    clean.journal=(clean.journal&&typeof clean.journal==='object'&&!Array.isArray(clean.journal))?clean.journal:{};
    clean.mood=(clean.mood&&typeof clean.mood==='object'&&!Array.isArray(clean.mood))?clean.mood:{};
    clean.weeklyRewards=(clean.weeklyRewards&&typeof clean.weeklyRewards==='object'&&!Array.isArray(clean.weeklyRewards))?clean.weeklyRewards:{};
    return clean;
  }
  $('importData').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const imported=JSON.parse(await file.text());if(!imported||!Array.isArray(imported.missions)||!imported.completions)throw Error();state=validateBackup(imported);save();showToast('Copia restaurada')}catch{showToast('Archivo inválido')}e.target.value=''});
  $('resetData').addEventListener('click',()=>{if(confirm('¿Borrar todo tu progreso?')&&confirm('Esta acción no se puede deshacer. ¿Continuar?')){state=fresh();saveRaw();render();openModal('onboardingModal')}});
  $('finishOnboarding').addEventListener('click',()=>{state.name=$('onboardingName').value.trim()||'Usuario';state.onboarded=true;save();closeModal('onboardingModal');showToast('Bienvenido a ZUNAREBORN')});
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
  // Si la app permanece abierta durante la medianoche, actualizamos el estado al volver a ella.
  let lastVisibleDay=isoToday();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){const now=isoToday();if(lastVisibleDay!==now){lastVisibleDay=now;render()}}});
  saveRaw();render();if(!state.onboarded)openModal('onboardingModal');
})();
