const WORKBENCH_DEFAULTS = {accent:'green',density:'comfortable',grid:'dots',spacing:28};
function workbenchNormalize(value) {
  const source=value&&typeof value==='object'?value:{};
  return {accent:['green','blue','amber'].includes(source.accent)?source.accent:'green',
    density:source.density==='compact'?'compact':'comfortable',grid:['dots','lines','off'].includes(source.grid)?source.grid:'dots',
    spacing:Number.isFinite(Number(source.spacing))?Math.max(16,Math.min(48,Math.round(Number(source.spacing)/2)*2)):28};
}
let workbenchCurrentPreferences = null;
function workbenchPreferences() {
  if(workbenchCurrentPreferences)return {...workbenchCurrentPreferences};
  try{workbenchCurrentPreferences=workbenchNormalize(JSON.parse(localStorage.getItem('chem-lab-appearance')||'null'));}catch{workbenchCurrentPreferences={...WORKBENCH_DEFAULTS};}
  return {...workbenchCurrentPreferences};
}
function workbenchPalette(theme,prefs) {
  const base=RENDER_THEMES[theme]||RENDER_THEMES.dark;
  const color={green:theme==='light'?'33, 107, 82':'128, 213, 182',blue:theme==='light'?'32, 99, 157':'129, 190, 240',amber:theme==='light'?'135, 83, 20':'229, 187, 107'}[prefs.accent];
  return {...base,selection:color,hover:color,nameBorder:'rgba('+color+', 0.3)',nameHoverBorder:'rgba('+color+', 0.85)'};
}
// Mobile palette drawer; chemistry/editor state remains owned by app.js.
if (typeof document !== 'undefined') {
  const toggle = document.getElementById('palette-toggle');
  const dismiss = document.getElementById('palette-dismiss');
  const setOpen = open => {
    document.body.classList.toggle('palette-open', open);
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
  };
  if (toggle) toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  if (dismiss) dismiss.addEventListener('click', () => { setOpen(false); if(toggle)toggle.focus(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); event.stopImmediatePropagation?.(); event.preventDefault?.(); }
  });
  document.querySelectorAll('[role="tab"][data-view]').forEach(tab => tab.addEventListener('click', () => setOpen(false)));
}

if(typeof document!=='undefined' && document.getElementById('appearance-dialog')) {
  const dialog=document.getElementById('appearance-dialog'), status=document.getElementById('appearance-status');
  const fields={accent:document.getElementById('appearance-accent'),density:document.getElementById('appearance-density'),grid:document.getElementById('appearance-grid'),spacing:document.getElementById('appearance-spacing')};
  const theme=document.getElementById('appearance-theme');
  let prefs=workbenchPreferences();
  const sync=()=>{
    document.body.dataset.accent=prefs.accent;document.body.dataset.density=prefs.density;
    Object.entries(fields).forEach(([key,input])=>{input.value=String(prefs[key]);});
    document.getElementById('appearance-spacing-value').textContent=prefs.spacing+' px';
    fields.spacing.disabled=prefs.grid==='off';
  };
  const apply=()=>{
    prefs=workbenchNormalize(Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.value])));
    workbenchCurrentPreferences={...prefs};
    sync();
    try{localStorage.setItem('chem-lab-appearance',JSON.stringify(prefs));status.textContent='Appearance saved on this browser.';}catch{status.textContent='Preview applied. Browser storage is unavailable; changes will not persist.';}
    document.dispatchEvent(new CustomEvent('chem-appearance-change',{detail:{...prefs,theme:theme.value}}));
  };
  sync();
  document.getElementById('appearance-open').addEventListener('click',()=>{theme.value=document.body.dataset.theme||'dark';status.textContent='';dialog.showModal();});
  Object.values(fields).forEach(input=>input.addEventListener('input',apply));theme.addEventListener('change',apply);
  document.getElementById('appearance-reset').addEventListener('click',()=>{prefs={...WORKBENCH_DEFAULTS};sync();theme.value='dark';apply();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
}
