(() => {
 'use strict';
 const $=id=>document.getElementById(id), D=window.PBCinema, all=D.sections.flatMap(s=>s.fields), clean=v=>typeof v==='string'&&!['No value','Select an option'].includes(v)?v.trim():'';
 const priorities=['Normal','Important','Critical'];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let stored;try{stored=PBStorage.getProject(new URLSearchParams(location.search).get('id'))||PBStorage.loadDraft();}catch{}
 let project=new URLSearchParams(location.search).get('new')==='1'?{}:stored&&typeof stored==='object'?stored:{};
 if(new URLSearchParams(location.search).get('new')==='1')history.replaceState(null,'',location.pathname);
 let state={...(project.selections||{}),projectName:clean(project.projectName),platform:clean(project.platform)||'Generic',mode:project.mode==='Advanced'?'Advanced':'Simple'};
 state.outputType=clean(state.outputType)||'Video';state.aspectRatio=clean(state.aspectRatio)||'16:9';
 // Upgrade legacy fields without overwriting the old draft until the user makes an edit.
 if(!Array.isArray(state.movements))state.movements=[];
 if(clean(state.cameraMovement)&&!state.movementNotes)state.movementNotes=state.cameraMovement;
 let selected=Array.isArray(project.restrictions)?project.restrictions.filter(r=>r&&D.restrictions.some(g=>g[1].some(o=>o.label===r.label))).map(r=>({label:r.label,priority:priorities.includes(r.priority)?r.priority:'Normal'})):[];
 let importance=project.importance&&typeof project.importance==='object'?{...project.importance}:{};
 let step=location.hash==='#review'?D.sections.length-1:0;
 let storageUnavailable=false;
 function snapshot(){return {...project,version:'2.0',projectName:clean(state.projectName)||'Untitled project',platform:state.platform,mode:state.mode,createdDate:project.createdDate||new Date().toISOString(),lastEdited:new Date().toISOString(),selections:Object.fromEntries(all.filter(f=>!['projectName','platform'].includes(f.id)).map(f=>[f.id,state[f.id]??(f.kind==='multi'?[]:'')])),importance,restrictions:selected};}
 function persist(){project=snapshot();try{PBStorage.saveDraft(project);$('draftStatus').textContent='✓ Draft saved in this browser';}catch{storageUnavailable=true;$('draftStatus').textContent='Browser storage unavailable — export JSON to keep your work';}}
 function prioritySelect(id,value){return `<select class="priority" data-priority="${esc(id)}" aria-label="${esc(id)} importance">${priorities.map(p=>`<option${p===value?' selected':''}>${p}</option>`).join('')}</select>`;}
 function helpButton(title,body,example=title){return `<button type="button" class="help" aria-label="Help: ${esc(title)}" data-title="${esc(title)}" data-help="${esc(body)}" data-example="${esc(example)}">?</button>`;}
 function field(f){let value=state[f.id]??'';const opt=f.options?.find(o=>o.label===value);let html=`<div class="field ${f.kind||''}"><div class="field-head"><label for="${f.id}">${esc(f.label)}</label>${helpButton(f.label, f.help||`Describe ${f.label.toLowerCase()} only if it matters to your scene. Blank fields are omitted from the prompt.`,opt?.wording||f.placeholder||f.label)}${prioritySelect(f.id,importance[f.id]||'Normal')}</div>`;
 if(f.kind==='text')html+=`<textarea id="${f.id}" data-field="${f.id}" placeholder="${esc(f.placeholder)}" rows="2">${esc(value)}</textarea>`;
 else if(f.kind==='multi')html+=`<div class="choices" id="${f.id}" role="group" aria-label="${esc(f.label)}">${f.options.map(o=>`<div class="choice"><label><input type="checkbox" data-movement="${esc(o.label)}" ${Array.isArray(value)&&value.includes(o.label)?'checked':''}>${esc(o.label)}</label>${helpButton(o.label,o.help,o.wording)}</div>`).join('')}</div><p class="hint">${esc(f.help)}</p>`;
 else {const unknown=value&&!f.options.some(o=>o.label===value);html+=`<select id="${f.id}" data-field="${f.id}"><option value="">Let the generator decide</option>${unknown?`<option selected>${esc(value)}</option>`:''}${f.options.map(o=>`<option value="${esc(o.label)}" ${o.label===value?'selected':''}>${esc(o.label)}</option>`).join('')}</select><div class="hint" id="hint-${f.id}">${esc(opt?.help||f.help||'Optional — choose the look you want.')}</div>`;}
 return html+'</div>';
 }
 function restrictionHTML(){return `<div class="notice full">Priority changes the wording, not the generator’s enforcement. Avoid contradictory restrictions. <strong>Portrait reference images must be attached in your generation tool.</strong></div>`+D.restrictions.map(([title,items],i)=>`<details class="restriction-group full" ${i===0?'open':''}><summary>${esc(title)} <span class="badge">${items.length} options</span></summary><div class="restriction-list">${items.map(o=>{const r=selected.find(r=>r.label===o.label);return `<div class="restriction-row"><div class="choice"><label><input type="checkbox" data-restriction="${esc(o.label)}" ${r?'checked':''}>${esc(o.label)}</label>${helpButton(o.label,o.help,o.wording)}</div><select data-restriction-priority="${esc(o.label)}" aria-label="${esc(o.label)} importance" ${r?'':'disabled'}>${priorities.map(p=>`<option ${p===(r?.priority||'Normal')?'selected':''}>${p}</option>`).join('')}</select></div>`;}).join('')}</div></details>`).join('');}
 function activeField(f){return !(state.outputType==='Still image'&&(['duration','fps','shutter','movements','movementOrder','cameraPace','movementQuality','movementNotes'].includes(f.id)||D.sections.find(s=>s.id==='audio').fields.some(a=>a.id===f.id)));}
 function val(f){let v=state[f.id];return Array.isArray(v)?v.join(' → '):clean(v);}
 function reviewHTML(){let html='<div class="notice full">Your prompt is ready in Live Preview. Advanced selections stay active in Simple mode. For still images, video movement, duration, shutter/frame-rate and audio instructions are omitted.</div>';
 D.sections.slice(0,-1).forEach((s,i)=>{const rows=s.fields.filter(f=>activeField(f)&&val(f));if(!rows.length)return;html+=`<div class="full"><h3>${esc(s.title)}</h3>${rows.map(f=>`<div class="review-item"><div><strong>${esc(f.label)} <span class="badge">${esc(importance[f.id]||'Normal')}</span></strong><p>${esc(val(f))}</p></div><button data-edit="${i}">Edit</button></div>`).join('')}</div>`;});
 if(selected.length)html+=`<div class="full"><h3>Selected restrictions</h3>${selected.map(r=>`<div class="review-item"><div><strong>${esc(r.label)}</strong><p>${esc(r.priority)}</p></div><button data-edit="7">Edit</button></div>`).join('')}</div>`;
 return html;
 }
 function render(){const s=D.sections[step];$('steps').innerHTML=D.sections.map((s,i)=>`<button data-step="${i}" ${step===i?'aria-current="step"':''}><span class="step-number">${String(i+1).padStart(2,'0')}</span>${esc(s.title)}</button>`).join('');$('sectionTitle').textContent=s.title;$('sectionDesc').textContent=s.desc;$('stepCount').textContent=`STEP ${step+1} / ${D.sections.length}`;$('mode').value=state.mode;$('modeHint').textContent=state.mode==='Advanced'?'Every creative and optical control.':'Essential controls, less clutter.';
 $('fields').innerHTML=s.id==='review'?reviewHTML():(s.id==='restrictions'?restrictionHTML():'')+s.fields.filter(f=>state.mode==='Advanced'||!f.advanced).map(field).join('')+(s.fields.some(f=>f.advanced)&&state.mode!=='Advanced'?'<p class="advanced-note full">Switch to Advanced for focal length, lens character, aperture, shutter, ISO, white balance and filters. Existing Advanced selections remain in your prompt.</p>':'');
 $('back').disabled=step===0;$('next').disabled=step===D.sections.length-1;$('next').textContent=step===D.sections.length-2?'Review prompt →':'Next →';updatePreview();}
 function prompt(){const parts=[`Create a ${state.outputType==='Still image'?'still image':'video'}${clean(state.theme)?' with the concept: '+clean(state.theme):'.'}`];
 all.forEach(f=>{if(!activeField(f)||f.id==='outputType')return;let v=val(f);if(!v)return;if(f.id==='movements')v=(state.movements||[]).map((m,i)=>`${i+1}. ${m}`).join('; ');if(f.id==='dialogueRomanized')v=`Use this exact spoken pronunciation: ${v}`;const p=importance[f.id];parts.push(`${p&&p!=='Normal'?p.toUpperCase()+' — ':''}${f.label}: ${v}`);});
 if(selected.length){parts.push('\nRESTRICTIONS');for(const p of ['Critical','Important','Normal'])selected.filter(r=>r.priority===p).forEach(r=>{const o=D.restrictions.flatMap(g=>g[1]).find(o=>o.label===r.label);parts.push(`${p.toUpperCase()}: ${o.wording}`);});}
 return parts.join('\n\n');}
 function conflicts(){const w=[],has=l=>selected.some(r=>r.label===l),moves=state.movements||[],video=state.outputType!=='Still image';
 if(!clean(state.character)&&!clean(state.action))w.push('Add a subject or action to give the generator a clear starting point.');
 if(video&&moves.length&&(has('No camera movement')||state.cameraSupport==='Locked tripod'))w.push('Moving-camera choices conflict with a locked camera. Remove the movement or the stationary instruction.');
 if(video&&moves.length>3)w.push('Many movements can be difficult to follow in one short clip. Consider fewer movements or clarify their sequence.');
 if(video&&state.movementOrder==='Simultaneous, coordinated'&&[['Pan left','Pan right'],['Tilt up','Tilt down'],['Dolly in','Dolly out'],['Zoom in','Zoom out'],['Truck left','Truck right'],['Pedestal up','Pedestal down'],['Orbit clockwise','Orbit counterclockwise']].some(pair=>pair.every(x=>moves.includes(x))))w.push('Opposite movements selected simultaneously: use sequential execution or remove one direction.');
 if(has('Portrait identity preservation')&&(clean(state.emotion)||clean(state.expressionNotes)))w.push('Portrait identity preservation also preserves expression. A new emotion may conflict with the reference expression.');
 if(has('Portrait identity preservation'))w.push('Attach the reference portrait in your generator. Exact identity preservation cannot be guaranteed by prompt wording.');
 if(state.depth==='Deep focus'&&['f/1.4','f/2'].includes(state.aperture))w.push('Deep focus and a very wide aperture may conflict; consider f/8–f/11 or leave aperture open.');
 if(state.depth==='Shallow depth of field'&&['f/11','f/16'].includes(state.aperture))w.push('A narrow aperture may work against your shallow-depth look. Consider a wider aperture or omit the number.');
 if(has('No lens distortion')&&state.lens==='Fisheye')w.push('Fisheye deliberately distorts geometry, which conflicts with “No lens distortion.”');
 if(video&&((has('No dialogue')&&clean(state.dialogueEnglish))||(has('No music')&&state.musicEnabled==='Yes')||(has('No audio')&&(clean(state.dialogueEnglish)||state.musicEnabled==='Yes'||clean(state.soundEffects)))))w.push('Audio instructions conflict with a selected silence, dialogue or music restriction.');
 if(video&&state.shutter&&state.fps){const denominator=Number(state.shutter.match(/\/(\d+)/)?.[1]);if(denominator<parseInt(state.fps))w.push('The shutter duration is longer than one frame. Choose a faster shutter or lower frame rate.');}
 if(state.lightStyle==='Silhouette'&&(state.focus==='Eye focus'||has('Portrait identity preservation')))w.push('A silhouette hides facial detail. Use visible facial lighting if identity or eye detail matters.');
 return w;
 }
 function updatePreview(){$('promptOutput').value=prompt();$('warnings').innerHTML=conflicts().map(w=>`<p>${esc(w)}</p>`).join('');}
 function go(i){step=Math.max(0,Math.min(D.sections.length-1,i));history.replaceState(null,'',step===D.sections.length-1?'#review':location.pathname+location.search);render();$('editor').focus({preventScroll:true});if(innerWidth<701)$('editor').scrollIntoView({behavior:'smooth',block:'start'});}
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.step!==undefined)go(Number(b.dataset.step));if(b.dataset.edit!==undefined)go(Number(b.dataset.edit));
 if(b.dataset.help!==undefined){const id=b.closest('.field')?.querySelector('[data-field]')?.dataset.field;const f=all.find(f=>f.id===id),o=f?.options?.find(o=>o.label===state[id]);$('helpTitle').textContent=o?f.label+' — '+o.label:b.dataset.title;$('helpBody').textContent=o?[f.help,o.help].filter(Boolean).join(' '):b.dataset.help;$('helpExample').textContent='Example prompt wording: “'+(o?.wording||b.dataset.example)+'”';$('helpDialog').showModal();}
 });
 $('fields').addEventListener('input',e=>{const el=e.target;if(el.dataset.field){state[el.dataset.field]=el.value;persist();updatePreview();}});
 $('fields').addEventListener('change',e=>{const el=e.target;
 if(el.dataset.field){state[el.dataset.field]=el.value;const f=all.find(f=>f.id===el.dataset.field),hint=$('hint-'+f.id);if(hint)hint.textContent=f.options?.find(o=>o.label===el.value)?.help||f.help||'Optional — choose the look you want.';}
 if(el.dataset.priority)importance[el.dataset.priority]=el.value;
 if(el.dataset.movement){state.movements=state.movements.filter(x=>x!==el.dataset.movement);if(el.checked)state.movements.push(el.dataset.movement);}
 if(el.dataset.restriction){selected=selected.filter(r=>r.label!==el.dataset.restriction);if(el.checked)selected.push({label:el.dataset.restriction,priority:el.dataset.restriction==='Portrait identity preservation'?'Critical':'Normal'});const p=el.closest('.restriction-row').querySelector('select');p.disabled=!el.checked;p.value=selected.find(r=>r.label===el.dataset.restriction)?.priority||'Normal';}
 if(el.dataset.restrictionPriority){const r=selected.find(r=>r.label===el.dataset.restrictionPriority);if(r)r.priority=el.value;}
 persist();updatePreview();});
 $('mode').onchange=()=>{state.mode=$('mode').value;persist();render();};
 $('back').onclick=()=>go(step-1);$('next').onclick=()=>go(step+1);$('review').onclick=()=>go(D.sections.length-1);
 $('closeHelp').onclick=$('dismissHelp').onclick=()=>$('helpDialog').close();
 $('helpDialog').addEventListener('click',e=>{if(e.target===$('helpDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
 $('recommend').onclick=()=>{const video=state.outputType!=='Still image';const defaults={shot:'Medium shot',angle:'Eye level',depth:'Moderate depth of field',focus:'Focus on subject',focalLength:'50mm normal',aperture:'f/4',iso:'100',exposure:'Balanced / preserve highlights',whiteBalance:'Neutral',lightQuality:'Soft light',style:'Cinematic realism',movementOrder:'Sequential, in selection order'};if(video)Object.assign(defaults,{fps:'24 fps',shutter:'1/48 s',motionBlur:'Natural cinematic blur',duration:'8 seconds'});Object.entries(defaults).forEach(([k,v])=>{if(!clean(state[k]))state[k]=v;});persist();render();$('actionStatus').textContent='Filled empty fields with a neutral starting point. Existing choices kept. These are prompt cues, not a measured exposure or an AI service response.';};
 $('copyPrompt').onclick=async()=>{try{const ok=await PBFile.copyText(prompt());$('actionStatus').textContent=ok?'Prompt copied.':'Copy blocked. Select the preview text and copy it manually.';if(!ok){$('promptOutput').focus();$('promptOutput').select();}}catch{$('actionStatus').textContent='Copy unavailable. Select the preview and copy manually.';$('promptOutput').focus();$('promptOutput').select();}};
 const name=()=> (clean(state.projectName)||'prompt-builder').replace(/[^a-z0-9_-]+/gi,'-').slice(0,90);
 async function save(text,file,mime){try{const r=await PBFile.saveText(text,file,mime);$('actionStatus').textContent=r.cancelled?'Save cancelled.':r.method==='picker'?'File saved to your chosen location.':'Download started. Check your browser downloads.';}catch{$('actionStatus').textContent='Save failed. You can copy the prompt or try another browser.';}}
 $('savePrompt').onclick=()=>save(prompt(),name()+'.txt','text/plain');
 $('exportProject').onclick=()=>save(JSON.stringify(snapshot(),null,2),name()+'.json','application/json');
 $('saveProject').onclick=()=>{try{project=PBStorage.addSavedProject(snapshot());persist();$('actionStatus').textContent=storageUnavailable?'Project saved, but draft storage is unavailable. Export JSON as a backup.':'Project saved. Find it under Saved projects.';}catch{$('actionStatus').textContent='Browser storage unavailable. Export JSON to save your project.';}};
 const divider=$('resizeHandle');
 let split=46;
 function resize(value){split=Math.max(30,Math.min(70,value));$('builderShell').style.setProperty('--builder-split',split+'%');divider?.setAttribute('aria-valuenow',String(Math.round(split)));}
 if(divider){divider.setAttribute('aria-valuemin','30');divider.setAttribute('aria-valuemax','70');resize(split);divider.addEventListener('pointerdown',e=>{if(innerWidth<=900)return;divider.setPointerCapture(e.pointerId);});divider.addEventListener('pointermove',e=>{if(!divider.hasPointerCapture(e.pointerId))return;const r=$('builderShell').getBoundingClientRect();resize((e.clientX-r.left)/r.width*100);});divider.addEventListener('pointerup',e=>{if(divider.hasPointerCapture(e.pointerId))divider.releasePointerCapture(e.pointerId);});divider.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();resize(split+(e.key==='ArrowRight'?2:-2));}});}
 window.PBCinemaApp={prompt,conflicts,snapshot,exportProject:()=>save(JSON.stringify(snapshot(),null,2),name()+'.json','application/json')};render();
})();
