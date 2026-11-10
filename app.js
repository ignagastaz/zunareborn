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
  function fresh(){return {version:2,onboarded:false,name:'',goal:'balance',mode:'66',startDate:isoToday(),xp:0,streak:0,bestStreak:0,lastActive:null,missions:defaults.map(x=>({...x})),completions:{},journal:{},mood:{},createdAt:isoToday(),weeklyRewards:{},goals:[],nutrition:{pattern:'mixed',weeks:{},notes:'',profile:{},bodyHistory:[]},sport:{primary:'running',weeklyTarget:3,sessions:[]},cognitive:{sessions:[],rewardedDates:[],memorySessions:[],memoryRewardedDates:[],challengeClaimedDates:[]},core:{gender:'male'}}}
  function load(){
    try{
      const raw=localStorage.getItem(KEY); if(raw) return {...fresh(),...JSON.parse(raw)};
      const old=localStorage.getItem(LEGACY_KEY); if(old){ const l=JSON.parse(old); return {...fresh(),...l,version:2,onboarded:true,missions:(l.missions||defaults).map(m=>({...m,frequency:m.frequency||'daily',custom:m.custom??String(m.id).startsWith('custom-')}))}; }
    }catch(e){}
    return fresh();
  }
  let state=load(), activeFilter='all', selectedMood=null, toastTimer, editingMissionId=null, viewedMonth=isoToday().slice(0,7), viewedDate=isoToday(), viewedHabitId=null;
  const $=id=>document.getElementById(id);

  // Nutrición: ideas orientativas, SIN calorías, dietas restrictivas ni datos biométricos.
  const nutritionMenus = {
    mixed:[
      {meals:['Yogur natural con fruta y avena','Arroz con pollo y vegetales','Tortilla con ensalada'],items:['yogur','fruta','avena','arroz','pollo','vegetales','huevos','hojas verdes']},
      {meals:['Tostadas integrales con queso y fruta','Ensalada de lentejas y vegetales','Pescado al horno con papa'],items:['pan integral','queso','fruta','lentejas','vegetales','pescado','papa']},
      {meals:['Avena con leche y banana','Fideos con salsa de tomate y carne magra','Sándwich de verduras y huevo'],items:['avena','leche','banana','fideos','tomate','carne magra','pan','verduras','huevos']},
      {meals:['Yogur con frutos secos y fruta','Tarta de verduras con ensalada','Pollo con batata y brócoli'],items:['yogur','frutos secos','fruta','verduras','masa de tarta','pollo','batata','brócoli']},
      {meals:['Pan integral con palta','Ensalada de arroz y atún','Sopa de verduras con tostadas'],items:['pan integral','palta','arroz','atún','verduras']},
      {meals:['Huevos revueltos con pan','Guiso de lentejas con verduras','Wrap de pollo y vegetales'],items:['huevos','pan','lentejas','verduras','tortillas de trigo','pollo']},
      {meals:['Fruta, yogur y avena','Pasta con verduras y queso','Arroz con huevo y vegetales'],items:['fruta','yogur','avena','pasta','verduras','queso','arroz','huevos']}
    ],
    vegetarian:[
      {meals:['Yogur con fruta y avena','Ensalada de garbanzos y vegetales','Tortilla con espinaca'],items:['yogur','fruta','avena','garbanzos','vegetales','huevos','espinaca']},
      {meals:['Tostadas con queso y tomate','Lentejas con arroz y verduras','Sopa de calabaza y pan integral'],items:['pan integral','queso','tomate','lentejas','arroz','verduras','calabaza']},
      {meals:['Avena con leche y banana','Pasta con tomate y porotos','Omelette con ensalada'],items:['avena','leche','banana','pasta','tomate','porotos','huevos','hojas verdes']},
      {meals:['Fruta y yogur natural','Tarta de verduras','Arroz salteado con tofu y vegetales'],items:['fruta','yogur','masa de tarta','verduras','arroz','tofu']},
      {meals:['Pan integral con palta','Hamburguesa casera de lentejas','Sopa de verduras y queso'],items:['pan integral','palta','lentejas','verduras','queso']},
      {meals:['Huevos y tostadas','Ensalada de quinoa y garbanzos','Fideos con brócoli y queso'],items:['huevos','pan','quinoa','garbanzos','fideos','brócoli','queso']},
      {meals:['Yogur con frutos secos','Arroz con porotos y ensalada','Sandwich de queso y vegetales'],items:['yogur','frutos secos','arroz','porotos','hojas verdes','pan integral','queso','vegetales']}
    ]
  };
  function validNutritionProfile(raw){
    const p=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    const num=(v,min,max)=>v===null||v===''||!Number.isFinite(Number(v))||Number(v)<min||Number(v)>max?null:Number(v);
    return {age:num(p.age,13,110),height:num(p.height,100,250),weight:num(p.weight,25,350),activity:['low','moderate','high'].includes(p.activity)?p.activity:'unspecified',goal:['balance','performance','muscle','habits'].includes(p.goal)?p.goal:'balance'};
  }
  function migrateNutrition(){
    const n=state.nutrition&&typeof state.nutrition==='object'&&!Array.isArray(state.nutrition)?state.nutrition:{};
    state.nutrition={pattern:n.pattern==='vegetarian'?'vegetarian':'mixed',weeks:n.weeks&&typeof n.weeks==='object'&&!Array.isArray(n.weeks)?n.weeks:{},notes:typeof n.notes==='string'?n.notes.slice(0,800):'',profile:validNutritionProfile(n.profile),bodyHistory:Array.isArray(n.bodyHistory)?n.bodyHistory.filter(e=>e&&typeof e.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&Number.isFinite(e.weight)&&e.weight>=25&&e.weight<=350).slice(-365):[]};
  }
  migrateNutrition();
  function nutritionWeekId(){return weekKey()}
  function ensureNutritionWeek(){
    const key=nutritionWeekId();
    const current=state.nutrition.weeks[key];
    if(!current||current.pattern!==state.nutrition.pattern||!Array.isArray(current.indexes)||current.indexes.length!==7){
      state.nutrition.weeks[key]={pattern:state.nutrition.pattern,indexes:[0,1,2,3,4,5,6]};
    }
    return state.nutrition.weeks[key];
  }
  function renderNutrition(){
    const pref=state.nutrition.pattern;
    $('nutritionPattern').value=pref;
    const plan=ensureNutritionWeek(), menu=nutritionMenus[pref];
    const date=nutritionWeekId();
    $('nutritionWeek').innerHTML=plan.indexes.map((index,i)=>{
      const d=addDays(date,i),day=localDate(d).toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'short'});
      const meals=menu[index%menu.length].meals;
      return `<article class="nutrition-day"><header><h3>${esc(day)}</h3><button data-rotate-meal="${i}" aria-label="Cambiar ideas de comida para ${esc(day)}">Cambiar ↻</button></header><div class="nutrition-meals"><div class="nutrition-meal"><span>Desayuno</span><b>${esc(meals[0])}</b></div><div class="nutrition-meal"><span>Almuerzo</span><b>${esc(meals[1])}</b></div><div class="nutrition-meal"><span>Cena</span><b>${esc(meals[2])}</b></div></div></article>`;
    }).join('');
    const ingredients=[...new Set(plan.indexes.flatMap(i=>menu[i%menu.length].items))].sort((a,b)=>a.localeCompare(b,'es'));
    $('nutritionShopping').innerHTML=ingredients.map(item=>`<span>${esc(item)}</span>`).join('');
    if(document.activeElement!==$('nutritionNotes'))$('nutritionNotes').value=state.nutrition.notes;
    renderNutritionProfile();
  }
  function renderNutritionProfile(){
    const p=state.nutrition.profile;
    for(const [id,key] of [['nutritionAge','age'],['nutritionHeight','height'],['nutritionWeight','weight']])if(document.activeElement!==$(id))$(id).value=p[key]??'';
    for(const [id,key] of [['nutritionActivity','activity'],['nutritionGoal','goal']])if(document.activeElement!==$(id))$(id).value=p[key];
    const tips=['Priorizá variedad de alimentos, agua segura y comidas regulares.'];
    if(p.goal==='performance')tips.push('Para entrenar, distribuí comidas y líquidos según el horario y la intensidad de tus sesiones.');
    if(p.goal==='muscle')tips.push('Combiná entrenamiento progresivo, descanso suficiente y fuentes variadas de proteína.');
    if(p.goal==='habits')tips.push('Elegí un hábito sostenible por semana y registrá cómo te sentís.');
    if(p.activity==='high')tips.push('Con actividad alta, prestá atención a la recuperación y a comer suficiente; evitá restricciones improvisadas.');
    if(p.age!==null&&p.age<18)tips.push('Por tu edad, no se generan objetivos de peso ni dietas restrictivas. Consultá con un profesional de nutrición pediátrica para un plan individual.');
    else if(p.age!==null&&p.height!==null&&p.weight!==null)tips.push('Tus medidas están registradas. Por sí solas no permiten indicar calorías o porciones seguras: eso requiere una evaluación individual.');
    $('nutritionGuidance').innerHTML='<strong>Orientación general</strong><ul>'+tips.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>';
  }
  $('nutritionSaveProfile').addEventListener('click',()=>{
    const read=(id,min,max)=>{const v=$(id).value.trim();if(!v)return null;const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error('Revisá los valores de edad, altura y peso');return n};
    try{
      state.nutrition.profile=validNutritionProfile({age:read('nutritionAge',13,110),height:read('nutritionHeight',100,250),weight:read('nutritionWeight',25,350),activity:$('nutritionActivity').value,goal:$('nutritionGoal').value});
      save();showToast('Perfil guardado');
    }catch(e){showToast(e.message)}
  });
  $('nutritionPattern').addEventListener('change',()=>{
    state.nutrition.pattern=$('nutritionPattern').value==='vegetarian'?'vegetarian':'mixed';
    ensureNutritionWeek();save();showToast('Ideas actualizadas');
  });
  $('nutritionWeek').addEventListener('click',e=>{
    const btn=e.target.closest('[data-rotate-meal]');if(!btn)return;
    const i=Number(btn.dataset.rotateMeal);if(!Number.isInteger(i)||i<0||i>6)return;
    const week=ensureNutritionWeek();week.indexes[i]=(week.indexes[i]+1)%7;
    save();showToast('Ideas del día actualizadas');
  });
  $('nutritionRefresh').addEventListener('click',()=>{
    if(!confirm('¿Cambiar las ideas de esta semana? Tus notas se conservarán.'))return;
    const week=ensureNutritionWeek();week.indexes=week.indexes.map(i=>(i+1)%7);save();showToast('Semana reorganizada');
  });
  $('nutritionSaveNotes').addEventListener('click',()=>{
    state.nutrition.notes=$('nutritionNotes').value.slice(0,800);save();showToast('Notas de compras guardadas');
  });

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
  // Datos v2.3 y anteriores: los objetivos empiezan vacíos sin tocar XP ni hábitos.
  if(!Array.isArray(state.goals))state.goals=[];
  state.goals=state.goals.filter(g=>g&&typeof g.id==='string'&&typeof g.title==='string');
  let editingGoalId=null,activeGoalFilter='active';
  // Recordatorios locales: NO prometen notificaciones del sistema con la app cerrada.
  const reminderDefaults=()=>({enabled:false,morningEnabled:true,morningTime:'08:00',eveningEnabled:true,eveningTime:'20:30',goalsEnabled:false,habitTimes:{},delivered:{},inbox:[]});
  const cleanClock=v=>typeof v==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v)?v:null;
  function migrateReminders(){
    const r=state.reminders && typeof state.reminders==='object' && !Array.isArray(state.reminders)?state.reminders:{};
    state.reminders={...reminderDefaults(),...r};
    if(!state.reminders.habitTimes||typeof state.reminders.habitTimes!=='object'||Array.isArray(state.reminders.habitTimes))state.reminders.habitTimes={};
    if(!state.reminders.delivered||typeof state.reminders.delivered!=='object'||Array.isArray(state.reminders.delivered))state.reminders.delivered={};
    if(!Array.isArray(state.reminders.inbox))state.reminders.inbox=[];
    state.reminders.inbox=state.reminders.inbox.filter(x=>x&&typeof x.id==='string'&&typeof x.title==='string'&&typeof x.message==='string').slice(0,80);
  }
  migrateReminders();
  // Módulo deportivo: datos independientes de misiones/XP para evitar recompensas duplicadas.
  const sports={
    running:{name:'Running',icon:'🏃',intro:'Enfoque: progresión gradual, postura relajada y constancia.',drills:['Calentá 5–10 minutos antes de aumentar el ritmo.','Practicá pasos cómodos y mantené hombros relajados.','Alterná sesiones suaves y recuperación.']},
    football:{name:'Fútbol',icon:'⚽',intro:'Enfoque: control de balón, lectura del juego y coordinación.',drills:['Trabajá recepción y pases con ambos perfiles.','Practicá orientación corporal antes de recibir.','En defensa, priorizá posicionamiento y distancia antes de intentar recuperar.']},
    gym:{name:'Gimnasio / fuerza',icon:'🏋️',intro:'Enfoque: técnica, control del movimiento y progresión sostenible.',drills:['Comenzá con cargas que te permitan controlar cada repetición.','Registrá series y sensaciones para progresar de forma gradual.','Dale importancia al descanso y a la movilidad.']},
    cycling:{name:'Ciclismo',icon:'🚴',intro:'Enfoque: constancia, cadencia cómoda y seguridad.',drills:['Revisá frenos, casco y estado de la bicicleta.','Mantené una intensidad que puedas sostener.','Practicá cambios de ritmo breves según tu experiencia.']},
    basketball:{name:'Básquet',icon:'🏀',intro:'Enfoque: manejo de balón, desplazamientos y lectura del espacio.',drills:['Practicá bote controlado con ambas manos.','Trabajá posición defensiva y desplazamientos laterales.','Entrená pases y recepciones en movimiento.']},
    swimming:{name:'Natación',icon:'🏊',intro:'Enfoque: respiración, técnica y control del ritmo.',drills:['Priorizá una respiración cómoda y regular.','Practicá deslizamiento y alineación corporal.','Entrená con supervisión adecuada y respetá la seguridad acuática.']},
    other:{name:'Otro deporte',icon:'🎯',intro:'Elegí una habilidad concreta y registrá tu evolución.',drills:['Definí una habilidad técnica por sesión.','Anotá qué salió bien y qué querés mejorar.','Intercalá trabajo y recuperación para entrenar de forma sostenible.']}
  };
  function migrateSport(){
    const existing=state.sport&&typeof state.sport==='object'&&!Array.isArray(state.sport)?state.sport:{};
    state.sport={primary:sports[existing.primary]?existing.primary:'running',weeklyTarget:Number.isInteger(existing.weeklyTarget)&&existing.weeklyTarget>=1&&existing.weeklyTarget<=7?existing.weeklyTarget:3,sessions:Array.isArray(existing.sessions)?existing.sessions.filter(s=>s&&typeof s.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s.date)&&sports[s.sport]&&Number.isInteger(s.minutes)&&s.minutes>=1&&s.minutes<=720).slice(-2000):[],position:['defender','midfielder','forward','goalkeeper'].includes(existing.position)?existing.position:'defender',focus:existing.focus&&typeof existing.focus==='object'&&!Array.isArray(existing.focus)?existing.focus:{},skillHistory:Array.isArray(existing.skillHistory)?existing.skillHistory.filter(x=>x&&typeof x.sport==='string'&&typeof x.skill==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&Number.isInteger(x.rating)&&x.rating>=1&&x.rating<=5).slice(-1000):[],plan:existing.plan||null};
  }
  migrateSport();
  // Planes semanales orientativos; son independientes del historial de sesiones y XP.
  const planThemes={
    running:[['Técnica y ritmo','Caminata de entrada en calor, trote suave y control de respiración.'],['Resistencia progresiva','Alterná caminata y trote sin buscar velocidad; terminá con vuelta a la calma.'],['Movilidad y constancia','Movilidad suave y sesión cómoda en superficie segura.']],
    football:[['Control y pase','Entrada en calor, pases controlados y recepción orientada.'],['Lectura del juego','Practicá posicionamiento, orientación corporal y decisiones sin oposición intensa.'],['Coordinación con pelota','Conducción, cambios de dirección suaves y vuelta a la calma.']],
    gym:[['Técnica general','Movilidad y práctica de patrones básicos con carga liviana o sin carga.'],['Tren inferior y estabilidad','Sentarse y levantarse con control, bisagra de cadera y estabilidad.'],['Tren superior y postura','Movimientos de empuje, tracción suaves y control postural.']],
    cycling:[['Control y seguridad','Revisión de bicicleta, desplazamiento cómodo y manejo seguro.'],['Cadencia cómoda','Rodaje controlado en entorno seguro, sin exigir velocidad.'],['Constancia aeróbica','Salida suave de duración adaptable y vuelta a la calma.']],
    basketball:[['Control de balón','Entrada en calor y bote con ambas manos.'],['Defensa y desplazamiento','Posición defensiva y desplazamientos laterales de baja intensidad.'],['Pases y lectura','Pases en movimiento, recepción y espacios libres.']],
    swimming:[['Respiración segura','Técnica respiratoria y flotación con supervisión adecuada.'],['Alineación corporal','Deslizamientos controlados en zona segura y práctica técnica suave.'],['Ritmo y coordinación','Series cómodas y recuperación; no entrenes solo/a.']],
    other:[['Técnica básica','Elegí una habilidad y practicá a intensidad cómoda.'],['Coordinación y control','Repetí movimientos controlados y registrá sensaciones.'],['Constancia y revisión','Práctica liviana, revisión de lo aprendido y recuperación.']]
  };
  const planDays={2:[1,4],3:[1,3,5],4:[1,2,4,6],5:[1,2,3,5,6]};
  function migrateTrainingPlan(){
    const p=state.sport.plan;
    if(!p||typeof p!=='object'||Array.isArray(p)){state.sport.plan=null;return;}
    const good=sports[p.sport]&&['beginner','intermediate'].includes(p.level)&&[2,3,4,5].includes(p.frequency)&&typeof p.id==='string';
    if(!good){state.sport.plan=null;return;}
    p.completed=p.completed&&typeof p.completed==='object'&&!Array.isArray(p.completed)?p.completed:{};
    p.completed=Object.fromEntries(Object.entries(p.completed).filter(([key,val])=>/^\d{4}-\d{2}-\d{2}$/.test(key)&&val===true).slice(-365));
    state.sport.plan=p;
  }
  migrateTrainingPlan();
  function planSessions(){
    const p=state.sport.plan;if(!p)return [];
    const monday=weekKey();
    return planDays[p.frequency].map((dow,i)=>{
      const date=addDays(monday,dow-1),theme=planThemes[p.sport][i%3];
      return {date,title:theme[0],description:theme[1],completed:!!p.completed[date]};
    });
  }
  function renderTrainingPlan(){
    const p=state.sport.plan;
    $('planSportName').textContent=sports[state.sport.primary].name;
    if(!p){$('trainingPlanContent').innerHTML='<div class="empty-state"><b>Tu plan empieza acá.</b>Elegí nivel y frecuencia para crear una semana de prácticas.</div>';$('trainingPlanHistory').innerHTML='';return;}
    $('planLevel').value=p.level;$('planFrequency').value=String(p.frequency);
    const s=planSessions(),count=s.filter(x=>x.completed).length;
    $('trainingPlanContent').innerHTML=`<div class="plan-progress"><div><b>Plan: ${esc(sports[p.sport].name)} · ${p.level==='beginner'?'Inicial':'Intermedio'}</b><small>${count} de ${s.length} prácticas marcadas esta semana</small></div><span>${Math.round(count/s.length*100)}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${count/s.length*100}%"></div></div><div class="plan-session-list">${s.map((item,i)=>{const future=item.date>isoToday()||item.date<p.created;return `<article class="plan-session"><button class="plan-session-check" data-plan-day="${item.date}" ${future?'disabled':''} aria-label="${item.completed?'Desmarcar':'Marcar'} práctica del ${item.date}">${item.completed?'✓':i+1}</button><div><b>${esc(item.title)}</b><small>${esc(localDate(item.date).toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'short'}))}${future?' · Próximamente':''}</small><p>${esc(item.description)}</p></div></article>`}).join('')}</div><p class="micro-note">Si registrás un entrenamiento en el apartado de actividad, la práctica del plan no se marca sola. Podés marcarla cuando realmente la hayas realizado.</p>`;
    const countAll=Object.values(p.completed).filter(Boolean).length;
    $('trainingPlanHistory').innerHTML=`<div class="plan-history-box"><span>Prácticas marcadas en este plan</span><b>${countAll}</b></div>`;
  }
  $('createTrainingPlan').addEventListener('click',()=>{
    const level=$('planLevel').value, frequency=Number($('planFrequency').value), sport=state.sport.primary;
    if(!['beginner','intermediate'].includes(level)||!planDays[frequency])return;
    if(state.sport.plan&&!confirm('¿Actualizar el plan? Se borrarán las marcas del plan anterior. Tus entrenamientos, XP y hábitos se conservarán.'))return;
    state.sport.plan={id:'plan-'+Date.now(),sport,level,frequency,created:isoToday(),completed:{}};
    save();showToast('Plan semanal creado');
  });
  $('trainingPlanContent').addEventListener('click',e=>{
    const button=e.target.closest('[data-plan-day]');if(!button||!state.sport.plan)return;
    const day=button.dataset.planDay;
    if(day>isoToday()||day<state.sport.plan.created||!planSessions().some(s=>s.date===day))return;
    if(state.sport.plan.completed[day])delete state.sport.plan.completed[day];else state.sport.plan.completed[day]=true;
    save();showToast('Práctica actualizada');
  });

  // Biblioteca introductoria de habilidades. No analiza vídeos ni diagnostica técnica deportiva.
  const skillLibrary={
    running:[['posture','Postura y zancada',['Caminar unos minutos para entrar en calor.','Trotar a ritmo cómodo, hombros sueltos y mirada hacia adelante.','Observar si mantenés una respiración natural sin forzar el ritmo.']],['pacing','Control del ritmo',['Empezar suave y aumentar sólo si podés hablar con comodidad.','Observar sensaciones al cambiar ligeramente el ritmo.','Terminar con una vuelta a la calma.']],['endurance','Constancia aeróbica',['Elegir un trayecto seguro y conocido.','Alternar caminata y trote según tu experiencia.','Anotar cómo te sentiste y ajustar la próxima sesión.']]],
    football:[['position','Posicionamiento',['Identificar tu referencia: compañero, rival y pelota.','Practicar la orientación corporal antes de recibir o defender.','Pausar y observar dónde hay espacio libre.']],['passing','Pase y recepción',['Practicar pases cortos con ambos pies.','Recibir mirando hacia el próximo espacio.','Priorizar precisión antes de velocidad.']],['decision','Lectura del juego',['Antes de recibir, mirar al menos dos opciones.','Practicar una decisión simple en poco espacio.','Anotar cuándo fue mejor pasar, avanzar o mantener posición.']]],
    gym:[['technique','Técnica de movimiento',['Elegir un ejercicio conocido y carga fácil de controlar.','Realizar movimientos lentos sin perder estabilidad.','Descansar y registrar qué parte necesitás mejorar.']],['mobility','Movilidad',['Realizar movilidad suave de las articulaciones involucradas.','Evitar rangos dolorosos.','Observar si el movimiento se siente más cómodo.']],['progression','Progresión',['Registrar una serie realizada con buena técnica.','Priorizar regularidad y recuperación.','Modificar una sola variable a la vez cuando corresponda.']]],
    cycling:[['cadence','Ritmo de pedaleo',['Revisar bicicleta, casco y entorno.','Mantener una cadencia cómoda en terreno seguro.','Observar cuándo necesitás bajar la intensidad.']],['handling','Control y seguridad',['Practicar arranque y frenado en zona segura.','Mantener distancia y anticipar obstáculos.','No practicar maniobras riesgosas en circulación.']]],
    basketball:[['handling','Control del balón',['Botar con ambas manos a una altura cómoda.','Mirar hacia adelante cuando sea posible.','Practicar cambios simples de dirección con control.']],['defense','Defensa y desplazamiento',['Practicar postura estable y desplazamientos laterales suaves.','Mantener la vista en el atacante y el espacio.','Evitar cruzar los pies en desplazamientos cortos cuando dificulte el equilibrio.']],['passing','Pases',['Practicar precisión con un compañero o pared segura.','Moverse a un espacio libre después de pasar.','Observar el momento de la recepción.']]],
    swimming:[['breathing','Respiración',['Practicar la respiración con supervisión apropiada.','Priorizar comodidad y seguridad acuática.','No hacer ejercicios de apnea ni hiperventilación.']],['alignment','Alineación corporal',['Practicar una postura alargada sin tensión.','Observar la comodidad del deslizamiento.','Pedir corrección técnica a un instructor calificado.']]],
    other:[['consistency','Constancia técnica',['Elegir un gesto deportivo sencillo.','Practicarlo en un entorno seguro y controlado.','Registrar una observación concreta al terminar.']],['coordination','Coordinación',['Empezar con movimientos lentos.','Priorizar precisión y equilibrio.','Aumentar complejidad sólo cuando estés cómodo.']]]
  };
  const footballPositionNotes={defender:'Defensa: ubicáte entre rival y arco, mantené una distancia controlable y coordiná con la línea defensiva.',midfielder:'Mediocampo: escaneá el entorno antes de recibir y buscá líneas de pase.',forward:'Ataque: observá los espacios disponibles y coordiná desmarques sin perder el equilibrio.',goalkeeper:'Arco: trabajá posición de base y comunicación; acciones de caída, salto o impacto requieren entrenador y entorno seguro.'};
  function currentSkillOptions(){return skillLibrary[state.sport.primary]||skillLibrary.other}
  function renderSportSkills(){
    const sport=state.sport.primary, choices=currentSkillOptions(), preferred=state.sport.focus[sport];
    const selected=choices.some(x=>x[0]===preferred)?preferred:choices[0][0];
    const select=$('sportSkill');select.innerHTML=choices.map(([id,label])=>`<option value="${id}">${esc(label)}</option>`).join(''); select.value=selected;
    $('sportPositionWrap').hidden=sport!=='football';$('sportPosition').value=state.sport.position;
    renderSkillPlan();renderSkillHistory();
  }
  function renderSkillPlan(){
    const entry=currentSkillOptions().find(x=>x[0]===$('sportSkill').value)||currentSkillOptions()[0];
    const position=state.sport.primary==='football'?'⚽ '+footballPositionNotes[state.sport.position]:'';
    $('sportSkillPlan').innerHTML=`<h3>${esc(entry[1])}</h3>${position?`<p class="skill-position">${esc(position)}</p>`:''}<ol>${entry[2].map(x=>`<li>${esc(x)}</li>`).join('')}</ol><small>Guía general orientativa · Adaptá la práctica a tu experiencia y seguridad.</small>`;
  }
  function renderSkillHistory(){
    const entries=state.sport.skillHistory.filter(x=>x.sport===state.sport.primary).slice(-8).reverse();
    $('sportSkillHistory').innerHTML=entries.length?entries.map(x=>`<article class="skill-entry"><div><b>${esc((skillLibrary[x.sport]||[]).find(s=>s[0]===x.skill)?.[1]||x.skill)}</b><small>${esc(x.date)} · Autoevaluación ${x.rating}/5</small>${x.note?`<p>${esc(x.note)}</p>`:''}</div></article>`).join(''):'<div class="empty-state">Todavía no registraste evaluaciones de este deporte.</div>';
  }
  $('sportSkill').addEventListener('change',()=>{state.sport.focus[state.sport.primary]=$('sportSkill').value;saveRaw();renderSkillPlan()});
  $('sportPosition').addEventListener('change',()=>{state.sport.position=$('sportPosition').value;saveRaw();renderSkillPlan()});
  $('saveSkillAssessment').addEventListener('click',()=>{
    const rating=Number($('sportSkillRating').value),note=$('sportSkillNote').value.trim();
    if(!Number.isInteger(rating)||rating<1||rating>5||note.length>180)return showToast('Revisá tu evaluación');
    state.sport.skillHistory.push({date:isoToday(),sport:state.sport.primary,skill:$('sportSkill').value,rating,note});
    state.sport.skillHistory=state.sport.skillHistory.slice(-1000);$('sportSkillNote').value='';save();showToast('Evolución registrada');
  });
  function weeklySportSessions(){const w=weekDates();return state.sport.sessions.filter(s=>w.includes(s.date));}
  // Análisis deportivo basado sólo en sesiones reales y semanas calendario locales.
  function sportWeekStats(){
    const currentWeek=weekKey();
    return [3,2,1,0].map(offset=>{
      const start=addDays(currentWeek,-7*offset),end=addDays(start,6);
      const entries=state.sport.sessions.filter(s=>s.date>=start&&s.date<=end);
      return {start,end,minutes:entries.reduce((n,s)=>n+s.minutes,0),sessions:entries.length};
    });
  }
  function renderSportInsights(){
    const weeks=sportWeekStats(),max=Math.max(1,...weeks.map(w=>w.minutes));
    $('trainingTrend').innerHTML=weeks.map((w,i)=>{
      const label=i===3?'Esta semana':i===2?'Anterior':`${i===0?'Hace 3':'Hace 2'} sem.`;
      const pct=Math.round(w.minutes/max*100);
      return `<div class="trend-week" title="${w.start} a ${w.end}: ${w.sessions} sesiones, ${w.minutes} minutos"><span class="trend-minutes">${w.minutes} min</span><div class="trend-bar-wrap"><div class="trend-bar" style="height:${Math.max(4,pct)}%"></div></div><small>${label}</small></div>`;
    }).join('');
    const totalMinutes=weeks.reduce((n,w)=>n+w.minutes,0),totalSessions=weeks.reduce((n,w)=>n+w.sessions,0);
    $('sportMonthMinutes').textContent=totalMinutes.toLocaleString('es-AR');
    $('sportMonthSessions').textContent=totalSessions;
    const current=weeks[3],previous=weeks[2];
    $('sportWeekChange').textContent=previous.minutes>0?`${current.minutes>=previous.minutes?'+':''}${Math.round((current.minutes-previous.minutes)/previous.minutes*100)}%`:'—';
    const note=totalSessions===0?'Todavía no hay entrenamientos registrados en estas cuatro semanas. Empezá con una sesión que se adapte a tu nivel.':current.sessions===0?'Esta semana todavía no registraste sesiones. Una pausa también puede formar parte del plan.':previous.minutes===0?'Ya hay actividad registrada esta semana. A medida que acumules semanas, podrás comparar tus avances.':current.minutes>previous.minutes*1.5?'Esta semana llevás más minutos que la anterior. No aumentes la intensidad sólo por mejorar el número: priorizá recuperación y técnica.': 'Vas construyendo un historial útil. Compará tus sesiones con tus sensaciones, no sólo con los minutos.';
    $('sportInsightMessage').textContent=note;
  }
  function renderSport(){
    const chosen=sports[state.sport.primary],sessions=weeklySportSessions(),minutes=sessions.reduce((n,s)=>n+s.minutes,0);
    $('sportChoice').value=state.sport.primary;$('sportWeeklyTarget').value=String(state.sport.weeklyTarget);
    $('sportIcon').textContent=chosen.icon;$('sportName').textContent=chosen.name;$('sportDescription').textContent='Tu disciplina principal';
    $('sportSessions').textContent=sessions.length;$('sportMinutes').textContent=minutes;$('sportTargetProgress').textContent=sessions.length+'/'+state.sport.weeklyTarget;
    $('homeSport').textContent=chosen.icon+' '+chosen.name;
    $('homeSportSummary').textContent=sessions.length+' '+(sessions.length===1?'sesión registrada':'sesiones registradas')+' esta semana · '+minutes+' min';
    $('sportGuideIntro').textContent=chosen.intro;
    $('sportDrills').innerHTML=chosen.drills.map((t,i)=>`<div class="sport-drill"><span>${String(i+1).padStart(2,'0')}</span><p>${esc(t)}</p></div>`).join('');
    renderSportSkills();renderTrainingPlan();renderSportInsights();
    const sorted=[...state.sport.sessions].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)).slice(0,20);
    $('trainingList').innerHTML=sorted.length?sorted.map(s=>`<article class="training-entry"><span class="training-entry-icon">${sports[s.sport].icon}</span><div><b>${esc(sports[s.sport].name)} · ${s.minutes} min</b><small>${esc(s.date)} · ${['','Suave','Moderado','Intenso'][s.effort]||'Moderado'}</small>${s.notes?`<p>${esc(s.notes)}</p>`:''}</div><button data-training-edit="${esc(s.id)}" class="training-edit" aria-label="Editar sesión">Editar</button><button data-training-delete="${esc(s.id)}" class="training-delete" aria-label="Borrar sesión">×</button></article>`).join(''):'<div class="empty-state"><b>Tu próximo entrenamiento empieza acá.</b>Registrá una sesión para ver tu historial deportivo.</div>';
  }
  $('saveSportPreferences').addEventListener('click',()=>{const id=$('sportChoice').value,target=Number($('sportWeeklyTarget').value);if(!sports[id]||!Number.isInteger(target)||target<1||target>7)return;state.sport.primary=id;state.sport.weeklyTarget=target;save();showToast('Disciplina guardada');});
  let editingTrainingId=null;
  $('openTrainingEditor').addEventListener('click',()=>{editingTrainingId=null;$('trainingModalTitle').textContent='Registrar entrenamiento';$('saveTraining').textContent='GUARDAR ENTRENAMIENTO ↗';$('trainingDate').value=isoToday();$('trainingDate').max=isoToday();$('trainingSport').value=state.sport.primary;$('trainingDuration').value='30';$('trainingEffort').value='2';$('trainingNotes').value='';openModal('trainingModal')});
  $('saveTraining').addEventListener('click',()=>{const date=$('trainingDate').value,sport=$('trainingSport').value,minutes=Number($('trainingDuration').value),effort=Number($('trainingEffort').value),notes=$('trainingNotes').value.trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>isoToday()||date<'2000-01-01'||!sports[sport]||!Number.isInteger(minutes)||minutes<1||minutes>720||![1,2,3].includes(effort)||notes.length>280){showToast('Revisá la sesión y su fecha');return}if(editingTrainingId){const item=state.sport.sessions.find(s=>s.id===editingTrainingId);if(!item){showToast('No se encontró la sesión');return;}Object.assign(item,{date,sport,minutes,effort,notes});}else{state.sport.sessions.push({id:'session-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),date,sport,minutes,effort,notes});}editingTrainingId=null;closeModal('trainingModal');save();showToast('Entrenamiento guardado');});
  $('trainingList').addEventListener('click',e=>{
    const edit=e.target.closest('[data-training-edit]');
    if(edit){const s=state.sport.sessions.find(x=>x.id===edit.dataset.trainingEdit);if(!s)return;editingTrainingId=s.id;$('trainingModalTitle').textContent='Editar entrenamiento';$('saveTraining').textContent='GUARDAR CAMBIOS ↗';$('trainingDate').value=s.date;$('trainingDate').max=isoToday();$('trainingSport').value=s.sport;$('trainingDuration').value=String(s.minutes);$('trainingEffort').value=String(s.effort||2);$('trainingNotes').value=s.notes||'';openModal('trainingModal');return;}
    const b=e.target.closest('[data-training-delete]');if(!b)return;if(!confirm('¿Eliminar este registro de entrenamiento?'))return;state.sport.sessions=state.sport.sessions.filter(x=>x.id!==b.dataset.trainingDelete);save();showToast('Registro eliminado');
  });
  function currentClock(){const d=new Date();return [String(d.getHours()).padStart(2,'0'),String(d.getMinutes()).padStart(2,'0')].join(':')}
  function createReminder(id,title,message,now){
    const r=state.reminders;
    if(r.delivered[id])return false;
    r.delivered[id]=isoToday();
    r.inbox.unshift({id,title,message,time:now.toLocaleString('es-AR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}),read:false});
    r.inbox=r.inbox.slice(0,80);
    return true;
  }
  function checkReminders(){
    if(!state.onboarded || !state.reminders.enabled || document.hidden)return;
    const r=state.reminders, day=isoToday(), clock=currentClock(), due=dueMissions(), pending=due.filter(m=>!doneIds().includes(m.id));
    let changed=false;
    if(r.morningEnabled&&cleanClock(r.morningTime)&&clock>=r.morningTime&&pending.length){
      changed=createReminder(day+'-morning','Empezá con una victoria',`Tenés ${pending.length} ${pending.length===1?'misión pendiente':'misiones pendientes'} para hoy.`,new Date())||changed;
    }
    if(r.eveningEnabled&&cleanClock(r.eveningTime)&&clock>=r.eveningTime&&pending.length){
      changed=createReminder(day+'-evening','Cerrá tu día',`Te ${pending.length===1?'queda':'quedan'} ${pending.length} ${pending.length===1?'misión':'misiones'} por completar.`,new Date())||changed;
    }
    if(r.goalsEnabled&&clock>='12:00'){
      const active=(state.goals||[]).filter(g=>!g.archived&&!g.awarded);
      if(active.length)changed=createReminder(day+'-goals','Tus objetivos siguen en marcha',`Tenés ${active.length} ${active.length===1?'objetivo activo':'objetivos activos'} para seguir avanzando.`,new Date())||changed;
    }
    for(const m of pending){
      const t=r.habitTimes[m.id];
      if(cleanClock(t)&&clock>=t){
        changed=createReminder(day+'-habit-'+m.id,'Misión pendiente',m.name,new Date())||changed;
      }
    }
    // Evitar que el historial de avisos crezca sin límite con los días.
    if(Object.keys(r.delivered).length>600){const cutoff=addDays(day,-45);for(const k of Object.keys(r.delivered))if(r.delivered[k]<cutoff)delete r.delivered[k];}
    if(changed){saveRaw();renderReminderInbox();showToast('Tenés nuevos avisos · Tocá la campana');}
  }
  function renderReminderInbox(){
    const r=state.reminders, unread=r.inbox.filter(x=>!x.read).length,badge=$('reminderBadge');
    badge.hidden=unread===0;badge.textContent=unread>9?'9+':unread;
    $('reminderInboxList').innerHTML=r.inbox.length?r.inbox.slice(0,30).map(x=>`<article class="reminder-entry ${x.read?'read':''}"><b>${esc(x.title)}</b><small>${esc(x.time||'')}</small><p>${esc(x.message)}</p></article>`).join(''):'<p class="setting-description">Todavía no hay avisos. Configuralos desde Perfil.</p>';
  }
  function renderReminderSettings(){
    const r=state.reminders;
    if(document.activeElement && document.activeElement.closest && document.activeElement.closest('#reminderSettings'))return;
    $('remindersEnabled').checked=!!r.enabled;$('morningEnabled').checked=!!r.morningEnabled;
    $('eveningEnabled').checked=!!r.eveningEnabled;$('goalsEnabled').checked=!!r.goalsEnabled;
    $('morningTime').value=cleanClock(r.morningTime)||'08:00';$('eveningTime').value=cleanClock(r.eveningTime)||'20:30';
    $('reminderOptions').style.opacity=r.enabled?'1':'.55';
    const list=state.missions.filter(m=>!m.archived);
    $('habitReminderList').innerHTML=list.length?list.map(m=>`<label class="reminder-habit-row"><span>${esc(m.name)}</span><input type="time" aria-label="Aviso para ${esc(m.name)}" data-habit-reminder="${esc(m.id)}" value="${cleanClock(r.habitTimes[m.id])||''}"></label>`).join(''):'<p class="setting-description">Creá un hábito para agregarle horario.</p>';
  }
  $('openReminders').addEventListener('click',()=>{checkReminders();renderReminderInbox();openModal('reminderModal');});
  $('showReminderInbox').addEventListener('click',()=>{checkReminders();renderReminderInbox();openModal('reminderModal');});
  $('markRemindersRead').addEventListener('click',()=>{state.reminders.inbox.forEach(x=>x.read=true);saveRaw();renderReminderInbox();showToast('Avisos marcados como leídos');});
  $('goReminderSettings').addEventListener('click',()=>{closeModal('reminderModal');navigate('profile');$('reminderSettings').scrollIntoView({behavior:'smooth',block:'start'});});
  $('previewReminder').addEventListener('click',()=>{showToast('🔔 Ejemplo: ¡Hoy podés sumar una victoria!');});
  $('saveReminders').addEventListener('click',()=>{
    const morning=$('morningTime').value,evening=$('eveningTime').value;
    if(!cleanClock(morning)||!cleanClock(evening)){showToast('Elegí horarios válidos');return;}
    const times={};for(const el of document.querySelectorAll('[data-habit-reminder]')){if(el.value){if(!cleanClock(el.value)){showToast('Revisá el horario del hábito');return;}times[el.dataset.habitReminder]=el.value;}}
    state.reminders={...state.reminders,enabled:$('remindersEnabled').checked,morningEnabled:$('morningEnabled').checked,morningTime:morning,eveningEnabled:$('eveningEnabled').checked,eveningTime:evening,goalsEnabled:$('goalsEnabled').checked,habitTimes:times};
    saveRaw();checkReminders();showToast('Recordatorios guardados');
  });

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
  function renderNextMission(){
    const due=dueMissions(), done=new Set(doneIds()), pending=due.find(m=>!done.has(m.id));
    const name=$('nextMissionTitle'), detail=$('nextMissionDetail');
    if(!name||!detail)return;
    if(!due.length){name.textContent='Un día para recuperar energía';detail.textContent='Hoy no hay misiones programadas.';return;}
    if(!pending){name.textContent='¡Todas tus misiones completadas!';detail.textContent='Disfrutá tu progreso y descansá.';return;}
    name.textContent=pending.name;detail.textContent='+'+pending.xp+' XP · '+(categories[pending.category]?.name||'Hábito');
  }
  function jumpToSection(spec){
    const [view,id]=spec.split(':');
    if(!['movement','home','missions','goals','progress','profile','lab'].includes(view))return;
    navigate(view);
    if(id){const target=$(id);if(target){requestAnimationFrame(()=>target.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));}}
  }
  function navigate(view){if(!document.getElementById('view-'+view))return;document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+view));document.querySelectorAll('.nav-item').forEach(v=>{const active=v.dataset.view===view;v.classList.toggle('active',active);if(active)v.setAttribute('aria-current','page');else v.removeAttribute('aria-current')});window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});if(view==='missions')renderMissions();if(view==='lab')renderLab()}
  document.addEventListener('click',e=>{const shortcut=e.target.closest('[data-jump]');if(shortcut){jumpToSection(shortcut.dataset.jump);return}const nav=e.target.closest('[data-view]');if(nav){navigate(nav.dataset.view);return}const close=e.target.closest('[data-close]');if(close) closeModal(close.dataset.close)});
  function renderBodyTrend(){
    const form=$('bodyEntryForm'), notice=$('bodyTrendNotice'), chart=$('bodyTrendChart'), history=$('bodyTrendHistory');
    if(!form)return;
    const age=state.nutrition.profile.age, allowed=age!==null&&age>=18;
    form.hidden=!allowed;
    $('bodyEntryDate').max=isoToday();
    if(!$('bodyEntryDate').value)$('bodyEntryDate').value=isoToday();
    if(!allowed){notice.textContent=age===null?'Para usar el registro opcional, primero indicá tu edad en Movimiento → Nutrición.':'Este registro de peso no está disponible para menores de 18 años.';chart.replaceChildren();history.replaceChildren();return;}
    const entries=state.nutrition.bodyHistory.slice().sort((a,b)=>a.date.localeCompare(b.date));
    notice.textContent=entries.length?'Mostramos tus registros, sin evaluar si un cambio de peso es bueno o malo.':'Todavía no registraste medidas. Es opcional.';
    const last=entries.slice(-12);const min=Math.min(...last.map(x=>x.weight)),max=Math.max(...last.map(x=>x.weight));
    chart.setAttribute('aria-label',last.length?last.map(x=>x.date+': '+x.weight+' kilogramos').join('; '):'Sin registros de peso');
    chart.innerHTML=last.length?last.map(e=>{const pct=max===min?55:20+(e.weight-min)/(max-min)*65;return `<div class="body-bar"><span>${esc(e.weight.toLocaleString('es-AR'))}</span><div class="body-bar-track"><i style="height:${pct}%"></i></div><small>${esc(e.date.slice(5))}</small></div>`}).join(''):'<p class="insight-note">Sin registros para mostrar.</p>';
    history.innerHTML=entries.slice(-8).reverse().map(e=>`<div class="body-history-row"><span>${esc(e.date)} · ${esc(e.weight.toLocaleString('es-AR'))} kg</span><button type="button" data-body-remove="${esc(e.date)}" aria-label="Eliminar registro del ${esc(e.date)}">Eliminar</button></div>`).join('');
  }
  $('bodyEntryForm').addEventListener('submit',e=>{
    e.preventDefault();const age=state.nutrition.profile.age;if(age===null||age<18){showToast('Disponible solo para mayores de 18');return;}
    const date=$('bodyEntryDate').value, weight=Number($('bodyEntryWeight').value);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>isoToday()||!Number.isFinite(weight)||weight<25||weight>350){showToast('Revisá fecha y peso');return;}
    const entries=state.nutrition.bodyHistory.filter(x=>x.date!==date);entries.push({date,weight:Math.round(weight*10)/10});state.nutrition.bodyHistory=entries.sort((a,b)=>a.date.localeCompare(b.date)).slice(-365);
    $('bodyEntryWeight').value='';save();showToast('Registro guardado');
  });
  $('bodyTrendHistory').addEventListener('click',e=>{const b=e.target.closest('[data-body-remove]');if(!b)return;if(!confirm('¿Eliminar este registro de peso?'))return;state.nutrition.bodyHistory=state.nutrition.bodyHistory.filter(x=>x.date!==b.dataset.bodyRemove);save();showToast('Registro eliminado');});
  // ZUNA COMPASS: recomendaciones locales basadas en el estado actual, sin IA remota ni XP extra.
  function renderCompass(){
    const target=$('compassSteps');if(!target)return;
    const due=dueMissions(),done=new Set(doneIds()),pending=due.filter(m=>!done.has(m.id));
    const steps=[];
    if(pending.length){
      const easiest=pending.slice().sort((a,b)=>(Number(a.xp)||0)-(Number(b.xp)||0))[0];
      steps.push({icon:'◇',type:'PRIMERA VICTORIA',title:easiest.name,detail:'Una misión pendiente para empezar a avanzar.',view:'missions',action:'IR A MISIONES'});
    }else if(due.length){
      steps.push({icon:'✓',type:'OBJETIVO CUMPLIDO',title:'Tus misiones de hoy están completas',detail:'El descanso también es parte de entrenar.',view:'progress',action:'VER PROGRESO'});
    }else{
      steps.push({icon:'☼',type:'DÍA LIBRE',title:'Hoy no tenés misiones programadas',detail:'Podés descansar o explorar un desafío mental.',view:'lab',action:'EXPLORAR LAB'});
    }
    const activeDays=Object.keys(state.completions).filter(d=>d<=isoToday()&&d>=addDays(isoToday(),-6)&&doneIds(d).length).length;
    if(activeDays<3){steps.push({icon:'✦',type:'CONSTANCIA',title:'Sumá un día a tu camino',detail:activeDays+' de los últimos 7 días tienen misiones registradas.',view:'missions',action:'VER MIS MISIONES'});}
    else{steps.push({icon:'✦',type:'TU CAMINO',title:'Estás construyendo constancia',detail:activeDays+' de los últimos 7 días tienen misiones registradas.',view:'progress',action:'VER ESTADÍSTICAS'});}
    const s=state.season&&state.season.current;
    if(s){const elapsed=Math.max(0,daysBetween(s.start,isoToday()));steps.push({icon:'◆',type:'TEMPORADA ACTIVA',title:'Día '+Math.min(s.length,elapsed+1)+' de '+s.length,detail:'Mirá tus hitos y tu avance en ZUNA SEASONS.',view:'progress',action:'VER TEMPORADA'});}
    else{steps.push({icon:'◆',type:'NUEVO DESAFÍO',title:'¿Una temporada de 30 o 66 días?',detail:'Es opcional y no reinicia tus logros.',view:'progress',action:'EXPLORAR SEASONS'});}
    $('compassIntro').textContent=pending.length?'Tenés '+pending.length+' misión'+(pending.length===1?' pendiente':'es pendientes')+' hoy. Elegí una para comenzar.':due.length?'¡Buen trabajo! Hoy ya completaste lo que tenías programado.':'Un día sin misiones también puede sumar bienestar.';
    target.replaceChildren();
    steps.forEach(step=>{
      const item=document.createElement('article');item.className='zuna-compass-step';
      const glyph=document.createElement('span');glyph.className='zuna-compass-glyph';glyph.textContent=step.icon;
      const copy=document.createElement('div');copy.className='zuna-compass-copy';
      const type=document.createElement('small');type.textContent=step.type;
      const title=document.createElement('strong');title.textContent=step.title;
      const detail=document.createElement('p');detail.textContent=step.detail;
      copy.append(type,title,detail);
      const button=document.createElement('button');button.type='button';button.className='zuna-compass-go';button.dataset.view=step.view;button.textContent=step.action+' ↗';
      item.append(glyph,copy,button);target.append(item);
    });
  }
  function renderHomeCore(){
    const thresholds=[0,500,1500,3000,6000],names=['DESPERTAR','ENFOQUE','CONSTANCIA','DISCIPLINA','MAESTRÍA'];
    const xp=Math.max(0,Number(state.xp)||0);let level=0;
    thresholds.forEach((threshold,i)=>{if(xp>=threshold)level=i});
    $('homeCoreStage').textContent=names[level];
    $('homeCoreMessage').textContent=level===4?'Alcanzaste Maestría. Tu camino sigue creciendo.':'Cada misión fortalece tu evolución.';
    $('homeCoreProgress').style.width=(level===4?100:Math.max(0,Math.min(100,(xp-thresholds[level])/(thresholds[level+1]-thresholds[level])*100)))+'%';
    $('homeCoreNext').textContent=level===4?'ETAPA MÁXIMA DESBLOQUEADA':(thresholds[level+1]-xp).toLocaleString('es-AR')+' XP PARA '+names[level+1];
  }
  let rewardTimer;
  function showQuestReward(xp){
    const el=$('zunaReward');if(!el)return;
    $('zunaRewardXP').textContent='+'+xp+' XP';
    el.hidden=false;el.classList.remove('playing');void el.offsetWidth;el.classList.add('playing');
    clearTimeout(rewardTimer);rewardTimer=setTimeout(()=>{el.hidden=true;el.classList.remove('playing')},1900);
  }
  function render(){
    updateStreak(); const day=programDay(), li=levelInfo(), due=dueMissions(), done=doneIds().filter(id=>due.some(m=>m.id===id)), pct=state.mode==='66'?Math.min(100,Math.round((Math.min(day-1,66)/66)*100)):Math.min(100,Math.round((done.length/Math.max(1,due.length))*100));
    $('topStreak').textContent=state.streak; const initial=(state.name||'Z').trim().charAt(0).toUpperCase();$('avatarInitial').textContent=initial;$('profileAvatar').textContent=initial;$('profileName').textContent=state.name||'Tu perfil';$('profileSince').textContent='Miembro desde '+localDate(state.createdAt).toLocaleDateString('es-AR',{day:'numeric',month:'short'});$('profileLevel').textContent=li.level;$('nameInput').value=state.name||'';$('goalInput').value=state.goal||'balance';
    $('dayNumber').textContent=String(day).padStart(2,'0');$('dayTotal').textContent=state.mode==='66'?'/ 66':'/ ∞';$('programModeLabel').textContent=state.mode==='66'?'PROGRAMA ACTIVO':'MODO PERMANENTE';$('completionPct').textContent=pct+'%';$('mainProgress').style.width=pct+'%';$('progressDays').textContent=state.mode==='66'?Math.min(day-1,66)+' de 66 días transcurridos':'Modo permanente';$('xpLabel').textContent=state.xp+' XP';$('homeXP').textContent=state.xp;$('homeStreak').textContent=state.streak;$('homeDone').textContent=done.length+'/'+due.length;
    $('missionCount').textContent=done.length+' / '+due.length;$('missionProgress').style.width=(due.length?done.length/due.length*100:0)+'%';$('missionXP').textContent='+'+dayXP()+' XP';
    $('levelNumber').textContent=li.level;$('rankName').textContent=li.rank;$('levelTitle').textContent=li.title;$('levelNext').textContent=li.within+' / 500 XP para el próximo nivel';$('levelProgress').style.width=(li.within/500*100)+'%';$('totalCompleted').textContent=totalDone();$('daysActive').textContent=Object.keys(state.completions).filter(k=>(state.completions[k]||[]).length).length;$('bestStreak').textContent=state.bestStreak||0;
    $('modeSetting').textContent=state.mode==='66'?'66 DÍAS':'PERMANENTE';$('modeDescription').textContent=state.mode==='66'?'66 días de enfoque y progreso':'Sin fecha de finalización';$('toggleMode').textContent=state.mode==='66'?'CAMBIAR A MODO PERMANENTE':'VOLVER AL PROGRAMA DE 66 DÍAS';
    $('todayLabel').textContent=new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'}).toUpperCase();$('greeting').textContent=(state.name?state.name+', ':'')+'un día a la vez. Sin excusas, sin perfección.';$('dailyQuote').textContent=quotes[new Date().getDate()%quotes.length];
    const wc=weeklyCount();$('weeklyProgressText').textContent=Math.min(wc,20)+' / 20';$('weeklyProgress').style.width=Math.min(100,wc/20*100)+'%';$('weeklyReward').textContent=state.weeklyRewards[weekKey()]?'RECOMPENSA OBTENIDA':'+150 XP';
    renderHomeCore();renderCompass();renderNextMission();renderPillars();renderMissions();renderQuestWeekly();renderManageMissions();renderActivity();renderMonthlyCalendar();renderWeeklyInsights();renderHabitHistory();renderAchievements();renderCollection();renderZStats();renderPillarProgress();renderJournal();renderGoals();renderReminderInbox();renderReminderSettings();renderSport();renderNutrition();renderBodyTrend();renderLab();renderMemory();renderChallenge();renderCore();renderSeason();
  }
  function renderPillars(){const due=dueMissions(),done=doneIds();$('pillarList').innerHTML=Object.entries(categories).map(([key,c])=>{const ms=due.filter(m=>m.category===key),count=ms.filter(m=>done.includes(m.id)).length;return `<div class="pillar-row"><div class="pillar-icon">${c.icon}</div><div class="pillar-main"><b>${c.name}</b><small>${c.desc}</small></div><span class="pillar-value">${count}/${ms.length}</span></div>`}).join('')}
  function weeklyMissionCount(id){return weekDates().filter(d=>doneIds(d).includes(id)).length}
  function renderMissions(){
    const due=dueMissions(),done=doneIds();
    const list=due.filter(m=>activeFilter==='all'||(activeFilter==='done'?done.includes(m.id):!done.includes(m.id)));
    $('missionList').innerHTML=list.length?list.map(m=>{
      const isDone=done.includes(m.id),c=categories[m.category]||categories.discipline;
      const theme=({movement:'motion',sport:'motion',physical:'motion',fitness:'motion',nutrition:'balance',mind:'mind',mental:'mind',learning:'mind',discipline:'focus'})[m.category]||'focus';
      const glyph=theme==='motion'?'▲':theme==='balance'?'✦':theme==='mind'?'◇':'◆';
      const difficulty=Number(m.xp)>=30?'ÉPICA':Number(m.xp)>=20?'DESAFÍO':'MISIÓN';
      return `<article class="mission-item quest-item ${isDone?'done':''}" data-quest-theme="${theme}">
        <div class="quest-art" aria-hidden="true"><span class="quest-art-halo"></span><span class="quest-art-glyph">${glyph}</span><span class="quest-art-ground"></span></div>
        <div class="quest-main"><span class="quest-type">${difficulty} · ${esc(c.name)}</span><b>${esc(m.name)}</b><small>${frequencyLabel(m.frequency,m)} · ${isDone?'✓ Completada':'Por completar'}</small><span class="quest-reward">✦ +${Number(m.xp)||0} XP</span></div>
        <div class="quest-actions"><button class="mission-check quest-complete" data-toggle="${esc(m.id)}" aria-label="${isDone?'Desmarcar':'Completar'}: ${esc(m.name)}">${isDone?'✓':'○'}</button><button class="mission-menu" data-edit="${esc(m.id)}" aria-label="Editar hábito: ${esc(m.name)}">✎</button></div></article>`
    }).join(''):`<div class="empty-state"><b>Todo al día.</b>No hay misiones en esta categoría.</div>`;
    document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.filter===activeFilter));
  }
  function renderQuestWeekly(){
    const track=$('questWeeklyTrack');if(!track)return;
    const days=Array.from({length:7},(_,i)=>addDays(isoToday(),i-6));
    const completed=days.map(d=>doneIds(d).length>0);
    const count=completed.filter(Boolean).length;
    const names=['D','L','M','M','J','V','S'];
    track.replaceChildren();
    days.forEach((d,i)=>{
      const item=document.createElement('div');item.className='quest-day'+(completed[i]?' achieved':'')+(i===6?' today':'');
      const dot=document.createElement('span');dot.textContent=completed[i]?'✓':'·';
      const label=document.createElement('small');label.textContent=names[new Date(d+'T12:00:00').getDay()];
      item.append(dot,label);item.setAttribute('aria-label',d+': '+(completed[i]?'misión registrada':'sin misiones registradas'));
      track.append(item);
    });
    $('questWeeklyLabel').textContent=count+' de 7 días con actividad';
    $('questWeeklyNote').textContent=count===7?'¡Siete días con misiones registradas! Seguí a tu ritmo.':count===0?'Completá una misión para iluminar el primer día.':'Cada día con al menos una misión registrada ilumina un símbolo. No hay penalizaciones por descansar.';
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
  function renderActivity(){const cells=[];for(let i=29;i>=0;i--){const d=addDays(isoToday(),-i),due=d===isoToday()?dueMissions().length:0,count=doneIds(d).length,level=count===0?'':(d===isoToday()&&due>0&&count>=due?'high':'mid');cells.push(`<div class="activity-cell ${level}" title="${d}: ${count} misiones registradas"><span>${localDate(d).getDate()}</span></div>`)}$('activityGrid').innerHTML=cells.join('')}
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
  // ZUNA STATS: índices de actividad (no medidas de aptitud, salud o inteligencia).
  const zstatsDefs=[
    {id:'strength',name:'Fuerza',icon:'◉',target:12,description:'Días con al menos una misión física o una sesión deportiva registrada en los últimos 30 días. Referencia: 12 días.'},
    {id:'discipline',name:'Disciplina',icon:'◆',target:12,description:'Días con al menos una misión de la categoría Disciplina completada en los últimos 30 días. Referencia: 12 días.'},
    {id:'focus',name:'Enfoque',icon:'◇',target:10,description:'Días con una sesión completada de ZUNA LAB (Reflejos o Memoria) en los últimos 30 días. Referencia: 10 días.'},
    {id:'consistency',name:'Constancia',icon:'▲',target:20,description:'Días con al menos una misión registrada en los últimos 30 días. Referencia: 20 días.'},
    {id:'knowledge',name:'Conocimiento',icon:'✧',target:12,description:'Días con al menos una misión de Mentalidad completada en los últimos 30 días. Referencia: 12 días.'}
  ];
  let zstatsSelected='strength';
  function zstatsValues(){
    const dates=Array.from({length:30},(_,i)=>addDays(isoToday(),i-29));
    const sportDays=new Set((state.sport.sessions||[]).map(s=>s.date));
    const cognitiveDays=new Set([...(state.cognitive.sessions||[]),...(state.cognitive.memorySessions||[])].map(s=>s.date));
    const missionIds={fitness:new Set(state.missions.filter(m=>m.category==='fitness').map(m=>m.id)),discipline:new Set(state.missions.filter(m=>m.category==='discipline').map(m=>m.id)),mind:new Set(state.missions.filter(m=>m.category==='mind').map(m=>m.id))};
    const counts={strength:0,discipline:0,focus:0,consistency:0,knowledge:0};
    for(const d of dates){
      const done=doneIds(d);
      if(done.some(id=>missionIds.fitness.has(id))||sportDays.has(d))counts.strength++;
      if(done.some(id=>missionIds.discipline.has(id)))counts.discipline++;
      if(cognitiveDays.has(d))counts.focus++;
      if(done.length)counts.consistency++;
      if(done.some(id=>missionIds.mind.has(id)))counts.knowledge++;
    }
    return zstatsDefs.map(def=>({...def,count:counts[def.id],score:Math.min(100,Math.round(counts[def.id]/def.target*100))}));
  }
  function renderZStats(){
    const container=$('zstatsRows');if(!container)return;
    const values=zstatsValues();
    const overall=Math.round(values.reduce((sum,x)=>sum+x.score,0)/values.length);
    $('zstatsOverall').textContent=overall;
    const svgNS='http://www.w3.org/2000/svg',centerX=160,centerY=144,radius=94;
    const xy=(i,scale)=>{const a=-Math.PI/2+i*2*Math.PI/5;return [centerX+Math.cos(a)*radius*scale,centerY+Math.sin(a)*radius*scale]};
    const pts=arr=>arr.map(([x,y])=>x.toFixed(1)+','+y.toFixed(1)).join(' ');
    const grid=$('zstatsRadarGrid');grid.replaceChildren();
    for(const level of [.25,.5,.75,1]){
      const poly=document.createElementNS(svgNS,'polygon');poly.setAttribute('points',pts(values.map((_,i)=>xy(i,level))));poly.setAttribute('class','zstats-grid-ring');grid.append(poly);
    }
    for(let i=0;i<5;i++){
      const line=document.createElementNS(svgNS,'line');const [x,y]=xy(i,1);
      line.setAttribute('x1',String(centerX));line.setAttribute('y1',String(centerY));line.setAttribute('x2',String(x));line.setAttribute('y2',String(y));line.setAttribute('class','zstats-grid-axis');grid.append(line);
    }
    $('zstatsRadarShape').setAttribute('points',pts(values.map((v,i)=>xy(i,v.score/100))));
    const dots=$('zstatsRadarDots');dots.replaceChildren();
    values.forEach((v,i)=>{
      const [x,y]=xy(i,v.score/100),[lx,ly]=xy(i,1.25);
      const dot=document.createElementNS(svgNS,'circle');dot.setAttribute('cx',String(x));dot.setAttribute('cy',String(y));dot.setAttribute('r','4');dot.setAttribute('class','zstats-dot');dots.append(dot);
      const label=document.createElementNS(svgNS,'text');label.setAttribute('x',String(lx));label.setAttribute('y',String(ly));label.setAttribute('text-anchor','middle');label.setAttribute('dominant-baseline','middle');label.setAttribute('class','zstats-chart-label');label.textContent=v.name;dots.append(label);
    });
    container.replaceChildren();
    for(const v of values){
      const btn=document.createElement('button');btn.type='button';btn.className='zstats-row'+(zstatsSelected===v.id?' selected':'');btn.setAttribute('aria-pressed',String(zstatsSelected===v.id));btn.dataset.zstat=v.id;
      const heading=document.createElement('span');heading.className='zstats-row-head';
      const name=document.createElement('span');name.textContent=v.icon+' '+v.name;
      const score=document.createElement('strong');score.textContent=v.score+' / 100';heading.append(name,score);
      const track=document.createElement('span');track.className='zstats-row-track';
      const fill=document.createElement('span');fill.style.width=v.score+'%';track.append(fill);
      const meta=document.createElement('small');meta.textContent=v.count+' / '+v.target+' días de referencia';
      btn.append(heading,track,meta);container.append(btn);
    }
    const selected=values.find(v=>v.id===zstatsSelected)||values[0];
    $('zstatsDetail').textContent=selected.name+': '+selected.description+' Tu registro: '+selected.count+' días.';
  }
  $('zstatsRows').addEventListener('click',e=>{
    const button=e.target.closest('[data-zstat]');if(!button)return;
    if(!zstatsDefs.some(d=>d.id===button.dataset.zstat))return;
    zstatsSelected=button.dataset.zstat;renderZStats();
  });

  // ZUNA COLLECTION — logros calculados sobre registros existentes, sin recompensas duplicadas.
  const collectionCards=[
    {id:'first',name:'Primer paso',type:'ORIGEN',symbol:'✦',copy:'Todo camino empieza con una decisión.',hint:'Completá tu primera misión.',test:s=>totalDone(s)>=1},
    {id:'ten',name:'En marcha',type:'CONSTANCIA',symbol:'▲',copy:'Diez pequeñas victorias construyen algo grande.',hint:'Completá 10 misiones.',test:s=>totalDone(s)>=10},
    {id:'streak3',name:'Tres amaneceres',type:'RACHA',symbol:'☀',copy:'Volver tres días seguidos también es una victoria.',hint:'Alcanzá una racha de 3 días.',test:s=>s.bestStreak>=3},
    {id:'streak7',name:'Siete días',type:'RACHA',symbol:'♜',copy:'La constancia se construye paso a paso.',hint:'Alcanzá una racha de 7 días.',test:s=>s.bestStreak>=7},
    {id:'xp1000',name:'Energía dorada',type:'EVOLUCIÓN',symbol:'◆',copy:'Mil puntos de experiencia y un camino que sigue.',hint:'Acumulá 1.000 XP.',test:s=>s.xp>=1000},
    {id:'day30',name:'Horizonte 30',type:'CAMINO',symbol:'◈',copy:'Un mes para conocerte y seguir creciendo.',hint:'Llegá al día 30 de tu programa.',test:s=>programDay(s)>=30},
    {id:'reflex',name:'Instinto',type:'ZUNA LAB',symbol:'⚡',copy:'El primer desafío de reflejos ya es parte de tu historia.',hint:'Completá una sesión de 5 reflejos.',test:s=>(s.cognitive?.sessions||[]).length>=1},
    {id:'memory',name:'Mente despierta',type:'ZUNA LAB',symbol:'◇',copy:'Observaste, recordaste y completaste el reto.',hint:'Superá las 3 rondas de Memoria visual.',test:s=>(s.cognitive?.memorySessions||[]).some(x=>x.rounds===3)},
    {id:'core3',name:'Núcleo ascendente',type:'ZUNA CORE',symbol:'✧',copy:'Tu personaje alcanzó Constancia y su energía evolucionó.',hint:'Alcanzá 1.500 XP (etapa 3 de ZUNA CORE).',test:s=>s.xp>=1500}
  ];
  let collectionFilter='all',collectionSelected=null;
  function renderCollection(){
    const grid=$('collectionGrid');if(!grid)return;
    const earned=collectionCards.filter(c=>c.test(state)).length;
    $('collectionCounter').textContent=earned+' / '+collectionCards.length;
    document.querySelectorAll('[data-collection-filter]').forEach(b=>{
      const active=b.dataset.collectionFilter===collectionFilter;
      b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));
    });
    grid.replaceChildren();
    const cards=collectionCards.filter(c=>collectionFilter==='all'||(collectionFilter==='unlocked'?c.test(state):!c.test(state)));
    if(!cards.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='No hay cartas en este filtro todavía.';grid.append(empty);}
    for(const card of cards){
      const unlocked=!!card.test(state);
      const button=document.createElement('button');button.type='button';button.className='collection-card'+(unlocked?' unlocked':' locked')+(collectionSelected===card.id?' selected':'');
      button.dataset.collectionId=card.id;button.setAttribute('aria-pressed',String(collectionSelected===card.id));
      button.setAttribute('aria-label',card.name+', '+(unlocked?'desbloqueada':'bloqueada')+'. Ver detalles');
      const kind=document.createElement('span');kind.className='collection-kind';kind.textContent=card.type;
      const art=document.createElement('span');art.className='collection-art';art.textContent=unlocked?card.symbol:'?';art.setAttribute('aria-hidden','true');
      const name=document.createElement('strong');name.textContent=card.name;
      const status=document.createElement('small');status.textContent=unlocked?'✦ DESBLOQUEADA':'◇ BLOQUEADA';
      button.append(kind,art,name,status);grid.append(button);
    }
    const chosen=collectionCards.find(c=>c.id===collectionSelected);
    $('collectionDetail').textContent=chosen?(chosen.test(state)?'✦ '+chosen.name+' — '+chosen.copy:'◇ '+chosen.name+' — '+chosen.hint):'Tocá una carta para conocer su historia y cómo desbloquearla.';
  }
  document.querySelectorAll('[data-collection-filter]').forEach(b=>b.addEventListener('click',()=>{
    collectionFilter=b.dataset.collectionFilter;collectionSelected=null;renderCollection();
  }));
  $('collectionGrid').addEventListener('click',e=>{
    const card=e.target.closest('[data-collection-id]');if(!card)return;
    collectionSelected=collectionSelected===card.dataset.collectionId?null:card.dataset.collectionId;renderCollection();
  });
  function renderAchievements(){$('achievementGrid').innerHTML=achievements.map(a=>{const ok=a.test(state);return `<article class="achievement ${ok?'':'locked'}"><span>${a.icon}</span><b>${a.name}</b><small>${ok?'Desbloqueado':a.copy}</small></article>`}).join('')}
  function renderPillarProgress(){$('pillarProgress').innerHTML=Object.entries(categories).map(([key,c])=>{let due=0,done=0;weekDates().forEach(d=>{const ms=state.missions.filter(m=>!m.archived&&!m.paused&&m.category===key&&dueToday(m,d));due+=ms.length;done+=ms.filter(m=>doneIds(d).includes(m.id)).length});const pct=due?Math.round(done/due*100):0;return `<div class="pillar-row"><div class="pillar-icon">${c.icon}</div><div class="pillar-main"><b>${c.name}</b><div class="pillar-bar"><i style="width:${pct}%"></i></div></div><span class="pillar-value">${pct}%</span></div>`}).join('')}
  function renderJournal(){if(document.activeElement!==$('journalInput'))$('journalInput').value=state.journal[isoToday()]||'';selectedMood=state.mood[isoToday()]||null;document.querySelectorAll('#moodRow button').forEach(b=>b.classList.toggle('active',Number(b.dataset.mood)===selectedMood))}
  // --- Objetivos personales ---
  const goalHorizonDays={short:7,medium:30,long:90};
  const goalReward={short:50,medium:100,long:200};
  function goalEndDate(g){return addDays(g.startDate,(goalHorizonDays[g.horizon]||30)-1)}
  function goalCount(g){
    let value=Number.isSafeInteger(g.manualCount)?Math.max(0,g.manualCount):0;
    if(g.linkedMissionId){
      for(const [day,ids] of Object.entries(state.completions||{})){
        if(day>=g.startDate&&day<=goalEndDate(g)&&Array.isArray(ids)&&ids.includes(g.linkedMissionId))value++;
      }
    }
    return value;
  }
  function goalIsDone(g){return !!g.awarded}
  function goalIsExpired(g){return !g.awarded&&isoToday()>goalEndDate(g)}
  function awardGoals(){
    let changed=false;
    for(const g of state.goals){
      if(g.archived||g.awarded||goalIsExpired(g))continue;
      if(goalCount(g)>=g.target){g.awarded=true;g.awardedAt=isoToday();g.rewardGranted=goalReward[g.horizon]||100;state.xp+=g.rewardGranted;changed=true;}
    }
    if(changed)showToast('¡Objetivo cumplido! Recompensa de XP');
    return changed;
  }
  function goalCard(g,compact=false){
    const count=goalCount(g),pct=Math.min(100,Math.round(100*count/g.target)),done=goalIsDone(g),expired=goalIsExpired(g);
    const label=done?'LOGRADO ✓':expired?'PLAZO VENCIDO':'EN MARCHA';
    const category=categories[g.category]?.name||'Personal';
    return `<article class="goal-card ${done?'completed':expired?'expired':''}">
      <div class="goal-head"><div><p class="eyebrow">${esc(category)} · ${g.horizon==='short'?'CORTO':g.horizon==='long'?'LARGO':'MEDIANO'} PLAZO</p><h3>${esc(g.title)}</h3></div><span class="goal-status">${label}</span></div>
      <p class="goal-meta">${esc(g.linkedMissionId?'Automático · hábito vinculado':'Registro manual')} · Hasta ${esc(localDate(goalEndDate(g)).toLocaleDateString('es-AR',{day:'numeric',month:'short'}))} · ${done?'+'+(g.rewardGranted||0)+' XP obtenidos':'+'+(goalReward[g.horizon]||100)+' XP al lograrlo'}</p>
      <div class="goal-progress-row"><span>${Math.min(count,g.target)} / ${g.target} ${esc(g.unit||'veces')}</span><b>${pct}%</b></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      ${compact?'':`<div class="goal-actions">${!g.linkedMissionId&&!done&&!expired?`<button data-goal-add="${esc(g.id)}">＋ 1 ${esc(g.unit||'unidad')}</button>`:''}<button class="goal-edit" data-goal-edit="${esc(g.id)}">${done?'Ver detalles':'Editar'}</button>${expired?`<button data-goal-renew="${esc(g.id)}">Nuevo intento</button>`:''}</div>`}
    </article>`;
  }
  function renderGoals(){
    const goals=state.goals.filter(g=>!g.archived);
    $('goalsActive').textContent=goals.filter(g=>!g.awarded&&!goalIsExpired(g)).length;
    $('goalsComplete').textContent=goals.filter(g=>g.awarded).length;
    $('goalsXP').textContent=goals.reduce((n,g)=>n+(g.rewardGranted||0),0);
    const display=goals.filter(g=>activeGoalFilter==='all'||(activeGoalFilter==='completed'?g.awarded:!g.awarded)).sort((a,b)=>Number(a.awarded)-Number(b.awarded));
    $('goalsList').innerHTML=display.length?display.map(g=>goalCard(g)).join(''):'<div class="goal-empty">No hay objetivos en esta categoría. <b>Empezá por una meta alcanzable.</b></div>';
    const featured=goals.filter(g=>!g.awarded&&!goalIsExpired(g)).slice(0,2);
    $('homeGoals').innerHTML=featured.length?featured.map(g=>goalCard(g,true)).join(''):'<div class="goal-empty">Todavía no tenés objetivos activos.<br><button class="text-button" data-view="goals">Crear mi primera meta ↗</button></div>';
    document.querySelectorAll('[data-goal-filter]').forEach(b=>b.classList.toggle('active',b.dataset.goalFilter===activeGoalFilter));
  }
  function openGoalEditor(id=null){
    editingGoalId=id;
    const g=id?state.goals.find(x=>x.id===id):null;if(id&&!g)return;
    $('goalModalTitle').textContent=g?'Editar objetivo':'Nuevo objetivo';
    $('goalTitle').value=g?.title||'';$('goalCategory').value=g?.category||'fitness';
    $('goalHorizon').value=g?.horizon||'medium';$('goalTarget').value=String(g?.target||10);$('goalUnit').value=g?.unit||'veces';
    $('goalLink').innerHTML='<option value="">Manual — actualizo el avance yo</option>'+state.missions.filter(m=>!m.archived).map(m=>`<option value="${esc(m.id)}">Automático · ${esc(m.name)}</option>`).join('');
    $('goalLink').value=g?.linkedMissionId||'';
    const locked=!!g?.awarded;
    ['goalTitle','goalCategory','goalHorizon','goalTarget','goalUnit','goalLink'].forEach(field=>$(field).disabled=locked);
    $('saveGoalBtn').hidden=locked;
    $('archiveGoalBtn').hidden=!g;
    openModal('goalModal');
  }
  $('createGoalBtn').addEventListener('click',()=>openGoalEditor());
  $('goalFilters').addEventListener('click',e=>{const b=e.target.closest('[data-goal-filter]');if(b){activeGoalFilter=b.dataset.goalFilter;renderGoals()}});
  $('goalsList').addEventListener('click',e=>{
    const add=e.target.closest('[data-goal-add]');if(add){const g=state.goals.find(x=>x.id===add.dataset.goalAdd);if(!g||g.awarded||g.archived||g.linkedMissionId||goalIsExpired(g))return;g.manualCount=Math.min(g.target,Math.max(0,g.manualCount||0)+1);awardGoals();save();return}
    const edit=e.target.closest('[data-goal-edit]');if(edit){openGoalEditor(edit.dataset.goalEdit);return}
    const renew=e.target.closest('[data-goal-renew]');if(renew){const prev=state.goals.find(x=>x.id===renew.dataset.goalRenew);if(!prev)return;state.goals.push({...prev,id:'goal-'+Date.now(),startDate:isoToday(),manualCount:0,awarded:false,awardedAt:null,rewardGranted:0,archived:false});save();showToast('Nuevo intento creado')}
  });
  $('saveGoalBtn').addEventListener('click',()=>{
    const title=$('goalTitle').value.trim(),target=Number($('goalTarget').value),unit=$('goalUnit').value.trim()||'veces',horizon=$('goalHorizon').value;
    if(!title||!Number.isSafeInteger(target)||target<1||target>10000||unit.length>18||!goalHorizonDays[horizon]){showToast('Revisá nombre, cantidad y plazo');return}
    const props={title,category:$('goalCategory').value,horizon,target,unit,linkedMissionId:$('goalLink').value||null};
    let g=editingGoalId?state.goals.find(x=>x.id===editingGoalId):null;
    if(g){if(g.awarded)return;Object.assign(g,props)}
    else state.goals.push({id:'goal-'+Date.now(),...props,startDate:isoToday(),manualCount:0,awarded:false,archived:false,rewardGranted:0});
    closeModal('goalModal');awardGoals();save();showToast(g?'Objetivo actualizado':'Objetivo creado');editingGoalId=null;
  });
  $('archiveGoalBtn').addEventListener('click',()=>{
    const g=state.goals.find(x=>x.id===editingGoalId);if(!g||!confirm('¿Archivar este objetivo? Su historial y XP seguirán guardados.'))return;
    g.archived=true;closeModal('goalModal');save();showToast('Objetivo archivado');editingGoalId=null;
  });
  $('missionFilters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(b){activeFilter=b.dataset.filter;renderMissions()}});
  $('missionList').addEventListener('click',e=>{
    const t=e.target.closest('[data-toggle]');
    if(t){const id=t.dataset.toggle,arr=doneIds(),m=dueMissions().find(x=>x.id===id);if(!m)return;
      const was=arr.includes(id), date=isoToday();
      state.completions[date]=was?arr.filter(x=>x!==id):[...arr,id];
      state.completionXP[date] ||= {};
      const awarded=was?(state.completionXP[date][id]??m.xp):m.xp;
      if(was)delete state.completionXP[date][id];else state.completionXP[date][id]=m.xp;
      state.xp=Math.max(0,state.xp+(was?-awarded:awarded));awardGoals();save();if(!was)showQuestReward(awarded);showToast(was?'Misión desmarcada':'Misión completada · +'+awarded+' XP');return;
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
    if(JSON.stringify(obj).length>5000000)throw Error('Copia demasiado grande');
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
    clean.sport=clean.sport&&typeof clean.sport==='object'&&!Array.isArray(clean.sport)?clean.sport:{primary:'running',weeklyTarget:3,sessions:[]};
    clean.goals=Array.isArray(clean.goals)?clean.goals:[];
    const nutrition=clean.nutrition&&typeof clean.nutrition==='object'&&!Array.isArray(clean.nutrition)?clean.nutrition:{};
    if(nutrition.notes!==undefined&&(typeof nutrition.notes!=='string'||nutrition.notes.length>800))throw Error('Notas de nutrición inválidas');
    if(nutrition.weeks!==undefined&&(!nutrition.weeks||typeof nutrition.weeks!=='object'||Array.isArray(nutrition.weeks)||Object.keys(nutrition.weeks).length>500))throw Error('Plan de comidas inválido');
    if(nutrition.weeks&&Object.entries(nutrition.weeks).some(([key,w])=>!/^\d{4}-\d{2}-\d{2}$/.test(key)||!w||typeof w!=='object'||!['mixed','vegetarian'].includes(w.pattern)||!Array.isArray(w.indexes)||w.indexes.length!==7||!w.indexes.every(i=>Number.isInteger(i)&&i>=0&&i<=6)))throw Error('Semana alimentaria inválida');
    if(nutrition.profile!==undefined){if(!nutrition.profile||typeof nutrition.profile!=='object'||Array.isArray(nutrition.profile))throw Error('Perfil nutricional inválido');for(const [key,min,max] of [['age',13,110],['height',100,250],['weight',25,350]]){const v=nutrition.profile[key];if(v!==undefined&&v!==null&&(!Number.isFinite(v)||v<min||v>max))throw Error('Medidas inválidas')}}
    if(nutrition.bodyHistory!==undefined){if(!Array.isArray(nutrition.bodyHistory)||nutrition.bodyHistory.length>365||nutrition.bodyHistory.some(e=>!e||typeof e!=='object'||typeof e.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!Number.isFinite(e.weight)||e.weight<25||e.weight>350))throw Error('Historial de medidas inválido');}
    clean.nutrition=nutrition;
    if(clean.goals.length>500||!clean.goals.every(g=>g&&typeof g.id==='string'&&g.id.length<120&&typeof g.title==='string'&&g.title.length<=70&&Number.isSafeInteger(g.target)&&g.target>=1&&g.target<=10000&&['short','medium','long'].includes(g.horizon)&&/^\d{4}-\d{2}-\d{2}$/.test(g.startDate)&&Number.isSafeInteger(g.manualCount)&&g.manualCount>=0&&g.manualCount<=10000&&typeof g.awarded==='boolean'&&(!g.linkedMissionId||typeof g.linkedMissionId==='string')))throw Error('Objetivos inválidos');
    // El respaldo importado puede venir de v2.1, sin snapshots.
    clean.missions.forEach(m=>{m.days ||= []});
    return clean;
  }
  $('importData').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const imported=JSON.parse(await file.text());if(!imported||!Array.isArray(imported.missions)||!imported.completions)throw Error();state=validateBackup(imported);migrateMissionData();migrateReminders();migrateSport();migrateTrainingPlan();migrateNutrition();migrateCognitive();migrateCore();migrateSeason();labReset();memoryReset();save();showToast('Copia restaurada')}catch{showToast('Archivo inválido')}e.target.value=''});

  // ZUNA LAB: minijuego local, sin servicios externos ni recompensas repetibles.
  function migrateCognitive(){
    const c=state.cognitive&&typeof state.cognitive==='object'?state.cognitive:{};
    const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&d<='9999-12-31';
    state.cognitive={
      sessions:(Array.isArray(c.sessions)?c.sessions:[]).filter(s=>s&&validDate(s.date)&&Array.isArray(s.times)&&s.times.length===5&&s.times.every(n=>Number.isInteger(n)&&n>=50&&n<=10000)).slice(-100).map(s=>({date:s.date,times:s.times.slice(),best:Math.min(...s.times),average:Math.round(s.times.reduce((a,b)=>a+b,0)/5)})),
      rewardedDates:[...new Set((Array.isArray(c.rewardedDates)?c.rewardedDates:[]).filter(validDate))].slice(-400),
      memorySessions:(Array.isArray(c.memorySessions)?c.memorySessions:[]).filter(s=>s&&validDate(s.date)&&Number.isInteger(s.rounds)&&s.rounds>=0&&s.rounds<=3).slice(-100).map(s=>({date:s.date,rounds:s.rounds})),
      memoryRewardedDates:[...new Set((Array.isArray(c.memoryRewardedDates)?c.memoryRewardedDates:[]).filter(validDate))].slice(-400),
      challengeClaimedDates:[...new Set((Array.isArray(c.challengeClaimedDates)?c.challengeClaimedDates:[]).filter(validDate))].slice(-400)
    };
  }
  migrateCognitive();
  let labPhase='ready',labTimes=[],labTimer=null,labStart=0;
  function labPaint(phase){
    const target=$('labTarget');if(!target)return;
    target.dataset.phase=phase;
    const labels={
      ready:['⚡','¿Listo para reaccionar?','Tocá para empezar'],
      waiting:['…','Esperá la señal','No toques todavía'],
      go:['✓','¡AHORA!','¡Tocá!'],
      early:['!','Te adelantaste','Tocá para volver a intentar'],
      result:['⚡','¡Bien hecho!','Tocá para continuar'],
      complete:['★','¡Sesión completa!','Tocá para otra ronda']
    };
    const [icon,title,subtitle]=labels[phase];$('labTargetIcon').textContent=icon;$('labTargetTitle').textContent=title;$('labTargetSubtitle').textContent=subtitle;
  }
  function labReset(){clearTimeout(labTimer);labTimer=null;labPhase='ready';labTimes=[];labPaint(labPhase);renderLab();$('labFeedback').textContent='La señal aparece después de un tiempo aleatorio.';}
  function renderLab(){
    if(!$('labHistory'))return;
    const sessions=state.cognitive.sessions;
    const best=sessions.length?Math.min(...sessions.map(s=>s.best)):null;
    $('labBest').textContent=best===null?'—':best+' ms';
    $('labAttempts').textContent=labTimes.length+' / 5';
    $('labLast').textContent=labTimes.length?labTimes[labTimes.length-1]+' ms':'—';
    const recent=sessions.slice(-8).reverse();
    $('labHistory').replaceChildren();
    if(!recent.length){const p=document.createElement('p');p.className='muted';p.textContent='Todavía no hay sesiones. Completá tu primera prueba de reflejos.';$('labHistory').append(p);return;}
    for(const s of recent){
      const item=document.createElement('article');item.className='lab-history-item';
      const date=document.createElement('span');date.textContent=s.date;
      const score=document.createElement('strong');score.textContent='Promedio '+s.average+' ms';
      const sub=document.createElement('small');sub.textContent='Mejor '+s.best+' ms';
      item.append(date,score,sub);$('labHistory').append(item);
    }
  }
  $('labTarget').addEventListener('click',()=>{
    if(labPhase==='ready'||labPhase==='early'||labPhase==='result'||labPhase==='complete'){
      if(labPhase==='complete')labTimes=[];
      labPhase='waiting';labPaint(labPhase);
      $('labFeedback').textContent='Concentrate en el cambio de color.';
      clearTimeout(labTimer);
      labTimer=setTimeout(()=>{labTimer=null;labPhase='go';labStart=performance.now();labPaint(labPhase);},1400+Math.random()*2200);
    }else if(labPhase==='waiting'){
      clearTimeout(labTimer);labTimer=null;labPhase='early';labPaint(labPhase);
      $('labFeedback').textContent='Salida anticipada. No se suma un intento.';
    }else if(labPhase==='go'){
      const ms=Math.max(1,Math.round(performance.now()-labStart));
      labTimes.push(ms);
      if(labTimes.length>=5){
        const times=labTimes.slice(),date=isoToday(),average=Math.round(times.reduce((a,b)=>a+b,0)/5),best=Math.min(...times);
        state.cognitive.sessions.push({date,times,average,best});
        state.cognitive.sessions=state.cognitive.sessions.slice(-100);
        let reward='';
        if(!state.cognitive.rewardedDates.includes(date)){
          state.cognitive.rewardedDates.push(date);state.xp+=10;reward=' · +10 XP';
        }
        labPhase='complete';labPaint(labPhase);save();
        $('labFeedback').textContent='Promedio: '+average+' ms · Mejor: '+best+' ms'+reward;
      }else{
        labPhase='result';labPaint(labPhase);renderLab();
        $('labFeedback').textContent='Reacción: '+ms+' ms. Te faltan '+(5-labTimes.length)+' intentos.';
      }
    }
  });
  $('labRestart').addEventListener('click',labReset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&labPhase==='waiting'){clearTimeout(labTimer);labTimer=null;labPhase='early';labPaint(labPhase);}});


  // Desafío diario: recompensa explícita y única, basada en sesiones realmente completadas.
  function renderChallenge(){
    if(!$('challengeClaim'))return;
    const date=isoToday(),c=state.cognitive;
    const reflex=c.sessions.some(s=>s.date===date);
    const memory=c.memorySessions.some(s=>s.date===date&&s.rounds===3);
    const claimed=c.challengeClaimedDates.includes(date);
    const count=Number(reflex)+Number(memory);
    $('challengeDate').textContent=new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});
    for(const [id,done] of [['challengeReflex',reflex],['challengeMemory',memory]]){
      const el=$(id);el.classList.toggle('done',done);
      el.querySelector('small').textContent=done?'✓ Completado':'Pendiente';
    }
    $('challengeProgress').setAttribute('aria-valuenow',String(count));
    $('challengeProgressFill').style.width=(count*50)+'%';
    $('challengeMedal').classList.toggle('earned',claimed);
    $('challengeStatus').textContent=claimed?'¡Insignia del día desbloqueada! +20 XP obtenidos.':count===2?'¡Lo lograste! Reclamá tu recompensa.':count===1?'¡Vas por la mitad! Te falta un desafío.':'Completá los dos juegos para desbloquear la insignia.';
    $('challengeClaim').disabled=claimed||count!==2;
    $('challengeClaim').textContent=claimed?'✓ RECOMPENSA RECLAMADA':count===2?'RECLAMAR +20 XP':'DESBLOQUEÁ +20 XP';
  }
  $('challengeClaim').addEventListener('click',()=>{
    const date=isoToday(),c=state.cognitive;
    if(c.challengeClaimedDates.includes(date)||!c.sessions.some(s=>s.date===date)||!c.memorySessions.some(s=>s.date===date&&s.rounds===3))return;
    c.challengeClaimedDates.push(date);c.challengeClaimedDates=c.challengeClaimedDates.slice(-400);
    state.xp+=20;save();showToast('¡Desafío diario completado! +20 XP');
  });

  // ZUNA LAB 02 — Memoria visual: 3 rondas de dificultad creciente.
  let memoryPhase='idle',memorySequence=[],memoryIndex=0,memoryRound=0,memoryTimers=[];
  const memoryPads=[...document.querySelectorAll('[data-memory-pad]')];
  function memorySchedule(fn,delay){const id=setTimeout(()=>{memoryTimers=memoryTimers.filter(x=>x!==id);fn();},delay);memoryTimers.push(id);}
  function memoryClear(){for(const id of memoryTimers)clearTimeout(id);memoryTimers=[];memoryPads.forEach(p=>p.classList.remove('lit'));}
  function memorySetPads(enabled){memoryPads.forEach(p=>{p.disabled=!enabled;});}
  function memoryReset(){
    memoryClear();memoryPhase='idle';memorySequence=[];memoryIndex=0;memoryRound=0;
    memorySetPads(false);$('memoryStart').disabled=false;$('memoryStart').textContent='EMPEZAR DESAFÍO ↗';
    $('memoryFeedback').textContent='Empezá cuando quieras. Mirá la secuencia antes de tocar.';
    renderMemory();
  }
  function renderMemory(){
    if(!$('memoryHistory'))return;
    const sessions=state.cognitive.memorySessions;
    $('memoryRound').textContent=memoryRound+' / 3';
    $('memoryLength').textContent=memoryRound?String(memoryRound+2):'—';
    $('memoryBest').textContent=sessions.length?Math.max(...sessions.map(s=>s.rounds))+' / 3':'—';
    const holder=$('memoryHistory');holder.replaceChildren();
    if(!sessions.length){const p=document.createElement('p');p.className='muted';p.textContent='Todavía no hay sesiones de memoria.';holder.append(p);return;}
    for(const s of sessions.slice(-5).reverse()){
      const item=document.createElement('article');item.className='lab-history-item';
      const date=document.createElement('span');date.textContent=s.date;
      const result=document.createElement('strong');result.textContent=s.rounds+' / 3 rondas';
      item.append(date,result);holder.append(item);
    }
  }
  function memorySave(rounds){
    const date=isoToday();
    state.cognitive.memorySessions.push({date,rounds});
    state.cognitive.memorySessions=state.cognitive.memorySessions.slice(-100);
    let reward='';
    if(rounds===3&&!state.cognitive.memoryRewardedDates.includes(date)){
      state.cognitive.memoryRewardedDates.push(date);state.xp+=10;reward=' ¡+10 XP!';
    }
    memoryPhase='finished';memorySetPads(false);$('memoryStart').disabled=false;
    $('memoryStart').textContent='VOLVER A JUGAR ↗';
    $('memoryFeedback').textContent=(rounds===3?'¡Completaste las 3 rondas!':'Te equivocaste. Llegaste a '+rounds+' rondas.')+reward;
    save();
  }
  function memoryShowSequence(){
    memoryPhase='show';memorySetPads(false);
    $('memoryFeedback').textContent='Observá las luces…';
    memorySequence.forEach((n,i)=>{
      memorySchedule(()=>memoryPads[n].classList.add('lit'),450+i*850);
      memorySchedule(()=>memoryPads[n].classList.remove('lit'),1000+i*850);
    });
    memorySchedule(()=>{
      memoryPhase='input';memoryIndex=0;memorySetPads(true);
      $('memoryFeedback').textContent='Tu turno: repetí la secuencia ('+memorySequence.length+' posiciones).';
    },550+memorySequence.length*850);
  }
  function memoryNextRound(){
    memoryRound++;
    memorySequence=Array.from({length:memoryRound+2},()=>Math.floor(Math.random()*4));
    renderMemory();memoryShowSequence();
  }
  $('memoryStart').addEventListener('click',()=>{
    memoryClear();memoryRound=0;memoryIndex=0;
    $('memoryStart').disabled=true;
    memoryNextRound();
  });
  memoryPads.forEach((pad,i)=>pad.addEventListener('click',()=>{
    if(memoryPhase!=='input')return;
    if(i!==memorySequence[memoryIndex]){memorySave(memoryRound-1);return;}
    memoryIndex++;pad.classList.add('lit');memorySchedule(()=>pad.classList.remove('lit'),180);
    if(memoryIndex===memorySequence.length){
      memoryPhase='transition';memorySetPads(false);
      if(memoryRound===3){memorySave(3);}
      else{
        $('memoryFeedback').textContent='¡Correcto! Preparando la siguiente ronda…';
        memorySchedule(memoryNextRound,900);
      }
    }
  }));
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&['show','input','transition'].includes(memoryPhase)){
      memoryClear();memoryPhase='paused';memorySetPads(false);
      $('memoryStart').disabled=false;$('memoryStart').textContent='REINICIAR DESAFÍO ↗';
      $('memoryFeedback').textContent='Prueba interrumpida. Tocá para empezar de nuevo.';
    }
  });



  // ZUNA SEASONS — calendario local, no modifica XP ni las misiones existentes.
  let seasonSelectedLength=30;
  function migrateSeason(){
    const s=state.season;
    if(!s||typeof s!=='object'||Array.isArray(s)){state.season={current:null,history:[]};return;}
    const dateOK=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(localDate(d).getTime())&&dateKey(localDate(d))===d;
    const valid=x=>x&&typeof x==='object'&&[30,66].includes(x.length)&&dateOK(x.start)&&typeof x.claimed==='boolean';
    state.season={current:valid(s.current)?{start:s.current.start,length:s.current.length,claimed:s.current.claimed}:null,
      history:(Array.isArray(s.history)?s.history:[]).filter(valid).slice(-30).map(x=>({start:x.start,length:x.length,claimed:x.claimed}))};
  }
  migrateSeason();
  function seasonCounts(s){
    const elapsed=Math.max(0,daysBetween(s.start,isoToday()));
    const passed=Math.min(s.length,elapsed+1);
    let active=0;
    for(let i=0;i<passed;i++){const d=addDays(s.start,i);if(doneIds(d).length)active++;}
    return {elapsed,passed,active,finished:elapsed>=s.length-1,required:Math.ceil(s.length*.7)};
  }
  function renderSeason(){
    if(!$('seasonSetup'))return;
    const s=state.season.current,setup=$('seasonSetup'),active=$('seasonActive');
    setup.hidden=!!s;active.hidden=!s;
    document.querySelectorAll('[data-season-length]').forEach(b=>{
      const selected=Number(b.dataset.seasonLength)===seasonSelectedLength;
      b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));
    });
    if(!s)return;
    const v=seasonCounts(s),pct=Math.min(100,Math.round(v.passed/s.length*100));
    $('seasonDay').textContent=v.passed+' / '+s.length;
    $('seasonActiveDays').textContent=String(v.active);
    $('seasonPercent').textContent=pct+'%';
    $('seasonProgress').setAttribute('aria-valuenow',String(pct));
    $('seasonProgressFill').style.width=pct+'%';
    const milestones=[7,14,30,66].filter(n=>n<=s.length);
    const holder=$('seasonMilestones');holder.replaceChildren();
    for(const n of milestones){
      const span=document.createElement('span');span.className='season-milestone'+(v.passed>=n?' reached':'');
      span.textContent=(v.passed>=n?'✦ ':'◇ ')+n+' días';holder.append(span);
    }
    const eligible=v.finished&&v.active>=v.required;
    $('seasonClaim').hidden=!eligible||s.claimed;
    $('seasonNext').hidden=!v.finished;
    $('seasonStatus').textContent=s.claimed?'¡Insignia conseguida! Tu temporada quedó registrada.':
      !v.finished?'Llevás '+v.active+' días activos. Meta de insignia: '+v.required+' días con al menos una misión.':
      eligible?'¡Temporada completada! Ya podés reclamar tu insignia.':
      'Terminó la temporada. Registraste '+v.active+' días activos de '+v.required+' necesarios para la insignia. Podés empezar otra cuando quieras.';
  }
  document.querySelectorAll('[data-season-length]').forEach(b=>b.addEventListener('click',()=>{
    seasonSelectedLength=Number(b.dataset.seasonLength);renderSeason();
  }));
  $('seasonStart').addEventListener('click',()=>{
    if(state.season.current)return;
    state.season.current={start:isoToday(),length:seasonSelectedLength,claimed:false};
    save();showToast('¡Tu temporada empezó!');
  });
  $('seasonClaim').addEventListener('click',()=>{
    const s=state.season.current;if(!s||s.claimed)return;
    const v=seasonCounts(s);if(!v.finished||v.active<v.required)return;
    s.claimed=true;save();showToast('¡Insignia de temporada desbloqueada!');
  });
  $('seasonNext').addEventListener('click',()=>{
    const s=state.season.current;if(!s||!seasonCounts(s).finished)return;
    state.season.history.push({...s});state.season.history=state.season.history.slice(-30);
    state.season.current=null;save();
  });

  // ZUNA CORE 2.18 — evolución visual y selección de personaje, sin penalizar XP.
  function migrateCore(){
    const raw=state.core&&typeof state.core==='object'&&!Array.isArray(state.core)?state.core:{};
    state.core={gender:raw.gender==='female'?'female':'male'};
  }
  migrateCore();
  let corePreviewStage=null;
  function renderCore(){
    const figure=$('coreFigure');if(!figure)return;
    const xp=Math.max(0,Number(state.xp)||0);
    const stages=['Despertar','Enfoque','Constancia','Disciplina','Maestría'];
    const thresholds=[0,500,1500,3000,6000];
    const actual=thresholds.reduce((a,t,i)=>xp>=t?i+1:a,1);
    const visible=corePreviewStage===null?actual:corePreviewStage;
    const daysSince=state.lastActive?Math.max(0,Math.floor((new Date(isoToday()+'T12:00:00')-new Date(state.lastActive+'T12:00:00'))/86400000)):99;
    const energy=daysSince<=1?100:daysSince===2?65:daysSince===3?40:20;
    const gender=state.core.gender;
    const artStage=visible<=2?1:visible<=4?3:5;
    figure.dataset.art=String(artStage);
    figure.dataset.stage=String(visible);
    figure.dataset.energy=energy<=40?'low':energy<100?'mid':'high';
    figure.dataset.gender=gender;
    figure.setAttribute('aria-label','ZUNA CORE '+(gender==='female'?'femenino':'masculino')+', vista de '+stages[visible-1]+(visible>actual?', etapa todavía bloqueada':'')+', energía '+energy+' por ciento');
    $('coreStageTag').textContent=stages[actual-1].toUpperCase();
    $('coreStageName').textContent=String(actual).padStart(2,'0')+' · '+stages[actual-1];
    $('corePortraitLabel').textContent=String(visible).padStart(2,'0')+' · '+stages[visible-1].toUpperCase();
    $('corePreviewTag').textContent=visible>actual?'VISTA PREVIA · BLOQUEADO':visible===actual?'TU ETAPA ACTUAL':'ETAPA DESBLOQUEADA';
    $('coreEnergyFill').style.width=energy+'%';
    $('coreEnergyText').textContent=energy===100?'Tu núcleo está brillando. Seguí construyendo.':energy>=65?'Tu núcleo mantiene su luz.':energy>=40?'Tu energía está más tranquila. Volvé a tu ritmo.':'Tu núcleo está en reposo. Podés retomarlo cuando quieras.';
    $('coreNextStage').textContent=actual===5?'Alcanzaste Maestría. Tu evolución continúa.':'Siguiente etapa: '+stages[actual]+' · '+Math.max(0,thresholds[actual]-xp)+' XP restantes';
    $('corePreviewNote').textContent=visible>actual?'Vista previa de '+stages[visible-1]+'. Se desbloquea al llegar a '+thresholds[visible-1].toLocaleString('es-AR')+' XP. Tu progreso no cambia.':visible<actual?'Ya desbloqueaste esta etapa.':'Esta es tu etapa actual. Explorá las demás sin cambiar tu progreso.';
    $('coreReturnStage').hidden=corePreviewStage===null||visible===actual;
    document.querySelectorAll('[data-core-stage]').forEach(b=>{
      const n=Number(b.dataset.coreStage);
      b.classList.toggle('selected',n===visible);
      b.classList.toggle('locked',n>actual);
      b.setAttribute('aria-pressed',String(n===visible));
      b.setAttribute('aria-label','Etapa '+n+', '+stages[n-1]+(n>actual?', bloqueada; mostrar vista previa':', desbloqueada'));
    });
    document.querySelectorAll('[data-core-gender]').forEach(b=>{
      const chosen=b.dataset.coreGender===gender;b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',String(chosen));
    });
  }
  document.querySelectorAll('[data-core-stage]').forEach(b=>b.addEventListener('click',()=>{
    const stage=Number(b.dataset.coreStage);
    if(!Number.isInteger(stage)||stage<1||stage>5)return;
    corePreviewStage=stage;renderCore();
  }));
  $('coreReturnStage').addEventListener('click',()=>{corePreviewStage=null;renderCore();});
  document.querySelectorAll('[data-core-gender]').forEach(b=>b.addEventListener('click',()=>{
    if(!['male','female'].includes(b.dataset.coreGender))return;
    state.core.gender=b.dataset.coreGender;save();showToast('Personaje actualizado');
  }));

  $('resetData').addEventListener('click',()=>{if(confirm('¿Borrar todo tu progreso?')&&confirm('Esta acción no se puede deshacer. ¿Continuar?')){state=fresh();migrateMissionData();migrateReminders();migrateSport();migrateTrainingPlan();migrateNutrition();migrateCognitive();migrateCore();migrateSeason();labReset();memoryReset();saveRaw();render();openModal('onboardingModal')}});
  $('finishOnboarding').addEventListener('click',()=>{state.name=$('onboardingName').value.trim()||'Usuario';state.onboarded=true;save();closeModal('onboardingModal');showToast('Bienvenido a ZUNAREBORN')});
  // PWA: detect updates without silently reloading or touching user data.
  if('serviceWorker' in navigator&&location.protocol.startsWith('http')){
    navigator.serviceWorker.register('./sw.js').then(reg=>{
      let dismissed=false;
      const notice=$('zunaUpdateNotice');
      const offer=()=>{if(!dismissed&&reg.waiting&&navigator.serviceWorker.controller)notice.hidden=false};
      if(reg.waiting)offer();
      reg.addEventListener('updatefound',()=>{
        const worker=reg.installing;if(!worker)return;
        worker.addEventListener('statechange',()=>{if(worker.state==='installed')offer()});
      });
      $('zunaUpdateDismiss').addEventListener('click',()=>{dismissed=true;notice.hidden=true});
      $('zunaUpdateApply').addEventListener('click',()=>{
        notice.hidden=true;
        if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
        else location.reload();
      });
      let reloadRequested=false;
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(!reloadRequested&&document.visibilityState==='visible'){reloadRequested=true;location.reload()}
      });
      document.addEventListener('visibilitychange',()=>{if(!document.hidden){reg.update().catch(()=>{});offer()}});
    }).catch(()=>{});
  }
  // Si la app permanece abierta durante la medianoche, actualizamos el estado al volver a ella.
  let lastVisibleDay=isoToday();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){const now=isoToday();if(lastVisibleDay!==now){lastVisibleDay=now;render()}checkReminders()}});
  saveRaw();render();if(!state.onboarded)openModal('onboardingModal');checkReminders();setInterval(checkReminders,60000);
})();
