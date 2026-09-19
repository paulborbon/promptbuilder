(function(){
  const isSubpage = /\/pages\//.test(location.pathname.replace(/\\/g,"/"));
  const prefix = isSubpage ? "../" : "";
  const pagePrefix = isSubpage ? "" : "pages/";
  let savedTheme='dark';
  try { savedTheme=localStorage.getItem("pb_theme")||"dark"; } catch {}
  document.body.classList.toggle("dark-mode",savedTheme==="dark");

  function shell(){
    if(document.querySelector('.pb-topbar')) return;
    const bar=document.createElement('header');
    bar.className='pb-topbar';
    bar.innerHTML=`<div class="left"><a class="icon-btn" id="globalHome" href="${prefix}index.html" title="Home" aria-label="Home">⌂</a><nav class="pb-breadcrumbs" id="pbBreadcrumbs" aria-label="Breadcrumb"></nav></div><div class="center">PAUL BORBON · PROMPT BUILDER <span class="version-badge">Beta 2.0</span></div><div class="right"><button class="icon-btn" id="globalSave" type="button" title="Save project" aria-label="Save project">💾</button><button class="icon-btn" id="themeToggleGlobal" type="button" title="Light / Dark" aria-label="Light or dark mode">◐</button></div>`;
    document.body.prepend(bar);
    document.querySelectorAll('nav.navbar').forEach(n=>n.remove());

    const utility=document.createElement('div');
    utility.className='pb-utility-actions';
    const returnPage=encodeURIComponent(location.pathname.split('/').pop()||'Home');
    utility.innerHTML=`<a class="utility-btn support" href="${pagePrefix}support-project.html">❤ Support This Project</a><a class="utility-btn" href="${pagePrefix}support.html?page=${returnPage}">⚑ Report Issue</a><a class="utility-btn" href="${pagePrefix}feedback.html?page=${returnPage}">★ Feedback</a>`;
    document.body.appendChild(utility);

    const footer=document.createElement('footer');
    footer.className='pb-footer';
    const cfg=window.PB_CONFIG||{};
    footer.innerHTML=`<div><strong>Created and Maintained by: Paul</strong> · Created: ${cfg.createdDate||'13 Sep 2026'} · Updated: ${cfg.updatedDate||'13 Sep 2026'} · <span class="version-badge">Beta 2.0</span></div><div class="footer-right">Visitors: <span id="pbVisitors">…</span> · <a href="${pagePrefix}site-references.html">Site References</a> · <a href="${pagePrefix}testimonials.html">Testimonials</a></div>`;
    document.body.appendChild(footer);
  }

  function setDirty(v=true){window.PB_DIRTY=v;} window.PBMarkDirty=setDirty;
  async function saveCurrent(){
    if(window.PBCinemaApp?.exportProject) return window.PBCinemaApp.exportProject();
    const p=window.PBStorage?.loadDraft?.();
    if(!p){alert('No active project to save yet.');return false;}
    if(window.PBStorage?.exportJSON){await PBStorage.exportJSON(p);window.PB_DIRTY=false;return true;}
    return false;
  }
  window.PBSaveCurrentProject=saveCurrent;


  function showUnsavedDialog(){
    return new Promise(resolve=>{
      const old=document.getElementById('pbUnsavedModal'); if(old) old.remove();
      const wrap=document.createElement('div'); wrap.id='pbUnsavedModal';
      wrap.innerHTML=`<div class="pb-unsaved-backdrop"><div class="pb-unsaved-box" role="dialog" aria-modal="true" aria-labelledby="pbUnsavedTitle"><h2 id="pbUnsavedTitle">Unsaved changes</h2><p>You have unsaved changes. What would you like to do?</p><div class="pb-unsaved-actions"><button type="button" data-choice="save" class="pb-unsaved-primary">Save & Home</button><button type="button" data-choice="discard" class="pb-unsaved-danger">Discard & Home</button><button type="button" data-choice="cancel">Cancel</button></div></div></div>`;
      const style=document.createElement('style');
      style.textContent=`.pb-unsaved-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.62);display:grid;place-items:center;z-index:99999;padding:20px}.pb-unsaved-box{width:min(520px,100%);background:#111a22;color:#fff;border:1px solid #3d5c70;border-radius:16px;padding:24px;box-shadow:0 24px 60px rgba(0,0,0,.45)}.pb-unsaved-box h2{margin:0 0 8px}.pb-unsaved-box p{color:#c8d7e0}.pb-unsaved-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:22px}.pb-unsaved-actions button{border:1px solid #557084;border-radius:10px;padding:11px 12px;cursor:pointer;font-weight:700;background:#263745;color:#fff}.pb-unsaved-actions .pb-unsaved-primary{background:#1688ff;border-color:#1688ff}.pb-unsaved-actions .pb-unsaved-danger{background:#7d2631;border-color:#a93d4b}@media(max-width:560px){.pb-unsaved-actions{grid-template-columns:1fr}}`;
      wrap.appendChild(style); document.body.appendChild(wrap);
      function finish(choice){wrap.remove();resolve(choice);}
      wrap.querySelectorAll('[data-choice]').forEach(btn=>btn.addEventListener('click',()=>finish(btn.dataset.choice)));
      wrap.querySelector('.pb-unsaved-backdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)finish('cancel')});
      document.addEventListener('keydown',function esc(ev){if(ev.key==='Escape'){document.removeEventListener('keydown',esc);finish('cancel')}},{once:true});
    });
  }

  const SITE_ROOT = new URL('../', document.currentScript?.src || new URL(prefix+'javascript/app.js',location.href));
  const PAGE_LABELS={
    'index.html':'Home','prompt-builder.html':'Prompt Builder','ai-setup.html':'AI Access & Privacy Setup',
    'support-project.html':'Support This Project','support.html':'Report Issue','feedback.html':'Feedback',
    'submit-site.html':'Submit Your Site','site-references.html':'Site References','testimonials.html':'Testimonials',
    'builder.html':'Build Prompt','projects.html':'Saved Projects',
    'prompt.html':'Prompt','review.html':'Review','experience.html':'Experience','skills.html':'Skills & Tools',
    'cases.html':'Case Studies','case-studies.html':'Case Studies','powershell.html':'PowerShell & Automation',
    'mock-ticket.html':'Mock Ticket','virtual-assistant.html':'Virtual Assistant','certifications.html':'Certifications','contact.html':'Contact'
  };
  const UTILITY_PAGES=new Set(['support-project.html','support.html','feedback.html','submit-site.html']);
  const BUILDER_PAGES=new Set(['ai-setup.html','builder.html','scenes.html','projects.html','prompt.html','review.html']);
  const PORTFOLIO_PAGES=new Set(['experience.html','skills.html','cases.html','case-studies.html','powershell.html','mock-ticket.html','virtual-assistant.html','certifications.html','contact.html']);
  function siteUrl(value){
    try{
      if(!value)return null;
      const u=new URL(value,location.href);
      return u.origin===SITE_ROOT.origin && u.pathname.startsWith(SITE_ROOT.pathname) ? u : null;
    }catch{return null}
  }
  function pageNameFromUrl(url){return new URL(url,location.href).pathname.split('/').filter(Boolean).pop()||'index.html'}
  function pageLabel(url){const f=pageNameFromUrl(url);return PAGE_LABELS[f]||f.replace(/\.html$/,'').replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
  function crumb(path,label){return {url:new URL(path,SITE_ROOT).href,label}}
  function hierarchy(value){
    const u=siteUrl(value), home=crumb('index.html','Home');
    if(!u)return [home];
    const path=u.pathname.slice(SITE_ROOT.pathname.length), file=pageNameFromUrl(u.href);
    if(path===''||path==='index.html')return [home];
    const result=[home];
    if(path.startsWith('portfolio/')||PORTFOLIO_PAGES.has(file)){
      result.push(crumb('portfolio/index.html','Portfolio'));
      if(path==='portfolio/'||path==='portfolio/index.html')return result;
    }else if(BUILDER_PAGES.has(file)) result.push(crumb('pages/prompt-builder.html','Prompt Builder'));
    result.push({url:u.href,label:pageLabel(u.href)});
    return result;
  }
  // Save only this history entry's immediate launch context. Never reuse a visit trail.
  function utilityParent(){
    const saved=history.state?.pbBreadcrumbContext;
    if(saved?.page===location.href)return siteUrl(saved.parent);
    const ref=siteUrl(document.referrer);
    const parent=ref && ref.pathname!==location.pathname ? ref.href : null;
    try{history.replaceState({...history.state,pbBreadcrumbContext:{page:location.href,parent}},'')}catch{}
    return siteUrl(parent);
  }
  function renderBreadcrumbs(){
    const nav=document.getElementById('pbBreadcrumbs');if(!nav)return;
    let trail=hierarchy(location.href);
    if(UTILITY_PAGES.has(pageNameFromUrl(location.href))){
      const parent=utilityParent();
      if(parent)trail=[...hierarchy(parent.href),{url:location.href,label:pageLabel(location.href)}];
    }
    nav.innerHTML='';
    trail.forEach((item,i)=>{
      if(i){const sep=document.createElement('span');sep.className='pb-crumb-sep';sep.textContent='›';nav.appendChild(sep)}
      const el=document.createElement(i<trail.length-1?'a':'span');
      if(i<trail.length-1)el.href=item.url;
      else{el.className='current';el.setAttribute('aria-current','page')}
      el.textContent=item.label;nav.appendChild(el);
    });
  }
  window.addEventListener('pageshow',renderBreadcrumbs);
  window.PBCancelToPrevious=function(){
    if(history.length>1){history.back();return}
    location.href=new URL('index.html',SITE_ROOT).href;
  };


  function bindShell(){
    document.getElementById('themeToggleGlobal')?.addEventListener('click',()=>{document.body.classList.toggle('dark-mode');localStorage.setItem('pb_theme',document.body.classList.contains('dark-mode')?'dark':'light')});
    document.getElementById('globalSave')?.addEventListener('click',saveCurrent);
    document.getElementById('globalHome')?.addEventListener('click',async e=>{
      if(!window.PB_DIRTY) return;
      e.preventDefault();
      const target=e.currentTarget.href;
      const choice=await showUnsavedDialog();
      if(choice==='cancel') return;
      if(choice==='save'){const ok=await saveCurrent();if(!ok)return;}
      if(choice==='save'||choice==='discard') location.href=target;
    });
    if(!window.PBCinemaApp) document.querySelectorAll('input,select,textarea').forEach(el=>el.addEventListener('input',()=>setDirty(true)));
  }

  const HELP={
    projectName:'The name used when saving this project.',platform:'Choose the AI or video platform the final prompt is intended for.',mode:'Simple shows the essential workflow. Advanced is reserved for deeper controls.',theme:'The broad purpose or style of the project. It changes the choices that follow.',type:'A more specific category under the selected theme.',scene:'The kind of scene you want the AI to create.',duration:'How long the generated video should run.',aspectRatio:'The frame shape. Example: 16:9 for widescreen or 9:16 for vertical video.',character:'Describe the subject, clothing, identity, and important visual details.',location:'Where the scene takes place.',timeOfDay:'Controls the time-related look and lighting of the scene.',weather:'Adds environmental conditions such as clear weather, rain, snow, or a storm.',surroundings:'Describe buildings, furniture, props, landscape, or other background details.',action:'Describe the action in the exact order it should happen.',actionPace:'Controls how quickly the character or main action moves.',cameraPace:'Controls how quickly the camera itself moves.',cameraMovement:'Defines how the camera tracks, pans, orbits, pushes in, or remains static.',lighting:'Defines the lighting mood and contrast.',dialogueEnglish:'The exact meaning of what the character should say.',dialogueLanguage:'The language the character should actually speak.',dialogueRomanized:'The exact spoken target-language line written with Latin letters. When filled, the prompt tells the video AI not to translate or paraphrase it.',musicEnabled:'Turns background music on or off.',musicGenre:'The broad music category.',musicStyle:'The mood or feel of the music.',tempo:'How slow or fast the music should feel.',voiceVolume:'Relative dialogue or voice level.',musicVolume:'Relative background-music level.',sfxVolume:'Relative sound-effects level.',audioPriority:'Tells the generator which audio element should remain most prominent.',audioDucking:'Reduces music while dialogue is spoken.',dialogueNotes:'Voice acting, emotion, accent, intensity, or delivery instructions.',negativePrompt:'Things the AI must avoid.',notes:'Extra project instructions that do not fit another field.',referenceImage:'A reference picture used for identity, clothing, composition, or appearance consistency.',
    fullName:'Enter the full name of the person submitting the form.',email:'Enter the email address where the requester can be contacted.',phone:'Enter a phone number if you want to provide one.',preferredDateTime:'Choose the preferred date and time for contact.',requestText:'Add the request or message you want to send.',websiteUrl:'Enter the public website address you want reviewed.',businessName:'Enter the business, brand, or website name.',siteType:'Choose the category that best describes the website.',description:'Briefly describe the website, product, service, or offer.',socialLinks:'Add public social-media links you want included.',pricing:'Describe the price or offer amount visitors may see.',commission:'Tell the site owner what referral commission you are offering. This is kept for review and is not automatically published.',additionalNotes:'Add any useful notes, conditions, or special instructions.',issueType:'Choose the category that best matches the problem.',issueDescription:'Describe what happened, what you expected, and any steps that reproduce the problem.',screenshots:'Optional screenshots can help explain a technical issue.',rating:'Choose a rating from 1 to 5 stars.',feedbackComments:'Tell us what worked well or what could be improved.'
  };

  // Important: derive label text without the injected information icon. This prevents “Full Namei” / “Email Addressi”.
  function cleanLabelText(label){
    if(!label) return '';
    const clone=label.cloneNode(true);
    clone.querySelectorAll('.help-icon').forEach(n=>n.remove());
    return (clone.textContent||'').replace(/\*/g,'').replace(/\s+/g,' ').trim();
  }
  function helpText(el,label){
    return el.dataset.help||HELP[el.id]||`Controls the ${cleanLabelText(label)||el.name||el.id||'selected field'} value used in this form.`;
  }
  function installHelp(){
    if(window.PBCinemaApp) return; // The expanded builder already provides accessible option help.
    const tip=document.createElement('div');tip.className='pb-floating-help';document.body.appendChild(tip);
    document.querySelectorAll('input:not([type=hidden]):not([type=button]):not([type=submit]),select,textarea').forEach(el=>{
      let label=(el.id&&document.querySelector(`label[for="${CSS.escape(el.id)}"]`))||el.closest('.mb-3,.col-md-6,.col-md-4,.card-body')?.querySelector('label');
      if(!label||label.querySelector('.help-icon')||label.tagName!=='LABEL') return;
      const icon=document.createElement('span');icon.className='help-icon';icon.textContent='i';icon.tabIndex=0;icon.setAttribute('aria-label','Information');
      const help=helpText(el,label);
      icon.setAttribute('aria-label','Information: '+help); // Accessible help without a duplicate native tooltip.
      label.appendChild(icon);
      const show=e=>{tip.textContent=help;tip.style.display='block';move(e)};
      const move=e=>{const x=(e.clientX||0)+16,y=(e.clientY||0)+16;tip.style.left=Math.max(8,Math.min(x,innerWidth-tip.offsetWidth-12))+'px';tip.style.top=Math.max(8,Math.min(y,innerHeight-tip.offsetHeight-12))+'px'};
      icon.addEventListener('mouseenter',show);icon.addEventListener('mousemove',move);icon.addEventListener('mouseleave',()=>tip.style.display='none');
      icon.addEventListener('focus',()=>{tip.textContent=help;tip.style.display='block';const r=icon.getBoundingClientRect();tip.style.left=Math.min(r.right+8,innerWidth-tip.offsetWidth-12)+'px';tip.style.top=r.top+'px'});icon.addEventListener('blur',()=>tip.style.display='none');
    });
  }

  async function visitors(){
    const el=document.getElementById('pbVisitors'); if(!el)return;
    try{
      if(window.PBSiteServices?.isConfigured()){
        const response=await fetch(PBSiteServices.endpoint('visitorCount'),{method:'POST'});
        if(response.ok){const d=await response.json();el.textContent=d.count??'—';return;}
      }
    }catch{}
    const k='pb_local_visits_beta';const n=(Number(localStorage.getItem(k))||0)+1;localStorage.setItem(k,String(n));el.textContent=n+' (this device)';
  }
  document.addEventListener('DOMContentLoaded',()=>{shell();renderBreadcrumbs();bindShell();installHelp();visitors();});
})();

// this is the 2nd test
