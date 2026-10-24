
(function(){
  const body=document.body;
  const themeToggle=document.getElementById('themeToggle');
  const mobileMenu=document.getElementById('mobileMenu');
  const sidebar=document.getElementById('sidebar');
  const saved=localStorage.getItem('pb_portfolio_theme')||'dark';
  if(saved==='light') body.classList.add('light');
  themeToggle?.addEventListener('click',()=>{
    body.classList.toggle('light');
    localStorage.setItem('pb_portfolio_theme', body.classList.contains('light')?'light':'dark');
  });
  mobileMenu?.addEventListener('click',()=>sidebar?.classList.toggle('open'));
  document.addEventListener('click',e=>{
    if(innerWidth>780||!sidebar?.classList.contains('open')) return;
    if(sidebar.contains(e.target)||e.target===mobileMenu) return;
    sidebar.classList.remove('open');
  });
  document.querySelectorAll('.nav-btn').forEach(a=>a.addEventListener('click',()=>{
    if(innerWidth<=780) sidebar?.classList.remove('open');
  }));
})();

// Portfolio uses its own shell; keep its breadcrumb independent of visit history.
(function(){
  const script=document.currentScript;
  const root=new URL('../../',script.src);
  function render(){
    const content=document.querySelector('.content');
    if(!content||document.getElementById('portfolioBreadcrumbs'))return;
    const nav=document.createElement('nav');
    nav.id='portfolioBreadcrumbs';nav.setAttribute('aria-label','Breadcrumb');
    nav.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:20px;font-size:13px;color:var(--muted)';
    const file=location.pathname.split('/').pop();
    const labels={'experience.html':'Experience','skills.html':'Skills & Tools','case-studies.html':'Case Studies','powershell.html':'PowerShell & Automation','mock-ticket.html':'Mock Ticket','virtual-assistant.html':'Virtual Assistant','certifications.html':'Certifications','contact.html':'Contact'};
    const items=[['Home',new URL('index.html',root).href],['Portfolio',new URL('portfolio/index.html',root).href]];
    if(labels[file])items.push([labels[file],location.href]);
    items.forEach(([label,url],i)=>{
      if(i){const sep=document.createElement('span');sep.textContent='›';nav.appendChild(sep)}
      const el=document.createElement(i===items.length-1?'span':'a');el.textContent=label;
      if(i===items.length-1)el.setAttribute('aria-current','page');
      else{el.href=url;el.style.color='var(--cyan)'}
      nav.appendChild(el);
    });
    content.prepend(nav);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();

// Keep visitors on the portfolio and clear the form only after Formspree accepts it.
(function(){
  const form=document.getElementById('contact-form');
  const status=document.getElementById('contact-form-status');
  if(!form||!status)return;

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('button[type="submit"]');
    const originalText=button?.textContent;
    status.textContent='';
    status.className='contact-form-status';
    if(button){button.disabled=true;button.textContent='Sending…'}

    try{
      const response=await fetch(form.action,{
        method:'POST',
        body:new FormData(form),
        headers:{Accept:'application/json'}
      });
      if (!response.ok) throw new Error('Formspree rejected the submission.');

      form.reset();
      status.textContent='Message sent successfully.';
      status.classList.add('is-success');
    }catch(error){
      status.textContent='Message could not be sent. Please try again.';
      status.classList.add('is-error');
    }finally{
      if(button){button.disabled=false;button.textContent=originalText}
    }
  });
})();

