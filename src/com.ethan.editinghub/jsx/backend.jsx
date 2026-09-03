// Ethan's Editing Hub PREMIUM 2.0 - CEP host backend
// IMPORTANT: no #target/#targetengine directives here; CEP ScriptPath already executes in After Effects.

var ETHAN_HUB_EXT = (typeof ETHAN_HUB_EXT !== 'undefined') ? ETHAN_HUB_EXT : '';
// ScriptPath-safe fallback: resolve the extension root directly from this backend file so presets/assets work even before the CEP UI's async init callback returns.
try { if(!ETHAN_HUB_EXT && $.fileName) ETHAN_HUB_EXT = new File($.fileName).parent.parent.fsName; } catch(eExt) {}
// Cross-platform helper for optional local tools (Windows + macOS).
// Function name is retained for backward compatibility with older Hub calls.
function EH_macTool(name){
    var isWin=false;try{isWin=EH_low($.os).indexOf('windows')>=0;}catch(e0){}
    if(isWin){
        var aliases=[name];
        if(name==='whisper-cli')aliases=['whisper-cli','whisper'];
        for(var a=0;a<aliases.length;a++){
            try{
                var out=system.callSystem('cmd.exe /d /s /c "where '+aliases[a]+' 2>NUL"');
                if(out){
                    var lines=String(out).replace(/\r/g,'').split('\n');
                    for(var j=0;j<lines.length;j++){
                        var p=String(lines[j]||'').replace(/^\s+|\s+$/g,'');
                        if(p){var wf=new File(p);if(wf.exists)return wf.fsName;}
                    }
                }
            }catch(ew){}
        }
        return null;
    }
    var cands=[];
    if(name==='ffmpeg') cands=['/opt/homebrew/bin/ffmpeg','/usr/local/bin/ffmpeg','/usr/bin/ffmpeg'];
    else if(name==='whisper-cli') cands=['/opt/homebrew/bin/whisper-cli','/usr/local/bin/whisper-cli'];
    for(var i=0;i<cands.length;i++){try{var f=new File(cands[i]);if(f.exists)return f.fsName;}catch(e){}}
    return null;
}
var ETHAN_HUB_BUNDLED = (typeof ETHAN_HUB_BUNDLED !== 'undefined') ? ETHAN_HUB_BUNDLED : null;
try { if(!ETHAN_HUB_BUNDLED && ETHAN_HUB_EXT) ETHAN_HUB_BUNDLED = new Folder(ETHAN_HUB_EXT + '/presets'); } catch(eBundle) {}
var ETHAN_RUNTIME_SETTINGS = {jawsEvery:12,crossFrames:10,halfFrames:13,edgeBrightness:0.97,skewEvery:8,jawsInFrames:13,jawsOutFrames:8};
var ETHAN_HUB_SETTINGS = 'EthansEditingHubPREMIUM';
var ETHAN_HUB_BUILD = 'PREMIUM 2.0 • 3.2.7 PERMANENT GITHUB CHANNEL';
var ETHAN_HUB_NATIVE_PRESETS = null;
var ETHAN_VIRAL_PREFIX = 'ETHAN_VIRAL';

function EthanHub_init(extensionPath){
    ETHAN_HUB_EXT = extensionPath || ETHAN_HUB_EXT;
    try { ETHAN_HUB_BUNDLED = new Folder(ETHAN_HUB_EXT + '/presets'); } catch(e) {}
    try { ETHAN_HUB_NATIVE_PRESETS = new Folder(Folder.myDocuments.fsName + '/Adobe/After Effects/Presets/Ethan Editing Hub'); } catch(e2) {}
    return 'Ethan Hub 2.0 ready.';
}

function EthanHub_selfTest(){
    try{
        var c=app.project.activeItem;
        var compOK=(c instanceof CompItem);
        var clips=compOK?EH_allClips(c):[];
        return 'OK | '+ETHAN_HUB_BUILD+' | active comp '+(compOK?'YES':'NO')+' | visual clips '+clips.length+' | defaults Jaws '+ETHAN_RUNTIME_SETTINGS.jawsEvery+', Cross '+ETHAN_RUNTIME_SETTINGS.crossFrames+'f, Halftone '+ETHAN_RUNTIME_SETTINGS.halfFrames+'f, Edge '+ETHAN_RUNTIME_SETTINGS.edgeBrightness+', Skew '+ETHAN_RUNTIME_SETTINGS.skewEvery+', Jaws OUT '+ETHAN_RUNTIME_SETTINGS.jawsOutFrames+'f / IN '+ETHAN_RUNTIME_SETTINGS.jawsInFrames+'f';
    }catch(e){return 'SELF TEST ERROR: '+e.toString();}
}

function EH_comp(){
    var c = app.project ? app.project.activeItem : null;
    if (!(c instanceof CompItem)) throw new Error('Open the edit composition first.');
    return c;
}
function EH_low(s){ return String(s||'').toLowerCase(); }
function EH_clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function EH_clearSel(c){ for(var i=1;i<=c.numLayers;i++){try{c.layer(i).selected=false;}catch(e){}} }
function EH_isText(l){ try{return !!l.property('ADBE Text Properties');}catch(e){return false;} }
function EH_isClip(l){
    if (!(l instanceof AVLayer)) return false;
    if (l.adjustmentLayer || l.nullLayer || EH_isText(l)) return false;
    // Never let Viral Edit treat the dedicated full-length audio bed as a visual split clip.
    try {
        var nm=EH_low(l.name), kind=EH_kind(l), cc=String(l.comment||'');
        if(kind==='EDIT_AUDIO'||nm==="ethan\'s edit audio"||nm==="edit audio") return false;
        if(cc.indexOf(ETHAN_VIRAL_PREFIX)===0) return false;
        // Extra guard for a user-made audio-only source layer that has not been renamed yet.
        if(l.enabled===false && l.audioEnabled===true) return false;
        if(nm==='everything' || cc.indexOf('EHPRECOMP|EVERYTHING')>=0) return false;
    } catch(e0){}
    var s=null; try{s=l.source;}catch(e1){}
    return !!s && (s instanceof FootageItem || s instanceof CompItem);
}
function EH_allClips(c){
    var a=[]; for(var i=1;i<=c.numLayers;i++) if(EH_isClip(c.layer(i))) a.push(c.layer(i));
    a.sort(function(x,y){if(x.inPoint<y.inPoint)return -1;if(x.inPoint>y.inPoint)return 1;return x.index-y.index;});
    return a;
}
function EH_selectedClips(c){
    var a=[],s=c.selectedLayers||[]; for(var i=0;i<s.length;i++) if(EH_isClip(s[i])) a.push(s[i]);
    a.sort(function(x,y){if(x.inPoint<y.inPoint)return -1;if(x.inPoint>y.inPoint)return 1;return x.index-y.index;}); return a;
}
function EH_tagLayer(l, owner, kind){
    try{l.comment=ETHAN_VIRAL_PREFIX+'|OWNER:'+(owner||'GLOBAL')+'|KIND:'+(kind||'HELPER');}catch(e){}
}
function EH_ownerTag(owner){return ETHAN_VIRAL_PREFIX+'|OWNER:'+owner+'|';}
function EH_fx(layer){ try{return layer.property('ADBE Effect Parade');}catch(e){return null;} }
function EH_addEffect(layer,names){
    var fx=EH_fx(layer); if(!fx)return null;
    for(var i=0;i<names.length;i++){try{return fx.addProperty(names[i]);}catch(e){}}
    return null;
}
function EH_findRecursive(g,names){
    if(!g)return null;
    for(var i=1;i<=g.numProperties;i++){
        var p=g.property(i), n=''; if(!p)continue; try{n=p.name;}catch(e){}
        for(var j=0;j<names.length;j++) if(n===names[j]) return p;
        try{if(p.numProperties>0){var q=EH_findRecursive(p,names);if(q)return q;}}catch(e2){}
    }
    return null;
}
function EH_setAny(g,names,v){ var p=EH_findRecursive(g,names); if(!p)return false; try{p.setValue(v);return true;}catch(e){return false;} }
function EH_setAnyClamped(g,names,v){
    var p=EH_findRecursive(g,names);if(!p)return false;
    try{
        if(typeof v==='number'){
            try{if(p.hasMin&&v<p.minValue)v=p.minValue;}catch(e0){}
            try{if(p.hasMax&&v>p.maxValue)v=p.maxValue;}catch(e1){}
        }
        p.setValue(v);return true;
    }catch(e){return false;}
}
function EH_ease(p){
    if(!p||!p.numKeys)return;
    var dims=1; try{ if(p.propertyValueType===PropertyValueType.TwoD||p.propertyValueType===PropertyValueType.TwoD_SPATIAL)dims=2; if(p.propertyValueType===PropertyValueType.ThreeD||p.propertyValueType===PropertyValueType.ThreeD_SPATIAL)dims=3;}catch(e){}
    for(var k=1;k<=p.numKeys;k++) try{
        p.setInterpolationTypeAtKey(k,KeyframeInterpolationType.BEZIER,KeyframeInterpolationType.BEZIER);
        var a=[],b=[]; for(var d=0;d<dims;d++){a.push(new KeyframeEase(0,75));b.push(new KeyframeEase(0,75));}
        p.setTemporalEaseAtKey(k,a,b);
    }catch(e2){}
}

function EH_externalPresetRoot(){
    try{if(app.settings.haveSetting(ETHAN_HUB_SETTINGS,'presetRoot')) return new Folder(app.settings.getSetting(ETHAN_HUB_SETTINGS,'presetRoot'));}catch(e){}
    return null;
}
function EH_collectFFX(folder,out){
    if(!folder||!folder.exists)return;
    var xs=[];try{xs=folder.getFiles();}catch(e){return;}
    for(var i=0;i<xs.length;i++){
        if(xs[i] instanceof Folder) EH_collectFFX(xs[i],out);
        else {var n=EH_low(xs[i].name); if(/\.ffx$/i.test(n))out.push(xs[i]);}
    }
}
function EH_findPreset(words){
    var roots=[], ext=EH_externalPresetRoot(); if(ext&&ext.exists)roots.push(ext); if(ETHAN_HUB_NATIVE_PRESETS&&ETHAN_HUB_NATIVE_PRESETS.exists)roots.push(ETHAN_HUB_NATIVE_PRESETS); if(ETHAN_HUB_BUNDLED&&ETHAN_HUB_BUNDLED.exists)roots.push(ETHAN_HUB_BUNDLED);
    for(var r=0;r<roots.length;r++){
        var fs=[]; EH_collectFFX(roots[r],fs);
        for(var i=0;i<fs.length;i++){
            var n=EH_low(decodeURI(fs[i].name)),ok=true;
            for(var w=0;w<words.length;w++) if(n.indexOf(EH_low(words[w]))<0){ok=false;break;}
            if(ok)return fs[i];
        }
    }
    return null;
}
function EH_applyPreset(c,l,file,atTime,tagNew){
    if(!file||!file.exists) return false;
    var fx=EH_fx(l), before=fx?fx.numProperties:0, old=c.time;
    EH_clearSel(c); try{l.selected=true;c.time=(atTime===undefined?l.inPoint:atTime);l.applyPreset(file);}catch(e){try{l.selected=false;c.time=old;}catch(x){}return false;}
    try{l.selected=false;c.time=old;}catch(e2){}
    if(tagNew&&fx){for(var i=before+1;i<=fx.numProperties;i++)try{var p=fx.property(i);p.name=p.name+' [VIRAL]';}catch(e3){}}
    return true;
}
function EH_retimeEffectKeys(layer,a,b){
    var fx=EH_fx(layer); if(!fx||b<=a)return;
    function walk(g){
        for(var i=1;i<=g.numProperties;i++){
            var p=g.property(i); if(!p)continue;
            try{
                if(p.numKeys&&p.numKeys>=2){
                    var n=p.numKeys, t0=p.keyTime(1), t1=p.keyTime(n), span=t1-t0;
                    if(span>0){
                        var vals=[], rel=[];
                        for(var k=1;k<=n;k++){vals.push(p.keyValue(k));rel.push((p.keyTime(k)-t0)/span);}
                        for(var rr=n;rr>=1;rr--)p.removeKey(rr);
                        for(var z=0;z<vals.length;z++)p.setValueAtTime(a+rel[z]*(b-a),vals[z]);
                        EH_ease(p);
                    }
                }
            }catch(e){}
            try{if(p.numProperties>0)walk(p);}catch(e2){}
        }
    }
    walk(fx);
}
function EH_softenZoom(layer,strength){
    var fx=EH_fx(layer); if(!fx)return; strength=(strength||78)/100;
    function walk(g){
        for(var i=1;i<=g.numProperties;i++){
            var p=g.property(i),nm='';if(!p)continue;try{nm=EH_low(p.name);}catch(e){}
            if(nm.indexOf('scale')>=0){
                try{
                    if(p.numKeys){for(var k=1;k<=p.numKeys;k++){var v=p.keyValue(k);if(typeof v==='number')p.setValueAtKey(k,100+(v-100)*strength);else if(v instanceof Array){var nv=[];for(var q=0;q<v.length;q++)nv.push(100+(v[q]-100)*strength);p.setValueAtKey(k,nv);}}}
                }catch(e2){}
            }
            try{if(p.numProperties>0)walk(p);}catch(e3){}
        }
    } walk(fx);
}
function EH_forceCenters(layer,c){
    var fx=EH_fx(layer);if(!fx)return;
    function walk(g){for(var i=1;i<=g.numProperties;i++){var p=g.property(i),nm='';if(!p)continue;try{nm=EH_low(p.name);}catch(e){}
        if(nm==='center'||nm.indexOf('center')>=0){try{if(p.propertyValueType===PropertyValueType.TwoD||p.propertyValueType===PropertyValueType.TwoD_SPATIAL)p.setValue([c.width/2,c.height/2]);}catch(e2){}}
        try{if(p.numProperties>0)walk(p);}catch(e3){}
    }} walk(fx);
}


function EH_markClip(l,token){
    try{var c=String(l.comment||'');if(c.indexOf(token)<0)l.comment=c+(c?'|':'')+token;}catch(e){}
}
function EH_unmarkClip(l,token){
    try{var c=String(l.comment||''),parts=c.split('|'),out=[];for(var i=0;i<parts.length;i++)if(parts[i]&&parts[i]!==token)out.push(parts[i]);l.comment=out.join('|');}catch(e){}
}
function EH_kind(l){
    try{var c=String(l.comment||''),m=/\|KIND:([^|]+)/.exec(c);return m?m[1]:'';}catch(e){return '';}
}
function EH_owner(l){
    try{var c=String(l.comment||''),m=/\|OWNER:([^|]+)/.exec(c);return m?m[1]:'';}catch(e){return '';}
}
function EH_bestMotionOn(c,l){
    var fx=EH_fx(l);if(!fx)return false;var mt=null;
    for(var i=1;i<=fx.numProperties;i++){var p=fx.property(i);try{var nm=EH_low(p.name);if(nm.indexOf("ethan's best motion tile")>=0||nm.indexOf('motion tile')>=0){mt=p;break;}}catch(e){}}
    if(!mt){try{mt=fx.addProperty('ADBE Tile');}catch(e1){try{mt=fx.addProperty('Motion Tile');}catch(e2){}}}
    if(!mt)return false;try{mt.name="Ethan's Best Motion Tile";}catch(e3){}
    EH_setAny(mt,['Tile Center'],[c.width/2,c.height/2]);EH_setAny(mt,['Tile Width'],100);EH_setAny(mt,['Tile Height'],100);
    EH_setAny(mt,['Output Width'],200);EH_setAny(mt,['Output Height'],200);EH_setAny(mt,['Mirror Edges'],1);EH_setAny(mt,['Phase'],90);
    return true;
}
function EthanHub_bestMotionTiles(){
    try{var c=EH_comp(),a=EH_selectedClips(c);if(!a.length)a=EH_allClips(c);for(var i=0;i<a.length;i++)EH_bestMotionOn(c,a[i]);EH_clearSel(c);for(var j=0;j<a.length;j++)a[j].selected=true;return "Fixed Ethan's Best Motion Tile on "+a.length+' clip(s).';}catch(e){return 'ERROR: '+e.toString();}
}
function EH_fixResolution(c,label){
    var n=0;if(label==='720P')n=720;else if(label==='1080P')n=1080;else if(label==='2K')n=1440;else if(label==='4K')n=2160;
    if(!n)return false;try{c.width=n;c.height=n;return true;}catch(e){return false;}
}
function EH_ffmpegTimes(c,l,threshold){
    var file=null;try{file=l.source.file;}catch(e){}if(!file||!file.exists)return [];
    var ff=EH_macTool('ffmpeg');if(!ff)return [];
    var cmd=EH_quote(ff)+' -hide_banner -i '+EH_quote(file.fsName)+' -vf "select=\'gt(scene,'+threshold+')\',showinfo" -an -f null - 2>&1';
    var o='';try{o=system.callSystem(cmd);}catch(e2){return [];}if(!o)return [];
    var times=[],re=/pts_time:([0-9]+(?:\.[0-9]+)?)/g,m;while((m=re.exec(o))!==null){var t=parseFloat(m[1]);if(!isNaN(t))times.push(l.startTime+t*(l.stretch/100.0));}
    return times;
}
function EH_sceneTimes(c,l){
    var adobe=[],low=[],high=[];try{adobe=l.doSceneEditDetection(SceneEditDetectionMode.NONE)||[];}catch(e){}
    try{low=EH_ffmpegTimes(c,l,.18);}catch(e2){}try{high=EH_ffmpegTimes(c,l,.28);}catch(e3){}
    var all=adobe.concat(low).concat(high);all.sort(function(x,y){return x-y;});var out=[],tol=c.frameDuration*2.5;
    for(var i=0;i<all.length;i++){
        var t=all[i]-c.frameDuration; // Treble Zoom usually begins just before the clean scene switch.
        if(t<=l.inPoint+c.frameDuration||t>=l.outPoint-c.frameDuration)continue;
        if(!out.length||Math.abs(t-out[out.length-1])>tol)out.push(t);else out[out.length-1]=(out[out.length-1]+t)/2;
    }
    return out;
}
function EH_splitAt(c,l,times){
    if(!times.length)return [l];var bounds=[l.inPoint],fd=c.frameDuration;times.sort(function(a,b){return a-b;});
    for(var i=0;i<times.length;i++)if(times[i]>l.inPoint+fd&&times[i]<l.outPoint-fd)bounds.push(times[i]);bounds.push(l.outPoint);
    var pieces=[l];for(var p=1;p<bounds.length-1;p++)try{pieces.push(l.duplicate());}catch(e){}
    for(var q=0;q<pieces.length;q++)try{pieces[q].inPoint=bounds[q];pieces[q].outPoint=bounds[q+1];}catch(e2){}
    pieces.sort(function(x,y){return x.inPoint-y.inPoint;});for(var r=1;r<pieces.length;r++)try{pieces[r].moveBefore(pieces[r-1]);}catch(e3){}return pieces;
}
function EH_nameClips(pieces){
    pieces.sort(function(x,y){return x.inPoint-y.inPoint;});
    for(var i=0;i<pieces.length;i++)try{
        if(i===0)pieces[i].name='Intro';
        else if(i===1)pieces[i].name='beat drop';
        else pieces[i].name='Split Clip#'+(i-1);
    }catch(e){}
}
function EthanHub_attemptSplitScenes(){
    try{var c=EH_comp(),s=EH_selectedClips(c);if(s.length!==1)return 'Select exactly ONE full unsplit video layer first.';app.beginUndoGroup('Attempt to Split Scenes');EH_backup(c);var times=EH_sceneTimes(c,s[0]),pieces=EH_splitAt(c,s[0],times);EH_nameClips(pieces);EH_clearSel(c);for(var i=0;i<pieces.length;i++)pieces[i].selected=true;app.endUndoGroup();return '✅ Attempted scene split: '+pieces.length+' clips / '+times.length+' detected cut(s). Review the cuts before Viral Edit.';}catch(e){try{app.endUndoGroup();}catch(x){}return 'ERROR: '+e.toString();}
}
function EH_makeSolid(c,name,a,b,color,owner,kind){
    var d=Math.max(c.frameDuration,b-a),l=c.layers.addSolid(color||[0,0,0],name,c.width,c.height,c.pixelAspect,d);l.startTime=a;l.inPoint=a;l.outPoint=b;EH_tagLayer(l,owner,kind);return l;
}
function EH_makeAdjustment(c,name,a,b,owner,kind){var l=EH_makeSolid(c,name,a,b,[1,1,1],owner,kind);l.adjustmentLayer=true;return l;}
function EH_moveBefore(l,target){try{l.moveBefore(target);}catch(e){}}
function EH_flash(c,clip){var s=EH_makeSolid(c,'White Flash Transition',clip.inPoint,Math.min(clip.outPoint,clip.inPoint+c.frameDuration*2),[1,1,1],clip.name,'FLASH');try{s.property('ADBE Transform Group').property('ADBE Opacity').setValue(85);}catch(e){}return s;}
function EH_beatDropSpecial(c,clip){
    var ripple=EH_makeAdjustment(c,'bcc ripple',clip.inPoint,clip.outPoint,clip.name,'RIPPLE');
    var rp=EH_findPreset(['tattooedhe8rt','ripple']);
    if(rp){
        var rfx=EH_applyPresetCaptureEffects(c,ripple,rp,clip.inPoint,'[VIRAL]');
        for(var ri=0;ri<rfx.length;ri++)EH_walkAnimated(rfx[ri],function(pp){EH_ease(pp);});
        EH_forceCenters(ripple,c);
    }
    var jaws=EH_makeSolid(c,'bcc jaws vertical',clip.inPoint,clip.outPoint,[0,0,0],clip.name,'JAWS_VERTICAL');
    var jp=EH_findPreset(['tattooedhe8rt','jaws','vertical']);
    if(jp){
        var jfx=EH_applyPresetCaptureEffects(c,jaws,jp,clip.inPoint,'[VIRAL]');
        for(var ji=0;ji<jfx.length;ji++)EH_walkAnimated(jfx[ji],function(pp){EH_ease(pp);});
        EH_forceCenters(jaws,c);
    }
    return [ripple,jaws];
}
function EH_horizontalJaws(c,clip){
    var s=EH_makeSolid(c,'bcc jaws horizontal',clip.inPoint,clip.outPoint,[0,0,0],clip.name,'JAWS_HORIZONTAL');
    var p=EH_findPreset(['tattooedhe8rt','jaws','horizontal']);
    if(p){
        var jfx=EH_applyPresetCaptureEffects(c,s,p,clip.inPoint,'[VIRAL]');
        for(var ji=0;ji<jfx.length;ji++)EH_walkAnimated(jfx[ji],function(pp){EH_ease(pp);});
        EH_forceCenters(s,c);
    }
    var op=s.property('ADBE Transform Group').property('ADBE Opacity'),mid=(clip.inPoint+clip.outPoint)/2,last=Math.max(clip.inPoint,clip.outPoint-c.frameDuration);
    try{op.setValueAtTime(clip.inPoint,22);op.setValueAtTime(mid,100);op.setValueAtTime(last,22);EH_ease(op);}catch(e){}
    return s;
}
function EH_walkAnimated(root,fn){
    if(!root)return;for(var i=1;i<=root.numProperties;i++){var p=root.property(i);if(!p)continue;try{if(p.numKeys&&p.numKeys>0)fn(p);}catch(e){}try{if(p.numProperties>0)EH_walkAnimated(p,fn);}catch(e2){}}
}
function EH_retimeAllAnimated(layer,a,b){
    if(b<=a)return;var groups=[];try{groups.push(layer.property('ADBE Transform Group'));}catch(e){}try{groups.push(EH_fx(layer));}catch(e2){}
    for(var g=0;g<groups.length;g++)EH_walkAnimated(groups[g],function(p){try{if(p.numKeys<2)return;var n=p.numKeys,t0=p.keyTime(1),t1=p.keyTime(n),span=t1-t0;if(span<=0)return;var vals=[],rel=[];for(var k=1;k<=n;k++){vals.push(p.keyValue(k));rel.push((p.keyTime(k)-t0)/span);}for(var r=n;r>=1;r--)p.removeKey(r);for(var z=0;z<vals.length;z++)p.setValueAtTime(a+rel[z]*(b-a),vals[z]);EH_ease(p);}catch(ex){}});
}
function EH_softenAllScale(layer,strength){
    strength=(strength||78)/100;var groups=[];try{groups.push(layer.property('ADBE Transform Group'));}catch(e){}try{groups.push(EH_fx(layer));}catch(e2){}
    for(var g=0;g<groups.length;g++){
        function walk(root){if(!root)return;for(var i=1;i<=root.numProperties;i++){var p=root.property(i),nm='';if(!p)continue;try{nm=EH_low(p.name);}catch(e3){}if(nm.indexOf('scale')>=0)try{for(var k=1;k<=p.numKeys;k++){var v=p.keyValue(k);if(typeof v==='number')p.setValueAtKey(k,100+(v-100)*strength);else if(v instanceof Array){var nv=[];for(var q=0;q<v.length;q++)nv.push(100+(v[q]-100)*strength);p.setValueAtKey(k,nv);}}}catch(e4){}try{if(p.numProperties>0)walk(p);}catch(e5){}}}walk(groups[g]);
    }
}

function EH_applyPresetCaptureEffects(c,layer,file,atTime,label){
    var fx=EH_fx(layer),before=fx?fx.numProperties:0,out=[];
    if(!EH_applyPreset(c,layer,file,atTime,false))return out;
    if(fx){
        for(var i=before+1;i<=fx.numProperties;i++){
            try{
                var p=fx.property(i);
                if(label)p.name=p.name+' '+label;
                out.push(p);
            }catch(e){}
        }
    }
    return out;
}
function EH_retimeGroupKeys(root,a,b){
    if(!root||b<=a)return;
    EH_walkAnimated(root,function(p){
        try{
            if(p.numKeys<2)return;
            var n=p.numKeys,t0=p.keyTime(1),t1=p.keyTime(n),span=t1-t0;
            if(span<=0)return;
            var vals=[],rel=[];
            for(var k=1;k<=n;k++){vals.push(p.keyValue(k));rel.push((p.keyTime(k)-t0)/span);}
            for(var r=n;r>=1;r--)p.removeKey(r);
            for(var z=0;z<vals.length;z++)p.setValueAtTime(a+rel[z]*(b-a),vals[z]);
            EH_ease(p);
        }catch(ex){}
    });
}
function EH_softenGroupScale(root,strength){
    if(!root)return;strength=(strength||78)/100;
    function walk(g){
        for(var i=1;i<=g.numProperties;i++){
            var p=g.property(i),nm='';if(!p)continue;try{nm=EH_low(p.name);}catch(e){}
            if(nm.indexOf('scale')>=0){
                try{
                    for(var k=1;k<=p.numKeys;k++){
                        var v=p.keyValue(k);
                        if(typeof v==='number')p.setValueAtKey(k,100+(v-100)*strength);
                        else if(v instanceof Array){var nv=[];for(var q=0;q<v.length;q++)nv.push(100+(v[q]-100)*strength);p.setValueAtKey(k,nv);}
                    }
                }catch(e2){}
            }
            try{if(p.numProperties>0)walk(p);}catch(e3){}
        }
    }
    walk(root);
}
function EH_findPropContains(root,needles){
    if(!root)return null;
    for(var i=1;i<=root.numProperties;i++){
        var p=root.property(i),nm='';if(!p)continue;try{nm=EH_low(p.name);}catch(e){}
        for(var n=0;n<needles.length;n++)if(nm.indexOf(EH_low(needles[n]))>=0)return p;
        try{if(p.numProperties>0){var q=EH_findPropContains(p,needles);if(q)return q;}}catch(e2){}
    }
    return null;
}
function EH_clearKeys(p){
    if(!p)return;try{for(var k=p.numKeys;k>=1;k--)p.removeKey(k);}catch(e){}
}
// Viral 2.0 timing rule: preset keyframes NEVER stay clumped.
// 2 keys = first frame + tail; 3 keys = first + exact middle + tail; 4+ = evenly spaced.
function EH_retimePropertyUniform(p,a,b){
    if(!p||!p.numKeys||p.numKeys<1||b<a)return false;
    try{
        var n=p.numKeys,vals=[],i;
        for(i=1;i<=n;i++)vals.push(p.keyValue(i));
        for(i=n;i>=1;i--)p.removeKey(i);
        if(n===1){p.setValueAtTime(a,vals[0]);}
        else if(n===2){p.setValueAtTime(a,vals[0]);p.setValueAtTime(b,vals[1]);}
        else if(n===3){p.setValueAtTime(a,vals[0]);p.setValueAtTime((a+b)/2,vals[1]);p.setValueAtTime(b,vals[2]);}
        else{for(i=0;i<n;i++)p.setValueAtTime(a+(b-a)*(i/(n-1)),vals[i]);}
        EH_ease(p);return true;
    }catch(e){return false;}
}
function EH_retimeGroupKeysUniform(root,a,b){
    if(!root)return;
    for(var i=1;i<=root.numProperties;i++){
        var p=root.property(i);if(!p)continue;
        try{if(p.numKeys&&p.numKeys>0)EH_retimePropertyUniform(p,a,b);}catch(e){}
        try{if(p.numProperties>0)EH_retimeGroupKeysUniform(p,a,b);}catch(e2){}
    }
}
function EH_addZeroKeysAtTimes(prop,times){
    if(!prop||!times||!times.length)return false;
    try{
        EH_clearKeys(prop);
        for(var i=0;i<times.length;i++)prop.setValueAtTime(times[i],0);
        EH_ease(prop);
        return true;
    }catch(e){return false;}
}
function EH_limitZoomOutZDist(effect,type){
    if(!effect)return false;
    // S_BlurMoCurves positive Z Dist is the zoom-OUT direction. A few Tattooedhe8rt authored keys
    // can expose black when the final key sits after the split out-point. Keep the motion, but cap only
    // dangerous positive values; zoom-ins / negative Z Dist are untouched.
    var z=EH_findPropContains(effect,['z dist','z-dist','zdist']);if(!z||!z.numKeys)return false;
    try{
        for(var k=1;k<=z.numKeys;k++){
            var v=z.keyValue(k);if(typeof v==='number'&&v>3.35)z.setValueAtKey(k,3.35);
        }
        return true;
    }catch(e){return false;}
}
function EH_addZoomSafetyFill(layer,effect){
    if(!layer||!effect)return false;
    var z=EH_findPropContains(effect,['z dist','z-dist','zdist']);if(!z||!z.numKeys)return false;
    var fx=EH_fx(layer),old=null;
    if(fx)for(var i=fx.numProperties;i>=1;i--)try{if(EH_low(fx.property(i).name).indexOf('viral zoom safety fill')>=0){old=fx.property(i);old.remove();break;}}catch(er){}
    var tr=EH_addEffect(layer,['ADBE Geometry2','Transform']);if(!tr)return false;
    try{tr.name='Viral Zoom Safety Fill [VIRAL]';}catch(en){}
    var uni=EH_findRecursive(tr,['Uniform Scale']),sw=EH_findRecursive(tr,['Scale Width']),sh=EH_findRecursive(tr,['Scale Height']),scale=EH_findRecursive(tr,['Scale']);
    try{if(uni)uni.setValue(0);}catch(e0){}
    var times=[],vals=[];
    try{
        for(var k=1;k<=z.numKeys;k++){
            var zv=z.keyValue(k),sc=100;
            if(typeof zv==='number'&&zv>0)sc=100+Math.min(30,zv*8.5);
            times.push(z.keyTime(k));vals.push(sc);
        }
        if(sw)EH_sjrSetKeys(sw,times,vals);
        if(sh)EH_sjrSetKeys(sh,times,vals);
        if(!sw&&!sh&&scale)EH_sjrSetKeys(scale,times,vals);
        return true;
    }catch(e1){return false;}
}
function EH_addZoomShiftKeys(effect,type){
    if(!effect)return false;
    // Z Dist is the actual authored zoom driver and must NOT be flattened.
    // Ethan wants the helper reframe channels created but neutral so he can type his own values.
    var z=EH_findPropContains(effect,['z dist','z-dist','zdist']);
    var sy=EH_findPropContains(effect,['shift y']);
    var sz=EH_findPropContains(effect,['shift z']);
    var sx=EH_findPropContains(effect,['shift x']);
    if(!z||!z.numKeys)return false;
    var times=[],k;
    for(k=1;k<=z.numKeys;k++)times.push(z.keyTime(k));
    EH_addZeroKeysAtTimes(sy,times);
    EH_addZeroKeysAtTimes(sz,times);
    // Keep Shift X neutral too when the preset exposes it; this prevents accidental reframing.
    EH_addZeroKeysAtTimes(sx,times);
    return true;
}
function EH_markZoomType(clip,type){
    try{
        var c=String(clip.comment||''),parts=c.split('|'),out=[];
        for(var i=0;i<parts.length;i++)if(parts[i]&&parts[i].indexOf('EHZOOM:')!==0&&parts[i]!=='EHZOOM')out.push(parts[i]);
        out.push('EHZOOM:'+type);clip.comment=out.join('|');
    }catch(e){}
}
function EH_zoomTypeFromClip(clip){
    try{var m=/(?:^|\|)EHZOOM:([^|]+)/.exec(String(clip.comment||''));return m?m[1]:'';}catch(e){return '';}
}
function EH_zoomEffects(layer){
    var out=[],fx=EH_fx(layer);if(!fx)return out;
    for(var i=1;i<=fx.numProperties;i++){
        var p=fx.property(i),nm='';try{nm=EH_low(p.name);}catch(e){}
        if(nm.indexOf('[viral zoom')>=0)out.push(p);
    }
    return out;
}
function EH_repairZoomOnClip(c,clip,type){
    var effects=EH_zoomEffects(clip);if(!effects.length)return false;
    // Let the authored zoom breathe across the edit instead of pinning the first/last keys
    // to the exact split boundaries: 3 frames before the clip, 4 frames after it.
    var fd=c.frameDuration;
    var a=Math.max(0,clip.inPoint-fd*3);
    var b=Math.min(c.duration,clip.outPoint+fd*4);
    for(var i=0;i<effects.length;i++){EH_retimeGroupKeysUniform(effects[i],a,b);EH_limitZoomOutZDist(effects[i],type);EH_addZoomShiftKeys(effects[i],type);}
    for(var sf=0;sf<effects.length;sf++)if(EH_findPropContains(effects[sf],['z dist','z-dist','zdist'])){EH_addZoomSafetyFill(clip,effects[sf]);break;}
    return true;
}
function EH_applyZoomPreset(c,clip,words,type){
    var p=EH_findPreset(words);if(!p)return false;
    var effects=EH_applyPresetCaptureEffects(c,clip,p,clip.inPoint,'[VIRAL ZOOM '+type+']');
    if(!effects.length)return false;
    // Viral zoom timing: first key 3 frames before the split appears; final key 4 frames
    // past that split clip. Shift helper channels inherit these same times and stay at 0.
    var fd=c.frameDuration;
    var a=Math.max(0,clip.inPoint-fd*3);
    var b=Math.min(c.duration,clip.outPoint+fd*4);
    for(var i=0;i<effects.length;i++){
        EH_retimeGroupKeysUniform(effects[i],a,b);
        EH_softenGroupScale(effects[i],78);
        EH_limitZoomOutZDist(effects[i],type);
        EH_addZoomShiftKeys(effects[i],type);
    }
    for(var sf=0;sf<effects.length;sf++)if(EH_findPropContains(effects[sf],['z dist','z-dist','zdist'])){EH_addZoomSafetyFill(clip,effects[sf]);break;}
    EH_markZoomType(clip,type);
    return true;
}
function EH_neutralizeSlideRotation(root){
    if(!root)return;
    for(var i=1;i<=root.numProperties;i++){
        var p=root.property(i),nm='';if(!p)continue;try{nm=EH_low(p.name);}catch(e0){}
        if(nm==='rotate'||nm==='rotation'||nm.indexOf('rotate')>=0||nm.indexOf('rotation')>=0){
            try{
                if(p.propertyValueType===PropertyValueType.OneD){
                    EH_clearKeys(p);
                    p.setValue(0);
                }
            }catch(e1){}
        }
        try{if(p.numProperties>0)EH_neutralizeSlideRotation(p);}catch(e2){}
    }
}
function EH_applyTimedPreset(c,clip,words,a,b,soften,label){
    var p=EH_findPreset(words);if(!p)return false;
    var effects=EH_applyPresetCaptureEffects(c,clip,p,clip.inPoint,label||'[VIRAL TRANSITION]');
    if(!effects.length)return false;
    for(var i=0;i<effects.length;i++){
        EH_retimeGroupKeysUniform(effects[i],a,b);
        if(soften)EH_softenGroupScale(effects[i],78);
        if(label&&EH_low(label).indexOf('slide')>=0)EH_neutralizeSlideRotation(effects[i]);
    }
    return true;
}
function EH_edgeRayBaseValue(p){
    try{if(p.numKeys&&p.numKeys>0)return p.keyValue(1);}catch(e0){}
    try{return p.value;}catch(e1){}
    return null;
}
function EH_animateEdgeRayNumeric(p,a,m,b,mulA,mulM,mulB){
    if(!p||b<=a)return false;
    var base=EH_edgeRayBaseValue(p);
    if(typeof base!=='number'||isNaN(base))return false;
    try{
        EH_clearKeys(p);
        p.setValueAtTime(a,base*mulA);
        p.setValueAtTime(m,base*mulM);
        p.setValueAtTime(b,base*mulB);
        EH_ease(p);
        return true;
    }catch(e){return false;}
}
function EH_animateEdgeRays(root,clip,c){
    if(!root||!clip)return;
    var fd=c.frameDuration;
    var a=clip.inPoint;
    var b=Math.max(a+fd*2,clip.outPoint-fd);
    if(b>clip.outPoint)b=clip.outPoint;
    if(b<=a)return;
    var m=a+(b-a)*0.52;
    // A subtle expand / settle reads as moving light without the frantic 2-3 frame look.
    var len=EH_findRecursive(root,['Rays Length']);
    var raysBright=EH_findRecursive(root,['Rays Brightness']);
    var edgeBright=EH_findRecursive(root,['Edge Brightness']);
    EH_animateEdgeRayNumeric(len,a,m,b,0.93,1.08,0.97);
    // Brightness must visibly peak in the middle. The bundled preset often reports a base of 0,
    // so multiplying the base produced 0 -> 0 -> 0. Use explicit values instead.
    function EH_edgeBrightnessPulse(p){
        if(!p)return false;
        try{
            var peak=parseFloat(ETHAN_RUNTIME_SETTINGS.edgeBrightness);
            if(isNaN(peak))peak=0.97;
            peak=Math.max(0.10,Math.min(2.00,peak));
            EH_clearKeys(p);
            p.setValueAtTime(a,0.00);
            p.setValueAtTime(m,peak);
            p.setValueAtTime(b,0.00);
            EH_ease(p);
            return true;
        }catch(e){return false;}
    }
    EH_edgeBrightnessPulse(raysBright);
    EH_edgeBrightnessPulse(edgeBright);
}


// Shared Edge Rays helper used by both Viral choreography and Style Builder.
function EH_edgeRays(c,clip){
    if(!c||!clip)return false;
    var erp=EH_findPreset(['tattooedhe8rt','edge rays']);
    if(!erp)return false;
    var erfx=EH_applyPresetCaptureEffects(c,clip,erp,clip.inPoint,'[VIRAL EDGE RAYS]');
    if(!erfx||!erfx.length)return false;
    for(var i=0;i<erfx.length;i++){
        EH_walkAnimated(erfx[i],function(pp){EH_ease(pp);});
        EH_animateEdgeRays(erfx[i],clip,c);
    }
    return true;
}

// ============================================================
// SMOOTH SKEW — VIRAL EDIT / SMOOTH JAWS companion motion
// Uses the native Transform effect's Skew property so it stays non-destructive.
// Every authored key is Easy Eased through EH_sjrSetKeys/EH_ease.
// ============================================================
function EH_removeSmoothSkew(layer){
    var fx=EH_fx(layer);if(!fx)return;
    for(var i=fx.numProperties;i>=1;i--){
        try{
            var nm=EH_low(fx.property(i).name);
            if(nm.indexOf('[smooth skew]')>=0)fx.property(i).remove();
        }catch(e){}
    }
}
function EH_applySmoothSkew(c,layer,startSkew,endSkew,frames,label,replaceExisting){
    if(!c||!layer)return false;
    if(replaceExisting)EH_removeSmoothSkew(layer);
    var tr=EH_addEffect(layer,['ADBE Geometry2','Transform']);if(!tr)return false;
    try{tr.name=(label||'Smooth Skew')+' [VIRAL] [SMOOTH SKEW]';}catch(e0){}
    var skew=EH_findRecursive(tr,['Skew']);
    var axis=EH_findRecursive(tr,['Skew Axis']);
    var shutter=EH_findRecursive(tr,['Shutter Angle']);
    if(!skew)return false;
    try{if(axis)axis.setValue(0);}catch(e1){}
    try{if(shutter)shutter.setValue(270);}catch(e2){}
    var fd=c.frameDuration;
    var a=layer.inPoint;
    var b=Math.min(layer.outPoint-fd,a+fd*Math.max(2,Math.round(frames||10)));
    if(b<=a)b=Math.min(layer.outPoint,a+fd);
    return EH_sjrSetKeys(skew,[a,b],[startSkew,endSkew]);
}
function EH_choreograph(c,pieces){
    if(pieces.length<2)return;
    var fd=c.frameDuration,pattern=['zin','zoutin','zin','zout','sdown1','sdown2','zinout','zoutin','zin','zout+sdown1','sdown2'];
    var left2Starts=[],left1Ends={},down1Ends={};
    function slideEnd1(clip,words,label){
        // Slightly more breathing room than before: 5 frames leading into the cut + 3 past it.
        return EH_applyTimedPreset(c,clip,words,Math.max(clip.inPoint,clip.outPoint-fd*5),Math.min(c.duration,clip.outPoint+fd*3),false,label);
    }
    function slideStart2(clip,words,label){
        // Start-side partner gets 8 frames so the easing has room to breathe.
        return EH_applyTimedPreset(c,clip,words,Math.max(0,clip.inPoint-fd),Math.min(c.duration,clip.inPoint+fd*7),false,label);
    }
    for(var i=1;i<pieces.length;i++){
        var clip=pieces[i],token=pattern[(i-1)%pattern.length];
        if(token==='zin')EH_applyZoomPreset(c,clip,['tattooedhe8rt','zoom in('],'zin');
        else if(token==='zout')EH_applyZoomPreset(c,clip,['tattooedhe8rt','zoom out('],'zout');
        else if(token==='zinout')EH_applyZoomPreset(c,clip,['tattooedhe8rt','zoom in out'],'zinout');
        else if(token==='zoutin')EH_applyZoomPreset(c,clip,['tattooedhe8rt','zoom out in'],'zoutin');
        else if(token==='sdown1'){
            slideEnd1(clip,['tattooedhe8rt','slide down 1'],'[VIRAL SLIDE DOWN 1]');
            down1Ends[i]=true;
        }
        else if(token==='sdown2')slideStart2(clip,['tattooedhe8rt','slide down 2'],'[VIRAL SLIDE DOWN 2]');
        else if(token==='zout+sdown1'){
            EH_applyZoomPreset(c,clip,['tattooedhe8rt','zoom out('],'zout');
            slideEnd1(clip,['tattooedhe8rt','slide down 1'],'[VIRAL SLIDE DOWN 1]');
            down1Ends[i]=true;
        }

        var num=i-1;
        if(num>0&&num%Math.max(2,Math.round(ETHAN_RUNTIME_SETTINGS.skewEvery||5))===0){
            EH_edgeRays(c,clip);
            // Every 5th named Split Clip gets a subtle 10-frame skew recovery.
            var skewStep=Math.max(2,Math.round(ETHAN_RUNTIME_SETTINGS.skewEvery||5));var fifthSkew=((Math.floor(num/skewStep))%2===1)?-11:11;
            EH_applySmoothSkew(c,clip,fifthSkew,0,10,'Smooth Skew - Periodic Clip',false);
        }

        var baseIsDown=(token==='sdown1'||token==='sdown2'||token==='zout+sdown1');
        if(!baseIsDown&&num>0&&num%7===0){
            slideEnd1(clip,['tattooedhe8rt','slide left 1'],'[VIRAL SLIDE LEFT 1]');
            left1Ends[i]=true;
        }
        if(!baseIsDown&&num>0&&num%7===1&&i>2){
            slideStart2(clip,['tattooedhe8rt','slide left 2'],'[VIRAL SLIDE LEFT 2]');
            left2Starts.push(i);
        }
    }

    // Preserve the existing reverse pair guarantee too: a Left 2 can never appear without Left 1 before it.
    for(var p=0;p<left2Starts.length;p++){
        var idx=left2Starts[p],prev=pieces[idx-1];
        if(prev&&!left1Ends[idx-1]){
            slideEnd1(prev,['tattooedhe8rt','slide left 1'],'[VIRAL SLIDE LEFT 1]');
            left1Ends[idx-1]=true;
        }
    }

    // ABSOLUTE FORWARD PAIR RULES requested by Ethan:
    // Slide Left 1 at END -> the NEXT visual clip MUST have Slide Left 2 at BEGINNING.
    // Slide Down 1 at END -> the NEXT visual clip MUST have Slide Down 2 at BEGINNING.
    // We check for an existing partner first so repeated pattern logic never stacks duplicate presets.
    for(var q=0;q<pieces.length-1;q++){
        var next=pieces[q+1];
        if(left1Ends[q]&&!EH_layerHasWord(next,'viral slide left 2'))
            slideStart2(next,['tattooedhe8rt','slide left 2'],'[VIRAL SLIDE LEFT 2]');
        if(down1Ends[q]&&!EH_layerHasWord(next,'viral slide down 2'))
            slideStart2(next,['tattooedhe8rt','slide down 2'],'[VIRAL SLIDE DOWN 2]');
    }
}

function EH_saturation(c,clip){
    var existing=EH_findOwnerKind(c,clip.name,'SATURATION');if(existing)return existing;
    var end=clip.inPoint+(clip.outPoint-clip.inPoint)*.5;
    var adj=EH_makeAdjustment(c,'No Color -> Color',clip.inPoint,end,clip.name,'SATURATION');
    var fx=EH_addEffect(adj,['ADBE HUE SATURATION','Hue/Saturation']);
    if(fx){
        var sat=EH_findRecursive(fx,['Master Saturation','Saturation']);
        if(sat)try{EH_clearKeys(sat);sat.setValue(-100);}catch(e0){}
        try{fx.name='No Color -> Color [VIRAL]';}catch(e1){}
    }
    var op=null;try{op=adj.property('ADBE Transform Group').property('ADBE Opacity');}catch(e2){}
    if(op)try{
        op.setValueAtTime(clip.inPoint,100);
        op.setValueAtTime(end,0);
        EH_ease(op);
    }catch(e3){}
    return adj;
}
function EH_blur(c,clip){
    var half=clip.inPoint+(clip.outPoint-clip.inPoint)*.5,adj=EH_makeAdjustment(c,'blur transition',clip.inPoint,half,clip.name,'BLUR');var fx=EH_addEffect(adj,['ADBE Gaussian Blur 2','Gaussian Blur']),blur=fx?EH_findRecursive(fx,['Blurriness']):null,op=adj.property('ADBE Transform Group').property('ADBE Opacity');var t2=Math.min(half,clip.inPoint+c.frameDuration*3);try{op.setValueAtTime(clip.inPoint,100);op.setValueAtTime(t2,0);EH_ease(op);}catch(e){}if(blur)try{blur.setValueAtTime(clip.inPoint,50);blur.setValueAtTime(t2,0);EH_ease(blur);}catch(e2){}return adj;
}

// ============================================================
// RESTORED ORIGINAL FULL-EDIT STACK
// These are the exact legacy pieces Ethan's old one-click recipe used and that
// newer Premium builds accidentally stopped invoking: Pan Left (Too calm),
// Shake at the beginning (Super calm), Black Flash 2 (Calm / 45% peak), and
// the -5 -> +1.77 -> 0 Exposure adjustment (latest Ethan preference). They are deliberately layered on
// top of the newer Premium 2.0 tattooedhe8rt choreography rather than replacing it.
// ============================================================
function EH_restoredBlackFlash2(c,clip){
    var fd=c.frameDuration,center=clip.inPoint+fd*2,desired=fd*4,half=desired*.5;
    var a=Math.max(clip.inPoint,center-half),b=Math.min(clip.outPoint,center+half);
    if(b-a<fd){a=Math.max(clip.inPoint,center);b=Math.min(clip.outPoint,a+fd);}
    if(b<=a)return null;
    var s=EH_makeSolid(c,'Black Flash 2',a,b,[0,0,0],clip.name,'BLACK_FLASH_2');
    var op=null;try{op=s.property('ADBE Transform Group').property('ADBE Opacity');}catch(e0){}
    if(op){
        var endKey=Math.max(a,b-fd*.02),t1=a+(endKey-a)*.42,t2=a+(endKey-a)*.72;
        try{op.setValueAtTime(a,0);op.setValueAtTime(t1,45);op.setValueAtTime(t2,15.75);op.setValueAtTime(endKey,0);EH_ease(op);}catch(e1){}
    }
    try{s.moveBefore(clip);}catch(e2){}
    return s;
}
function EH_restoredExposure(c,clip){
    var adj=EH_makeAdjustment(c,'Ethan Fade Exposure',clip.inPoint,clip.outPoint,clip.name,'EXPOSURE');
    var fx=EH_addEffect(adj,['ADBE Exposure2','Exposure']);
    if(!fx){try{adj.remove();}catch(er){}return null;}
    try{fx.name='Ethan Fade Exposure [VIRAL RESTORED]';}catch(e0){}
    var ex=EH_findRecursive(fx,['Exposure']),a=clip.inPoint,b=Math.max(a,clip.outPoint-c.frameDuration*.02),m=a+(b-a)*.5;
    if(ex)try{ex.setValueAtTime(a,-5);ex.setValueAtTime(m,1.77);ex.setValueAtTime(b,0);EH_ease(ex);}catch(e1){}
    try{adj.moveBefore(clip);}catch(e2){}
    return adj;
}
function EH_restoredPanLeft(c,clip){
    var tr=EH_addEffect(clip,['ADBE Geometry2','Transform']);if(!tr)return false;
    try{tr.name='Ethan Pan Left [VIRAL RESTORED]';}catch(e0){}
    var pos=EH_findRecursive(tr,['Position']),sc=EH_findRecursive(tr,['Scale']);
    var a=clip.inPoint,b=Math.max(a,clip.outPoint-c.frameDuration*.02),cx=c.width/2,cy=c.height/2;
    // Legacy "Too calm" intensity: p=2, s=.35.
    var ox=c.width*.055*(2/8);
    if(pos)try{pos.setValueAtTime(a,[cx+ox,cy]);pos.setValueAtTime(b,[cx,cy]);EH_ease(pos);}catch(e1){}
    if(sc)try{sc.setValueAtTime(a,101+.35*.45);sc.setValueAtTime(b,100);EH_ease(sc);}catch(e2){}
    return true;
}
function EH_restoredShake(c,clip){
    var tr=EH_addEffect(clip,['ADBE Geometry2','Transform']);if(!tr)return false;
    try{tr.name='Ethan Shake [VIRAL RESTORED]';}catch(e0){}
    // Legacy "Super calm" intensity: p=3, r=.16, s=.55 over the first 6 frames.
    var pos=EH_findRecursive(tr,['Position']),rot=EH_findRecursive(tr,['Rotation']),sc=EH_findRecursive(tr,['Scale']);
    var a=clip.inPoint,b=Math.min(Math.max(a,clip.outPoint-c.frameDuration*.02),a+c.frameDuration*6);
    if(b<=a)b=Math.min(clip.outPoint,a+c.frameDuration);
    var t1=a+(b-a)*.33,t2=a+(b-a)*.66,cx=c.width/2,cy=c.height/2,p=3,r=.16;
    if(pos)try{pos.setValueAtTime(a,[cx+p,cy-p*.45]);pos.setValueAtTime(t1,[cx-p*.72,cy+p*.38]);pos.setValueAtTime(t2,[cx+p*.28,cy-p*.18]);pos.setValueAtTime(b,[cx,cy]);EH_ease(pos);}catch(e1){}
    if(rot)try{rot.setValueAtTime(a,-r);rot.setValueAtTime(t1,r*.68);rot.setValueAtTime(t2,-r*.25);rot.setValueAtTime(b,0);EH_ease(rot);}catch(e2){}
    if(sc)try{sc.setValueAtTime(a,100+.55);sc.setValueAtTime(b,100);EH_ease(sc);}catch(e3){}
    return true;
}
function EH_restoreOriginalFullEditStack(c,pieces){
    for(var i=0;i<pieces.length;i++){
        EH_restoredPanLeft(c,pieces[i]);
        EH_restoredShake(c,pieces[i]);
        EH_restoredBlackFlash2(c,pieces[i]);
        EH_restoredExposure(c,pieces[i]);
    }
    // The newer Viral loop already creates blur on every post-Intro clip. Restore the
    // old blur->clean treatment to Intro too without duplicating the others.
    if(pieces.length)EH_blur(c,pieces[0]);
}
function EH_ensureViralReverb(audio){
    if(!audio)return false;
    var fx=EH_fx(audio);
    if(fx)for(var i=fx.numProperties;i>=1;i--)try{
        if(EH_low(fx.property(i).name).indexOf('ethan viral reverb')>=0)fx.property(i).remove();
    }catch(er){}
    var rv=EH_audioReverb(audio,false);if(!rv)return false;
    try{rv.name='Ethan Viral Reverb';}catch(en){}
    return true;
}

function EH_setLayerControlTo(root,names,layer){
    if(!root||!layer)return false;
    function walk(g){
        for(var i=1;i<=g.numProperties;i++){
            var p=g.property(i),nm='';if(!p)continue;try{nm=EH_low(p.name);}catch(e0){}
            var nameHit=false;for(var n=0;n<names.length;n++)if(nm.indexOf(EH_low(names[n]))>=0){nameHit=true;break;}
            if(nameHit){
                try{
                    if(p.propertyValueType===PropertyValueType.LAYER_INDEX){p.setValue(layer.index);return true;}
                }catch(e1){}
                try{
                    if(p.numProperties>0){
                        for(var j=1;j<=p.numProperties;j++){
                            var q=p.property(j);if(!q)continue;
                            try{if(q.propertyValueType===PropertyValueType.LAYER_INDEX){q.setValue(layer.index);return true;}}catch(e2){}
                        }
                    }
                }catch(e3){}
            }
            try{if(p.numProperties>0&&walk(p))return true;}catch(e4){}
        }
        return false;
    }
    return walk(root);
}
function EH_halftone(c,clip){
    // Exact values from Ethan's reference screenshot. The adjustment layer defaults to 13 frames,
    // and Sapphire's Mask from Layer is pointed at the exact visual clip directly underneath it.
    var end=Math.min(clip.outPoint,clip.inPoint+c.frameDuration*(ETHAN_RUNTIME_SETTINGS.halfFrames||13)),adj=EH_makeAdjustment(c,'S_Halftone',clip.inPoint,end,clip.name,'HALFTONE');
    try{adj.moveBefore(clip);}catch(em){}
    var fx=EH_addEffect(adj,['S_HalfTone','S_Halftone']);if(!fx){try{adj.remove();}catch(er){}return null;}try{fx.name='S_Halftone [VIRAL]';}catch(e){}
    EH_setLayerControlTo(fx,['mask from layer','mask layer'],clip);
    EH_setAny(fx,['Dots Frequency'],61.00);
    EH_setAny(fx,['Dots Angle'],-25.00);
    EH_setAny(fx,['Dots Rel Width'],1.110);
    EH_setAny(fx,['Dots Sharpness'],5.800);
    EH_setAny(fx,['Dots Lighten'],-0.030);
    EH_setAny(fx,['Smooth Source'],6.60);
    EH_setAny(fx,['Color1'],[1,1,1]);
    EH_setAny(fx,['Color0'],[0,0,0]);
    EH_setAny(fx,['Dots Shift X'],1.300);
    EH_setAny(fx,['Dots Shift Y'],-6.000);
    // Mask Use=Luma and Opacity=Normal are Sapphire defaults in this setup; do not stomp the enum
    // with a guessed numeric menu value. Only set the values that are unambiguous from the screenshot.
    EH_setAny(fx,['Blur Mask'],103.00);
    EH_setAny(fx,['Invert Mask'],0);
    var op=adj.property('ADBE Transform Group').property('ADBE Opacity');
    try{op.setValueAtTime(clip.inPoint,100);op.setValueAtTime(Math.max(clip.inPoint,end-c.frameDuration),0);EH_ease(op);}catch(e2){}
    return adj;
}
function EH_crossGlitch(c,clip){
    // 13 frames: extended transition polish for clearer Halftone visibility.
    var end=Math.min(clip.outPoint,clip.inPoint+c.frameDuration*(ETHAN_RUNTIME_SETTINGS.crossFrames||10)),adj=EH_makeAdjustment(c,'BCC Cross Glitch',clip.inPoint,end,clip.name,'CROSS_GLITCH'),fx=EH_addEffect(adj,['BCC Cross Glitch','BCC CrossGlitch']);
    if(!fx){try{adj.remove();}catch(er){}return null;}try{fx.name='BCC Cross Glitch [VIRAL]';}catch(e){}return adj;
}

function EH_setLayerControlNone(root,names){
    if(!root)return false;
    function walk(g){
        for(var i=1;i<=g.numProperties;i++){
            var p=g.property(i),nm='';if(!p)continue;try{nm=EH_low(p.name);}catch(e0){}
            var hit=false;for(var n=0;n<names.length;n++)if(nm.indexOf(EH_low(names[n]))>=0){hit=true;break;}
            if(hit){
                try{if(p.propertyValueType===PropertyValueType.LAYER_INDEX){p.setValue(0);return true;}}catch(e1){}
                try{for(var j=1;j<=p.numProperties;j++){var q=p.property(j);if(q&&q.propertyValueType===PropertyValueType.LAYER_INDEX){q.setValue(0);return true;}}}catch(e2){}
            }
            try{if(p.numProperties>0&&walk(p))return true;}catch(e3){}
        }
        return false;
    }
    return walk(root);
}

// Hard anti-void fill for the fourth-from-last exception only. S_BlurMoCurves +0.160 can still
// visually shrink much more than its numeric value suggests, so a 101% generic safety scale is not enough.
// This helper follows the Z-Dist key times and counter-scales positive zoom-out values aggressively.
function EH_addFourthLastAntiVoid(layer,effect){
    if(!layer||!effect)return false;
    var z=EH_findPropContains(effect,['z dist','z-dist','zdist']);if(!z||!z.numKeys)return false;
    var fx=EH_fx(layer),old=null;
    if(fx)for(var i=fx.numProperties;i>=1;i--)try{
        var nm=EH_low(fx.property(i).name);
        if(nm.indexOf('viral zoom safety fill')>=0||nm.indexOf('fourth-last anti-void')>=0){fx.property(i).remove();}
    }catch(er){}
    var tr=EH_addEffect(layer,['ADBE Geometry2','Transform']);if(!tr)return false;
    try{tr.name='Fourth-Last Anti-Void [VIRAL]';}catch(en){}
    var uni=EH_findRecursive(tr,['Uniform Scale']),sw=EH_findRecursive(tr,['Scale Width']),sh=EH_findRecursive(tr,['Scale Height']),scale=EH_findRecursive(tr,['Scale']);
    try{if(uni)uni.setValue(0);}catch(e0){}
    var times=[],vals=[];
    try{
        for(var k=1;k<=z.numKeys;k++){
            var zv=z.keyValue(k),sc=100;
            // +0.160 gets ~148%, enough to cover the black void shown in the AE test while preserving the zoom.
            if(typeof zv==='number'&&zv>0)sc=100+Math.min(55,zv*300);
            times.push(z.keyTime(k));vals.push(sc);
        }
        if(sw)EH_sjrSetKeys(sw,times,vals);
        if(sh)EH_sjrSetKeys(sh,times,vals);
        if(!sw&&!sh&&scale)EH_sjrSetKeys(scale,times,vals);
        return true;
    }catch(e1){return false;}
}

// One intentional per-edit exception: the 4th visual clip from the END had one authored
// +0.500 Z-Dist key that shrank the picture and exposed black. Change ONLY that clip's
// +0.500 key(s) to +0.160, keep Shift X/Y neutral, and force its Halftone Mask From Layer to None.
function EH_fixFourthFromEndViralClip(c,pieces){
    if(!pieces||pieces.length<4)return null;
    var clip=pieces[pieces.length-4],fxs=EH_zoomEffects(clip);
    // Restore a sane comp-filling parent transform on this one precomp before applying the zoom exception.
    // This clears any accidental layer-level scale/position keyframes that could compound the plugin zoom.
    try{
        var tg=clip.property('ADBE Transform Group'),sc=tg.property('ADBE Scale'),pos=tg.property('ADBE Position'),rot=tg.property('ADBE Rotate Z');
        if(sc){EH_clearKeys(sc);sc.setValue([100,100]);}
        if(pos){EH_clearKeys(pos);pos.setValue([c.width/2,c.height/2]);}
        if(rot){EH_clearKeys(rot);rot.setValue(0);}
    }catch(et){}
    for(var i=0;i<fxs.length;i++){
        var z=EH_findPropContains(fxs[i],['z dist','z-dist','zdist']);
        if(z&&z.numKeys){
            try{
                // Ethan's one-off fourth-from-last zoom: first authored Z-Dist = .160,
                // second authored Z-Dist = .500. Shift X/Y stay neutral through EH_addZoomShiftKeys.
                if(z.numKeys>=1)z.setValueAtKey(1,0.160);
                if(z.numKeys>=2)z.setValueAtKey(2,0.500);
            }catch(e0){}
        }
        EH_addZoomShiftKeys(fxs[i],EH_zoomTypeFromClip(clip));
    }
    // Replace the weak generic safety fill with a dedicated anti-void counter-scale for this ONE clip.
    // This keeps Z-Dist at Ethan's requested +0.160 but prevents the picture collapsing into black.
    if(fxs.length)for(var s=0;s<fxs.length;s++)if(EH_findPropContains(fxs[s],['z dist','z-dist','zdist'])){EH_addFourthLastAntiVoid(clip,fxs[s]);break;}

    var half=EH_findOwnerKind(c,clip.name,'HALFTONE');
    if(half){
        var hfx=EH_fx(half);
        if(hfx)for(var h=1;h<=hfx.numProperties;h++){
            var one=hfx.property(h),hn='';try{hn=EH_low(one.name);}catch(e1){}
            if(hn.indexOf('halftone')>=0){EH_setLayerControlNone(one,['mask from layer','mask layer']);break;}
        }
    }
    return clip;
}
// ============================================================
// PREMIUM 2.0 — SMOOTH JAWS ROTATE • REFERENCE REMASTER V4
// Frame analysis of Ethan's supplied 30fps one-second reference:
// - Width squeeze begins around frame 2 and reaches ~65% width by frames 14-16.
// - The violent rotate/warp only happens in the final ~4 outgoing frames.
// - The incoming shot starts at the same ~65% width and expands back to full in ~10 frames.
// - A dark/ghosted full-frame copy is visible in the SIDE GAPS; the vertical Jaws blocks bloom
//   in those gaps at the cut. This is why the reference feels deeper than a flat rotation.
// ============================================================
function EH_sjrRemoveTaggedEffects(layer){
    var fx=EH_fx(layer);if(!fx)return;
    for(var i=fx.numProperties;i>=1;i--){try{var nm=EH_low(fx.property(i).name);if(nm.indexOf('[smooth jaws rotate]')>=0)fx.property(i).remove();}catch(e){}}
}
function EH_sjrSetKeys(p,times,values){
    if(!p||!times||!values||times.length!==values.length||!times.length)return false;
    try{EH_clearKeys(p);for(var i=0;i<times.length;i++)p.setValueAtTime(times[i],values[i]);EH_ease(p);return true;}catch(e){return false;}
}
function EH_sjrEffect(layer,names,label){
    var e=EH_addEffect(layer,names);if(e)try{e.name=label+' [VIRAL] [SMOOTH JAWS ROTATE]';}catch(ex){}return e;
}
function EH_sjrTransformWH(layer,times,rotVals,widthVals,heightVals){
    var tr=EH_sjrEffect(layer,['ADBE Geometry2','Transform'],'Smooth Jaws Rotate - Elastic Transform');if(!tr)return false;
    var rot=EH_findRecursive(tr,['Rotation']),sw=EH_findRecursive(tr,['Scale Width']),sh=EH_findRecursive(tr,['Scale Height']),scale=EH_findRecursive(tr,['Scale']),uni=EH_findRecursive(tr,['Uniform Scale']),shutter=EH_findRecursive(tr,['Shutter Angle']);
    try{if(uni)uni.setValue(0);}catch(e0){}try{if(shutter)shutter.setValue(360);}catch(e1){}
    if(rot)EH_sjrSetKeys(rot,times,rotVals);
    var did=false;if(sw){EH_sjrSetKeys(sw,times,widthVals);did=true;}if(sh){EH_sjrSetKeys(sh,times,heightVals);did=true;}
    if(!did&&scale){var vals=[];for(var i=0;i<widthVals.length;i++)vals.push([widthVals[i],heightVals[i]]);EH_sjrSetKeys(scale,times,vals);}
    return true;
}
function EH_sjrWarp(layer,times,amountVals){
    var w=EH_sjrEffect(layer,['ADBE Turbulent Displace','Turbulent Displace'],'Smooth Jaws Rotate - Wiggly Warp');if(!w)return false;
    var amount=EH_findRecursive(w,['Amount']),size=EH_findRecursive(w,['Size']),complexity=EH_findRecursive(w,['Complexity']),evolution=EH_findRecursive(w,['Evolution']);
    try{if(size)size.setValue(92);}catch(e0){}try{if(complexity)complexity.setValue(1.55);}catch(e1){}
    if(amount)EH_sjrSetKeys(amount,times,amountVals);
    if(evolution){var ev=[];for(var i=0;i<times.length;i++)ev.push(i*(140/Math.max(1,times.length-1)));EH_sjrSetKeys(evolution,times,ev);}
    return true;
}
function EH_sjrWave(layer,times,heightVals){
    var w=EH_sjrEffect(layer,['ADBE Wave Warp','Wave Warp'],'Smooth Jaws Rotate - Soft Wave');if(!w)return false;
    var h=EH_findRecursive(w,['Wave Height','Height']),wd=EH_findRecursive(w,['Wave Width','Width']),sp=EH_findRecursive(w,['Wave Speed','Speed']),dir=EH_findRecursive(w,['Direction']);
    try{if(wd)wd.setValue(360);}catch(e0){}try{if(sp)sp.setValue(0.28);}catch(e1){}try{if(dir)dir.setValue(90);}catch(e2){}if(h)EH_sjrSetKeys(h,times,heightVals);return true;
}
function EH_sjrLens(layer,times,fovVals){
    var o=EH_sjrEffect(layer,['ADBE Optics Compensation','Optics Compensation'],'Smooth Jaws Rotate - Lens Bend');if(!o)return false;
    var fov=EH_findRecursive(o,['Field of View (FOV)','Field of View','FOV']),rev=EH_findRecursive(o,['Reverse Lens Distortion']);try{if(rev)rev.setValue(1);}catch(e0){}if(fov)EH_sjrSetKeys(fov,times,fovVals);return true;
}
function EH_sjrBlur(layer,times,blurVals){
    var g=EH_sjrEffect(layer,['ADBE Gaussian Blur 2','Gaussian Blur'],'Smooth Jaws Rotate - Motion Softness');if(!g)return false;
    var bl=EH_findRecursive(g,['Blurriness']),rep=EH_findRecursive(g,['Repeat Edge Pixels']);try{if(rep)rep.setValue(1);}catch(e0){}if(bl)EH_sjrSetKeys(bl,times,blurVals);return true;
}
function EH_sjrPair(c){
    var sel=EH_selectedClips(c),all=EH_allClips(c),i;
    function mk(a,b){if(!a||!b)return null;if(a.inPoint>b.inPoint){var z=a;a=b;b=z;}var cut=(a.outPoint+b.inPoint)/2;return {outgoing:a,incoming:b,cut:cut,gap:Math.abs(a.outPoint-b.inPoint)};}
    if(sel.length>=2){var best=null,bestGap=1e9;for(i=0;i<sel.length-1;i++){var p=mk(sel[i],sel[i+1]);if(p&&p.gap<bestGap){best=p;bestGap=p.gap;}}if(best)return best;}
    if(sel.length===1){var ss=sel[0],bestOne=null,bestD=1e9;for(i=0;i<all.length;i++){if(all[i]===ss)continue;var q=(all[i].inPoint>=ss.inPoint)?mk(ss,all[i]):mk(all[i],ss);if(q&&q.gap<bestD){bestD=q.gap;bestOne=q;}}if(bestOne)return bestOne;}
    var near=null,nearD=1e9,t=c.time;for(i=0;i<all.length-1;i++){var r=mk(all[i],all[i+1]);if(!r)continue;var score=Math.abs(r.cut-t)+(r.gap*2);if(score<nearD){nearD=score;near=r;}}return near;
}
function EH_sjrRemoveOldHelpers(c,owner,cut){
    var kinds={SMOOTH_JAWS_BG:1,SMOOTH_JAWS_SIDE_BG:1,SMOOTH_JAWS_FRONT:1,SMOOTH_JAWS_REAR:1};
    for(var i=c.numLayers;i>=1;i--){try{var l=c.layer(i),k=EH_kind(l);if(!kinds[k])continue;if(EH_owner(l)===owner||Math.abs(((l.inPoint+l.outPoint)/2)-cut)<c.frameDuration*24)l.remove();}catch(e){}}
}
function EH_sjrLayerOpacity(layer,times,values){try{return EH_sjrSetKeys(layer.property('ADBE Transform Group').property('ADBE Opacity'),times,values);}catch(e){return false;}}
function EH_sjrRearTransform(layer,times,scaleRatios,rotVals){
    try{var tg=layer.property('ADBE Transform Group'),sc=tg.property('ADBE Scale'),rot=tg.property('ADBE Rotate Z');if(!rot)rot=tg.property('ADBE Rotation');var base=sc.value,vals=[];EH_clearKeys(sc);for(var i=0;i<scaleRatios.length;i++)vals.push([base[0]*scaleRatios[i]/100,base[1]*scaleRatios[i]/100]);EH_sjrSetKeys(sc,times,vals);if(rot&&rotVals)EH_sjrSetKeys(rot,times,rotVals);return true;}catch(e){return false;}
}
function EH_sjrDup(src,name,a,b,owner,kind,placeAbove){
    var d=null;try{d=src.duplicate();}catch(e){return null;}if(!d)return null;
    try{d.name=name;d.inPoint=Math.max(src.inPoint,a);d.outPoint=Math.min(src.outPoint,b);d.enabled=true;d.audioEnabled=false;EH_tagLayer(d,owner,kind);d.selected=false;}catch(e0){}
    try{if(placeAbove)d.moveBefore(src);else d.moveAfter(src);}catch(e1){}return d;
}
function EH_sjrSideMasks(layer,c,ratio){
    if(!layer||!c)return false;ratio=Math.max(.08,Math.min(.30,ratio||.20));
    try{
        var masks=layer.property('ADBE Mask Parade');if(!masks)return false;
        function addRect(name,x0,x1){
            var m=masks.addProperty('ADBE Mask Atom');m.name=name;
            var sh=new Shape();sh.vertices=[[x0,0],[x1,0],[x1,c.height],[x0,c.height]];
            sh.inTangents=[[0,0],[0,0],[0,0],[0,0]];sh.outTangents=[[0,0],[0,0],[0,0],[0,0]];sh.closed=true;
            m.property('ADBE Mask Shape').setValue(sh);try{m.maskMode=MaskMode.ADD;}catch(e0){}
        }
        addRect('Smooth Jaws LEFT SIDE',0,c.width*ratio);addRect('Smooth Jaws RIGHT SIDE',c.width*(1-ratio),c.width);return true;
    }catch(e){return false;}
}
function EH_sjrJawsSolid(c,name,a,b,owner,kind,target,above,sideOnly){
    var l=EH_makeSolid(c,name,a,b,[0,0,0],owner,kind);if(!l)return null;
    try{l.audioEnabled=false;l.enabled=true;}catch(e0){}
    if(sideOnly)EH_sjrSideMasks(l,c,.20);
    try{if(target){if(above)l.moveBefore(target);else l.moveAfter(target);}}catch(e1){}
    return l;
}
function EH_sjrTuneJawsEffect(effect,c,a,b,dirSign,phase){
    if(!effect||b<=a)return false;
    dirSign=(dirSign<0)?-1:1;phase=phase||'OUT';

    var completion=EH_findPropContains(effect,['completion']);
    var direction=EH_findPropContains(effect,['direction','rotation','rotate jaws','jaws rotation']);
    var center=EH_findPropContains(effect,['center']);
    var height=EH_findPropContains(effect,['height']);
    var width=EH_findPropContains(effect,['width']);
    var shape=EH_findPropContains(effect,['shape']);

    var mid=a+(b-a)*0.50,ok=false;
    if(completion)ok=EH_sjrSetKeys(completion,[a,mid,b],[100,70,100])||ok;
    if(direction){
        if(phase==='OUT')ok=EH_sjrSetKeys(direction,[a,mid,b],[0,dirSign*8.5,dirSign*29])||ok;
        else ok=EH_sjrSetKeys(direction,[a,mid,b],[-dirSign*17,-dirSign*8,0])||ok;
    }
    try{
        if(center&&c&&(center.propertyValueType===PropertyValueType.TwoD||center.propertyValueType===PropertyValueType.TwoD_SPATIAL))
            center.setValue([c.width/2,c.height/2]);
    }catch(e0){}
    try{if(height){EH_clearKeys(height);height.setValue(0.0);}}catch(e1){}
    try{if(width){EH_clearKeys(width);width.setValue(10.0);}}catch(e2){}
    // CC Jaws popup value 1 = Spikes. Keep it static, not animated.
    try{if(shape){EH_clearKeys(shape);shape.setValue(1);}}catch(e3){}
    EH_walkAnimated(effect,function(pp){EH_ease(pp);});
    return ok;
}
function EH_sjrApplyJaws(c,layer,preset,a,b,label,dirSign,phase){
    if(!layer||!preset||!preset.exists||b<=a)return false;
    var made=EH_applyPresetCaptureEffects(c,layer,preset,a,'[SMOOTH JAWS ROTATE '+label+']'),used=false;
    for(var i=0;i<made.length;i++){
        EH_retimeGroupKeysUniform(made[i],a,b);
        EH_sjrTuneJawsEffect(made[i],c,a,b,dirSign,phase);
        used=true;
    }
    EH_forceCenters(layer,c);return used;
}
function EH_sjrBuildSideStack(c,clip,phase,preset,a,turnStart,b,owner,dirSign){
    if(!clip||b<=a)return {bg:null,jaws:null,front:null,used:false};
    dirSign=(dirSign<0)?-1:1;
    // The reference has three depths: squeezed hero clip, dark full-frame ghost behind it,
    // and REAL BCC Jaws on solids visible mainly in the exposed side columns.
    var bg=EH_sjrDup(clip,'Smooth Jaws '+phase+' - GHOSTED SIDE FOOTAGE',a,b,owner,'SMOOTH_JAWS_SIDE_BG',false);
    var jaws=EH_sjrJawsSolid(c,'Smooth Jaws '+phase+' - BCC VERTICAL JAWS SIDES',a,b,owner,'SMOOTH_JAWS_REAR',clip,false,true);
    var front=EH_sjrJawsSolid(c,'Smooth Jaws '+phase+' - BLACK SOLID BCC JAWS FRONT',Math.max(a,turnStart),b,owner,'SMOOTH_JAWS_FRONT',clip,true,false);
    var used=false,mid=a+(b-a)*.55;
    if(bg){
        if(phase==='OUT'){EH_sjrLayerOpacity(bg,[a,mid,b],[42,60,78]);EH_sjrRearTransform(bg,[a,mid,b],[103,104.5,106],[0,dirSign*.35,dirSign*.8]);}
        else{EH_sjrLayerOpacity(bg,[a,mid,b],[78,60,42]);EH_sjrRearTransform(bg,[a,mid,b],[106,104.5,103],[dirSign*.8,dirSign*.35,0]);}
        EH_sjrBlur(bg,[a,mid,b],phase==='OUT'?[1.5,3.5,6.5]:[6.5,3.5,1.5]);
    }
    if(jaws){
        used=EH_sjrApplyJaws(c,jaws,preset,a,b,phase+' REAR SIDES',dirSign,phase)||used;
        if(phase==='OUT')EH_sjrLayerOpacity(jaws,[a,mid,turnStart,b],[0,22,85,100]);
        else EH_sjrLayerOpacity(jaws,[a,a+(b-a)*.24,mid,b],[100,92,38,0]);
        EH_sjrWarp(jaws,[a,mid,b],phase==='OUT'?[0,4,11]:[11,4,0]);
    }
    if(front){
        used=EH_sjrApplyJaws(c,front,preset,Math.max(a,turnStart),b,phase+' BLACK FRONT SOLID',dirSign,phase)||used;
        var fa=Math.max(a,turnStart),fm=(Math.max(a,turnStart)+b)/2;
        if(phase==='OUT')EH_sjrLayerOpacity(front,[fa,fm,b],[85,100,92]);
        else EH_sjrLayerOpacity(front,[fa,fm,b],[100,88,0]);
        EH_sjrBlur(front,[fa,fm,b],phase==='OUT'?[0,3,8]:[8,3,0]);
    }
    return {bg:bg,jaws:jaws,front:front,used:used};
}
function EH_sjrPairBlackJaws(c,out,inc,preset,a,cut,b,owner,dirSign){
    if(!c||!out||!inc||!preset||!preset.exists||b<=a)return {layer:null,used:false};
    // ONE literal comp-size BLACK solid ABOVE BOTH clips, spanning the whole transition.
    var solid=EH_sjrJawsSolid(c,'Smooth Jaws - BLACK SOLID BCC JAWS',a,b,owner,'SMOOTH_JAWS_FRONT',out,true,false);
    if(!solid)return {layer:null,used:false};
    try{solid.moveBefore(out);solid.moveBefore(inc);}catch(e0){}
    var made=EH_applyPresetCaptureEffects(c,solid,preset,a,'[SMOOTH JAWS ROTATE PAIR BLACK SOLID]'),used=false;
    for(var i=0;i<made.length;i++){
        var fx=made[i];try{fx.name='BCC Jaws - Pair Follow [VIRAL] [SMOOTH JAWS ROTATE]';}catch(en){}
        var completion=EH_findPropContains(fx,['completion']);
        var direction=EH_findPropContains(fx,['direction','rotation','rotate jaws','jaws rotation']);
        var center=EH_findPropContains(fx,['center']);
        var height=EH_findPropContains(fx,['height']);
        var width=EH_findPropContains(fx,['width']);
        var shape=EH_findPropContains(fx,['shape']);
        var pre=Math.max(a,cut-(cut-a)*.32),post=Math.min(b,cut+(b-cut)*.42);
        if(completion)EH_sjrSetKeys(completion,[a,pre,cut,post,b],[100,88,70,86,100]);
        if(direction)EH_sjrSetKeys(direction,[a,pre,cut,post,b],[0,dirSign*8.5,dirSign*29,-dirSign*17,0]);
        try{if(center)center.setValue([c.width/2,c.height/2]);}catch(ec){}
        try{if(height){EH_clearKeys(height);height.setValue(0.0);}}catch(eh){}
        try{if(width){EH_clearKeys(width);width.setValue(10.0);}}catch(ew){}
        try{if(shape){EH_clearKeys(shape);shape.setValue(1);}}catch(es){}
        EH_walkAnimated(fx,function(pp){EH_ease(pp);});used=true;
    }
    EH_sjrLayerOpacity(solid,[a,pre,cut,post,b],[85,91,100,94,85]);
    EH_forceCenters(solid,c);
    return {layer:solid,used:used};
}
function EH_sjrApplyPair(c,out,inc,direction,ownerSuffix){
    if(!c||!out||!inc)return {ok:false,jaws:false};
    if(out.inPoint>inc.inPoint){var swap=out;out=inc;inc=swap;}
    var fd=c.frameDuration,cut=(out.outPoint+inc.inPoint)/2;if(Math.abs(out.outPoint-inc.inPoint)>fd*6)return {ok:false,jaws:false};
    var dirSign=(String(direction||'left').toLowerCase()==='right')?1:-1;
    var owner=out.name+' -> '+inc.name+(ownerSuffix?(' '+ownerSuffix):'');
    EH_sjrRemoveTaggedEffects(out);EH_sjrRemoveTaggedEffects(inc);EH_sjrRemoveOldHelpers(c,owner,cut);

    // Frame-for-frame remaster from the supplied 30fps / 30-frame reference:
    // gradual squeeze for ~16 frames, visible warp starts on outgoing f18, hard cut after f19,
    // incoming f20 is the blur/whip frame, then ~10 frames of elastic recovery.
    // Adaptive timing for the short, fast clips Ethan normally edits with.
    // Keep the anticipation close to the cut (not half the clip), then give the incoming shot more room to breathe.
    var outAvail=Math.max(2,Math.floor((Math.min(out.outPoint,cut)-out.inPoint)/fd));
    var inAvail=Math.max(2,Math.floor((inc.outPoint-Math.max(inc.inPoint,cut))/fd));
    // Short-Clip Intelligence: do not cram a full Jaws rotation into physically tiny clips.
    // Use a compact eased skew/warp substitute instead, preserving the cut without chaos.
    if(outAvail<5 || inAvail<6){
        EH_applySmoothSkew(c,out,0,dirSign*5,Math.max(2,Math.min(4,outAvail)),'Short Clip Smart Out',true);
        EH_applySmoothSkew(c,inc,-dirSign*8,0,Math.max(3,Math.min(6,inAvail)),'Short Clip Smart In',true);
        return {ok:true,jaws:false,direction:(dirSign<0?'left':'right'),shortFallback:true};
    }
    var squeezeF=Math.max(5,Math.min(ETHAN_RUNTIME_SETTINGS.jawsOutFrames||8,Math.round(outAvail*.46)));
    var turnF=Math.max(3,Math.min(4,squeezeF-1));
    var settleF=Math.max(7,Math.min(ETHAN_RUNTIME_SETTINGS.jawsInFrames||13,inAvail));
    var oEnd=Math.min(out.outPoint-fd,cut-fd);if(oEnd<out.inPoint)oEnd=out.inPoint;
    var oStart=Math.max(out.inPoint,oEnd-fd*(squeezeF-1));
    var turnStart=Math.max(oStart,oEnd-fd*(turnF-1));
    var squeezeMid=oStart+Math.max(fd,Math.round(((turnStart-oStart)/fd)*.58)*fd);if(squeezeMid>=turnStart)squeezeMid=Math.max(oStart,turnStart-fd);
    var ot=[oStart,squeezeMid,turnStart,oEnd];
    EH_sjrTransformWH(out,ot,[0,dirSign*.8,dirSign*7.5,dirSign*29],[100,91,76,69],[100,100,102,111]);
    // Skew starts ONLY near the cut so the first clip does not lean too early.
    EH_applySmoothSkew(c,out,0,dirSign*8.5,Math.max(3,turnF+1),'Smooth Jaws Outgoing Late Skew',true);
    var warpStart=Math.max(oStart,turnStart-fd);
    EH_sjrWarp(out,[warpStart,turnStart,oEnd],[0,6,22]);
    EH_sjrWave(out,[warpStart,turnStart,oEnd],[0,(-dirSign)*1.8,(-dirSign)*5.8]);
    EH_sjrLens(out,[warpStart,turnStart,oEnd],[0,5.5,10]);
    EH_sjrBlur(out,[warpStart,turnStart,oEnd],[0,4,18]);

    var iStart=Math.max(inc.inPoint,cut),iEnd=Math.min(inc.outPoint-fd,iStart+fd*(settleF-1));if(iEnd<iStart+fd)iEnd=Math.min(inc.outPoint,iStart+fd);
    var iSpan=Math.max(fd,iEnd-iStart);
    var it=[iStart,Math.min(iEnd,iStart+fd),Math.min(iEnd,iStart+fd*3),Math.min(iEnd,iStart+fd*6),iEnd];
    // Remove duplicate timestamps in very short clips.
    var cleanT=[],cleanR=[],cleanW=[],cleanH=[],baseR=[17,10,-2.4,.8,0],baseW=[71,77,87,97,100],baseH=[110,108,103,101,100];
    for(var ti=0;ti<it.length;ti++)if(!cleanT.length||it[ti]>cleanT[cleanT.length-1]+fd*.1){cleanT.push(it[ti]);cleanR.push(baseR[ti]*(-dirSign));cleanW.push(baseW[ti]);cleanH.push(baseH[ti]);}
    EH_sjrTransformWH(inc,cleanT,cleanR,cleanW,cleanH);
    var amt=[21,15,7,2,0],wav=[5.8,4,2,.6,0],lens=[10,7,3.5,.8,0],blur=[19,13,6,1.5,0],a2=[],w2=[],l2=[],b2=[];
    for(var av=0;av<cleanT.length;av++){a2.push(amt[av]);w2.push(wav[av]*(-dirSign));l2.push(lens[av]);b2.push(blur[av]);}
    EH_sjrWarp(inc,cleanT,a2);EH_sjrWave(inc,cleanT,w2);EH_sjrLens(inc,cleanT,l2);EH_sjrBlur(inc,cleanT,b2);
    EH_applySmoothSkew(c,inc,-15.0,0.0,Math.min(ETHAN_RUNTIME_SETTINGS.jawsInFrames||13,Math.max(7,settleF)),'Smooth Jaws Incoming Skew',true);

    var preset=EH_findPreset(['tattooedhe8rt','jaws','vertical']);
    // Literal black BCC/CC Jaws solid above BOTH clips, following the same left/right rotate.
    var pairJaws=EH_sjrPairBlackJaws(c,out,inc,preset,oStart,cut,Math.min(inc.outPoint,iEnd+fd),owner,dirSign);
    var outStack=EH_sjrBuildSideStack(c,out,'OUT',preset,oStart,turnStart,Math.min(out.outPoint,cut),owner,dirSign);
    var inEndSafe=Math.min(inc.outPoint,iEnd+fd);
    var inStack=EH_sjrBuildSideStack(c,inc,'IN',preset,iStart,iStart,inEndSafe,owner,dirSign);
    return {ok:true,jaws:!!((pairJaws&&pairJaws.used)||(outStack&&outStack.used)||(inStack&&inStack.used)),direction:(dirSign<0?'left':'right')};
}
function EH_applyViralSmoothJawsPattern(c,pieces){
    var count=0,jawsCount=0,dir='left',r;
    if(!pieces||pieces.length<2)return {count:0,jaws:0};
    // Transition #1 is ALWAYS Intro -> Beat Drop, rotating LEFT.
    r=EH_sjrApplyPair(c,pieces[0],pieces[1],dir,'[VIRAL AUTO #1]');if(r.ok){count++;if(r.jaws)jawsCount++;}
    // Then pair every 12th + 13th visual clip by default: 12->13, 24->25, 36->37... Alternating direction each time. This intentionally leaves more clean clips between rotations.
    var pairNo=2,step=Math.max(2,Math.round(ETHAN_RUNTIME_SETTINGS.jawsEvery||8));for(var start=step-1;start+1<pieces.length;start+=step){
        dir=(dir==='left')?'right':'left';
        r=EH_sjrApplyPair(c,pieces[start],pieces[start+1],dir,'[VIRAL AUTO #'+pairNo+']');
        if(r.ok){count++;if(r.jaws)jawsCount++;}pairNo++;
    }
    return {count:count,jaws:jawsCount};
}
function EthanHub_smoothJawsRotate(){
    try{
        var c=EH_comp(),pair=EH_sjrPair(c);if(!pair)return 'Select the TWO split clips touching the cut, or park the playhead on the cut first.';
        var fd=c.frameDuration;if(pair.gap>fd*6)return 'Those clips are too far apart. Select the two clips that actually touch the cut.';
        app.beginUndoGroup('Smooth Jaws Rotate - Frame Matched V5');
        var r=EH_sjrApplyPair(c,pair.outgoing,pair.incoming,'left','[MANUAL]');
        EH_clearSel(c);try{pair.outgoing.selected=true;pair.incoming.selected=true;}catch(es){}
        app.endUndoGroup();
        return r.ok?('✅ Smooth Jaws Rotate V5 applied LEFT across both selected clips: slower adaptive squeeze/rear ghost, REAL black-solid BCC Vertical Jaws with Completion 100→70→100, Height 0, Width 10, Spikes, direction following the rotate, plus a -15→0 incoming skew and a 10-frame elastic rebound.'):('Could not build Smooth Jaws Rotate on that pair.');
    }catch(e){try{app.endUndoGroup();}catch(x){}return 'ERROR: '+e.toString();}
}

// ============================================================
// AE SNOW — ORIGINAL ETHAN VALUES, CURRENT-EFFECT REBUILD
// The legacy .ffx contains an old Particle World serialization that can trigger AE 2:7.
// We decoded the authored values from that exact file and apply them by property name to the
// current CC Particle World instance, preserving the original look without loading broken data.
// ============================================================
function EH_removeSnowLayers(c){
    for(var i=c.numLayers;i>=1;i--){
        try{
            var l=c.layer(i),nm=EH_low(l.name),k=EH_kind(l);
            if(k==='SNOW'||nm==='ae snow overlay'||nm.indexOf('ae snow particles')>=0)l.remove();
        }catch(e){}
    }
}
function EH_buildOriginalSnowEffects(snow){
    // These values were decoded directly from Ethan's ORIGINAL bundled
    // "AE Snow Particles Preset(2).ffx". Rebuilding the current CC Particle World instance by
    // property name avoids the old serialized-parameter incompatibility that triggers AE error 2:7,
    // while preserving the original visual settings instead of substituting a different snow recipe.
    var pw=EH_addEffect(snow,['CC Particle World','CC Particle World']);
    if(!pw)return false;
    try{pw.name='CC Particle World [ORIGINAL ETHAN SNOW - REPAIRED]';}catch(en){}
    EH_setAny(pw,['Birth Rate'],0.45);
    EH_setAny(pw,['Longevity (sec)','Longevity'],1.00);
    EH_setAny(pw,['Position X'],0.0);EH_setAny(pw,['Position Y'],0.0);EH_setAny(pw,['Position Z'],0.0);
    EH_setAny(pw,['Radius X'],4.11);EH_setAny(pw,['Radius Y'],5.16);EH_setAny(pw,['Radius Z'],6.18);
    EH_setAny(pw,['Animation'],9);
    EH_setAny(pw,['Velocity'],1.00);EH_setAny(pw,['Inherit Velocity %'],0.0);EH_setAny(pw,['Gravity'],0.50);EH_setAny(pw,['Resistance'],0.0);
    EH_setAny(pw,['Extra'],0.50);EH_setAny(pw,['Extra Angle'],360.0);
    EH_setAny(pw,['Direction Axis'],0);EH_setAny(pw,['Axis X'],0.0);EH_setAny(pw,['Axis Y'],-1.0);EH_setAny(pw,['Axis Z'],0.0);
    EH_setAny(pw,['Gravity X'],0.0);EH_setAny(pw,['Gravity Y'],1.0);EH_setAny(pw,['Gravity Z'],0.0);
    EH_setAny(pw,['Particle Type'],5);
    EH_setAny(pw,['Rotation Speed'],180.0);EH_setAny(pw,['Initial Rotation'],360.0);EH_setAny(pw,['Rotation Axis'],4);
    EH_setAny(pw,['Birth Size'],0.25);EH_setAny(pw,['Death Size'],0.25);EH_setAny(pw,['Size Variation'],50.0);EH_setAny(pw,['Max Opacity'],75.0);
    EH_setAny(pw,['Color Map'],2);EH_setAny(pw,['Birth Color'],[1,1,1]);EH_setAny(pw,['Death Color'],[1,1,1]);
    EH_setAny(pw,['Transfer Mode'],1);
    EH_setAny(pw,['Effect Camera'],0);EH_setAny(pw,['Distance'],1.0);EH_setAny(pw,['Rotation X'],0.0);EH_setAny(pw,['Rotation Y'],0.0);EH_setAny(pw,['Rotation Z'],0.0);EH_setAny(pw,['FOV'],45.0);
    EH_setAny(pw,['Hold Particle Release'],0);EH_setAny(pw,['Composite With Original'],0);EH_setAny(pw,['Random Seed'],0);

    // Original preset also carried Deep Glow. Match its visible authored values when the plugin exists;
    // if it is not installed, the snow itself still works and no error dialog is thrown.
    var dg=EH_addEffect(snow,['PEDG','Deep Glow']);
    if(dg){
        try{dg.name='Deep Glow [ORIGINAL ETHAN SNOW - REPAIRED]';}catch(edg){}
        EH_setAny(dg,['Radius'],500.0);EH_setAny(dg,['Exposure'],0.30);EH_setAny(dg,['Threshold'],0.0);EH_setAny(dg,['Threshold Smooth'],0.0);
        EH_setAny(dg,['Blend Mode'],1);EH_setAny(dg,['Smooth Blending'],0);EH_setAny(dg,['Spread'],33.0);
        EH_setAny(dg,['Auto Detect Gamma'],1);EH_setAny(dg,['Aspect Ratio'],1.0);EH_setAny(dg,['Enable Angle'],0);
        EH_setAny(dg,['Chromatic Aberration'],0);EH_setAny(dg,['Amount'],0.25);EH_setAny(dg,['Mix'],100.0);
        EH_setAny(dg,['Downsample'],80.0);EH_setAny(dg,['Steps Multiplier'],1.0);EH_setAny(dg,['Auto Iterations'],1);EH_setAny(dg,['Glow Iterations'],6.0);
        EH_setAny(dg,['Buffer Expansion'],1);EH_setAny(dg,['Enable Dither'],1);EH_setAny(dg,['Monochromatic'],0);
        EH_setAny(dg,['Source Opacity'],100.0);EH_setAny(dg,['Unmult'],1);EH_setAny(dg,['Edge Behaviour'],2);
    }
    return true;
}
function EH_addOriginalSnowLayer(c,replaceExisting){
    if(replaceExisting)EH_removeSnowLayers(c);
    var snow=EH_makeSolid(c,'Ae Snow Overlay',0,c.duration,[0,0,0],'GLOBAL','SNOW');
    if(!EH_buildOriginalSnowEffects(snow)){try{snow.remove();}catch(er){}return null;}
    try{snow.blendingMode=BlendingMode.LIGHTEN;snow.audioEnabled=false;snow.enabled=true;snow.moveToBeginning();}catch(e0){}
    return snow;
}
function EthanHub_addFixedSnow(){
    try{
        var c=EH_comp();app.beginUndoGroup('AE Snow Particles - Original Settings Repaired');
        var snow=EH_addOriginalSnowLayer(c,true);
        EH_clearSel(c);if(snow)try{snow.selected=true;}catch(es){}
        app.endUndoGroup();
        return snow?'✅ AE Snow restored with the ORIGINAL .ffx values rebuilt on the current Particle World effect — no legacy preset serialization, so the 2:7 defaults warning is bypassed.':'Could not build CC Particle World for the snow layer.';
    }catch(e){try{app.endUndoGroup();}catch(x){}return 'ERROR: '+e.toString();}
}
function EH_globalFinish(c){
    var flick=EH_makeAdjustment(c,'Jamesmaximoffs Flicker x2',0,c.duration,'GLOBAL','FLICKER');try{flick.property('ADBE Transform Group').property('ADBE Opacity').setValue(75);}catch(e){}var fp=EH_findPreset(['jamesmaximoffs','flicker']);if(fp){EH_applyPreset(c,flick,fp,0,true);EH_applyPreset(c,flick,fp,0,true);}
    var snow=EH_addOriginalSnowLayer(c,true);
    return [snow,flick];
}

function EH_isEditAudioLayer(l){
    try{return EH_kind(l)==='EDIT_AUDIO'||EH_low(l.name)==="ethan\'s edit audio"||EH_low(l.name)==="edit audio";}catch(e){return false;}
}
function EH_isAudioOnlyBed(l,c){
    try{
        if(!(l instanceof AVLayer)||l.adjustmentLayer||EH_isText(l))return false;
        if(!(l.audioEnabled===true&&l.enabled===false))return false;
        if(EH_isEditAudioLayer(l))return true;
        var fd=c.frameDuration;
        return l.inPoint<=fd*1.5&&l.outPoint>=c.duration-fd*1.5;
    }catch(e){return false;}
}
function EH_existingEditAudio(c){
    var keep=null,extras=[],i,l;
    // Detect old broken copies even when a previous build failed to rename them: an eye-OFF/audio-ON
    // full-comp layer is an audio bed structurally, regardless of its displayed layer name.
    for(i=c.numLayers;i>=1;i--){
        try{l=c.layer(i);if(EH_isEditAudioLayer(l)||EH_isAudioOnlyBed(l,c)){if(!keep)keep=l;else extras.push(l);}}catch(e){}
    }
    for(i=0;i<extras.length;i++)try{extras[i].remove();}catch(e2){}
    if(keep){try{keep.name="ethan\'s edit audio";}catch(en){}EH_tagLayer(keep,'GLOBAL','EDIT_AUDIO');}
    return keep;
}
function EH_purgeExtraAudioBeds(c,keep){
    for(var i=c.numLayers;i>=1;i--){
        try{var l=c.layer(i);if(l!==keep&&(EH_isEditAudioLayer(l)||EH_isAudioOnlyBed(l,c)))l.remove();}catch(e){}
    }
}
function EH_forceEditAudioState(c,audio,pieces){
    if(!audio)return false;
    try{audio.name="ethan\'s edit audio";}catch(e0){}
    try{audio.enabled=false;}catch(e1){}
    try{audio.audioEnabled=true;}catch(e2){}
    try{audio.inPoint=0;audio.outPoint=c.duration;}catch(e3){}
    EH_tagLayer(audio,'GLOBAL','EDIT_AUDIO');
    try{audio.moveToEnd();}catch(e4){}
    try{audio.name="ethan\'s edit audio";}catch(e5){}
    for(var i=0;i<pieces.length;i++)try{
        if(pieces[i]===audio)continue;
        pieces[i].enabled=true;
        pieces[i].audioEnabled=false;
    }catch(e6){}
    EH_purgeExtraAudioBeds(c,audio);
    try{audio.moveToEnd();audio.name="ethan\'s edit audio";audio.enabled=false;audio.audioEnabled=true;}catch(e7){}
    return EH_low(audio.name)==="ethan\'s edit audio"&&audio.audioEnabled===true&&audio.enabled===false;
}
function EH_audioSetup(c,pieces){
    if(!pieces.length)return null;
    pieces.sort(function(a,b){if(a.inPoint<b.inPoint)return -1;if(a.inPoint>b.inPoint)return 1;return a.index-b.index;});

    var audio=EH_existingEditAudio(c),visualIntro=null;
    if(!audio){
        // Original deepest layer at the earliest visual in-point becomes the audio bed.
        var firstIn=pieces[0].inPoint,originalIntro=pieces[0],introIndex=0,fd=c.frameDuration;
        for(var i=0;i<pieces.length;i++){
            try{if(Math.abs(pieces[i].inPoint-firstIn)<=fd*.5&&pieces[i].index>originalIntro.index){originalIntro=pieces[i];introIndex=i;}}catch(e0){}
        }
        try{
            // ONE duplicate only: this is the visual Intro that stays in the edit.
            visualIntro=originalIntro.duplicate();
            visualIntro.name='Intro';
            visualIntro.inPoint=originalIntro.inPoint;
            visualIntro.outPoint=originalIntro.outPoint;
            visualIntro.enabled=true;
            visualIntro.audioEnabled=false;
            EH_markClip(visualIntro,'VIRAL_VISUAL_INTRO');
            audio=originalIntro;
            pieces[introIndex]=visualIntro;
        }catch(e1){try{if(visualIntro)visualIntro.remove();}catch(er){}return null;}
    }else{
        // Existing correctly-shaped audio bed: reuse it, do NOT duplicate Intro again.
        try{if(pieces.length)pieces[0].name='Intro';}catch(e2){}
    }

    if(!EH_forceEditAudioState(c,audio,pieces))return null;
    pieces.sort(function(a,b){if(a.inPoint<b.inPoint)return -1;if(a.inPoint>b.inPoint)return 1;return a.index-b.index;});
    EH_clearSel(c);
    for(var p=0;p<pieces.length;p++)try{pieces[p].enabled=true;pieces[p].audioEnabled=false;pieces[p].selected=true;}catch(e3){}
    try{audio.selected=false;}catch(e4){}
    EH_forceEditAudioState(c,audio,pieces);
    return audio;
}

function EH_isViralPrecomp(layer){
    try{return String(layer.comment||'').indexOf('EHPRECOMP')>=0;}catch(e){return false;}
}
function EH_precompOneVisual(c,layer,name){
    if(!layer)return null;
    if(EH_isViralPrecomp(layer)){try{layer.name=name;}catch(e0){}return layer;}
    var ip=layer.inPoint,op=layer.outPoint,pc=null,parent=null,idx=layer.index;
    try{pc=c.layers.precompose([idx],name+' PRECOMP',true);}catch(e){return layer;}
    if(pc){
        for(var i=1;i<=c.numLayers;i++)try{if(c.layer(i).source===pc){parent=c.layer(i);break;}}catch(e2){}
    }
    if(!parent)return layer;
    try{parent.name=name;parent.inPoint=ip;parent.outPoint=op;parent.enabled=true;parent.audioEnabled=false;}catch(e3){}
    EH_markClip(parent,'EHPRECOMP');
    return parent;
}
function EH_precompVisualClips(c,pieces){
    var out=[],i;
    // Go from bottom of the chronological list upward so indexes changing during precompose do not scramble later clips.
    for(i=pieces.length-1;i>=0;i--)out[i]=EH_precompOneVisual(c,pieces[i],pieces[i].name);
    out.sort(function(a,b){return a.inPoint-b.inPoint;});
    EH_nameClips(out);
    return out;
}
// Final Viral cleanup: keep the main comp clean without breaking adjustment layers.
// We precompose the helper layers TOGETHER WITH their edited clip-precomps, so Halftone/Cross Glitch/
// saturation adjustments still have footage underneath them. ethan\'s edit audio and live text stay outside.
function EH_precompViralEverything(c,pieces){
    var idx=[],seen={},i,l,include;
    for(i=1;i<=c.numLayers;i++){
        l=c.layer(i);include=false;
        try{
            if(EH_isText(l))continue;
            if(EH_kind(l)==='EDIT_AUDIO'||EH_low(l.name)==="ethan\'s edit audio"||EH_low(l.name)==="edit audio")continue;
            if(EH_isViralPrecomp(l))include=true;
            if(String(l.comment||'').indexOf(ETHAN_VIRAL_PREFIX)===0)include=true;
        }catch(e0){}
        if(include&&!seen[l.index]){seen[l.index]=true;idx.push(l.index);}
    }
    if(!idx.length)return null;
    idx.sort(function(a,b){return a-b;});
    var pc=null,parent=null;
    try{pc=c.layers.precompose(idx,'everything',true);}catch(e1){return null;}
    if(pc){
        try{pc.duration=c.duration;pc.displayStartTime=c.displayStartTime;}catch(e2){}
        for(i=1;i<=c.numLayers;i++)try{if(c.layer(i).source===pc){parent=c.layer(i);break;}}catch(e3){}
    }
    if(parent){
        try{parent.name='everything';parent.inPoint=0;parent.outPoint=c.duration;parent.enabled=true;parent.audioEnabled=false;parent.label=13;}catch(e4){}
        try{parent.comment='EHPRECOMP|EVERYTHING';}catch(e5){}
        // Keep every live text layer ABOVE the opaque visual precomp. Moving text top-to-bottom
        // preserves the user's existing text order while guaranteeing the edit stack cannot cover it.
        try{
            var texts=[];
            for(i=1;i<=c.numLayers;i++)if(EH_isText(c.layer(i)))texts.push(c.layer(i));
            for(i=0;i<texts.length;i++)texts[i].moveBefore(parent);
        }catch(e6){}
    }
    return parent;
}
function EH_projectItemForFile(f){
    if(!f||!f.exists)return null;for(var i=1;i<=app.project.numItems;i++){var it=app.project.item(i),ff=null;try{ff=it.file;}catch(e){}try{if(ff&&ff.fsName===f.fsName)return it;}catch(e2){}}return null;
}
function EH_hasEffectNamed(layer,needle){
    var fx=EH_fx(layer);if(!fx)return null;needle=EH_low(needle);
    for(var i=1;i<=fx.numProperties;i++){var p=fx.property(i),nm='';try{nm=EH_low(p.name);}catch(e){}if(nm.indexOf(needle)>=0)return p;}
    return null;
}
function EH_watermarkColorControls(layer){
    var a=EH_hasEffectNamed(layer,'watermark color - change to color');
    if(!a){a=EH_addEffect(layer,['ADBE Change To Color','Change to Color']);if(a){try{a.name='Watermark Color - Change to Color';}catch(e0){}try{a.enabled=false;}catch(e1){}}}
    var b=EH_hasEffectNamed(layer,'watermark color - change color');
    if(!b){b=EH_addEffect(layer,['ADBE Change Color','Change Color']);if(b){try{b.name='Watermark Color - Change Color';}catch(e2){}try{b.enabled=false;}catch(e3){}}}
    return !!(a||b);
}
function EH_placeWatermarkUnderSnow(c,l){
    if(!c||!l)return;
    var snow=null;
    for(var i=1;i<=c.numLayers;i++){
        try{if(EH_kind(c.layer(i))==='SNOW'||EH_low(c.layer(i).name).indexOf('ae snow')>=0){snow=c.layer(i);break;}}catch(e0){}
    }
    try{
        if(snow){snow.moveToBeginning();l.moveAfter(snow);}
        else l.moveToBeginning();
    }catch(e1){}
}
function EH_fixWatermarkLayer(c,l,editStart){
    if(!l)return false;var src=null;try{src=l.source;}catch(e0){}
    try{l.name='Ethan Watermark';l.enabled=true;l.audioEnabled=false;}catch(e1){}
    // END-LOCKED WATERMARK: the final frame of the watermark source lands on the final frame of the comp.
    // 100% stretch preserves the source's true speed. If the comp is shorter than the source, only the
    // beginning is cropped; the watermark END still touches the comp END exactly.
    try{l.stretch=100;}catch(e2){}
    try{
        var srcDur=(src&&src.duration&&src.duration>0)?src.duration:c.frameDuration;
        var a=c.duration-srcDur;
        l.startTime=a;
        l.inPoint=Math.max(0,a);
        l.outPoint=c.duration;
    }catch(e3){}
    try{
        var tr=l.property('ADBE Transform Group');
        tr.property('ADBE Position').setValue([c.width/2,c.height/2]);
        // HEIGHT ONLY: intentionally ignore comp width so the watermark may overflow horizontally.
        var sh=(src&&src.height)?src.height:1,sc=(c.height/sh)*100;
        tr.property('ADBE Scale').setValue([sc,sc]);
    }catch(e5){}
    // LIGHTEN is reapplied every time this fixer runs.
    try{l.blendingMode=BlendingMode.LIGHTEN;}catch(e6){}
    EH_watermarkColorControls(l);
    EH_placeWatermarkUnderSnow(c,l);
    return true;
}
function EH_addWatermark(c,firstClip){
    try{
        var f=new File(ETHAN_HUB_EXT+'/assets/4K 120 FPS WATERMARK ETHAN.mp4');if(!f.exists)return false;
        var item=EH_projectItemForFile(f);if(!item){var io=new ImportOptions(f);item=app.project.importFile(io);}
        var l=c.layers.add(item),a=0;
        try{if(firstClip)a=firstClip.inPoint;}catch(e0){}
        EH_tagLayer(l,firstClip?firstClip.name:'GLOBAL','WATERMARK');
        EH_fixWatermarkLayer(c,l);
        return true;
    }catch(e){return false;}
}
function EthanHub_fixWatermark(){
    try{
        var c=EH_comp(),n=0;EH_clearSel(c);
        for(var i=1;i<=c.numLayers;i++){
            var l=c.layer(i),k=EH_kind(l),nm=EH_low(l.name);
            if(k==='WATERMARK'||nm.indexOf('ethan watermark')>=0){if(EH_fixWatermarkLayer(c,l))n++;try{l.selected=true;}catch(es){}}
        }
        return n?'Fixed + selected '+n+' watermark layer(s): watermark END locked to comp END at 100% speed, LIGHTEN, and stacked directly under AE Snow.':'No Ethan Watermark layer found.';
    }catch(e){return 'ERROR: '+e.toString();}
}
function EthanHub_watermarkColorMode(mode){
    try{
        var c=EH_comp(),n=0;mode=EH_low(mode||'off');
        for(var i=1;i<=c.numLayers;i++){
            var l=c.layer(i),k=EH_kind(l),nm=EH_low(l.name);
            if(k!=='WATERMARK'&&nm.indexOf('ethan watermark')<0)continue;
            EH_watermarkColorControls(l);
            var a=EH_hasEffectNamed(l,'watermark color - change to color');
            var b=EH_hasEffectNamed(l,'watermark color - change color');
            try{if(a)a.enabled=(mode==='change to color'||mode==='change_to_color');}catch(e0){}
            try{if(b)b.enabled=(mode==='change color'||mode==='change_color');}catch(e1){}
            if(mode==='off'){try{if(a)a.enabled=false;}catch(e2){}try{if(b)b.enabled=false;}catch(e3){}}
            n++;
        }
        return n?('Watermark recolor mode: '+mode+' on '+n+' layer(s). Open Effect Controls to choose the exact color.'):'No Ethan Watermark layer found.';
    }catch(e){return 'ERROR: '+e.toString();}
}
function EH_layersOfKinds(c,kinds){
    var out=[];for(var i=1;i<=c.numLayers;i++){var l=c.layer(i),k=EH_kind(l);for(var j=0;j<kinds.length;j++)if(k===kinds[j]){out.push(l);break;}}out.sort(function(a,b){if(a.inPoint<b.inPoint)return -1;if(a.inPoint>b.inPoint)return 1;return a.index-b.index;});return out;
}
function EH_stackAfter(anchor,layers){for(var i=0;i<layers.length;i++){try{layers[i].moveAfter(anchor);anchor=layers[i];}catch(e){}}return anchor;}
function EH_findOwnerKind(c,owner,kind){for(var i=1;i<=c.numLayers;i++){var l=c.layer(i);if(EH_kind(l)===kind&&EH_owner(l)===owner)return l;}return null;}
function EH_orderTimeline(c,pieces){
    var snow=EH_layersOfKinds(c,['SNOW']),watermark=EH_layersOfKinds(c,['WATERMARK']),jaws=EH_layersOfKinds(c,['JAWS_VERTICAL','JAWS_HORIZONTAL','SMOOTH_JAWS_BG','SMOOTH_JAWS_SIDE_BG','SMOOTH_JAWS_REAR','SMOOTH_JAWS_FRONT']),flashes=EH_layersOfKinds(c,['FLASH','BLACK_FLASH_2']),flick=EH_layersOfKinds(c,['FLICKER']),trans=EH_layersOfKinds(c,['HALFTONE','CROSS_GLITCH','SATURATION','EXPOSURE']);
    var anchor=null;if(snow.length){try{snow[0].moveToBeginning();anchor=snow[0];}catch(e){}}
    if(!anchor&&c.numLayers)anchor=c.layer(1);if(anchor){anchor=EH_stackAfter(anchor,watermark);anchor=EH_stackAfter(anchor,jaws);anchor=EH_stackAfter(anchor,flashes);anchor=EH_stackAfter(anchor,flick);anchor=EH_stackAfter(anchor,trans);}
    // Clip-local helpers are deliberately restored LAST. Ripple must touch the clip with no layer between it and the footage.
    for(var i=0;i<pieces.length;i++){
        var clip=pieces[i],r=EH_findOwnerKind(c,clip.name,'RIPPLE'),b=EH_findOwnerKind(c,clip.name,'BLUR');
        if(r){try{r.moveBefore(clip);}catch(er){}if(b)try{b.moveBefore(r);}catch(eb){}}
        else if(b)try{b.moveBefore(clip);}catch(eb2){}
    }
}
function EH_rainbow(c){var labs=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];for(var i=1;i<=c.numLayers;i++)try{c.layer(i).label=labs[(i-1)%labs.length];}catch(e){}}
function EH_backup(c){var d=c.duplicate(),dt=new Date();try{d.name=c.name+' - VIRAL BACKUP '+('0'+dt.getHours()).slice(-2)+('0'+dt.getMinutes()).slice(-2);}catch(e){}return d;}
function EthanHub_selectAllSplitClips(){
    try{
        var c=EH_comp(),a=EH_allClips(c);EH_clearSel(c);
        for(var i=0;i<a.length;i++)try{a[i].selected=true;}catch(es){}
        return 'Selected '+a.length+' VISUAL split clip(s), including Intro. ethan\'s edit audio / audio-only layers are excluded automatically.';
    }catch(e){return 'ERROR: '+e.toString();}
}
function EthanHub_viralEdit(forceResolution,resolutionLabel,backupFirst){
    try{
        var c=EH_comp();app.beginUndoGroup("Ethan's Viral Edit");if(backupFirst)EH_backup(c);
        var pieces=EH_selectedClips(c);if(pieces.length<2)pieces=EH_allClips(c);if(pieces.length<2)throw new Error('Viral Edit needs at least 2 manually split VISUAL clips. Make your cuts first; selection is optional because Viral Edit now auto-grabs all visual split clips.');
        pieces.sort(function(a,b){return a.inPoint-b.inPoint;});
        // Build the single full-length audio layer BEFORE naming/precomping visual clips.
        // Naming happens AFTER routing so the source audio can never be renamed back to Intro.
        // EH_audioSetup mutates pieces[0] so the original Intro becomes ethan\'s edit audio and a DUPLICATED Intro
        // becomes the visual clip that receives the edit. ethan\'s edit audio can never shift the clip order again.
        var editAudio=EH_audioSetup(c,pieces);
        if(!editAudio)throw new Error('Could not prepare exactly one Intro/ethan\'s edit audio route safely.');
        pieces.sort(function(a,b){return a.inPoint-b.inPoint;});EH_nameClips(pieces);
        // Re-assert the audio name AFTER visual naming. This is the guard that prevents the old Intro-name bug.
        if(!EH_forceEditAudioState(c,editAudio,pieces))throw new Error('ethan\'s edit audio could not be locked/renamed correctly.');
        // Restore Ethan's voice-style reverb treatment on the dedicated full-length edit audio.
        EH_ensureViralReverb(editAudio);
        // Each visual split becomes its own clean precomp, then all direct clip effects live on that parent precomp layer.
        pieces=EH_precompVisualClips(c,pieces);
        if(forceResolution)EH_fixResolution(c,resolutionLabel);
        for(var cc=0;cc<pieces.length;cc++){
            EH_bestMotionOn(c,pieces[cc]);
            if(forceResolution)try{pieces[cc].property('ADBE Transform Group').property('ADBE Position').setValue([c.width/2,c.height/2]);}catch(ep){}
        }
        // Bring back the original one-click foundation that got lost in later Premium builds.
        EH_restoreOriginalFullEditStack(c,pieces);
        EH_beatDropSpecial(c,pieces[1]);
        var crossMissing=false;
        for(var i=1;i<pieces.length;i++){
            EH_flash(c,pieces[i]);EH_saturation(c,pieces[i]);EH_blur(c,pieces[i]);var num=i-1;
            if(num>0&&num%9===0)EH_horizontalJaws(c,pieces[i]);
            if(num>0&&num%4===0){if(((num/4)%2)===1)EH_halftone(c,pieces[i]);else if(!EH_crossGlitch(c,pieces[i]))crossMissing=true;}
        }
        EH_choreograph(c,pieces);
        // Frame-matched Smooth Jaws Rotate is part of Viral Edit: Intro->Beat Drop, then every 12th+13th visual pair by default (12->13, 24->25, etc.).
        // Direction alternates LEFT / RIGHT / LEFT / RIGHT. Both clips in every pair receive the squeeze/warp stack,
        // with REAL BCC Vertical Jaws solids behind/around the exposed side gaps.
        var sjrAuto=EH_applyViralSmoothJawsPattern(c,pieces);
        // Apply the single 4th-from-end exception AFTER zooms + Halftone exist, before timeline/precomp cleanup.
        EH_fixFourthFromEndViralClip(c,pieces);
        EH_globalFinish(c);EH_addWatermark(c,pieces[0]);EH_orderTimeline(c,pieces);EH_rainbow(c);
        // Generated visual layers stay visible and silent. ethan\'s edit audio is the only generated audio layer left audible.
        for(var li=1;li<=c.numLayers;li++){var L=c.layer(li),k=EH_kind(L);if(k&&k!=='EDIT_AUDIO')try{L.enabled=true;L.audioEnabled=false;}catch(ea){}}
        // Collapse the complete Viral visual stack into ONE clean 'everything' precomp. Including the edited
        // clip-precomps is intentional: adjustment helpers would stop affecting footage if precomped alone.
        var everything=EH_precompViralEverything(c,pieces);
        // Final hard guarantee after precompose/index changes: ONE top-level ethan\'s edit audio, at the bottom,
        // eye OFF / sound ON / full comp. This catches the exact duplicate-audio/name regression Ethan saw.
        EH_forceEditAudioState(c,editAudio,pieces);
        EH_clearSel(c);
        if(everything)try{everything.selected=true;}catch(es0){}
        else for(var s=0;s<pieces.length;s++)try{pieces[s].selected=true;}catch(es){}
        app.endUndoGroup();return '✅ Viral Edit finished on '+pieces.length+' VISUAL clips INCLUDING Intro. Smooth Jaws Rotate auto-pairs: '+(sjrAuto?sjrAuto.count:0)+' (real BCC Jaws active on '+(sjrAuto?sjrAuto.jaws:0)+'). Intro->Beat Drop starts LEFT; each spaced 12th+13th pair alternates RIGHT/LEFT after that. Original Pan Left + Super-calm Shake + 4-frame Black Flash 2 + Exposure -5→+1.77→0 are restored on every visual clip. Every 8th Split Clip also receives a subtle Easy-Eased Smooth Skew. Edge Rays brightness pulses 0→0.97→0 with Easy Ease. Original Intro -> full-comp ethan\'s edit audio (eye OFF / audio ON); duplicated Intro -> visual Intro and was edited with every other split clip. ethan\'s edit audio was excluded from all visual effects. The complete helper stack is organized inside the selected EVERYTHING precomp; ethan\'s edit audio and live text stay outside. Auto-splitting: OFF; auto-select visual split clips: ON. Resolution forced: '+(forceResolution?resolutionLabel:'NO')+'.'+(crossMissing?' ⚠ BCC Cross Glitch was not found, so those slots were skipped.':'');
    }catch(e){try{app.endUndoGroup();}catch(x){}return '❌ Viral Edit stopped: '+e.toString();}
}
function EH_removeRecursive(c,visited){
    var id=String(c.id);if(visited[id])return;visited[id]=true;for(var i=c.numLayers;i>=1;i--){var l=c.layer(i),child=null;try{child=l.source;}catch(e){}if(child instanceof CompItem)EH_removeRecursive(child,visited);
        var fx=EH_fx(l);if(fx)for(var j=fx.numProperties;j>=1;j--)try{var nm=EH_low(fx.property(j).name);if(nm.indexOf('[viral]')>=0||nm==="ethan's best motion tile")fx.property(j).remove();}catch(ef){}
        try{
            var cc=String(l.comment||''),pp=cc.split('|'),oo=[];
            for(var zz=0;zz<pp.length;zz++)if(pp[zz]&&pp[zz]!=='EHZOOM'&&pp[zz].indexOf('EHZOOM:')!==0)oo.push(pp[zz]);
            l.comment=oo.join('|');
        }catch(eu){}
        try{if(l.comment&&l.comment.indexOf(ETHAN_VIRAL_PREFIX)===0){l.remove();continue;}}catch(el){}
    }
}
function EthanHub_removeViral(){try{var c=EH_comp();app.beginUndoGroup('Remove Ethan Viral Edit');EH_removeRecursive(c,{});app.endUndoGroup();return 'Removed Viral helper layers and tagged effects. Your manual scene cuts are untouched. Use the VIRAL BACKUP if you want the exact pre-edit state.';}catch(e){try{app.endUndoGroup();}catch(x){}return 'ERROR: '+e.toString();}}
function EthanHub_selectAllExceptIntro(){try{var c=EH_comp(),a=EH_allClips(c);EH_clearSel(c);var n=0;for(var i=0;i<a.length;i++){if(EH_low(a[i].name)==='intro'||i===0)continue;try{a[i].selected=true;n++;}catch(e){}}return 'Selected '+n+' clip(s), excluding intro.';}catch(e){return 'ERROR: '+e.toString();}}
function EthanHub_addNoColorToColor(){
    try{
        var c=EH_comp(),a=EH_selectedClips(c);if(!a.length)a=EH_allClips(c);
        a.sort(function(x,y){return x.inPoint-y.inPoint;});
        var n=0;app.beginUndoGroup('No Color -> Color');
        for(var i=0;i<a.length;i++){
            if(i===0||EH_low(a[i].name)==='intro')continue;
            EH_saturation(c,a[i]);n++;
        }
        app.endUndoGroup();
        return 'Added / confirmed No Color -> Color on '+n+' clip(s) after intro. Adjustment opacity is 100% -> 0% with Easy Ease.';
    }catch(e){try{app.endUndoGroup();}catch(x){}return 'ERROR: '+e.toString();}
}
function EH_layerHasWord(l,word){var fx=EH_fx(l);if(!fx)return false;word=EH_low(word);function walk(g){for(var i=1;i<=g.numProperties;i++){var p=g.property(i),nm='';if(!p)continue;try{nm=EH_low(p.name);}catch(e){}if(nm.indexOf(word)>=0)return true;try{if(p.numProperties>0&&walk(p))return true;}catch(e2){}}return false;}return walk(fx);}
function EthanHub_fixMotionTiles(){try{var c=EH_comp(),n=0;EH_clearSel(c);for(var i=1;i<=c.numLayers;i++){var l=c.layer(i);if(l instanceof AVLayer&&(EH_layerHasWord(l,'motion tile')||EH_layerHasWord(l,"ethan's best motion tile"))){EH_bestMotionOn(c,l);l.selected=true;n++;}}return 'Fixed + selected '+n+' Motion Tile layer(s).';}catch(e){return 'ERROR: '+e.toString();}}
function EthanHub_fixZooms(){
    try{
        var c=EH_comp(),n=0,repaired=0;EH_clearSel(c);
        for(var i=1;i<=c.numLayers;i++){
            var l=c.layer(i),type=EH_zoomTypeFromClip(l),hit=!!type;
            if(!hit)hit=EH_low(l.name).indexOf('zoom')>=0||EH_layerHasWord(l,'[viral zoom');
            if(hit){
                if(type&&EH_repairZoomOnClip(c,l,type))repaired++;
                try{l.selected=true;n++;}catch(es){}
            }
        }
        return 'Fixed '+repaired+' Viral zoom layer(s) + selected '+n+' zoom layer(s). Zoom timing now spans 3 frames before each split through 4 frames after it; Shift Y / Shift Z helper keyframes stay at 0 so you can enter your own reframe values.';
    }catch(e){return 'ERROR: '+e.toString();}
}
function EthanHub_fixShakes(){try{var c=EH_comp(),n=0;EH_clearSel(c);for(var i=1;i<=c.numLayers;i++){var l=c.layer(i);if(EH_layerHasWord(l,'shake')||EH_low(l.name).indexOf('shake')>=0){l.selected=true;n++;}}return 'Selected '+n+' layer(s) containing shake effects.';}catch(e){return 'ERROR: '+e.toString();}}
function EthanHub_fixRipples(){try{var c=EH_comp(),n=0;EH_clearSel(c);for(var i=1;i<=c.numLayers;i++){var l=c.layer(i);if(EH_kind(l)==='RIPPLE'||EH_low(l.name)==='bcc ripple'){EH_forceCenters(l,c);l.selected=true;n++;}}return 'Centered + selected '+n+' Ripple adjustment layer(s).';}catch(e){return 'ERROR: '+e.toString();}}
function EthanHub_fixJaws(){try{var c=EH_comp(),n=0;EH_clearSel(c);for(var i=1;i<=c.numLayers;i++){var l=c.layer(i),k=EH_kind(l);if(k==='JAWS_VERTICAL'||k==='JAWS_HORIZONTAL'){EH_forceCenters(l,c);l.selected=true;n++;}}return 'Centered + selected '+n+' Jaws solid layer(s).';}catch(e){return 'ERROR: '+e.toString();}}
function EthanHub_precompAllText(){
    try{var c=EH_comp(),idx=[],min=1e9,max=-1e9;for(var i=1;i<=c.numLayers;i++){var l=c.layer(i);if(EH_isText(l)){idx.push(i);min=Math.min(min,l.inPoint);max=Math.max(max,l.outPoint);}}if(!idx.length)return 'No text layers found.';var pc=c.layers.precompose(idx,'ALL TEXT PRECOMP',true),parent=null;for(var j=1;j<=c.numLayers;j++)try{if(c.layer(j).source===pc){parent=c.layer(j);break;}}catch(e0){}if(parent){parent.name='ALL TEXT PRECOMP';parent.inPoint=min;parent.outPoint=max;EH_tagLayer(parent,'TEXT','TEXT_PRECOMP');parent.selected=true;}return 'Precomped '+idx.length+' text layer(s) into ALL TEXT PRECOMP.';}catch(e){return 'ERROR: '+e.toString();}
}
function EthanHub_smoothSnakeText(){
    try{var c=EH_comp(),target=null,s=c.selectedLayers||[];for(var i=0;i<s.length;i++)if(EH_low(s[i].name).indexOf('text')>=0){target=s[i];break;}if(!target)for(var j=1;j<=c.numLayers;j++)if(EH_low(c.layer(j).name)==='all text precomp'){target=c.layer(j);break;}if(!target)return 'Select ALL TEXT PRECOMP first.';var pos=target.property('ADBE Transform Group').property('ADBE Position');pos.expression='value + [Math.sin(time*1.65)*18, Math.sin(time*1.08 + 1.1)*12]';return 'Smooth Snake Slide Text applied.';}catch(e){return 'ERROR: '+e.toString();}
}
function EthanHub_choosePresetRoot(){try{var f=Folder.selectDialog("Choose Ethan's full .ffx preset folder");if(!f)return 'Preset root unchanged.';app.settings.saveSetting(ETHAN_HUB_SETTINGS,'presetRoot',f.fsName);return 'Preset root: '+f.fsName;}catch(e){return 'ERROR: '+e.toString();}}
function EthanHub_openPresetFolder(){try{var f=ETHAN_HUB_BUNDLED;if(f&&f.exists){var isWin=false;try{isWin=EH_low($.os).indexOf('windows')>=0;}catch(e0){}if(isWin)system.callSystem('explorer '+EH_quote(f.fsName));else system.callSystem('/usr/bin/open '+EH_quote(f.fsName));}return 'Opened preset folder.';}catch(e){return 'ERROR: '+e.toString();}}
function EH_exactBundledPreset(fileName){
    try{
        if(!ETHAN_HUB_BUNDLED||!ETHAN_HUB_BUNDLED.exists)return null;
        var want=EH_low(String(fileName||''));
        var files=ETHAN_HUB_BUNDLED.getFiles(function(f){return f instanceof File&&/\.ffx$/i.test(f.name);});
        for(var i=0;i<files.length;i++){
            var nm='';try{nm=decodeURI(files[i].name);}catch(e0){nm=files[i].name;}
            if(EH_low(nm)===want)return files[i];
        }
    }catch(e){}
    return null;
}
function EthanHub_applyBundledPreset(fileName){
    try{
        var c=EH_comp(),f=EH_exactBundledPreset(fileName);if(!f)return 'Bundled preset not found: '+String(fileName);
        var sel=c.selectedLayers||[];if(!sel.length)return 'Select at least one layer first, then click the preset again.';
        app.beginUndoGroup('Ethan Hub Preset - '+String(fileName));
        var n=0;
        for(var i=0;i<sel.length;i++){
            var l=sel[i];
            try{
                if(l&&typeof l.applyPreset!=='undefined'){
                    var at=Math.max(0,l.inPoint);
                    if(EH_applyPreset(c,l,f,at,false))n++;
                }
            }catch(e0){}
        }
        app.endUndoGroup();
        return n?'Applied '+String(fileName).replace(/\.ffx$/i,'')+' to '+n+' selected layer(s).':'AE could not apply this preset to the selected layer type.';
    }catch(e){try{app.endUndoGroup();}catch(x){}return 'ERROR: '+e.toString();}
}
function EthanHub_openLegacy(path){try{var f=new File(path+'/legacy/Ethans Editing Hub PREMIUM 1.4.0.jsx');if(!f.exists)return 'Legacy 1.4.0 file not found.';$.evalFile(f);return 'Opened original Premium 1.4.0 toolset.';}catch(e){return 'ERROR: '+e.toString();}}


// ============================================================
// PREMIUM 2.0 — SAFE PROJECT BACKUP
// ============================================================
function EH_pad2(n){n=Number(n)||0;return (n<10?'0':'')+n;}
function EH_safeFilePart(s){return String(s||'Project').replace(/[\\\/:*?"<>|]/g,'_');}
function EthanHub_safeBackup(){
    try{
        if(!app.project)return 'No After Effects project is open.';
        if(!app.project.file)return 'Save this project once first, then press SAFE BACKUP again.';
        // Save the live project before copying so the backup contains the newest edits.
        try{app.project.save();}catch(es){return 'Could not save the live project first: '+es.toString();}
        var src=app.project.file;
        var backupFolder=new Folder(src.parent.fsName+'/Ethan Hub Safe Backups');
        if(!backupFolder.exists&&!backupFolder.create())return 'Could not create the Ethan Hub Safe Backups folder.';
        var d=new Date();
        var stamp=d.getFullYear()+'-'+EH_pad2(d.getMonth()+1)+'-'+EH_pad2(d.getDate())+'_'+EH_pad2(d.getHours())+'-'+EH_pad2(d.getMinutes())+'-'+EH_pad2(d.getSeconds());
        var display='';try{display=decodeURI(src.name);}catch(e0){display=src.name;}
        var base=display.replace(/\.[^.]+$/,'');
        var ext=/\.aepx$/i.test(display)?'.aepx':'.aep';
        var dest=new File(backupFolder.fsName+'/'+EH_safeFilePart(base)+' - SAFE '+stamp+ext);
        var n=2;
        while(dest.exists){dest=new File(backupFolder.fsName+'/'+EH_safeFilePart(base)+' - SAFE '+stamp+' ('+(n++)+')'+ext);}
        if(!src.copy(dest.fsName))return 'Backup copy failed. Your live project is still safe and saved.';
        return '✅ SAFE BACKUP CREATED: '+dest.fsName;
    }catch(e){return 'ERROR: '+e.toString();}
}

// ============================================================
// REBOUND SWING / PANNING — tutorial-matched full-comp S_Shake bed
// ============================================================
function EthanHub_reboundPanning(){
    try{
        var c=EH_comp();app.beginUndoGroup('Rebound Swing / Panning');
        // Reuse/replace the generated full-comp layer so repeated clicks never stack it.
        for(var i=c.numLayers;i>=1;i--)try{var old=c.layer(i);if(EH_kind(old)==='REBOUND_PANNING')old.remove();}catch(er){}
        var adj=EH_makeAdjustment(c,'Rebound Swing - Panning',0,c.duration,'GLOBAL','REBOUND_PANNING');
        var fx=EH_addEffect(adj,['S_Shake','S_Shake']);
        if(!fx){try{adj.remove();}catch(rx){}app.endUndoGroup();return 'S_Shake was not found. Install Sapphire, then click Rebound Swing / Panning again.';}
        try{fx.name='Rebound Swing / Panning [VIRAL]';}catch(en){}
        // Values read from Ethan's supplied AE tutorial. S_Shake's frequency makes the movement continuous
        // for the entire adjustment layer, so it never "runs out" halfway through the comp.
        EH_setAny(fx,['Amplitude'],0.500);EH_setAny(fx,['Frequency'],2.100);EH_setAny(fx,['Phase'],0.000);
        EH_setAny(fx,['Z Dist'],1.000);EH_setAny(fx,['Motion Blur'],1);EH_setAny(fx,['Mo Blur Length'],1.000);
        EH_setAny(fx,['X Rand Amp'],45.00);EH_setAny(fx,['X Rand Freq'],1.000);EH_setAny(fx,['X Wave Amp'],0.000);EH_setAny(fx,['X Wave Freq'],0.500);EH_setAny(fx,['X Phase'],0.000);
        EH_setAny(fx,['Y Rand Amp'],55.00);EH_setAny(fx,['Y Rand Freq'],1.000);EH_setAny(fx,['Y Wave Amp'],0.000);EH_setAny(fx,['Y Wave Freq'],0.500);EH_setAny(fx,['Y Phase'],0.000);
        EH_setAny(fx,['Tilt Rand Amp'],3.000);EH_setAny(fx,['Tilt Rand Freq'],1.000);EH_setAny(fx,['Tilt Wave Amp'],0.000);EH_setAny(fx,['Tilt Wave Freq'],0.500);EH_setAny(fx,['Tilt Phase'],0.000);
        EH_walkAnimated(fx,function(pp){EH_ease(pp);});
        try{adj.moveToBeginning();adj.selected=true;}catch(em){}
        app.endUndoGroup();return '✅ Rebound Swing / Panning added as one full-comp adjustment layer using the tutorial S_Shake settings.';
    }catch(e){try{app.endUndoGroup();}catch(x){}return 'ERROR: '+e.toString();}
}

// ============================================================
// PREMIUM 2.0 — AUDIO TOOLBOX
// ============================================================
function EH_audioTargets(c){
    var out=[],sel=c.selectedLayers||[],i,l,g;
    for(i=0;i<sel.length;i++){
        l=sel[i];
        if(!(l instanceof AVLayer))continue;
        try{g=l.property('ADBE Audio Group');}catch(e0){g=null;}
        if(g)out.push(l);
    }
    if(out.length)return out;
    for(i=1;i<=c.numLayers;i++){
        l=c.layer(i);
        try{
            if(EH_low(l.name)==="ethan\'s edit audio"||EH_kind(l)==='EDIT_AUDIO'){out.push(l);break;}
        }catch(e1){}
    }
    return out;
}
function EH_audioLevelsProp(l){
    var g=null,p=null;
    try{g=l.property('ADBE Audio Group');}catch(e0){}
    if(!g)return null;
    try{p=g.property('ADBE Audio Levels');}catch(e1){}
    if(!p)try{p=g.property('Audio Levels');}catch(e2){}
    return p;
}
function EH_setAudioDb(l,delta,absolute){
    var p=EH_audioLevelsProp(l);if(!p)return false;
    try{
        var v=p.value,nv;
        if(v instanceof Array){
            nv=[];
            for(var i=0;i<v.length;i++)nv.push(EH_clamp(absolute?delta:(v[i]+delta),-48,12));
            p.setValue(nv);
        }else p.setValue(EH_clamp(absolute?delta:(v+delta),-48,12));
        return true;
    }catch(e){return false;}
}
function EH_audioEffect(l,names,label){
    var fx=EH_addEffect(l,names);if(!fx)return null;
    try{fx.name=label;}catch(e){}
    return fx;
}
function EH_audioReverb(l,strong){
    var fx=EH_audioEffect(l,['ADBE Reverb','Reverb'],strong?'Ethan Ballroom Reverb':'Ethan Reverb');
    if(!fx)return null;
    EH_setAny(fx,['Reverb Time','Decay Time','Time'],strong?3.6:2.2);
    EH_setAny(fx,['Diffusion'],strong?90:72);
    EH_setAny(fx,['Dry Out','Dry'],strong?62:78);
    EH_setAny(fx,['Wet Out','Wet'],strong?58:36);
    return fx;
}
function EH_audioModulator(l,heavy){
    var fx=EH_audioEffect(l,['ADBE Modulator','Modulator'],heavy?'Ethan Heavy Distort':'Ethan Distort');
    if(!fx)return null;
    EH_setAny(fx,['Modulation Rate','Rate','Frequency'],heavy?95:55);
    EH_setAny(fx,['Modulation Depth','Depth','Amplitude'],heavy?85:52);
    return fx;
}
function EH_audioBass(l,amount){
    var fx=EH_audioEffect(l,['ADBE Bass & Treble','Bass & Treble'],'Ethan Bass Boost');
    if(!fx)return null;
    EH_setAny(fx,['Bass'],amount===undefined?12:amount);
    EH_setAny(fx,['Treble'],1);
    return fx;
}
function EH_audioBandpass(l,label){
    var fx=EH_audioEffect(l,['ADBE High-Low Pass','High-Low Pass'],label||'Ethan Voice Filter');
    if(!fx)return null;
    // Property names vary across AE releases; apply whichever names exist.
    EH_setAny(fx,['Cutoff Frequency','Frequency'],1450);
    EH_setAny(fx,['Resonance','Q'],2.2);
    return fx;
}
function EthanHub_audioVolume(db){
    try{
        var c=EH_comp(),a=EH_audioTargets(c);if(!a.length)return 'Select an audio layer, or create ethan\'s edit audio with Viral Edit first.';
        app.beginUndoGroup('Ethan Audio Volume');
        var n=0;for(var i=0;i<a.length;i++)if(EH_setAudioDb(a[i],Number(db)||0,false))n++;
        app.endUndoGroup();return 'Adjusted volume by '+db+' dB on '+n+' audio layer(s).';
    }catch(e){try{app.endUndoGroup();}catch(x){}return 'ERROR: '+e.toString();}
}
function EthanHub_audioVolumeReset(){
    try{
        var c=EH_comp(),a=EH_audioTargets(c);if(!a.length)return 'Select an audio layer, or create ethan\'s edit audio first.';
        app.beginUndoGroup('Reset Ethan Audio Volume');
        var n=0;for(var i=0;i<a.length;i++)if(EH_setAudioDb(a[i],0,true))n++;
        app.endUndoGroup();return 'Reset Audio Levels to 0 dB on '+n+' layer(s).';
    }catch(e){try{app.endUndoGroup();}catch(x){}return 'ERROR: '+e.toString();}
}
function EthanHub_audioDistort(){
    try{
        var c=EH_comp(),a=EH_audioTargets(c);if(!a.length)return 'Select an audio layer, or create ethan\'s edit audio first.';
        app.beginUndoGroup('Distort Audio');
        var n=0;for(var i=0;i<a.length;i++){var fx=EH_audioModulator(a[i],false);if(fx)n++;}
        app.endUndoGroup();return n?'Added distortion to '+n+' audio layer(s).':'AE could not find its Modulator audio effect on this installation.';
    }catch(e){try{app.endUndoGroup();}catch(x){}return 'ERROR: '+e.toString();}
}
function EthanHub_audioSlowReverb(){
    try{
        var c=EH_comp(),a=EH_audioTargets(c);if(!a.length)return 'Select an audio layer, or create ethan\'s edit audio first.';
        app.beginUndoGroup('Slow + Reverb Audio');
        var n=0;for(var i=0;i<a.length;i++){
            try{a[i].stretch=125;}catch(es){}
            if(EH_audioReverb(a[i],false))n++;
        }
        app.endUndoGroup();return 'Slowed selected audio to 80% speed (125% stretch) and added reverb on '+a.length+' layer(s).'+(n<a.length?' Some Reverb effects could not be added.':'');
    }catch(e){try{app.endUndoGroup();}catch(x){}return 'ERROR: '+e.toString();}
}
function EthanHub_audioStyle(style){
    try{
        var c=EH_comp(),a=EH_audioTargets(c),s=EH_low(style);if(!a.length)return 'Select an audio layer, or create ethan\'s edit audio first.';
        app.beginUndoGroup('Ethan Audio Style - '+s);
        var made=0;
        for(var i=0;i<a.length;i++){
            var l=a[i],ok=false,fx=null;
            if(s==='megaphone'){
                fx=EH_audioBandpass(l,'Ethan Megaphone');if(fx)ok=true;
                if(EH_audioModulator(l,false))ok=true;
                EH_setAudioDb(l,3,false);
            }else if(s==='bass'){
                if(EH_audioBass(l,12))ok=true;
                EH_setAudioDb(l,2,false);
            }else if(s==='ballroom'){
                if(EH_audioReverb(l,true))ok=true;
            }else if(s==='reverb'){
                if(EH_audioReverb(l,false))ok=true;
            }else if(s==='speech'){
                fx=EH_audioEffect(l,['ADBE Parametric EQ','Parametric EQ'],'Ethan Speech EQ');if(fx){ok=true;EH_setAny(fx,['Center Frequency','Frequency'],1800);EH_setAny(fx,['Boost/Cut','Gain'],4);EH_setAny(fx,['Bandwidth','Q'],1.4);}
            }else if(s==='microphone'){
                if(EH_audioBandpass(l,'Ethan Microphone'))ok=true;
                fx=EH_audioReverb(l,false);if(fx){EH_setAny(fx,['Wet Out','Wet'],18);ok=true;}
                EH_setAudioDb(l,2,false);
            }else if(s==='distorted'){
                if(EH_audioModulator(l,true))ok=true;
                if(EH_audioBass(l,8))ok=true;
                EH_setAudioDb(l,2,false);
            }
            if(ok)made++;
        }
        app.endUndoGroup();
        return made?'Applied '+String(style)+' style to '+made+' audio layer(s).':'AE could not find the required native audio effect(s) for '+String(style)+'.';
    }catch(e){try{app.endUndoGroup();}catch(x){}return 'ERROR: '+e.toString();}
}
function EH_sfxFile(key){
    var map={
        click:'click.wav',snap:'snap.wav',crack:'crack.wav',pop:'pop.wav',slam:'slam.wav',
        whoosh_fast:'whoosh_fast.wav',whoosh_slow:'whoosh_slow.wav'
    };
    var n=map[EH_low(key)];if(!n)return null;
    try{return new File(ETHAN_HUB_EXT+'/assets/sfx/'+n);}catch(e){return null;}
}
function EthanHub_addSFX(key){
    try{
        var c=EH_comp(),f=EH_sfxFile(key);if(!f||!f.exists)return 'SFX file is missing from the Hub package.';
        app.beginUndoGroup('Add Ethan SFX');
        var item=EH_projectItemForFile(f);if(!item){var io=new ImportOptions(f);item=app.project.importFile(io);}
        var l=c.layers.add(item),t=EH_clamp(c.time,0,Math.max(0,c.duration-c.frameDuration));
        l.name='SFX - '+String(key).replace(/_/g,' ');
        try{l.startTime=t;l.inPoint=t;l.outPoint=Math.min(c.duration,t+item.duration);l.audioEnabled=true;}catch(e0){}
        try{l.moveToEnd();}catch(e1){}
        try{l.selected=true;}catch(e2){}
        app.endUndoGroup();return 'Added '+l.name+' at the playhead.';
    }catch(e){try{app.endUndoGroup();}catch(x){}return 'ERROR: '+e.toString();}
}


// ============================================================
// PREMIUM 2.0 — SETTINGS / INSPECTOR / REMOVE SPECIFIC / LOCAL CAPTIONS / EXTRA EDIT STYLES
// ============================================================
function EthanHub_setRuntimeSettings(payload){
    try{
        var p=String(payload||'').split('|');
        function num(i,d,min,max){var v=parseFloat(p[i]);if(isNaN(v))v=d;return Math.max(min,Math.min(max,v));}
        ETHAN_RUNTIME_SETTINGS.jawsEvery=Math.round(num(0,8,2,30));
        ETHAN_RUNTIME_SETTINGS.crossFrames=Math.round(num(1,10,2,40));
        ETHAN_RUNTIME_SETTINGS.halfFrames=Math.round(num(2,13,2,40));
        ETHAN_RUNTIME_SETTINGS.edgeBrightness=num(3,.97,.1,2.0);
        ETHAN_RUNTIME_SETTINGS.skewEvery=Math.round(num(4,5,2,30));
        ETHAN_RUNTIME_SETTINGS.jawsOutFrames=Math.round(num(5,8,4,20));
        ETHAN_RUNTIME_SETTINGS.jawsInFrames=Math.round(num(6,13,6,30));
        return 'Settings loaded.';
    }catch(e){return 'Settings error: '+e.toString();}
}
function EH_clipNumber(layer,index){var m=String(layer.name||'').match(/(?:split\s*clip\s*#?|clip\s*#?)\s*(\d+)/i);return m?parseInt(m[1],10):(index+1);}
function EH_layerHasEffectKeyword(layer,kw){var fx=EH_fx(layer);if(!fx)return false;kw=EH_low(kw);for(var i=1;i<=fx.numProperties;i++){try{if(EH_low(fx.property(i).name).indexOf(kw)>=0)return true;}catch(e){}}return false;}
function EH_effectMatchOnClip(c,clip,key){
    key=EH_low(key);var owner=clip.name;
    if(key==='zoom')return EH_layerHasEffectKeyword(clip,'zoom')||EH_layerHasEffectKeyword(clip,'z dist');
    if(key==='edge rays')return EH_layerHasEffectKeyword(clip,'edge rays')||EH_layerHasEffectKeyword(clip,'rays');
    if(key==='smooth skew')return EH_layerHasEffectKeyword(clip,'smooth skew');
    if(key==='smooth jaws')return EH_layerHasEffectKeyword(clip,'smooth jaws');
    for(var i=1;i<=c.numLayers;i++)try{var l=c.layer(i),nm=EH_low(l.name),ow=EH_owner(l);if(ow===owner||String(ow).indexOf(owner)>=0){if(nm.indexOf(key)>=0||EH_kind(l).toLowerCase().indexOf(key.replace(/\s+/g,'_'))>=0)return true;}}catch(e){}
    return false;
}
function EthanHub_effectClips(key){
    try{var c=EH_comp(),clips=EH_allClips(c),out=[];for(var i=0;i<clips.length;i++)if(EH_effectMatchOnClip(c,clips[i],key))out.push({n:EH_clipNumber(clips[i],i),name:clips[i].name});return JSON.stringify(out);}catch(e){return '[]';}
}
function EH_removeEffectKeywordFromLayer(layer,key){var fx=EH_fx(layer);if(!fx)return;key=EH_low(key);for(var i=fx.numProperties;i>=1;i--)try{var nm=EH_low(fx.property(i).name);if(nm.indexOf(key)>=0||(key==='zoom'&&(nm.indexOf('z dist')>=0||nm.indexOf('zoom')>=0))||(key==='smooth jaws'&&nm.indexOf('smooth jaws')>=0))fx.property(i).remove();}catch(e){}
}
function EthanHub_removeEffectSpecific(key,csv){
    try{var c=EH_comp(),clips=EH_allClips(c),want={},parts=String(csv||'').split(',');for(var z=0;z<parts.length;z++)want[parseInt(parts[z],10)]=1;app.beginUndoGroup('Remove Specific '+key);
        for(var i=0;i<clips.length;i++){var n=EH_clipNumber(clips[i],i);if(!want[n])continue;EH_removeEffectKeywordFromLayer(clips[i],key);for(var j=c.numLayers;j>=1;j--)try{var l=c.layer(j),ow=EH_owner(l),nm=EH_low(l.name);if((ow===clips[i].name||String(ow).indexOf(clips[i].name)>=0)&&nm.indexOf(EH_low(key))>=0)l.remove();}catch(er){}}
        app.endUndoGroup();return 'Removed '+key+' only from selected clips.';
    }catch(e){try{app.endUndoGroup();}catch(x){}return 'ERROR: '+e.toString();}
}
function EthanHub_removeEffectAll(key){try{var c=EH_comp(),clips=EH_allClips(c);app.beginUndoGroup('Remove All '+key);for(var i=0;i<clips.length;i++)EH_removeEffectKeywordFromLayer(clips[i],key);for(var j=c.numLayers;j>=1;j--)try{var l=c.layer(j),nm=EH_low(l.name);if(nm.indexOf(EH_low(key))>=0)l.remove();}catch(er){}app.endUndoGroup();return 'Removed all '+key+'.';}catch(e){try{app.endUndoGroup();}catch(x){}return 'ERROR: '+e.toString();}}
function EthanHub_inspectViral(){
    try{var c=EH_comp(),clips=EH_allClips(c),counts={clips:clips.length,zoom:0,edge:0,skew:0,jaws:0,halftone:0,cross:0,snow:0,flash:0,suspicious:[]};
        for(var i=0;i<clips.length;i++){var l=clips[i];if(EH_effectMatchOnClip(c,l,'zoom'))counts.zoom++;if(EH_effectMatchOnClip(c,l,'edge rays'))counts.edge++;if(EH_effectMatchOnClip(c,l,'smooth skew'))counts.skew++;if(EH_effectMatchOnClip(c,l,'smooth jaws'))counts.jaws++;
            try{var sc=l.property('ADBE Transform Group').property('ADBE Scale');if(sc&&sc.numKeys){for(var k=1;k<=sc.numKeys;k++){var v=sc.keyValue(k);if(v[0]<70||v[1]<70||v[0]>220||v[1]>220){counts.suspicious.push(l.name+' scale '+Math.round(v[0])+'%');break;}}}}catch(es){}
        }
        for(var j=1;j<=c.numLayers;j++){var nm=EH_low(c.layer(j).name);if(nm.indexOf('halftone')>=0)counts.halftone++;if(nm.indexOf('cross glitch')>=0)counts.cross++;if(nm.indexOf('snow')>=0)counts.snow++;if(nm.indexOf('flash')>=0)counts.flash++;}
        return JSON.stringify(counts);
    }catch(e){return JSON.stringify({error:e.toString()});}
}
function EH_bestRotatePair(c,out,inc,dir){
    // Tutorial-inspired alternate rotate: tighter than Smooth Jaws, graph-like overshoot, still no Twixtor.
    var fd=c.frameDuration,cut=(out.outPoint+inc.inPoint)/2,sgn=(dir==='right')?1:-1;
    var os=Math.max(out.inPoint,cut-fd*7),oe=Math.min(out.outPoint-fd,cut-fd),is=Math.max(inc.inPoint,cut),ie=Math.min(inc.outPoint-fd,is+fd*11);
    EH_sjrTransformWH(out,[os,cut-fd*3,oe],[0,sgn*7,sgn*28],[100,91,74],[100,103,112]);
    EH_sjrWarp(out,[os,cut-fd*2,oe],[0,5,18]);EH_sjrLens(out,[os,cut-fd*2,oe],[0,4,9]);EH_sjrBlur(out,[os,cut-fd*2,oe],[0,3,14]);
    EH_sjrTransformWH(inc,[is,Math.min(ie,is+fd*3),Math.min(ie,is+fd*7),ie],[-sgn*22,sgn*3,-sgn*.8,0],[76,88,98,100],[112,105,101,100]);
    EH_sjrWarp(inc,[is,Math.min(ie,is+fd*5),ie],[18,5,0]);EH_sjrLens(inc,[is,Math.min(ie,is+fd*5),ie],[9,3,0]);EH_sjrBlur(inc,[is,Math.min(ie,is+fd*5),ie],[14,4,0]);
    EH_applySmoothSkew(c,inc,-12,0,Math.max(7,Math.round((ie-is)/fd)),'Best Rotate Jaws Skew',true);
    var preset=EH_findPreset(['tattooedhe8rt','jaws','vertical']);EH_sjrPairBlackJaws(c,out,inc,preset,os,cut,ie,out.name+' -> '+inc.name+' [BEST ROTATE]',sgn);return true;
}
function EthanHub_bestRotateJaws(){try{var c=EH_comp(),p=EH_sjrPair(c);if(!p)return 'Select the two clips touching the cut.';app.beginUndoGroup('Best Rotate Jaws');EH_bestRotatePair(c,p.outgoing,p.incoming,'left');app.endUndoGroup();return '✅ Best Rotate Jaws applied.';}catch(e){try{app.endUndoGroup();}catch(x){}return 'ERROR: '+e.toString();}}
function EH_extraStyleMotion(c,clips,mode){
    for(var i=0;i<clips.length;i++){var l=clips[i],fd=c.frameDuration,a=l.inPoint,b=Math.min(l.outPoint-fd,a+fd*8);if(b<=a)continue;var tr=EH_addEffect(l,['ADBE Geometry2','Transform']);if(!tr)continue;try{tr.name='One Click '+mode+' [VIRAL]';}catch(e){}
        var pos=EH_findRecursive(tr,['Position']),sc=EH_findRecursive(tr,['Scale']);if(pos){var cx=c.width/2,cy=c.height/2,amp=(mode==='Impact Flow'?22:(mode==='Cinematic Glide'?8:13));EH_sjrSetKeys(pos,[a,(a+b)/2,b],[[cx-amp,cy],[cx+amp*.35,cy-amp*.18],[cx,cy]]);}if(sc){var sv=(mode==='Impact Flow'?[103,108,100]:(mode==='Cinematic Glide'?[101,103,100]:[102,105,100]));EH_sjrSetKeys(sc,[a,(a+b)/2,b],sv);}}
}
function EthanHub_oneClickStyle(mode){try{var msg=EthanHub_viralEdit(false,'1080P',true),c=EH_comp(),clips=EH_allClips(c);app.beginUndoGroup(mode);EH_extraStyleMotion(c,clips,mode);if(mode==='Impact Flow')EthanHub_reboundPanning();app.endUndoGroup();return '✅ '+mode+' finished. '+msg;}catch(e){try{app.endUndoGroup();}catch(x){}return 'ERROR: '+e.toString();}}
function EH_makeEditableWatermark(c,style){
    var t=c.layers.addText('officiallethannn'),a=Math.max(0,c.duration-2.7),b=c.duration,fd=c.frameDuration;t.inPoint=a;t.outPoint=b;t.name='Editable Watermark - '+style;EH_tagLayer(t,'WATERMARK','TEXT_WATERMARK');
    try{var td=t.property('ADBE Text Properties').property('ADBE Text Document'),doc=td.value;doc.fontSize=Math.max(28,Math.round(c.height*.045));doc.fillColor=[1,1,1];doc.applyFill=true;doc.justification=ParagraphJustification.CENTER_JUSTIFY;td.setValue(doc);}catch(et){}
    var tg=t.property('ADBE Transform Group'),pos=tg.property('ADBE Position'),sc=tg.property('ADBE Scale'),op=tg.property('ADBE Opacity'),rot=tg.property('ADBE Rotate Z');var cx=c.width/2,cy=c.height*.82;
    if(style==='Orbit'){EH_sjrSetKeys(pos,[a,a+(b-a)*.35,a+(b-a)*.72,b],[[cx-180,cy-70],[cx,cy],[cx+160,cy-40],[cx,cy]]);EH_sjrSetKeys(rot,[a,b],[-18,8]);EH_sjrSetKeys(sc,[a,(a+b)/2,b],[[55,55],[118,118],[100,100]]);}
    else if(style==='Split Letters'){EH_sjrSetKeys(sc,[a,a+(b-a)*.45,b],[[35,120],[130,72],[100,100]]);EH_sjrSetKeys(rot,[a,a+(b-a)*.45,b],[18,-7,0]);}
    else if(style==='Punch Glow'){EH_sjrSetKeys(sc,[a,a+fd*6,a+fd*12,b],[[30,30],[130,130],[94,94],[100,100]]);}
    else if(style==='Ribbon'){EH_sjrSetKeys(pos,[a,(a+b)/2,b],[[cx-220,cy],[cx+40,cy-30],[cx,cy]]);EH_sjrSetKeys(rot,[a,(a+b)/2,b],[-28,7,0]);}
    else{EH_sjrSetKeys(sc,[a,a+(b-a)*.5,b],[[70,70],[112,112],[100,100]]);EH_sjrSetKeys(rot,[a,a+(b-a)*.5,b],[-4,4,0]);}
    EH_sjrSetKeys(op,[a,a+fd*3,b-fd*3,b],[0,100,100,0]);
    var glow=EH_addEffect(t,['ADBE Glow','Glow']);if(glow)try{glow.name='Editable Watermark Glow';}catch(e){}return t;
}
function EthanHub_addTextWatermark(style){try{var c=EH_comp();app.beginUndoGroup('Editable Watermark '+style);var t=EH_makeEditableWatermark(c,String(style||'Clean Pop'));t.selected=true;app.endUndoGroup();return '✅ Editable '+style+' watermark added. Double-click its text to rename it.';}catch(e){try{app.endUndoGroup();}catch(x){}return 'ERROR: '+e.toString();}}

// --- Local caption engine: whisper.cpp tiny.en Q5_1, Windows local whisper.cpp tiny.en Q5_1; CPU-only by default. ---
function EH_quote(s){return '"'+String(s).replace(/"/g,'\\"')+'"';}
function EH_captionEngineRoot(){return new Folder(ETHAN_HUB_EXT+'/transcribe');}
function EH_runCaptionSetup(){var f=new File(ETHAN_HUB_EXT+'/SETUP_AUTO_CAPTIONS.bat');if(!f.exists)return false;try{system.callSystem('cmd.exe /c '+EH_quote(f.fsName));return true;}catch(e){return false;}}
function EH_findEditAudio(c){for(var i=1;i<=c.numLayers;i++){var l=c.layer(i),nm=EH_low(l.name);if(nm==="ethan's edit audio"||nm==='edit audio')return l;}return null;}
function EH_captionTextLayer(c,word,a,b,index){var l=c.layers.addText(word),td=l.property('ADBE Text Properties').property('ADBE Text Document');try{var d=td.value;d.fontSize=Math.max(34,Math.round(c.height*.062));d.fillColor=[1,1,1];d.applyFill=true;d.justification=ParagraphJustification.CENTER_JUSTIFY;td.setValue(d);}catch(e){}l.name='AUTO CAPTION '+(index+1)+' - '+word;l.inPoint=a;l.outPoint=Math.max(a+c.frameDuration,b);var tg=l.property('ADBE Transform Group'),p=tg.property('ADBE Position'),s=tg.property('ADBE Scale'),o=tg.property('ADBE Opacity');try{p.setValue([c.width/2,c.height*.79]);}catch(ep){}var t1=Math.min(l.outPoint,a+c.frameDuration*2);EH_sjrSetKeys(s,[a,t1],[[82,82],[100,100]]);EH_sjrSetKeys(o,[a,t1],[0,100]);return l;}
function EH_parseWhisperWords(data){var words=[];function push(text,t0,t1){text=String(text||'').replace(/^\s+|\s+$/g,'');if(!text||/^\[.*\]$/.test(text))return;words.push({text:text,t0:Number(t0)||0,t1:Number(t1)||Number(t0)||0});}
    try{var segs=data.transcription||data.segments||data.result||[];if(segs.segments)segs=segs.segments;for(var i=0;i<segs.length;i++){var s=segs[i],tok=s.tokens||s.words||[];if(tok&&tok.length){for(var j=0;j<tok.length;j++){var q=tok[j],tx=q.text||q.word||q.token;var t0=(q.t0!=null?q.t0/100:(q.start!=null?q.start:0)),t1=(q.t1!=null?q.t1/100:(q.end!=null?q.end:t0+.25));push(tx,t0,t1);}}else{var st=(s.offsets&&s.offsets.from!=null?s.offsets.from/1000:(s.t0!=null?s.t0/100:(s.start||0))),en=(s.offsets&&s.offsets.to!=null?s.offsets.to/1000:(s.t1!=null?s.t1/100:(s.end||st+1))),arr=String(s.text||'').split(/\s+/),span=Math.max(.05,(en-st)/Math.max(1,arr.length));for(var k=0;k<arr.length;k++)push(arr[k],st+k*span,st+(k+1)*span);}}
    }catch(e){}return words;}
function EthanHub_autoCaptions(){
    try{var c=EH_comp(),aud=EH_findEditAudio(c);if(!aud)return 'No ethan\'s edit audio layer found. Run Viral Edit first, or rename your audio bed to ethan\'s edit audio.';var src=null;try{src=aud.source&&aud.source.file?aud.source.file:null;}catch(es){}if(!src||!src.exists)return 'Auto Captions needs the audio bed to come from a real media file on disk.';
        var tr=EH_captionEngineRoot(),exe=new File(tr.fsName+'/runtime/Release/whisper-cli.exe'),model=new File(tr.fsName+'/models/ggml-tiny.en-q5_1.bin');if(!exe.exists||!model.exists){EH_runCaptionSetup();exe=new File(tr.fsName+'/runtime/Release/whisper-cli.exe');model=new File(tr.fsName+'/models/ggml-tiny.en-q5_1.bin');if(!exe.exists||!model.exists)return 'Caption engine setup did not finish. Run SETUP_AUTO_CAPTIONS.bat in the Hub folder, then try again.';}
        var temp=Folder.temp.fsName+'/ethan_hub_caption_'+(new Date().getTime()),wav=temp+'.wav',out=temp+'_words';
        var localFf=new File(tr.fsName+'/ffmpeg/ffmpeg.exe'),ffExe=null;
        if(localFf.exists)ffExe=localFf.fsName;
        if(!ffExe){var ff=system.callSystem('cmd.exe /c where ffmpeg');if(ff&&EH_low(ff).indexOf('ffmpeg')>=0)ffExe='ffmpeg';}
        if(!ffExe){EH_runCaptionSetup();localFf=new File(tr.fsName+'/ffmpeg/ffmpeg.exe');if(localFf.exists)ffExe=localFf.fsName;}
        if(!ffExe)return 'Auto Captions could not prepare ffmpeg. Run SETUP_AUTO_CAPTIONS.bat once, then try again.';
        system.callSystem('cmd.exe /c '+EH_quote(ffExe)+' -y -loglevel error -i '+EH_quote(src.fsName)+' -ac 1 -ar 16000 '+EH_quote(wav));
        system.callSystem('cmd.exe /c '+EH_quote(exe.fsName)+' -m '+EH_quote(model.fsName)+' -f '+EH_quote(wav)+' -l en -ng -sow -ojf -of '+EH_quote(out)+' -np');
        var jf=new File(out+'.json');if(!jf.exists)return 'Whisper finished but no JSON transcript was produced.';jf.encoding='UTF-8';jf.open('r');var raw=jf.read();jf.close();var data=JSON.parse(raw),words=EH_parseWhisperWords(data);if(!words.length)return 'Transcript was created, but no timed words were found.';
        app.beginUndoGroup('Auto Generate Captions');for(var i=0;i<words.length;i++){var a=aud.inPoint+words[i].t0,b=aud.inPoint+words[i].t1;if(a>=c.duration)break;EH_captionTextLayer(c,words[i].text,Math.max(0,a),Math.min(c.duration,b),i);}app.endUndoGroup();return '✅ '+words.length+' timed caption words generated locally with Whisper Tiny Q5. No cloud/API charge.';
    }catch(e){try{app.endUndoGroup();}catch(x){}return 'AUTO CAPTIONS ERROR: '+e.toString();}
}


// ============================================================
// PREMIUM 2.0 V7 — intelligence / continuity / diagnostics
// ============================================================
function EH_zDistProp(layer){var fx=EH_zoomEffects(layer);for(var i=0;i<fx.length;i++){var p=EH_findPropContains(fx[i],['z dist','z-dist','zdist']);if(p)return p;}return null;}
function EthanHub_matchZoomFlow(mode){
 try{var c=EH_comp(),clips=EH_selectedClips(c);if(clips.length<2)clips=EH_allClips(c);if(clips.length<2)return 'Need at least two visual clips.';app.beginUndoGroup('Match Zoom Flow');var changed=0;
  for(var i=1;i<clips.length;i++){var prev=EH_zDistProp(clips[i-1]),cur=EH_zDistProp(clips[i]);if(!prev||!cur||prev.numKeys<1||cur.numKeys<1)continue;var end=prev.keyValue(prev.numKeys),firstT=cur.keyTime(1);cur.setValueAtTime(firstT,end);changed++;
   if(mode==='smooth'&&cur.numKeys>=2&&prev.numKeys>=2){var dt=Math.max(c.frameDuration,prev.keyTime(prev.numKeys)-prev.keyTime(prev.numKeys-1)),dv=end-prev.keyValue(prev.numKeys-1),vel=dv/dt;var dt2=Math.max(c.frameDuration,cur.keyTime(2)-firstT),old2=cur.keyValue(2),dir=(old2-end)>=0?1:-1;var mag=Math.abs(vel*dt2);var target=end+dir*Math.max(mag,Math.abs(old2-end)*.55);cur.setValueAtTime(cur.keyTime(2),target);}EH_ease(cur);
  }app.endUndoGroup();return '✅ Matched '+changed+' adjacent BlurMoCurves zoom boundaries'+(mode==='smooth'?' with velocity-aware smoothing.':'.');
 }catch(e){try{app.endUndoGroup();}catch(x){}return 'MATCH ZOOM FLOW ERROR: '+e.toString();}
}
function EthanHub_dependencyCheck(){try{var c=EH_comp(),l=c.layers.addSolid([0,0,0],'__EH_DEP_CHECK__',32,32,1,c.frameDuration),fx=EH_fx(l),tests=[['BCC/CC Jaws',['BCC Jaws','CC Jaws']],['S_BlurMoCurves',['S_BlurMoCurves']],['S_Shake',['S_Shake']],['S_Halftone',['S_Halftone']],['BCC Cross Glitch',['BCC Cross Glitch']],['CC Particle World',['CC Particle World','CC Particle World 2']]],out=[];for(var i=0;i<tests.length;i++){var ok=false;for(var j=0;j<tests[i][1].length;j++)try{if(fx.canAddProperty(tests[i][1][j])){ok=true;break;}}catch(e){}out.push(tests[i][0]+': '+(ok?'OK':'MISSING'));}l.remove();var wp=EH_findPreset(['tattooedhe8rt','jaws','vertical']);out.push('Bundled Jaws preset: '+(wp?'OK':'MISSING'));return out.join('\n');}catch(e){return 'DEPENDENCY CHECK ERROR: '+e.toString();}}
function EthanHub_shortClipHeatmap(){try{var c=EH_comp(),clips=EH_allClips(c),out=[];for(var i=0;i<clips.length;i++){var f=Math.max(1,Math.round((clips[i].outPoint-clips[i].inPoint)/c.frameDuration)),tag=f<8?'RED':(f<14?'YELLOW':'GREEN');out.push(tag+' • '+clips[i].name+' • '+f+'f');}return out.join('\n');}catch(e){return 'HEATMAP ERROR: '+e.toString();}}
function EthanHub_editScore(){try{var c=EH_comp(),clips=EH_allClips(c),shortClips=0,danger=0,gaps=0;for(var i=0;i<clips.length;i++){var f=Math.round((clips[i].outPoint-clips[i].inPoint)/c.frameDuration);if(f<8)shortClips++;try{var sc=clips[i].property('ADBE Transform Group').property('ADBE Scale');for(var k=1;k<=sc.numKeys;k++){var v=sc.keyValue(k);if(v[0]<70||v[1]<70||v[0]>220||v[1]>220){danger++;break;}}}catch(e){}if(i>0){var a=EH_zDistProp(clips[i-1]),b=EH_zDistProp(clips[i]);if(a&&b&&a.numKeys&&b.numKeys&&Math.abs(a.keyValue(a.numKeys)-b.keyValue(1))>.08)gaps++;}}
 var score=Math.max(0,100-shortClips*2-danger*7-gaps*4),motion=Math.max(0,100-gaps*8),safety=Math.max(0,100-danger*15),timing=Math.max(0,100-shortClips*4);return 'EDIT SCORE: '+score+'/100\nMotion continuity: '+motion+'\nTransform safety: '+safety+'\nShort-clip timing: '+timing+'\n\nShort clips (<8f): '+shortClips+'\nSuspicious transforms: '+danger+'\nZoom discontinuities: '+gaps; }catch(e){return 'EDIT SCORE ERROR: '+e.toString();}}
function EthanHub_safeTestMode(){try{var c=EH_comp(),d=c.duplicate(),n=new Date();d.name=c.name+' — TEST '+n.getHours()+'-'+n.getMinutes()+'-'+n.getSeconds();d.openInViewer();return '✅ Safe test comp created: '+d.name;}catch(e){return 'SAFE TEST ERROR: '+e.toString();}}
function EthanHub_fixMyEdit(){try{var c=EH_comp(),clips=EH_allClips(c),fixed=0;app.beginUndoGroup('Fix My Edit');for(var i=0;i<clips.length;i++){try{var sc=clips[i].property('ADBE Transform Group').property('ADBE Scale');if(sc.numKeys===0){var v=sc.value;if(v[0]<70||v[1]<70){sc.setValue([100,100]);fixed++;}}}catch(e){}}app.endUndoGroup();return '✅ Mechanical safety pass complete. Fixed '+fixed+' unsafe static transforms. Creative effects were left alone.';}catch(e){try{app.endUndoGroup();}catch(x){}return 'FIX MY EDIT ERROR: '+e.toString();}}
function EthanHub_applyCaptionStyle(style){try{var c=EH_comp(),n=0;app.beginUndoGroup('Caption Style');for(var i=1;i<=c.numLayers;i++){var l=c.layer(i);if(EH_low(l.name).indexOf('auto caption ')!==0)continue;var td=l.property('ADBE Text Properties').property('ADBE Text Document'),d=td.value,tg=l.property('ADBE Transform Group'),s=tg.property('ADBE Scale'),o=tg.property('ADBE Opacity');if(style==='minimal'){d.fontSize=Math.max(28,Math.round(c.height*.045));}else if(style==='cinematic'){d.fontSize=Math.max(32,Math.round(c.height*.052));}else if(style==='big'){d.fontSize=Math.max(40,Math.round(c.height*.072));}else{d.fontSize=Math.max(34,Math.round(c.height*.06));}td.setValue(d);var a=l.inPoint,t=Math.min(l.outPoint,a+c.frameDuration*2);if(style==='bounce')EH_sjrSetKeys(s,[a,t,Math.min(l.outPoint,a+c.frameDuration*4)],[[72,72],[112,112],[100,100]]);else EH_sjrSetKeys(s,[a,t],[[86,86],[100,100]]);if(style==='cinematic')EH_sjrSetKeys(o,[a,t],[0,88]);else EH_sjrSetKeys(o,[a,t],[0,100]);n++;}app.endUndoGroup();return '✅ Restyled '+n+' caption layers as '+style+'.';}catch(e){try{app.endUndoGroup();}catch(x){}return 'CAPTION STYLE ERROR: '+e.toString();}}
function EthanHub_applyCustomStyle(zoom,skew,rays,flash,jaws,strength){try{var c=EH_comp(),clips=EH_selectedClips(c);if(!clips.length)return 'Select the visual clips you want this custom style applied to.';strength=parseFloat(strength)||1;app.beginUndoGroup('Custom Edit Style');for(var i=0;i<clips.length;i++){var l=clips[i];if(zoom)EH_applyZoomPreset(c,l,['tattooedhe8rt',i%2?'zoom out(':'zoom in('],i%2?'zout':'zin');if(skew)EH_applySmoothSkew(c,l,(i%2?-9:9)*strength,0,Math.max(5,Math.round(8*strength)),'Custom Style Skew',true);if(rays)EH_edgeRays(c,l);if(flash&&i<clips.length-1)EH_flash(c,l);}if(jaws)for(var j=0;j<clips.length-1;j+=2)EH_bestRotatePair(c,clips[j],clips[j+1],((j/2)%2)?'right':'left');app.endUndoGroup();return '✅ Custom style applied to '+clips.length+' selected clips.';}catch(e){try{app.endUndoGroup();}catch(x){}return 'STYLE BUILDER ERROR: '+e.toString();}}


// ============================================================
// PREMIUM 2.0 LUXE — Ethan AE System / Project intelligence
// ============================================================
function EH_json(v){try{return JSON.stringify(v);}catch(e){return '{}';}}
function EH_rootFolder(name){
    for(var i=1;i<=app.project.numItems;i++){var it=app.project.item(i);if(it instanceof FolderItem && it.parentFolder===app.project.rootFolder && it.name===name)return it;}
    return app.project.items.addFolder(name);
}
function EthanHub_initializeProject(){
    try{
        if(!app.project)return 'No project is open.';
        app.beginUndoGroup('Initialize Ethan Project');
        var names=['01 • FOOTAGE','02 • AUDIO','03 • PRECOMPS','04 • HELPERS','05 • TEXT','06 • CC + SHARPEN','07 • WATERMARK','08 • RENDERS','99 • BACKUPS'];
        var created=0;for(var i=0;i<names.length;i++){var before=app.project.numItems;EH_rootFolder(names[i]);if(app.project.numItems>before)created++;}
        var c=app.project.activeItem instanceof CompItem?app.project.activeItem:null;
        if(!c){for(var j=1;j<=app.project.numItems;j++){if(app.project.item(j) instanceof CompItem){c=app.project.item(j);break;}}}
        if(c)try{c.name="Ethan's Main Edit";}catch(en){}
        app.endUndoGroup();
        return '✅ Project initialized. '+created+' folder(s) created.'+(c?' Main comp renamed to Ethan\'s Main Edit.':' No comp existed yet, so I did NOT invent a resolution/frame rate for you.');
    }catch(e){try{app.endUndoGroup();}catch(x){}return 'PROJECT INIT ERROR: '+e.toString();}
}
function EH_projectEffects(){
    var map={}, total=0, missing=0, heavy=0;
    var heavyWords=['magic bullet','looks','sapphire','s_blur','blurmocurves','neat','denoise','optical','particle','glow','sharpen','bcc','rsmb','twixtor'];
    for(var i=1;i<=app.project.numItems;i++){
        var c=app.project.item(i);if(!(c instanceof CompItem))continue;
        for(var l=1;l<=c.numLayers;l++){
            var fx=null;try{fx=c.layer(l).property('ADBE Effect Parade');}catch(e){}
            if(!fx)continue;
            for(var f=1;f<=fx.numProperties;f++){
                var p=fx.property(f),n='Effect';try{n=p.name||p.matchName||'Effect';}catch(e2){}
                map[n]=(map[n]||0)+1;total++;
                var low=EH_low(n);if(low.indexOf('missing:')===0)missing++;
                for(var h=0;h<heavyWords.length;h++)if(low.indexOf(heavyWords[h])>=0){heavy++;break;}
            }
        }
    }
    return {map:map,total:total,missing:missing,heavy:heavy};
}
function EthanHub_effectProfiler(){
    try{
        var d=EH_projectEffects(),arr=[];for(var k in d.map)if(d.map.hasOwnProperty(k))arr.push([k,d.map[k]]);
        arr.sort(function(a,b){return b[1]-a[1];});
        var out=['EFFECT PROFILER','Total effects: '+d.total,'Potentially heavy instances: '+d.heavy,'Missing effect instances: '+d.missing,''];
        for(var i=0;i<Math.min(arr.length,40);i++)out.push(arr[i][0]+' × '+arr[i][1]);
        return out.join('\n');
    }catch(e){return 'EFFECT PROFILER ERROR: '+e.toString();}
}
function EthanHub_pluginHealth(){
    try{
        var installed={}, count=0;
        try{for(var i=0;i<app.effects.length;i++){var e=app.effects[i],n='';try{n=e.displayName||e.matchName||'';}catch(x){}if(n){installed[EH_low(n)]=1;count++;}}}catch(e0){}
        var used=EH_projectEffects(),miss=[];for(var k in used.map)if(used.map.hasOwnProperty(k)&&EH_low(k).indexOf('missing:')===0)miss.push(k);
        var checks=['BCC Jaws','S_BlurMoCurves','S_Shake','S_Halftone','BCC Cross Glitch','Magic Bullet Looks'],lines=['PLUGIN HEALTH','Installed effect registrations: '+count,'Project missing placeholders: '+used.missing,''];
        for(var c=0;c<checks.length;c++){var q=EH_low(checks[c]),ok=false;for(var key in installed)if(installed.hasOwnProperty(key)&&key.indexOf(q)>=0){ok=true;break;}lines.push((ok?'✓ ':'✕ ')+checks[c]);}
        if(miss.length){lines.push('','MISSING IN PROJECT:');for(var m=0;m<miss.length;m++)lines.push('• '+miss[m]);}
        return lines.join('\n');
    }catch(e){return 'PLUGIN HEALTH ERROR: '+e.toString();}
}
function EthanHub_liveStats(){
    try{
        var comps=0,layers=0,effects=0,missing=0,active=app.project.activeItem instanceof CompItem?app.project.activeItem:null;
        for(var i=1;i<=app.project.numItems;i++){
            var it=app.project.item(i);if(it instanceof CompItem){comps++;layers+=it.numLayers;for(var j=1;j<=it.numLayers;j++){var fx=null;try{fx=it.layer(j).property('ADBE Effect Parade');}catch(e){}if(fx)effects+=fx.numProperties;}}
            if(it instanceof FootageItem){try{if(it.mainSource instanceof FileSource && (!it.file || !it.file.exists))missing++;}catch(ex){}}
        }
        var memory=0;try{memory=Math.round((app.memoryInUse||0)/1024/1024);}catch(me){}
        var d={project:app.project.file?app.project.file.name:'Unsaved Project',comps:comps,layers:layers,effects:effects,missing:missing,memoryMB:memory,renderQueue:app.project.renderQueue?app.project.renderQueue.numItems:0};
        if(active){d.activeComp=active.name;d.width=active.width;d.height=active.height;d.fps=active.frameRate;d.duration=active.duration;d.activeLayers=active.numLayers;}
        return EH_json(d);
    }catch(e){return EH_json({error:e.toString()});}
}
function EthanHub_projectDoctor(){
    try{
        var d=EH_projectEffects(),problems=[],huge=0;
        for(var i=1;i<=app.project.numItems;i++){var c=app.project.item(i);if(!(c instanceof CompItem))continue;if(c.width>4096||c.height>4096){huge++;problems.push('Huge comp: '+c.name+' ('+c.width+'×'+c.height+')');}for(var l=1;l<=c.numLayers;l++){var ly=c.layer(l);try{var mt=ly.property('ADBE Effect Parade').property('Motion Tile');if(mt){var ow=EH_findRecursive(mt,['Output Width']),oh=EH_findRecursive(mt,['Output Height']);if((ow&&ow.value>400)||(oh&&oh.value>400))problems.push('High Motion Tile: '+c.name+' / '+ly.name);}}catch(x){}}}
        if(d.missing)problems.push(d.missing+' missing effect instance(s).');
        if(d.heavy>24)problems.push(d.heavy+' potentially heavy effect instances — consider staged finishing.');
        var score=Math.max(0,100-problems.length*7-Math.max(0,d.heavy-20));
        return 'PROJECT HEALTH: '+score+'%\nComps over 4K: '+huge+'\nEffects: '+d.total+'\nHeavy-ish instances: '+d.heavy+'\n\n'+(problems.length?problems.join('\n'):'✓ No obvious mechanical danger flags detected.');
    }catch(e){return 'PROJECT DOCTOR ERROR: '+e.toString();}
}
function EH_findFilesRecursive(folder,name,out,limit){
    if(out.length>=limit||!folder||!folder.exists)return;var xs=[];try{xs=folder.getFiles();}catch(e){return;}
    for(var i=0;i<xs.length&&out.length<limit;i++){if(xs[i] instanceof Folder)EH_findFilesRecursive(xs[i],name,out,limit);else if(EH_low(xs[i].name)===EH_low(name))out.push(xs[i]);}
}
function EthanHub_relinkMissing(){
    try{
        var root=Folder.selectDialog('Choose the folder that contains your footage / Topaz exports');if(!root)return 'Relink cancelled.';
        var missing=[];for(var i=1;i<=app.project.numItems;i++){var it=app.project.item(i);if(!(it instanceof FootageItem))continue;try{if(it.mainSource instanceof FileSource && (!it.file||!it.file.exists))missing.push(it);}catch(e){}}
        if(!missing.length)return '✓ No missing footage items found.';
        var linked=0,ambiguous=0,notFound=0;app.beginUndoGroup('Ethan Auto Relink');
        for(var m=0;m<missing.length;m++){var it=missing[m],name='';try{name=it.file?it.file.name:it.name;}catch(n){name=it.name;}var hits=[];EH_findFilesRecursive(root,name,hits,3);if(hits.length===1){try{it.replace(hits[0]);linked++;}catch(r){notFound++;}}else if(hits.length>1)ambiguous++;else notFound++;}
        app.endUndoGroup();return '✅ Relink scan complete. Linked '+linked+'. Multiple-match items '+ambiguous+'. Not found '+notFound+'. I never guessed when multiple files matched.';
    }catch(e){try{app.endUndoGroup();}catch(x){}return 'RELINK ERROR: '+e.toString();}
}
function EthanHub_enforceEditAudioName(){
    try{var c=EH_comp(),found=null;for(var i=1;i<=c.numLayers;i++){var l=c.layer(i);if(EH_kind(l)==='EDIT_AUDIO'||EH_low(l.name)==="ethan's edit audio"||EH_low(l.name)==='edit audio'){found=l;break;}}if(!found)return 'No Edit Audio layer found.';found.name='Edit Audio';found.enabled=false;found.audioEnabled=true;found.moveToEnd();return '✅ Edit Audio renamed and parked at the bottom.';}catch(e){return 'EDIT AUDIO FIX ERROR: '+e.toString();}
}
function EthanHub_backgroundBoot(){
    try{
        // Tiny one-shot helper: no high-frequency polling. Only initialize truly empty, unsaved projects.
        if(app.project && app.project.numItems===0 && !app.project.file)return EthanHub_initializeProject();
        return 'Background helper ready.';
    }catch(e){return 'Background helper: '+e.toString();}
}

function EthanHub_openNativePresetFolder(){
    try{var f=ETHAN_HUB_NATIVE_PRESETS||new Folder(Folder.myDocuments.fsName+'/Adobe/After Effects/Presets/Ethan Editing Hub');if(!f.exists)f.create();f.execute();return '✓ Opened the same preset folder After Effects searches natively.';}catch(e){return 'PRESET FOLDER ERROR: '+e.toString();}
}



// ============================================================
// ABOUT / WINDOWS DEVICE + LOW-COST AE PROCESS SNAPSHOT
// ============================================================
function EH_jsonEscape(s){return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r/g,' ').replace(/\n/g,' ');}
function EH_jsonSimple(o){var a=[],k,v;for(k in o){if(!o.hasOwnProperty(k))continue;v=o[k];if(typeof v==='number'||typeof v==='boolean')a.push('"'+EH_jsonEscape(k)+'":'+String(v));else a.push('"'+EH_jsonEscape(k)+'":"'+EH_jsonEscape(v)+'"');}return '{'+a.join(',')+'}';}
function EH_trimLine(s){return String(s||'').replace(/^\s+|\s+$/g,'');}
function EH_cmdFirst(cmd){try{var out=String(system.callSystem('cmd.exe /d /s /c '+EH_cmdQuote(cmd))||'').replace(/\r/g,'');var lines=out.split('\n');for(var i=0;i<lines.length;i++){var x=EH_trimLine(lines[i]);if(x)return x;}}catch(e){}return '';}
function EthanHub_aboutInfo(){
    try{
        var device='';try{device=$.getenv('COMPUTERNAME')||'';}catch(e0){}
        var cores='';try{cores=$.getenv('NUMBER_OF_PROCESSORS')||'';}catch(e1){}
        var cpu=EH_cmdFirst('powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty Name)"');
        var gpu=EH_cmdFirst('powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-CimInstance Win32_VideoController | Where-Object {$_.Name -notmatch \'Microsoft Basic\'} | Select-Object -ExpandProperty Name) -join \' + \'"');
        var ram=EH_cmdFirst('powershell -NoProfile -ExecutionPolicy Bypass -Command "[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory/1GB,1).ToString()+\' GB\'"');
        var coreDetail=EH_cmdFirst('powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-CimInstance Win32_Processor | Select-Object -First 1; ($p.NumberOfCores.ToString()+\' cores / \'+$p.NumberOfLogicalProcessors.ToString()+\' threads\')"');
        var ae='After Effects '+String(app.version||'');try{if(app.buildNumber)ae+=' • Build '+app.buildNumber;}catch(e2){}
        return EH_jsonSimple({ae:ae,device:device||'Windows PC',os:String($.os||'Windows'),cpu:cpu||'Unavailable',cores:coreDetail||cores||'Unavailable',ram:ram||'Unavailable',gpu:gpu||'Unavailable'});
    }catch(e){return EH_jsonSimple({ae:'After Effects',device:'Windows PC',os:String($.os||'Windows'),cpu:'Unavailable',cores:'Unavailable',ram:'Unavailable',gpu:'Unavailable'});}
}
function EthanHub_aboutPerformance(){
    try{
        var rendering=false;try{rendering=!!(app.project&&app.project.renderQueue&&app.project.renderQueue.rendering);}catch(er){}
        var cpu=-1,gpu=-1,mem=-1,memPct=-1;
        if(!rendering){
            try{var co=EH_cmdFirst('powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-Process AfterFX -ErrorAction SilentlyContinue | Select-Object -First 1;if($p){$c=(Get-Counter \'\\Process(AfterFX*)\\% Processor Time\' -SampleInterval 1 -MaxSamples 1 -ErrorAction SilentlyContinue).CounterSamples | Measure-Object CookedValue -Sum;[math]::Round(($c.Sum/[Environment]::ProcessorCount),1)}else{-1}"');cpu=parseFloat(co);if(isNaN(cpu))cpu=-1;}catch(e0){}
            try{var mo=EH_cmdFirst('powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-Process AfterFX -ErrorAction SilentlyContinue | Select-Object -First 1;if($p){[math]::Round($p.WorkingSet64/1MB,0)}else{-1}"');mem=parseFloat(mo);if(isNaN(mem))mem=-1;}catch(e1){}
            try{var gp=EH_cmdFirst('powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-Process AfterFX -ErrorAction SilentlyContinue | Select-Object -First 1;if(!$p){-1;exit};$pidText=\'pid_\'+$p.Id+\'_\';$s=(Get-Counter \'\\GPU Engine(*)\\Utilization Percentage\' -ErrorAction SilentlyContinue).CounterSamples | Where-Object {$_.Path -like (\'*\'+$pidText+\'*\')} | Measure-Object CookedValue -Sum;if($s.Count){[math]::Round([math]::Min(100,$s.Sum),1)}else{-1}"');gpu=parseFloat(gp);if(isNaN(gpu))gpu=-1;}catch(e2){}
            try{var total=EH_cmdFirst('powershell -NoProfile -ExecutionPolicy Bypass -Command "[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory/1MB,0)"');var tm=parseFloat(total);if(tm>0&&mem>=0)memPct=Math.min(100,mem/tm*100);}catch(e3){}
        }
        return EH_jsonSimple({rendering:rendering,cpuPercent:cpu,gpuPercent:gpu,memoryMB:mem,memoryPercent:memPct});
    }catch(e){return EH_jsonSimple({rendering:false,cpuPercent:-1,gpuPercent:-1,memoryMB:-1,memoryPercent:-1});}
}

// ============================================================
// SOFTWARE UPDATE 3.2.6 "UI POLISH — NEW VERSION" — preserves PowerShell/.NET ZIP transport from 3.2.5.5
// Remote packages REQUIRE SHA-256 verification. Dropbox folder transport downloads one public folder archive, then uses local base64 chunks.
// ============================================================
var ETHAN_UPDATE_VERSION = '3.2.7';
var ETHAN_UPDATE_BUILD = '3270';
var ETHAN_UPDATE_RELEASE = 'Permanent GitHub Channel';
var ETHAN_UPDATE_EXTENSION_ID = 'com.ethan.editinghub';

function EH_upJsonString(s){s=String(s==null?'':s);return '"'+s.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n')+'"';}
function EH_upJsonObj(o){
    var parts=[],k,v;
    for(k in o){if(!o.hasOwnProperty(k))continue;v=o[k];if(typeof v==='boolean'||typeof v==='number')parts.push(EH_upJsonString(k)+':'+String(v));else parts.push(EH_upJsonString(k)+':'+EH_upJsonString(v));}
    return '{'+parts.join(',')+'}';
}
function EH_updateRoot(){var f=new Folder(Folder.userData.fsName+'/EthanHubUpdater');if(!f.exists)f.create();return f;}
function EH_updateBackups(){var f=new Folder(EH_updateRoot().fsName+'/backups');if(!f.exists)f.create();return f;}
function EH_psQuote(s){return "'"+String(s).replace(/'/g,"''")+"'";}
function EH_cmdQuote(s){return '"'+String(s).replace(/"/g,'""')+'"';}
function EH_writeText(file,text){try{file.encoding='UTF-8';file.open('w');file.write(text);file.close();return true;}catch(e){try{file.close();}catch(x){}return false;}}
function EH_readText(file){try{file.encoding='UTF-8';file.open('r');var t=file.read();file.close();return t;}catch(e){try{file.close();}catch(x){}return '';}}
function EH_parseUpdateJson(text){try{return eval('('+text+')');}catch(e){return null;}}
function EH_versionParts(v){var a=String(v||'0').split('.'),out=[];for(var i=0;i<a.length;i++)out.push(parseInt(a[i],10)||0);return out;}
function EH_versionNewer(a,b){var A=EH_versionParts(a),B=EH_versionParts(b),n=Math.max(A.length,B.length);for(var i=0;i<n;i++){var x=A[i]||0,y=B[i]||0;if(x>y)return true;if(x<y)return false;}return false;}
function EH_isHttps(url){return /^https:\/\//i.test(String(url||''));}
function EH_isDropboxFolderFeed(url){return /^https:\/\/(?:www\.)?dropbox\.com\/scl\/fo\//i.test(String(url||''));}
function EH_forceDropboxDownloadUrl(url){
    var u=String(url||'').replace(/#.*$/,''),qpos=u.indexOf('?'),base=qpos>=0?u.substring(0,qpos):u,query=qpos>=0?u.substring(qpos+1):'',bits=query?query.split('&'):[],keep=[];
    for(var i=0;i<bits.length;i++){var bit=String(bits[i]||''),eq=bit.indexOf('='),key=(eq>=0?bit.substring(0,eq):bit).toLowerCase();if(!bit||key==='dl'||key==='st'||key==='raw')continue;keep.push(bit);}
    keep.push('dl=1');return base+'?'+keep.join('&');
}
function EH_safeChunkName(name){name=String(name||'');return !!name&&name.indexOf('..')<0&&name.indexOf('/')<0&&name.indexOf('\\')<0&&/^[0-9A-Za-z._-]+$/.test(name);}
function EH_archiveEntryByBasename(entries,name){
    name=String(name||'');
    if(!name||name.indexOf('..')>=0||name.indexOf('/')>=0||name.indexOf('\\')>=0||!/^[0-9A-Za-z._-]+$/.test(name))return '';
    var want=name.toLowerCase();
    for(var i=0;i<(entries||[]).length;i++){
        var e=String(entries[i]||'').replace(/\\/g,'/');
        while(e.length&&e.charAt(e.length-1)==='/')e=e.substring(0,e.length-1);
        var p=e.lastIndexOf('/'),base=p>=0?e.substring(p+1):e;
        if(base.toLowerCase()===want)return e;
    }
    return '';
}
function EH_safeArchiveEntry(entry){
    entry=String(entry||'').replace(/\\/g,'/');
    return !!entry&&entry.charAt(0)!=='/'&&entry.indexOf('..')<0&&entry.indexOf(':')<0&&entry.indexOf('%')<0&&entry.indexOf('!')<0&&entry.indexOf('&')<0&&entry.indexOf('|')<0&&entry.indexOf('<')<0&&entry.indexOf('>')<0&&entry.indexOf('"')<0&&/^[0-9A-Za-z _().\/\-]+$/.test(entry);
}
function EH_listArchiveEntries(zipFile){
    try{
        var root=EH_updateRoot(),stamp=(new Date()).getTime(),listFile=new File(root.fsName+'/zip_list_'+stamp+'.txt'),errFile=new File(root.fsName+'/zip_list_'+stamp+'.err.txt'),psFile=new File(root.fsName+'/zip_list_'+stamp+'.ps1');
        try{if(listFile.exists)listFile.remove();if(errFile.exists)errFile.remove();if(psFile.exists)psFile.remove();}catch(e0){}
        var ps=[
            "$ErrorActionPreference='Stop'",
            "Add-Type -AssemblyName System.IO.Compression.FileSystem",
            "$zip="+EH_psQuote(zipFile.fsName),
            "$out="+EH_psQuote(listFile.fsName),
            "$err="+EH_psQuote(errFile.fsName),
            "try {",
            "  $z=[System.IO.Compression.ZipFile]::OpenRead($zip)",
            "  try {",
            "    $lines=@($z.Entries | ForEach-Object { $_.FullName })",
            "    [System.IO.File]::WriteAllText($out,($lines -join [Environment]::NewLine),(New-Object System.Text.UTF8Encoding($false)))",
            "  } finally { $z.Dispose() }",
            "} catch {",
            "  [System.IO.File]::WriteAllText($err,$_.Exception.ToString(),(New-Object System.Text.UTF8Encoding($false)))",
            "  exit 41",
            "}"
        ].join('\r\n');
        if(!EH_writeText(psFile,ps))return {ok:false,error:'Could not create the PowerShell ZIP inspection helper.'};
        var r=EH_runTempCmd('ZIP_LIST_DOTNET',[ '@echo off','setlocal','powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File '+EH_cmdQuote(psFile.fsName),'set RC=%ERRORLEVEL%','echo __EH_EXIT__=%RC%','exit /b 0' ]);
        var out=EH_readText(listFile),err=EH_readText(errFile);
        try{if(listFile.exists)listFile.remove();if(errFile.exists)errFile.remove();if(psFile.exists)psFile.remove();}catch(e1){}
        if(!r.ok)return {ok:false,error:'Windows PowerShell/.NET could not inspect the Dropbox ZIP. '+String(err||r.out||'').replace(/\s+/g,' ').substring(0,700)};
        var lines=String(out||'').split(/\r?\n/),entries=[];
        for(var i=0;i<lines.length;i++){
            var line=String(lines[i]||'').replace(/^\s+|\s+$/g,'');
            if(!line)continue;
            entries.push(line);
        }
        if(!entries.length)return {ok:false,error:'Dropbox ZIP opened successfully, but Windows .NET reported no archive entries. Capture detail: '+String(err||r.out||'').replace(/\s+/g,' ').substring(0,500)};
        return {ok:true,entries:entries,detail:String(out||'')};
    }catch(e){return {ok:false,error:'Dropbox ZIP listing error: '+e.toString()};}
}
function EH_readArchiveEntryText(zipFile,entry){
    try{
        if(!EH_safeArchiveEntry(entry))return {ok:false,error:'Dropbox ZIP contains an unsafe archive path.'};
        var root=EH_updateRoot(),stamp=(new Date()).getTime(),outFile=new File(root.fsName+'/zip_read_'+stamp+'.txt'),errFile=new File(root.fsName+'/zip_read_'+stamp+'.err.txt'),psFile=new File(root.fsName+'/zip_read_'+stamp+'.ps1');
        try{if(outFile.exists)outFile.remove();if(errFile.exists)errFile.remove();if(psFile.exists)psFile.remove();}catch(e0){}
        var ps=[
            "$ErrorActionPreference='Stop'",
            "Add-Type -AssemblyName System.IO.Compression.FileSystem",
            "$zip="+EH_psQuote(zipFile.fsName),
            "$entryName="+EH_psQuote(entry),
            "$out="+EH_psQuote(outFile.fsName),
            "$err="+EH_psQuote(errFile.fsName),
            "try {",
            "  $z=[System.IO.Compression.ZipFile]::OpenRead($zip)",
            "  try {",
            "    $e=$z.Entries | Where-Object { $_.FullName -eq $entryName } | Select-Object -First 1",
            "    if($null -eq $e){ throw ('Archive entry not found: '+$entryName) }",
            "    $stream=$e.Open()",
            "    try {",
            "      $reader=New-Object System.IO.StreamReader($stream,[System.Text.Encoding]::UTF8,$true)",
            "      try { $text=$reader.ReadToEnd() } finally { $reader.Dispose() }",
            "    } finally { $stream.Dispose() }",
            "    [System.IO.File]::WriteAllText($out,$text,(New-Object System.Text.UTF8Encoding($false)))",
            "  } finally { $z.Dispose() }",
            "} catch {",
            "  [System.IO.File]::WriteAllText($err,$_.Exception.ToString(),(New-Object System.Text.UTF8Encoding($false)))",
            "  exit 42",
            "}"
        ].join('\r\n');
        if(!EH_writeText(psFile,ps))return {ok:false,error:'Could not create the PowerShell ZIP entry helper.'};
        var r=EH_runTempCmd('ZIP_READ_DOTNET',[ '@echo off','setlocal','powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File '+EH_cmdQuote(psFile.fsName),'set RC=%ERRORLEVEL%','echo __EH_EXIT__=%RC%','exit /b 0' ]);
        var text=EH_readText(outFile),err=EH_readText(errFile);
        try{if(outFile.exists)outFile.remove();if(errFile.exists)errFile.remove();if(psFile.exists)psFile.remove();}catch(e1){}
        if(!r.ok)return {ok:false,error:'Windows PowerShell/.NET could not read '+entry+'. '+String(err||r.out||'').replace(/\s+/g,' ').substring(0,700)};
        return {ok:true,text:String(text||'')};
    }catch(e){return {ok:false,error:'Dropbox ZIP entry read error: '+e.toString()};}
}
function EH_findNamedFileRecursive(folder,name,depth){
    try{if(!folder||depth<0)return null;folder=new Folder(folder.fsName);if(!folder.exists)return null;var direct=new File(folder.fsName+'/'+name);if(direct.exists)return direct;var kids=folder.getFiles('*');for(var i=0;i<kids.length;i++)if(kids[i] instanceof Folder){var hit=EH_findNamedFileRecursive(kids[i],name,depth-1);if(hit)return hit;}}catch(e){}return null;
}
function EH_runTempCmd(tag,lines){
    try{
        var root=EH_updateRoot(),cmd=new File(root.fsName+'/'+tag+'_'+(new Date()).getTime()+'.cmd');
        if(!EH_writeText(cmd,lines.join('\r\n')))return {ok:false,code:-1,out:'Could not write '+tag+' command file.'};
        var call='cmd.exe /d /s /c '+EH_cmdQuote(cmd.fsName);
        var out=String(system.callSystem(call)||'');
        var code=0;
        var marker='__EH_EXIT__=';
        var p=out.lastIndexOf(marker);
        if(p>=0){var tail=out.substring(p+marker.length);var mm=tail.match(/-?\d+/);if(mm)code=parseInt(mm[0],10)||0;}
        try{cmd.remove();}catch(e0){}
        return {ok:code===0,code:code,out:out};
    }catch(e){return {ok:false,code:-1,out:e.toString()};}
}
function EH_downloadTo(url,dest){
    if(!EH_isHttps(url))return {ok:false,error:'Updater only accepts HTTPS URLs.'};
    try{if(dest.exists)dest.remove();}catch(e0){}
    var r=EH_runTempCmd('DOWNLOAD',[ '@echo off','setlocal','where curl.exe >NUL 2>&1','if errorlevel 1 (echo CURL_NOT_FOUND&echo __EH_EXIT__=9009&exit /b 0)','curl.exe -L --fail --silent --show-error --connect-timeout 15 --max-time 90 -o '+EH_cmdQuote(dest.fsName)+' '+EH_cmdQuote(url),'set RC=%ERRORLEVEL%','echo __EH_EXIT__=%RC%','exit /b 0' ]);
    if(dest.exists&&dest.length>0)return {ok:true,method:'curl.exe'};
    return {ok:false,error:'Download failed with Windows curl.exe. '+String(r.out||'').replace(/\s+/g,' ').substring(0,700)};
}
function EH_parseSha256Output(text){
    var lines=String(text||'').toUpperCase().split(/\r?\n/);
    for(var i=0;i<lines.length;i++){
        var line=String(lines[i]||'').replace(/^\s+|\s+$/g,'');
        if(/^[A-F0-9]{64}$/.test(line))return line;
        var compact=line.replace(/\s+/g,'');
        if(/^[A-F0-9]{64}$/.test(compact))return compact;
    }
    return '';
}
function EH_shaMismatchMessage(expected,result){
    var want=String(expected||'').replace(/\s/g,'').toUpperCase();
    var got=result&&result.hash?String(result.hash).replace(/\s/g,'').toUpperCase():'unavailable';
    var method=result&&result.method?String(result.method):'none';
    var detail=result&&result.detail?String(result.detail).replace(/\s+/g,' ').substring(0,700):'';
    return 'SHA-256 verification FAILED. The update was not installed.\nExpected: '+want+'\nActual: '+got+'\nMethod: '+method+(detail?'\nDetail: '+detail:'');
}
function EH_psSingleQuote(v){return "'"+String(v||'').replace(/'/g,"''")+"'";}
function EH_manifestHasPackage(m){
    if(!m)return false;
    if(m.packageUrl&&EH_isHttps(m.packageUrl))return true;
    if(String(m.packageEncoding||'')==='base64-chunks'&&m.packageParts&&m.packageParts.length){
        for(var i=0;i<m.packageParts.length;i++)if(!EH_isHttps(m.packageParts[i]))return false;
        return true;
    }
    if(String(m.packageEncoding||'')==='dropbox-folder-chunks'&&m.packageParts&&m.packageParts.length&&m.__dropboxArchivePath){
        for(var j=0;j<m.packageParts.length;j++)if(!EH_safeChunkName(m.packageParts[j]))return false;
        return true;
    }
    return false;
}
function EH_decodeBase64File(source,dest){
    try{if(dest.exists)dest.remove();}catch(e0){}
    var r=EH_runTempCmd('BASE64_DECODE',[ '@echo off','setlocal','certutil -f -decode '+EH_cmdQuote(source.fsName)+' '+EH_cmdQuote(dest.fsName),'set RC=%ERRORLEVEL%','echo __EH_EXIT__=%RC%','exit /b 0' ]);
    if(dest.exists&&dest.length>0)return {ok:true,method:'certutil -decode'};
    try{if(dest.exists)dest.remove();}catch(e1){}
    var ps="powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command \"$ErrorActionPreference='Stop'; [IO.File]::WriteAllBytes("+EH_psSingleQuote(dest.fsName)+",[Convert]::FromBase64String([IO.File]::ReadAllText("+EH_psSingleQuote(source.fsName)+")))\"";
    var r2=EH_runTempCmd('BASE64_DECODE_PS',[ '@echo off','setlocal',ps,'set RC=%ERRORLEVEL%','echo __EH_EXIT__=%RC%','exit /b 0' ]);
    if(dest.exists&&dest.length>0)return {ok:true,method:'PowerShell Convert.FromBase64String'};
    return {ok:false,error:'Base64 package decode failed. certutil: '+String(r.out||'').replace(/\s+/g,' ').substring(0,300)+' | PowerShell: '+String(r2.out||'').replace(/\s+/g,' ').substring(0,300)};
}
function EH_downloadChunkedBase64Package(m,dest){
    try{
        var parts=m.packageParts||[];
        if(!parts.length)return {ok:false,error:'Chunked package has no packageParts.'};
        var root=EH_updateRoot(),combined=new File(root.fsName+'/package_'+(new Date()).getTime()+'.b64'),all='';
        for(var i=0;i<parts.length;i++){
            if(!EH_isHttps(parts[i]))return {ok:false,error:'Chunk '+(i+1)+' does not use HTTPS.'};
            var pf=new File(root.fsName+'/chunk_'+('000'+(i+1)).slice(-3)+'.b64');
            var dl=EH_downloadTo(String(parts[i]),pf);if(!dl.ok)return {ok:false,error:'Chunk '+(i+1)+'/'+parts.length+' download failed. '+dl.error};
            var text=EH_readText(pf);if(!text)return {ok:false,error:'Chunk '+(i+1)+' downloaded empty.'};
            all+=String(text).replace(/\s+/g,'');
            try{pf.remove();}catch(rx){}
        }
        if(!EH_writeText(combined,all))return {ok:false,error:'Could not assemble base64 update package.'};
        var dec=EH_decodeBase64File(combined,dest);try{combined.remove();}catch(rc){}
        if(!dec.ok)return dec;
        return {ok:true,method:'base64-chunks -> '+dec.method,parts:parts.length};
    }catch(e){return {ok:false,error:'Chunked package error: '+e.toString()};}
}
function EH_downloadDropboxFolderChunks(m,dest){
    try{
        var parts=m.packageParts||[],archive=new File(String(m.__dropboxArchivePath||'')),entries=m.__dropboxArchiveEntries||[];
        if(!archive.exists)return {ok:false,error:'Dropbox OTA bundle archive is unavailable.'};
        if(!parts.length)return {ok:false,error:'Dropbox OTA package has no packageParts.'};
        if(!entries.length){var listed=EH_listArchiveEntries(archive);if(!listed.ok)return listed;entries=listed.entries;}
        var root=EH_updateRoot(),combined=new File(root.fsName+'/dropbox_package_'+(new Date()).getTime()+'.b64'),all='';
        for(var i=0;i<parts.length;i++){
            if(!EH_safeChunkName(parts[i]))return {ok:false,error:'Dropbox OTA chunk '+(i+1)+' has an unsafe filename.'};
            var entry=EH_archiveEntryByBasename(entries,String(parts[i]));if(!entry)return {ok:false,error:'Dropbox OTA chunk '+(i+1)+'/'+parts.length+' is missing from the shared-folder ZIP: '+String(parts[i])};
            var rd=EH_readArchiveEntryText(archive,entry);if(!rd.ok)return rd;
            var text=String(rd.text||'').replace(/\s+/g,'');if(!text)return {ok:false,error:'Dropbox OTA chunk '+(i+1)+' is empty.'};all+=text;
        }
        if(!EH_writeText(combined,all))return {ok:false,error:'Could not assemble Dropbox OTA base64 package.'};
        var dec=EH_decodeBase64File(combined,dest);try{combined.remove();}catch(e0){}if(!dec.ok)return dec;
        return {ok:true,method:'Dropbox folder ZIP stream -> '+dec.method,parts:parts.length};
    }catch(e){return {ok:false,error:'Dropbox OTA package error: '+e.toString()};}
}
function EH_downloadManifestPackage(m,dest){
    if(m.packageUrl&&EH_isHttps(m.packageUrl))return EH_downloadTo(String(m.packageUrl),dest);
    if(String(m.packageEncoding||'')==='base64-chunks')return EH_downloadChunkedBase64Package(m,dest);
    if(String(m.packageEncoding||'')==='dropbox-folder-chunks')return EH_downloadDropboxFolderChunks(m,dest);
    return {ok:false,error:'Update manifest does not contain a supported package transport.'};
}
function EH_sha256Detailed(file){
    var certHash='',psHash='',certOut='',psOut='';
    var root=EH_updateRoot(),stamp=(new Date()).getTime(),certFile=new File(root.fsName+'/sha_cert_'+stamp+'.txt'),certErr=new File(root.fsName+'/sha_cert_'+stamp+'.err.txt'),psFile=new File(root.fsName+'/sha_ps_'+stamp+'.txt'),psErr=new File(root.fsName+'/sha_ps_'+stamp+'.err.txt'),psScript=new File(root.fsName+'/sha_ps_'+stamp+'.ps1');
    try{
        try{if(certFile.exists)certFile.remove();if(certErr.exists)certErr.remove();}catch(c0){}
        var c=EH_runTempCmd('SHA256_CERTUTIL_OUT',[ '@echo off','setlocal','certutil -hashfile '+EH_cmdQuote(file.fsName)+' SHA256 > '+EH_cmdQuote(certFile.fsName)+' 2> '+EH_cmdQuote(certErr.fsName),'set RC=%ERRORLEVEL%','echo __EH_EXIT__=%RC%','exit /b 0' ]);
        certOut=EH_readText(certFile);certHash=EH_parseSha256Output(certOut);
        if(!certHash){var ce=EH_readText(certErr);if(ce)certOut=certOut+' '+ce;if(c&&c.out)certOut=certOut+' '+String(c.out);}
    }catch(e0){certOut=e0.toString();}
    try{
        try{if(psFile.exists)psFile.remove();if(psErr.exists)psErr.remove();if(psScript.exists)psScript.remove();}catch(p0){}
        var ps=[
            "$ErrorActionPreference='Stop'",
            "$hash=(Get-FileHash -LiteralPath "+EH_psQuote(file.fsName)+" -Algorithm SHA256).Hash",
            "[System.IO.File]::WriteAllText("+EH_psQuote(psFile.fsName)+",$hash,(New-Object System.Text.UTF8Encoding($false)))"
        ].join('\r\n');
        if(!EH_writeText(psScript,ps))throw new Error('Could not create PowerShell SHA helper.');
        var r=EH_runTempCmd('SHA256_POWERSHELL_OUT',[ '@echo off','setlocal','powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File '+EH_cmdQuote(psScript.fsName)+' 2> '+EH_cmdQuote(psErr.fsName),'set RC=%ERRORLEVEL%','echo __EH_EXIT__=%RC%','exit /b 0' ]);
        psOut=EH_readText(psFile);psHash=EH_parseSha256Output(psOut);
        if(!psHash){var pe=EH_readText(psErr);if(pe)psOut=psOut+' '+pe;if(r&&r.out)psOut=psOut+' '+String(r.out);}
    }catch(e1){psOut=e1.toString();}
    try{if(certFile.exists)certFile.remove();if(certErr.exists)certErr.remove();if(psFile.exists)psFile.remove();if(psErr.exists)psErr.remove();if(psScript.exists)psScript.remove();}catch(cleanErr){}
    if(certHash&&psHash){
        if(certHash===psHash)return {ok:true,hash:certHash,method:'certutil + Get-FileHash',detail:'Both Windows hash engines agreed via temp-file capture.'};
        return {ok:false,hash:certHash,method:'certutil/Get-FileHash disagreement',detail:'certutil='+certHash+' | Get-FileHash='+psHash};
    }
    if(certHash)return {ok:true,hash:certHash,method:'certutil',detail:'Get-FileHash fallback unavailable: '+String(psOut||'').replace(/\s+/g,' ').substring(0,350)};
    if(psHash)return {ok:true,hash:psHash,method:'Get-FileHash',detail:'certutil unavailable: '+String(certOut||'').replace(/\s+/g,' ').substring(0,350)};
    return {ok:false,hash:'',method:'certutil + Get-FileHash',detail:'certutil: '+String(certOut||'').replace(/\s+/g,' ').substring(0,300)+' | Get-FileHash: '+String(psOut||'').replace(/\s+/g,' ').substring(0,300)};
}
function EH_extractZip(zipFile,stage){
    try{
        var qstage=EH_cmdQuote(stage.fsName);
        var r=EH_runTempCmd('EXTRACT',[ '@echo off','setlocal','where tar.exe >NUL 2>&1','if errorlevel 1 (echo TAR_NOT_FOUND&echo __EH_EXIT__=9009&exit /b 0)','tar.exe -xf '+EH_cmdQuote(zipFile.fsName)+' -C '+qstage,'set RC=%ERRORLEVEL%','if not "%RC%"=="0" (echo __EH_FILES__=0&echo __EH_EXIT__=%RC%&exit /b 0)','dir /b /a '+qstage+' 2>NUL | findstr /R /C:"." >NUL','if errorlevel 1 (echo __EH_FILES__=0) else (echo __EH_FILES__=1)','echo __EH_EXIT__=0','exit /b 0' ]);
        var hasFiles=String(r.out||'').indexOf('__EH_FILES__=1')>=0;
        if(r.ok&&hasFiles)return {ok:true,method:'tar.exe',detail:String(r.out||'')};
        return {ok:false,error:'ZIP extraction failed with Windows tar.exe. '+String(r.out||'').replace(/\s+/g,' ').substring(0,700)};
    }catch(e){return {ok:false,error:'ZIP extraction error: '+e.toString()};}
}
function EH_validateManifest(m,currentVersion){
    if(!m)return 'Manifest is not valid JSON.';
    if(String(m.extensionId||'')!==ETHAN_UPDATE_EXTENSION_ID)return 'Manifest extensionId must be '+ETHAN_UPDATE_EXTENSION_ID+'.';
    if(!m.version)return 'Manifest has no version.';
    var mode=String(m.packageMode||'full');if(mode!=='full'&&mode!=='overlay')return 'Manifest packageMode must be full or overlay.';
    if(!EH_manifestHasPackage(m))return 'Manifest must contain a supported direct, HTTPS chunked, or Dropbox-folder package transport.';
    if(!m.sha256||String(m.sha256).replace(/\s/g,'').length!==64)return 'Manifest must include a 64-character SHA-256 checksum.';
    return '';
}
function EH_manifestForDropboxFolder(feedUrl){
    try{
        var root=EH_updateRoot(),archive=new File(root.fsName+'/dropbox_ota_bundle.zip');
        try{if(archive.exists)archive.remove();}catch(e0){}
        var direct=EH_forceDropboxDownloadUrl(feedUrl),dl=EH_downloadTo(direct,archive);if(!dl.ok)return {ok:false,error:'Dropbox OTA folder download failed. '+dl.error};
        var listed=EH_listArchiveEntries(archive);if(!listed.ok)return {ok:false,error:'Dropbox OTA folder downloaded, but its ZIP could not be inspected. '+listed.error};
        var entry=EH_archiveEntryByBasename(listed.entries,'latest.json');if(!entry)return {ok:false,error:'Dropbox OTA folder ZIP does not contain latest.json. Archive entries: '+listed.entries.slice(0,12).join(', ')};
        var rd=EH_readArchiveEntryText(archive,entry);if(!rd.ok)return {ok:false,error:rd.error};
        var m=EH_parseUpdateJson(rd.text);if(!m)return {ok:false,error:'Dropbox OTA latest.json is invalid.'};m.__dropboxArchivePath=archive.fsName;m.__dropboxArchiveEntries=listed.entries;
        return {ok:true,manifest:m,method:'Dropbox shared folder ZIP stream'};
    }catch(e){return {ok:false,error:'Dropbox OTA feed error: '+e.toString()};}
}
function EH_manifestForFeed(feedUrl){
    if(EH_isDropboxFolderFeed(feedUrl))return EH_manifestForDropboxFolder(feedUrl);
    var root=EH_updateRoot(),mf=new File(root.fsName+'/latest.json');try{if(mf.exists)mf.remove();}catch(e0){}
    var dl=EH_downloadTo(feedUrl,mf);if(!dl.ok)return {ok:false,error:dl.error};
    var txt=EH_readText(mf),m=EH_parseUpdateJson(txt);if(!m)return {ok:false,error:'Update feed downloaded, but latest.json is invalid.'};
    return {ok:true,manifest:m};
}
function EthanHub_updateInfo(){return EH_upJsonObj({ok:true,version:ETHAN_UPDATE_VERSION,build:ETHAN_UPDATE_BUILD,name:ETHAN_UPDATE_RELEASE,extensionId:ETHAN_UPDATE_EXTENSION_ID});}
function EthanHub_checkForUpdates(feedUrl,currentVersion){
    try{
        if(!EH_isHttps(feedUrl))return EH_upJsonObj({ok:false,error:'Software Update needs an HTTPS feed URL.'});
        var r=EH_manifestForFeed(feedUrl);if(!r.ok)return EH_upJsonObj({ok:false,error:r.error});var m=r.manifest;
        if(String(m.extensionId||'')!==ETHAN_UPDATE_EXTENSION_ID)return EH_upJsonObj({ok:false,error:'This feed belongs to '+String(m.extensionId||'another extension')+'.'});
        return EH_upJsonObj({ok:true,extensionId:ETHAN_UPDATE_EXTENSION_ID,updateAvailable:EH_versionNewer(String(m.version),String(currentVersion||ETHAN_UPDATE_VERSION)),version:String(m.version||''),build:String(m.build||''),name:String(m.name||'Ethan Hub Update'),notes:String(m.notes||''),sizeLabel:String(m.sizeLabel||''),packageUrl:String(m.packageUrl||''),packageReady:EH_manifestHasPackage(m),packageEncoding:String(m.packageEncoding||'direct'),packageMode:String(m.packageMode||'full'),sha256:String(m.sha256||'')});
    }catch(e){return EH_upJsonObj({ok:false,error:'CHECK ERROR: '+e.toString()});}
}
function EH_findPayload(stage,packageMode){
    var mode=String(packageMode||'full'),cands=[new Folder(stage.fsName+'/payload/com.ethan.editinghub'),new Folder(stage.fsName+'/com.ethan.editinghub'),stage];
    for(var i=0;i<cands.length;i++){
        if(mode==='overlay'){
            var marker=new File(cands[i].fsName+'/updater/overlay_release.json');if(marker.exists){var meta=EH_parseUpdateJson(EH_readText(marker));if(meta&&String(meta.extensionId||'')===ETHAN_UPDATE_EXTENSION_ID)return cands[i];}
        }else{
            var a=new File(cands[i].fsName+'/index.html'),b=new File(cands[i].fsName+'/CSXS/manifest.xml'),c=new File(cands[i].fsName+'/jsx/backend.jsx');if(a.exists&&b.exists&&c.exists)return cands[i];
        }
    }
    return null;
}
function EH_launchDetachedInstaller(cmd,logFile){
    try{
        var root=EH_updateRoot(),vbs=new File(root.fsName+'/LAUNCH_PENDING_UPDATE.vbs');
        var child='cmd.exe /d /c call '+EH_cmdQuote(cmd.fsName)+' >> '+EH_cmdQuote(logFile.fsName)+' 2>&1';
        var escaped=String(child).replace(/"/g,'""');
        var vb=['On Error Resume Next','Set sh = CreateObject("WScript.Shell")','rc = sh.Run("'+escaped+'", 0, false)','If Err.Number <> 0 Then WScript.Quit 1','WScript.Quit 0'];
        if(!EH_writeText(vbs,vb.join('\r\n')))return {ok:false,error:'Could not create the detached FreeFlow launcher.'};
        var out=String(system.callSystem('wscript.exe //B //Nologo '+EH_cmdQuote(vbs.fsName))||'');
        return {ok:true,detail:out};
    }catch(e){return {ok:false,error:'Could not launch the detached FreeFlow installer: '+e.toString()};}
}
function EH_makeInstallCmd(payload,sourceVersion,targetVersion,packageMode){
    var root=EH_updateRoot(),backs=EH_updateBackups(),cmd=new File(root.fsName+'/INSTALL_PENDING_UPDATE.cmd'),logFile=new File(root.fsName+'/freeflow_update.log');
    var stamp=(new Date()).getTime(),backup=new Folder(backs.fsName+'/'+String(sourceVersion||ETHAN_UPDATE_VERSION).replace(/[^0-9A-Za-z._-]/g,'_')+'_'+stamp);
    var ext=ETHAN_HUB_EXT,mode=(String(packageMode||'full')==='overlay'?'overlay':'full'),copySwitch=(mode==='overlay'?'/E':'/MIR');
    var lines=['@echo off','setlocal EnableExtensions EnableDelayedExpansion','title Ethan Editing Hub Software Update','echo FREEFLOW_START '+stamp,'echo Update: '+String(sourceVersion||'current')+' to '+String(targetVersion||'new'),'echo Package mode: '+mode,'set /a WAIT_COUNT=0',':WAITAE','tasklist /FI "IMAGENAME eq AfterFX.exe" 2>NUL | find /I "AfterFX.exe" >NUL','if not errorlevel 1 (','  set /a WAIT_COUNT+=1','  if !WAIT_COUNT! GEQ 300 (','    echo FREEFLOW_TIMEOUT: AfterFX.exe remained open for 600 seconds.','    exit /b 20','  )','  timeout /t 2 /nobreak >NUL','  goto WAITAE',')','echo Backing up current Hub...','if not exist '+EH_cmdQuote(backup.fsName)+' mkdir '+EH_cmdQuote(backup.fsName),'robocopy '+EH_cmdQuote(ext)+' '+EH_cmdQuote(backup.fsName)+' /E /COPY:DAT /R:1 /W:1 /NFL /NDL /NJH /NJS >NUL','set BACK_RC=!ERRORLEVEL!','if !BACK_RC! GEQ 8 (echo FREEFLOW_BACKUP_FAILED: robocopy exit !BACK_RC!&exit /b 21)','echo Installing verified update...','robocopy '+EH_cmdQuote(payload.fsName)+' '+EH_cmdQuote(ext)+' '+copySwitch+' /COPY:DAT /R:2 /W:1 /NFL /NDL /NJH /NJS >NUL','set INSTALL_RC=!ERRORLEVEL!','if !INSTALL_RC! GEQ 8 (echo FREEFLOW_INSTALL_FAILED: robocopy exit !INSTALL_RC!&exit /b 22)','echo '+String(targetVersion||'updated')+' > '+EH_cmdQuote(root.fsName+'/last_installed_version.txt'),'echo FREEFLOW_COMPLETE: '+String(targetVersion||'updated'),'echo Backup: '+backup.fsName,'endlocal','exit /b 0'];
    if(!EH_writeText(cmd,lines.join('\r\n')))return {ok:false,error:'Could not create the staged installer.'};
    var launched=EH_launchDetachedInstaller(cmd,logFile);if(!launched.ok)return launched;
    return {ok:true,backupHint:backup.fsName,cmd:cmd.fsName,log:logFile.fsName};
}
function EH_stageUpdateZip(zipFile,sourceVersion,targetVersion,expectedSha,packageMode){
    try{
        if(!zipFile||!zipFile.exists)return {ok:false,error:'Update ZIP does not exist.'};
        if(expectedSha){var want=String(expectedSha).replace(/\s/g,'').toUpperCase(),hashResult=EH_sha256Detailed(zipFile);if(!hashResult.ok||hashResult.hash!==want)return {ok:false,error:EH_shaMismatchMessage(want,hashResult)};}
        var mode=(String(packageMode||'full')==='overlay'?'overlay':'full'),root=EH_updateRoot(),stage=new Folder(root.fsName+'/stage');
        try{if(stage.exists)system.callSystem('cmd.exe /c rmdir /s /q '+EH_cmdQuote(stage.fsName));}catch(e0){}if(!stage.exists)stage.create();
        var ex=EH_extractZip(zipFile,stage);if(!ex.ok)return {ok:false,error:ex.error};
        var payload=EH_findPayload(stage,mode);if(!payload){var names=[];try{var ff=stage.getFiles();for(var zi=0;zi<ff.length;zi++)names.push(ff[zi].name);}catch(zx){}return {ok:false,error:'ZIP extracted, but Ethan Hub '+mode+' payload files were not found. Top-level extracted items: '+names.join(', ')};}
        if(mode==='overlay'){
            var markerFile=new File(payload.fsName+'/updater/overlay_release.json'),marker=EH_parseUpdateJson(EH_readText(markerFile));if(!marker||String(marker.extensionId||'')!==ETHAN_UPDATE_EXTENSION_ID)return {ok:false,error:'Overlay update identity check failed.'};
            if(targetVersion&&targetVersion!=='local update'&&marker.version&&String(marker.version)!==String(targetVersion))return {ok:false,error:'Overlay update version marker does not match the feed.'};
        }else{
            var idCheck=EH_readText(new File(payload.fsName+'/CSXS/manifest.xml'));if(idCheck.indexOf('com.ethan.editinghub')<0)return {ok:false,error:'Update package identity check failed.'};
        }
        return EH_makeInstallCmd(payload,sourceVersion,targetVersion,mode);
    }catch(e){return {ok:false,error:'STAGE ERROR: '+e.toString()};}
}
function EH_backgroundUpdateDir(){var d=new Folder(EH_updateRoot().fsName+'/background');if(!d.exists)d.create();return d;}
function EH_backgroundJobSafe(jobId){return /^[0-9A-Za-z._-]+$/.test(String(jobId||''));}
function EH_backgroundStatusFile(jobId){return new File(EH_backgroundUpdateDir().fsName+'/'+String(jobId)+'.json');}
function EH_backgroundWorkerFile(){return new File(String(ETHAN_HUB_EXT)+'/updater/background_prepare.ps1');}
function EthanHub_startBackgroundUpdate(feedUrl,currentVersion){
    try{
        var worker=EH_backgroundWorkerFile();if(!worker.exists)return EH_upJsonObj({ok:false,error:'Background updater worker is missing. Reinstall Ethan Hub 3.2.6 Easy Fix.'});
        var feed=String(feedUrl||'');if(!/^https:\/\//i.test(feed))return EH_upJsonObj({ok:false,error:'Background updater requires an HTTPS feed.'});
        var job='job_'+(new Date()).getTime()+'_'+Math.floor(Math.random()*1000000),dir=EH_backgroundUpdateDir(),status=EH_backgroundStatusFile(job),vbs=new File(dir.fsName+'/launch_'+job+'.vbs');
        EH_writeText(status,EH_upJsonObj({ok:true,state:'starting',pct:4,message:'Starting background update preparation…',jobId:job}));
        var args='powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File '+EH_cmdQuote(worker.fsName)+' -FeedUrl '+EH_cmdQuote(feed)+' -CurrentVersion '+EH_cmdQuote(String(currentVersion||ETHAN_UPDATE_VERSION))+' -ExtensionPath '+EH_cmdQuote(String(ETHAN_HUB_EXT))+' -StateRoot '+EH_cmdQuote(EH_updateRoot().fsName)+' -JobId '+EH_cmdQuote(job);
        var escaped=String(args).replace(/"/g,'""');
        var vb=['On Error Resume Next','Set sh = CreateObject("WScript.Shell")','rc = sh.Run("'+escaped+'", 0, false)','If Err.Number <> 0 Then WScript.Quit 1','WScript.Quit 0'];
        if(!EH_writeText(vbs,vb.join('\r\n')))return EH_upJsonObj({ok:false,error:'Could not create background updater launcher.'});
        system.callSystem('wscript.exe //B //Nologo '+EH_cmdQuote(vbs.fsName));
        return EH_upJsonObj({ok:true,state:'started',pct:5,message:'Background preparation started.',jobId:job});
    }catch(e){return EH_upJsonObj({ok:false,error:'BACKGROUND START ERROR: '+e.toString()});}
}
function EthanHub_pollBackgroundUpdate(jobId){
    try{
        var job=String(jobId||'');if(!EH_backgroundJobSafe(job))return EH_upJsonObj({ok:false,state:'error',error:'Invalid background update job id.'});
        var f=EH_backgroundStatusFile(job);if(!f.exists)return EH_upJsonObj({ok:true,state:'starting',pct:5,message:'Background worker is starting…',jobId:job});
        var txt=EH_readText(f),obj=EH_parseUpdateJson(txt);if(!obj)return EH_upJsonObj({ok:true,state:'working',pct:8,message:'Background worker is updating status…',jobId:job});
        return txt;
    }catch(e){return EH_upJsonObj({ok:false,state:'error',error:'BACKGROUND POLL ERROR: '+e.toString()});}
}
function EthanHub_prepareUpdate(feedUrl,currentVersion){
    try{
        var r=EH_manifestForFeed(feedUrl);if(!r.ok)return EH_upJsonObj({ok:false,error:r.error});var m=r.manifest,err=EH_validateManifest(m,currentVersion);if(err)return EH_upJsonObj({ok:false,error:err});if(!EH_versionNewer(String(m.version),String(currentVersion||ETHAN_UPDATE_VERSION)))return EH_upJsonObj({ok:false,error:'The feed does not contain a newer version.'});
        var root=EH_updateRoot(),zip=new File(root.fsName+'/EthanHub_'+String(m.version).replace(/[^0-9A-Za-z._-]/g,'_')+'.zip');try{if(zip.exists)zip.remove();}catch(e0){}
        var dl=EH_downloadManifestPackage(m,zip);if(!dl.ok)return EH_upJsonObj({ok:false,error:dl.error});
        var staged=EH_stageUpdateZip(zip,currentVersion,String(m.version),String(m.sha256),String(m.packageMode||'full'));if(!staged.ok)return EH_upJsonObj({ok:false,error:staged.error});return EH_upJsonObj({ok:true,version:String(m.version),name:String(m.name||''),backupHint:String(staged.backupHint||'automatic')});
    }catch(e){return EH_upJsonObj({ok:false,error:'UPDATE ERROR: '+e.toString()});}
}
function EthanHub_installLocalUpdate(currentVersion){
    try{
        var zip=File.openDialog('Choose an Ethan Editing Hub update ZIP','*.zip',false);if(!zip)return EH_upJsonObj({ok:false,cancelled:true,error:'No update package selected.'});
        var staged=EH_stageUpdateZip(zip,currentVersion,'local update','','full');if(!staged.ok)return EH_upJsonObj({ok:false,error:staged.error});return EH_upJsonObj({ok:true,backupHint:String(staged.backupHint||'automatic')});
    }catch(e){return EH_upJsonObj({ok:false,error:'LOCAL UPDATE ERROR: '+e.toString()});}
}
function EthanHub_restorePreviousVersion(){
    try{
        var backs=EH_updateBackups(),folders=backs.getFiles(function(f){return f instanceof Folder;}),latest=null,mt=0;
        for(var i=0;i<folders.length;i++){var d=0;try{d=folders[i].modified.getTime();}catch(e0){d=i+1;}if(!latest||d>=mt){latest=folders[i];mt=d;}}
        if(!latest)return EH_upJsonObj({ok:false,error:'No automatic Software Update backup exists yet.'});
        var root=EH_updateRoot(),cmd=new File(root.fsName+'/RESTORE_PREVIOUS_VERSION.cmd'),ext=ETHAN_HUB_EXT;
        var logFile=new File(root.fsName+'/freeflow_restore.log');
        var lines=['@echo off','setlocal EnableExtensions EnableDelayedExpansion','title Restore Ethan Editing Hub','echo FREEFLOW_RESTORE_START','set /a WAIT_COUNT=0',':WAITAE','tasklist /FI "IMAGENAME eq AfterFX.exe" 2>NUL | find /I "AfterFX.exe" >NUL','if not errorlevel 1 (','  set /a WAIT_COUNT+=1','  if !WAIT_COUNT! GEQ 300 (echo FREEFLOW_TIMEOUT: AfterFX.exe remained open for 600 seconds.&exit /b 20)','  timeout /t 2 /nobreak >NUL','  goto WAITAE',')','echo Restoring previous Hub from: '+latest.fsName,'robocopy '+EH_cmdQuote(latest.fsName)+' '+EH_cmdQuote(ext)+' /MIR /COPY:DAT /R:2 /W:1 /NFL /NDL /NJH /NJS >NUL','set RESTORE_RC=!ERRORLEVEL!','if !RESTORE_RC! GEQ 8 (echo FREEFLOW_RESTORE_FAILED: robocopy exit !RESTORE_RC!&exit /b 22)','echo FREEFLOW_RESTORE_COMPLETE','endlocal','exit /b 0'];
        if(!EH_writeText(cmd,lines.join('\r\n')))return EH_upJsonObj({ok:false,error:'Could not create rollback script.'});var launched=EH_launchDetachedInstaller(cmd,logFile);if(!launched.ok)return EH_upJsonObj({ok:false,error:launched.error});return EH_upJsonObj({ok:true,backup:String(latest.fsName)});
    }catch(e){return EH_upJsonObj({ok:false,error:'ROLLBACK ERROR: '+e.toString()});}
}

