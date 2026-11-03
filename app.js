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
  let state=load(), activeFilter='all', selectedMood=null, toastTimer, editingMissionId=null, viewedMonth=isoToday().slice(0,7), viewedDate=isoToday(), viewedHabitId=null;
  const $=id=>document.getElementById(id);
  const saveRaw=()=>localStorage.setItem(KEY,JSON.stringify(state));
  // Registrar XP por evento para que editar la dificultad no reescriba el pasado.
  function migrateMissionData(){
    state.completionXP ||= {};
    for(const [date, ids] of Object.entries(state.completions||{})){
      state.completionXP[date] ||= {};
      for(const id of ids) if(state.completionXP[date][id]===undefined)
        state.completionXP[date][id]=state.missions.find(m=>m.id===id)?.xp||0;
    }
    state.missions.forEach(m=>{m.paused=!!m.paused;m.archived=!!m.archived;m.weeklyGoal=Number.isInteger(m.weeklyGoal)?Math.min(7,Math.max(1,m.weeklyGoal)):3;
      if(!Array.isArray(m.days))m.days=[];
    });
  }
  migrateMissionData();
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function programDay(s=state){return Math.max(1,daysBetween(s.startDate,isoToday())+1)}
  function frequencyLabel(f,m){return f==='custom' ? `Días elegidos (${(m?.days||[]).length})` : ({daily:'Todos los días',weekdays:'Lun–Vie',weekends:'Fin de semana','3x':'Lun · Mié · Vie'})[f]||'Todos los días'}
  function dueToday(m,date=isoToday()){
    const d=localDate(date), day=d.getDay();
    if(m.frequency==='custom') return Array.isArray(m.days)&&m.days.includes(day);
    if(m.frequency==='weekdays') return day>=1&&day<=5;
    if(m.frequency==='weekends') return day===0||day===6;
    if(m.frequency==='3x') return [1,3,5].includes(day);
    return true;
  }
  function dueMissions(date=isoToday()){return state.missions.filter(m=>!m.archived && !m.paused && dueToday(m,date))}
  function doneIds(date=isoToday()){return state.completions[date]||[]}
  function totalDone(s=state){return Object.values(s.completions||{}).reduce((n,a)=>n+a.length,0)}
  function dayXP(date=isoToday()){return doneIds(date).reduce((n,id)=>n+(state.completionXP?.[date]?.[id]??state.missions.find(m=>m.id===id)?.xp??0),0)}
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
    renderPillars();renderMissions();renderManageMissions();renderActivity();renderMonthlyCalendar();renderWeeklyInsights();renderHabitHistory();renderAchievements();renderPillarProgress();renderJournal();
  }
  function renderPillars(){const due=dueMissions(),done=doneIds();$('pillarList').innerHTML=Object.entries(categories).map(([key,c])=>{const ms=due.filter(m=>m.category===key),count=ms.filter(m=>done.includes(m.id)).length;return `<div class="pillar-row"><div class="pillar-icon">${c.icon}</div><div class="pillar-main"><b>${c.name}</b><small>${c.desc}</small></div><span class="pillar-value">${count}/${ms.length}</span></div>`}).join('')}
  function weeklyMissionCount(id){return weekDates().filter(d=>doneIds(d).includes(id)).length}
  function renderMissions(){
    const due=dueMissions(),done=doneIds();
    const list=due.filter(m=>activeFilter==='all'||(activeFilter==='done'?done.includes(m.id):!done.includes(m.id)));
    $('missionList').innerHTML=list.length?list.map(m=>{
      const isDone=done.includes(m.id),c=categories[m.category]||categories.discipline;
      return `<article class="mission-item ${isDone?'done':''}"><button class="mission-check" data-toggle="${esc(m.id)}" aria-label="${isDone?'Desmarcar':'Completar'}">${isDone?'✓':''}</button><div class="mission-copy"><b>${esc(m.name)}</b><small>${c.name} · ${frequencyLabel(m.frequency,m)} · ${isDone?'Completada':'Pendiente'}</small></div><span class="mission-xp">+${m.xp} XP</span><button class="mission-menu" data-edit="${esc(m.id)}" aria-label="Editar hábito">✎</button></article>`
    }).join(''):`<div class="empty-state"><b>Todo al día.</b>No hay misiones en esta categoría.</div>`;
    document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.filter===activeFilter));
  }
  function renderManageMissions(){
    const all=state.missions.filter(m=>!m.archived);
    $('habitManagerList').innerHTML=all.map(m=>{
      const c=categories[m.category]||categories.discipline, wc=weeklyMissionCount(m.id), goal=m.weeklyGoal||3;
      return `<article class="manage-habit"><div class="manage-icon">${c.icon}</div><div class="manage-body"><b>${esc(m.name)}</b><small>${frequencyLabel(m.frequency,m)} · ${m.paused?'PAUSADO':c.name}</small><div class="habit-meter"><i style="width:${Math.min(100,Math.round(wc/goal*100))}%"></i></div><small>Objetivo semanal: ${wc}/${goal} días</small></div><button class="text-button" data-edit="${esc(m.id)}" aria-label="Configurar ${esc(m.name)}">Editar</button></article>`;
    }).join('');
    const inactive=state.missions.filter(m=>m.archived);
    $('archivedCount').textContent=inactive.length;
    $('archivedList').innerHTML=inactive.length?inactive.map(m=>`<article class="archived-habit"><span>${esc(m.name)}</span><button class="text-button" data-restore="${esc(m.id)}">Restaurar</button></article>`).join(''):'<p class="micro-note">No tenés hábitos archivados.</p>';
  }
  function renderActivity(){const cells=[];for(let i=29;i>=0;i--){const d=addDays(isoToday(),-i),due=state.missions.filter(m=>!m.archived&&!m.paused&&dueToday(m,d)).length,count=doneIds(d).length,level=count===0?'':count>=Math.max(1,due)?'high':'mid';cells.push(`<div class="activity-cell ${level}" title="${d}: ${count}"><span>${localDate(d).getDate()}</span></div>`)}$('activityGrid').innerHTML=cells.join('')}
  // Estadísticas descriptivas: no reconstruimos metas pasadas a partir de hábitos modificados.
  function monthShift(n){
    const [y,m]=viewedMonth.split('-').map(Number);const d=new Date(y,m-1+n,1,12);
    const target=dateKey(d).slice(0,7), now=isoToday().slice(0,7);
    if(target>now)return;viewedMonth=target;viewedDate=target===now?isoToday():target+'-01';renderMonthlyCalendar();
  }
  function renderMonthlyCalendar(){
    const [year,month]=viewedMonth.split('-').map(Number), first=new Date(year,month-1,1,12), total=new Date(year,month,0,12).getDate();
    const pad=(first.getDay()+6)%7, now=isoToday(), names=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    $('monthLabel').textContent=names[month-1].toUpperCase()+' '+year;$('monthNext').disabled=viewedMonth>=now.slice(0,7);
    const cells=Array.from({length:pad},()=>'<span class="month-blank"></span>');
    for(let day=1;day<=total;day++){
      const d=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const count=doneIds(d).length, future=d>now, selected=d===viewedDate, stateClass=count>=3?'high':count>0?'mid':'';
      cells.push(`<button class="month-day ${stateClass} ${selected?'selected':''}" data-date="${d}" ${future?'disabled':''} aria-label="${day}: ${count} misiones completadas" aria-pressed="${selected}">${day}${count?'<i></i>':''}</button>`);
    }
    $('monthlyGrid').innerHTML=cells.join('');
    const count=doneIds(viewedDate).length, xp=dayXP(viewedDate);
    const text=localDate(viewedDate).toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});
    $('monthDetail').textContent=`${text}: ${count} ${count===1?'misión registrada':'misiones registradas'} · ${xp} XP en misiones.`;
  }
  function renderWeeklyInsights(){
    const dates=weekDates().filter(d=>d<=isoToday()),counts=dates.map(d=>doneIds(d).length);
    const sum=counts.reduce((a,b)=>a+b,0), days=counts.filter(n=>n>0).length, xp=dates.reduce((n,d)=>n+dayXP(d),0), max=Math.max(1,...counts);
    $('weekCompleted').textContent=sum;$('weekDays').textContent=days;$('weekEarnedXP').textContent=xp;
    const labels=['L','M','M','J','V','S','D'];
    $('weekBars').innerHTML=dates.map((d,i)=>`<div class="week-col" title="${d}: ${counts[i]} misiones"><span>${counts[i]}</span><div class="week-track"><i style="height:${counts[i]?Math.max(12,Math.round(counts[i]/max*100)):0}%"></i></div><small>${labels[i]}</small></div>`).join('');
    const msg=days===0?'Todavía no hay registros esta semana. Podés empezar con una misión pequeña.':days>=5?'¡Gran constancia! Registraste actividad en al menos cinco días esta semana.':`Registraste actividad ${days} ${days===1?'día':'días'} esta semana. Cada avance cuenta.`;
    $('weekNarrative').textContent=msg;
  }
  function renderHabitHistory(){
    const select=$('historyHabit'), ids=state.missions;
    if(!ids.length){select.innerHTML='<option>No hay hábitos</option>';$('habit7').textContent='0';$('habit30').textContent='0';$('habitHistoryGrid').innerHTML='';return}
    if(!ids.some(m=>m.id===viewedHabitId))viewedHabitId=ids[0].id;
    select.innerHTML=ids.map(m=>`<option value="${esc(m.id)}" ${m.id===viewedHabitId?'selected':''}>${esc(m.name)}${m.archived?' (archivado)':''}</option>`).join('');
    const dates=Array.from({length:30},(_,i)=>addDays(isoToday(),i-29)), marked=dates.map(d=>doneIds(d).includes(viewedHabitId));
    $('habit7').textContent=marked.slice(-7).filter(Boolean).length;$('habit30').textContent=marked.filter(Boolean).length;
    $('habitHistoryGrid').innerHTML=dates.map((d,i)=>`<span class="habit-day ${marked[i]?'complete':''}" title="${d}: ${marked[i]?'completado':'sin registro'}" aria-label="${d}: ${marked[i]?'completado':'sin registro'}"></span>`).join('');
  }
  $('monthPrev').addEventListener('click',()=>monthShift(-1));$('monthNext').addEventListener('click',()=>monthShift(1));
  $('monthlyGrid').addEventListener('click',e=>{const b=e.target.closest('[data-date]');if(!b)return;viewedDate=b.dataset.date;renderMonthlyCalendar()});
  $('historyHabit').addEventListener('change',e=>{viewedHabitId=e.target.value;renderHabitHistory()});
  function renderAchievements(){$('achievementGrid').innerHTML=achievements.map(a=>{const ok=a.test(state);return `<article class="achievement ${ok?'':'locked'}"><span>${a.icon}</span><b>${a.name}</b><small>${ok?'Desbloqueado':a.copy}</small></article>`}).join('')}
  function renderPillarProgress(){$('pillarProgress').innerHTML=Object.entries(categories).map(([key,c])=>{let due=0,done=0;weekDates().forEach(d=>{const ms=state.missions.filter(m=>!m.archived&&!m.paused&&m.category===key&&dueToday(m,d));due+=ms.length;done+=ms.filter(m=>doneIds(d).includes(m.id)).length});const pct=due?Math.round(done/due*100):0;return `<div class="pillar-row"><div class="pillar-icon">${c.icon}</div><div class="pillar-main"><b>${c.name}</b><div class="pillar-bar"><i style="width:${pct}%"></i></div></div><span class="pillar-value">${pct}%</span></div>`}).join('')}
  function renderJournal(){if(document.activeElement!==$('journalInput'))$('journalInput').value=state.journal[isoToday()]||'';selectedMood=state.mood[isoToday()]||null;document.querySelectorAll('#moodRow button').forEach(b=>b.classList.toggle('active',Number(b.dataset.mood)===selectedMood))}
  $('missionFilters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(b){activeFilter=b.dataset.filter;renderMissions()}});
  $('missionList').addEventListener('click',e=>{
    const t=e.target.closest('[data-toggle]');
    if(t){const id=t.dataset.toggle,arr=doneIds(),m=dueMissions().find(x=>x.id===id);if(!m)return;
      const was=arr.includes(id), date=isoToday();
      state.completions[date]=was?arr.filter(x=>x!==id):[...arr,id];
      state.completionXP[date] ||= {};
      const awarded=was?(state.completionXP[date][id]??m.xp):m.xp;
      if(was)delete state.completionXP[date][id];else state.completionXP[date][id]=m.xp;
      state.xp=Math.max(0,state.xp+(was?-awarded:awarded));save();showToast(was?'Misión desmarcada':'Misión completada · +'+awarded+' XP');return;
    }
    const edit=e.target.closest('[data-edit]');if(edit)openMissionEditor(edit.dataset.edit);
  });
  $('habitManagerList').addEventListener('click',e=>{const b=e.target.closest('[data-edit]');if(b)openMissionEditor(b.dataset.edit)});
  $('archivedList').addEventListener('click',e=>{const b=e.target.closest('[data-restore]');if(!b)return;const m=state.missions.find(x=>x.id===b.dataset.restore);if(m){m.archived=false;m.paused=false;save();showToast('Hábito restaurado')}});
  function openModal(id){$(id).classList.add('open');$(id).setAttribute('aria-hidden','false')} function closeModal(id){$(id).classList.remove('open');$(id).setAttribute('aria-hidden','true')}
  document.querySelectorAll('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m&&m.id!=='onboardingModal')closeModal(m.id)}));
  const scheduleDays=[1,2,3,4,5,6,0];
  function renderDayPicker(selected){document.querySelectorAll('[data-weekday]').forEach(b=>b.classList.toggle('active',selected.includes(Number(b.dataset.weekday))))}
  function pickedDays(){return [...document.querySelectorAll('[data-weekday].active')].map(b=>Number(b.dataset.weekday))}
  $('newMissionFrequency').addEventListener('change',()=>{$('customDaysWrap').hidden=$('newMissionFrequency').value!=='custom'});
  $('customDaysWrap').addEventListener('click',e=>{const b=e.target.closest('[data-weekday]');if(b)b.classList.toggle('active')});
  function openMissionEditor(id=null){
    editingMissionId=id;
    const m=id?state.missions.find(x=>x.id===id):null;if(id&&!m)return;
    $('missionModalTitle').textContent=m?'Editar hábito':'Nuevo hábito';
    $('newMissionName').value=m?.name||'';
    $('newMissionCategory').value=m?.category||'fitness';
    $('newMissionFrequency').value=m?.frequency||'daily';
    $('newMissionXP').value=String([10,20,30].includes(m?.xp)?m.xp:20);
    $('newMissionGoal').value=String(m?.weeklyGoal||3);
    $('customDaysWrap').hidden=$('newMissionFrequency').value!=='custom';
    renderDayPicker(m?.days?.length?m.days:[1,3,5]);
    $('saveNewMission').textContent=m?'GUARDAR CAMBIOS ↗':'CREAR HÁBITO ↗';
    $('missionEditorActions').hidden=!m;
    $('pauseMissionBtn').textContent=m?.paused?'REANUDAR HÁBITO':'PAUSAR HÁBITO';
    openModal('missionModal');
  }
  $('addMissionBtn').addEventListener('click',()=>openMissionEditor());
  $('saveNewMission').addEventListener('click',()=>{
    const name=$('newMissionName').value.trim();if(!name){showToast('Escribí un nombre');return}
    const frequency=$('newMissionFrequency').value,days=frequency==='custom'?pickedDays():[];
    if(frequency==='custom'&&!days.length){showToast('Elegí al menos un día');return}
    const props={name,category:$('newMissionCategory').value,frequency,days,xp:Number($('newMissionXP').value),weeklyGoal:Number($('newMissionGoal').value)};
    if(editingMissionId){const m=state.missions.find(x=>x.id===editingMissionId);if(!m)return;Object.assign(m,props)}
    else state.missions.push({id:'custom-'+Date.now(),...props,custom:true,paused:false,archived:false});
    closeModal('missionModal');save();showToast(editingMissionId?'Hábito actualizado':'Hábito creado');editingMissionId=null;
  });
  $('pauseMissionBtn').addEventListener('click',()=>{const m=state.missions.find(x=>x.id===editingMissionId);if(!m)return;m.paused=!m.paused;closeModal('missionModal');save();showToast(m.paused?'Hábito pausado':'Hábito reanudado')});
  $('archiveMissionBtn').addEventListener('click',()=>{const m=state.missions.find(x=>x.id===editingMissionId);if(!m||!confirm('¿Archivar este hábito? Se conservará su historial y podrás restaurarlo.'))return;m.archived=true;closeModal('missionModal');save();showToast('Hábito archivado')});
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
    if(!obj.missions.every(m=>m&&typeof m.id==='string'&&m.id.length<120&&typeof m.name==='string'&&m.name.length<=100&&Number.isInteger(Number(m.xp))&&Number(m.xp)>=0&&Number(m.xp)<=500&&(!m.days||(Array.isArray(m.days)&&m.days.length<=7&&m.days.every(d=>Number.isInteger(d)&&d>=0&&d<=6)))))throw Error('Misiones inválidas');
    if(!Object.entries(obj.completions).every(([d,ids])=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Array.isArray(ids)&&ids.length<=5000&&ids.every(id=>typeof id==='string')))throw Error('Historial inválido');
    if(typeof obj.xp!=='number'||!Number.isFinite(obj.xp)||obj.xp<0||obj.xp>100000000)throw Error('XP inválido');
    const clean={...fresh(),...obj,version:2,onboarded:true};
    clean.missions=obj.missions.map(m=>({...m,frequency:['daily','weekdays','weekends','3x','custom'].includes(m.frequency)?m.frequency:'daily',archived:!!m.archived,paused:!!m.paused,days:Array.isArray(m.days)?m.days:[],weeklyGoal:Number.isInteger(m.weeklyGoal)&&m.weeklyGoal>=1&&m.weeklyGoal<=7?m.weeklyGoal:3,custom:!!m.custom,xp:Number(m.xp)}));
    clean.name=String(clean.name||'Usuario').slice(0,24);
    clean.journal=(clean.journal&&typeof clean.journal==='object'&&!Array.isArray(clean.journal))?clean.journal:{};
    clean.mood=(clean.mood&&typeof clean.mood==='object'&&!Array.isArray(clean.mood))?clean.mood:{};
    clean.weeklyRewards=(clean.weeklyRewards&&typeof clean.weeklyRewards==='object'&&!Array.isArray(clean.weeklyRewards))?clean.weeklyRewards:{};
    clean.completionXP=(clean.completionXP&&typeof clean.completionXP==='object'&&!Array.isArray(clean.completionXP))?clean.completionXP:{};
    for(const [d,entries] of Object.entries(clean.completionXP)){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!entries||typeof entries!=='object'||Array.isArray(entries))throw Error('Historial de XP inválido');
      for(const [id,xp] of Object.entries(entries))if(id.length>120||!Number.isFinite(xp)||xp<0||xp>500)throw Error('XP histórico inválido');
    }
    // El respaldo importado puede venir de v2.1, sin snapshots.
    clean.missions.forEach(m=>{m.days ||= []});
    return clean;
  }
  $('importData').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const imported=JSON.parse(await file.text());if(!imported||!Array.isArray(imported.missions)||!imported.completions)throw Error();state=validateBackup(imported);migrateMissionData();save();showToast('Copia restaurada')}catch{showToast('Archivo inválido')}e.target.value=''});
  $('resetData').addEventListener('click',()=>{if(confirm('¿Borrar todo tu progreso?')&&confirm('Esta acción no se puede deshacer. ¿Continuar?')){state=fresh();migrateMissionData();saveRaw();render();openModal('onboardingModal')}});
  $('finishOnboarding').addEventListener('click',()=>{state.name=$('onboardingName').value.trim()||'Usuario';state.onboarded=true;save();closeModal('onboardingModal');showToast('Bienvenido a ZUNAREBORN')});
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
  // Si la app permanece abierta durante la medianoche, actualizamos el estado al volver a ella.
  let lastVisibleDay=isoToday();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){const now=isoToday();if(lastVisibleDay!==now){lastVisibleDay=now;render()}}});
  saveRaw();render();if(!state.onboarded)openModal('onboardingModal');
})();
