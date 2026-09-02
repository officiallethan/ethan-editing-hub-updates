/*
Ethan's Editing Hub PREMIUM
Adobe After Effects dockable ScriptUI panel

INSTALL:
/Applications/Adobe After Effects 2025/Scripts/ScriptUI Panels/

Then restart After Effects and open:
Window > Ethan's Editing Hub PREMIUM

Notes:
- Automatic tools are clip-relative, not comp-time-0-relative.
- Every keyframe created by this Hub is set to Bezier + temporal Easy Ease.
- "Safe Precomp" uses AE's native precompose command and does NOT rewrite child startTime.
- CapCut-named tools are AE recreations/approximations using AE effects.
- BCC Ripple Dissolve is added only if that installed effect is exposed by its display name.
*/

(function EthansEditingHubPREMIUM(thisObj) {

    // ============================================================
    // CORE
    // ============================================================

    var PREMIUM_SETTINGS_SECTION = "EthansEditingHubPREMIUM";
    var ACTIVE_RUN_TAG = "";

    function runTagSuffix() {
        return ACTIVE_RUN_TAG ? " [RUN:" + ACTIVE_RUN_TAG + "]" : "";
    }

    function tagLayer(layer) {
        if (!layer || !ACTIVE_RUN_TAG) return;
        try { layer.comment = "ETHAN_PREMIUM_RUN:" + ACTIVE_RUN_TAG; } catch (e0) {}
    }

    function presetRootDefault() {
        // Default to the bundled preset folder placed beside this ScriptUI panel.
        // This makes the PREMIUM package work immediately after copying both
        // the JSX and preset folder into ScriptUI Panels.
        try {
            return new Folder($.fileName).parent.fsName +
                "/Ethans Editing Hub PREMIUM Presets";
        } catch (e0) {
            return Folder.myDocuments.fsName + "/Ethans Editing Hub PREMIUM Presets";
        }
    }

    function ensureFolder(folder) {
        try { if (!folder.exists) folder.create(); } catch (e0) {}
        return folder;
    }

    function getPresetRoot() {
        var path = presetRootDefault();

        try {
            if (app.settings.haveSetting(PREMIUM_SETTINGS_SECTION, "presetRoot")) {
                path = app.settings.getSetting(PREMIUM_SETTINGS_SECTION, "presetRoot");
            }
        } catch (e0) {}

        var root = ensureFolder(new Folder(path));
        ensureFolder(new Folder(root.fsName + "/Favorite Presets"));
        ensureFolder(new Folder(root.fsName + "/ZOOMS"));
        ensureFolder(new Folder(root.fsName + "/Jaws"));
        ensureFolder(new Folder(root.fsName + "/Text"));
        return root;
    }

    function choosePresetRoot() {
        var chosen = Folder.selectDialog("Choose Ethan's preset folder");
        if (!chosen) return null;

        try {
            app.settings.saveSetting(
                PREMIUM_SETTINGS_SECTION,
                "presetRoot",
                chosen.fsName
            );
        } catch (e0) {}

        ensureFolder(chosen);
        ensureFolder(new Folder(chosen.fsName + "/Favorite Presets"));
        ensureFolder(new Folder(chosen.fsName + "/ZOOMS"));
        ensureFolder(new Folder(chosen.fsName + "/Jaws"));
        ensureFolder(new Folder(chosen.fsName + "/Text"));
        return chosen;
    }

    function presetFolder(subfolder) {
        var root = getPresetRoot();
        return ensureFolder(new Folder(root.fsName + "/" + subfolder));
    }

    function fileDisplayName(file) {
        var n = "";
        try { n = decodeURI(file.name); } catch (e0) { n = file.name; }
        return n;
    }

    function fileBaseName(file) {
        return fileDisplayName(file).replace(/\.ffx$/i, "");
    }

    function creatorFromPresetName(name) {
        var n = String(name).toLowerCase();

        // Support the actual uploaded spelling, plus the common shorthand typo.
        if (n.indexOf("jamesmaximoffs") !== -1 ||
            n.indexOf("jamemaximoffs") !== -1) {
            return "jamesmaximoffs";
        }

        if (n.indexOf("tattooedhe8rt") !== -1) {
            return "tattooedhe8rt";
        }

        return "Other";
    }

    function creatorSortRank(name) {
        if (name === "jamesmaximoffs") return 0;
        if (name === "tattooedhe8rt") return 1;
        return 2;
    }

    function listFFX(subfolder) {
        var folder = presetFolder(subfolder);
        var files = [];

        try {
            files = folder.getFiles(function(f) {
                return (f instanceof File) && /\.ffx$/i.test(f.name);
            });
        } catch (e0) {
            files = [];
        }

        files.sort(function(a, b) {
            var ca = creatorFromPresetName(fileDisplayName(a));
            var cb = creatorFromPresetName(fileDisplayName(b));

            var ra = creatorSortRank(ca);
            var rb = creatorSortRank(cb);

            if (ra < rb) return -1;
            if (ra > rb) return 1;

            var na = fileDisplayName(a).toLowerCase();
            var nb = fileDisplayName(b).toLowerCase();

            if (na < nb) return -1;
            if (na > nb) return 1;
            return 0;
        });

        return files;
    }

    function importFFXFiles(subfolder, oneOnly) {
        var picked = File.openDialog(
            "Choose After Effects .ffx preset" + (oneOnly ? "" : "s"),
            "*.ffx",
            !oneOnly
        );

        if (!picked) return 0;

        var files = (picked instanceof Array) ? picked : [picked];
        var destFolder = presetFolder(subfolder);
        var count = 0;

        for (var i = 0; i < files.length; i++) {
            var src = files[i];
            var dest = new File(destFolder.fsName + "/" + fileDisplayName(src));

            try {
                if (dest.exists) dest.remove();
                if (src.copy(dest.fsName)) count++;
            } catch (e0) {}
        }

        return count;
    }

    function findJawsPreset() {
        var files = listFFX("Jaws");
        if (files.length === 0) return null;

        for (var i = 0; i < files.length; i++) {
            if (fileDisplayName(files[i]).toLowerCase().indexOf("jaw") !== -1) {
                return files[i];
            }
        }

        return files[0];
    }

    function applyPresetToSingleLayer(comp, layer, presetFile, atTime) {
        if (!layer || !presetFile || !presetFile.exists) return false;

        var oldTime = comp.time;
        clearSelection(comp);

        try {
            layer.selected = true;
            comp.time = (atTime === undefined) ? layer.inPoint : atTime;
            layer.applyPreset(presetFile);
            layer.selected = false;
            comp.time = oldTime;
            return true;
        } catch (e0) {
            try { layer.selected = false; } catch (e1) {}
            try { comp.time = oldTime; } catch (e2) {}
            return false;
        }
    }

    function applyPresetDirectToClips(comp, clips, presetFile) {
        var count = 0;
        for (var i = 0; i < clips.length; i++) {
            if (applyPresetToSingleLayer(comp, clips[i], presetFile, clips[i].inPoint)) {
                count++;
            }
        }
        return count;
    }

    function makePresetAdjustment(comp, clip, presetFile, helperName) {
        addMotionTile([clip]);

        var adj = makeAdjustmentForClip(
            comp,
            clip,
            helperName || ("Preset Adjustment - " + fileBaseName(presetFile)),
            L_FUCHSIA
        );

        setNameLabel(
            adj,
            helperName || ("Preset Adjustment - " + fileBaseName(presetFile)),
            L_FUCHSIA
        );

        applyPresetToSingleLayer(comp, adj, presetFile, clip.inPoint);
        return adj;
    }

    function applyPresetAsAdjustments(comp, clips, presetFile, prefix) {
        var created = [];
        for (var i = 0; i < clips.length; i++) {
            created.push(
                makePresetAdjustment(
                    comp,
                    clips[i],
                    presetFile,
                    (prefix || "Preset") + " - " + fileBaseName(presetFile)
                )
            );
        }
        return created;
    }

    function applyJawsPresetToClip(comp, clip, presetFile) {
        if (!presetFile || !presetFile.exists) return null;

        var a = clip.inPoint;
        var b = Math.min(clip.outPoint, a + 4.0);
        var dur = Math.max(comp.frameDuration, b - a);

        var solid = comp.layers.addSolid(
            [0,0,0],
            "Preset Jaws - " + fileBaseName(presetFile),
            comp.width,
            comp.height,
            comp.pixelAspect,
            dur
        );

        solid.startTime = a;
        solid.inPoint = a;
        solid.outPoint = b;

        setNameLabel(
            solid,
            "Preset Jaws - " + fileBaseName(presetFile),
            L_PURPLE
        );

        applyPresetToSingleLayer(comp, solid, presetFile, a);
        try { solid.moveBefore(clip); } catch (e0) {}
        return solid;
    }

    function applyJawsPresetEveryNth(comp, clips, presetFile, everyNth) {
        if (!presetFile) return 0;

        var count = 0;
        everyNth = Math.max(1, Math.round(everyNth));

        for (var i = everyNth - 1; i < clips.length; i += everyNth) {
            if (applyJawsPresetToClip(comp, clips[i], presetFile)) count++;
        }

        return count;
    }

    function zoomPresetCycle(comp, clips, blockSize) {
        var zooms = listFFX("ZOOMS");
        if (zooms.length === 0) return 0;

        blockSize = Math.max(1, Math.round(blockSize || 2));
        var count = 0;

        for (var i = 0; i < clips.length; i++) {
            var presetIndex = Math.floor(i / blockSize) % zooms.length;

            makePresetAdjustment(
                comp,
                clips[i],
                zooms[presetIndex],
                "Zoom Preset - " + fileBaseName(zooms[presetIndex])
            );

            count++;
        }

        return count;
    }

    function removeRunTagRecursive(comp, tag, visited) {
        var id = String(comp.id);
        if (visited[id]) return;
        visited[id] = true;

        var marker = "ETHAN_PREMIUM_RUN:" + tag;
        var fxMarker = "[RUN:" + tag + "]";

        for (var i = comp.numLayers; i >= 1; i--) {
            var l = comp.layer(i);

            try {
                if (l.comment === marker) {
                    l.remove();
                    continue;
                }
            } catch (e0) {}

            if (l instanceof AVLayer) {
                var fx = l.property("ADBE Effect Parade");

                if (fx) {
                    for (var j = fx.numProperties; j >= 1; j--) {
                        var e = fx.property(j);
                        var nm = "";
                        try { nm = e.name; } catch (e1) {}

                        if (nm.indexOf(fxMarker) !== -1) {
                            try { e.remove(); } catch (e2) {}
                        }
                    }
                }

                try {
                    if (l.source instanceof CompItem) {
                        removeRunTagRecursive(l.source, tag, visited);
                    }
                } catch (e3) {}
            }
        }
    }

    function removeRunTag(comp, tag) {
        removeRunTagRecursive(comp, tag, {});
    }


    function getComp() {
        var c = app.project.activeItem;
        if (!(c instanceof CompItem)) {
            alert("Open your edit composition first.");
            return null;
        }
        return c;
    }

    function low(s) { return String(s).toLowerCase(); }
    function has(s, q) { return low(s).indexOf(low(q)) !== -1; }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    function getNum(field, fallback, lo, hi) {
        var n = parseFloat(field.text);
        if (isNaN(n)) n = fallback;
        if (lo !== undefined) n = Math.max(lo, n);
        if (hi !== undefined) n = Math.min(hi, n);
        field.text = String(Math.round(n * 100) / 100);
        return n;
    }

    var GENERATED_LAYER_NAMES = [
        "white flash transition",
        "black flash 2",
        "clip starter",
        "transition - ",
        "saturation changer",
        "bcc ripple dissolve intro",
        "ethan fade exposure",
        "ethan starter blur",
        "preset jaws",
        "preset adjustment",
        "favorite preset",
        "zoom preset"
    ];

    var GENERATED_EFFECT_NAMES = [
        "ethan motion tile",
        "ethan shake",
        "ethan pan",
        "rebound swing",
        "ethan smooth slide",
        "ethan slide blur",
        "ethan starter blur",
        "ethan fade exposure",
        "capcut fade in",
        "capcut fade out",
        "capcut flash loop",
        "capcut flash in",
        "capcut flash out",
        "capcut horizontal blur in",
        "capcut horizontal blur out",
        "ethan text color fill"
    ];

    function isGeneratedLayerName(name) {
        var n = low(name);
        for (var i = 0; i < GENERATED_LAYER_NAMES.length; i++) {
            if (n.indexOf(GENERATED_LAYER_NAMES[i]) !== -1) return true;
        }
        return false;
    }

    function isGeneratedEffectName(name) {
        var n = low(name);
        for (var i = 0; i < GENERATED_EFFECT_NAMES.length; i++) {
            if (n.indexOf(GENERATED_EFFECT_NAMES[i]) !== -1) return true;
        }
        return false;
    }

    function isLikelyClip(layer) {
        if (!(layer instanceof AVLayer)) return false;
        if (layer.adjustmentLayer || layer.nullLayer) return false;
        if (isGeneratedLayerName(layer.name)) return false;

        try {
            if (layer.property("ADBE Text Properties")) return false;
        } catch (e0) {}

        try {
            if (layer.hasAudio && !layer.hasVideo) return false;
        } catch (e1) {}

        var src = null;
        try { src = layer.source; } catch (e2) {}
        if (!src) return false;

        return (src instanceof FootageItem || src instanceof CompItem);
    }

    function allClips(comp) {
        var arr = [];
        for (var i = 1; i <= comp.numLayers; i++) {
            if (isLikelyClip(comp.layer(i))) arr.push(comp.layer(i));
        }

        arr.sort(function(a, b) {
            if (a.inPoint < b.inPoint) return -1;
            if (a.inPoint > b.inPoint) return 1;
            return a.index - b.index;
        });
        return arr;
    }

    function selectedClips(comp) {
        var arr = [];
        var sel = comp.selectedLayers || [];

        for (var i = 0; i < sel.length; i++) {
            if (isLikelyClip(sel[i])) arr.push(sel[i]);
        }

        arr.sort(function(a, b) {
            if (a.inPoint < b.inPoint) return -1;
            if (a.inPoint > b.inPoint) return 1;
            return a.index - b.index;
        });
        return arr;
    }

    function clipUnderPlayhead(comp) {
        var t = comp.time;
        var clips = allClips(comp);

        for (var i = 0; i < clips.length; i++) {
            if (t >= clips[i].inPoint && t < clips[i].outPoint) {
                return [clips[i]];
            }
        }
        return [];
    }

    function clipByNumber(comp, n) {
        var clips = allClips(comp);
        n = Math.round(n);
        if (n < 1 || n > clips.length) return [];
        return [clips[n - 1]];
    }

    function clearSelection(comp) {
        for (var i = 1; i <= comp.numLayers; i++) {
            try { comp.layer(i).selected = false; } catch (e0) {}
        }
    }

    function selectAllSplitClips(comp, quiet) {
        var clips = allClips(comp);
        clearSelection(comp);

        for (var i = 0; i < clips.length; i++) {
            try { clips[i].selected = true; } catch (e0) {}
        }

        if (!quiet) alert("Selected " + clips.length + " split clip(s).");
        return clips;
    }


    // ============================================================
    // TEXT TOOLS
    // ============================================================

    function isTextLayer(layer) {
        if (!layer) return false;
        try {
            return !!layer.property("ADBE Text Properties");
        } catch (e0) {
            return false;
        }
    }

    function allTextLayers(comp) {
        var out = [];
        for (var i = 1; i <= comp.numLayers; i++) {
            var l = comp.layer(i);
            if (isTextLayer(l)) out.push(l);
        }
        return out;
    }

    function selectAllTextLayers(comp, quiet) {
        var layers = allTextLayers(comp);
        clearSelection(comp);

        for (var i = 0; i < layers.length; i++) {
            try { layers[i].selected = true; } catch (e0) {}
        }

        if (!quiet) alert("Selected " + layers.length + " text layer(s).");
        return layers;
    }

    function textAnimatorsGroup(layer) {
        try {
            var textProps = layer.property("ADBE Text Properties");
            if (!textProps) return null;
            return textProps.property("ADBE Text Animators");
        } catch (e0) {
            return null;
        }
    }

    function builtInPresetRootCandidates() {
        var roots = [];

        // If this panel is installed in Support Files/Scripts/ScriptUI Panels,
        // walking up three folders lands on Support Files.
        try {
            var scriptFolder = new Folder($.fileName).parent;
            var support = scriptFolder.parent.parent;
            var presetRoot = new Folder(support.fsName + "/Presets");
            if (presetRoot.exists) roots.push(presetRoot);
        } catch (e0) {}

        try {
            var ap = app.path;
            var apPath = "";
            try { apPath = ap.fsName; } catch (e1) { apPath = String(ap); }
            if (apPath) {
                var appPresetRoot = new Folder(apPath + "/Presets");
                if (appPresetRoot.exists) roots.push(appPresetRoot);
            }
        } catch (e2) {}

        return roots;
    }

    function findFileRecursiveExact(folder, wantedLower, depth) {
        if (!folder || !folder.exists || depth < 0) return null;

        var entries = [];
        try { entries = folder.getFiles(); } catch (e0) { return null; }

        for (var i = 0; i < entries.length; i++) {
            var f = entries[i];
            if (f instanceof File) {
                var nm = "";
                try { nm = decodeURI(f.name).toLowerCase(); }
                catch (e1) { nm = String(f.name).toLowerCase(); }

                if (nm === wantedLower) return f;
            }
        }

        if (depth === 0) return null;

        for (var j = 0; j < entries.length; j++) {
            if (entries[j] instanceof Folder) {
                var found = findFileRecursiveExact(entries[j], wantedLower, depth - 1);
                if (found) return found;
            }
        }

        return null;
    }

    function findBuiltInTextPreset(subfolder, presetName) {
        var wanted = presetName + ".ffx";
        var roots = builtInPresetRootCandidates();

        for (var i = 0; i < roots.length; i++) {
            var direct = new File(
                roots[i].fsName + "/Text/" + subfolder + "/" + wanted
            );
            if (direct.exists) return direct;

            var textRoot = new Folder(roots[i].fsName + "/Text");
            var found = findFileRecursiveExact(
                textRoot,
                wanted.toLowerCase(),
                3
            );
            if (found) return found;
        }

        return null;
    }

    function findBundledTextGlowShadowPreset() {
        var wantedLower = "ethans woodl swirly text intro.ffx";
        var roots = [];

        try { roots.push(new Folder(getPresetRoot().fsName + "/Text")); } catch (e0) {}

        // Always check the folder bundled beside this panel too, even if the
        // user previously selected a custom preset root in Settings.
        try {
            var bundled = new Folder(
                new Folder($.fileName).parent.fsName +
                "/Ethans Editing Hub PREMIUM Presets/Text"
            );
            roots.push(bundled);
        } catch (e1) {}

        for (var i = 0; i < roots.length; i++) {
            var found = findFileRecursiveExact(roots[i], wantedLower, 2);
            if (found) return found;
        }

        return null;
    }

    function retimeKeyedPropertyToWindow(prop, targetA, targetB) {
        if (!prop) return;

        var n = 0;
        try { n = prop.numKeys; } catch (e0) { n = 0; }
        if (n < 1) return;

        var times = [];
        var values = [];

        for (var i = 1; i <= n; i++) {
            try {
                times.push(prop.keyTime(i));
                values.push(prop.keyValue(i));
            } catch (e1) {}
        }

        if (values.length === 0) return;

        var oldA = times[0];
        var oldB = times[times.length - 1];

        for (var r = n; r >= 1; r--) {
            try { prop.removeKey(r); } catch (e2) {}
        }

        var span = Math.max(0, targetB - targetA);

        for (var k = 0; k < values.length; k++) {
            var ratio = 0;

            if (values.length > 1) {
                if (oldB > oldA) {
                    ratio = (times[k] - oldA) / (oldB - oldA);
                } else {
                    ratio = k / (values.length - 1);
                }
            }

            ratio = clamp(ratio, 0, 1);

            try {
                prop.setValueAtTime(targetA + span * ratio, values[k]);
            } catch (e3) {}
        }

        easyEase(prop, 82);
    }

    function retimeKeyedGroupToWindow(group, targetA, targetB) {
        if (!group) return;

        var n = 0;
        try { n = group.numProperties; } catch (e0) { n = 0; }

        if (!n) {
            retimeKeyedPropertyToWindow(group, targetA, targetB);
            return;
        }

        for (var i = 1; i <= n; i++) {
            var p = null;
            try { p = group.property(i); } catch (e1) {}
            if (!p) continue;

            var childCount = 0;
            try { childCount = p.numProperties; } catch (e2) { childCount = 0; }

            if (childCount > 0) {
                retimeKeyedGroupToWindow(p, targetA, targetB);
            } else {
                retimeKeyedPropertyToWindow(p, targetA, targetB);
            }
        }
    }

    function applyBuiltInTextPresetWindow(comp, layer, presetFile, targetA, targetB, animatorName) {
        if (!layer || !presetFile || !presetFile.exists) return false;

        var anims = textAnimatorsGroup(layer);
        var before = 0;
        try { before = anims ? anims.numProperties : 0; } catch (e0) {}

        var ok = applyPresetToSingleLayer(comp, layer, presetFile, targetA);
        if (!ok) return false;

        anims = textAnimatorsGroup(layer);
        if (!anims) return true;

        var after = 0;
        try { after = anims.numProperties; } catch (e1) { after = before; }

        for (var i = before + 1; i <= after; i++) {
            var animator = null;
            try { animator = anims.property(i); } catch (e2) {}
            if (!animator) continue;

            try {
                animator.name = animatorName +
                    ((after - before > 1) ? " " + (i - before) : "");
            } catch (e3) {}

            retimeKeyedGroupToWindow(animator, targetA, targetB);
        }

        return true;
    }

    function addIncreaseTrackingToText(comp, layer) {
        var anims = textAnimatorsGroup(layer);
        if (!anims) return false;

        var animator = null;
        try { animator = anims.addProperty("ADBE Text Animator"); }
        catch (e0) { return false; }

        try { animator.name = "Ethan Increase Tracking"; } catch (e1) {}

        var selectors = null;
        try { selectors = animator.property("ADBE Text Selectors"); } catch (e2) {}

        if (selectors) {
            var selCount = 0;
            try { selCount = selectors.numProperties; } catch (e3) {}
            if (selCount === 0) {
                try { selectors.addProperty("ADBE Text Selector"); } catch (e4) {}
            }
        }

        var animatorProps = null;
        try { animatorProps = animator.property("ADBE Text Animator Properties"); } catch (e5) {}
        if (!animatorProps) return false;

        var tracking = null;
        try { tracking = animatorProps.addProperty("ADBE Text Tracking Amount"); }
        catch (e6) { return false; }

        var a = layer.inPoint;
        var b = lastFrame(comp, layer);

        try {
            tracking.setValueAtTime(a, 0);
            tracking.setValueAtTime(b, 4);
            easyEase(tracking, 82);
        } catch (e7) {}

        return true;
    }

    function distributedLayerTimes(comp, layer, wantedCount) {
        var fd = comp.frameDuration;
        var a = layer.inPoint;
        var b = lastFrame(comp, layer);

        var availableFrames = Math.max(
            1,
            Math.floor(((b - a) / fd) + 0.5) + 1
        );

        var count = Math.max(1, Math.min(wantedCount, availableFrames));
        var out = [];

        if (count === 1) {
            out.push(a);
            return out;
        }

        var lastIndex = availableFrames - 1;

        for (var i = 0; i < count; i++) {
            var idx = Math.round(lastIndex * (i / (count - 1)));
            var t = a + idx * fd;

            if (out.length === 0 || t > out[out.length - 1] + fd * 0.25) {
                out.push(t);
            }
        }

        return out;
    }

    function addTextColorFillCycle(comp, layer) {
        var fx = null;
        try { fx = layer.property("ADBE Effect Parade"); } catch (e0) {}
        if (!fx) return false;

        // Do not stack duplicate Hub color cycles if the button is clicked twice.
        for (var r = fx.numProperties; r >= 1; r--) {
            var existing = fx.property(r);
            var nm = "";
            try { nm = existing.name; } catch (e1) {}
            if (low(nm).indexOf("ethan text color fill") !== -1) {
                try { existing.remove(); } catch (e2) {}
            }
        }

        var fill = addEffect(fx, ["ADBE Fill", "Fill"]);
        if (!fill) return false;

        try { fill.name = "Ethan Text Color Fill"; } catch (e3) {}

        var color = findRecursive(fill, ["Color"]);
        if (!color) {
            // Last-resort fallback for Fill if display names are localized.
            try {
                for (var i = 1; i <= fill.numProperties; i++) {
                    var p = fill.property(i);
                    if (p && p.propertyValueType === PropertyValueType.COLOR) {
                        color = p;
                        break;
                    }
                }
            } catch (e4) {}
        }

        if (!color) return false;

        var colors = [
            [1,1,1],
            [1,0,0],
            [1,1,1],
            [1,0,0]
        ];

        var times = distributedLayerTimes(comp, layer, 4);

        for (var k = 0; k < times.length; k++) {
            try { color.setValueAtTime(times[k], colors[k]); } catch (e5) {}
        }

        easyEase(color, 82);
        return true;
    }

    function applyColorFillToAllText(comp) {
        var layers = selectAllTextLayers(comp, true);
        if (layers.length === 0) {
            alert("No text layers found in this comp.");
            return 0;
        }

        var count = 0;
        for (var i = 0; i < layers.length; i++) {
            if (addTextColorFillCycle(comp, layers[i])) count++;
        }

        selectAllTextLayers(comp, true);
        return count;
    }

    function ethansBestText(comp) {
        var layers = selectAllTextLayers(comp, true);
        if (layers.length === 0) {
            alert("No text layers found in this comp.");
            return;
        }

        var fadeUp = findBuiltInTextPreset("Animate In", "Fade Up Words");
        var fadeOut = findBuiltInTextPreset("Animate Out", "Fade Out Slow");

        var trackingCount = 0;
        var fadeUpCount = 0;
        var fadeOutCount = 0;

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var a = layer.inPoint;
            var b = lastFrame(comp, layer);
            var m = a + (b - a) * 0.5;

            if (addIncreaseTrackingToText(comp, layer)) trackingCount++;

            if (fadeUp) {
                if (applyBuiltInTextPresetWindow(
                    comp,
                    layer,
                    fadeUp,
                    a,
                    m,
                    "Ethan Fade Up Words"
                )) fadeUpCount++;
            }

            if (fadeOut) {
                if (applyBuiltInTextPresetWindow(
                    comp,
                    layer,
                    fadeOut,
                    m,
                    b,
                    "Ethan Fade Out Slow"
                )) fadeOutCount++;
            }
        }

        selectAllTextLayers(comp, true);

        var missing = [];
        if (!fadeUp) missing.push("Fade Up Words");
        if (!fadeOut) missing.push("Fade Out Slow");

        if (missing.length > 0) {
            alert(
                "ETHANS BEST TEXT applied tracking, but AE's built-in preset file(s) could not be located: " +
                missing.join(", ") +
                ".\n\nYour installed AE should normally include these under Presets > Text."
            );
        }
    }

    function applyGlowShadowPresetToAllText(comp) {
        var layers = selectAllTextLayers(comp, true);
        if (layers.length === 0) {
            alert("No text layers found in this comp.");
            return 0;
        }

        var preset = findBundledTextGlowShadowPreset();

        if (!preset) {
            alert(
                "Couldn't find 'ethans woodl swirly text intro.ffx'.\n\n" +
                "Keep the bundled 'Ethans Editing Hub PREMIUM Presets' folder beside the Hub JSX."
            );
            return 0;
        }

        var count = 0;
        for (var i = 0; i < layers.length; i++) {
            if (applyPresetToSingleLayer(comp, layers[i], preset, layers[i].inPoint)) {
                count++;
            }
        }

        selectAllTextLayers(comp, true);
        return count;
    }


    // ============================================================
    // TEXT AUTO ANIMATORS + POSITION
    // ============================================================

    function selectedTextLayers(comp) {
        var out = [];
        var sel = comp.selectedLayers || [];
        for (var i = 0; i < sel.length; i++) {
            if (isTextLayer(sel[i])) out.push(sel[i]);
        }
        return out;
    }

    function textAnimatorTargets(comp) {
        // Auto animators are fast to use: selected text layers when there are
        // any; otherwise they intentionally fall back to every text layer.
        var selected = selectedTextLayers(comp);
        if (selected.length > 0) return selected;
        return selectAllTextLayers(comp, true);
    }

    function removeNamedTextAnimator(layer, animatorName) {
        var anims = textAnimatorsGroup(layer);
        if (!anims) return;

        for (var i = anims.numProperties; i >= 1; i--) {
            var a = null;
            try { a = anims.property(i); } catch (e0) {}
            if (!a) continue;

            var nm = "";
            try { nm = a.name; } catch (e1) {}
            if (low(nm) === low(animatorName)) {
                try { a.remove(); } catch (e2) {}
            }
        }
    }

    function createTextAnimator(layer, animatorName) {
        removeNamedTextAnimator(layer, animatorName);

        var anims = textAnimatorsGroup(layer);
        if (!anims) return null;

        var animator = null;
        try { animator = anims.addProperty("ADBE Text Animator"); }
        catch (e0) { return null; }

        try { animator.name = animatorName; } catch (e1) {}

        var selectors = null;
        try { selectors = animator.property("ADBE Text Selectors"); } catch (e2) {}
        if (!selectors) return {animator:animator, props:null, selector:null};

        var selector = null;
        try {
            if (selectors.numProperties > 0) selector = selectors.property(1);
            else selector = selectors.addProperty("ADBE Text Selector");
        } catch (e3) {}

        var props = null;
        try { props = animator.property("ADBE Text Animator Properties"); } catch (e4) {}

        return {animator:animator, props:props, selector:selector};
    }

    function addAnimatorProperty(props, matchName) {
        if (!props) return null;
        try { return props.addProperty(matchName); }
        catch (e0) { return null; }
    }

    function fitArrayToProperty(prop, values) {
        if (!(values instanceof Array)) return values;

        try {
            var current = prop.value;
            if (current instanceof Array) {
                if (current.length === 2) return [values[0], values[1]];
                if (current.length === 3) return [values[0], values[1], values.length > 2 ? values[2] : 0];
            }
        } catch (e0) {}

        return values;
    }

    function setAnimatorStatic(prop, value) {
        if (!prop) return;
        try { prop.setValue(fitArrayToProperty(prop, value)); } catch (e0) {}
    }

    function selectorProp(selector, matchName) {
        if (!selector) return null;
        try { return selector.property(matchName); } catch (e0) { return null; }
    }

    function setSelectorReveal(selector, a, b, directionOut, hardEdges) {
        if (!selector) return false;

        var start = selectorProp(selector, "ADBE Text Percent Start");
        var end = selectorProp(selector, "ADBE Text Percent End");

        if (directionOut) {
            // No characters selected at first; by the end the whole string is
            // selected, so the animator becomes the OUT state.
            if (start) try { start.setValue(0); } catch (e0) {}
            if (end) {
                try {
                    end.setValueAtTime(a, 0);
                    end.setValueAtTime(b, 100);
                    easyEase(end, 82);
                } catch (e1) {}
            }
        } else {
            // Entire string starts in the animator state; Start moves across
            // the text and releases characters into their normal IN state.
            if (end) try { end.setValue(100); } catch (e2) {}
            if (start) {
                try {
                    start.setValueAtTime(a, 0);
                    start.setValueAtTime(b, 100);
                    easyEase(start, 82);
                } catch (e3) {}
            }
        }

        if (hardEdges) {
            try {
                var advanced = selector.property("ADBE Text Range Advanced");
                var smooth = advanced ? advanced.property("ADBE Text Selector Smoothness") : null;
                if (smooth) smooth.setValue(0);
            } catch (e4) {}
        }

        return true;
    }

    function addAutoAnimatorToText(comp, layer, kind) {
        var a = layer.inPoint;
        var b = lastFrame(comp, layer);
        var d = Math.max(comp.frameDuration, b - a);
        var inEnd = Math.min(b, a + d * 0.42);
        var outStart = Math.max(a, b - d * 0.40);
        var setup = null;
        var p = null;

        if (kind === "pop") {
            setup = createTextAnimator(layer, "Ethan Auto - Pop In");
            if (!setup || !setup.props) return false;
            p = addAnimatorProperty(setup.props, "ADBE Text Scale 3D");
            setAnimatorStatic(p, [42,42,42]);
            p = addAnimatorProperty(setup.props, "ADBE Text Position 3D");
            setAnimatorStatic(p, [0,34,0]);
            p = addAnimatorProperty(setup.props, "ADBE Text Opacity");
            setAnimatorStatic(p, 0);
            setSelectorReveal(setup.selector, a, inEnd, false, false);
            return true;
        }

        if (kind === "rise") {
            setup = createTextAnimator(layer, "Ethan Auto - Rise + Fade");
            if (!setup || !setup.props) return false;
            p = addAnimatorProperty(setup.props, "ADBE Text Position 3D");
            setAnimatorStatic(p, [0,78,0]);
            p = addAnimatorProperty(setup.props, "ADBE Text Opacity");
            setAnimatorStatic(p, 0);
            setSelectorReveal(setup.selector, a, inEnd, false, false);
            return true;
        }

        if (kind === "swirl") {
            setup = createTextAnimator(layer, "Ethan Auto - Swirl In");
            if (!setup || !setup.props) return false;
            p = addAnimatorProperty(setup.props, "ADBE Text Rotation");
            setAnimatorStatic(p, -28);
            p = addAnimatorProperty(setup.props, "ADBE Text Scale 3D");
            setAnimatorStatic(p, [82,82,82]);
            p = addAnimatorProperty(setup.props, "ADBE Text Position 3D");
            setAnimatorStatic(p, [0,30,0]);
            p = addAnimatorProperty(setup.props, "ADBE Text Opacity");
            setAnimatorStatic(p, 0);
            setSelectorReveal(setup.selector, a, Math.min(b, a + d * 0.48), false, false);
            return true;
        }

        if (kind === "type") {
            setup = createTextAnimator(layer, "Ethan Auto - Type On");
            if (!setup || !setup.props) return false;
            p = addAnimatorProperty(setup.props, "ADBE Text Opacity");
            setAnimatorStatic(p, 0);
            setSelectorReveal(setup.selector, a, Math.min(b, a + d * 0.62), false, true);
            return true;
        }

        if (kind === "tracking") {
            setup = createTextAnimator(layer, "Ethan Auto - Tracking Bloom");
            if (!setup || !setup.props) return false;

            var tracking = addAnimatorProperty(setup.props, "ADBE Text Tracking Amount");
            var opacity = addAnimatorProperty(setup.props, "ADBE Text Opacity");

            if (tracking) {
                try {
                    tracking.setValueAtTime(a, 48);
                    tracking.setValueAtTime(inEnd, 0);
                    easyEase(tracking, 82);
                } catch (e0) {}
            }
            if (opacity) {
                try {
                    opacity.setValueAtTime(a, 0);
                    opacity.setValueAtTime(inEnd, 100);
                    easyEase(opacity, 82);
                } catch (e1) {}
            }
            return true;
        }

        if (kind === "floatout") {
            setup = createTextAnimator(layer, "Ethan Auto - Float Out");
            if (!setup || !setup.props) return false;
            p = addAnimatorProperty(setup.props, "ADBE Text Position 3D");
            setAnimatorStatic(p, [0,-72,0]);
            p = addAnimatorProperty(setup.props, "ADBE Text Opacity");
            setAnimatorStatic(p, 0);
            setSelectorReveal(setup.selector, outStart, b, true, false);
            return true;
        }

        if (kind === "punchout") {
            setup = createTextAnimator(layer, "Ethan Auto - Punch Out");
            if (!setup || !setup.props) return false;
            p = addAnimatorProperty(setup.props, "ADBE Text Scale 3D");
            setAnimatorStatic(p, [145,145,145]);
            p = addAnimatorProperty(setup.props, "ADBE Text Opacity");
            setAnimatorStatic(p, 0);
            setSelectorReveal(setup.selector, Math.max(a, b - d * 0.34), b, true, false);
            return true;
        }

        return false;
    }

    function applyAutoAnimator(comp, kind) {
        var layers = textAnimatorTargets(comp);
        if (layers.length === 0) {
            alert("No text layers found in this comp.");
            return 0;
        }

        var count = 0;
        for (var i = 0; i < layers.length; i++) {
            if (addAutoAnimatorToText(comp, layers[i], kind)) count++;
        }

        clearSelection(comp);
        for (var j = 0; j < layers.length; j++) {
            try { layers[j].selected = true; } catch (e0) {}
        }
        return count;
    }

    function positionTextTargets(comp) {
        var selected = selectedTextLayers(comp);
        if (selected.length > 0) return selected;

        var all = allTextLayers(comp);
        if (all.length === 1) {
            clearSelection(comp);
            try { all[0].selected = true; } catch (e0) {}
            return all;
        }

        alert("Select the text layer you want to position first.");
        return [];
    }

    function setUniformTextLayerScale(layer, pct) {
        var tr = null;
        var scale = null;
        try { tr = layer.property("ADBE Transform Group"); } catch (e0) {}
        try { scale = tr ? tr.property("ADBE Scale") : null; } catch (e1) {}
        if (!scale) return false;

        var v = null;
        try { v = scale.value; } catch (e2) {}
        var target = (v instanceof Array && v.length === 3)
            ? [pct,pct,pct]
            : [pct,pct];

        try {
            if (scale.numKeys > 0) {
                // Keep keyframe timing intact but make every scale key uniform,
                // preventing non-uniform stretch/warp.
                for (var k = 1; k <= scale.numKeys; k++) {
                    var old = scale.keyValue(k);
                    var kv = (old instanceof Array && old.length === 3)
                        ? [pct,pct,pct]
                        : [pct,pct];
                    scale.setValueAtKey(k, kv);
                }
            } else {
                scale.setValue(target);
            }
            return true;
        } catch (e3) {
            return false;
        }
    }

    function positionPropertyXY(layer) {
        var tr = null;
        var pos = null;
        try { tr = layer.property("ADBE Transform Group"); } catch (e0) {}
        try { pos = tr ? tr.property("ADBE Position") : null; } catch (e1) {}
        return pos;
    }

    function computeCenteredPosition(comp, layer, targetX, targetY) {
        var t = comp.time;
        if (t < layer.inPoint || t >= layer.outPoint) t = layer.inPoint;

        var rect = null;
        try { rect = layer.sourceRectAtTime(t, false); } catch (e0) {}

        var tr = null;
        var anchor = [0,0];
        var scale = [100,100];
        var rotation = 0;
        var currentPos = [targetX,targetY];

        try { tr = layer.property("ADBE Transform Group"); } catch (e1) {}
        try { anchor = tr.property("ADBE Anchor Point").value; } catch (e2) {}
        try { scale = tr.property("ADBE Scale").value; } catch (e3) {}
        try { rotation = tr.property("ADBE Rotate Z").value; } catch (e4) {
            try { rotation = tr.property("ADBE Rotation").value; } catch (e5) {}
        }
        try { currentPos = positionPropertyXY(layer).value; } catch (e6) {}

        if (!rect) {
            return (currentPos instanceof Array && currentPos.length === 3)
                ? [targetX,targetY,currentPos[2]]
                : [targetX,targetY];
        }

        var cx = rect.left + rect.width * 0.5;
        var cy = rect.top + rect.height * 0.5;
        var ax = (anchor instanceof Array) ? anchor[0] : 0;
        var ay = (anchor instanceof Array) ? anchor[1] : 0;
        var sx = (scale instanceof Array ? scale[0] : 100) / 100.0;
        var sy = (scale instanceof Array ? scale[1] : 100) / 100.0;

        var ox = (cx - ax) * sx;
        var oy = (cy - ay) * sy;

        var rad = rotation * Math.PI / 180.0;
        var rx = ox * Math.cos(rad) - oy * Math.sin(rad);
        var ry = ox * Math.sin(rad) + oy * Math.cos(rad);

        var x = targetX - rx;
        var y = targetY - ry;

        return (currentPos instanceof Array && currentPos.length === 3)
            ? [x,y,currentPos[2]]
            : [x,y];
    }

    function setPositionPreserveKeys(layer, targetValue) {
        var pos = positionPropertyXY(layer);
        if (!pos) return false;

        try {
            if (pos.dimensionsSeparated) {
                var x = pos.getSeparationFollower(0);
                var y = pos.getSeparationFollower(1);
                var z = null;
                try { z = pos.getSeparationFollower(2); } catch (e0) {}

                if (x.numKeys > 0) {
                    var dx = targetValue[0] - x.value;
                    for (var kx = 1; kx <= x.numKeys; kx++) x.setValueAtKey(kx, x.keyValue(kx) + dx);
                } else x.setValue(targetValue[0]);

                if (y.numKeys > 0) {
                    var dy = targetValue[1] - y.value;
                    for (var ky = 1; ky <= y.numKeys; ky++) y.setValueAtKey(ky, y.keyValue(ky) + dy);
                } else y.setValue(targetValue[1]);

                if (z && targetValue.length > 2 && z.numKeys === 0) {
                    try { z.setValue(targetValue[2]); } catch (e1) {}
                }
                return true;
            }

            if (pos.numKeys > 0) {
                var cur = pos.value;
                var delta = [];
                for (var d = 0; d < targetValue.length; d++) delta[d] = targetValue[d] - cur[d];

                for (var k = 1; k <= pos.numKeys; k++) {
                    var old = pos.keyValue(k);
                    var nv = [];
                    for (var q = 0; q < old.length; q++) nv[q] = old[q] + (delta[q] || 0);
                    pos.setValueAtKey(k, nv);
                }
            } else {
                pos.setValue(targetValue);
            }
            return true;
        } catch (e2) {
            return false;
        }
    }

    function centerTextPreset(comp, mode) {
        var layers = positionTextTargets(comp);
        if (layers.length === 0) return 0;

        var scalePct = (mode === "bottom") ? 87 : 100;
        var targetX = comp.width * 0.5;
        var targetY = comp.height * 0.5;

        // The bottom-line offset is 180 px in a 2160-high comp and scales
        // proportionally for other comp heights.
        if (mode === "bottom") targetY += comp.height * (180.0 / 2160.0);

        var count = 0;
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            setUniformTextLayerScale(layer, scalePct);
            var target = computeCenteredPosition(comp, layer, targetX, targetY);
            if (setPositionPreserveKeys(layer, target)) count++;
        }

        clearSelection(comp);
        for (var j = 0; j < layers.length; j++) {
            try { layers[j].selected = true; } catch (e0) {}
        }
        return count;
    }

    function targetClips(comp, targetText, clipNumberField) {
        if (targetText === "Selected clip(s)") return selectedClips(comp);
        if (targetText === "Clip under playhead") return clipUnderPlayhead(comp);
        if (targetText === "Clip #") return clipByNumber(comp, getNum(clipNumberField, 1, 1, 9999));
        return allClips(comp);
    }

    function requireTarget(comp, targetText, clipNumberField) {
        var clips = targetClips(comp, targetText, clipNumberField);
        if (!clips || clips.length === 0) {
            alert("No clip matched that Target.");
            return null;
        }
        return clips;
    }


    function isAudioOnlyLayer(layer) {
        if (!(layer instanceof AVLayer)) return false;

        try {
            return !!(layer.hasAudio && !layer.hasVideo);
        } catch (e0) {
            return false;
        }
    }

    function helperLayersNotClips(comp) {
        var out = [];

        for (var i = 1; i <= comp.numLayers; i++) {
            var l = comp.layer(i);

            if (isLikelyClip(l)) continue;
            if (isAudioOnlyLayer(l)) continue;

            out.push(l);
        }

        return out;
    }

    function selectHelperLayersNotClips(comp, quiet) {
        var layers = helperLayersNotClips(comp);
        clearSelection(comp);

        for (var i = 0; i < layers.length; i++) {
            try { layers[i].selected = true; } catch (e0) {}
        }

        if (!quiet) {
            alert('Selected ' + layers.length + ' helper layer(s) (clips/audio excluded).');
        }

        return layers;
    }

    function deleteHelperLayersNotClips(comp) {
        var layers = helperLayersNotClips(comp);

        for (var i = layers.length - 1; i >= 0; i--) {
            try { layers[i].remove(); } catch (e0) {}
        }

        return layers.length;
    }

    function precomposeHelperLayersNotClips(comp, name) {
        var layers = helperLayersNotClips(comp);
        if (layers.length === 0) return null;

        var indices = [];
        for (var i = 0; i < layers.length; i++) {
            try { indices.push(layers[i].index); } catch (e0) {}
        }

        indices.sort(function(a,b){ return a-b; });
        if (indices.length === 0) return null;

        var newComp = null;
        try {
            newComp = comp.layers.precompose(indices, name || 'everything', true);
        } catch (e1) {
            return null;
        }

        try { newComp.duration = comp.duration; } catch (e2) {}

        var parent = null;
        for (var j = 1; j <= comp.numLayers; j++) {
            var candidate = comp.layer(j);
            try {
                if (candidate instanceof AVLayer && candidate.source === newComp) {
                    parent = candidate;
                    break;
                }
            } catch (e3) {}
        }

        if (parent) {
            try { parent.name = name || 'everything'; } catch (e4) {}
            try { parent.startTime = 0; } catch (e5) {}
            try { parent.inPoint = 0; } catch (e6) {}
            try { parent.outPoint = comp.duration; } catch (e7) {}
            try { parent.moveToBeginning(); } catch (e8) {}
            try { parent.comment = 'ETHAN_PREMIUM_RUN:AUTO_BASIC'; } catch (e9) {}
            try { parent.label = L_FUCHSIA; } catch (e10) {}
        }

        return parent;
    }

    function findPresetContaining(subfolder, words) {
        var files = listFFX(subfolder);
        words = words || [];

        for (var i = 0; i < files.length; i++) {
            var n = fileDisplayName(files[i]).toLowerCase();
            var ok = true;

            for (var w = 0; w < words.length; w++) {
                if (n.indexOf(String(words[w]).toLowerCase()) === -1) {
                    ok = false;
                    break;
                }
            }

            if (ok) return files[i];
        }

        return null;
    }

    function applyPresetSolidFullClip(comp, clip, presetFile, name) {
        if (!presetFile || !presetFile.exists) return null;

        var dur = Math.max(comp.frameDuration, clip.outPoint - clip.inPoint);
        var solid = comp.layers.addSolid(
            [0,0,0],
            name || fileBaseName(presetFile),
            comp.width,
            comp.height,
            comp.pixelAspect,
            dur
        );

        solid.startTime = clip.inPoint;
        solid.inPoint = clip.inPoint;
        solid.outPoint = clip.outPoint;
        setNameLabel(solid, name || fileBaseName(presetFile), L_PURPLE);

        applyPresetToSingleLayer(comp, solid, presetFile, clip.inPoint);
        retimePresetLayerKeys(comp, solid, clip, 'Entire Clip');
        easeAllPresetKeys(solid);

        try { solid.moveBefore(clip); } catch (e0) {}
        return solid;
    }

    function applyPresetAdjustmentFullClip(comp, clip, presetFile, name, labelIndex) {
        if (!presetFile || !presetFile.exists) return null;

        var adj = makeAdjustmentForClip(
            comp,
            clip,
            name || fileBaseName(presetFile),
            labelIndex || L_AQUA
        );

        applyPresetToSingleLayer(comp, adj, presetFile, clip.inPoint);
        retimePresetLayerKeys(comp, adj, clip, 'Entire Clip');
        easeAllPresetKeys(adj);
        return adj;
    }

    function createTwoFrameWhiteStartEnd(comp, clips, opacity) {
        var fd = comp.frameDuration;

        for (var i = 0; i < clips.length; i++) {
            var c = clips[i];

            createWhiteFlash(
                comp,
                c.inPoint,
                Math.min(c.outPoint, c.inPoint + fd * 2),
                c,
                opacity
            );

            createWhiteFlash(
                comp,
                Math.max(c.inPoint, c.outPoint - fd * 2),
                c.outPoint,
                c,
                opacity
            );
        }
    }

    function fullClipBlackFlashMild(comp, clips) {
        for (var i = 0; i < clips.length; i++) {
            var c = clips[i];
            var dur = Math.max(comp.frameDuration, c.outPoint - c.inPoint);

            var s = comp.layers.addSolid(
                [0,0,0],
                'Black Flash 2 - Full Clip',
                comp.width,
                comp.height,
                comp.pixelAspect,
                dur
            );

            s.startTime = c.inPoint;
            s.inPoint = c.inPoint;
            s.outPoint = c.outPoint;
            setNameLabel(s, 'Black Flash 2 - Full Clip', L_PURPLE);

            var fx = s.property('ADBE Effect Parade');
            var strobe = addEffect(fx, ['ADBE Strobe', 'Strobe Light']);
            configureBlackStrobe(strobe, comp);

            var op = s.property('ADBE Transform Group').property('ADBE Opacity');
            var a = c.inPoint;
            var b = lastFrame(comp, c);
            var d = Math.max(comp.frameDuration, b-a);

            if (op) {
                op.setValueAtTime(a, 0);
                op.setValueAtTime(a + d*0.18, 34);
                op.setValueAtTime(a + d*0.42, 0);
                op.setValueAtTime(a + d*0.70, 26);
                op.setValueAtTime(b, 0);
                easyEase(op, 86);
            }

            try { s.moveBefore(c); } catch (e0) {}
        }
    }

    function splitLayerAtTimes(comp, layer, times) {
        if (!layer || !times || times.length === 0) return [layer];

        var fd = comp.frameDuration;
        var cuts = [];

        times.sort(function(a,b){ return a-b; });

        for (var i = 0; i < times.length; i++) {
            var t = times[i];
            if (t <= layer.inPoint + fd) continue;
            if (t >= layer.outPoint - fd) continue;

            if (cuts.length === 0 || Math.abs(t - cuts[cuts.length-1]) > fd * 1.5) {
                cuts.push(t);
            }
        }

        if (cuts.length === 0) return [layer];

        var bounds = [layer.inPoint];
        for (var c = 0; c < cuts.length; c++) bounds.push(cuts[c]);
        bounds.push(layer.outPoint);

        var pieces = [layer];
        for (var p = 1; p < bounds.length - 1; p++) {
            try { pieces.push(layer.duplicate()); } catch (e0) {}
        }

        for (var q = 0; q < pieces.length; q++) {
            try { pieces[q].inPoint = bounds[q]; } catch (e1) {}
            try { pieces[q].outPoint = bounds[q+1]; } catch (e2) {}
            try { pieces[q].name = 'scene #' + (q+1); } catch (e3) {}
        }

        // Keep the returned array chronological: scene #1, #2, #3...
        pieces.sort(function(a,b){
            if (a.inPoint < b.inPoint) return -1;
            if (a.inPoint > b.inPoint) return 1;
            return a.index-b.index;
        });

        // IMPORTANT: Arrange the chronological pieces bottom -> top so the
        // visible timeline staircase rises as time moves to the right.
        //
        // scene #1 = lowest
        // scene #2 = directly above scene #1
        // scene #3 = directly above scene #2
        // ...
        //
        // This changes ONLY layer stack order. It does not change in/out points.
        for (var r = 1; r < pieces.length; r++) {
            try {
                pieces[r].moveBefore(pieces[r - 1]);
            } catch (eOrder) {}
        }

        return pieces;
    }

    function parseFFmpegSceneTimes(output) {
        var times = [];
        var re = /pts_time:([0-9]+(?:\\.[0-9]+)?)/g;
        var m;

        while ((m = re.exec(output)) !== null) {
            var t = parseFloat(m[1]);
            if (!isNaN(t)) times.push(t);
        }

        return times;
    }

    function ffmpegSceneTimesForLayer(comp, layer, threshold) {
        var src = null;
        var file = null;

        try { src = layer.source; } catch (e0) {}
        try { file = src.file; } catch (e1) {}

        if (!file || !file.exists) return [];

        var stretch = 100;
        try { stretch = layer.stretch; } catch (e2) {}
        if (stretch <= 0) return [];

        var path = file.fsName.replace(/"/g, '\"');
        var filter = "select='gt(scene," + threshold + ")',showinfo";
        var ff = null;
        try { if (new File('/opt/homebrew/bin/ffmpeg').exists) ff='/opt/homebrew/bin/ffmpeg'; } catch(eff0) {}
        try { if (!ff && new File('/usr/local/bin/ffmpeg').exists) ff='/usr/local/bin/ffmpeg'; } catch(eff1) {}
        if (!ff) return [];
        var command = '"' + ff + '" -hide_banner -i "' + path +
            '" -vf "' + filter + '" -an -f null - 2>&1';

        var output = '';
        try { output = system.callSystem(command); } catch (e3) { return []; }

        if (!output) return [];

        var sourceTimes = parseFFmpegSceneTimes(output);
        var compTimes = [];

        for (var i = 0; i < sourceTimes.length; i++) {
            var ct = layer.startTime + sourceTimes[i] * (stretch / 100.0);
            if (ct > layer.inPoint && ct < layer.outPoint) compTimes.push(ct);
        }

        return compTimes;
    }

    function mergeSceneTimes(comp, a, b) {
        var all = [];
        var i;

        for (i = 0; i < a.length; i++) all.push(a[i]);
        for (i = 0; i < b.length; i++) all.push(b[i]);

        all.sort(function(x,y){ return x-y; });

        var merged = [];
        var tol = comp.frameDuration * 2;

        for (i = 0; i < all.length; i++) {
            if (merged.length === 0 || Math.abs(all[i] - merged[merged.length-1]) > tol) {
                merged.push(all[i]);
            }
        }

        return merged;
    }

    function hybridSceneSplit(comp, layer, threshold) {
        var adobeTimes = [];
        var ffmpegTimes = [];

        try {
            adobeTimes = layer.doSceneEditDetection(SceneEditDetectionMode.NONE) || [];
        } catch (e0) {}

        ffmpegTimes = ffmpegSceneTimesForLayer(comp, layer, threshold);

        var merged = mergeSceneTimes(comp, adobeTimes, ffmpegTimes);
        var pieces = splitLayerAtTimes(comp, layer, merged);

        return {
            pieces: pieces,
            adobeCount: adobeTimes.length,
            ffmpegCount: ffmpegTimes.length,
            mergedCount: merged.length
        };
    }

    function splitSelectedAtPlayhead(comp) {
        var clips = selectedClips(comp);
        if (clips.length !== 1) {
            alert('Select exactly one clip, then place the playhead where you want the missed cut.');
            return [];
        }

        var t = comp.time;
        if (t <= clips[0].inPoint || t >= clips[0].outPoint) {
            alert('The playhead must be inside the selected clip.');
            return [];
        }

        return splitLayerAtTimes(comp, clips[0], [t]);
    }

    function duplicateActiveCompBackup(comp) {
        var copy = null;
        try { copy = comp.duplicate(); } catch (e0) {}
        if (!copy) return null;

        var stamp = new Date();
        var hh = ('0' + stamp.getHours()).slice(-2);
        var mm = ('0' + stamp.getMinutes()).slice(-2);
        try { copy.name = comp.name + ' - BACKUP ' + hh + mm; } catch (e1) {}
        return copy;
    }

    function openPremiumPresetFolder() {
        var root = getPresetRoot();
        try {
            system.callSystem('/usr/bin/open "' + root.fsName.replace(/"/g, '\"') + '"');
        } catch (e0) {}
    }

    function autoEditBasics(comp) {
        var oldTag = ACTIVE_RUN_TAG;
        ACTIVE_RUN_TAG = 'AUTO_BASIC';

        var completed = [];
        var failed = [];

        function step(name, fn) {
            try {
                fn();
                completed.push(name);
            } catch (err) {
                failed.push(name);
            }
        }

        try {
            var clips = allClips(comp);
            var selected = selectedClips(comp);

            // If this is still one long source clip, run the hybrid splitter first.
            // Selection is preferred, but a lone clip is auto-targeted for true one-click use.
            if (clips.length <= 1) {
                var sourceClip = (selected.length === 1) ? selected[0] :
                                 (clips.length === 1 ? clips[0] : null);

                if (sourceClip) {
                    step('Hybrid scene split', function() {
                        hybridSceneSplit(comp, sourceClip, 0.18);
                    });
                    clips = allClips(comp);
                }
            }

            if (clips.length === 0) {
                alert('No editable video clips were found.');
                return;
            }

            step('Motion Tile direct', function() {
                addMotionTile(clips);
            });

            step('Safe precomp each clip', function() {
                var pre = safePrecompEach(comp, clips);
                if (pre && pre.length > 0) clips = pre;
            });

            step('Rename clips', function() {
                renameClipNumbers(clips);
            });

            step('Rainbow clip labels', function() {
                for (var r = 0; r < clips.length; r++) {
                    var lab = RAINBOW[r % RAINBOW.length];
                    try { clips[r].label = lab; } catch (e0) {}
                    try { if (clips[r].source) clips[r].source.label = lab; } catch (e1) {}
                }
            });

            step('2-frame white start/end', function() {
                createTwoFrameWhiteStartEnd(comp, clips, 85);
            });

            step('Mild full-clip Black Flash 2', function() {
                fullClipBlackFlashMild(comp, clips);
            });

            var clip2 = clips.length >= 2 ? clips[1] : null;
            var jawsPreset = findJawsPreset();
            var ripplePreset = findPresetContaining('Favorite Presets', ['tattooedhe8rt', 'ripple']);

            step('Clip #2 Jaws preset', function() {
                if (!clip2 || !jawsPreset) throw new Error('missing clip2/jaws');

                var jawsLayer = applyPresetSolidFullClip(
                    comp,
                    clip2,
                    jawsPreset,
                    'tattooedhe8rt jaws vertical'
                );

                if (!jawsLayer) throw new Error('jaws failed');
            });

            step('Clip #2 Ripple preset', function() {
                if (!clip2 || !ripplePreset) throw new Error('missing clip2/ripple');

                var ripple = applyPresetAdjustmentFullClip(
                    comp,
                    clip2,
                    ripplePreset,
                    'tattooedhe8rt ripple',
                    L_AQUA
                );

                // Jaws solid should stay above Ripple adjustment.
                var jawsLayer = null;
                for (var j = 1; j <= comp.numLayers; j++) {
                    if (comp.layer(j).name === 'tattooedhe8rt jaws vertical') {
                        jawsLayer = comp.layer(j);
                        break;
                    }
                }

                if (jawsLayer && ripple) {
                    try { jawsLayer.moveBefore(ripple); } catch (e0) {}
                }
            });

            step('Panning all clips', function() {
                for (var p = 0; p < clips.length; p++) {
                    var dir = (p % 4 === 0) ? 'Left' :
                              (p % 4 === 1) ? 'Right' :
                              (p % 4 === 2) ? 'Up' : 'Down';

                    applyPan(comp, [clips[p]], dir, 'Entire Clip', 'Too calm');
                }
            });

            step('Rebound all clips', function() {
                for (var rb = 0; rb < clips.length; rb++) {
                    applyRebound(
                        comp,
                        [clips[rb]],
                        'Beginning of Clip',
                        'Super calm',
                        'Calm'
                    );
                }
            });

            step('Fade in/out preset every clip', function() {
                var fadePreset = findPresetContaining(
                    'Favorite Presets',
                    ['exposure', 'fade', 'in', 'out']
                );

                if (!fadePreset) {
                    fadePreset = findPresetContaining(
                        'Favorite Presets',
                        ['tattooedhe8rt', 'fade', 'in', 'out']
                    );
                }

                if (!fadePreset) throw new Error('no fade preset');

                for (var f = 0; f < clips.length; f++) {
                    applyPresetAdjustmentFullClip(
                        comp,
                        clips[f],
                        fadePreset,
                        'Fade In Out - ' + fileBaseName(fadePreset),
                        L_CYAN
                    );
                }
            });

            step('Precomp all helper layers to everything', function() {
                var parent = precomposeHelperLayersNotClips(comp, 'everything');
                if (!parent) throw new Error('nothing to precomp');
            });

            clearSelection(comp);
            for (var s = 0; s < clips.length; s++) {
                try { clips[s].selected = true; } catch (e0) {}
            }

            var msg = 'AUTO EDIT BASICS finished on ' + clips.length + ' clip(s).';
            msg += '\n\nCompleted: ' + completed.join(', ');
            if (failed.length > 0) msg += '\n\nSkipped / failed: ' + failed.join(', ');
            msg += '\n\nZooms were intentionally left for you to finish manually.';
            alert(msg);
        } finally {
            ACTIVE_RUN_TAG = oldTag;
        }
    }

    function findDirect(group, names) {
        if (!group) return null;
        for (var i = 1; i <= group.numProperties; i++) {
            var p = group.property(i);
            if (!p) continue;

            var nm = "";
            try { nm = p.name; } catch (e0) {}

            for (var n = 0; n < names.length; n++) {
                if (nm === names[n]) return p;
            }
        }
        return null;
    }

    function findRecursive(group, names) {
        if (!group) return null;
        for (var i = 1; i <= group.numProperties; i++) {
            var p = group.property(i);
            if (!p) continue;

            var nm = "";
            try { nm = p.name; } catch (e0) {}

            for (var n = 0; n < names.length; n++) {
                if (nm === names[n]) return p;
            }

            try {
                if (p.numProperties && p.numProperties > 0) {
                    var found = findRecursive(p, names);
                    if (found) return found;
                }
            } catch (e1) {}
        }
        return null;
    }

    function addEffect(effectParade, possibleNames) {
        if (!effectParade) return null;
        for (var i = 0; i < possibleNames.length; i++) {
            try {
                return effectParade.addProperty(possibleNames[i]);
            } catch (e0) {}
        }
        return null;
    }

    function easeArrayCount(prop) {
        try {
            if (prop.propertyValueType === PropertyValueType.TwoD ||
                prop.propertyValueType === PropertyValueType.TwoD_SPATIAL) return 2;

            if (prop.propertyValueType === PropertyValueType.ThreeD ||
                prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) return 3;
        } catch (e0) {}
        return 1;
    }

    function easyEase(prop, influence) {
        if (!prop || prop.numKeys < 1) return;

        var inf = influence || 66.667;
        var dims = easeArrayCount(prop);

        for (var i = 1; i <= prop.numKeys; i++) {
            try {
                prop.setInterpolationTypeAtKey(
                    i,
                    KeyframeInterpolationType.BEZIER,
                    KeyframeInterpolationType.BEZIER
                );

                var inEase = [];
                var outEase = [];

                for (var d = 0; d < dims; d++) {
                    inEase.push(new KeyframeEase(0, inf));
                    outEase.push(new KeyframeEase(0, inf));
                }

                prop.setTemporalEaseAtKey(i, inEase, outEase);
            } catch (e0) {}
        }
    }

    function percentForProperty(prop, pct) {
        // Some third-party/native percentage controls expose 0..1 internally,
        // while others expose 0..100. Detect the actual range.
        try {
            if (prop.maxValue !== undefined && prop.maxValue <= 1.01) {
                return pct / 100.0;
            }
        } catch (e0) {}
        return pct;
    }

    function setPercentKey(prop, time, pct) {
        if (!prop) return;
        try {
            prop.setValueAtTime(time, percentForProperty(prop, pct));
        } catch (e0) {}
    }

    function lastFrame(comp, layer) {
        return Math.max(layer.inPoint, layer.outPoint - comp.frameDuration);
    }

    function setNameLabel(layer, name, labelIndex) {
        try { layer.name = name; } catch (e0) {}
        try { layer.label = labelIndex; } catch (e1) {}
        tagLayer(layer);
        try {
            if (layer.source) {
                layer.source.name = name;
                layer.source.label = labelIndex;
            }
        } catch (e2) {}
    }

    // Default AE label slots.
    var L_RED = 1;
    var L_YELLOW = 2;
    var L_AQUA = 3;
    var L_BLUE = 8;
    var L_GREEN = 9;
    var L_PURPLE = 10;
    var L_ORANGE = 11;
    var L_FUCHSIA = 13;
    var L_CYAN = 14;
    var L_SAND = 15;

    var RAINBOW = [L_RED, L_ORANGE, L_YELLOW, L_GREEN, L_AQUA, L_BLUE, L_PURPLE, L_FUCHSIA];

    function intensity(name) {
        var map = {
            "Too calm":          {p:2,  r:0.10, s:0.35, blur:0.25, black:22},
            "Super calm":        {p:3,  r:0.16, s:0.55, blur:0.40, black:32},
            "Calm":              {p:5,  r:0.25, s:0.85, blur:0.60, black:45},
            "Mild":              {p:8,  r:0.45, s:1.35, blur:1.00, black:60},
            "Semi aggressive":   {p:12, r:0.80, s:2.10, blur:1.40, black:74},
            "Super aggressive":  {p:18, r:1.30, s:3.20, blur:1.95, black:88},
            "Insane":            {p:28, r:2.10, s:5.00, blur:2.80, black:100}
        };
        return map[name] || map["Mild"];
    }

    function reboundSpeed(name) {
        var map = {
            "Too calm":      {frames:18, ratio:1.00},
            "Calm":          {frames:14, ratio:0.88},
            "Mild":          {frames:10, ratio:0.74},
            "Fast":          {frames:7,  ratio:0.56},
            "Super fast":    {frames:5,  ratio:0.40},
            "Insanely fast": {frames:3,  ratio:0.25}
        };
        return map[name] || map["Mild"];
    }

    function timingSpan(comp, clip, mode, beginningFrames, ratio) {
        var fd = comp.frameDuration;
        var a = clip.inPoint;
        var clipEnd = lastFrame(comp, clip);
        var b = clipEnd;
        var m = low(mode);

        if (m.indexOf("entire") !== -1) {
            b = clipEnd;
        } else if (m.indexOf("middle") !== -1) {
            b = a + (clipEnd - a) * 0.5;
        } else {
            b = Math.min(clipEnd, a + fd * Math.max(2, beginningFrames));
        }

        if (ratio !== undefined &&
            m.indexOf("middle") !== -1 &&
            m.indexOf("entire") === -1) {
            b = a + (b - a) * ratio;
        }

        if (b <= a) b = Math.min(clipEnd, a + fd);
        return {a:a, b:b};
    }

    function transformEffect(layer, name) {
        var fx = layer.property("ADBE Effect Parade");
        var tr = addEffect(fx, ["ADBE Geometry2", "Transform"]);
        if (tr) {
            try { tr.name = name + runTagSuffix(); } catch (e0) {}
        }
        return tr;
    }

    // ============================================================
    // MOTION TILE
    // ============================================================

    function addMotionTile(clips) {
        for (var i = 0; i < clips.length; i++) {
            var fx = clips[i].property("ADBE Effect Parade");
            if (!fx) continue;

            var mt = null;

            for (var j = 1; j <= fx.numProperties; j++) {
                var p = fx.property(j);
                try {
                    if (p && has(p.name, "Ethan Motion Tile")) {
                        mt = p;
                        break;
                    }
                } catch (e0) {}
            }

            if (!mt) {
                mt = addEffect(fx, ["ADBE Tile", "Motion Tile"]);

                if (mt) {
                    try { mt.name = "Ethan Motion Tile" + runTagSuffix(); } catch (e1) {}
                }
            }

            if (!mt) continue;

            var w = findDirect(mt, ["Output Width"]);
            var h = findDirect(mt, ["Output Height"]);
            var mirror = findDirect(mt, ["Mirror Edges"]);

            try { if (w) w.setValue(200); } catch (e2) {}
            try { if (h) h.setValue(200); } catch (e3) {}
            try { if (mirror) mirror.setValue(1); } catch (e4) {}
        }
    }

    // ============================================================
    // WHITE FLASH
    // ============================================================

    function createWhiteFlash(comp, a, b, clipOrLayer, opacity) {
        if (b <= a) return null;

        var s = comp.layers.addSolid(
            [1,1,1],
            "White Flash Transition",
            comp.width,
            comp.height,
            comp.pixelAspect,
            Math.max(comp.frameDuration, b - a)
        );

        s.startTime = a;
        s.inPoint = a;
        s.outPoint = b;

        setNameLabel(s, "White Flash Transition", L_GREEN);

        var op = s.property("ADBE Transform Group").property("ADBE Opacity");
        try { op.setValue(clamp(opacity, 0, 100)); } catch (e0) {}

        if (clipOrLayer) {
            try { s.moveBefore(clipOrLayer); } catch (e1) {}
        }

        return s;
    }

    function whiteFlashStartEnd(comp, clips, opacity) {
        var fd = comp.frameDuration;

        for (var i = 0; i < clips.length; i++) {
            var c = clips[i];

            createWhiteFlash(
                comp,
                c.inPoint,
                Math.min(c.outPoint, c.inPoint + fd),
                c,
                opacity
            );

            createWhiteFlash(
                comp,
                Math.max(c.inPoint, c.outPoint - fd),
                c.outPoint,
                c,
                opacity
            );
        }
    }

    function cutPairs(comp) {
        var clips = allClips(comp);
        var fd = comp.frameDuration;
        var pairs = [];

        for (var i = 0; i < clips.length - 1; i++) {
            if (Math.abs(clips[i].outPoint - clips[i + 1].inPoint) <= fd * 1.5) {
                pairs.push({
                    a: clips[i],
                    b: clips[i + 1],
                    cut: clips[i + 1].inPoint,
                    n: i + 1
                });
            }
        }
        return pairs;
    }

    function whiteFlashEveryCut(comp, opacity) {
        var pairs = cutPairs(comp);
        var fd = comp.frameDuration;

        for (var i = 0; i < pairs.length; i++) {
            createWhiteFlash(
                comp,
                Math.max(0, pairs[i].cut - fd),
                Math.min(comp.duration, pairs[i].cut + fd),
                pairs[i].b,
                opacity
            );
        }
    }

    // ============================================================
    // BLACK FLASH 2
    // ============================================================

    function configureBlackStrobe(effect, comp) {
        if (!effect) return;

        try { effect.name = "Black Flash 2 Flicker"; } catch (e0) {}

        var color = findRecursive(effect, ["Strobe Color"]);
        var blend = findRecursive(effect, ["Blend With Original"]);
        var duration = findRecursive(effect, ["Strobe Duration (secs)", "Strobe Duration"]);
        var period = findRecursive(effect, ["Strobe Period (secs)", "Strobe Period"]);
        var probability = findRecursive(effect, ["Random Strobe Probability"]);
        var mode = findRecursive(effect, ["Strobe"]);
        var operator = findRecursive(effect, ["Strobe Operator"]);

        try { if (color) color.setValue([0,0,0]); } catch (e1) {}
        try { if (blend) blend.setValue(0); } catch (e2) {}
        try { if (duration) duration.setValue(comp.frameDuration); } catch (e3) {}
        try { if (period) period.setValue(comp.frameDuration * 2); } catch (e4) {}
        try { if (probability) probability.setValue(0); } catch (e5) {}

        dropdownByText(mode, "Makes Layer Transparent");
        dropdownByText(operator, "Copy");
    }

    function blackPulse(comp, clip, centerTime, peakOpacity) {
        var fd = comp.frameDuration;
        var desired = fd * 4;
        var half = desired * 0.5;
        var a = Math.max(clip.inPoint, centerTime - half);
        var b = Math.min(clip.outPoint, centerTime + half);

        if (b - a < fd) {
            a = Math.max(clip.inPoint, Math.min(centerTime, clip.outPoint - fd));
            b = Math.min(clip.outPoint, a + fd);
        }

        if (b <= a) return null;

        var s = comp.layers.addSolid(
            [0,0,0],
            "Black Flash 2",
            comp.width,
            comp.height,
            comp.pixelAspect,
            Math.max(fd, b - a)
        );

        s.startTime = a;
        s.inPoint = a;
        s.outPoint = b;
        setNameLabel(s, "Black Flash 2", L_PURPLE);

        var fx = s.property("ADBE Effect Parade");
        var strobe = addEffect(fx, ["ADBE Strobe", "Strobe Light"]);
        configureBlackStrobe(strobe, comp);

        var op = s.property("ADBE Transform Group").property("ADBE Opacity");
        var endKey = Math.max(a, b - fd * 0.05);
        var t1 = a + (endKey - a) * 0.34;
        var t2 = a + (endKey - a) * 0.62;

        if (op) {
            op.setValueAtTime(a, 0);
            op.setValueAtTime(t1, peakOpacity);
            op.setValueAtTime(t2, peakOpacity * 0.48);
            op.setValueAtTime(endKey, 0);
            easyEase(op, 86);
        }

        try { s.moveBefore(clip); } catch (e0) {}
        return s;
    }

    function applyBlackFlash(comp, clips, placement, intensityName) {
        var d = intensity(intensityName);

        for (var i = 0; i < clips.length; i++) {
            var c = clips[i];
            var mid = c.inPoint + (c.outPoint - c.inPoint) * 0.5;

            if (placement === "Beginning") {
                blackPulse(comp, c, c.inPoint + comp.frameDuration * 2, d.black);
            } else if (placement === "Middle") {
                blackPulse(comp, c, mid, d.black);
            } else if (placement === "End") {
                blackPulse(comp, c, c.outPoint - comp.frameDuration * 2, d.black);
            } else {
                blackPulse(comp, c, c.inPoint + comp.frameDuration * 2, d.black);
                blackPulse(comp, c, mid, d.black);
                blackPulse(comp, c, c.outPoint - comp.frameDuration * 2, d.black);
            }
        }
    }

    // ============================================================
    // SHAKE / PANNING / REBOUND / SLIDES
    // ============================================================

    function applyBatchDirectionalMotion(
        comp,
        kind,
        clipsPerBatch,
        directions,
        mode,
        intensityName
    ) {
        var clips = allClips(comp);
        if (clips.length === 0) return 0;

        clipsPerBatch = Math.max(1, Math.round(clipsPerBatch));

        for (var i = 0; i < clips.length; i++) {
            var batch = Math.floor(i / clipsPerBatch);
            var direction = directions[batch % directions.length];

            if (kind === "Pan") {
                applyPan(comp, [clips[i]], direction, mode, intensityName);
            } else {
                applySlide(comp, [clips[i]], direction, mode, intensityName);
            }
        }

        return clips.length;
    }


    function applyShake(comp, clips, mode, intensityName) {
        var d = intensity(intensityName);
        addMotionTile(clips);

        for (var i = 0; i < clips.length; i++) {
            var c = clips[i];
            var t = timingSpan(comp, c, mode, 6);
            var tr = transformEffect(c, "Ethan Shake");
            if (!tr) continue;

            var pos = findDirect(tr, ["Position"]);
            var rot = findDirect(tr, ["Rotation"]);
            var sc = findDirect(tr, ["Scale"]);

            var cx = comp.width / 2;
            var cy = comp.height / 2;
            var t1 = t.a + (t.b - t.a) * 0.33;
            var t2 = t.a + (t.b - t.a) * 0.66;

            if (pos) {
                pos.setValueAtTime(t.a, [cx + d.p, cy - d.p * 0.45]);
                pos.setValueAtTime(t1, [cx - d.p * 0.72, cy + d.p * 0.38]);
                pos.setValueAtTime(t2, [cx + d.p * 0.28, cy - d.p * 0.18]);
                pos.setValueAtTime(t.b, [cx, cy]);
                easyEase(pos, 80);
            }

            if (rot) {
                rot.setValueAtTime(t.a, -d.r);
                rot.setValueAtTime(t1, d.r * 0.68);
                rot.setValueAtTime(t2, -d.r * 0.25);
                rot.setValueAtTime(t.b, 0);
                easyEase(rot, 80);
            }

            if (sc) {
                sc.setValueAtTime(t.a, 100 + d.s);
                sc.setValueAtTime(t.b, 100);
                easyEase(sc, 80);
            }
        }
    }

    function applyPan(comp, clips, direction, mode, intensityName) {
        var d = intensity(intensityName);
        addMotionTile(clips);

        for (var i = 0; i < clips.length; i++) {
            var c = clips[i];
            var t = timingSpan(comp, c, mode, 12);
            var tr = transformEffect(c, "Ethan Pan " + direction);
            if (!tr) continue;

            var pos = findDirect(tr, ["Position"]);
            var sc = findDirect(tr, ["Scale"]);
            var cx = comp.width / 2;
            var cy = comp.height / 2;

            var ox = comp.width * 0.055 * (d.p / 8);
            var oy = comp.height * 0.055 * (d.p / 8);
            var from = [cx, cy];

            if (direction === "Left") from = [cx + ox, cy];
            if (direction === "Right") from = [cx - ox, cy];
            if (direction === "Up") from = [cx, cy + oy];
            if (direction === "Down") from = [cx, cy - oy];

            if (pos) {
                pos.setValueAtTime(t.a, from);
                pos.setValueAtTime(t.b, [cx, cy]);
                easyEase(pos, 82);
            }

            if (sc) {
                sc.setValueAtTime(t.a, 101 + d.s * 0.45);
                sc.setValueAtTime(t.b, 100);
                easyEase(sc, 82);
            }
        }
    }

    function applyRebound(comp, clips, mode, intensityName, speedName) {
        var d = intensity(intensityName);
        var sp = reboundSpeed(speedName);
        addMotionTile(clips);

        for (var i = 0; i < clips.length; i++) {
            var c = clips[i];
            var t = timingSpan(comp, c, mode, sp.frames, sp.ratio);
            var tr = transformEffect(c, "Rebound Swing");
            if (!tr) continue;

            var pos = findDirect(tr, ["Position"]);
            var rot = findDirect(tr, ["Rotation"]);
            var sc = findDirect(tr, ["Scale"]);

            var cx = comp.width / 2;
            var cy = comp.height / 2;
            var t1 = t.a + (t.b - t.a) * 0.30;
            var t2 = t.a + (t.b - t.a) * 0.64;

            var p = d.p * 0.85;
            var r = d.r * 0.80;

            if (pos) {
                pos.setValueAtTime(t.a, [cx + p, cy]);
                pos.setValueAtTime(t1, [cx - p * 0.55, cy + p * 0.15]);
                pos.setValueAtTime(t2, [cx + p * 0.18, cy - p * 0.07]);
                pos.setValueAtTime(t.b, [cx, cy]);
                easyEase(pos, 82);
            }

            if (rot) {
                rot.setValueAtTime(t.a, r);
                rot.setValueAtTime(t1, -r * 0.62);
                rot.setValueAtTime(t2, r * 0.20);
                rot.setValueAtTime(t.b, 0);
                easyEase(rot, 82);
            }

            if (sc) {
                sc.setValueAtTime(t.a, 100 + d.s * 0.85);
                sc.setValueAtTime(t1, 100 - d.s * 0.10);
                sc.setValueAtTime(t2, 100 + d.s * 0.08);
                sc.setValueAtTime(t.b, 100);
                easyEase(sc, 82);
            }
        }
    }

    function applySlide(comp, clips, direction, mode, intensityName) {
        var d = intensity(intensityName);
        addMotionTile(clips);

        for (var i = 0; i < clips.length; i++) {
            var c = clips[i];
            var t = timingSpan(comp, c, mode, 10);
            var tr = transformEffect(c, "Ethan Smooth Slide " + direction);
            if (!tr) continue;

            var pos = findDirect(tr, ["Position"]);
            var rot = findDirect(tr, ["Rotation"]);
            var sc = findDirect(tr, ["Scale"]);
            var fx = c.property("ADBE Effect Parade");

            var db = addEffect(fx, ["ADBE Motion Blur", "Directional Blur"]);
            if (db) {
                try { db.name = "Ethan Slide Blur"; } catch (e0) {}
            }

            var len = db ? findDirect(db, ["Blur Length"]) : null;
            var dir = db ? findDirect(db, ["Direction"]) : null;

            var cx = comp.width / 2;
            var cy = comp.height / 2;
            var ox = comp.width * 0.10 * (d.p / 8);
            var oy = comp.height * 0.10 * (d.p / 8);

            var from = [cx, cy];
            var angle = 90;
            var rr = 0;

            if (direction === "Left")  { from = [cx + ox, cy]; angle = 90; rr = 0.25; }
            if (direction === "Right") { from = [cx - ox, cy]; angle = 90; rr = -0.25; }
            if (direction === "Up")    { from = [cx, cy + oy]; angle = 0; rr = -0.18; }
            if (direction === "Down")  { from = [cx, cy - oy]; angle = 0; rr = 0.18; }

            if (pos) {
                pos.setValueAtTime(t.a, from);
                pos.setValueAtTime(t.b, [cx, cy]);
                easyEase(pos, 84);
            }

            if (rot) {
                rot.setValueAtTime(t.a, rr * (d.p / 8));
                rot.setValueAtTime(t.b, 0);
                easyEase(rot, 84);
            }

            if (sc) {
                sc.setValueAtTime(t.a, 101.5 + d.s * 0.65);
                sc.setValueAtTime(t.b, 100);
                easyEase(sc, 84);
            }

            try { if (dir) dir.setValue(angle); } catch (e1) {}

            if (len) {
                len.setValueAtTime(t.a, 15 * d.blur);
                len.setValueAtTime(t.a + (t.b - t.a) * 0.50, 6 * d.blur);
                len.setValueAtTime(t.b, 0);
                easyEase(len, 84);
            }
        }
    }

    // ============================================================
    // TRANSITIONS
    // ============================================================

    function transitionHelper(comp, pair, name, sideFrames) {
        var fd = comp.frameDuration;
        sideFrames = Math.max(1, Math.round(sideFrames));

        var a = Math.max(0, pair.cut - fd * sideFrames);
        var b = Math.min(comp.duration, pair.cut + fd * sideFrames);

        var adj = comp.layers.addSolid(
            [1,1,1],
            "transition - " + name,
            comp.width,
            comp.height,
            comp.pixelAspect,
            Math.max(fd, b - a)
        );

        adj.adjustmentLayer = true;
        adj.startTime = a;
        adj.inPoint = a;
        adj.outPoint = b;

        setNameLabel(adj, "transition - " + name, L_AQUA);

        try { adj.moveBefore(pair.b); } catch (e0) {}

        return {
            layer: adj,
            a: a,
            m: pair.cut,
            b: Math.max(a, b - fd * 0.01)
        };
    }

    function transitionTimeSlice(comp, pair, frames, intensityName) {
        var d = intensity(intensityName);
        var h = transitionHelper(comp, pair, "Time Slice", frames);
        var fx = h.layer.property("ADBE Effect Parade");

        var vb = addEffect(fx, ["ADBE Venetian Blinds", "Venetian Blinds"]);

        if (vb) {
            var completion = findRecursive(vb, ["Transition Completion", "Completion"]);
            var width = findRecursive(vb, ["Width"]);
            var feather = findRecursive(vb, ["Feather"]);
            var direction = findRecursive(vb, ["Direction"]);

            try { if (direction) direction.setValue(90); } catch (e0) {}
            try { if (width) width.setValue(Math.max(4, 18 / d.blur)); } catch (e1) {}
            try { if (feather) feather.setValue(0); } catch (e2) {}

            if (completion) {
                completion.setValueAtTime(h.a, 0);
                completion.setValueAtTime(h.m, clamp(60 * d.blur, 25, 92));
                completion.setValueAtTime(h.b, 0);
                easyEase(completion, 84);
            }
        }
    }

    function transitionGlitch(comp, pair, frames, intensityName) {
        var d = intensity(intensityName);
        var h = transitionHelper(comp, pair, "Glitch Burst", frames);
        var fx = h.layer.property("ADBE Effect Parade");

        var td = addEffect(fx, ["ADBE Turbulent Displace", "Turbulent Displace"]);
        if (td) {
            var amount = findRecursive(td, ["Amount"]);
            if (amount) {
                amount.setValueAtTime(h.a, 0);
                amount.setValueAtTime(h.m, 42 * d.blur);
                amount.setValueAtTime(h.b, 0);
                easyEase(amount, 82);
            }
        }

        var tr = addEffect(fx, ["ADBE Geometry2", "Transform"]);
        if (tr) {
            var pos = findDirect(tr, ["Position"]);
            var rot = findDirect(tr, ["Rotation"]);
            var cx = comp.width / 2;
            var cy = comp.height / 2;

            if (pos) {
                pos.setValueAtTime(h.a, [cx, cy]);
                pos.setValueAtTime(h.m, [cx + d.p * 1.8, cy - d.p * 0.6]);
                pos.setValueAtTime(h.b, [cx, cy]);
                easyEase(pos, 82);
            }

            if (rot) {
                rot.setValueAtTime(h.a, 0);
                rot.setValueAtTime(h.m, d.r * 0.85);
                rot.setValueAtTime(h.b, 0);
                easyEase(rot, 82);
            }
        }
    }

    function transitionBlur(comp, pair, frames, intensityName) {
        var d = intensity(intensityName);
        var h = transitionHelper(comp, pair, "Blur Snap", frames);
        var fx = h.layer.property("ADBE Effect Parade");

        var g = addEffect(fx, ["ADBE Gaussian Blur 2", "Gaussian Blur"]);
        if (g) {
            var blur = findDirect(g, ["Blurriness"]);
            var rep = findDirect(g, ["Repeat Edge Pixels"]);

            if (blur) {
                blur.setValueAtTime(h.a, 0);
                blur.setValueAtTime(h.m, 34 * d.blur);
                blur.setValueAtTime(h.b, 0);
                easyEase(blur, 84);
            }

            try { if (rep) rep.setValue(1); } catch (e0) {}
        }
    }

    function transitionExposure(comp, pair, frames, intensityName) {
        var d = intensity(intensityName);
        var h = transitionHelper(comp, pair, "Exposure Pop", frames);
        var fx = h.layer.property("ADBE Effect Parade");

        var ex = addEffect(fx, ["ADBE Exposure2", "Exposure"]);
        if (ex) {
            var p = findDirect(ex, ["Exposure"]);
            if (p) {
                p.setValueAtTime(h.a, 0);
                p.setValueAtTime(h.m, 1.15 * d.blur);
                p.setValueAtTime(h.b, 0);
                easyEase(p, 84);
            }
        }
    }

    function transitionSmear(comp, pair, frames, intensityName) {
        var d = intensity(intensityName);
        var h = transitionHelper(comp, pair, "Slide Smear", frames);
        var fx = h.layer.property("ADBE Effect Parade");

        var tr = addEffect(fx, ["ADBE Geometry2", "Transform"]);
        var cx = comp.width / 2;
        var cy = comp.height / 2;

        if (tr) {
            var pos = findDirect(tr, ["Position"]);
            if (pos) {
                pos.setValueAtTime(h.a, [cx, cy]);
                pos.setValueAtTime(h.m, [cx + comp.width * 0.05 * d.blur, cy]);
                pos.setValueAtTime(h.b, [cx, cy]);
                easyEase(pos, 84);
            }
        }

        var db = addEffect(fx, ["ADBE Motion Blur", "Directional Blur"]);
        if (db) {
            var len = findDirect(db, ["Blur Length"]);
            if (len) {
                len.setValueAtTime(h.a, 0);
                len.setValueAtTime(h.m, 28 * d.blur);
                len.setValueAtTime(h.b, 0);
                easyEase(len, 84);
            }
        }
    }

    function transitionZoom(comp, pair, frames, intensityName) {
        var d = intensity(intensityName);
        var h = transitionHelper(comp, pair, "Micro Zoom Punch", frames);
        var fx = h.layer.property("ADBE Effect Parade");

        var tr = addEffect(fx, ["ADBE Geometry2", "Transform"]);
        if (tr) {
            var sc = findDirect(tr, ["Scale"]);
            if (sc) {
                sc.setValueAtTime(h.a, 100);
                sc.setValueAtTime(h.m, 106 + d.s * 1.3);
                sc.setValueAtTime(h.b, 100);
                easyEase(sc, 84);
            }
        }
    }

    function applyTransitionStyle(comp, pairs, style, frames, intensityName) {
        var funcs = [
            transitionTimeSlice,
            transitionGlitch,
            transitionBlur,
            transitionExposure,
            transitionSmear,
            transitionZoom
        ];

        for (var i = 0; i < pairs.length; i++) {
            if (style === "Time Slice") transitionTimeSlice(comp, pairs[i], frames, intensityName);
            else if (style === "Glitch Burst") transitionGlitch(comp, pairs[i], frames, intensityName);
            else if (style === "Blur Snap") transitionBlur(comp, pairs[i], frames, intensityName);
            else if (style === "Exposure Pop") transitionExposure(comp, pairs[i], frames, intensityName);
            else if (style === "Slide Smear") transitionSmear(comp, pairs[i], frames, intensityName);
            else if (style === "Micro Zoom Punch") transitionZoom(comp, pairs[i], frames, intensityName);
            else funcs[i % funcs.length](comp, pairs[i], frames, intensityName);
        }
    }

    // ============================================================
    // SATURATION CHANGER
    // ============================================================

    function addSaturationChanger(comp, clip, mode, pulse) {
        var t = timingSpan(comp, clip, mode, 6);
        var dur = Math.max(comp.frameDuration, t.b - t.a + comp.frameDuration);

        var adj = comp.layers.addSolid(
            [1,1,1],
            "saturation changer",
            comp.width,
            comp.height,
            comp.pixelAspect,
            dur
        );

        adj.adjustmentLayer = true;
        adj.startTime = t.a;
        adj.inPoint = t.a;
        adj.outPoint = Math.min(clip.outPoint, t.b + comp.frameDuration);

        setNameLabel(adj, "saturation changer", L_CYAN);

        var fx = adj.property("ADBE Effect Parade");
        var hs = addEffect(fx, ["ADBE HUE SATURATION", "Hue/Saturation"]);

        if (hs) {
            var sat = findRecursive(hs, ["Master Saturation", "Saturation"]);
            try { if (sat) sat.setValue(-100); } catch (e0) {}
        }

        var op = adj.property("ADBE Transform Group").property("ADBE Opacity");

        if (op) {
            if (pulse) {
                var m = t.a + (t.b - t.a) * 0.5;
                op.setValueAtTime(t.a, 0);
                op.setValueAtTime(m, 100);
                op.setValueAtTime(t.b, 0);
            } else {
                op.setValueAtTime(t.a, 100);
                op.setValueAtTime(t.b, 0);
            }
            easyEase(op, 84);
        }

        try { adj.moveBefore(clip); } catch (e1) {}
        return adj;
    }

    // ============================================================
    // BCC RIPPLE DISSOLVE INTRO
    // ============================================================

    function setEffectValue(effect, possibleNames, value) {
        var p = findRecursive(effect, possibleNames);
        if (!p) return false;
        try {
            p.setValue(value);
            return true;
        } catch (e0) {
            return false;
        }
    }

    function addBCCRippleIntro(comp, clip) {
        var a = clip.inPoint;
        var b = Math.min(comp.duration, a + 4.0);
        var dur = Math.max(comp.frameDuration, b - a);

        var adj = comp.layers.addSolid(
            [1,1,1],
            "BCC Ripple Dissolve Intro",
            comp.width,
            comp.height,
            comp.pixelAspect,
            dur
        );

        adj.adjustmentLayer = true;
        adj.startTime = a;
        adj.inPoint = a;
        adj.outPoint = b;

        setNameLabel(adj, "BCC Ripple Dissolve Intro", L_AQUA);

        var fx = adj.property("ADBE Effect Parade");
        var bcc = addEffect(fx, ["BCC Ripple Dissolve", "BCC+ Ripple Dissolve"]);

        if (!bcc) {
            alert(
                "BCC Ripple Dissolve was not found by its installed display name.\n\n" +
                "The 4-second intro adjustment was created, but the BCC effect itself could not be added."
            );
            try { adj.moveBefore(clip); } catch (e0) {}
            return adj;
        }

        try { bcc.name = "BCC Ripple Dissolve - Ethan Intro"; } catch (e1) {}

        var layerReveal = findRecursive(bcc, ["Layer to Reveal"]);
        try { if (layerReveal) layerReveal.setValue(clip.index); } catch (e2) {}

        var animation = findRecursive(bcc, ["Animation"]);
        dropdownByText(animation, "Auto");

        setEffectValue(bcc, ["Radius Peak"], 500);
        setEffectValue(bcc, ["Center"], [comp.width / 2, comp.height / 2]);
        setEffectValue(bcc, ["Height"], 25);
        setEffectValue(bcc, ["Perpendicular Height"], 0);
        setEffectValue(bcc, ["Wave Width"], 50);
        setEffectValue(bcc, ["Width Percent Increase"], 300);
        setEffectValue(bcc, ["Speed"], 20);
        setEffectValue(bcc, ["Speed Deceleration"], 100);
        setEffectValue(bcc, ["Phase"], 0);
        setEffectValue(bcc, ["Inside Radius"], 400);
        setEffectValue(bcc, ["Fall Off", "Falloff"], 50);

        setEffectValue(bcc, ["Light Level"], 75);
        setEffectValue(bcc, ["Light Color"], [1,1,1]);
        setEffectValue(bcc, ["Light Width"], 50);
        setEffectValue(bcc, ["Light Focus"], -90);
        setEffectValue(bcc, ["Light Angle"], 55);
        setEffectValue(bcc, ["Light Elevation"], 75);

        var applyMode = findRecursive(bcc, ["Apply Mode"]);
        dropdownByText(applyMode, "Add");

        setEffectValue(bcc, ["Pin Width"], 8);

        var extras = findRecursive(bcc, ["Apply Ripple To", "Extras"]);
        dropdownByText(extras, "Dissolve");

        setEffectValue(bcc, ["Ease In"], -78);
        setEffectValue(bcc, ["Ease Out"], -55);
        setEffectValue(bcc, ["Dissolve Duration"], 60);

        try { adj.moveBefore(clip); } catch (e3) {}
        return adj;
    }

    function applyIntroClip(comp, clip, saturationMode) {
        var ripple = addBCCRippleIntro(comp, clip);

        createWhiteFlash(
            comp,
            clip.inPoint,
            Math.min(clip.outPoint, clip.inPoint + comp.frameDuration * 2),
            clip,
            85
        );

        var jawsPreset = findJawsPreset();

        if (jawsPreset) {
            var jawsLayer = applyJawsPresetToClip(comp, clip, jawsPreset);

            if (jawsLayer && ripple) {
                try { jawsLayer.moveBefore(ripple); } catch (e0) {}
            }
        }

        addSaturationChanger(comp, clip, saturationMode, false);
        return ripple;
    }

    // ============================================================
    // SAFE PRECOMP / RENAME
    // ============================================================

    function safePrecompEach(comp, clips) {
        var work = clips.slice(0);

        work.sort(function(a, b) {
            try { return b.index - a.index; } catch (e0) { return 0; }
        });

        var result = [];

        for (var i = 0; i < work.length; i++) {
            var layer = work[i];
            var idx, inP, outP, nm;

            try {
                idx = layer.index;
                inP = layer.inPoint;
                outP = layer.outPoint;
                nm = layer.name;
            } catch (e0) {
                continue;
            }

            var newComp = null;

            try {
                newComp = comp.layers.precompose([idx], nm + " PRECOMP", true);
            } catch (e1) {
                try { result.push(layer); } catch (eKeep) {}
                continue;
            }

            var parent = null;

            for (var j = 1; j <= comp.numLayers; j++) {
                var candidate = comp.layer(j);
                try {
                    if (candidate instanceof AVLayer && candidate.source === newComp) {
                        parent = candidate;
                        break;
                    }
                } catch (e2) {}
            }

            if (!parent) {
                try { parent = comp.layer(idx); } catch (e3) {}
            }

            if (parent) {
                try { parent.inPoint = inP; } catch (e4) {}
                try { parent.outPoint = outP; } catch (e5) {}
                try { parent.name = nm + " PRECOMP"; } catch (e6) {}
                result.push(parent);
            }
        }

        result.sort(function(a, b) {
            if (a.inPoint < b.inPoint) return -1;
            if (a.inPoint > b.inPoint) return 1;
            return a.index - b.index;
        });

        return result;
    }

    function renameClipNumbers(clips) {
        for (var i = 0; i < clips.length; i++) {
            try { clips[i].name = "clip #" + (i + 1); } catch (e0) {}
        }
    }

    // ============================================================
    // RAINBOW / ORGANIZER
    // ============================================================

    function selectEverything(comp) {
        for (var i = 1; i <= comp.numLayers; i++) {
            try { comp.layer(i).selected = true; } catch (e0) {}
        }
    }

    function rainbowify(comp) {
        for (var i = 1; i <= comp.numLayers; i++) {
            var l = comp.layer(i);
            var lab = RAINBOW[(i - 1) % RAINBOW.length];

            try { l.label = lab; } catch (e0) {}
            try { if (l.source) l.source.label = lab; } catch (e1) {}
        }
    }

    function organizeByType(comp) {
        var solids = [];
        var adjustments = [];
        var clips = [];
        var others = [];

        for (var i = 1; i <= comp.numLayers; i++) {
            var l = comp.layer(i);
            var isSolid = false;

            try {
                isSolid = (
                    l instanceof AVLayer &&
                    l.source instanceof FootageItem &&
                    l.source.mainSource instanceof SolidSource &&
                    !l.adjustmentLayer
                );
            } catch (e0) {}

            if (isSolid) solids.push(l);
            else if (l.adjustmentLayer) adjustments.push(l);
            else if (isLikelyClip(l)) clips.push(l);
            else others.push(l);
        }

        var desired = solids.concat(adjustments).concat(clips).concat(others);

        // Move from bottom of desired order to top to preserve the final ordering.
        for (var j = desired.length - 1; j >= 0; j--) {
            try { desired[j].moveToBeginning(); } catch (e1) {}
        }
    }

    // ============================================================
    // AUDIO
    // ============================================================

    function muteAllClipAudio(comp, mute) {
        var clips = selectAllSplitClips(comp, true);

        for (var i = 0; i < clips.length; i++) {
            try { clips[i].audioEnabled = !mute; } catch (e0) {}
        }

        return clips.length;
    }


    function fullSoundClip(comp) {
        var clips = allClips(comp);

        if (clips.length === 0) {
            alert("I couldn't find clip #1.");
            return;
        }

        var original = clips[0];
        var dupe = null;

        try { dupe = original.duplicate(); } catch (e0) {}

        if (!dupe) {
            alert("Could not duplicate clip #1.");
            return;
        }

        try { dupe.name = "clip #1 video duplicate"; } catch (e1) {}
        try { original.name = "Full Sound Clip"; } catch (e2) {}

        // Original becomes audio-only.
        try { original.enabled = false; } catch (e3) {}
        try { original.audioEnabled = true; } catch (e4) {}

        // Extend the layer bounds. Actual playable audio still depends on source duration.
        try { original.inPoint = 0; } catch (e5) {}
        try { original.outPoint = comp.duration; } catch (e6) {}

        setNameLabel(original, "Full Sound Clip", L_ORANGE);

        alert(
            "Full Sound Clip created.\n\n" +
            "The original clip #1 is video-off/audio-on and extended to comp bounds as far as the source permits."
        );
    }

    // ============================================================
    // ZOOM ADJUSTMENT LAYERS + CAPCUT-STYLE RECREATIONS
    // ============================================================

    function makeAdjustmentForClip(comp, clip, name, labelIndex) {
        var dur = Math.max(comp.frameDuration, clip.outPoint - clip.inPoint);

        var adj = comp.layers.addSolid(
            [1,1,1],
            name,
            comp.width,
            comp.height,
            comp.pixelAspect,
            dur
        );

        adj.adjustmentLayer = true;
        adj.startTime = clip.inPoint;
        adj.inPoint = clip.inPoint;
        adj.outPoint = clip.outPoint;

        setNameLabel(adj, name, labelIndex || L_BLUE);

        try { adj.moveBefore(clip); } catch (e0) {}
        return adj;
    }

    function addStarterBlurAdjustment(comp, clip) {
        var adj = makeAdjustmentForClip(comp, clip, "Ethan Starter Blur", L_YELLOW);
        var fx = adj.property("ADBE Effect Parade");
        var g = addEffect(fx, ["ADBE Gaussian Blur 2", "Gaussian Blur"]);

        if (g) {
            try { g.name = "Ethan Starter Blur"; } catch (e0) {}

            var blur = findDirect(g, ["Blurriness"]);
            var rep = findDirect(g, ["Repeat Edge Pixels"]);

            var a = clip.inPoint;
            var b = Math.min(lastFrame(comp, clip), a + comp.frameDuration * 5);

            if (blur) {
                blur.setValueAtTime(a, 18);
                blur.setValueAtTime(b, 0);
                easyEase(blur, 84);
            }

            try { if (rep) rep.setValue(1); } catch (e1) {}
        }

        return adj;
    }

    function addExposureAdjustment(comp, clip) {
        var adj = makeAdjustmentForClip(comp, clip, "Ethan Fade Exposure", L_AQUA);
        var fx = adj.property("ADBE Effect Parade");
        var ex = addEffect(fx, ["ADBE Exposure2", "Exposure"]);

        if (ex) {
            try { ex.name = "Ethan Fade Exposure"; } catch (e0) {}

            var p = findDirect(ex, ["Exposure"]);
            var a = clip.inPoint;
            var b = lastFrame(comp, clip);
            var m = a + (b - a) * 0.5;

            if (p) {
                p.setValueAtTime(a, -5);
                p.setValueAtTime(m, 1.77);
                p.setValueAtTime(b, 0);
                easyEase(p, 82);
            }
        }

        return adj;
    }

    // ============================================================
    // CAPCUT TAB RECREATIONS
    // ============================================================

    function capcutTiming(comp, clip, placement, durationFrames) {
        // durationFrames is kept only for backward compatibility with internal calls.
        var fd = comp.frameDuration;
        var a = clip.inPoint;
        var b = Math.min(lastFrame(comp, clip), a + fd * 6);

        if (placement === "Beginning and Middle of Clip") {
            b = a + (lastFrame(comp, clip) - a) * 0.5;
        } else if (placement === "Entire Clip") {
            b = lastFrame(comp, clip);
        }

        if (b <= a) b = Math.min(lastFrame(comp, clip), a + fd);
        return {a:a, b:b};
    }

    function capcutFade(comp, clips, isIn, placement, durationFrames, intensityName) {
        var d = intensity(intensityName);

        for (var i = 0; i < clips.length; i++) {
            var clip = clips[i];
            addMotionTile([clip]);
            var adj = makeAdjustmentForClip(comp, clip, isIn ? "CapCut Fade In" : "CapCut Fade Out", L_FUCHSIA);
            var op = adj.property("ADBE Transform Group").property("ADBE Opacity");
            var t = capcutTiming(comp, clip, placement, durationFrames);

            if (op) {
                if (isIn) {
                    op.setValueAtTime(t.a, clamp(15 / Math.max(0.25, d.blur), 0, 60));
                    op.setValueAtTime(t.b, 100);
                } else {
                    op.setValueAtTime(t.a, 100);
                    op.setValueAtTime(t.b, clamp(15 / Math.max(0.25, d.blur), 0, 60));
                }
                easyEase(op, 84);
            }
        }
    }

    function capcutHorizontalBlur(comp, clips, isIn, placement, durationFrames, intensityName) {
        var d = intensity(intensityName);

        for (var i = 0; i < clips.length; i++) {
            var clip = clips[i];
            addMotionTile([clip]);
            var adj = makeAdjustmentForClip(
                comp,
                clip,
                isIn ? "CapCut Horizontal Blur In" : "CapCut Horizontal Blur Out",
                L_FUCHSIA
            );

            var fx = adj.property("ADBE Effect Parade");
            var db = addEffect(fx, ["ADBE Motion Blur", "Directional Blur"]);

            if (db) {
                try { db.name = isIn ? "CapCut Horizontal Blur In" : "CapCut Horizontal Blur Out"; } catch (e0) {}

                var len = findDirect(db, ["Blur Length"]);
                var dir = findDirect(db, ["Direction"]);
                var t = capcutTiming(comp, clip, placement, durationFrames);

                try { if (dir) dir.setValue(90); } catch (e1) {}

                if (len) {
                    if (isIn) {
                        len.setValueAtTime(t.a, 30 * d.blur);
                        len.setValueAtTime(t.b, 0);
                    } else {
                        len.setValueAtTime(t.a, 0);
                        len.setValueAtTime(t.b, 30 * d.blur);
                    }
                    easyEase(len, 84);
                }
            }
        }
    }

    function capcutFlash(comp, clips, mode, placement, durationFrames, intensityName) {
        var d = intensity(intensityName);

        for (var i = 0; i < clips.length; i++) {
            var clip = clips[i];
            addMotionTile([clip]);
            var adj = makeAdjustmentForClip(comp, clip, "CapCut " + mode, L_FUCHSIA);
            var fx = adj.property("ADBE Effect Parade");
            var ex = addEffect(fx, ["ADBE Exposure2", "Exposure"]);

            if (!ex) continue;

            try { ex.name = "CapCut " + mode; } catch (e0) {}

            var p = findDirect(ex, ["Exposure"]);
            var t = capcutTiming(comp, clip, placement, durationFrames);

            if (!p) continue;

            if (mode === "Flash In") {
                p.setValueAtTime(t.a, 1.5 * d.blur);
                p.setValueAtTime(t.b, 0);
            } else if (mode === "Flash Out") {
                p.setValueAtTime(t.a, 0);
                p.setValueAtTime(t.b, 1.5 * d.blur);
            } else {
                var m = t.a + (t.b - t.a) * 0.5;
                p.setValueAtTime(t.a, 0);
                p.setValueAtTime(m, 1.6 * d.blur);
                p.setValueAtTime(t.b, 0);
            }

            easyEase(p, 84);
        }
    }

    // ============================================================
    // ALL TAB RECIPE
    // ============================================================

    function allRecipe(comp) {
        var originals = selectAllSplitClips(comp, true);

        if (originals.length === 0) {
            alert("No split clips found.");
            return;
        }

        addMotionTile(originals);

        var clips = safePrecompEach(comp, originals);
        if (!clips || clips.length === 0) clips = originals;

        addMotionTile(clips);
        renameClipNumbers(clips);

        for (var i = 0; i < clips.length; i++) {
            var dir = (i % 2 === 0) ? "Left" : "Right";
            applyPan(comp, [clips[i]], dir, "Entire Clip", "Super calm");
            applyRebound(comp, [clips[i]], "Beginning of Clip", "Super calm", "Mild");
            applyBlackFlash(comp, [clips[i]], "Beginning", "Calm");
        }

        whiteFlashStartEnd(comp, clips, 85);
        rainbowify(comp);

        clearSelection(comp);
        for (var j = 0; j < clips.length; j++) {
            try { clips[j].selected = true; } catch (e0) {}
        }
    }

    // ============================================================
    // REMOVE ALL HUB CONTENT
    // ============================================================

    function cleanCompRecursive(comp, visited) {
        var id = String(comp.id);
        if (visited[id]) return;
        visited[id] = true;

        for (var i = comp.numLayers; i >= 1; i--) {
            var l = comp.layer(i);

            if (isGeneratedLayerName(l.name)) {
                try { l.remove(); } catch (e0) {}
                continue;
            }

            if (isTextLayer(l)) {
                var textAnims = textAnimatorsGroup(l);
                if (textAnims) {
                    for (var ta = textAnims.numProperties; ta >= 1; ta--) {
                        var anim = textAnims.property(ta);
                        var animName = "";
                        try { animName = low(anim.name); } catch (eText0) {}

                        if (animName.indexOf("ethan increase tracking") !== -1 ||
                            animName.indexOf("ethan fade up words") !== -1 ||
                            animName.indexOf("ethan fade out slow") !== -1) {
                            try { anim.remove(); } catch (eText1) {}
                        }
                    }
                }
            }

            if (l instanceof AVLayer) {
                var fx = l.property("ADBE Effect Parade");

                if (fx) {
                    for (var j = fx.numProperties; j >= 1; j--) {
                        var effect = fx.property(j);
                        var nm = "";

                        try { nm = effect.name; } catch (e1) {}

                        if (isGeneratedEffectName(nm)) {
                            try { effect.remove(); } catch (e2) {}
                        }
                    }
                }

                try {
                    if (l.source instanceof CompItem) {
                        cleanCompRecursive(l.source, visited);
                    }
                } catch (e3) {}
            }
        }
    }

    function removeAllGenerated(comp) {
        cleanCompRecursive(comp, {});

        alert(
            "Removed Hub-generated helper layers/effects.\n\n" +
            "Safe precomps and renamed clips are structural changes, so this does not unpack/rename those automatically."
        );
    }

    // ============================================================
    // SCRIPTUI COLORS
    // ============================================================

    function bg(ctrl, rgb) {
        try {
            ctrl.graphics.backgroundColor = ctrl.graphics.newBrush(
                ctrl.graphics.BrushType.SOLID_COLOR,
                rgb
            );
        } catch (e0) {}
    }

    function fg(ctrl, rgb) {
        try {
            ctrl.graphics.foregroundColor = ctrl.graphics.newPen(
                ctrl.graphics.PenType.SOLID_COLOR,
                rgb,
                1
            );
        } catch (e0) {}
    }

    function makeSection(parent, title, color) {
        var p = parent.add("panel", undefined, title);
        p.orientation = "column";
        p.alignChildren = ["fill", "top"];
        p.spacing = 6;
        p.margins = 9;
        bg(p, color);
        return p;
    }

    function makeTitle(parent, text, color) {
        var t = parent.add("statictext", undefined, text);
        fg(t, color);

        try {
            t.graphics.font = ScriptUI.newFont(t.graphics.font.name, "BOLD", 14);
        } catch (e0) {}

        return t;
    }

    // ============================================================
    // FULL-PAGE SCROLLING
    // ============================================================

    /*
    This deliberately gives the content canvas its own fixed tall surface
    and scrolls that surface inside a clipped viewport. The scrollbar max
    is recalculated from the ACTUAL bottom edge of every laid-out child.

    The previous Hub allowed ScriptUI's auto-layout to shrink the content
    canvas, which is why the scrollbar only travelled a few pixels.
    */

    function makeScrollPage(tab, railColor) {
        tab.orientation = "column";
        tab.alignChildren = ["fill", "fill"];
        tab.spacing = 2;
        tab.margins = 2;

        var mainRow = tab.add("group");
        mainRow.orientation = "row";
        mainRow.alignChildren = ["fill", "fill"];
        mainRow.alignment = ["fill", "fill"];
        mainRow.spacing = 2;
        mainRow.margins = 0;

        var viewport = mainRow.add("panel");
        viewport.alignment = ["fill", "fill"];
        viewport.margins = 0;
        viewport.spacing = 0;
        viewport.layout = null;

        var content = viewport.add("group");
        content.orientation = "column";
        content.alignChildren = ["fill", "top"];
        content.spacing = 7;
        content.margins = 6;
        content.location = [3,3];
        content.minimumSize = [320, 4200];
        content.preferredSize = [320, 4200];

        var rightRail = mainRow.add("group");
        rightRail.orientation = "row";
        rightRail.alignChildren = ["fill", "fill"];
        rightRail.alignment = ["right", "fill"];
        rightRail.spacing = 2;
        rightRail.margins = 0;

        var jumpCol = rightRail.add("group");
        jumpCol.orientation = "column";
        jumpCol.alignChildren = ["fill", "top"];
        jumpCol.alignment = ["left", "fill"];
        jumpCol.spacing = 2;
        jumpCol.margins = 0;
        jumpCol.preferredSize.width = 18;

        var topJump = jumpCol.add("button", undefined, "T");
        var midJump = jumpCol.add("button", undefined, "M");
        var botJump = jumpCol.add("button", undefined, "B");
        topJump.preferredSize = [17,20];
        midJump.preferredSize = [17,20];
        botJump.preferredSize = [17,20];

        var vRail = rightRail.add("panel");
        vRail.orientation = "column";
        vRail.alignChildren = ["fill", "fill"];
        vRail.alignment = ["right", "fill"];
        vRail.margins = 1;
        vRail.preferredSize.width = 16;
        vRail.minimumSize.width = 16;
        vRail.maximumSize.width = 16;
        bg(vRail, railColor || [0.30,0.12,0.42]);

        var vsb = vRail.add("scrollbar");
        vsb.alignment = ["fill", "fill"];
        vsb.minvalue = 0;
        vsb.maxvalue = 1;
        vsb.value = 0;

        var bottomRail = tab.add("group");
        bottomRail.orientation = "row";
        bottomRail.alignChildren = ["fill", "center"];
        bottomRail.alignment = ["fill", "bottom"];
        bottomRail.spacing = 2;
        bottomRail.margins = 0;
        bottomRail.preferredSize.height = 18;

        var hPanel = bottomRail.add("panel");
        hPanel.orientation = "row";
        hPanel.alignChildren = ["fill", "fill"];
        hPanel.alignment = ["fill", "center"];
        hPanel.margins = 1;
        hPanel.preferredSize.height = 14;
        bg(hPanel, railColor || [0.30,0.12,0.42]);

        var hsb = hPanel.add("scrollbar");
        hsb.alignment = ["fill", "fill"];
        hsb.minvalue = 0;
        hsb.maxvalue = 1;
        hsb.value = 0;

        var leftJump = bottomRail.add("button", undefined, "L");
        var centerJump = bottomRail.add("button", undefined, "C");
        var rightJump = bottomRail.add("button", undefined, "R");
        leftJump.preferredSize = [20,17];
        centerJump.preferredSize = [20,17];
        rightJump.preferredSize = [20,17];

        try { vsb.stepdelta = 12; } catch (e0) {}
        try { hsb.stepdelta = 12; } catch (e1) {}

        function measureContent() {
            var maxRight = 320;
            var maxBottom = 100;

            try { content.layout.layout(true); } catch (e0) {}

            for (var i = 0; i < content.children.length; i++) {
                var child = content.children[i];
                try { if (child.layout) child.layout.layout(true); } catch (e1) {}

                try {
                    var b = child.bounds;
                    if (b && b.length >= 4) {
                        if (b[2] > maxRight) maxRight = b[2];
                        if (b[3] > maxBottom) maxBottom = b[3];
                    }
                } catch (e2) {}
            }

            if (maxBottom < 140) {
                maxBottom = 14;
                for (var j = 0; j < content.children.length; j++) {
                    var hh = 0;
                    try { hh = content.children[j].size.height; } catch (e3) {}
                    if (!hh) try { hh = content.children[j].preferredSize.height; } catch (e4) {}
                    if (!hh) hh = 62;
                    maxBottom += hh + content.spacing;
                }
            }

            return {
                w: Math.max(320, maxRight + 22),
                h: Math.max(180, maxBottom + 70)
            };
        }

        function applyPosition() {
            try {
                content.location = [
                    3 - Math.round(hsb.value),
                    3 - Math.round(vsb.value)
                ];
            } catch (e0) {}
        }

        function wheelHandler(e) {
            try {
                if (e._ethanPremiumHandled) return;
                e._ethanPremiumHandled = true;
            } catch (eMark) {}

            var dx = 0;
            var dy = 0;

            try { if (e.deltaX !== undefined) dx = e.deltaX; } catch (e0) {}
            try { if (e.deltaY !== undefined) dy = e.deltaY; } catch (e1) {}
            try { if (e.wheelDeltaX !== undefined && e.wheelDeltaX !== 0) dx = -e.wheelDeltaX; } catch (e2) {}
            try { if (e.wheelDeltaY !== undefined && e.wheelDeltaY !== 0) dy = -e.wheelDeltaY; } catch (e3) {}

            if (dx === 0 && dy === 0) {
                var classic = 0;
                try { classic = e.wheelDelta; } catch (e4) {}
                if (!classic) try { classic = -e.detail; } catch (e5) {}
                if (classic) dy = -classic;
            }

            var shift = false;
            try { shift = !!e.shiftKey; } catch (e6) {}
            if (shift && dx === 0 && dy !== 0) {
                dx = dy;
                dy = 0;
            }

            if (dx !== 0) {
                var sx = clamp(Math.abs(dx) / 8, 3, 16);
                hsb.value = clamp(hsb.value + (dx > 0 ? sx : -sx), 0, hsb.maxvalue);
            }

            if (dy !== 0) {
                var sy = clamp(Math.abs(dy) / 8, 3, 16);
                vsb.value = clamp(vsb.value + (dy > 0 ? sy : -sy), 0, vsb.maxvalue);
            }

            applyPosition();
            try { e.preventDefault(); } catch (e7) {}
        }

        function hookWheelTree(node) {
            if (!node) return;

            try {
                if (!node._ethanPremiumWheelHooked) {
                    try { node.addEventListener("mousewheel", wheelHandler, true); }
                    catch (eCap) { node.addEventListener("mousewheel", wheelHandler); }
                    node._ethanPremiumWheelHooked = true;
                }
            } catch (e0) {}

            try {
                if (node.children) {
                    for (var i = 0; i < node.children.length; i++) {
                        hookWheelTree(node.children[i]);
                    }
                }
            } catch (e1) {}
        }

        function refresh() {
            try {
                var requestedW = Math.max(320, viewport.size.width - 6);
                content.minimumSize.width = requestedW;
                content.preferredSize.width = requestedW;
                content.maximumSize.width = 2400;
                content.layout.layout(true);

                var size = measureContent();
                content.minimumSize = [size.w, size.h];
                content.preferredSize = [size.w, size.h];
                content.maximumSize = [size.w, size.h];
                content.size = [size.w, size.h];

                var visibleW = Math.max(1, viewport.size.width - 6);
                var visibleH = Math.max(1, viewport.size.height - 6);
                hsb.maxvalue = Math.max(0, size.w - visibleW);
                vsb.maxvalue = Math.max(0, size.h - visibleH);
                hsb.value = clamp(hsb.value, 0, hsb.maxvalue);
                vsb.value = clamp(vsb.value, 0, vsb.maxvalue);

                try { vsb.jumpdelta = Math.max(100, visibleH * 0.78); } catch (e2) {}
                try { hsb.jumpdelta = Math.max(90, visibleW * 0.78); } catch (e3) {}

                hookWheelTree(content);
                hookWheelTree(viewport);
                applyPosition();
            } catch (e4) {}
        }

        vsb.onChanging = applyPosition;
        vsb.onChange = applyPosition;
        hsb.onChanging = applyPosition;
        hsb.onChange = applyPosition;

        topJump.onClick = function(){ refresh(); vsb.value = 0; applyPosition(); };
        midJump.onClick = function(){ refresh(); vsb.value = vsb.maxvalue * 0.5; applyPosition(); };
        botJump.onClick = function(){ refresh(); vsb.value = vsb.maxvalue; applyPosition(); };
        leftJump.onClick = function(){ refresh(); hsb.value = 0; applyPosition(); };
        centerJump.onClick = function(){ refresh(); hsb.value = hsb.maxvalue * 0.5; applyPosition(); };
        rightJump.onClick = function(){ refresh(); hsb.value = hsb.maxvalue; applyPosition(); };

        try { tab.addEventListener("mousewheel", wheelHandler, true); } catch (e5) {}
        try { viewport.addEventListener("mousewheel", wheelHandler, true); } catch (e6) {}

        var pageObj = {
            viewport: viewport,
            content: content,
            vScrollbar: vsb,
            hScrollbar: hsb,
            refresh: refresh,
            handleWheel: wheelHandler
        };

        try { tab._ethanPageRef = pageObj; } catch (e7) {}
        return pageObj;
    }

    function addSelectAllButton(parent) {
        var b = parent.add("button", undefined, "SELECT ALL SPLIT CLIPS");

        b.onClick = function() {
            var comp = getComp();
            if (!comp) return;

            app.beginUndoGroup("Select All Split Clips");
            try {
                selectAllSplitClips(comp, false);
            } finally {
                app.endUndoGroup();
            }
        };

        return b;
    }


    function addNotClipTools(parent) {
        var p = parent.add('panel', undefined, 'HELPER LAYERS (NOT CLIPS / AUDIO)');
        p.orientation = 'column';
        p.alignChildren = ['fill','top'];
        p.spacing = 4;
        p.margins = 7;
        bg(p, [0.16,0.12,0.24]);

        var selectBtn = p.add('button', undefined, 'SELECT HELPER LAYERS');
        var preBtn = p.add('button', undefined, 'PRECOMP HELPERS -> everything');
        var delBtn = p.add('button', undefined, 'DELETE HELPER LAYERS');

        selectBtn.onClick = function() {
            var comp = getComp(); if (!comp) return;
            app.beginUndoGroup('Select Helper Layers');
            try { selectHelperLayersNotClips(comp, false); }
            finally { app.endUndoGroup(); }
        };

        preBtn.onClick = function() {
            var comp = getComp(); if (!comp) return;
            app.beginUndoGroup('Precomp Helper Layers');
            try {
                var result = precomposeHelperLayersNotClips(comp, 'everything');
                if (!result) alert('No helper layers were available to precompose.');
            } finally { app.endUndoGroup(); }
        };

        delBtn.onClick = function() {
            var comp = getComp(); if (!comp) return;
            app.beginUndoGroup('Delete Helper Layers');
            try {
                var n = deleteHelperLayersNotClips(comp);
                alert('Deleted ' + n + ' helper layer(s). Clips and audio-only layers were left alone.');
            } finally { app.endUndoGroup(); }
        };

        return p;
    }

    function styleTab(tab) {
        try {
            tab.graphics.font = ScriptUI.newFont('Helvetica Neue', 'BOLD', 11);
        } catch (e0) {
            try { tab.graphics.font = ScriptUI.newFont(tab.graphics.font.name, 'BOLD', 11); } catch (e1) {}
        }
    }

    function addTabShadow(parent) {
        var s = parent.add('panel');
        s.alignment = ['fill','top'];
        s.preferredSize.height = 3;
        s.minimumSize.height = 3;
        s.maximumSize.height = 3;
        s.margins = 0;
        bg(s, [0.015,0.015,0.025]);
        return s;
    }

    function addDropdown(parent, label, items, defaultIndex) {
        var row = parent.add("group");
        row.orientation = "row";

        var st = row.add("statictext", undefined, label);
        st.preferredSize.width = 72;

        var dd = row.add("dropdownlist", undefined, items);
        dd.selection = defaultIndex || 0;
        dd.preferredSize.width = 172;

        return dd;
    }

    function addSliderField(parent, label, defaultValue, min, max) {
        var row = parent.add("group");
        row.orientation = "row";
        row.alignChildren = ["left", "center"];

        var st = row.add("statictext", undefined, label);
        st.preferredSize.width = 72;

        var slider = row.add("slider", undefined, defaultValue, min, max);
        slider.preferredSize.width = 112;

        var field = row.add("edittext", undefined, String(defaultValue));
        field.characters = 5;

        slider.onChanging = function() {
            field.text = String(Math.round(slider.value));
        };

        field.onChange = function() {
            var n = parseFloat(field.text);
            if (isNaN(n)) n = defaultValue;

            n = clamp(n, min, max);
            slider.value = n;
            field.text = String(Math.round(n));
        };

        return {slider:slider, field:field};
    }

    // ============================================================
    // WINDOW
    // ============================================================

    var win = (thisObj instanceof Panel)
        ? thisObj
        : new Window(
            "palette",
            "Ethan's Editing Hub PREMIUM",
            undefined,
            {resizeable:true}
        );

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 6;
    win.margins = 7;
    bg(win, [0.06, 0.06, 0.09]);

    var header = makeSection(win, "", [0.33, 0.09, 0.31]);

    var headerTop = header.add("group");
    headerTop.orientation = "row";
    headerTop.alignChildren = ["fill", "center"];
    headerTop.alignment = ["fill", "top"];
    headerTop.spacing = 8;

    var brandRow = headerTop.add("group");
    brandRow.orientation = "row";
    brandRow.alignChildren = ["left", "center"];
    brandRow.alignment = ["left", "center"];
    brandRow.spacing = 7;

    var logoBox = brandRow.add("panel");
    logoBox.preferredSize = [44, 34];
    logoBox.minimumSize = [44, 34];
    logoBox.maximumSize = [44, 34];
    logoBox.margins = 4;
    bg(logoBox, [0.08, 0.45, 0.75]);

    var logoText = logoBox.add("statictext", undefined, "EH");
    fg(logoText, [1.0, 0.92, 1.0]);
    try { logoText.graphics.font = ScriptUI.newFont("Helvetica Neue", "BOLD", 15); } catch (eLogo) {}

    var brandText = brandRow.add("group");
    brandText.orientation = "column";
    brandText.alignChildren = ["left", "top"];
    brandText.spacing = 1;

    var headerTitle = brandText.add("statictext", undefined, "Ethan's Editing Hub");
    fg(headerTitle, [1.0, 0.86, 1.0]);
    try { headerTitle.graphics.font = ScriptUI.newFont("Helvetica Neue", "BOLD", 15); } catch (e0) {}

    var premiumLine = brandText.add("statictext", undefined, "PREMIUM 1.4.0");
    fg(premiumLine, [0.62, 0.90, 1.0]);
    try { premiumLine.graphics.font = ScriptUI.newFont("Helvetica Neue", "BOLD", 9); } catch (e1) {}

    var searchGroup = headerTop.add("group");
    searchGroup.orientation = "column";
    searchGroup.alignChildren = ["right", "center"];
    searchGroup.alignment = ["right", "center"];
    searchGroup.spacing = 2;

    var searchRow = searchGroup.add("group");
    searchRow.orientation = "row";
    searchRow.alignChildren = ["left", "center"];

    var searchLabel = searchRow.add("statictext", undefined, "🔎 Search:");
    fg(searchLabel, [0.95, 0.95, 1.0]);
    var searchBox = searchRow.add("edittext", undefined, "");
    searchBox.characters = 15;

    var searchResults = searchGroup.add("dropdownlist", undefined, ["Type to search the entire Hub"]);
    searchResults.preferredSize.width = 205;
    var searchGo = searchGroup.add("button", undefined, "GO TO RESULT");
    searchGo.preferredSize.width = 205;

    var headerSub = header.add(
        "statictext",
        undefined,
        "Search anything, then build the basics and finish your zooms/presets manually."
    );
    fg(headerSub, [0.96, 0.90, 1.0]);

    var autoBasicsButton = header.add("button", undefined, "AUTO EDIT BASICS");
    var removeAutoBasicsButton = header.add("button", undefined, "REMOVE AUTO BASICS GENERATED FX");

    var targetPanel = makeSection(win, "TARGET", [0.09, 0.20, 0.36]);

    var targetDD = addDropdown(
        targetPanel,
        "Target",
        [
            "Selected clip(s)",
            "Clip under playhead",
            "Clip #",
            "All split clips"
        ],
        0
    );

    var clipRow = targetPanel.add("group");
    clipRow.orientation = "row";
    clipRow.add("statictext", undefined, "Clip #");
    var clipNumberField = clipRow.add("edittext", undefined, "1");
    clipNumberField.characters = 5;

    addSelectAllButton(targetPanel);

    var tabs = win.add("tabbedpanel");
    tabs.alignment = ["fill", "fill"];
    tabs.preferredSize = [360, 535];

    // ============================================================
    // ALL
    // ============================================================

    var allTab = tabs.add("tab", undefined, "All");
    styleTab(allTab);
    var allPage = makeScrollPage(allTab, [0.44, 0.10, 0.38]);
    var all = allPage.content;
    addTabShadow(all);

    addSelectAllButton(all);
    addNotClipTools(all);
    makeTitle(all, "APPLY THE STANDARD STACK", [1.0, 0.72, 0.96]);

    var allPanel = makeSection(all, "ALL SPLIT CLIPS", [0.27, 0.10, 0.25]);

    allPanel.add(
        "statictext",
        undefined,
        "Motion Tile -> Safe Precomp -> clip # names -> Pan -> Rebound -> Black Flash 2 -> 1-frame white flashes at clip start/end -> Rainbow."
    );

    var allRecipeButton = allPanel.add(
        "button",
        undefined,
        "APPLY ALL RECIPE"
    );

    // ============================================================
    // AUDIO
    // ============================================================

    var audioTab = tabs.add("tab", undefined, "Audio");
    styleTab(audioTab);
    var audioPage = makeScrollPage(audioTab, [0.46, 0.24, 0.05]);
    var audio = audioPage.content;
    addTabShadow(audio);

    addSelectAllButton(audio);
    addNotClipTools(audio);
    makeTitle(audio, "AUDIO", [1.0, 0.85, 0.48]);

    var mutePanel = makeSection(audio, "MUTE / UNMUTE SPLIT CLIPS", [0.28, 0.12, 0.08]);
    var muteAllButton = mutePanel.add(
        "button",
        undefined,
        "SELECT ALL CLIPS + MUTE ALL"
    );
    var unmuteAllButton = mutePanel.add(
        "button",
        undefined,
        "UNMUTE ALL SPLIT CLIPS"
    );

    var audioPanel = makeSection(audio, "FULL SOUND CLIP", [0.34, 0.18, 0.04]);
    audioPanel.add(
        "statictext",
        undefined,
        "Duplicate clip #1; original becomes video-off/audio-on and expands to comp bounds when source duration allows."
    );
    var fullSoundButton = audioPanel.add("button", undefined, "FULL SOUND CLIP");

    // ============================================================
    // TEXT
    // ============================================================

    var textTab = tabs.add("tab", undefined, "TEXT");
    styleTab(textTab);
    var textPage = makeScrollPage(textTab, [0.42, 0.12, 0.48]);
    var textTools = textPage.content;
    addTabShadow(textTools);

    makeTitle(textTools, "TEXT", [1.0, 0.78, 0.98]);

    var textQuickPanel = makeSection(
        textTools,
        "TEXT COLOR",
        [0.28, 0.09, 0.34]
    );

    textQuickPanel.add(
        "statictext",
        undefined,
        "Targets every text layer in the active comp."
    );

    var textColorFillButton = textQuickPanel.add(
        "button",
        undefined,
        "COLOR FILL"
    );

    var textBestPanel = makeSection(
        textTools,
        "ONE FOR ALL",
        [0.08, 0.31, 0.34]
    );

    textBestPanel.add(
        "statictext",
        undefined,
        "Tracking 0 -> 4 across the text layer, Fade Up Words from start -> middle, then Fade Out Slow from middle -> end. All Hub-created keys are Easy Eased."
    );

    var ethansBestTextButton = textBestPanel.add(
        "button",
        undefined,
        "ETHANS BEST TEXT"
    );

    var textPresetPanel = makeSection(
        textTools,
        "GLOW + SHADOW PRESET",
        [0.38, 0.11, 0.22]
    );

    textPresetPanel.add(
        "statictext",
        undefined,
        "Applies 'ethans woodl swirly text intro.ffx' to every text layer."
    );

    var textGlowShadowButton = textPresetPanel.add(
        "button",
        undefined,
        "APPLY GLOW & SHADOW"
    );

    var textAnimatorPanel = makeSection(
        textTools,
        "ETHANS AUTO ANIMATORS",
        [0.15, 0.23, 0.48]
    );

    textAnimatorPanel.add(
        "statictext",
        undefined,
        "One-click text animators. Uses selected text layer(s); if none are selected, applies to every text layer. All animator keys are Easy Eased."
    );

    var textAutoRow1 = textAnimatorPanel.add("group");
    textAutoRow1.orientation = "row";
    textAutoRow1.alignChildren = ["fill", "center"];
    var textPopButton = textAutoRow1.add("button", undefined, "POP IN");
    var textRiseButton = textAutoRow1.add("button", undefined, "RISE + FADE");

    var textAutoRow2 = textAnimatorPanel.add("group");
    textAutoRow2.orientation = "row";
    textAutoRow2.alignChildren = ["fill", "center"];
    var textSwirlButton = textAutoRow2.add("button", undefined, "SWIRL IN");
    var textTypeButton = textAutoRow2.add("button", undefined, "TYPE ON");

    var textAutoRow3 = textAnimatorPanel.add("group");
    textAutoRow3.orientation = "row";
    textAutoRow3.alignChildren = ["fill", "center"];
    var textTrackingButton = textAutoRow3.add("button", undefined, "TRACKING BLOOM");
    var textFloatOutButton = textAutoRow3.add("button", undefined, "FLOAT OUT");

    var textAutoRow4 = textAnimatorPanel.add("group");
    textAutoRow4.orientation = "row";
    textAutoRow4.alignChildren = ["fill", "center"];
    var textPunchOutButton = textAutoRow4.add("button", undefined, "PUNCH OUT");

    var textPositionPanel = makeSection(
        textTools,
        "POSITION",
        [0.34, 0.16, 0.05]
    );

    textPositionPanel.add(
        "statictext",
        undefined,
        "Targets selected text. Visual centering uses the active comp size; no horizontal/vertical stretching."
    );

    var textCenterTopButton = textPositionPanel.add(
        "button",
        undefined,
        "CENTER (TOP LAYER)"
    );

    var textCenterBottomButton = textPositionPanel.add(
        "button",
        undefined,
        "CENTER (BOTTOM LAYER)"
    );

    textPositionPanel.add(
        "statictext",
        undefined,
        "TOP = uniform 100% scale at visual comp center. BOTTOM = uniform 87% scale and ~180 px lower in a 2160-high comp (proportional at other sizes)."
    );

    // ============================================================
    // ZOOMS
    // ============================================================

    var zoomsTab = tabs.add("tab", undefined, "Zooms");
    styleTab(zoomsTab);
    var zoomsPage = makeScrollPage(zoomsTab, [0.11, 0.35, 0.56]);
    var zooms = zoomsPage.content;
    addTabShadow(zooms);

    addSelectAllButton(zooms);
    addNotClipTools(zooms);
    makeTitle(zooms, "ZOOM PRESETS (.FFX)", [0.66, 0.90, 1.0]);

    var zoomPS = zooms.add(
        "statictext",
        undefined,
        "PS: Zooms go on adjustment layers; Motion Tile goes directly on the real clip first."
    );
    fg(zoomPS, [0.82, 0.94, 1.0]);

    var zoomSetup = makeSection(zooms, "ZOOM LIBRARY", [0.08, 0.24, 0.40]);
    var zoomRootText = zoomSetup.add("statictext", undefined, "Root: " + getPresetRoot().name);
    var zoomChooseRoot = zoomSetup.add("button", undefined, "CHOOSE PRESET ROOT");
    var zoomImport = zoomSetup.add("button", undefined, "IMPORT .FFX TO ZOOMS");
    var zoomRefresh = zoomSetup.add("button", undefined, "REFRESH ZOOM LIST");

    var zoomSelect = makeSection(zooms, "APPLY ZOOM", [0.10, 0.30, 0.24]);

    var zoomCreator = addDropdown(
        zoomSelect,
        "Creator",
        ["All", "jamesmaximoffs", "tattooedhe8rt", "Other"],
        0
    );

    var zoomPreset = addDropdown(
        zoomSelect,
        "Preset",
        ["No zoom presets imported yet"],
        0
    );

    var zoomApply = zoomSelect.add("button", undefined, "APPLY ZOOM TO TARGET");
    var zoomApplyAll = zoomSelect.add("button", undefined, "APPLY ZOOM TO ALL");

    var zoomCyclePanel = makeSection(zooms, "AUTO ZOOM CYCLE", [0.27, 0.10, 0.31]);

    var zoomBlockSize = addDropdown(
        zoomCyclePanel,
        "Clips / zoom",
        ["1", "2", "3", "4", "5"],
        1
    );

    var zoomCycleAll = zoomCyclePanel.add(
        "button",
        undefined,
        "CYCLE ALL ZOOM PRESETS THROUGH EDIT"
    );

    // ============================================================
    // UTILITIES
    // ============================================================

    var utilitiesTab = tabs.add("tab", undefined, "Utilities");
    styleTab(utilitiesTab);
    var utilitiesPage = makeScrollPage(utilitiesTab, [0.35, 0.14, 0.48]);
    var utilities = utilitiesPage.content;
    addTabShadow(utilities);

    addSelectAllButton(utilities);
    addNotClipTools(utilities);
    makeTitle(utilities, "UTILITIES", [0.90, 0.78, 1.0]);

    var clipUtils = makeSection(utilities, "CLIPS", [0.14, 0.17, 0.30]);

    var motionTileButton = clipUtils.add("button", undefined, "MOTION TILE DIRECT");
    var safePrecompButton = clipUtils.add("button", undefined, "SAFE PRECOMP TARGET");
    var renameButton = clipUtils.add("button", undefined, "RENAME TARGET clip #");

    var saturationUtils = makeSection(utilities, "SATURATION CHANGER", [0.06, 0.31, 0.34]);

    var saturationTiming = addDropdown(
        saturationUtils,
        "Timing",
        ["Beginning of Clip", "Beginning and Middle of Clip", "Entire Clip"],
        1
    );

    var noColorToColor = saturationUtils.add("button", undefined, "NO COLOR -> COLOR");
    var saturationPulse = saturationUtils.add("button", undefined, "COLOR -> NO COLOR -> COLOR");

    var organizeUtils = makeSection(utilities, "SELECT / RAINBOW / ORGANIZE", [0.09, 0.34, 0.19]);

    var selectEverythingButton = organizeUtils.add("button", undefined, "SELECT EVERYTHING");
    var rainbowButton = organizeUtils.add("button", undefined, "RAINBOWIFY");
    var organizeButton = organizeUtils.add("button", undefined, "ORGANIZE: SOLIDS / ADJUSTMENTS / CLIPS");

    var organizeWarning = organizeUtils.add(
        "statictext",
        undefined,
        "Organizer changes layer order. Use only when you intentionally want all solids, then adjustments, then clips grouped."
    );

    fg(organizeWarning, [1.0, 0.78, 0.65]);

    // ============================================================
    // MOTION
    // ============================================================

    var motionTab = tabs.add("tab", undefined, "Motion");
    styleTab(motionTab);
    var motionPage = makeScrollPage(motionTab, [0.12, 0.24, 0.56]);
    var motion = motionPage.content;
    addTabShadow(motion);

    addSelectAllButton(motion);
    addNotClipTools(motion);
    makeTitle(motion, "MOTION", [0.65, 0.82, 1.0]);
    var motionPS = motion.add("statictext", undefined, "PS: Super calm is the safest starting point. Apply To All only when you want the same vibe everywhere.");
    fg(motionPS, [0.78, 0.90, 1.0]);

    var motionAuto = makeSection(motion, "AUTOMATIC", [0.08, 0.20, 0.39]);

    var motionTiming = addDropdown(
        motionAuto,
        "Timing",
        ["Beginning of Clip", "Beginning and Middle of Clip", "Entire Clip"],
        0
    );

    var motionIntensity = addDropdown(
        motionAuto,
        "Intensity",
        [
            "Too calm",
            "Super calm",
            "Calm",
            "Mild",
            "Semi aggressive",
            "Super aggressive",
            "Insane"
        ],
        1
    );

    var reboundPanel = makeSection(motion, "REBOUND SWING", [0.29, 0.11, 0.37]);

    var reboundSpeedDD = addDropdown(
        reboundPanel,
        "Speed",
        [
            "Too calm",
            "Calm",
            "Mild",
            "Fast",
            "Super fast",
            "Insanely fast"
        ],
        2
    );

    var reboundApply = reboundPanel.add("button", undefined, "APPLY REBOUND");
    var reboundAll = reboundPanel.add("button", undefined, "APPLY REBOUND TO ALL");
    var removeRebound = reboundPanel.add("button", undefined, "REMOVE REBOUND");

    var shakePanel = makeSection(motion, "SHAKE", [0.36, 0.09, 0.14]);
    var shakeApply = shakePanel.add("button", undefined, "APPLY SHAKE");
    var shakeAll = shakePanel.add("button", undefined, "APPLY SHAKE TO ALL");
    var removeShake = shakePanel.add("button", undefined, "REMOVE SHAKE");

    var panPanel = makeSection(motion, "PANNING", [0.05, 0.34, 0.24]);
    var panRow1 = panPanel.add("group");
    panRow1.orientation = "row";
    var panLeft = panRow1.add("button", undefined, "PAN LEFT");
    var panRight = panRow1.add("button", undefined, "PAN RIGHT");

    var panRow2 = panPanel.add("group");
    panRow2.orientation = "row";
    var panUp = panRow2.add("button", undefined, "PAN UP");
    var panDown = panRow2.add("button", undefined, "PAN DOWN");
    var removePan = panPanel.add("button", undefined, "REMOVE PANNING");

    var slidePanel = makeSection(motion, "SMOOTH SLIDES", [0.12, 0.22, 0.45]);

    var slideRow1 = slidePanel.add("group");
    slideRow1.orientation = "row";
    var slideLeft = slideRow1.add("button", undefined, "SLIDE LEFT");
    var slideRight = slideRow1.add("button", undefined, "SLIDE RIGHT");

    var slideRow2 = slidePanel.add("group");
    slideRow2.orientation = "row";
    var slideUp = slideRow2.add("button", undefined, "SLIDE UP");
    var slideDown = slideRow2.add("button", undefined, "SLIDE DOWN");
    var removeSlides = slidePanel.add("button", undefined, "REMOVE SMOOTH SLIDES");


    var batchMotionPanel = makeSection(
        motion,
        "BATCH PANNING / SMOOTH SLIDES",
        [0.08, 0.30, 0.28]
    );

    var batchPS = batchMotionPanel.add(
        "statictext",
        undefined,
        "PS: Example: 4 clips Left, next 4 Right, next 4 Up, next 4 Down, then repeat."
    );
    fg(batchPS, [0.80, 1.0, 0.90]);

    var clipsPerBatch = addDropdown(
        batchMotionPanel,
        "Clips / batch",
        ["3", "4", "5"],
        1
    );

    var batchDir1 = addDropdown(
        batchMotionPanel,
        "Batch 1",
        ["Left", "Right", "Up", "Down"],
        0
    );

    var batchDir2 = addDropdown(
        batchMotionPanel,
        "Batch 2",
        ["Left", "Right", "Up", "Down"],
        1
    );

    var batchDir3 = addDropdown(
        batchMotionPanel,
        "Batch 3",
        ["Left", "Right", "Up", "Down"],
        2
    );

    var batchDir4 = addDropdown(
        batchMotionPanel,
        "Batch 4",
        ["Left", "Right", "Up", "Down"],
        3
    );

    var applyPanPattern = batchMotionPanel.add(
        "button",
        undefined,
        "APPLY PAN PATTERN TO ENTIRE EDIT"
    );

    var applySlidePattern = batchMotionPanel.add(
        "button",
        undefined,
        "APPLY SLIDE PATTERN TO ENTIRE EDIT"
    );

    // ============================================================
    // TRANSITIONS
    // ============================================================

    var transitionsTab = tabs.add("tab", undefined, "Transitions");
    styleTab(transitionsTab);
    var transitionsPage = makeScrollPage(transitionsTab, [0.05, 0.44, 0.38]);
    var transitions = transitionsPage.content;
    addTabShadow(transitions);

    addSelectAllButton(transitions);
    addNotClipTools(transitions);
    makeTitle(transitions, "TRANSITIONS", [0.55, 1.0, 0.90]);

    var introPanel = makeSection(transitions, "INTRO CLIP", [0.29, 0.08, 0.38]);

    introPanel.add(
        "statictext",
        undefined,
        "4-sec BCC Ripple Dissolve + Rotate Jaws + Saturation Changer + 2-frame white flash."
    );

    var introSaturation = addDropdown(
        introPanel,
        "Saturation",
        ["Beginning of Clip", "Beginning and Middle of Clip", "Entire Clip"],
        1
    );

    var introTarget = introPanel.add("button", undefined, "APPLY INTRO TO TARGET");
    var introClip1 = introPanel.add("button", undefined, "APPLY INTRO TO CLIP #1");
    var removeIntro = introPanel.add("button", undefined, "REMOVE INTRO STACK");

    var cutPanel = makeSection(transitions, "CUT TRANSITION", [0.05, 0.31, 0.27]);

    var cutWhere = addDropdown(
        cutPanel,
        "Where",
        ["All cuts", "Cut after target clip", "Cut #"],
        0
    );

    var cutNoRow = cutPanel.add("group");
    cutNoRow.orientation = "row";
    cutNoRow.add("statictext", undefined, "Cut #");
    var cutNumberField = cutNoRow.add("edittext", undefined, "1");
    cutNumberField.characters = 5;

    var transitionStyle = addDropdown(
        cutPanel,
        "Style",
        [
            "Rainbow Mix",
            "Time Slice",
            "Glitch Burst",
            "Blur Snap",
            "Exposure Pop",
            "Slide Smear",
            "Micro Zoom Punch"
        ],
        0
    );

    var transitionIntensity = addDropdown(
        cutPanel,
        "Intensity",
        [
            "Too calm",
            "Super calm",
            "Calm",
            "Mild",
            "Semi aggressive",
            "Super aggressive",
            "Insane"
        ],
        1
    );

    var transitionLength = addDropdown(
        cutPanel,
        "Length",
        [
            "1 frame each side",
            "2 frames each side",
            "3 frames each side",
            "4 frames each side"
        ],
        1
    );

    var transitionApply = cutPanel.add("button", undefined, "APPLY TRANSITION");
    var removeTransitions = cutPanel.add("button", undefined, "REMOVE CUT TRANSITIONS");
    var removeTransitionStyle = cutPanel.add("button", undefined, "REMOVE SELECTED TRANSITION STYLE");

    var transitionFlashPanel = makeSection(transitions, "FLASH CUT", [0.07, 0.32, 0.18]);
    var transitionFlashOpacity = addSliderField(transitionFlashPanel, "Opacity %", 85, 0, 100);
    var transitionFlashButton = transitionFlashPanel.add("button", undefined, "2-FRAME FLASH EVERY CUT");

    // ============================================================
    // HOME
    // ============================================================

    var homeTab = tabs.add("tab", undefined, "Home");
    styleTab(homeTab);
    var homePage = makeScrollPage(homeTab, [0.08, 0.40, 0.46]);
    var home = homePage.content;
    addTabShadow(home);

    addSelectAllButton(home);
    addNotClipTools(home);
    makeTitle(home, "QUICK FAVORITES", [0.55, 0.98, 1.0]);

    var whitePanel = makeSection(home, "WHITE FLASH", [0.06, 0.31, 0.18]);
    var whiteOpacity = addSliderField(whitePanel, "Opacity %", 85, 0, 100);
    var whiteStartEnd = whitePanel.add("button", undefined, "FLASH TARGET START + END");
    var whiteCuts = whitePanel.add("button", undefined, "2-FRAME FLASH EVERY CUT");
    var removeWhite = whitePanel.add("button", undefined, "REMOVE WHITE FLASHES");

    var blackPanel = makeSection(home, "BLACK FLASH 2", [0.28, 0.10, 0.30]);

    var blackPlacement = addDropdown(
        blackPanel,
        "Where",
        ["Beginning", "Middle", "End", "Entire clip"],
        0
    );

    var blackIntensity = addDropdown(
        blackPanel,
        "Intensity",
        [
            "Too calm",
            "Super calm",
            "Calm",
            "Mild",
            "Semi aggressive",
            "Super aggressive",
            "Insane"
        ],
        2
    );

    var blackPS = blackPanel.add(
        "statictext",
        undefined,
        "PS: Pick where + intensity. Pulse length is automatic so it stays quick."
    );
    fg(blackPS, [0.95, 0.82, 1.0]);

    var blackApply = blackPanel.add("button", undefined, "APPLY BLACK FLASH 2");
    var blackAll = blackPanel.add("button", undefined, "APPLY BLACK FLASH 2 TO ALL");
    var removeBlack = blackPanel.add("button", undefined, "REMOVE BLACK FLASH 2");

    var starterPanel = makeSection(home, "CLIP STARTER", [0.34, 0.27, 0.05]);

    var starterTiming = addDropdown(
        starterPanel,
        "Timing",
        ["Beginning of Clip", "Beginning and Middle of Clip", "Entire Clip"],
        0
    );

    var starterIntensity = addDropdown(
        starterPanel,
        "Intensity",
        [
            "Too calm",
            "Super calm",
            "Calm",
            "Mild",
            "Semi aggressive",
            "Super aggressive",
            "Insane"
        ],
        1
    );

    var starterBlur = addSliderField(starterPanel, "Blur", 28, 0, 120);
    var starterApply = starterPanel.add("button", undefined, "APPLY STARTER");


    // ============================================================
    // BUILD
    // ============================================================

    var buildTab = tabs.add("tab", undefined, "Build");
    styleTab(buildTab);
    var buildPage = makeScrollPage(buildTab, [0.46, 0.11, 0.40]);
    var build = buildPage.content;
    addTabShadow(build);

    addSelectAllButton(build);
    addNotClipTools(build);
    makeTitle(build, "BUILD EDIT", [1.0, 0.75, 0.95]);

    var presetsPanel = makeSection(build, "SAFE PRESETS", [0.30, 0.09, 0.28]);

    var cleanBase = presetsPanel.add("button", undefined, "CLEAN BASE");
    var smoothBase = presetsPanel.add("button", undefined, "SMOOTH BASE");
    var fullSafe = presetsPanel.add("button", undefined, "FULL SAFE");

    var manualBuild = makeSection(build, "MANUAL BUILD", [0.15, 0.15, 0.23]);

    var mbMotion = manualBuild.add("checkbox", undefined, "Motion Tile");
    var mbStarter = manualBuild.add("checkbox", undefined, "Clip Starter");
    var mbWhite = manualBuild.add("checkbox", undefined, "2-frame White Flash every cut");
    var mbBlack = manualBuild.add("checkbox", undefined, "Black Flash 2");
    var mbTransitions = manualBuild.add("checkbox", undefined, "Rainbow Mix transitions");
    var mbPrecomp = manualBuild.add("checkbox", undefined, "Safe Precomp");
    var mbRename = manualBuild.add("checkbox", undefined, "Rename clip #1, #2...");
    var mbRainbow = manualBuild.add("checkbox", undefined, "Rainbowify");

    mbMotion.value = true;
    mbStarter.value = true;
    mbWhite.value = true;
    mbBlack.value = true;
    mbTransitions.value = false;
    mbPrecomp.value = false;
    mbRename.value = true;
    mbRainbow.value = true;

    var runManualBuild = manualBuild.add("button", undefined, "RUN MANUAL BUILD");

    // ============================================================
    // CAPCUT
    // ============================================================

    var capcutTab = tabs.add("tab", undefined, "CapCut");
    styleTab(capcutTab);
    var capcutPage = makeScrollPage(capcutTab, [0.48, 0.08, 0.30]);
    var capcut = capcutPage.content;
    addTabShadow(capcut);

    addSelectAllButton(capcut);
    addNotClipTools(capcut);
    makeTitle(capcut, "CAPCUT-STYLE AE TOOLS", [1.0, 0.68, 0.88]);

    var capcutControls = makeSection(capcut, "CONTROLS", [0.27, 0.08, 0.20]);

    var capcutPlacement = addDropdown(
        capcutControls,
        "Timing",
        ["Beginning of Clip", "Beginning and Middle of Clip", "Entire Clip"],
        0
    );

    var capcutPS = capcutControls.add(
        "statictext",
        undefined,
        "PS: Homemade zoom combos were removed. Use your real .ffx files in ZOOMS."
    );
    fg(capcutPS, [1.0, 0.82, 0.92]);

    var capcutIntensity = addDropdown(
        capcutControls,
        "Intensity",
        [
            "Too calm",
            "Super calm",
            "Calm",
            "Mild",
            "Semi aggressive",
            "Super aggressive",
            "Insane"
        ],
        2
    );

    var capcutFX = makeSection(capcut, "COMBOS / IN / OUT", [0.34, 0.08, 0.24]);

    var capFadeIn = capcutFX.add("button", undefined, "FADE IN");
    var remCapFadeIn = capcutFX.add("button", undefined, "REMOVE FADE IN");
    var capFadeOut = capcutFX.add("button", undefined, "FADE OUT");
    var remCapFadeOut = capcutFX.add("button", undefined, "REMOVE FADE OUT");
    var capFlashLoop = capcutFX.add("button", undefined, "FLASH LOOP");
    var remCapFlashLoop = capcutFX.add("button", undefined, "REMOVE FLASH LOOP");
    var capFlashIn = capcutFX.add("button", undefined, "FLASH IN");
    var remCapFlashIn = capcutFX.add("button", undefined, "REMOVE FLASH IN");
    var capFlashOut = capcutFX.add("button", undefined, "FLASH OUT");
    var remCapFlashOut = capcutFX.add("button", undefined, "REMOVE FLASH OUT");
    var capHorizontalIn = capcutFX.add("button", undefined, "HORIZONTAL BLUR IN");
    var remCapHorizontalIn = capcutFX.add("button", undefined, "REMOVE HORIZONTAL BLUR IN");
    var capHorizontalOut = capcutFX.add("button", undefined, "HORIZONTAL BLUR OUT");
    var remCapHorizontalOut = capcutFX.add("button", undefined, "REMOVE HORIZONTAL BLUR OUT");

    // ============================================================
    // EXTRAS
    // ============================================================

    var extrasTab = tabs.add("tab", undefined, "Extras");
    styleTab(extrasTab);
    var extrasPage = makeScrollPage(extrasTab, [0.22, 0.36, 0.48]);
    var extras = extrasPage.content;
    addTabShadow(extras);

    addSelectAllButton(extras);
    addNotClipTools(extras);
    makeTitle(extras, "EXTRAS", [0.74, 0.92, 1.0]);

    var scenePanel = makeSection(extras, "HYBRID SCENE SPLITTER", [0.08, 0.27, 0.40]);
    scenePanel.add(
        "statictext",
        undefined,
        "Combines AE Scene Edit Detection with an optional FFmpeg second pass, then merges the cut points."
    );

    var sceneSensitivity = addDropdown(
        scenePanel,
        "Sensitivity",
        [
            "Very Sensitive - 0.12",
            "Sensitive - 0.18",
            "Balanced - 0.25",
            "Strict - 0.35"
        ],
        1
    );

    var hybridSplitButton = scenePanel.add("button", undefined, "HYBRID DETECT + SPLIT SELECTED CLIP");
    var missedCutButton = scenePanel.add("button", undefined, "ADD MISSED CUT AT PLAYHEAD");

    var safeExtras = makeSection(extras, "SAFE WORKFLOW TOOLS", [0.26, 0.16, 0.08]);
    var backupCompButton = safeExtras.add("button", undefined, "DUPLICATE ACTIVE COMP AS BACKUP");
    var openPresetFolderButton = safeExtras.add("button", undefined, "OPEN PREMIUM PRESET FOLDER");

    var extrasPS = safeExtras.add(
        "statictext",
        undefined,
        "PS: Hybrid Splitter needs a normal video layer. FFmpeg is optional; AE detection still runs if FFmpeg is unavailable."
    );
    fg(extrasPS, [1.0, 0.86, 0.72]);

    // ============================================================
    // FAVORITE PRESETS
    // ============================================================

    var favoritesTab = tabs.add("tab", undefined, "Favorite Presets");
    styleTab(favoritesTab);
    var favoritesPage = makeScrollPage(favoritesTab, [0.50, 0.18, 0.42]);
    var favorites = favoritesPage.content;
    addTabShadow(favorites);

    addSelectAllButton(favorites);
    addNotClipTools(favorites);
    makeTitle(favorites, "FAVORITE PRESETS (.FFX)", [1.0, 0.76, 0.96]);

    var favoritesPS = favorites.add(
        "statictext",
        undefined,
        "PS: Import .ffx once. Names stay unchanged. Creator groups sort alphabetically."
    );
    fg(favoritesPS, [1.0, 0.86, 0.97]);

    var favSetup = makeSection(favorites, "PRESET LIBRARY", [0.31, 0.10, 0.27]);
    var favRootText = favSetup.add("statictext", undefined, "Root: " + getPresetRoot().name);
    var favChooseRoot = favSetup.add("button", undefined, "CHOOSE PRESET ROOT");
    var favImport = favSetup.add("button", undefined, "IMPORT .FFX TO FAVORITES");
    var favRefresh = favSetup.add("button", undefined, "REFRESH PRESET LIST");

    var favSelect = makeSection(favorites, "APPLY FAVORITE", [0.14, 0.22, 0.38]);

    var favCreator = addDropdown(
        favSelect,
        "Creator",
        ["All", "jamesmaximoffs", "tattooedhe8rt", "Other"],
        0
    );

    var favPreset = addDropdown(
        favSelect,
        "Preset",
        ["No presets imported yet"],
        0
    );

    var favMode = addDropdown(
        favSelect,
        "Apply as",
        ["Direct to Clip", "Adjustment Layer"],
        0
    );

    var favApply = favSelect.add("button", undefined, "APPLY TO TARGET");
    var favApplyAll = favSelect.add("button", undefined, "APPLY TO ALL SPLIT CLIPS");

    var jawsPresetPanel = makeSection(
        favorites,
        "SPECIAL INTRO / EVERY 5TH PRESET",
        [0.30, 0.08, 0.34]
    );

    var jawsPresetStatus = jawsPresetPanel.add(
        "statictext",
        undefined,
        "Jaws preset: " + (findJawsPreset() ? fileDisplayName(findJawsPreset()) : "NOT SET")
    );

    var importJawsPreset = jawsPresetPanel.add(
        "button",
        undefined,
        "IMPORT / REPLACE JAWS .FFX"
    );

    var applyJawsPresetTarget = jawsPresetPanel.add(
        "button",
        undefined,
        "APPLY JAWS PRESET TO TARGET"
    );

    var applyJawsPresetClip1 = jawsPresetPanel.add(
        "button",
        undefined,
        "APPLY JAWS PRESET TO CLIP #1"
    );

    // ============================================================
    // REMOVE ALL
    // ============================================================

    var removeTab = tabs.add("tab", undefined, "Remove All");
    styleTab(removeTab);
    var removePage = makeScrollPage(removeTab, [0.52, 0.06, 0.08]);
    var remove = removePage.content;
    addTabShadow(remove);

    addSelectAllButton(remove);
    addNotClipTools(remove);
    makeTitle(remove, "EMERGENCY CLEANUP", [1.0, 0.60, 0.60]);

    var removePanel = makeSection(remove, "REMOVE HUB-GENERATED STUFF", [0.38, 0.06, 0.09]);

    removePanel.add(
        "statictext",
        undefined,
        "Deletes Hub helper layers and Hub-named effects, including inside nested precomps."
    );

    var removeAllButton = removePanel.add(
        "button",
        undefined,
        "REMOVE ALL HUB EFFECTS / HELPERS"
    );

    removePanel.add(
        "statictext",
        undefined,
        "It does NOT unpack precomps or restore old clip names automatically."
    );

    // ============================================================
    // EVENT HELPERS
    // ============================================================

    var SEARCH_ITEMS = [];
    var TAB_INFOS = [];

    function controlOffsetToAncestor(ctrl, ancestor) {
        var x = 0;
        var y = 0;
        var node = ctrl;
        var guard = 0;

        while (node && node !== ancestor && guard < 50) {
            try { x += node.location[0]; y += node.location[1]; } catch (e0) {}
            try { node = node.parent; } catch (e1) { break; }
            guard++;
        }

        return {x:x, y:y};
    }

    function searchAdd(label, tab, page, control, presetType, presetName) {
        if (!label) return;
        SEARCH_ITEMS.push({
            label: String(label),
            tab: tab,
            page: page,
            control: control,
            presetType: presetType || '',
            presetName: presetName || ''
        });
    }

    function walkSearchControls(node, tab, page) {
        if (!node) return;

        var txt = '';
        try { txt = node.text; } catch (e0) {}

        if (txt && String(txt).length > 1) {
            searchAdd(txt, tab, page, node, '', '');
        }

        try {
            if (node.items && node.items.length) {
                for (var d = 0; d < node.items.length; d++) {
                    var it = node.items[d];
                    if (it && it.text) searchAdd(it.text, tab, page, node, '', '');
                }
            }
        } catch (e1) {}

        try {
            if (node.children) {
                for (var i = 0; i < node.children.length; i++) {
                    walkSearchControls(node.children[i], tab, page);
                }
            }
        } catch (e2) {}
    }

    function rebuildSearchIndex() {
        SEARCH_ITEMS = [];

        for (var i = 0; i < TAB_INFOS.length; i++) {
            var inf = TAB_INFOS[i];
            searchAdd(inf.name, inf.tab, inf.page, inf.tab, '', '');
            walkSearchControls(inf.tab, inf.tab, inf.page);
        }

        var favs = listFFX('Favorite Presets');
        for (var f = 0; f < favs.length; f++) {
            searchAdd(
                fileDisplayName(favs[f]),
                favoritesTab,
                favoritesPage,
                favSelect,
                'favorite',
                fileDisplayName(favs[f])
            );
        }

        var zooms = listFFX('ZOOMS');
        for (var z = 0; z < zooms.length; z++) {
            searchAdd(
                fileDisplayName(zooms[z]),
                zoomsTab,
                zoomsPage,
                zoomSelect,
                'zoom',
                fileDisplayName(zooms[z])
            );
        }
    }

    function clearDropdownItems(dd) {
        try {
            while (dd.items.length > 0) dd.remove(dd.items[0]);
        } catch (e0) {}
    }

    function updateSearchResults() {
        rebuildSearchIndex();
        clearDropdownItems(searchResults);

        var q = String(searchBox.text || '').toLowerCase();
        if (!q) {
            var empty = searchResults.add('item', 'Type to search the entire Hub');
            empty._ethanSearchIndex = -1;
            searchResults.selection = 0;
            return;
        }

        var count = 0;
        for (var i = 0; i < SEARCH_ITEMS.length && count < 35; i++) {
            var item = SEARCH_ITEMS[i];
            if (item.label.toLowerCase().indexOf(q) !== -1) {
                var tabName = '';
                try { tabName = item.tab.text; } catch (e0) {}
                var row = searchResults.add('item', tabName + '  >  ' + item.label);
                row._ethanSearchIndex = i;
                count++;
            }
        }

        if (count === 0) {
            var none = searchResults.add('item', 'No Hub result found');
            none._ethanSearchIndex = -1;
        }

        searchResults.selection = 0;
    }

    function selectDropdownText(dd, wanted) {
        if (!dd || !wanted) return false;
        for (var i = 0; i < dd.items.length; i++) {
            if (dd.items[i].text === wanted) {
                dd.selection = i;
                return true;
            }
        }
        return false;
    }

    function activateSearchResult() {
        if (!searchResults.selection) return;
        var idx = searchResults.selection._ethanSearchIndex;
        if (idx === undefined || idx < 0 || idx >= SEARCH_ITEMS.length) return;

        var item = SEARCH_ITEMS[idx];

        try { tabs.selection = item.tab; } catch (e0) {}
        try { item.page.refresh(); } catch (e1) {}

        if (item.presetType === 'favorite') {
            try {
                favCreator.selection = 0;
                refreshFavoritePresetUI();
                selectDropdownText(favPreset, item.presetName);
            } catch (e2) {}
        } else if (item.presetType === 'zoom') {
            try {
                zoomCreator.selection = 0;
                refreshZoomPresetUI();
                selectDropdownText(zoomPreset, item.presetName);
            } catch (e3) {}
        }

        try {
            var pos = controlOffsetToAncestor(item.control, item.page.content);
            item.page.vScrollbar.value = clamp(pos.y - 35, 0, item.page.vScrollbar.maxvalue);
            item.page.hScrollbar.value = clamp(pos.x - 15, 0, item.page.hScrollbar.maxvalue);
        } catch (e4) {}

        try { item.page.refresh(); } catch (e5) {}
    }

    function activePageWheel(e) {
        try {
            var t = tabs.selection;
            if (t && t._ethanPageRef && t._ethanPageRef.handleWheel) {
                t._ethanPageRef.handleWheel(e);
            }
        } catch (e0) {}
    }

    function hookGlobalWheel(node) {
        if (!node) return;

        try {
            if (!node._ethanGlobalWheelHooked) {
                try { node.addEventListener('mousewheel', activePageWheel, true); }
                catch (eCap) { node.addEventListener('mousewheel', activePageWheel); }
                node._ethanGlobalWheelHooked = true;
            }
        } catch (e0) {}

        try {
            if (node.children) {
                for (var i = 0; i < node.children.length; i++) hookGlobalWheel(node.children[i]);
            }
        } catch (e1) {}
    }

    function sceneThresholdFromText(t) {
        if (String(t).indexOf('0.12') !== -1) return 0.12;
        if (String(t).indexOf('0.25') !== -1) return 0.25;
        if (String(t).indexOf('0.35') !== -1) return 0.35;
        return 0.18;
    }


    var favFilesCache = [];
    var zoomFilesCache = [];

    function creatorMatches(file, creatorText) {
        if (creatorText === "All") return true;
        return creatorFromPresetName(fileDisplayName(file)) === creatorText;
    }

    function repopulatePresetDropdown(dd, files, creatorText) {
        while (dd.items.length > 0) {
            dd.remove(dd.items[0]);
        }

        var shown = 0;

        for (var i = 0; i < files.length; i++) {
            if (creatorMatches(files[i], creatorText)) {
                var item = dd.add("item", fileDisplayName(files[i]));
                item._ethanFileIndex = i;
                shown++;
            }
        }

        if (shown === 0) {
            var empty = dd.add("item", "No matching presets");
            empty._ethanFileIndex = -1;
        }

        dd.selection = 0;
    }

    function refreshFavoritePresetUI() {
        favFilesCache = listFFX("Favorite Presets");

        repopulatePresetDropdown(
            favPreset,
            favFilesCache,
            favCreator.selection ? favCreator.selection.text : "All"
        );

        try { favRootText.text = "Root: " + getPresetRoot().name; } catch (e0) {}

        var jp = findJawsPreset();

        try {
            jawsPresetStatus.text = "Jaws preset: " +
                (jp ? fileDisplayName(jp) : "NOT SET");
        } catch (e1) {}
    }

    function refreshZoomPresetUI() {
        zoomFilesCache = listFFX("ZOOMS");

        repopulatePresetDropdown(
            zoomPreset,
            zoomFilesCache,
            zoomCreator.selection ? zoomCreator.selection.text : "All"
        );

        try { zoomRootText.text = "Root: " + getPresetRoot().name; } catch (e0) {}
    }

    function selectedPresetFile(dd, files) {
        if (!dd.selection) return null;

        var idx = dd.selection._ethanFileIndex;

        if (idx === undefined || idx < 0 || idx >= files.length) {
            return null;
        }

        return files[idx];
    }


    function targetNow(forceAll) {
        var comp = getComp();
        if (!comp) return null;

        var clips = forceAll
            ? allClips(comp)
            : requireTarget(comp, targetDD.selection.text, clipNumberField);

        if (!clips || clips.length === 0) return null;

        return {comp:comp, clips:clips};
    }

    function framesFromText(text, fallback) {
        var n = parseInt(text, 10);
        return isNaN(n) ? fallback : n;
    }

    function cutSelection(comp) {
        var pairs = cutPairs(comp);

        if (cutWhere.selection.text === "All cuts") return pairs;

        if (cutWhere.selection.text === "Cut #") {
            var n = Math.round(getNum(cutNumberField, 1, 1, 9999));
            return (n >= 1 && n <= pairs.length) ? [pairs[n - 1]] : [];
        }

        var target = requireTarget(comp, targetDD.selection.text, clipNumberField);
        if (!target || target.length === 0) return [];

        var first = target[0];

        for (var i = 0; i < pairs.length; i++) {
            if (pairs[i].a === first) return [pairs[i]];
        }

        return [];
    }

    // ============================================================
    // EVENTS
    // ============================================================


    textColorFillButton.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Ethan Text Color Fill");
        try {
            var count = applyColorFillToAllText(comp);
            if (count > 0) {
                // Keep this intentionally quiet after success so the Hub feels instant.
            }
        } finally {
            app.endUndoGroup();
        }
    };

    ethansBestTextButton.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("ETHANS BEST TEXT");
        try {
            ethansBestText(comp);
        } finally {
            app.endUndoGroup();
        }
    };

    textGlowShadowButton.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Apply Text Glow & Shadow");
        try {
            applyGlowShadowPresetToAllText(comp);
        } finally {
            app.endUndoGroup();
        }
    };


    textPopButton.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Ethan Auto Text - Pop In");
        try { applyAutoAnimator(comp, "pop"); }
        finally { app.endUndoGroup(); }
    };

    textRiseButton.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Ethan Auto Text - Rise + Fade");
        try { applyAutoAnimator(comp, "rise"); }
        finally { app.endUndoGroup(); }
    };

    textSwirlButton.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Ethan Auto Text - Swirl In");
        try { applyAutoAnimator(comp, "swirl"); }
        finally { app.endUndoGroup(); }
    };

    textTypeButton.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Ethan Auto Text - Type On");
        try { applyAutoAnimator(comp, "type"); }
        finally { app.endUndoGroup(); }
    };

    textTrackingButton.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Ethan Auto Text - Tracking Bloom");
        try { applyAutoAnimator(comp, "tracking"); }
        finally { app.endUndoGroup(); }
    };

    textFloatOutButton.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Ethan Auto Text - Float Out");
        try { applyAutoAnimator(comp, "floatout"); }
        finally { app.endUndoGroup(); }
    };

    textPunchOutButton.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Ethan Auto Text - Punch Out");
        try { applyAutoAnimator(comp, "punchout"); }
        finally { app.endUndoGroup(); }
    };

    textCenterTopButton.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Center Text - Top Layer");
        try { centerTextPreset(comp, "top"); }
        finally { app.endUndoGroup(); }
    };

    textCenterBottomButton.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Center Text - Bottom Layer");
        try { centerTextPreset(comp, "bottom"); }
        finally { app.endUndoGroup(); }
    };

    autoBasicsButton.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup('Auto Edit Basics');
        try { autoEditBasics(comp); }
        finally { app.endUndoGroup(); }
    };

    removeAutoBasicsButton.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup('Remove Auto Basics Generated FX');
        try {
            removeRunTag(comp, 'AUTO_BASIC');
            alert('Removed tagged Auto Edit Basics helpers/effects. Safe precomps and renamed clips are structural changes and are not automatically unpacked.');
        } finally { app.endUndoGroup(); }
    };

    searchBox.onChanging = updateSearchResults;
    searchBox.onChange = updateSearchResults;
    searchResults.onChange = function() {};
    searchGo.onClick = activateSearchResult;

    hybridSplitButton.onClick = function() {
        var comp = getComp(); if (!comp) return;
        var clips = selectedClips(comp);
        if (clips.length !== 1) {
            alert('Select exactly ONE long video clip first.');
            return;
        }

        app.beginUndoGroup('Hybrid Scene Splitter');
        try {
            var result = hybridSceneSplit(
                comp,
                clips[0],
                sceneThresholdFromText(sceneSensitivity.selection.text)
            );

            alert(
                'Hybrid Scene Splitter finished.\n\n' +
                'Adobe detections: ' + result.adobeCount + '\n' +
                'FFmpeg detections: ' + result.ffmpegCount + '\n' +
                'Merged cuts used: ' + result.mergedCount + '\n' +
                'Resulting clip pieces: ' + result.pieces.length
            );
        } finally { app.endUndoGroup(); }
    };

    missedCutButton.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup('Add Missed Cut At Playhead');
        try { splitSelectedAtPlayhead(comp); }
        finally { app.endUndoGroup(); }
    };

    backupCompButton.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup('Duplicate Comp Backup');
        try {
            var copy = duplicateActiveCompBackup(comp);
            if (copy) alert('Backup comp created: ' + copy.name);
        } finally { app.endUndoGroup(); }
    };

    openPresetFolderButton.onClick = openPremiumPresetFolder;


    favChooseRoot.onClick = function() {
        if (choosePresetRoot()) {
            refreshFavoritePresetUI();
            refreshZoomPresetUI();
        }
    };

    zoomChooseRoot.onClick = function() {
        if (choosePresetRoot()) {
            refreshFavoritePresetUI();
            refreshZoomPresetUI();
        }
    };

    favImport.onClick = function() {
        importFFXFiles("Favorite Presets", false);
        refreshFavoritePresetUI();
    };

    zoomImport.onClick = function() {
        importFFXFiles("ZOOMS", false);
        refreshZoomPresetUI();
    };

    importJawsPreset.onClick = function() {
        var picked = File.openDialog(
            "Choose the Jaws .ffx preset",
            "*.ffx",
            false
        );

        if (!picked) return;

        var old = listFFX("Jaws");

        for (var i = 0; i < old.length; i++) {
            try { old[i].remove(); } catch (e0) {}
        }

        var folder = presetFolder("Jaws");
        var dest = new File(folder.fsName + "/" + fileDisplayName(picked));

        try {
            if (dest.exists) dest.remove();
            picked.copy(dest.fsName);
        } catch (e1) {}

        refreshFavoritePresetUI();
    };

    favRefresh.onClick = refreshFavoritePresetUI;
    zoomRefresh.onClick = refreshZoomPresetUI;

    favCreator.onChange = refreshFavoritePresetUI;
    zoomCreator.onChange = refreshZoomPresetUI;

    favApply.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        var clips = requireTarget(
            comp,
            targetDD.selection.text,
            clipNumberField
        );

        if (!clips) return;

        var preset = selectedPresetFile(favPreset, favFilesCache);

        if (!preset) {
            alert("Choose a Favorite Preset first.");
            return;
        }

        app.beginUndoGroup("Apply Favorite Preset");

        try {
            if (favMode.selection.text === "Adjustment Layer") {
                applyPresetAsAdjustments(
                    comp,
                    clips,
                    preset,
                    "Favorite Preset"
                );
            } else {
                applyPresetDirectToClips(
                    comp,
                    clips,
                    preset
                );
            }
        } finally {
            app.endUndoGroup();
        }
    };

    favApplyAll.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        var clips = allClips(comp);
        var preset = selectedPresetFile(favPreset, favFilesCache);

        if (!preset) {
            alert("Choose a Favorite Preset first.");
            return;
        }

        app.beginUndoGroup("Apply Favorite Preset To All");

        try {
            if (favMode.selection.text === "Adjustment Layer") {
                applyPresetAsAdjustments(
                    comp,
                    clips,
                    preset,
                    "Favorite Preset"
                );
            } else {
                applyPresetDirectToClips(
                    comp,
                    clips,
                    preset
                );
            }
        } finally {
            app.endUndoGroup();
        }
    };

    applyJawsPresetTarget.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        var clips = requireTarget(
            comp,
            targetDD.selection.text,
            clipNumberField
        );

        if (!clips) return;

        var preset = findJawsPreset();

        if (!preset) {
            alert("Import the Jaws .ffx preset first.");
            return;
        }

        app.beginUndoGroup("Apply Jaws Preset");

        try {
            for (var i = 0; i < clips.length; i++) {
                applyJawsPresetToClip(
                    comp,
                    clips[i],
                    preset
                );
            }
        } finally {
            app.endUndoGroup();
        }
    };

    applyJawsPresetClip1.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        var clips = clipByNumber(comp, 1);
        var preset = findJawsPreset();

        if (clips.length === 0 || !preset) {
            alert("Clip #1 or Jaws preset is missing.");
            return;
        }

        app.beginUndoGroup("Apply Jaws Preset Clip 1");

        try {
            applyJawsPresetToClip(
                comp,
                clips[0],
                preset
            );
        } finally {
            app.endUndoGroup();
        }
    };

    zoomApply.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        var clips = requireTarget(
            comp,
            targetDD.selection.text,
            clipNumberField
        );

        if (!clips) return;

        var preset = selectedPresetFile(
            zoomPreset,
            zoomFilesCache
        );

        if (!preset) {
            alert("Choose a Zoom preset first.");
            return;
        }

        app.beginUndoGroup("Apply Zoom Preset");

        try {
            applyPresetAsAdjustments(
                comp,
                clips,
                preset,
                "Zoom Preset"
            );
        } finally {
            app.endUndoGroup();
        }
    };

    zoomApplyAll.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        var preset = selectedPresetFile(
            zoomPreset,
            zoomFilesCache
        );

        if (!preset) {
            alert("Choose a Zoom preset first.");
            return;
        }

        app.beginUndoGroup("Apply Zoom Preset To All");

        try {
            applyPresetAsAdjustments(
                comp,
                allClips(comp),
                preset,
                "Zoom Preset"
            );
        } finally {
            app.endUndoGroup();
        }
    };

    zoomCycleAll.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        app.beginUndoGroup("Cycle Zoom Presets");

        try {
            var count = zoomPresetCycle(
                comp,
                allClips(comp),
                parseInt(zoomBlockSize.selection.text, 10)
            );

            if (count === 0) {
                alert("Import Zoom .ffx files first.");
            }
        } finally {
            app.endUndoGroup();
        }
    };

    applyPanPattern.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        app.beginUndoGroup("Batch Pan Pattern");

        try {
            applyBatchDirectionalMotion(
                comp,
                "Pan",
                parseInt(clipsPerBatch.selection.text, 10),
                [
                    batchDir1.selection.text,
                    batchDir2.selection.text,
                    batchDir3.selection.text,
                    batchDir4.selection.text
                ],
                motionTiming.selection.text,
                motionIntensity.selection.text
            );
        } finally {
            app.endUndoGroup();
        }
    };

    applySlidePattern.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        app.beginUndoGroup("Batch Slide Pattern");

        try {
            applyBatchDirectionalMotion(
                comp,
                "Slide",
                parseInt(clipsPerBatch.selection.text, 10),
                [
                    batchDir1.selection.text,
                    batchDir2.selection.text,
                    batchDir3.selection.text,
                    batchDir4.selection.text
                ],
                motionTiming.selection.text,
                motionIntensity.selection.text
            );
        } finally {
            app.endUndoGroup();
        }
    };

    muteAllButton.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        app.beginUndoGroup("Mute All Split Clips");

        try {
            muteAllClipAudio(comp, true);
        } finally {
            app.endUndoGroup();
        }
    };

    unmuteAllButton.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        app.beginUndoGroup("Unmute All Split Clips");

        try {
            muteAllClipAudio(comp, false);
        } finally {
            app.endUndoGroup();
        }
    };


    allRecipeButton.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        app.beginUndoGroup("All Recipe");
        try {
            allRecipe(comp);
        } finally {
            app.endUndoGroup();
        }
    };

    whiteStartEnd.onClick = function() {
        var x = targetNow(false);
        if (!x) return;

        app.beginUndoGroup("White Flash Start End");
        try {
            whiteFlashStartEnd(
                x.comp,
                x.clips,
                getNum(whiteOpacity.field, 85, 0, 100)
            );
        } finally {
            app.endUndoGroup();
        }
    };

    whiteCuts.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        app.beginUndoGroup("White Flash Every Cut");
        try {
            whiteFlashEveryCut(
                comp,
                getNum(whiteOpacity.field, 85, 0, 100)
            );
        } finally {
            app.endUndoGroup();
        }
    };

    blackApply.onClick = function() {
        var x = targetNow(false);
        if (!x) return;

        app.beginUndoGroup("Black Flash 2");
        try {
            applyBlackFlash(
                x.comp,
                x.clips,
                blackPlacement.selection.text,
                blackIntensity.selection.text
            );
        } finally {
            app.endUndoGroup();
        }
    };

    blackAll.onClick = function() {
        var x = targetNow(true);
        if (!x) return;

        app.beginUndoGroup("Black Flash 2 All");
        try {
            applyBlackFlash(
                x.comp,
                x.clips,
                blackPlacement.selection.text,
                blackIntensity.selection.text
            );
        } finally {
            app.endUndoGroup();
        }
    };

    starterApply.onClick = function() {
        var x = targetNow(false);
        if (!x) return;

        app.beginUndoGroup("Clip Starter");
        try {
            // Compact starter: adjustment helper with blur + shake.
            var d = intensity(starterIntensity.selection.text);

            for (var i = 0; i < x.clips.length; i++) {
                var clip = x.clips[i];
                var t = timingSpan(x.comp, clip, starterTiming.selection.text, 6);
                var adj = makeAdjustmentForClip(x.comp, clip, "clip starter", L_YELLOW);
                adj.outPoint = Math.min(clip.outPoint, t.b + x.comp.frameDuration);

                var fx = adj.property("ADBE Effect Parade");
                var g = addEffect(fx, ["ADBE Gaussian Blur 2", "Gaussian Blur"]);

                if (g) {
                    var bl = findDirect(g, ["Blurriness"]);
                    var rep = findDirect(g, ["Repeat Edge Pixels"]);

                    if (bl) {
                        bl.setValueAtTime(t.a, getNum(starterBlur.field, 28, 0, 120) * d.blur);
                        bl.setValueAtTime(t.b, 0);
                        easyEase(bl, 82);
                    }

                    try { if (rep) rep.setValue(1); } catch (e0) {}
                }

                var tr = addEffect(fx, ["ADBE Geometry2", "Transform"]);

                if (tr) {
                    var pos = findDirect(tr, ["Position"]);
                    var rot = findDirect(tr, ["Rotation"]);

                    var cx = x.comp.width / 2;
                    var cy = x.comp.height / 2;
                    var m = t.a + (t.b - t.a) * 0.5;

                    if (pos) {
                        pos.setValueAtTime(t.a, [cx + d.p, cy - d.p * 0.4]);
                        pos.setValueAtTime(m, [cx - d.p * 0.4, cy + d.p * 0.25]);
                        pos.setValueAtTime(t.b, [cx, cy]);
                        easyEase(pos, 82);
                    }

                    if (rot) {
                        rot.setValueAtTime(t.a, -d.r);
                        rot.setValueAtTime(m, d.r * 0.5);
                        rot.setValueAtTime(t.b, 0);
                        easyEase(rot, 82);
                    }
                }
            }
        } finally {
            app.endUndoGroup();
        }
    };

    function runMotion(fn, direction, all) {
        var x = targetNow(all);
        if (!x) return;

        app.beginUndoGroup("Ethan Motion");
        try {
            if (fn === applyRebound) {
                fn(
                    x.comp,
                    x.clips,
                    motionTiming.selection.text,
                    motionIntensity.selection.text,
                    reboundSpeedDD.selection.text
                );
            } else if (direction) {
                fn(
                    x.comp,
                    x.clips,
                    direction,
                    motionTiming.selection.text,
                    motionIntensity.selection.text
                );
            } else {
                fn(
                    x.comp,
                    x.clips,
                    motionTiming.selection.text,
                    motionIntensity.selection.text
                );
            }
        } finally {
            app.endUndoGroup();
        }
    }

    reboundApply.onClick = function() { runMotion(applyRebound, null, false); };
    reboundAll.onClick = function() { runMotion(applyRebound, null, true); };
    shakeApply.onClick = function() { runMotion(applyShake, null, false); };
    shakeAll.onClick = function() { runMotion(applyShake, null, true); };

    panLeft.onClick = function() { runMotion(applyPan, "Left", false); };
    panRight.onClick = function() { runMotion(applyPan, "Right", false); };
    panUp.onClick = function() { runMotion(applyPan, "Up", false); };
    panDown.onClick = function() { runMotion(applyPan, "Down", false); };

    slideLeft.onClick = function() { runMotion(applySlide, "Left", false); };
    slideRight.onClick = function() { runMotion(applySlide, "Right", false); };
    slideUp.onClick = function() { runMotion(applySlide, "Up", false); };
    slideDown.onClick = function() { runMotion(applySlide, "Down", false); };

    introTarget.onClick = function() {
        var x = targetNow(false);
        if (!x) return;

        app.beginUndoGroup("Intro Clip");
        try {
            applyIntroClip(
                x.comp,
                x.clips[0],
                introSaturation.selection.text
            );
        } finally {
            app.endUndoGroup();
        }
    };

    introClip1.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        var clip = clipByNumber(comp, 1);
        if (clip.length === 0) return;

        app.beginUndoGroup("Intro Clip #1");
        try {
            applyIntroClip(
                comp,
                clip[0],
                introSaturation.selection.text
            );
        } finally {
            app.endUndoGroup();
        }
    };

    transitionApply.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        var pairs = cutSelection(comp);

        if (!pairs || pairs.length === 0) {
            alert("No matching cut found.");
            return;
        }

        app.beginUndoGroup("Ethan Transition");
        try {
            applyTransitionStyle(
                comp,
                pairs,
                transitionStyle.selection.text,
                framesFromText(transitionLength.selection.text, 2),
                transitionIntensity.selection.text
            );
        } finally {
            app.endUndoGroup();
        }
    };

    transitionFlashButton.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        app.beginUndoGroup("White Flash Every Cut");
        try {
            whiteFlashEveryCut(
                comp,
                getNum(transitionFlashOpacity.field, 85, 0, 100)
            );
        } finally {
            app.endUndoGroup();
        }
    };

    cleanBase.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        var clips = allClips(comp);

        app.beginUndoGroup("Clean Base");
        try {
            addMotionTile(clips);
            renameClipNumbers(clips);
            rainbowify(comp);
        } finally {
            app.endUndoGroup();
        }
    };

    smoothBase.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        var clips = allClips(comp);

        app.beginUndoGroup("Smooth Base");
        try {
            addMotionTile(clips);
            whiteFlashEveryCut(comp, 85);
            applyShake(comp, clips, "Beginning", "Super calm");
            renameClipNumbers(clips);
            rainbowify(comp);
        } finally {
            app.endUndoGroup();
        }
    };

    fullSafe.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        var clips = allClips(comp);

        app.beginUndoGroup("Full Safe");
        try {
            addMotionTile(clips);
            whiteFlashEveryCut(comp, 85);
            applyShake(comp, clips, "Beginning", "Super calm");
            applyTransitionStyle(comp, cutPairs(comp), "Rainbow Mix", 2, "Super calm");
            renameClipNumbers(clips);
            rainbowify(comp);
        } finally {
            app.endUndoGroup();
        }
    };

    runManualBuild.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        var clips = selectedClips(comp);
        if (clips.length === 0) {
            alert("Manual Build now works on SELECTED split clips. Select the clips you want first.");
            return;
        }

        app.beginUndoGroup("Manual Build");
        try {
            if (mbMotion.value) addMotionTile(clips);
            if (mbStarter.value) applyShake(comp, clips, "Beginning of Clip", "Super calm");
            if (mbWhite.value) whiteFlashEveryCut(comp, 85);
            if (mbBlack.value) fullClipBlackFlashMild(comp, clips);
            if (mbTransitions.value) applyTransitionStyle(comp, cutPairs(comp), "Rainbow Mix", 2, "Super calm");
            if (mbPrecomp.value) clips = safePrecompEach(comp, clips);
            if (mbRename.value) renameClipNumbers(clips);
            if (mbRainbow.value) rainbowify(comp);
        } finally {
            app.endUndoGroup();
        }
    };

    fullSoundButton.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        app.beginUndoGroup("Full Sound Clip");
        try {
            fullSoundClip(comp);
        } finally {
            app.endUndoGroup();
        }
    };

    motionTileButton.onClick = function() {
        var x = targetNow(false);
        if (!x) return;

        app.beginUndoGroup("Motion Tile Direct");
        try { addMotionTile(x.clips); }
        finally { app.endUndoGroup(); }
    };

    safePrecompButton.onClick = function() {
        var x = targetNow(false);
        if (!x) return;

        app.beginUndoGroup("Safe Precomp");
        try {
            var result = safePrecompEach(x.comp, x.clips);

            clearSelection(x.comp);
            for (var i = 0; i < result.length; i++) {
                try { result[i].selected = true; } catch (e0) {}
            }
        } finally {
            app.endUndoGroup();
        }
    };

    renameButton.onClick = function() {
        var x = targetNow(false);
        if (!x) return;

        app.beginUndoGroup("Rename Clips");
        try { renameClipNumbers(x.clips); }
        finally { app.endUndoGroup(); }
    };

    noColorToColor.onClick = function() {
        var x = targetNow(false);
        if (!x) return;

        app.beginUndoGroup("No Color To Color");
        try {
            for (var i = 0; i < x.clips.length; i++) {
                addSaturationChanger(
                    x.comp,
                    x.clips[i],
                    saturationTiming.selection.text,
                    false
                );
            }
        } finally {
            app.endUndoGroup();
        }
    };

    saturationPulse.onClick = function() {
        var x = targetNow(false);
        if (!x) return;

        app.beginUndoGroup("Saturation Pulse");
        try {
            for (var i = 0; i < x.clips.length; i++) {
                addSaturationChanger(
                    x.comp,
                    x.clips[i],
                    saturationTiming.selection.text,
                    true
                );
            }
        } finally {
            app.endUndoGroup();
        }
    };

    selectEverythingButton.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        app.beginUndoGroup("Select Everything");
        try { selectEverything(comp); }
        finally { app.endUndoGroup(); }
    };

    rainbowButton.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        app.beginUndoGroup("Rainbowify");
        try { rainbowify(comp); }
        finally { app.endUndoGroup(); }
    };

    organizeButton.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        app.beginUndoGroup("Organize By Type");
        try { organizeByType(comp); }
        finally { app.endUndoGroup(); }
    };

    function capcutTarget() {
        return targetNow(false);
    }

    function capcutFrames() {
        // Automatic internal timing; UI no longer asks the user for frame counts.
        return 6;
    }

    capFadeIn.onClick = function() {
        var x = capcutTarget(); if (!x) return;
        app.beginUndoGroup("CapCut Fade In");
        try {
            capcutFade(
                x.comp, x.clips, true,
                capcutPlacement.selection.text,
                capcutFrames(),
                capcutIntensity.selection.text
            );
        } finally { app.endUndoGroup(); }
    };

    capFadeOut.onClick = function() {
        var x = capcutTarget(); if (!x) return;
        app.beginUndoGroup("CapCut Fade Out");
        try {
            capcutFade(
                x.comp, x.clips, false,
                capcutPlacement.selection.text,
                capcutFrames(),
                capcutIntensity.selection.text
            );
        } finally { app.endUndoGroup(); }
    };

    capHorizontalIn.onClick = function() {
        var x = capcutTarget(); if (!x) return;
        app.beginUndoGroup("CapCut Horizontal Blur In");
        try {
            capcutHorizontalBlur(
                x.comp, x.clips, true,
                capcutPlacement.selection.text,
                capcutFrames(),
                capcutIntensity.selection.text
            );
        } finally { app.endUndoGroup(); }
    };

    capHorizontalOut.onClick = function() {
        var x = capcutTarget(); if (!x) return;
        app.beginUndoGroup("CapCut Horizontal Blur Out");
        try {
            capcutHorizontalBlur(
                x.comp, x.clips, false,
                capcutPlacement.selection.text,
                capcutFrames(),
                capcutIntensity.selection.text
            );
        } finally { app.endUndoGroup(); }
    };

    capFlashIn.onClick = function() {
        var x = capcutTarget(); if (!x) return;
        app.beginUndoGroup("CapCut Flash In");
        try {
            capcutFlash(
                x.comp, x.clips, "Flash In",
                capcutPlacement.selection.text,
                capcutFrames(),
                capcutIntensity.selection.text
            );
        } finally { app.endUndoGroup(); }
    };

    capFlashOut.onClick = function() {
        var x = capcutTarget(); if (!x) return;
        app.beginUndoGroup("CapCut Flash Out");
        try {
            capcutFlash(
                x.comp, x.clips, "Flash Out",
                capcutPlacement.selection.text,
                capcutFrames(),
                capcutIntensity.selection.text
            );
        } finally { app.endUndoGroup(); }
    };

    capFlashLoop.onClick = function() {
        var x = capcutTarget(); if (!x) return;
        app.beginUndoGroup("CapCut Flash Loop");
        try {
            capcutFlash(
                x.comp, x.clips, "Flash Loop",
                capcutPlacement.selection.text,
                capcutFrames(),
                capcutIntensity.selection.text
            );
        } finally { app.endUndoGroup(); }
    };

    removeAllButton.onClick = function() {
        var comp = getComp();
        if (!comp) return;

        app.beginUndoGroup("Remove All Hub Content");
        try {
            removeAllGenerated(comp);
        } finally {
            app.endUndoGroup();
        }
    };

    removeWhite.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Remove White Flashes");
        try { removeGeneratedToken(comp, "white flash transition"); }
        finally { app.endUndoGroup(); }
    };

    removeBlack.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Remove Black Flash 2");
        try { removeGeneratedToken(comp, "black flash 2"); }
        finally { app.endUndoGroup(); }
    };

    removeRebound.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Remove Rebound");
        try { removeGeneratedToken(comp, "rebound swing"); }
        finally { app.endUndoGroup(); }
    };

    removeShake.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Remove Shake");
        try { removeGeneratedToken(comp, "ethan shake"); }
        finally { app.endUndoGroup(); }
    };

    removePan.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Remove Panning");
        try { removeGeneratedToken(comp, "ethan pan"); }
        finally { app.endUndoGroup(); }
    };

    removeSlides.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Remove Smooth Slides");
        try {
            removeGeneratedToken(comp, "ethan smooth slide");
            removeGeneratedToken(comp, "ethan slide blur");
        } finally { app.endUndoGroup(); }
    };

    removeTransitions.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Remove Cut Transitions");
        try { removeGeneratedToken(comp, "transition - "); }
        finally { app.endUndoGroup(); }
    };

    removeIntro.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Remove Intro Stack");
        try {
            removeGeneratedToken(comp, "bcc ripple dissolve intro");
            removeGeneratedToken(comp, "rotate jaws");
            removeGeneratedToken(comp, "saturation changer");
        } finally { app.endUndoGroup(); }
    };

    removeTransitionStyle.onClick = function() {
        var comp = getComp(); if (!comp) return;
        var style = transitionStyle.selection.text;

        app.beginUndoGroup("Remove Transition Style");
        try {
            if (style === "Rainbow Mix") {
                removeGeneratedToken(comp, "transition - ");
            } else {
                removeGeneratedToken(comp, "transition - " + style);
            }
        } finally { app.endUndoGroup(); }
    };

    remCapFadeIn.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Remove CapCut Fade In");
        try { removeGeneratedToken(comp, "capcut fade in"); }
        finally { app.endUndoGroup(); }
    };

    remCapFadeOut.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Remove CapCut Fade Out");
        try { removeGeneratedToken(comp, "capcut fade out"); }
        finally { app.endUndoGroup(); }
    };

    remCapFlashLoop.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Remove CapCut Flash Loop");
        try { removeGeneratedToken(comp, "capcut flash loop"); }
        finally { app.endUndoGroup(); }
    };

    remCapFlashIn.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Remove CapCut Flash In");
        try { removeGeneratedToken(comp, "capcut flash in"); }
        finally { app.endUndoGroup(); }
    };

    remCapFlashOut.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Remove CapCut Flash Out");
        try { removeGeneratedToken(comp, "capcut flash out"); }
        finally { app.endUndoGroup(); }
    };

    remCapHorizontalIn.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Remove CapCut Horizontal Blur In");
        try { removeGeneratedToken(comp, "capcut horizontal blur in"); }
        finally { app.endUndoGroup(); }
    };

    remCapHorizontalOut.onClick = function() {
        var comp = getComp(); if (!comp) return;
        app.beginUndoGroup("Remove CapCut Horizontal Blur Out");
        try { removeGeneratedToken(comp, "capcut horizontal blur out"); }
        finally { app.endUndoGroup(); }
    };

    // ============================================================
    // REFRESH / RESIZE
    // ============================================================

    var pages = [
        allPage,
        audioPage,
        textPage,
        zoomsPage,
        utilitiesPage,
        motionPage,
        transitionsPage,
        homePage,
        buildPage,
        capcutPage,
        extrasPage,
        favoritesPage,
        removePage
    ];

    TAB_INFOS = [
        {name:"All", tab:allTab, page:allPage},
        {name:"Audio", tab:audioTab, page:audioPage},
        {name:"TEXT", tab:textTab, page:textPage},
        {name:"Zooms", tab:zoomsTab, page:zoomsPage},
        {name:"Utilities", tab:utilitiesTab, page:utilitiesPage},
        {name:"Motion", tab:motionTab, page:motionPage},
        {name:"Transitions", tab:transitionsTab, page:transitionsPage},
        {name:"Home", tab:homeTab, page:homePage},
        {name:"Build", tab:buildTab, page:buildPage},
        {name:"CapCut", tab:capcutTab, page:capcutPage},
        {name:"Extras", tab:extrasTab, page:extrasPage},
        {name:"Favorite Presets", tab:favoritesTab, page:favoritesPage},
        {name:"Remove All", tab:removeTab, page:removePage}
    ];

    function refreshPages() {
        for (var i = 0; i < pages.length; i++) {
            try { pages[i].refresh(); } catch (e0) {}
        }
    }

    refreshFavoritePresetUI();
    refreshZoomPresetUI();

    tabs.selection = allTab;

    tabs.onChange = function() {
        refreshPages();
    };

    rebuildSearchIndex();
    updateSearchResults();
    hookGlobalWheel(win);

    win.onResizing = win.onResize = function() {
        try {
            this.layout.resize();
            refreshPages();
        } catch (e0) {}
    };

    if (win instanceof Window) {
        win.center();
        win.show();
        refreshPages();
    } else {
        win.layout.layout(true);
        win.layout.resize();
        refreshPages();
    }

})(this);
