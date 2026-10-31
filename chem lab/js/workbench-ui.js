const WORKBENCH_DEFAULTS = {accent:'green',density:'comfortable',grid:'dots',spacing:28,reading:'normal',paletteWidth:252,canvas:'theme',gridContrast:'normal',motion:'system'};
function workbenchNormalize(value) {
  const source=value&&typeof value==='object'?value:{};
  const choice=(key,values)=>values.includes(source[key])?source[key]:WORKBENCH_DEFAULTS[key];
  const bounded=(key,min,max,step)=>{const v=source[key];const n=(typeof v==='number'||typeof v==='string'&&v.trim())?Number(v):NaN;return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n/step)*step)):WORKBENCH_DEFAULTS[key];};
  return {accent:choice('accent',['green','blue','amber']),density:choice('density',['comfortable','compact']),grid:choice('grid',['dots','lines','off']),spacing:bounded('spacing',16,48,2),
    reading:choice('reading',['normal','large','larger']),paletteWidth:bounded('paletteWidth',200,320,4),canvas:choice('canvas',['theme','neutral','warm']),gridContrast:choice('gridContrast',['subtle','normal','strong']),motion:choice('motion',['system','reduced'])};
}
function workbenchPreset(id) {
  const presets={focus:{theme:'dark',appearance:{density:'compact',grid:'off',paletteWidth:220,canvas:'neutral',motion:'reduced'}},comfort:{theme:'dark',appearance:{}},presentation:{theme:'light',appearance:{reading:'larger',paletteWidth:280,grid:'lines',spacing:32,accent:'blue'}}};
  if(!Object.prototype.hasOwnProperty.call(presets,id))throw new Error('Unknown appearance preset.');
  return {theme:presets[id].theme,appearance:workbenchNormalize({...WORKBENCH_DEFAULTS,...presets[id].appearance})};
}
function workbenchProfile(theme,appearance) {return JSON.stringify({schema:1,theme:theme==='light'?'light':'dark',appearance:workbenchNormalize(appearance)},null,2);}
function workbenchParseProfile(text) {
  if(typeof text!=='string'||text.length>20000)throw new Error('Use an appearance profile smaller than 20 KB.');
  const value=JSON.parse(text);
  if(!value||value.schema!==1||!['dark','light'].includes(value.theme)||!value.appearance||typeof value.appearance!=='object'||Array.isArray(value.appearance))throw new Error('This is not a supported Chem Lab appearance profile.');
  return {theme:value.theme,appearance:workbenchNormalize(value.appearance)};
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
  const background=prefs.canvas==='neutral'?(theme==='light'?'#ffffff':'#151b21'):prefs.canvas==='warm'?(theme==='light'?'#fff8e8':'#242018'):base.background;
  const opacity={subtle:0.07,normal:0.13,strong:0.22}[prefs.gridContrast||'normal'];
  return {...base,background,grid:'rgba('+(theme==='light'?'56, 91, 69':'163, 197, 178')+', '+opacity+')',selection:color,hover:color,nameBorder:'rgba('+color+', 0.3)',nameHoverBorder:'rgba('+color+', 0.85)'};
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
  const fields={accent:document.getElementById('appearance-accent'),density:document.getElementById('appearance-density'),grid:document.getElementById('appearance-grid'),spacing:document.getElementById('appearance-spacing'),reading:document.getElementById('appearance-reading'),paletteWidth:document.getElementById('appearance-palette-width'),canvas:document.getElementById('appearance-canvas'),gridContrast:document.getElementById('appearance-grid-contrast'),motion:document.getElementById('appearance-motion')};
  const theme=document.getElementById('appearance-theme');
  let prefs=workbenchPreferences();
  const sync=()=>{
    document.body.dataset.accent=prefs.accent;document.body.dataset.density=prefs.density;document.body.dataset.reading=prefs.reading;document.body.dataset.motion=prefs.motion;
    document.body.style.setProperty('--palette-width',prefs.paletteWidth+'px');
    Object.entries(fields).forEach(([key,input])=>{input.value=String(prefs[key]);});
    document.getElementById('appearance-spacing-value').textContent=prefs.spacing+' px';
    document.getElementById('appearance-palette-width-value').textContent=prefs.paletteWidth+' px';
    fields.spacing.disabled=prefs.grid==='off';fields.gridContrast.disabled=prefs.grid==='off';
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
  ['focus','comfort','presentation'].forEach(id=>document.getElementById('appearance-preset-'+id).addEventListener('click',()=>{const profile=workbenchPreset(id);prefs=profile.appearance;sync();theme.value=profile.theme;apply();}));
  const profileText=document.getElementById('appearance-profile');
  document.getElementById('appearance-export').addEventListener('click',()=>{profileText.value=workbenchProfile(document.body.dataset.theme,prefs);profileText.focus();profileText.select?.();status.textContent='Appearance profile ready to copy. Only display preferences are included.';});
  document.getElementById('appearance-import').addEventListener('click',()=>{try{const profile=workbenchParseProfile(profileText.value);prefs=profile.appearance;sync();theme.value=profile.theme;apply();}catch(error){status.textContent='Could not import: '+error.message;}});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
}
