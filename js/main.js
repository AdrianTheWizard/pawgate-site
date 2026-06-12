// ═══ Supabase ═══
const _sb = supabase.createClient(
  'https://mzabpomdobkeuhwcjyvs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16YWJwb21kb2JrZXVod2NqeXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTYzMzAsImV4cCI6MjA5NjgzMjMzMH0.bb4q28cVQiNfwIhEeqJpuJgP2Ro0FUdMe7AeSG-i0ak'
);

// ═══ HTML escaping — always use this when writing user data into innerHTML ═══
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ═══ Email via Supabase Edge Functions (Resend API key lives server-side only) ═══
async function sendWelcomeEmail() {
  try {
    await _sb.functions.invoke('send-email', { body: { type: 'welcome' } });
  } catch(e) { console.error('Welcome email failed:', e); }
}

function sendPasswordChangedEmail() {
  _sb.functions.invoke('send-email', { body: { type: 'password_changed' } })
    .catch(e => console.error('Password email failed:', e));
}

// ═══ Supabase data ═══
async function sbLoadUsers() {
  const { data, error } = await _sb.from('registrations').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Supabase load error:', error); return []; }
  return data.map(r => ({ name: r.name, email: r.email, date: r.created_at.slice(0,10), nl: r.newsletter, launch: r.launch_notify }));
}

async function sbSaveUser(u) {
  const { error } = await _sb.from('registrations').insert({
    name: u.name, email: u.email, newsletter: u.nl, launch_notify: u.launch
  });
  if (error) throw error;
}

// ═══ Admin role ═══
let _isAdmin = false;

async function checkIsAdmin(email) {
  try {
    const { data } = await _sb.from('admins').select('email').eq('email', email).maybeSingle();
    return !!data;
  } catch(e) { return false; }
}

function updateProfileAdminBtn() {
  const btn = document.getElementById('profile-admin-btn');
  const div = document.getElementById('admin-divider');
  if(btn) btn.style.display = _isAdmin ? 'flex' : 'none';
  if(div) div.style.display = _isAdmin ? '' : 'none';
}

// ═══ Data ═══
let users = [];
let files = [
  {name:'PawGate for Windows',  type:'Win',   cat:'app', url:'https://github.com/AdrianTheWizard/pawgate-app/releases/download/v1.0.0/PawGate.Setup.1.0.0.exe', meta:'Windows 10/11 · v1.0.0', status:'available'},
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

// ═══ Auth state & nav ═══
function getInitials(name) {
  if(!name) return '?';
  const parts = name.trim().split(/\s+/);
  if(parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
}

function updateNavAuth(user) {
  const loginBtn = document.getElementById('nav-login');
  const avatarBtn = document.getElementById('nav-avatar');
  if(!loginBtn || !avatarBtn) return;
  if(user) {
    const name = user.user_metadata?.name || user.email;
    const initials = getInitials(name);
    loginBtn.style.display = 'none';
    avatarBtn.style.display = 'flex';
    avatarBtn.textContent = initials;
  } else {
    loginBtn.style.display = '';
    avatarBtn.style.display = 'none';
  }
}

async function openProfile() {
  const { data: { user } } = await _sb.auth.getUser();
  if(!user) return;
  const isAdmin = await checkIsAdmin(user.email);
  _isAdmin = isAdmin;
  const meta = user.user_metadata || {};
  document.getElementById('profile-title').textContent = meta.name || 'Min profil';
  document.getElementById('profile-email-sub').textContent = user.email;
  document.getElementById('profile-av-big').textContent = getInitials(meta.name || user.email);
  document.getElementById('p-name').value = meta.name || '';
  document.getElementById('p-location').value = meta.location || '';
  document.getElementById('p-phone').value = meta.phone || '';
  document.getElementById('p-email').value = user.email;
  document.getElementById('p-pass').value = '';
  document.getElementById('p-pass2').value = '';
  updateProfileAdminBtn();
  openOv('profile-ov');
}

async function saveProfile() {
  const name = document.getElementById('p-name').value.trim();
  const location = document.getElementById('p-location').value.trim();
  const phone = document.getElementById('p-phone').value.trim();
  const { data, error } = await _sb.auth.updateUser({ data: { name, location, phone } });
  if(error) { alert('Kunne ikke lagre. Prøv igjen.'); return; }
  updateNavAuth(data.user);
  document.getElementById('profile-title').textContent = name || 'Min profil';
  document.getElementById('profile-av-big').textContent = getInitials(name || data.user.email);
  showOk('Lagret!', 'Profilen din er oppdatert.', '✅');
  closeOv('profile-ov');
}

async function updateProfileEmail() {
  const email = document.getElementById('p-email').value.trim();
  if(!email) { alert('Skriv inn ny e-post.'); return; }
  const { error } = await _sb.auth.updateUser({ email });
  if(error) { alert('Kunne ikke oppdatere e-post. Prøv igjen.'); return; }
  showOk('Bekreft ny e-post', 'Vi har sendt en bekreftelseslenke til den nye e-postadressen din.', '📧');
  closeOv('profile-ov');
}

async function updateProfilePassword() {
  const p = document.getElementById('p-pass').value;
  const p2 = document.getElementById('p-pass2').value;
  if(!p || !p2) { alert('Fyll ut begge passordfelter.'); return; }
  if(p !== p2) { alert('Passordene stemmer ikke overens.'); return; }
  if(p.length < 8) { alert('Passordet må være minst 8 tegn.'); return; }
  const { error } = await _sb.auth.updateUser({ password: p });
  if(error) { alert('Kunne ikke oppdatere passord. Prøv igjen.'); return; }
  sendPasswordChangedEmail();
  showOk('Passord oppdatert!', 'Ditt nye passord er aktivt. Vi har sendt en bekreftelse til e-posten din.', '✅');
  closeOv('profile-ov');
}

async function doLogout() {
  await _sb.auth.signOut();
  updateNavAuth(null);
  _isAdmin = false;
  updateProfileAdminBtn();
  closeOv('profile-ov');
  showOk('Logget ut', 'Du er nå logget ut av PawGate.', '👋');
}

// ═══ Overlay utils ═══
function openOv(id){ document.getElementById(id).classList.add('open'); document.body.style.overflow='hidden'; }
function closeOv(id){ document.getElementById(id).classList.remove('open'); document.body.style.overflow=''; }

// ═══ Auth ═══
function openAuth(){ swTab('login'); openOv('auth-ov'); }
function openDownloadModal(){ renderDLModal(); openOv('dl-ov'); }

function swTab(t){
  ['login','reg','forgot'].forEach(id=>{
    document.getElementById('t-'+id)?.classList.toggle('active',id===t);
    document.getElementById('p-'+id)?.classList.toggle('active',id===t);
  });
  const titles={'login':'Logg inn','reg':'Registrer deg','forgot':'Glemt passord'};
  const subs={'login':'Velkommen til PawGate','reg':'Opprett konto','forgot':'Vi sender deg en tilbakestillingslenke'};
  document.querySelector('#auth-ov .mtitle').textContent = titles[t]||titles.login;
  document.querySelector('#auth-ov .msub').textContent = subs[t]||subs.login;
}

async function doLogin(){
  const e=document.getElementById('l-email').value.trim();
  const p=document.getElementById('l-pass').value;
  if(!e||!p){ alert('Fyll ut alle feltene'); return; }
  const { data, error } = await _sb.auth.signInWithPassword({ email: e, password: p });
  if(error){ alert('Feil e-post eller passord. Prøv igjen.'); return; }
  updateNavAuth(data.user);
  checkIsAdmin(data.user.email).then(isAdmin => { _isAdmin = isAdmin; updateProfileAdminBtn(); });
  const name = data.user.user_metadata?.name || e;
  closeOv('auth-ov');
  showOk('Innlogget!', `Velkommen tilbake, ${name.split(' ')[0]}!`, '👋');
}

async function doReg(){
  const n=document.getElementById('r-name').value.trim();
  const e=document.getElementById('r-email').value.trim();
  const p=document.getElementById('r-pass').value;
  if(!n||!e||!p){ alert('Fyll ut alle feltene'); return; }
  if(p.length<8){ alert('Passordet må være minst 8 tegn.'); return; }
  const nl=document.getElementById('r-nl').checked;
  const launch=document.getElementById('r-launch').checked;
  const { error: authErr } = await _sb.auth.signUp({
    email: e, password: p,
    options: { data: { name: n } }
  });
  if(authErr){
    if(authErr.message.includes('already registered')){ alert('Denne e-posten er allerede registrert.'); return; }
    alert('Noe gikk galt. Prøv igjen.'); console.error(authErr); return;
  }
  const u={name:n,email:e,date:new Date().toISOString().slice(0,10),nl,launch};
  try { await sbSaveUser(u); users.push(u); } catch(err){ console.error(err); }
  sendWelcomeEmail();
  closeOv('auth-ov');
  showOk('Registrert! 🐾','Vi har sendt deg en velkomst-e-post fra PawGate. Sjekk innboksen din — og husk å se i søppelpost/spam om du ikke finner den.','🎉');
  updateStats();
}

async function doResetPassword(){
  const p=document.getElementById('rp-pass').value;
  const p2=document.getElementById('rp-pass2').value;
  if(!p||!p2){ alert('Fyll ut begge feltene.'); return; }
  if(p!==p2){ alert('Passordene stemmer ikke overens.'); return; }
  if(p.length<8){ alert('Passordet må være minst 8 tegn.'); return; }
  const { error } = await _sb.auth.updateUser({ password: p });
  if(error){ alert('Noe gikk galt. Prøv å be om en ny tilbakestillingslenke.'); return; }
  document.getElementById('reset-ov').classList.remove('open');
  showOk('Passord oppdatert!','Du kan nå logge inn med ditt nye passord.','✅');
}

async function doForgot(){
  const e=document.getElementById('f-email').value.trim();
  if(!e){ alert('Skriv inn e-postadressen din.'); return; }
  const { error } = await _sb.auth.resetPasswordForEmail(e, { redirectTo: 'https://pawgate.no' });
  if(error){ alert('Noe gikk galt. Prøv igjen.'); return; }
  closeOv('auth-ov');
  showOk('E-post sendt!','Sjekk innboksen din for en lenke for å tilbakestille passordet.','📧');
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
      var typeDiv='<div style="width:44px;height:44px;border-radius:12px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:\'IBM Plex Mono\',monospace;font-size:9px;font-weight:600;color:var(--accent);flex-shrink:0;text-align:center;line-height:1.3">'+esc(f.type)+'</div>';
      var infoDiv='<div style="flex:1"><div style="font-size:14px;font-weight:600;margin-bottom:2px">'+esc(f.name)+'</div><div style="font-size:11px;color:var(--muted);font-family:\'IBM Plex Mono\',monospace">'+esc(f.meta)+'</div></div>';
      var action;
      if(f.status==='available'){
        action='<a href="'+esc(f.url)+'" download style="padding:9px 18px;border-radius:9px;background:var(--accent);color:#0c0b09;font-family:\'IBM Plex Sans\',sans-serif;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;display:flex;align-items:center;gap:6px;flex-shrink:0">'+dlSvg+'Last ned</a>';
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
  _sb.auth.getUser().then(({data:{user}})=>{
    const lbl=document.getElementById('a-user-lbl');
    if(lbl&&user) lbl.textContent=user.email;
  });
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
  if(id==='users') sbLoadUsers().then(u=>{users=u;renderUsersTable();});
  if(id==='nl') sbLoadUsers().then(u=>{users=u;renderNLTable();});
  if(id==='files') renderFilesTable();
  if(id==='feat') renderFeatAdmin();
  if(id==='price') renderPriceAdmin();
  if(id==='admins') renderAdminsPage();
}

async function renderAdmin(){
  users = await sbLoadUsers();
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
  const dt=document.getElementById('dash-users'); if(!dt)return;
  dt.innerHTML='';
  [...users].reverse().slice(0,5).forEach(u=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>${esc(u.name)}</strong></td><td style="font-family:'IBM Plex Mono',monospace;font-size:11px">${esc(u.email)}</td><td style="color:var(--muted);font-size:12px">${esc(u.date)}</td><td><span class="badge ${u.nl?'bg':'bm'}">${u.nl?'Ja':'Nei'}</span></td>`;
    dt.appendChild(tr);
  });
}

function renderFilesTable(){
  const t=document.getElementById('files-tbody'); if(!t)return;
  t.innerHTML='';
  files.forEach((f,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>${esc(f.name)}</strong></td><td><span class="badge bm">${f.cat==='app'?'App':'Dok.'}</span></td><td style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.url)||'—'}</td><td><span class="badge ${f.status==='available'?'bg':'bm'}">${f.status==='available'?'Tilgjengelig':'Snart'}</span></td><td style="display:flex;gap:6px"><button class="btn btn-ghost" style="padding:5px 10px;font-size:11px" onclick="editFile(${i})">Rediger</button><button class="btn" style="padding:5px 10px;font-size:11px;background:rgba(184,90,74,.1);border-color:rgba(184,90,74,.2);color:#e07060" onclick="delFile(${i})">Slett</button></td>`;
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
  alert(`"${n}" lagt til!`);
}
function delFile(i){ if(!confirm(`Slett "${files[i].name}"?`))return; files.splice(i,1); renderFilesTable(); updateStats(); }
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
    tr.innerHTML=`<td><strong>${esc(u.name)}</strong></td><td style="font-family:'IBM Plex Mono',monospace;font-size:11px">${esc(u.email)}</td><td style="color:var(--muted);font-size:12px">${esc(u.date)}</td><td><span class="badge ${u.nl?'bg':'bm'}">${u.nl?'Ja':'Nei'}</span></td><td><span class="badge ${u.launch?'bgo':'bm'}">${u.launch?'Ja':'Nei'}</span></td>`;
    t.appendChild(tr);
  });
  const su=document.getElementById('users-sub'); if(su)su.textContent=users.length+' registrerte';
}

function renderNLTable(){
  const t=document.getElementById('nl-tbody'); if(!t)return;
  t.innerHTML='';
  users.filter(u=>u.nl).forEach(u=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td style="font-family:'IBM Plex Mono',monospace;font-size:12px">${esc(u.email)}</td><td><span class="badge ${u.launch?'bgo':'bm'}">${u.launch?'Ja':'Nei'}</span></td><td style="color:var(--muted);font-size:12px">${esc(u.date)}</td>`;
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
    div.innerHTML=`<div class="acard-hdr"><div class="acard-title">Funksjon ${i+1}</div><button class="btn btn-primary" style="padding:6px 14px;font-size:12px" onclick="saveFeat(${i})">Lagre</button></div><div class="acard-body"><div class="arow"><div class="field"><label>Tittel</label><input type="text" class="inp" id="ft-t-${i}" value="${esc(f.title)}"></div><div class="field"><label>Beskrivelse</label><input type="text" class="inp" id="ft-b-${i}" value="${esc(f.body)}"></div></div></div>`;
    c.appendChild(div);
  });
}
function saveFeat(i){
  featData[i].title=document.getElementById(`ft-t-${i}`).value;
  featData[i].body=document.getElementById(`ft-b-${i}`).value;
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
    div.innerHTML=`<div class="acard-hdr"><div class="acard-title">${esc(p.n)}</div><button class="btn btn-primary" style="padding:5px 12px;font-size:11px" onclick="alert('Lagret!')">Lagre</button></div><div class="acard-body" style="display:flex;flex-direction:column;gap:10px"><div class="field"><label>Pris</label><input type="text" class="inp" value="${esc(p.p)}"></div><div class="field"><label>Periode</label><input type="text" class="inp" value="${esc(p.per)}"></div></div>`;
    c.appendChild(div);
  });
}

function saveHero(){
  const t1=document.getElementById('h-t1').value, t2=document.getElementById('h-t2').value, t3=document.getElementById('h-t3').value, body=document.getElementById('h-body').value;
  const te=document.querySelector('.hero-title'); if(te)te.innerHTML=`${t1}<br><em>${t2}</em><br>${t3}`;
  const be=document.querySelector('.hero-body'); if(be)be.textContent=body;
  alert('Hero oppdatert!');
}
function saveHW(){
  const title=document.getElementById('hw-t').value, desc=document.getElementById('hw-d').value, img=document.getElementById('hw-img').value;
  const te=document.getElementById('hw-title'); if(te)te.textContent=title;
  const de=document.getElementById('hw-desc'); if(de)de.textContent=desc;
  if(img){ const ve=document.getElementById('hw-visual'); if(ve)ve.innerHTML=`<img src="${esc(img)}" style="max-width:100%;max-height:100%;border-radius:12px;object-fit:contain">`; }
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

(function handleAuthRedirect(){
  _sb.auth.onAuthStateChange((event, session) => {
    if(event === 'PASSWORD_RECOVERY'){
      document.getElementById('reset-ov').classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    if(event === 'SIGNED_IN' || event === 'INITIAL_SESSION'){
      const user = session?.user || null;
      updateNavAuth(user);
      if(user){
        checkIsAdmin(user.email).then(isAdmin=>{ _isAdmin=isAdmin; updateProfileAdminBtn(); });
      }
      if(event === 'INITIAL_SESSION') checkEditMode();
    }
    if(event === 'SIGNED_OUT'){
      updateNavAuth(null);
      _isAdmin = false;
      updateProfileAdminBtn();
    }
  });
})();

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

// ═══ Page content (load saved edits from Supabase on every page load) ═══
async function initPageContent() {
  try {
    const { data, error } = await _sb.from('page_content').select('*');
    if(error || !data || !data.length) return;
    const map = {};
    data.forEach(r => map[r.key] = r.value);
    document.querySelectorAll('[data-pg-key]').forEach(el => {
      const val = map[el.dataset.pgKey];
      if (val === undefined) return;
      if (el.dataset.pgType === 'image') {
        if (!val) return;
        let img = el.querySelector('img.pg-zone-img');
        if (!img) {
          img = document.createElement('img');
          img.className = 'pg-zone-img';
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:inherit;position:absolute;inset:0;z-index:1';
          el.prepend(img);
        }
        img.src = val;
      } else {
        el.innerHTML = val;
      }
    });
    document.querySelectorAll('.feature-card').forEach((card, i) => {
      const t = card.querySelector('.feature-title');
      const b = card.querySelector('.feature-body');
      if(t && map[`feat.${i}.title`] !== undefined) t.innerHTML = map[`feat.${i}.title`];
      if(b && map[`feat.${i}.body`] !== undefined) b.innerHTML = map[`feat.${i}.body`];
    });
  } catch(e) { /* table may not exist yet */ }
}

// ═══ Visual editor (activated when URL has ?edit=1 and user is admin) ═══
async function checkEditMode() {
  if(!new URLSearchParams(window.location.search).has('edit')) return;
  try {
    const { data: { user } } = await _sb.auth.getUser();
    if(!user) { alert('Du må logge inn for å bruke editoren.'); return; }
    const isAdmin = await checkIsAdmin(user.email);
    if(!isAdmin) return;
    activateEditMode();
  } catch(e) { }
}

function activateEditMode() {
  document.body.insertAdjacentHTML('afterbegin',
    `<div id="pg-edit-bar" style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#b89a5a;color:#0c0b09;padding:0 14px;height:52px;display:flex;align-items:center;gap:10px;font-family:'IBM Plex Sans',sans-serif;box-shadow:0 2px 16px rgba(184,154,90,.35);overflow:hidden">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:700;letter-spacing:.1em;display:flex;align-items:center;gap:6px;flex-shrink:0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        EDITOR
      </div>
      <div id="pg-format-bar" style="display:flex;align-items:center;gap:3px;flex:1;justify-content:center;flex-wrap:nowrap;overflow:hidden">
        <button class="pg-fmt-btn" id="pg-btn-b" title="Fet (Ctrl+B)"><b>B</b></button>
        <button class="pg-fmt-btn" id="pg-btn-i" title="Kursiv (Ctrl+I)"><i>I</i></button>
        <button class="pg-fmt-btn" id="pg-btn-u" title="Understrek (Ctrl+U)"><u>U</u></button>
        <div class="pg-fmt-div"></div>
        <input type="number" class="pg-fmt-sel" id="pg-size-sel" title="Tekststørrelse (1-100)" placeholder="px" min="1" max="100" style="width:54px;text-align:center">
        <div class="pg-fmt-div"></div>
        <label title="Tekstfarge" style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;font-weight:600;color:#0c0b09">
          Farge<input type="color" id="pg-color-inp" value="#ede8dc" style="width:26px;height:24px;border:1px solid rgba(0,0,0,.2);border-radius:4px;cursor:pointer;padding:1px 2px;background:transparent">
        </label>
        <div class="pg-fmt-div"></div>
        <button class="pg-fmt-btn" id="pg-btn-clear" title="Fjern all formatering fra valgt tekst">T&times;</button>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
        <span id="pg-save-status" style="font-size:10px;opacity:.65;white-space:nowrap"></span>
        <button id="pg-save-btn" style="padding:7px 16px;background:#0c0b09;color:#b89a5a;border:none;border-radius:8px;font-family:'IBM Plex Sans',sans-serif;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap">Lagre</button>
        <a href="${window.location.pathname}" style="padding:7px 12px;background:rgba(0,0,0,.15);color:#0c0b09;border-radius:8px;font-size:11px;font-family:'IBM Plex Sans',sans-serif;text-decoration:none;font-weight:600;white-space:nowrap">Avslutt</a>
      </div>
    </div>`
  );
  document.body.style.paddingTop = '52px';
  document.body.classList.add('pg-edit-active');

  // Format toolbar — mousedown so selection is preserved when button is clicked
  document.getElementById('pg-btn-b').addEventListener('mousedown', e => { e.preventDefault(); document.execCommand('bold'); updateFormatBar(); });
  document.getElementById('pg-btn-i').addEventListener('mousedown', e => { e.preventDefault(); document.execCommand('italic'); updateFormatBar(); });
  document.getElementById('pg-btn-u').addEventListener('mousedown', e => { e.preventDefault(); document.execCommand('underline'); updateFormatBar(); });
  document.getElementById('pg-btn-clear').addEventListener('mousedown', e => { e.preventDefault(); document.execCommand('removeFormat'); updateFormatBar(); });

  document.getElementById('pg-size-sel').addEventListener('change', e => {
    const v = parseInt(e.target.value);
    if (!v || v < 1 || v > 100) return;
    applyFontSize(v + 'px');
    e.target.value = '';
  });

  document.getElementById('pg-color-inp').addEventListener('input', e => {
    document.execCommand('foreColor', false, e.target.value);
  });

  document.addEventListener('selectionchange', updateFormatBar);

  // Annotate feature cards
  document.querySelectorAll('.feature-card').forEach((card, i) => {
    const t = card.querySelector('.feature-title');
    const b = card.querySelector('.feature-body');
    if(t) t.dataset.pgKey = `feat.${i}.title`;
    if(b) b.dataset.pgKey = `feat.${i}.body`;
  });

  // Wire up editable elements
  document.querySelectorAll('[data-pg-key]').forEach(el => {
    if (el.dataset.pgType === 'image') makeImageZone(el);
    else makeEditableEl(el);
  });

  // Clicking any <img> outside a zone also opens the image picker
  document.addEventListener('click', pgImgClickCapture, true);

  document.getElementById('pg-save-btn').addEventListener('click', savePageContent);
}

function updateFormatBar() {
  document.getElementById('pg-btn-b')?.classList.toggle('pg-active', document.queryCommandState('bold'));
  document.getElementById('pg-btn-i')?.classList.toggle('pg-active', document.queryCommandState('italic'));
  document.getElementById('pg-btn-u')?.classList.toggle('pg-active', document.queryCommandState('underline'));
}

function applyFontSize(size) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const span = document.createElement('span');
  span.style.fontSize = size;
  try {
    range.surroundContents(span);
  } catch {
    document.execCommand('fontSize', false, '7');
    document.querySelectorAll('font[size="7"]').forEach(f => {
      const s = document.createElement('span');
      s.style.fontSize = size;
      s.innerHTML = f.innerHTML;
      f.replaceWith(s);
    });
  }
}

function pgImgClickCapture(e) {
  if (e.target.tagName !== 'IMG') return;
  // Ignore clicks inside the image picker dialog itself
  if (e.target.closest('#pg-img-picker')) return;
  e.preventDefault();
  e.stopPropagation();
  openImagePickerDialog(src => { e.target.src = src; });
}

function makeImageZone(el) {
  const overlay = document.createElement('div');
  overlay.className = 'pg-img-zone-overlay';
  overlay.innerHTML = `<div style="text-align:center">
    <div style="font-size:28px;margin-bottom:8px">&#128444;</div>
    <div style="font-size:14px;font-weight:600;color:#ede8dc;font-family:'IBM Plex Sans',sans-serif">Klikk for å sette inn bilde</div>
    <div style="font-size:11px;color:#8a8070;margin-top:4px;font-family:'IBM Plex Sans',sans-serif">URL eller opplasting fra enhet</div>
  </div>`;
  el.style.position = el.style.position || 'relative';
  el.appendChild(overlay);
  el.style.cursor = 'pointer';
  el.addEventListener('click', e => {
    e.stopPropagation();
    openImagePickerDialog(src => {
      const existing = el.querySelector('img.pg-zone-img');
      if (existing) {
        existing.src = src;
      } else {
        const img = document.createElement('img');
        img.className = 'pg-zone-img';
        img.src = src;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:inherit;position:absolute;inset:0;z-index:1';
        el.prepend(img);
      }
    });
  });
}

function openImagePickerDialog(onConfirm) {
  const existing = document.getElementById('pg-img-picker');
  if (existing) existing.remove();

  const picker = document.createElement('div');
  picker.id = 'pg-img-picker';
  picker.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.8);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px';
  picker.innerHTML = `
    <div style="background:#161410;border:1px solid #3c3828;border-radius:18px;padding:28px;width:100%;max-width:420px;font-family:'IBM Plex Sans',sans-serif">
      <div style="font-size:17px;font-weight:700;color:#ede8dc;margin-bottom:22px">Endre bilde</div>
      <div style="margin-bottom:8px">
        <div style="font-size:10px;color:#6a6458;letter-spacing:.1em;text-transform:uppercase;font-family:'IBM Plex Mono',monospace;margin-bottom:6px">Lim inn URL</div>
        <input type="text" id="pg-img-url" placeholder="https://eksempel.no/bilde.jpg"
          style="width:100%;box-sizing:border-box;background:#1e1c16;border:1px solid #3c3828;border-radius:9px;padding:10px 12px;color:#ede8dc;font-size:13px;outline:none;font-family:'IBM Plex Sans',sans-serif">
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin:14px 0">
        <div style="flex:1;height:1px;background:#2c2820"></div>
        <span style="font-size:11px;color:#6a6458">eller</span>
        <div style="flex:1;height:1px;background:#2c2820"></div>
      </div>
      <div style="margin-bottom:22px">
        <div style="font-size:10px;color:#6a6458;letter-spacing:.1em;text-transform:uppercase;font-family:'IBM Plex Mono',monospace;margin-bottom:6px">Last opp fra enhet</div>
        <input type="file" id="pg-img-file" accept="image/*"
          style="width:100%;font-size:12px;color:#8a8070;font-family:'IBM Plex Sans',sans-serif;cursor:pointer">
        <div style="font-size:10px;color:#4a4840;margin-top:4px">Maks 2 MB. Lagres direkte i databasen.</div>
      </div>
      <div style="display:flex;gap:8px">
        <button id="pg-img-ok" style="flex:1;padding:11px;background:#b89a5a;color:#0c0b09;border:none;border-radius:10px;font-family:'IBM Plex Sans',sans-serif;font-weight:700;font-size:13px;cursor:pointer">Bruk bilde</button>
        <button id="pg-img-cancel" style="padding:11px 18px;background:transparent;color:#8a8070;border:1px solid #3c3828;border-radius:10px;font-family:'IBM Plex Sans',sans-serif;font-size:13px;cursor:pointer">Avbryt</button>
      </div>
    </div>`;
  document.body.appendChild(picker);
  document.getElementById('pg-img-url').focus();

  const close = () => picker.remove();
  document.getElementById('pg-img-cancel').addEventListener('click', close);
  picker.addEventListener('click', e => { if (e.target === picker) close(); });

  document.getElementById('pg-img-url').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('pg-img-ok').click();
    if (e.key === 'Escape') close();
  });

  document.getElementById('pg-img-ok').addEventListener('click', () => {
    const url = document.getElementById('pg-img-url').value.trim();
    const file = document.getElementById('pg-img-file').files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { alert('Bildet er for stort (maks 2 MB). Komprimer det eller bruk en URL.'); return; }
      const reader = new FileReader();
      reader.onload = ev => { onConfirm(ev.target.result); close(); };
      reader.readAsDataURL(file);
    } else if (url) {
      onConfirm(url);
      close();
    } else {
      alert('Lim inn en URL eller velg et bilde fra enheten.');
    }
  });
}

function makeEditableEl(el) {
  el.title = 'Klikk for å redigere';
  el.style.cursor = 'text';
  el.addEventListener('mouseenter', () => {
    if(!el.isContentEditable) {
      el.style.outline = '2px dashed rgba(184,154,90,.55)';
      el.style.outlineOffset = '5px';
      el.style.borderRadius = '3px';
    }
  });
  el.addEventListener('mouseleave', () => {
    if(!el.isContentEditable) el.style.outline = '';
  });
  el.addEventListener('click', e => {
    if(!el.isContentEditable) {
      document.querySelectorAll('[contenteditable="true"]').forEach(a => {
        a.contentEditable = 'false';
        a.style.outline = '';
        a.style.boxShadow = '';
      });
      el.contentEditable = 'true';
      el.style.outline = '2px solid #b89a5a';
      el.style.outlineOffset = '5px';
      el.style.boxShadow = '0 0 0 5px rgba(184,154,90,.12)';
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      if(sel) { sel.removeAllRanges(); sel.addRange(range); }
    }
    e.stopPropagation();
  });
  el.addEventListener('blur', () => {
    el.contentEditable = 'false';
    el.style.outline = '';
    el.style.boxShadow = '';
  });
  el.addEventListener('keydown', e => { if(e.key === 'Escape') el.blur(); });
}

async function savePageContent() {
  const btn = document.getElementById('pg-save-btn');
  const status = document.getElementById('pg-save-status');
  btn.textContent = 'Lagrer...';
  btn.disabled = true;

  document.querySelectorAll('[contenteditable="true"]').forEach(a => { a.contentEditable = 'false'; });

  const updates = [];
  document.querySelectorAll('[data-pg-key]').forEach(el => {
    let value;
    if (el.dataset.pgType === 'image') {
      // Save only the image src, not the editor overlay HTML
      value = el.querySelector('img.pg-zone-img')?.src || '';
    } else {
      value = el.innerHTML;
    }
    updates.push({ key: el.dataset.pgKey, value, updated_at: new Date().toISOString() });
  });

  const { error } = await _sb.from('page_content').upsert(updates, { onConflict: 'key' });

  btn.disabled = false;
  if(error) {
    btn.textContent = 'Feil! Prøv igjen';
    btn.style.background = '#b85a4a';
    setTimeout(() => { btn.textContent = 'Lagre'; btn.style.background = ''; }, 3000);
  } else {
    btn.textContent = 'Lagret ✓';
    if(status) status.textContent = 'Sist lagret: ' + new Date().toLocaleTimeString('nb-NO');
    setTimeout(() => { btn.textContent = 'Lagre'; }, 2500);
  }
}

initPageContent();

// ═══ Admin management ═══
async function renderAdminsPage(){
  const tbody=document.getElementById('admins-tbody'); if(!tbody)return;
  tbody.innerHTML=`<tr><td colspan="3" style="color:var(--muted);text-align:center;padding:24px;font-size:13px">Laster...</td></tr>`;
  const {data,error}=await _sb.from('admins').select('*').order('created_at',{ascending:true});
  if(error||!data){ tbody.innerHTML=`<tr><td colspan="3" style="color:var(--muted);text-align:center;padding:24px;font-size:13px">Feil ved lasting av administratorer</td></tr>`; return; }
  const {data:{user}}=await _sb.auth.getUser();
  tbody.innerHTML='';
  if(!data.length){
    tbody.innerHTML=`<tr><td colspan="3" style="color:var(--muted);text-align:center;padding:24px;font-size:13px">Ingen administratorer funnet</td></tr>`;
    return;
  }
  data.forEach(a=>{
    const isSelf = user?.email === a.email;
    const tr = document.createElement('tr');

    // email cell — use textContent to prevent XSS
    const emailTd = document.createElement('td');
    emailTd.style.cssText = "font-family:'IBM Plex Mono',monospace;font-size:12px";
    emailTd.textContent = a.email;
    if(isSelf){
      const badge = document.createElement('span');
      badge.className = 'badge bgo';
      badge.style.cssText = 'margin-left:6px;vertical-align:middle';
      badge.textContent = 'deg';
      emailTd.appendChild(badge);
    }

    // date cell
    const dateTd = document.createElement('td');
    dateTd.style.cssText = 'color:var(--muted);font-size:12px';
    dateTd.textContent = a.created_at ? a.created_at.slice(0,10) : '—';

    // action cell — event listener instead of inline onclick to avoid injection
    const actionTd = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.style.cssText = `padding:5px 10px;font-size:11px;background:rgba(184,90,74,.1);border-color:rgba(184,90,74,.2);color:#e07060${isSelf?';opacity:.4;cursor:not-allowed':''}`;
    btn.textContent = 'Fjern';
    btn.disabled = isSelf;
    if(!isSelf) btn.addEventListener('click', () => removeAdmin(a.email));
    actionTd.appendChild(btn);

    tr.appendChild(emailTd);
    tr.appendChild(dateTd);
    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  });
}

async function addAdmin(){
  const inp=document.getElementById('new-admin-email');
  const email=inp.value.trim().toLowerCase();
  if(!email||!email.includes('@')){ alert('Skriv inn en gyldig e-postadresse.'); return; }
  const {error}=await _sb.from('admins').insert({email});
  if(error){
    if(error.code==='23505'||error.message.includes('unique')) alert('Denne e-posten er allerede administrator.');
    else alert('Noe gikk galt: '+error.message);
    return;
  }
  inp.value='';
  renderAdminsPage();
  showOk('Administrator lagt til!',`${email} har nå admin-tilgang og vil se admin-knappen neste gang de logger inn.`,'✅');
}

async function removeAdmin(email){
  if(!confirm(`Fjern admin-tilgang for ${email}?`))return;
  const {data:{user}}=await _sb.auth.getUser();
  if(user?.email===email){ alert('Du kan ikke fjerne din egen admin-tilgang.'); return; }
  const {error}=await _sb.from('admins').delete().eq('email',email);
  if(error){ alert('Noe gikk galt.'); return; }
  renderAdminsPage();
}

// ═══ Newsletter sending (actual send goes through edge function — no API key in browser) ═══
async function sendNewsletter() {
  const subj = document.getElementById('nl-subj')?.value.trim();
  const filter = document.getElementById('nl-filter')?.value;
  const msg = document.getElementById('nl-msg')?.value.trim();
  if(!subj) { alert('Emne mangler'); return; }
  if(!msg) { alert('Melding mangler'); return; }

  const allUsers = await sbLoadUsers();
  const count = filter === 'launch'
    ? allUsers.filter(u => u.launch).length
    : allUsers.filter(u => u.nl).length;
  if(!count) { alert('Ingen mottakere funnet.'); return; }
  if(!confirm(`Send nyhetsbrev til ${count} mottaker(e)?`)) return;

  const btn = document.getElementById('nl-send-btn');
  const origTxt = btn?.textContent;
  if(btn) { btn.disabled = true; btn.textContent = `Sender til ${count}...`; }

  try {
    const { data, error } = await _sb.functions.invoke('send-newsletter', {
      body: { subject: subj, message: msg, filter }
    });
    if(btn) { btn.disabled = false; btn.textContent = origTxt; }
    if(error) { showOk('Feil!', 'Nyhetsbrev kunne ikke sendes. Prøv igjen.', '❌'); return; }
    const { sent, failed } = data;
    if(failed) showOk('Nyhetsbrev sendt', `${sent} sendt · ${failed} feilet. Sjekk Resend-dashbordet.`, '⚠️');
    else showOk('Nyhetsbrev sendt! 📧', `Sendt til ${sent} abonnenter.`, '✅');
  } catch(e) {
    if(btn) { btn.disabled = false; btn.textContent = origTxt; }
    showOk('Feil!', 'Nyhetsbrev kunne ikke sendes. Prøv igjen.', '❌');
  }
}

// ═══ Newsletter preview (client-side only, no email sent) ═══
function pgEmail(html) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:40px 20px;background:#0c0b09;font-family:Arial,sans-serif"><div style="max-width:540px;margin:0 auto;background:#161410;border:1px solid #2c2820;border-radius:16px;overflow:hidden"><div style="padding:28px 36px;border-bottom:1px solid #2c2820"><span style="display:inline-flex;align-items:center;gap:8px;font-family:monospace;font-size:15px;font-weight:600;letter-spacing:.12em;color:#ede8dc"><span style="width:8px;height:8px;border-radius:50%;background:#b89a5a;display:inline-block"></span>PAWGATE</span></div><div style="padding:36px">${html}</div><div style="padding:18px 36px;border-top:1px solid #2c2820;font-size:11px;color:#6a6458;font-family:monospace">© 2026 PawGate · Fra Norge 🇳🇴</div></div></body></html>`;
}

function buildNLHtml(subject, message) {
  const lines = message.split('\n').map(l => l.trim() ? `<p style="margin:0 0 14px;color:#8a8070;line-height:1.7;font-size:15px">${l}</p>` : '<br>').join('');
  return pgEmail(
    `<h2 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#ede8dc">${subject}</h2>
     ${lines}
     <p style="margin:16px 0 0;font-size:13px;color:#6a6458">Spørsmål? <a href="mailto:hei@pawgate.no" style="color:#b89a5a;text-decoration:none">hei@pawgate.no</a></p>`
  );
}

function previewNewsletter() {
  const subj = document.getElementById('nl-subj')?.value.trim() || 'Forhåndsvisning';
  const msg = document.getElementById('nl-msg')?.value.trim() || '(ingen melding)';
  const w = window.open('', '_blank');
  if(w) { w.document.write(buildNLHtml(subj, msg)); w.document.close(); }
}
