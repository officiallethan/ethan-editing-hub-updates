ETHAN AE LUXE — OFFICIALLETHANNN INC.
=====================================
INSTALL: run INSTALL_ETHAN_AE_LUXE.bat
LAUNCH: use the new "Ethan After Effects" desktop shortcut.
PANIC/SAFE: use "After Effects - SAFE BOOT".

WHAT LUXE SYSTEM 2.2 ADDS
- Tahoe Liquid Glass default Hub theme.
- Appearance Studio: change Hub title, subtitle, accent, glass tint, text, glow, opacity, roundness, brand icon, animation level and button naming.
- Invisible one-shot CEP background helper. It does not constantly poll the project.
- Project initializer: creates clean project folders. If a comp already exists, it renames it "Ethan's Main Edit". It does NOT invent a resolution/frame rate when no comp exists.
- Effect Profiler: lists effect counts and potential heavy instances.
- Plugin Health: checks key effect families and missing placeholders.
- Project Doctor: flags giant comps, high Motion Tile values, missing/heavy effects.
- Live Project Stats: opt-in 5-second refresh; OFF by default.
- Safe exact-name missing-footage relinker. It refuses to guess when multiple files match.
- Generated dedicated audio bed is now "Edit Audio" and a repair button can enforce it.
- Native preset sync: all bundled .ffx files are copied to Documents\Adobe\After Effects\Presets\Ethan Editing Hub, so AE's native Effects & Presets can see them too.
- Rebuilt black/gold OFFICIALLETHANNN INC. launcher: textured gold identity art, restrained bullion detail, clean separated progress bar, and milestone progress.
- 100% means the Ethan background system returned its ready handshake. If CEP does not return the handshake, the launcher explicitly reports a timeout instead of pretending it knows Adobe's internal loading percentage.
- Light shutdown cleanup removes Ethan temporary files only. It deliberately does NOT erase AE disk cache after every exit because that would make the next session slower.

WORKSPACE
Adobe does not expose a safe public scripting API to forcibly dock/rearrange native panels. Set this ONCE:
- Composition viewer: upper half / main left area
- Timeline: lower half / main left area
- Ethan's Editing Hub: docked right
- Save as workspace "ETHAN EDIT"
After Effects remembers the workspace.

NATIVE AE UI LIMIT
The Hub/launcher/custom Ethan panels can be deeply skinned. Adobe's native Timeline, Project panel, Effect Controls and application chrome cannot safely be arbitrary CSS-skinned or renamed without unsupported resource/DLL patching, which this package intentionally does not do.
