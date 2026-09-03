from pathlib import Path
import json, re, unittest, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'src' / 'com.ethan.editinghub'
APP = (SRC / 'js/app.js').read_text(encoding='utf-8')
BACK = (SRC / 'jsx/backend.jsx').read_text(encoding='utf-8')
HTML = (SRC / 'index.html').read_text(encoding='utf-8')
CSS = (SRC / 'css/style.css').read_text(encoding='utf-8')


def function_body(source, name):
    marker = 'function ' + name + '('
    start = source.find(marker)
    if start < 0:
        return ''
    brace = source.find('{', start)
    depth = 0
    for i in range(brace, len(source)):
        if source[i] == '{': depth += 1
        elif source[i] == '}':
            depth -= 1
            if depth == 0:
                return source[start:i+1]
    return ''


class NeonHeartbeat328(unittest.TestCase):
    def test_release_identity_is_328_neon_heartbeat_everywhere(self):
        current = json.loads((SRC/'updater/current_release.json').read_text(encoding='utf-8'))
        overlay = json.loads((SRC/'updater/overlay_release.json').read_text(encoding='utf-8'))
        self.assertEqual((current['version'], current['build'], current['name']), ('3.2.8','3280','Neon Heartbeat'))
        self.assertEqual((overlay['version'], overlay['build'], overlay['name']), ('3.2.8','3280','Neon Heartbeat'))
        manifest = ET.parse(SRC/'CSXS/manifest.xml').getroot()
        self.assertEqual(manifest.attrib['ExtensionBundleId'], 'com.ethan.editinghub')
        self.assertEqual(manifest.attrib['ExtensionBundleVersion'], '3.2.8')
        versions = {x.attrib['Version'] for x in manifest.findall('.//Extension') if 'Version' in x.attrib}
        self.assertEqual(versions, {'3.2.8'})
        self.assertIn("var CURRENT_VERSION='3.2.8';", APP)
        self.assertIn("var CURRENT_BUILD='3280';", APP)
        self.assertIn("var CURRENT_RELEASE='Neon Heartbeat';", APP)
        self.assertIn("PREMIUM 2.0 • 3.2.8 NEON HEARTBEAT", BACK)
        self.assertIn('PREMIUM 2.0 • 3.2.8 • NEON HEARTBEAT', HTML)

    def test_software_update_channel_pill_is_real_content(self):
        self.assertIn('● LIVE • SECURE CHANNEL', HTML)
        render = function_body(APP, 'renderCurrent')
        self.assertIn("textContent='● LIVE • SECURE CHANNEL'", render)
        self.assertIn('hidden=false', render)
        self.assertRegex(CSS, r'\.softwareUpdateRelease[^}]*width\s*:\s*fit-content')

    def test_midnight_aurora_theme_is_available(self):
        self.assertIn('value="aurora"', HTML)
        self.assertIn('Midnight Aurora', HTML)
        self.assertRegex(APP, r'aurora\s*:\s*1')
        self.assertIn('body[data-theme="aurora"]', CSS)
        for token in ('#050812', '#151052', '#38d8ff'):
            self.assertIn(token, CSS)

    def test_subscription_plan_cards_keep_plan_identity(self):
        for cls in ('plan-default','plan-plus','plan-pro','plan-premium','plan-bronze','plan-silver','plan-gold','plan-diamond','plan-elite'):
            self.assertRegex(CSS, rf'\.{cls}\s*\{{[^}}]*background:', cls)
        self.assertNotRegex(CSS, r'body\[data-theme\]\s+\.planCard\s*,\s*body\[data-theme\]\s+\.plan-default')
        self.assertIn('activePlanBadge plan-badge-', APP)

    def test_dropdown_and_page_motion_are_event_driven(self):
        self.assertRegex(CSS, r'\.mainNav\.pageSelectNav \.pageSelectMenu\s*\{[^}]*visibility:hidden[^}]*opacity:0')
        self.assertRegex(CSS, r'\.mainNav\.pageSelectNav\.open \.pageSelectMenu\s*\{[^}]*visibility:visible[^}]*opacity:1')
        self.assertIn('@keyframes neonHeartbeatPageIn', CSS)
        self.assertIn('.page.active .panelCard', CSS)
        self.assertIn('body[data-motion="off"]', CSS)
        self.assertIn('animation:neonHeartbeatSweep', CSS)
        self.assertNotRegex(CSS, r'neonHeartbeat(?:PageIn|Sweep)[^;\n}]*infinite')

    def test_all_native_selects_are_upgraded_to_animated_proxies(self):
        self.assertIn('function enhanceNeonSelect(sel)', APP)
        self.assertIn("sel.dispatchEvent(new Event('change',{bubbles:true}))", APP)
        self.assertIn("document.querySelectorAll('select').forEach(enhanceNeonSelect)", APP)
        self.assertRegex(CSS, r'\.neonSelectMenu\s*\{[^}]*visibility:hidden[^}]*opacity:0')
        self.assertRegex(CSS, r'\.neonSelect\.open \.neonSelectMenu\s*\{[^}]*visibility:visible[^}]*opacity:1')
        self.assertIn('@keyframes neonHeartbeatSweep', CSS)

    def test_about_uses_detached_live_telemetry_worker(self):
        worker = SRC/'updater/about_telemetry.ps1'
        self.assertTrue(worker.exists())
        ps = worker.read_text(encoding='utf-8')
        for token in ('Get-Process', 'TotalProcessorTime', 'Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine', 'Move-Item', 'heartbeat'):
            self.assertIn(token, ps)
        self.assertIn('Start-Sleep -Milliseconds 1500', ps)
        self.assertIn('UTF8Encoding($false)', ps)
        self.assertNotIn('Set-Content -LiteralPath $tmp -Encoding UTF8', ps)
        self.assertIn('function EthanHub_startAboutTelemetry()', BACK)
        self.assertIn('function EthanHub_readAboutTelemetry()', BACK)
        self.assertIn('function EthanHub_stopAboutTelemetry()', BACK)
        self.assertNotIn('-SampleInterval 1', function_body(BACK, 'EthanHub_aboutPerformance'))
        about = APP[APP.find('// ABOUT +'):]
        self.assertIn("EthanHub_startAboutTelemetry()", about)
        self.assertIn("EthanHub_readAboutTelemetry()", about)
        self.assertIn('1500', about)
        self.assertIn("localStorage.getItem('ethanHubAboutLive')", about)
        self.assertIn("saved===null?true:saved==='1'", about)
        for id_ in ('aboutSystemMemUsage','aboutSystemMemBar','aboutProjectStats','aboutTelemetryStamp'):
            self.assertIn(id_, HTML)
            self.assertIn(id_, APP)

    def test_vertical_jaws_are_full_duration_black_solid_helpers(self):
        self.assertIn('function EH_ensureVerticalJawsSolid(c,clip)', BACK)
        body = function_body(BACK, 'EH_ensureVerticalJawsSolid')
        self.assertIn("EH_makeSolid(c,'Vertical Jaws'", body)
        self.assertIn('clip.inPoint,clip.outPoint,[0,0,0]', body)
        self.assertIn("EH_findPreset(['tattooedhe8rt','jaws','vertical'])", body)
        self.assertIn('EH_forceCenters(jaws,c)', body)
        self.assertIn('jaws.moveBefore(clip)', body)

    def test_beat_drop_always_has_jaws_then_ripple_then_clip(self):
        beat = function_body(BACK, 'EH_beatDropSpecial')
        self.assertIn("EH_makeAdjustment(c,'ripple'", beat)
        self.assertIn("EH_findPreset(['tattooedhe8rt','ripple'])", beat)
        self.assertIn('EH_ensureVerticalJawsSolid(c,clip)', beat)
        self.assertIn('jaws.moveBefore(ripple)', beat)
        self.assertIn('ripple.moveBefore(clip)', beat)

    def test_literal_every_10th_split_clip_gets_vertical_jaws(self):
        self.assertIn('function EH_addPeriodicVerticalJaws(c,pieces)', BACK)
        periodic = function_body(BACK, 'EH_addPeriodicVerticalJaws')
        self.assertRegex(periodic, r'Split Clip#')
        self.assertRegex(periodic, r'%\s*10\s*===\s*0')
        self.assertIn('EH_ensureVerticalJawsSolid(c,clip)', periodic)
        viral = function_body(BACK, 'EthanHub_viralEdit')
        self.assertIn('EH_addPeriodicVerticalJaws(c,pieces)', viral)
        self.assertNotIn('num%9===0)EH_horizontalJaws', viral)

    def test_rotate_skew_stay_on_footage_but_jaws_do_not(self):
        sjr = function_body(BACK, 'EH_sjrApplyPair')
        self.assertIn('EH_sjrTransformWH(out', sjr)
        self.assertIn('EH_sjrTransformWH(inc', sjr)
        self.assertIn('EH_applySmoothSkew(c,out', sjr)
        self.assertIn('EH_applySmoothSkew(c,inc', sjr)
        for forbidden in ('EH_sjrWarp(out','EH_sjrWarp(inc','EH_sjrWave(out','EH_sjrWave(inc','EH_sjrLens(out','EH_sjrLens(inc','EH_sjrBlur(out','EH_sjrBlur(inc','EH_sjrBuildSideStack'):
            self.assertNotIn(forbidden, sjr)
        self.assertIn('EH_ensureVerticalJawsSolid(c,out)', sjr)
        self.assertIn('EH_ensureVerticalJawsSolid(c,inc)', sjr)
        self.assertNotRegex(sjr, r'EH_applyPresetCaptureEffects\(c\s*,\s*(out|inc)\s*,[^\n]*jaws')
        manual = function_body(BACK, 'EthanHub_smoothJawsRotate')
        self.assertNotIn('rear ghost', manual.lower())
        self.assertIn('black vertical-jaws helper solids', manual.lower())

    def test_flicker_is_top_global_x2_at_85(self):
        finish = function_body(BACK, 'EH_globalFinish')
        self.assertIn("EH_makeAdjustment(c,'flicker',0,c.duration,'GLOBAL','FLICKER')", finish)
        self.assertRegex(finish, r'ADBE Opacity[^;]*setValue\(85\)')
        self.assertEqual(finish.count('EH_applyPreset(c,flick,fp,0,true)'), 2)
        order = function_body(BACK, 'EH_orderTimeline')
        self.assertIn('flick[0].moveToBeginning()', order)
        self.assertIn("EH_findOwnerKind(c,clip.name,'JAWS_VERTICAL')", order)
        self.assertIn('jaws.moveBefore(r)', order)
        self.assertIn('r.moveBefore(clip)', order)

    def test_locked_viral_contracts_remain(self):
        self.assertIn("🔥 ETHAN'S VIRAL EDIT", HTML)
        self.assertIn("EthanHub_viralEdit", BACK)
        self.assertIn("ethan's edit audio", BACK)
        self.assertIn('1.77', BACK)
        self.assertIn('0.97', BACK)
        # The OTA overlay intentionally does not carry binary preset files; they remain
        # in the installed/full package. Assert the authoritative lookup contracts stay intact.
        for lookup in (
            "EH_findPreset(['jamesmaximoffs','flicker'])",
            "EH_findPreset(['tattooedhe8rt','jaws','vertical'])",
            "EH_findPreset(['tattooedhe8rt','ripple'])",
            "EH_findPreset(['tattooedhe8rt','edge rays'])",
            "['tattooedhe8rt','slide down 1']",
            "['tattooedhe8rt','slide down 2']",
            "['tattooedhe8rt','slide left 1']",
            "['tattooedhe8rt','slide left 2']",
        ):
            self.assertIn(lookup, BACK)



if __name__ == '__main__':
    unittest.main(verbosity=2)
