(function(){
  var allowed=[10,30,40,50,70,90,100,110,130,150];
  var extPath=(window.__adobe_cep__&&window.__adobe_cep__.getSystemPath)?window.__adobe_cep__.getSystemPath('extension'):'';
  function esc(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
  function evalAE(code,cb){if(!window.__adobe_cep__){setStatus('CEP bridge not available. Open this panel inside After Effects.');return;}window.__adobe_cep__.evalScript(code,function(r){try{var h=JSON.parse(localStorage.getItem('ethanHubHistory')||'[]');h.unshift(new Date().toLocaleTimeString()+' — '+code.replace(/\(.*$/,'()')+' — '+String(r).slice(0,90));localStorage.setItem('ethanHubHistory',JSON.stringify(h.slice(0,80)));}catch(e){}if(cb)cb(r);});}
  function setStatus(t){var s=document.getElementById('status');if(s)s.textContent=t;}
  if(extPath)evalAE("EthanHub_init('"+esc(extPath)+"')");
  setTimeout(function(){evalAE('EthanHub_selfTest()',function(r){var t=String(r||'');if(!t||t.indexOf('ReferenceError')>=0||t.indexOf('EvalScript error')>=0||t.indexOf('SELF TEST ERROR')>=0)setStatus('BACKEND LOAD ERROR: '+t);});},350);

  var mainNav=document.getElementById('mainNav');
  var pageDropdownToggle=document.getElementById('pageDropdownToggle');
  var pageDropdownLabel=document.getElementById('pageDropdownLabel');
  var pageDropdownMenu=document.getElementById('pageDropdownMenu');
  function pageLabel(name){var labels={home:'HOME',profile:'PROFILE',tools:'TOOLS',subscriptions:'SUBSCRIPTIONS',utilities:'UTILITIES',text:'TEXT',legacy:'LEGACY',inspector:'INSPECTOR',settings:'SETTINGS',softwareupdate:'SOFTWARE UPDATE',about:'ABOUT',customize:'CUSTOMIZE',remove:'REMOVE',builder:'STYLE BUILDER',diagnostics:'DIAGNOSTICS'};return labels[name]||String(name||'HOME').toUpperCase();}
  function closePageMenu(){if(mainNav)mainNav.classList.remove('open');if(pageDropdownToggle)pageDropdownToggle.setAttribute('aria-expanded','false');}
  function showPage(name){
    document.querySelectorAll('#pageDropdownMenu button[data-page]').forEach(function(b){b.classList.toggle('active',b.dataset.page===name);});
    document.querySelectorAll('.page').forEach(function(p){p.classList.toggle('active',p.id==='page-'+name);});
    if(pageDropdownLabel)pageDropdownLabel.textContent=pageLabel(name);
    if(name==='softwareupdate'&&window.EthanHubSoftwareUpdate&&window.EthanHubSoftwareUpdate.onOpen)window.EthanHubSoftwareUpdate.onOpen();
    if(name==='about'&&window.EthanHubAbout&&window.EthanHubAbout.onOpen)window.EthanHubAbout.onOpen();
    else if(window.EthanHubAbout&&window.EthanHubAbout.onClose)window.EthanHubAbout.onClose();
    closePageMenu();
  }
  if(pageDropdownToggle)pageDropdownToggle.onclick=function(e){if(e&&e.stopPropagation)e.stopPropagation();var willOpen=!mainNav.classList.contains('open');mainNav.classList.toggle('open',willOpen);pageDropdownToggle.setAttribute('aria-expanded',willOpen?'true':'false');};
  document.querySelectorAll('#pageDropdownMenu button[data-page]').forEach(function(b){b.onclick=function(e){if(e&&e.stopPropagation)e.stopPropagation();showPage(b.dataset.page);};});
  document.addEventListener('click',function(e){if(mainNav&&(!e||!mainNav.contains(e.target)))closePageMenu();});
  document.getElementById('headerProfileChip').onclick=function(){showPage('profile');};
  document.getElementById('headerUpdateStatus').onclick=function(){showPage('softwareupdate');};
  showPage('home');

  function showTool(name){document.querySelectorAll('.toolTile').forEach(function(b){b.classList.toggle('active',b.dataset.tool===name);});document.querySelectorAll('.toolPanel').forEach(function(p){p.classList.toggle('active',p.id==='tool-'+name);});}
  document.querySelectorAll('.toolTile').forEach(function(b){b.onclick=function(){showTool(b.dataset.tool);};});

  function nearest(v){var best=allowed[0];allowed.forEach(function(a){if(Math.abs(a-v)<Math.abs(best-v))best=a;});return best;}
  function zoom(v){v=nearest(parseInt(v||100,10));document.documentElement.style.zoom=(v/100);document.getElementById('zoomSelect').value=v;document.getElementById('zoomRange').value=v;localStorage.setItem('ethanHubZoom',v);}
  document.getElementById('zoomRange').addEventListener('change',function(){zoom(this.value);});
  document.getElementById('zoomSelect').addEventListener('change',function(){zoom(this.value);});
  zoom(localStorage.getItem('ethanHubZoom')||100);

  // Full-panel theme switcher. Theme is local to Ethan's Hub and remembered.
  var themeSelect=document.getElementById('themeSelect');
  function normalizeTheme(theme){if(theme==='tahoe')return 'tahoe-light';return theme;}
  function setTheme(theme){
    var valid={"tahoe-light":1,"tahoe-dark":1,default:1,black:1,white:1,ocean:1,emerald:1,ruby:1,gold:1,rainbow:1,aurora:1};
    theme=normalizeTheme(theme);theme=valid[theme]?theme:'tahoe-light';
    document.body.setAttribute('data-theme',theme);
    document.documentElement.setAttribute('data-theme',theme);
    if(themeSelect)themeSelect.value=theme;
    try{localStorage.setItem('ethanHubTheme',theme);}catch(e){}
    try{syncPlanBadgeTheme();}catch(eSync){}
  }
  window.EthanHubSetTheme=setTheme;
  if(themeSelect)themeSelect.onchange=function(){setTheme(this.value);};
  var savedTheme='tahoe-light';try{savedTheme=normalizeTheme(localStorage.getItem('ethanHubTheme')||'tahoe-light');}catch(eTheme){}
  setTheme(savedTheme);

  function viralSettingsPayload(){
    function v(id,d){var e=document.getElementById(id);return e?e.value:d;}
    return [v('setJawsEvery',12),v('setCrossFrames',10),v('setHalfFrames',13),v('setEdgeBrightness',.97),v('setSkewEvery',8),v('setJawsOut',8),v('setJawsIn',13)].join('|');
  }
  function syncViralSettingsToAE(cb){evalAE("EthanHub_setRuntimeSettings('"+esc(viralSettingsPayload())+"')",function(){if(cb)cb();});}
  document.getElementById('viralBtn').onclick=function(){setStatus('Building FULL Viral Edit — auto-grabbing your visual split clips…');var force=document.getElementById('forceResolution').checked?'true':'false';var res=document.getElementById('resolutionSelect').value;var backup=document.getElementById('backupFirst').checked?'true':'false';syncViralSettingsToAE(function(){evalAE("EthanHub_viralEdit("+force+",'"+esc(res)+"',"+backup+")",setStatus);});};
  document.getElementById('removeBtn').onclick=function(){evalAE('EthanHub_removeViral()',setStatus);};
  document.getElementById('selectAllSplits').onclick=function(){evalAE('EthanHub_selectAllSplitClips()',setStatus);};
  document.getElementById('attemptSplit').onclick=function(){setStatus('Attempting scene detection…');evalAE('EthanHub_attemptSplitScenes()',setStatus);};
  document.getElementById('selectNoIntro').onclick=function(){evalAE('EthanHub_selectAllExceptIntro()',setStatus);};
  document.getElementById('bestMotion').onclick=function(){evalAE('EthanHub_bestMotionTiles()',setStatus);};
  document.getElementById('reboundPanning').onclick=function(){setStatus('Adding full-comp Rebound Swing / Panning…');evalAE('EthanHub_reboundPanning()',setStatus);};
  document.getElementById('fixMotion').onclick=function(){evalAE('EthanHub_fixMotionTiles()',setStatus);};
  document.getElementById('fixZooms').onclick=function(){evalAE('EthanHub_fixZooms()',setStatus);};
  document.getElementById('fixShakes').onclick=function(){evalAE('EthanHub_fixShakes()',setStatus);};
  document.getElementById('fixRipples').onclick=function(){evalAE('EthanHub_fixRipples()',setStatus);};
  document.getElementById('fixJaws').onclick=function(){evalAE('EthanHub_fixJaws()',setStatus);};
  document.getElementById('smoothJawsRotate').onclick=function(){setStatus('Matching Smooth Jaws Rotate to this cut…');evalAE('EthanHub_smoothJawsRotate()',setStatus);};
  var bestRotateJaws=document.getElementById('bestRotateJaws');if(bestRotateJaws)bestRotateJaws.onclick=function(){setStatus('Building Best Rotate Jaws…');evalAE('EthanHub_bestRotateJaws()',setStatus);};
  var smoothFlowEdit=document.getElementById('smoothFlowEdit');if(smoothFlowEdit)smoothFlowEdit.onclick=function(){syncViralSettingsToAE(function(){evalAE("EthanHub_oneClickStyle('Smooth Flow')",setStatus);});};
  var impactFlowEdit=document.getElementById('impactFlowEdit');if(impactFlowEdit)impactFlowEdit.onclick=function(){syncViralSettingsToAE(function(){evalAE("EthanHub_oneClickStyle('Impact Flow')",setStatus);});};
  var cinematicGlideEdit=document.getElementById('cinematicGlideEdit');if(cinematicGlideEdit)cinematicGlideEdit.onclick=function(){syncViralSettingsToAE(function(){evalAE("EthanHub_oneClickStyle('Cinematic Glide')",setStatus);});};
  var autoCaptions=document.getElementById('autoCaptions');if(autoCaptions)autoCaptions.onclick=function(){setStatus('Generating captions locally… first use may download the tiny offline speech model.');evalAE('EthanHub_autoCaptions()',setStatus);};
  var pageAutoCaptions=document.getElementById('pageAutoCaptions');if(pageAutoCaptions)pageAutoCaptions.onclick=function(){if(autoCaptions)autoCaptions.click();};
  document.querySelectorAll('.wmTextStyle').forEach(function(b){b.onclick=function(){evalAE("EthanHub_addTextWatermark('"+esc(b.dataset.wmstyle)+"')",setStatus);};});

  document.getElementById('fixWatermark').onclick=function(){evalAE('EthanHub_fixWatermark()',setStatus);};
  document.getElementById('precompText').onclick=function(){evalAE('EthanHub_precompAllText()',setStatus);};
  document.getElementById('snakeText').onclick=function(){evalAE('EthanHub_smoothSnakeText()',setStatus);};
  document.getElementById('choosePresetRoot').onclick=function(){evalAE('EthanHub_choosePresetRoot()',setStatus);};
  document.getElementById('legacyBtn').onclick=function(){evalAE("EthanHub_openLegacy('"+esc(extPath)+"')",setStatus);};
  document.getElementById('openPresetFolder').onclick=function(){evalAE('EthanHub_openPresetFolder()',setStatus);};
  document.querySelectorAll('.bundledPresetBtn[data-preset]').forEach(function(b){b.onclick=function(){var f=b.dataset.preset;setStatus('Applying '+b.textContent.trim()+'…');evalAE("EthanHub_applyBundledPreset('"+esc(f)+"')",setStatus);};});
  var fixedSnowPreset=document.getElementById('fixedSnowPreset');if(fixedSnowPreset)fixedSnowPreset.onclick=function(){setStatus('Rebuilding your original AE Snow settings safely…');evalAE('EthanHub_addFixedSnow()',setStatus);};
  var safeBackupNow=document.getElementById('safeBackupNow');if(safeBackupNow)safeBackupNow.onclick=function(){setStatus('Creating timestamped project backup…');evalAE('EthanHub_safeBackup()',setStatus);};
  document.querySelectorAll('.fixAlias').forEach(function(b){b.onclick=function(){var t=document.getElementById(b.dataset.target);if(t)t.click();};});

  // Restored Premium pages + watermark recolor controls
  function clickIf(id){var el=document.getElementById(id);if(el)el.click();}
  var homeGoTools=document.getElementById('homeGoTools');if(homeGoTools)homeGoTools.onclick=function(){showPage('tools');};
  var homeGoProfile=document.getElementById('homeGoProfile');if(homeGoProfile)homeGoProfile.onclick=function(){showPage('profile');};
  var homeSelectSplits=document.getElementById('homeSelectSplits');if(homeSelectSplits)homeSelectSplits.onclick=function(){clickIf('selectAllSplits');};
  var homeAttemptSplit=document.getElementById('homeAttemptSplit');if(homeAttemptSplit)homeAttemptSplit.onclick=function(){clickIf('attemptSplit');};

  var pagePrecompText=document.getElementById('pagePrecompText');if(pagePrecompText)pagePrecompText.onclick=function(){clickIf('precompText');};
  var pageSnakeText=document.getElementById('pageSnakeText');if(pageSnakeText)pageSnakeText.onclick=function(){clickIf('snakeText');};
  var pageOpenTextTools=document.getElementById('pageOpenTextTools');if(pageOpenTextTools)pageOpenTextTools.onclick=function(){showPage('tools');showTool('text');};

  var utilSelectAll=document.getElementById('utilSelectAll');if(utilSelectAll)utilSelectAll.onclick=function(){clickIf('selectAllSplits');};
  var utilSelectNoIntro=document.getElementById('utilSelectNoIntro');if(utilSelectNoIntro)utilSelectNoIntro.onclick=function(){clickIf('selectNoIntro');};
  var utilFixMotion=document.getElementById('utilFixMotion');if(utilFixMotion)utilFixMotion.onclick=function(){clickIf('fixMotion');};
  var utilFixZooms=document.getElementById('utilFixZooms');if(utilFixZooms)utilFixZooms.onclick=function(){clickIf('fixZooms');};
  var utilNoColor=document.getElementById('utilNoColor');if(utilNoColor)utilNoColor.onclick=function(){evalAE('EthanHub_addNoColorToColor()',setStatus);};
  var utilFixWatermark=document.getElementById('utilFixWatermark');if(utilFixWatermark)utilFixWatermark.onclick=function(){clickIf('fixWatermark');};
  var utilAttemptSplit=document.getElementById('utilAttemptSplit');if(utilAttemptSplit)utilAttemptSplit.onclick=function(){clickIf('attemptSplit');};

  var legacyPageBtn=document.getElementById('legacyPageBtn');if(legacyPageBtn)legacyPageBtn.onclick=function(){clickIf('legacyBtn');};

  var wmChangeToColor=document.getElementById('wmChangeToColor');if(wmChangeToColor)wmChangeToColor.onclick=function(){evalAE("EthanHub_watermarkColorMode('change_to_color')",setStatus);};
  var wmChangeColor=document.getElementById('wmChangeColor');if(wmChangeColor)wmChangeColor.onclick=function(){evalAE("EthanHub_watermarkColorMode('change_color')",setStatus);};
  var wmColorOff=document.getElementById('wmColorOff');if(wmColorOff)wmColorOff.onclick=function(){evalAE("EthanHub_watermarkColorMode('off')",setStatus);};

  // Audio toolbox
  function audioCall(code,msg){if(msg)setStatus(msg);evalAE(code,setStatus);}
  var audioDistort=document.getElementById('audioDistort');if(audioDistort)audioDistort.onclick=function(){audioCall('EthanHub_audioDistort()','Adding audio distortion…');};
  var audioSlowReverb=document.getElementById('audioSlowReverb');if(audioSlowReverb)audioSlowReverb.onclick=function(){audioCall('EthanHub_audioSlowReverb()','Slowing audio + adding reverb…');};
  var audioVolUp=document.getElementById('audioVolUp');if(audioVolUp)audioVolUp.onclick=function(){audioCall('EthanHub_audioVolume(6)','Raising volume…');};
  var audioVolDown=document.getElementById('audioVolDown');if(audioVolDown)audioVolDown.onclick=function(){audioCall('EthanHub_audioVolume(-6)','Lowering volume…');};
  var audioVolReset=document.getElementById('audioVolReset');if(audioVolReset)audioVolReset.onclick=function(){audioCall('EthanHub_audioVolumeReset()','Resetting volume…');};
  document.querySelectorAll('.audioStyle').forEach(function(b){b.onclick=function(){audioCall("EthanHub_audioStyle('"+esc(b.dataset.style)+"')",'Applying '+b.textContent.toLowerCase()+'…');};});
  document.querySelectorAll('.sfxBtn').forEach(function(b){b.onclick=function(){audioCall("EthanHub_addSFX('"+esc(b.dataset.sfx)+"')",'Adding '+b.textContent+' at playhead…');};});

  // Subscription selector — selected plan also drives the permanent plan badge in the top identity strip.
  var planButtons=document.querySelectorAll('.planCard');
  var planBanner=document.getElementById('currentPlanBanner');
  var activePlanBadge=document.getElementById('activePlanBadge');
  var activePlanIcon=document.getElementById('activePlanIcon');
  var activePlanText=document.getElementById('activePlanText');
  var planBadgeMeta={
    'Default':{icon:'○',cls:'default'},'Plus':{icon:'＋',cls:'plus'},'Pro':{icon:'◆',cls:'pro'},
    'Premium':{icon:'✦',cls:'premium'},'Bronze':{icon:'◈',cls:'bronze'},'Silver':{icon:'◇',cls:'silver'},
    'Gold':{icon:'♛',cls:'gold'},'Diamond':{icon:'💎',cls:'diamond'},'ELITE':{icon:'♚',cls:'elite'}
  };
  function syncPlanBadgeTheme(){
    if(!activePlanText||!activePlanIcon)return;
    var plan=String(activePlanText.textContent||'').toUpperCase();
    if(plan!=='ELITE')return;
    var theme=(document.body&&document.body.getAttribute('data-theme'))||'default';
    activePlanIcon.textContent=(theme==='rainbow')?'🌈':'♚';
  }
  function setPlan(name){
    name=name||'Default';
    planButtons.forEach(function(b){b.classList.toggle('selected',b.dataset.plan===name);});
    if(planBanner)planBanner.textContent='YOU ARE CURRENTLY ON “'+String(name).toUpperCase()+'” PLAN.';
    var meta=planBadgeMeta[name]||planBadgeMeta.Default;
    if(activePlanBadge){activePlanBadge.className='activePlanBadge plan-badge-'+meta.cls;}
    if(activePlanIcon)activePlanIcon.textContent=meta.icon;
    if(activePlanText)activePlanText.textContent=String(name).toUpperCase();
    syncPlanBadgeTheme();
    try{localStorage.setItem('ethanHubPlan',name);}catch(e){}
  }
  planButtons.forEach(function(b){b.onclick=function(){setPlan(b.dataset.plan);setStatus('Subscription switched to '+b.dataset.plan+'.');};});
  var savedPlan='Default';try{savedPlan=localStorage.getItem('ethanHubPlan')||localStorage.getItem('ethanHubFakePlan')||'Default';}catch(ePlan){}
  var validPlan=false;planButtons.forEach(function(b){if(b.dataset.plan===savedPlan)validPlan=true;});
  setPlan(validPlan?savedPlan:'Default');


  // Settings, Inspector, and surgical Remove UI.
  var setIds=['setJawsEvery','setCrossFrames','setHalfFrames','setEdgeBrightness','setSkewEvery','setJawsOut','setJawsIn'];
  function loadViralSettings(){var defs=['12','10','13','0.97','8','8','13'],saved=null;try{saved=JSON.parse(localStorage.getItem('ethanHubViralSettings_RestoredFullEdit_v3')||'null');if(!saved){saved=JSON.parse(localStorage.getItem('ethanHubViralSettings_RestoredFullEdit_v2')||'null');if(!saved){var old=JSON.parse(localStorage.getItem('ethanHubViralSettings_RestoredFullEdit_v1')||'null');if(old){saved=old;if(String(saved[0])==='8')saved[0]='12';if(String(saved[4])==='5')saved[4]='8';}}if(saved&&String(saved[2])==='10')saved[2]='13';if(saved)localStorage.setItem('ethanHubViralSettings_RestoredFullEdit_v3',JSON.stringify(saved));}}catch(e){}setIds.forEach(function(id,i){var e=document.getElementById(id);if(e)e.value=(saved&&saved[i]!=null)?saved[i]:defs[i];});}
  var saveViralSettings=document.getElementById('saveViralSettings');if(saveViralSettings)saveViralSettings.onclick=function(){var vals=setIds.map(function(id){return document.getElementById(id).value;});localStorage.setItem('ethanHubViralSettings_RestoredFullEdit_v3',JSON.stringify(vals));syncViralSettingsToAE(function(){setStatus('Viral Edit settings saved as your default.');});};
  var resetViralSettings=document.getElementById('resetViralSettings');if(resetViralSettings)resetViralSettings.onclick=function(){localStorage.removeItem('ethanHubViralSettings_RestoredFullEdit_v3');loadViralSettings();syncViralSettingsToAE(function(){setStatus('Reset to Ethan defaults.');});};
  loadViralSettings();syncViralSettingsToAE();
  var runInspector=document.getElementById('runInspector');if(runInspector)runInspector.onclick=function(){evalAE('EthanHub_inspectViral()',function(r){var box=document.getElementById('inspectorOutput');try{var d=JSON.parse(r),s='VISUAL CLIPS: '+d.clips+'\nZOOMS: '+d.zoom+'\nEDGE RAYS: '+d.edge+'\nSMOOTH SKEW: '+d.skew+'\nSMOOTH JAWS: '+d.jaws+'\nHALFTONE HELPERS: '+d.halftone+'\nCROSS GLITCH: '+d.cross+'\nSNOW: '+d.snow+'\nFLASHES: '+d.flash+'\n\nSUSPICIOUS TRANSFORMS:\n'+((d.suspicious&&d.suspicious.length)?d.suspicious.join('\n'):'None detected');box.textContent=s;}catch(e){box.textContent=r;}setStatus('Inspector scan complete.');});};
  var removeEffectSelect=document.getElementById('removeEffectSelect'),specificClipList=document.getElementById('specificClipList'),confirmRemoveSpecific=document.getElementById('confirmRemoveSpecific');
  var scanRemoveSpecific=document.getElementById('scanRemoveSpecific');if(scanRemoveSpecific)scanRemoveSpecific.onclick=function(){var key=removeEffectSelect.value;evalAE("EthanHub_effectClips('"+esc(key)+"')",function(r){var arr=[];try{arr=JSON.parse(r)||[];}catch(e){}specificClipList.innerHTML='';if(!arr.length){specificClipList.textContent='No visual split clips currently contain '+key+'.';confirmRemoveSpecific.style.display='none';return;}arr.forEach(function(x){var lab=document.createElement('label');lab.className='specificClipChoice';lab.innerHTML='<input type="checkbox" value="'+x.n+'"> Split Clip #'+x.n+' <small>'+x.name+'</small>';specificClipList.appendChild(lab);});confirmRemoveSpecific.style.display='block';});};
  if(confirmRemoveSpecific)confirmRemoveSpecific.onclick=function(){var nums=[];specificClipList.querySelectorAll('input:checked').forEach(function(x){nums.push(x.value);});if(!nums.length){setStatus('Check at least one clip first.');return;}evalAE("EthanHub_removeEffectSpecific('"+esc(removeEffectSelect.value)+"','"+esc(nums.join(','))+"')",function(r){setStatus(r);scanRemoveSpecific.click();});};
  var removeEffectAll=document.getElementById('removeEffectAll');if(removeEffectAll)removeEffectAll.onclick=function(){evalAE("EthanHub_removeEffectAll('"+esc(removeEffectSelect.value)+"')",setStatus);};


  var matchZoomFlow=document.getElementById('matchZoomFlow');if(matchZoomFlow)matchZoomFlow.onclick=function(){evalAE("EthanHub_matchZoomFlow('smooth')",setStatus);};
  var dep=document.getElementById('dependencyCheck');if(dep)dep.onclick=function(){evalAE('EthanHub_dependencyCheck()',function(r){document.getElementById('diagnosticOutput').textContent=r;setStatus('Dependency check complete.');});};
  var score=document.getElementById('editScore');if(score)score.onclick=function(){evalAE('EthanHub_editScore()',function(r){document.getElementById('diagnosticOutput').textContent=r;setStatus('Edit scored.');});};
  var heat=document.getElementById('timelineHeatmap');if(heat)heat.onclick=function(){evalAE('EthanHub_shortClipHeatmap()',function(r){document.getElementById('diagnosticOutput').textContent=r;setStatus('Short-clip heatmap ready.');});};
  var safe=document.getElementById('safeTestMode');if(safe)safe.onclick=function(){evalAE('EthanHub_safeTestMode()',setStatus);};
  var fixme=document.getElementById('fixMyEdit');if(fixme)fixme.onclick=function(){evalAE('EthanHub_fixMyEdit()',setStatus);};
  var restyle=document.getElementById('restyleCaptions');if(restyle)restyle.onclick=function(){var st=document.getElementById('captionStyle').value;evalAE("EthanHub_applyCaptionStyle('"+esc(st)+"')",setStatus);};
  var applyCustom=document.getElementById('previewCustomStyle');if(applyCustom)applyCustom.onclick=function(){var z=document.getElementById('bZoom').checked?'true':'false',sk=document.getElementById('bSkew').checked?'true':'false',ra=document.getElementById('bRays').checked?'true':'false',fl=document.getElementById('bFlash').checked?'true':'false',ja=document.getElementById('bJaws').checked?'true':'false',st=document.getElementById('bStrength').value;evalAE('EthanHub_applyCustomStyle('+z+','+sk+','+ra+','+fl+','+ja+','+st+')',setStatus);};
  function renderSavedStyles(){var box=document.getElementById('savedStyles');if(!box)return;var a=[];try{a=JSON.parse(localStorage.getItem('ethanHubCustomStyles')||'[]');}catch(e){}box.textContent=a.length?'Saved: '+a.map(function(x){return x.name;}).join(' • '):'No custom styles saved yet.';}
  var saveCustom=document.getElementById('saveCustomStyle');if(saveCustom)saveCustom.onclick=function(){var a=[];try{a=JSON.parse(localStorage.getItem('ethanHubCustomStyles')||'[]');}catch(e){}a.push({name:document.getElementById('customStyleName').value||'ETHAN CUSTOM FLOW',zoom:document.getElementById('bZoom').checked,skew:document.getElementById('bSkew').checked,rays:document.getElementById('bRays').checked,flash:document.getElementById('bFlash').checked,jaws:document.getElementById('bJaws').checked,strength:document.getElementById('bStrength').value});localStorage.setItem('ethanHubCustomStyles',JSON.stringify(a.slice(-20)));renderSavedStyles();setStatus('Custom edit style saved locally.');};renderSavedStyles();
  function renderHistory(){var b=document.getElementById('hubHistory');if(!b)return;var h=[];try{h=JSON.parse(localStorage.getItem('ethanHubHistory')||'[]');}catch(e){}b.textContent=h.length?h.join('\n'):'No Hub actions logged yet.';}
  var rh=document.getElementById('refreshHistory');if(rh)rh.onclick=renderHistory;var ch=document.getElementById('clearHistory');if(ch)ch.onclick=function(){localStorage.removeItem('ethanHubHistory');renderHistory();};renderHistory();

  var profileFile=document.getElementById('profileFile');
  var photoEditor=document.getElementById('photoEditor');
  var cropStage=document.getElementById('cropStage');
  var cropCanvas=document.getElementById('cropCanvas');
  var cropCtx=cropCanvas.getContext('2d');
  var cropZoom=document.getElementById('cropZoom');
  var cropZoomValue=document.getElementById('cropZoomValue');
  var cropState={img:null,source:'',zoom:1,offsetX:0,offsetY:0,drag:false,lastX:0,lastY:0};

  function setAvatar(data){
    var mini=document.querySelector('.miniAvatar'),big=document.querySelector('.profileAvatar');
    if(mini)mini.classList.toggle('hasImg',!!data);
    if(big)big.classList.toggle('hasImg',!!data);
    document.getElementById('avatarImg').src=data||'';
    document.getElementById('profileImg').src=data||'';
  }
  function setName(name){name=name||'officiallethannn';document.getElementById('displayName').value=name;document.getElementById('profileHeading').textContent=name;document.getElementById('headerProfileName').textContent=name;var by=document.getElementById('brandProfileName');if(by)by.textContent=name;}
  function loadProfile(){var pic=localStorage.getItem('ethanHubProfilePhoto')||'';var name=localStorage.getItem('ethanHubDisplayName')||'officiallethannn';var scale=localStorage.getItem('ethanHubDefaultScale')||'100';setAvatar(pic);setName(name);document.getElementById('profileScale').value=scale;}

  function canvasPoint(e){
    var r=cropStage.getBoundingClientRect();
    var cx=(e.clientX-r.left)*(cropCanvas.width/r.width);
    var cy=(e.clientY-r.top)*(cropCanvas.height/r.height);
    return {x:cx,y:cy};
  }
  function cropMetrics(){
    if(!cropState.img)return null;
    var W=cropCanvas.width,H=cropCanvas.height,img=cropState.img;
    // The visible crop guide is inset 8%. Build all positioning around THAT exact square,
    // so the saved avatar matches what you saw inside the circle.
    var inset=Math.round(W*.08),cropSize=W-inset*2;
    var base=Math.max(cropSize/img.naturalWidth,cropSize/img.naturalHeight);
    var scale=base*cropState.zoom;
    var dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
    var maxX=Math.max(0,(dw-cropSize)/2),maxY=Math.max(0,(dh-cropSize)/2);
    cropState.offsetX=Math.max(-maxX,Math.min(maxX,cropState.offsetX));
    cropState.offsetY=Math.max(-maxY,Math.min(maxY,cropState.offsetY));
    return {W:W,H:H,inset:inset,cropSize:cropSize,dw:dw,dh:dh,x:(W-dw)/2+cropState.offsetX,y:(H-dh)/2+cropState.offsetY,maxX:maxX,maxY:maxY};
  }
  function drawCrop(){
    var m=cropMetrics();
    cropCtx.clearRect(0,0,cropCanvas.width,cropCanvas.height);
    cropCtx.fillStyle='#09070d';cropCtx.fillRect(0,0,cropCanvas.width,cropCanvas.height);
    if(!m||!cropState.img)return;
    cropCtx.imageSmoothingEnabled=true;
    try{cropCtx.imageSmoothingQuality='high';}catch(e0){}
    cropCtx.drawImage(cropState.img,m.x,m.y,m.dw,m.dh);
  }
  function openCropEditor(source,reset){
    if(!source){setStatus('Choose a profile photo first.');return;}
    var img=new Image();
    img.onload=function(){
      cropState.img=img;cropState.source=source;
      if(reset!==false){
        cropState.zoom=1;cropState.offsetX=0;cropState.offsetY=0;
      }else{
        try{var saved=JSON.parse(localStorage.getItem('ethanHubProfileCropState')||'null');if(saved){cropState.zoom=Math.max(1,Math.min(3,Number(saved.zoom)||1));cropState.offsetX=Number(saved.offsetX)||0;cropState.offsetY=Number(saved.offsetY)||0;}}catch(eSaved){}
      }
      cropZoom.value=String(Math.round(cropState.zoom*100));cropZoomValue.textContent=Math.round(cropState.zoom*100)+'%';
      photoEditor.hidden=false;photoEditor.setAttribute('aria-hidden','false');drawCrop();
    };
    img.onerror=function(){setStatus('Could not open that image. Try JPG or PNG.');};
    img.src=source;
  }
  function closeCropEditor(){photoEditor.hidden=true;photoEditor.setAttribute('aria-hidden','true');cropState.drag=false;}
  function normalizedSource(img){
    var maxDim=1400,w=img.naturalWidth,h=img.naturalHeight,ratio=Math.min(1,maxDim/Math.max(w,h));
    var c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*ratio));c.height=Math.max(1,Math.round(h*ratio));
    var x=c.getContext('2d');x.drawImage(img,0,0,c.width,c.height);
    try{return c.toDataURL('image/jpeg',.88);}catch(e){return cropState.source;}
  }
  function saveCrop(){
    var m=cropMetrics();if(!m||!cropState.img)return;
    var out=document.createElement('canvas'),S=512;out.width=S;out.height=S;var x=out.getContext('2d');
    x.fillStyle='#09070d';x.fillRect(0,0,S,S);x.imageSmoothingEnabled=true;try{x.imageSmoothingQuality='high';}catch(e0){}
    // Save ONLY what is inside the crop guide. This makes the final circular avatar match the editor preview.
    var k=S/m.cropSize;
    x.drawImage(cropState.img,(m.x-m.inset)*k,(m.y-m.inset)*k,m.dw*k,m.dh*k);
    var cropped='';try{cropped=out.toDataURL('image/jpeg',.94);}catch(e1){cropped=cropState.source;}
    try{
      localStorage.setItem('ethanHubProfilePhoto',cropped);
      localStorage.setItem('ethanHubProfilePhotoSource',normalizedSource(cropState.img));
      localStorage.setItem('ethanHubProfileCropState',JSON.stringify({zoom:cropState.zoom,offsetX:cropState.offsetX,offsetY:cropState.offsetY}));
    }catch(e2){
      try{localStorage.setItem('ethanHubProfilePhoto',cropped);}catch(e3){}
    }
    setAvatar(cropped);closeCropEditor();setStatus('Profile photo crop saved. ✦');
  }
  function nudge(dx,dy){cropState.offsetX+=dx;cropState.offsetY+=dy;drawCrop();}

  document.getElementById('chooseProfilePhoto').onclick=function(){profileFile.value='';profileFile.click();};
  document.getElementById('adjustProfilePhoto').onclick=function(){var src=localStorage.getItem('ethanHubProfilePhotoSource')||localStorage.getItem('ethanHubProfilePhoto')||'';openCropEditor(src,false);};
  profileFile.onchange=function(){
    var f=this.files&&this.files[0];if(!f)return;
    if(f.type&&f.type.indexOf('image/')!==0){setStatus('Please choose an image file.');return;}
    var r=new FileReader();r.onload=function(){openCropEditor(r.result,true);};r.onerror=function(){setStatus('Could not read that photo.');};r.readAsDataURL(f);
  };
  document.getElementById('closePhotoEditor').onclick=closeCropEditor;
  document.getElementById('resetCrop').onclick=function(){cropState.zoom=1;cropState.offsetX=0;cropState.offsetY=0;cropZoom.value='100';cropZoomValue.textContent='100%';drawCrop();};
  document.getElementById('applyCrop').onclick=saveCrop;
  cropZoom.oninput=function(){cropState.zoom=Math.max(1,Math.min(3,parseInt(this.value||100,10)/100));cropZoomValue.textContent=Math.round(cropState.zoom*100)+'%';drawCrop();};
  document.getElementById('nudgeLeft').onclick=function(){nudge(-8,0);};
  document.getElementById('nudgeRight').onclick=function(){nudge(8,0);};
  document.getElementById('nudgeUp').onclick=function(){nudge(0,-8);};
  document.getElementById('nudgeDown').onclick=function(){nudge(0,8);};

  function dragStart(e){if(!cropState.img)return;var p=canvasPoint(e);cropState.drag=true;cropState.lastX=p.x;cropState.lastY=p.y;try{cropStage.setPointerCapture(e.pointerId);}catch(e0){}if(e.preventDefault)e.preventDefault();}
  function dragMove(e){if(!cropState.drag)return;var p=canvasPoint(e);cropState.offsetX+=p.x-cropState.lastX;cropState.offsetY+=p.y-cropState.lastY;cropState.lastX=p.x;cropState.lastY=p.y;drawCrop();if(e.preventDefault)e.preventDefault();}
  function dragEnd(e){cropState.drag=false;try{cropStage.releasePointerCapture(e.pointerId);}catch(e0){}if(e&&e.preventDefault)e.preventDefault();}
  if(window.PointerEvent){cropStage.addEventListener('pointerdown',dragStart);cropStage.addEventListener('pointermove',dragMove);cropStage.addEventListener('pointerup',dragEnd);cropStage.addEventListener('pointercancel',dragEnd);}else{
    cropStage.addEventListener('mousedown',dragStart);window.addEventListener('mousemove',dragMove);window.addEventListener('mouseup',dragEnd);
    cropStage.addEventListener('touchstart',function(e){var t=e.touches[0];if(t)dragStart(t);},{passive:false});cropStage.addEventListener('touchmove',function(e){var t=e.touches[0];if(t)dragMove(t);},{passive:false});cropStage.addEventListener('touchend',dragEnd,{passive:false});
  }
  photoEditor.addEventListener('mousedown',function(e){if(e.target===photoEditor)closeCropEditor();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!photoEditor.hidden)closeCropEditor();});

  document.getElementById('saveProfile').onclick=function(){var name=document.getElementById('displayName').value||'officiallethannn';var scale=document.getElementById('profileScale').value||'100';localStorage.setItem('ethanHubDisplayName',name);localStorage.setItem('ethanHubDefaultScale',scale);setName(name);zoom(scale);setStatus('Profile settings saved locally.');};
  document.getElementById('resetProfile').onclick=function(){localStorage.removeItem('ethanHubProfilePhoto');localStorage.removeItem('ethanHubProfilePhotoSource');localStorage.removeItem('ethanHubProfileCropState');setAvatar('');setStatus('Profile photo removed.');};
  loadProfile();
})();


// ============================================================
// SOFTWARE UPDATE — safe in-panel updater for Windows / AE 2025
// ============================================================
(function(){
  var CURRENT_VERSION='3.2.8';
  var CURRENT_BUILD='3280';
  var CURRENT_RELEASE='Neon Heartbeat';
  var EXTENSION_ID='com.ethan.editinghub';
  var lastManifest=null;
  var checking=false;
  var checkedOnOpen=false;
  function E(id){return document.getElementById(id);}
  function esc(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
  function ae(code,cb){if(!window.__adobe_cep__){if(cb)cb('ERROR|CEP bridge unavailable.');return;}window.__adobe_cep__.evalScript(code,function(r){if(cb)cb(String(r||''));});}
  function setHeadline(h,s){if(E('softwareUpdateHeadline'))E('softwareUpdateHeadline').textContent=h;if(E('softwareUpdateSummary'))E('softwareUpdateSummary').textContent=s||'';}
  function setFeedText(t){if(E('softwareUpdateFeedStatus'))E('softwareUpdateFeedStatus').textContent=t;}
  function headerUpdate(state,count){var box=E('headerUpdateStatus'),txt=E('headerUpdateText'),num=E('headerUpdateCount');if(!box||!txt)return;var labels={'latest':'LATEST UPDATE','checking':'CHECKING…','available':'UPDATE AVAILABLE','preparing':'PREPARING UPDATE…','ready':'READY TO INSTALL'};var cls=(state==='available')?'is-available':(state==='ready')?'is-ready':(state==='checking'||state==='preparing')?'is-checking':'is-latest';box.className='headerUpdateStatus '+cls;txt.textContent=labels[state]||labels.latest;box.setAttribute('aria-label','Software Update status: '+txt.textContent);box.title=(state==='available')?'Update available — open Software Update':(state==='ready')?'Update ready to install — open Software Update':'Open Software Update';if(num){var c=Math.max(0,parseInt(count||0,10)||0);num.hidden=!(state==='available'||state==='ready');if(!c)num.hidden=true;num.textContent=String(c||1);}}
  function progress(show,pct,text){var box=E('softwareUpdateProgress'),bar=E('softwareUpdateProgressBar'),label=E('softwareUpdateProgressText');if(box)box.hidden=!show;if(bar)bar.style.width=Math.max(0,Math.min(100,pct||0))+'%';if(label)label.textContent=text||'';}
  function parseResult(r){try{return JSON.parse(r);}catch(e){return {ok:false,error:String(r||'Unknown updater response')};}}
  function feed(){var def='https://raw.githubusercontent.com/officiallethan/ethan-editing-hub-updates/refs/heads/main/latest.json';var oldDropbox='https://www.dropbox.com/scl/fo/sq3pmcx9ybnmsrrvr78m9/AApkrBLppkh55By938Z5Kf0?rlkey=o6yvzz0wkmpd1xknm9d2v24mr&dl=0';try{var saved=(localStorage.getItem('ethanHubUpdateFeedUrl')||'').trim();var sameGitHub=(saved===def)||/raw\.githubusercontent\.com\/officiallethan\/ethan-editing-hub-updates/i.test(saved);var oldDropboxFeed=(saved===oldDropbox)||/dropbox\.com\/scl\/fo\/sq3pmcx9ybnmsrrvr78m9/i.test(saved);if(!saved||sameGitHub||oldDropboxFeed){localStorage.setItem('ethanHubUpdateFeedUrl',def);return def;}return saved;}catch(e){return def;}}
  function semver(v){return String(v||'0').split('.').map(function(x){return parseInt(x,10)||0;});}
  function newer(a,b){var A=semver(a),B=semver(b),n=Math.max(A.length,B.length);for(var i=0;i<n;i++){var x=A[i]||0,y=B[i]||0;if(x>y)return true;if(x<y)return false;}return false;}
  function renderCurrent(){if(E('softwareCurrentVersion'))E('softwareCurrentVersion').textContent='PREMIUM 2.0 • NEW VERSION';if(E('softwareCurrentRelease')){E('softwareCurrentRelease').textContent='● LIVE • SECURE CHANNEL';E('softwareCurrentRelease').hidden=false;}var f=feed();if(E('softwareUpdateFeedUrl'))E('softwareUpdateFeedUrl').value=f;setFeedText(f?'Cloud update feed linked.':'Cloud update feed: not linked yet.');}
  function hideUpdate(){lastManifest=null;if(E('softwareUpdateDetails'))E('softwareUpdateDetails').hidden=true;if(E('installHubUpdate'))E('installHubUpdate').disabled=true;progress(false,0,'');}
  function showManifest(m){lastManifest=m;if(E('softwareUpdateDetails'))E('softwareUpdateDetails').hidden=false;if(E('softwareUpdateName'))E('softwareUpdateName').textContent=(m.name||'Ethan Hub Update')+' • '+m.version;if(E('softwareUpdateMeta'))E('softwareUpdateMeta').textContent='Build '+(m.build||'—')+(m.sizeLabel?' • '+m.sizeLabel:'');if(E('softwareUpdateNotes'))E('softwareUpdateNotes').textContent=m.notes||'No release notes provided.';if(E('installHubUpdate'))E('installHubUpdate').disabled=!((m.packageReady||m.packageUrl)&&m.sha256&&m.extensionId===EXTENSION_ID);}
  function check(manual){
    if(checking)return;
    hideUpdate();renderCurrent();var f=feed();
    if(!f){setHeadline('Software Update is installed and ready.','Link one permanent update-feed URL once under Advanced Update Settings. Until then, INSTALL LOCAL UPDATE… can apply signed Ethan Hub update ZIPs without replacing the panel manually.');setFeedText('Cloud update feed: not linked yet — remote Check for Updates cannot work until one URL is linked.');return;}
    checking=true;headerUpdate('checking',0);setHeadline('Checking for updates…','Contacting Ethan Hub Software Update.');progress(true,28,'Checking update feed…');
    ae("EthanHub_checkForUpdates('"+esc(f)+"','"+CURRENT_VERSION+"')",function(r){checking=false;progress(false,0,'');var d=parseResult(r);if(!d.ok){headerUpdate('latest',0);setHeadline('Unable to check for updates.',d.error||'Update feed could not be read.');setFeedText('Feed error — '+(d.error||'unknown error'));return;}if(d.extensionId&&d.extensionId!==EXTENSION_ID){setHeadline('Update feed rejected.','The feed is for '+d.extensionId+', not '+EXTENSION_ID+'.');return;}if(d.updateAvailable&&newer(d.version,CURRENT_VERSION)){showManifest(d);headerUpdate('available',1);setHeadline('An update is available.','Ethan’s Editing Hub '+d.version+' — '+(d.name||'New Update'));setFeedText('Cloud feed connected • last checked '+new Date().toLocaleTimeString());}else{headerUpdate('latest',0);setHeadline('Your Hub is up to date.','Ethan’s Editing Hub '+CURRENT_VERSION+' — '+CURRENT_RELEASE+' is the newest release on this feed.');setFeedText('Cloud feed connected • last checked '+new Date().toLocaleTimeString());}});
  }
  if(E('checkForHubUpdate'))E('checkForHubUpdate').onclick=function(){check(true);};
  if(E('saveHubUpdateFeed'))E('saveHubUpdateFeed').onclick=function(){var u=(E('softwareUpdateFeedUrl').value||'').trim();if(u&&!/^https:\/\//i.test(u)){setFeedText('Use an HTTPS update-feed URL.');return;}try{localStorage.setItem('ethanHubUpdateFeedUrl',u);}catch(e){}renderCurrent();setHeadline(u?'Update feed saved.':'Update feed cleared.',u?'Press CHECK FOR UPDATES.':'Remote updates are not linked.');};
  if(E('clearHubUpdateFeed'))E('clearHubUpdateFeed').onclick=function(){try{localStorage.removeItem('ethanHubUpdateFeedUrl');}catch(e){}if(E('softwareUpdateFeedUrl'))E('softwareUpdateFeedUrl').value='';hideUpdate();renderCurrent();setHeadline('Cloud update feed cleared.','You can link a new HTTPS feed at any time.');};
  function pollBackgroundUpdate(jobId,startedAt){
    ae("EthanHub_pollBackgroundUpdate('"+esc(jobId)+"')",function(r){
      var d=parseResult(r),state=String(d.state||'working'),pct=Math.max(5,Math.min(100,parseInt(d.pct||10,10)||10));
      if(!d.ok||state==='error'){
        headerUpdate('available',1);progress(false,0,'');if(E('installHubUpdate'))E('installHubUpdate').disabled=false;
        setHeadline('Update could not be prepared.',d.error||d.message||'Background updater failed.');return;
      }
      if(state==='ready'){
        headerUpdate('ready',1);progress(true,100,'Update verified and staged.');
        setHeadline('Update is ready to install.','SAVE YOUR PROJECT, then close After Effects. The updater will install the new Hub automatically while AE is closed. Reopen AE when the installer window says COMPLETE.');
        if(E('softwareUpdateSummary'))E('softwareUpdateSummary').textContent+=' Rollback backup: '+(d.backupHint||'automatic');return;
      }
      if((new Date().getTime()-startedAt)>900000){
        headerUpdate('available',1);progress(false,0,'');if(E('installHubUpdate'))E('installHubUpdate').disabled=false;
        setHeadline('Background preparation timed out.','The worker did not finish within 15 minutes. No update was installed.');return;
      }
      headerUpdate('preparing',0);progress(true,pct,d.message||'Preparing update in background…');
      setHeadline('Preparing update in background…','You can keep using After Effects while the updater downloads, verifies, and stages the release.');
      setTimeout(function(){pollBackgroundUpdate(jobId,startedAt);},900);
    });
  }
  if(E('installHubUpdate'))E('installHubUpdate').onclick=function(){
    var f=feed();if(!lastManifest||!f)return;headerUpdate('preparing',0);progress(true,5,'Starting background updater…');
    setHeadline('Starting update preparation…','You can keep using After Effects. The heavy update work runs outside AE.');E('installHubUpdate').disabled=true;
    ae("EthanHub_startBackgroundUpdate('"+esc(f)+"','"+CURRENT_VERSION+"')",function(r){var d=parseResult(r);if(!d.ok||!d.jobId){headerUpdate('available',1);progress(false,0,'');E('installHubUpdate').disabled=false;setHeadline('Update could not be started.',d.error||'Background updater could not start.');return;}pollBackgroundUpdate(d.jobId,new Date().getTime());});
  };
  if(E('installLocalHubUpdate'))E('installLocalHubUpdate').onclick=function(){headerUpdate('preparing',0);setHeadline('Choose an Ethan Hub update package…','Select the update ZIP; the Hub will validate its identity before staging it.');progress(true,10,'Waiting for update package…');ae("EthanHub_installLocalUpdate('"+CURRENT_VERSION+"')",function(r){var d=parseResult(r);if(!d.ok){headerUpdate('latest',0);progress(false,0,'');setHeadline(d.cancelled?'Update cancelled.':'Update package rejected.',d.error||'No update was installed.');return;}headerUpdate('ready',1);progress(true,100,'Update verified and staged.');setHeadline('Local update is ready to install.','SAVE YOUR PROJECT and close After Effects. The updater finishes automatically while AE is closed; then reopen AE.');});};
  if(E('restoreHubVersion'))E('restoreHubVersion').onclick=function(){setHeadline('Preparing rollback…','Looking for the most recent automatic Hub backup.');ae('EthanHub_restorePreviousVersion()',function(r){var d=parseResult(r);if(!d.ok){setHeadline('No rollback was prepared.',d.error||'No previous version backup was found.');return;}setHeadline('Previous version is ready to restore.','SAVE YOUR PROJECT and close After Effects. The rollback runs while AE is closed; reopen AE afterward.');});};
  window.EthanHubSoftwareUpdate={onOpen:function(){renderCurrent();var auto=E('autoCheckHubUpdates');if(auto){try{var saved=localStorage.getItem('ethanHubAutoCheckUpdates');if(saved!==null)auto.checked=saved==='1';}catch(e){}auto.onchange=function(){try{localStorage.setItem('ethanHubAutoCheckUpdates',auto.checked?'1':'0');}catch(x){}};}if(!checkedOnOpen&&auto&&auto.checked){checkedOnOpen=true;check(false);}else if(!feed())setHeadline('Software Update is ready.','Link a permanent HTTPS update feed under Advanced Settings for true one-click cloud updates.');}};
  renderCurrent();headerUpdate('latest',0);
})();


(function(){
  function E(id){return document.getElementById(id);}function esc(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
  function ae(code,cb){if(!window.__adobe_cep__){if(cb)cb('CEP bridge unavailable.');return;}window.__adobe_cep__.evalScript(code,function(r){if(cb)cb(r);});}
  function output(t){var o=E('systemOutput');if(o)o.textContent=String(t||'');}
  function hexRgb(hex){hex=String(hex||'#ffffff').replace('#','');if(hex.length===3)hex=hex.split('').map(function(x){return x+x;}).join('');var n=parseInt(hex,16);return [(n>>16)&255,(n>>8)&255,n&255].join(',');}
  var ids=['luxeHubName','luxeHubSub','luxeAccent','luxeGlass','luxeText','luxeGlow','luxeOpacity','luxeRadius','luxeMotion','luxeNaming','luxeIcon'];
  var defaults={luxeHubName:"Ethan's Editing Hub",luxeHubSub:'PREMIUM 2.0 • TAHOE LUXE',luxeAccent:'#7c5cff',luxeGlass:'#eaf2ff',luxeText:'#f7f8ff',luxeGlow:'#c9b7ff',luxeOpacity:'72',luxeRadius:'22',luxeMotion:'full',luxeNaming:'ethan',luxeIcon:'✦'};
  function read(){var d={};ids.forEach(function(id){var e=E(id);d[id]=e?e.value:defaults[id];});return d;}
  function apply(d){d=d||defaults;ids.forEach(function(id){var e=E(id);if(e&&d[id]!=null)e.value=d[id];});var root=document.documentElement,body=document.body;
    root.style.setProperty('--eh-accent',d.luxeAccent||defaults.luxeAccent);root.style.setProperty('--eh-glass-rgb',hexRgb(d.luxeGlass||defaults.luxeGlass));root.style.setProperty('--eh-text',d.luxeText||defaults.luxeText);root.style.setProperty('--eh-glow',d.luxeGlow||defaults.luxeGlow);root.style.setProperty('--eh-glass-alpha',String((Number(d.luxeOpacity)||72)/100));root.style.setProperty('--eh-radius',(Number(d.luxeRadius)||22)+'px');root.style.setProperty('--eh-brand-symbol','"'+(d.luxeIcon||'✦')+'"');body.setAttribute('data-motion',d.luxeMotion||'full');
    var t=document.querySelector('.topBrand .title'),sub=document.querySelector('.topBrand .sub');if(t)t.textContent=d.luxeHubName||defaults.luxeHubName;if(sub)sub.textContent=d.luxeHubSub||defaults.luxeHubSub;if(E('luxePreviewTitle'))E('luxePreviewTitle').textContent=d.luxeHubName;if(E('luxePreviewSub'))E('luxePreviewSub').textContent=d.luxeHubSub;
    var vb=E('viralBtn');if(vb)vb.textContent=(d.luxeNaming==='clean')?'VIRAL EDIT':'🔥 ETHAN\'S VIRAL EDIT';
  }
  function load(){var d=defaults;try{d=JSON.parse(localStorage.getItem('ethanHubLuxe')||'null')||defaults;}catch(e){}apply(d);}
  ids.forEach(function(id){var e=E(id);if(e)e.addEventListener('input',function(){apply(read());});});
  if(E('saveLuxeTheme'))E('saveLuxeTheme').onclick=function(){var d=read();localStorage.setItem('ethanHubLuxe',JSON.stringify(d));apply(d);output('✓ Tahoe Liquid Glass customization saved.');};
  if(E('resetLuxeTheme'))E('resetLuxeTheme').onclick=function(){localStorage.removeItem('ethanHubLuxe');apply(defaults);output('✓ Reset Tahoe Liquid Glass customization defaults. Your selected theme stays selected.');};
  function call(id,code,msg){var b=E(id);if(b)b.onclick=function(){output(msg||'Working…');ae(code,output);};}
  call('initProject','EthanHub_initializeProject()','Furnishing the project…');
  call('effectProfiler','EthanHub_effectProfiler()','Scanning every effect…');
  call('pluginHealth','EthanHub_pluginHealth()','Checking plug-ins…');
  call('projectDoctor','EthanHub_projectDoctor()','Doctor is checking the project…');
  call('autoRelink','EthanHub_relinkMissing()','Choose the folder that contains the missing footage…');
  call('fixEditAudio','EthanHub_enforceEditAudioName()','Fixing Edit Audio…');
  call('openNativePresets','EthanHub_openNativePresetFolder()','Opening AE native preset library…');
  if(E('liveStats'))E('liveStats').onclick=function(){ae('EthanHub_liveStats()',function(r){try{var d=JSON.parse(r),lines=['PROJECT STATS',d.project||'', 'Comps: '+d.comps,'Layers: '+d.layers,'Effects: '+d.effects,'Missing footage: '+d.missing,'AE memory: '+d.memoryMB+' MB','Render queue: '+d.renderQueue];if(d.activeComp)lines.push('',d.activeComp+' • '+d.width+'×'+d.height+' • '+Number(d.fps).toFixed(2)+' fps','Active layers: '+d.activeLayers);output(lines.join('\n'));}catch(e){output(r);}});};
  var timer=setInterval(function(){if(E('autoStats')&&E('autoStats').checked&&E('page-customize')&&E('page-customize').classList.contains('active')&&E('liveStats'))E('liveStats').click();},5000);
  window.addEventListener('unload',function(){clearInterval(timer);});
  load();
})();


// ============================================================
// ABOUT + NEON HEARTBEAT LIVE TELEMETRY — 3.2.8
// Windows sampling is detached; CEP only reads cached JSON snapshots.
(function(){
  function E(id){return document.getElementById(id);}
  function ae(code,cb){if(!window.__adobe_cep__){if(cb)cb('');return;}window.__adobe_cep__.evalScript(code,function(r){if(cb)cb(String(r||''));});}
  var loaded=false,timer=null,projectTimer=null,workerStarted=false;
  function pctBar(id,v){var e=E(id),n=Math.max(0,Math.min(100,Number(v)||0));if(e)e.style.width=n+'%';}
  function renderInfo(r){try{var d=JSON.parse(r);if(E('aboutAEVersion'))E('aboutAEVersion').textContent=d.ae||'After Effects';if(E('aboutDevice'))E('aboutDevice').textContent=d.device||'Windows PC';if(E('aboutOS'))E('aboutOS').textContent=d.os||'Windows';if(E('aboutCPU'))E('aboutCPU').textContent=d.cpu||'Unavailable';if(E('aboutCores'))E('aboutCores').textContent=d.cores||'Unavailable';if(E('aboutRAM'))E('aboutRAM').textContent=d.ram||'Unavailable';if(E('aboutGPU'))E('aboutGPU').textContent=d.gpu||'Unavailable';loaded=true;}catch(e){}}
  function refreshInfo(){ae('EthanHub_aboutInfo()',renderInfo);}
  function renderLive(r){try{var d=JSON.parse(r||'{}');if(!d.ok){if(E('aboutTelemetryStamp'))E('aboutTelemetryStamp').textContent=d.message||'Sampler starting…';return;}var cpu=Number(d.cpuPercent),gpu=Number(d.gpuPercent),mem=Number(d.memoryMB),memPct=Number(d.memoryPercent),sys=Number(d.systemMemoryPercent);if(E('aboutCPUUsage'))E('aboutCPUUsage').textContent=(cpu>=0?cpu.toFixed(1)+'%':'Unavailable');if(E('aboutGPUUsage'))E('aboutGPUUsage').textContent=(gpu>=0?gpu.toFixed(1)+'%':'Unavailable');if(E('aboutMemUsage'))E('aboutMemUsage').textContent=(mem>=0?Math.round(mem)+' MB':'Unavailable');if(E('aboutSystemMemUsage'))E('aboutSystemMemUsage').textContent=(sys>=0?sys.toFixed(1)+'%':'Unavailable');pctBar('aboutCPUBar',cpu>=0?cpu:0);pctBar('aboutGPUBar',gpu>=0?gpu:0);pctBar('aboutMemBar',memPct>=0?memPct:0);pctBar('aboutSystemMemBar',sys>=0?sys:0);if(E('aboutTelemetryStamp'))E('aboutTelemetryStamp').textContent='LIVE • '+(d.timestamp||'just now')+' • PID '+(d.pid||'—');if(E('aboutPerformanceNote'))E('aboutPerformanceNote').textContent='Neon Heartbeat samples outside AE about every 1.5 seconds. The panel only reads cached JSON; GPU remains best-effort when a Windows driver does not expose a matching AfterFX engine counter.';}catch(e){}}
  function renderProject(r){try{var d=JSON.parse(r||'{}'),box=E('aboutProjectStats');if(!box)return;var render=d.rendering?'RENDERING':'Idle';box.innerHTML='<div><span>Active comp</span><b>'+(d.activeComp||'None')+'</b></div><div><span>Render queue</span><b>'+render+' • '+(d.renderQueue||0)+' item(s)</b></div><div><span>Layers</span><b>'+(d.layers||0)+'</b></div><div><span>Effects</span><b>'+(d.effects||0)+'</b></div>';document.body.classList.toggle('performance-lock',!!d.rendering);}catch(e){}}
  function liveTick(){var p=E('page-about'),t=E('aboutLiveToggle');if(!p||!p.classList.contains('active')||!t||!t.checked)return;ae('EthanHub_readAboutTelemetry()',renderLive);}
  function projectTick(){var p=E('page-about'),t=E('aboutLiveToggle');if(!p||!p.classList.contains('active')||!t||!t.checked)return;ae('EthanHub_aboutProjectPulse()',renderProject);}
  function start(){if(!workerStarted){workerStarted=true;ae('EthanHub_startAboutTelemetry()',function(){liveTick();});}if(timer)clearInterval(timer);if(projectTimer)clearInterval(projectTimer);timer=setInterval(liveTick,1500);projectTimer=setInterval(projectTick,3000);liveTick();projectTick();}
  function stop(){if(timer){clearInterval(timer);timer=null;}if(projectTimer){clearInterval(projectTimer);projectTimer=null;}if(workerStarted){workerStarted=false;ae('EthanHub_stopAboutTelemetry()');}document.body.classList.remove('performance-lock');}
  var toggle=E('aboutLiveToggle');if(toggle)toggle.onchange=function(){try{localStorage.setItem('ethanHubAboutLive',toggle.checked?'1':'0');}catch(e){}if(toggle.checked)start();else stop();};
  var rf=E('refreshAbout');if(rf)rf.onclick=function(){refreshInfo();if(toggle&&toggle.checked){liveTick();projectTick();}};
  try{if(toggle){var saved=localStorage.getItem('ethanHubAboutLive');toggle.checked=saved===null?true:saved==='1';}}catch(e){if(toggle)toggle.checked=true;}
  window.EthanHubAbout={onOpen:function(){if(!loaded)refreshInfo();if(toggle&&toggle.checked)start();},onClose:function(){stop();}};
  window.addEventListener('unload',function(){stop();});
})();

// ============================================================
// NEON HEARTBEAT — animated proxy for every native <select>
// Keeps the real select/value/change events underneath for compatibility.
// ============================================================
(function(){
  function closeAll(except){document.querySelectorAll('.neonSelect.open').forEach(function(w){if(w!==except){w.classList.remove('open');var b=w.querySelector('.neonSelectToggle');if(b)b.setAttribute('aria-expanded','false');}});}
  function enhanceNeonSelect(sel){
    if(!sel||sel.dataset.neonEnhanced==='1'||sel.multiple)return;
    sel.dataset.neonEnhanced='1';
    var wrap=document.createElement('div');wrap.className='neonSelect';
    sel.parentNode.insertBefore(wrap,sel);wrap.appendChild(sel);sel.classList.add('neonNativeSelect');sel.tabIndex=-1;
    var toggle=document.createElement('button');toggle.type='button';toggle.className='neonSelectToggle';toggle.setAttribute('aria-haspopup','listbox');toggle.setAttribute('aria-expanded','false');
    var label=document.createElement('span');label.className='neonSelectValue';var arrow=document.createElement('span');arrow.className='neonSelectArrow';arrow.textContent='⌄';toggle.appendChild(label);toggle.appendChild(arrow);
    var menu=document.createElement('div');menu.className='neonSelectMenu';menu.setAttribute('role','listbox');wrap.appendChild(toggle);wrap.appendChild(menu);
    function sync(){
      var current=sel.options[sel.selectedIndex]||sel.options[0];label.textContent=current?current.text:'Choose';menu.innerHTML='';
      for(var i=0;i<sel.options.length;i++)(function(opt){var b=document.createElement('button');b.type='button';b.className='neonSelectOption'+(opt.selected?' selected':'');b.textContent=opt.text;b.disabled=!!opt.disabled;b.setAttribute('role','option');b.setAttribute('aria-selected',opt.selected?'true':'false');b.onclick=function(e){if(e)e.stopPropagation();sel.value=opt.value;sel.dispatchEvent(new Event('change',{bubbles:true}));sync();wrap.classList.remove('open');toggle.setAttribute('aria-expanded','false');};menu.appendChild(b);})(sel.options[i]);
    }
    toggle.onclick=function(e){if(e)e.stopPropagation();sync();var open=!wrap.classList.contains('open');closeAll(wrap);wrap.classList.toggle('open',open);toggle.setAttribute('aria-expanded',open?'true':'false');};
    sel.addEventListener('change',sync);sync();
  }
  document.querySelectorAll('select').forEach(enhanceNeonSelect);
  document.addEventListener('click',function(){closeAll(null);});
  window.EthanHubRefreshSelects=function(){document.querySelectorAll('select').forEach(function(s){if(s.dataset.neonEnhanced!=='1')enhanceNeonSelect(s);else s.dispatchEvent(new Event('change',{bubbles:false}));});};
})();
