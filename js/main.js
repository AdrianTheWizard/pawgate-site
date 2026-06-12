// ═══ Persistent storage helpers ═══
function loadUsers() {
  try { return JSON.parse(localStorage.getItem('pg_users') || '[]'); } catch(e) { return []; }
}
function saveUsers() {
  try { localStorage.setItem('pg_users', JSON.stringify(users)); } catch(e) {}
}

// ═══ Data ═══
let users = loadUsers();
let files = [
  {name:'Interaktiv prototype', type:'Proto', cat:'app', url:'kennel-app-prototype.html', meta:'HTML · v0.9 beta', status:'available'},
  {name:'3D-modell hundeluke',  type:'3D',    cat:'doc', url:'pawgate-door-3d.html',      meta:'HTML · Interaktiv', status:'available'},
  {name:'Teknisk skisse',       type:'Skisse',cat:'doc', url:'pawgate-handskisse.html',   meta:'HTML · Handskisse', status:'available'},
  {name:'PawGate for iPhone',   type:'iOS',   cat:'app', url:'',                          meta:'iOS 16+ · App Store', status:'coming'},
  {name:'PawGate for Android',  type:'Andr.', cat:'app', url:'',                          meta:'Android 10+', status:'coming'},
  {name:'ESP32 Firmware',       type:'ESP FW',cat:'doc', url:'',                          meta:'v1.0.0 · .bin', status:'coming'},
];
let featData = [
  {title:'Automatiske hundeluker', body:'Sett timere for hver binge — luken åpner og lukker seg selv. Styr manuelt fra hvor som helst i verden.'},
  {title:'Automatisk spyling', body:'Automatisk spyling på faste tider. Se siste spyling og start manuelt på sekundet om noe kommer opp.'},
  {title:'Live kamera', body:'Se live-bilder fra alle binger direkte i appen. Støtter RTSP, ONVIF, WiFi og PawGate eget kamera.'},
  {title:'Flerbruker med roller', body:'Inviter ansatte med nøyaktig de tilgangene de skal ha. Eier, administrator, ansatt eller leser — eller lag egne roller.'},
  {title:'Smarte varsler', body:'Varsel hvis temperaturen er feil, spyling ikke er gjort, kamera mister signal, eller en luke ikke svarer.'},
  {title:'Oppgavekalender', body:'Planlegg og fordel daglig arbeid — vaksinering, veterinærtime, rengjøring og alt annet. Med egne kategorier og farger.'},
];

// ═══ Overlay utils ═══
function openOv(id){ document.getElementById(id).classList.add('open'); document.body.style.overflow='hidden'; }
function closeOv(id){ document.getElementById(id).classList.remove('open'); document.body.style.overflow=''; }
document.addEventListener('keydown', e=>{ if(e.key==='Escape')['auth-ov','dl-ov','ok-ov'].forEach(closeOv); });

// ═══ Auth ═══
function openAuth(){ swTab('login'); openOv('auth-ov'); }
function openDownloadModal(){ renderDLModal(); openOv('dl-ov'); }

function swTab(t){
  ['login','reg','admin'].forEach(id=>{
    document.getElementById('t-'+id)?.classList.toggle('active',id===t);
    document.getElementById('p-'+id)?.classList.toggle('active',id===t);
  });
  if(t==='login'){ document.getElementById('t-login').classList.add('active'); document.getElementById('p-login').classList.add('active'); }
  else if(t==='reg'){ document.getElementById('t-reg').classList.add('active'); document.getElementById('p-reg').classList.add('active'); }
  else if(t==='admin'){ document.getElementById('p-admin').classList.add('active'); }
}

function doLogin(){
  const e=document.getElementById('l-email').value.trim();
  const p=document.getElementById('l-pass').value;
  if(!e||!p){ alert('Fyll ut alle feltene'); return; }
  closeOv('auth-ov');
  showOk('Innlogget!',`Velkommen tilbake, \${e}`,'👋');
}

function doReg(){
  const n=document.getElementById('r-name').value.trim();
  const e=document.getElementById('r-email').value.trim();
  const p=document.getElementById('r-pass').value;
  if(!n||!e||!p){ alert('Fyll ut alle feltene'); return; }
  const nl=document.getElementById('r-nl').checked;
  const launch=document.getElementById('r-launch').checked;
  users.push({name:n,email:e,date:new Date().toISOString().slice(0,10),nl,launch});
  saveUsers();
  closeOv('auth-ov');
  showOk('Registrert!', nl?'Vi sender deg en e-post når det er noe nytt fra PawGate.':'Kontoen din er opprettet. Velkommen!', '🎉');
  updateStats();
}

function doAdminLogin(){
  const e=document.getElementById('a-email').value.trim();
  const p=document.getElementById('a-pass').value;
  if(e==='admin@pawgate.no'&&p==='PawG8!Admin#2026'){ closeOv('auth-ov'); openAdmin(); }
  else alert('Feil e-post eller passord');
}

function showOk(title,body,icon='🎉'){
  document.getElementById('ok-icon').textContent=icon;
  document.getElementById('ok-title').textContent=title;
  document.getElementById('ok-body').textContent=body;
  openOv('ok-ov');
}

// ═══ Download modal ═══
function renderDLModal(){
  const c=document.getElementById('dl-list');
  const dlSvg='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const cats=[{id:'app',lbl:'Mobilapp'},{id:'doc',lbl:'Dokumenter og skisser'}];
  c.innerHTML='';
  cats.forEach(function(cat){
    var catFiles=files.filter(function(f){return f.cat===cat.id;});
    if(!catFiles.length) return;
    var lbl=document.createElement('div');
    lbl.style.cssText='font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;margin-top:4px';
    lbl.textContent=cat.lbl;
    c.appendChild(lbl);
    catFiles.forEach(function(f){
      var el=document.createElement('div');
      el.style.cssText='display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--bg);border:1px solid var(--border);border-radius:12px;margin-bottom:8px';
      var typeDiv='<div style="width:44px;height:44px;border-radius:12px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:\'IBM Plex Mono\',monospace;font-size:9px;font-weight:600;color:var(--accent);flex-shrink:0;text-align:center;line-height:1.3">'+f.type+'</div>';
      var infoDiv='<div style="flex:1"><div style="font-size:14px;font-weight:600;margin-bottom:2px">'+f.name+'</div><div style="font-size:11px;color:var(--muted);font-family:\'IBM Plex Mono\',monospace">'+f.meta+'</div></div>';
      var action;
      if(f.status==='available'){
        action='<a href="'+f.url+'" download style="padding:9px 18px;border-radius:9px;background:var(--accent);color:#0c0b09;font-family:\'IBM Plex Sans\',sans-serif;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;display:flex;align-items:center;gap:6px;flex-shrink:0">'+dlSvg+'Last ned</a>';
      } else {
        action='<span style="font-size:10px;padding:4px 10px;border-radius:6px;background:var(--surface2);color:var(--muted);border:1px solid var(--border2);font-family:\'IBM Plex Mono\',monospace;white-space:nowrap">Kommer snart</span>';
      }
      el.innerHTML=typeDiv+infoDiv+action;
      c.appendChild(el);
    });
  });
}


// ═══ Admin ═══
function openAdmin(){
  renderAdmin();
  document.getElementById('admin-shell').classList.add('open');
}
function closeAdmin(){
  document.getElementById('admin-shell').classList.remove('open');
}

function showAP(id,el){
  document.querySelectorAll('.apage').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.anav').forEach(n=>n.classList.remove('on'));
  document.getElementById('ap-'+id).classList.add('on');
  el.classList.add('on');
  if(id==='users') renderUsersTable();
  if(id==='nl') renderNLTable();
  if(id==='files') renderFilesTable();
  if(id==='feat') renderFeatAdmin();
  if(id==='price') renderPriceAdmin();
}

function renderAdmin(){
  updateStats();
  renderFilesTable();
  renderUsersTable();
  renderNLTable();
  renderFeatAdmin();
  renderPriceAdmin();
}

function updateStats(){
  const n=users.length, nl=users.filter(u=>u.nl).length, av=files.filter(f=>f.status==='available').length;
  ['sn-users','sn-nl','sn-files'].forEach((id,i)=>{ const el=document.getElementById(id); if(el)el.textContent=[n,nl,av][i]; });
  const su=document.getElementById('users-sub'); if(su)su.textContent=n+' registrerte';
  const nln=document.getElementById('nl-n'); if(nln)nln.textContent=nl;
  // dash table
  const dt=document.getElementById('dash-users'); if(!dt)return;
  dt.innerHTML='';
  [...users].reverse().slice(0,5).forEach(u=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>\${u.name}</strong></td><td style="font-family:'IBM Plex Mono',monospace;font-size:11px">\${u.email}</td><td style="color:var(--muted);font-size:12px">\${u.date}</td><td><span class="badge \${u.nl?'bg':'bm'}">\${u.nl?'Ja':'Nei'}</span></td>`;
    dt.appendChild(tr);
  });
}

function renderFilesTable(){
  const t=document.getElementById('files-tbody'); if(!t)return;
  t.innerHTML='';
  files.forEach((f,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>\${f.name}</strong></td><td><span class="badge bm">\${f.cat==='app'?'App':'Dok.'}</span></td><td style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${f.url||'—'}</td><td><span class="badge \${f.status==='available'?'bg':'bm'}">\${f.status==='available'?'Tilgjengelig':'Snart'}</span></td><td style="display:flex;gap:6px"><button class="btn btn-ghost" style="padding:5px 10px;font-size:11px" onclick="editFile(\${i})">Rediger</button><button class="btn" style="padding:5px 10px;font-size:11px;background:rgba(184,90,74,.1);border-color:rgba(184,90,74,.2);color:#e07060" onclick="delFile(\${i})">Slett</button></td>`;
    t.appendChild(tr);
  });
}

function showAddFile(){ document.getElementById('add-file-card').style.display='block'; document.getElementById('nf-name').focus(); }
function addFile(){
  const n=document.getElementById('nf-name').value.trim();
  if(!n){ alert('Navn er påkrevd'); return; }
  const tp=document.getElementById('nf-type').value.trim()||'FIL';
  files.push({name:n,type:tp,cat:document.getElementById('nf-cat').value,url:document.getElementById('nf-url').value.trim(),meta:document.getElementById('nf-meta').value.trim(),status:document.getElementById('nf-status').value});
  document.getElementById('add-file-card').style.display='none';
  ['nf-name','nf-type','nf-url','nf-meta'].forEach(id=>document.getElementById(id).value='');
  renderFilesTable(); updateStats();
  alert(`"\${n}" lagt til!`);
}
function delFile(i){ if(!confirm(`Slett "\${files[i].name}"?`))return; files.splice(i,1); renderFilesTable(); updateStats(); }
function editFile(i){
  const f=files[i];
  const u=prompt('Ny nedlastingslenke:',f.url);
  if(u===null)return;
  files[i].url=u; files[i].status=u?'available':'coming';
  renderFilesTable(); alert('Oppdatert!');
}

function renderUsersTable(){
  const t=document.getElementById('users-tbody'); if(!t)return;
  t.innerHTML='';
  users.forEach(u=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>\${u.name}</strong></td><td style="font-family:'IBM Plex Mono',monospace;font-size:11px">\${u.email}</td><td style="color:var(--muted);font-size:12px">\${u.date}</td><td><span class="badge \${u.nl?'bg':'bm'}">\${u.nl?'Ja':'Nei'}</span></td><td><span class="badge \${u.launch?'bgo':'bm'}">\${u.launch?'Ja':'Nei'}</span></td>`;
    t.appendChild(tr);
  });
  const su=document.getElementById('users-sub'); if(su)su.textContent=users.length+' registrerte';
}

function renderNLTable(){
  const t=document.getElementById('nl-tbody'); if(!t)return;
  t.innerHTML='';
  users.filter(u=>u.nl).forEach(u=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td style="font-family:'IBM Plex Mono',monospace;font-size:12px">\${u.email}</td><td><span class="badge \${u.launch?'bgo':'bm'}">\${u.launch?'Ja':'Nei'}</span></td><td style="color:var(--muted);font-size:12px">\${u.date}</td>`;
    t.appendChild(tr);
  });
  const nln=document.getElementById('nl-n'); if(nln)nln.textContent=users.filter(u=>u.nl).length;
}

function renderFeatAdmin(){
  const c=document.getElementById('feat-admin'); if(!c)return;
  c.innerHTML='';
  featData.forEach((f,i)=>{
    const div=document.createElement('div');
    div.className='acard'; div.style.marginBottom='16px';
    div.innerHTML=`<div class="acard-hdr"><div class="acard-title">Funksjon \${i+1}</div><button class="btn btn-primary" style="padding:6px 14px;font-size:12px" onclick="saveFeat(\${i})">Lagre</button></div><div class="acard-body"><div class="arow"><div class="field"><label>Tittel</label><input type="text" class="inp" id="ft-t-\${i}" value="\${f.title}"></div><div class="field"><label>Beskrivelse</label><input type="text" class="inp" id="ft-b-\${i}" value="\${f.body}"></div></div></div>`;
    c.appendChild(div);
  });
}
function saveFeat(i){
  featData[i].title=document.getElementById(`ft-t-\${i}`).value;
  featData[i].body=document.getElementById(`ft-b-\${i}`).value;
  const cards=document.querySelectorAll('.feature-card');
  if(cards[i]){ cards[i].querySelector('.feature-title').textContent=featData[i].title; cards[i].querySelector('.feature-body').textContent=featData[i].body; }
  alert('Oppdatert!');
}

function renderPriceAdmin(){
  const c=document.getElementById('price-admin'); if(!c)return;
  const plans=[{n:'Basis',p:'Gratis',per:'Prøv uten kredittkort'},{n:'Pro',p:'399 kr',per:'per mnd · ingen binding'},{n:'Complete',p:'fra 15 000 kr',per:'engangskostnad + 399 kr/mnd'}];
  c.innerHTML='';
  plans.forEach((p,i)=>{
    const div=document.createElement('div');
    div.className='acard';
    div.innerHTML=`<div class="acard-hdr"><div class="acard-title">\${p.n}</div><button class="btn btn-primary" style="padding:5px 12px;font-size:11px" onclick="alert('Lagret!')">Lagre</button></div><div class="acard-body" style="display:flex;flex-direction:column;gap:10px"><div class="field"><label>Pris</label><input type="text" class="inp" value="\${p.p}"></div><div class="field"><label>Periode</label><input type="text" class="inp" value="\${p.per}"></div></div>`;
    c.appendChild(div);
  });
}

function saveHero(){
  const t1=document.getElementById('h-t1').value, t2=document.getElementById('h-t2').value, t3=document.getElementById('h-t3').value, body=document.getElementById('h-body').value;
  const te=document.querySelector('.hero-title'); if(te)te.innerHTML=`\${t1}<br><em>\${t2}</em><br>\${t3}`;
  const be=document.querySelector('.hero-body'); if(be)be.textContent=body;
  alert('Hero oppdatert!');
}
function saveHW(){
  const title=document.getElementById('hw-t').value, desc=document.getElementById('hw-d').value, img=document.getElementById('hw-img').value;
  const te=document.getElementById('hw-title'); if(te)te.textContent=title;
  const de=document.getElementById('hw-desc'); if(de)de.textContent=desc;
  if(img){ const ve=document.getElementById('hw-visual'); if(ve)ve.innerHTML=`<img src="\${img}" style="max-width:100%;max-height:100%;border-radius:12px;object-fit:contain">`; }
  alert('Hardware-seksjon oppdatert!');
}
function prevHWImg(input){
  const file=input.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{ document.getElementById('hw-prev').style.display='block'; document.getElementById('hw-prev-img').src=e.target.result; };
  reader.readAsDataURL(file);
}

// ═══ Theme ═══
function toggleTheme(){
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const next = isLight ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('pg-theme', next);
  updateNavBg();
}

(function initTheme(){
  const saved = localStorage.getItem('pg-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  if(theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
})();

// Nav scroll
function updateNavBg(){
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const nav = document.querySelector('nav');
  if(isLight){
    nav.style.background = window.scrollY > 40 ? 'rgba(250,249,245,.98)' : 'rgba(250,249,245,.92)';
  } else {
    nav.style.background = window.scrollY > 40 ? 'rgba(12,11,9,.97)' : 'rgba(12,11,9,.88)';
  }
}
window.addEventListener('scroll', updateNavBg);