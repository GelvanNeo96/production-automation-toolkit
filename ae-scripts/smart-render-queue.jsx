/**
 * ============================================================
 *  SMART RENDER QUEUE MANAGER FOR AFTER EFFECTS
 *  Automatically sets optimal render settings based on
 *  delivery platform specs with one-click presets.
 * ============================================================
 *
 *  PRESETS INCLUDED:
 *    - Instagram Story (1080x1920, 9:16, H.264, 15-60s)
 *    - Instagram Reels (1080x1920, 9:16, H.264, up to 90s)
 *    - Instagram Feed (1080x1080, 1:1, H.264, up to 60s)
 *    - YouTube 16:9 (1920x1080 or 3840x2160, H.264/ProRes)
 *    - YouTube Shorts (1080x1920, 9:16, H.264)
 *    - LinkedIn Feed (1920x1080 or 1080x1080, H.264)
 *    - Twitter/X (1920x1080, H.264, under 140s)
 *    - TikTok (1080x1920, 9:16, H.264)
 *    - Facebook Feed (1920x1080, H.264)
 *    - Bybit Internal (1920x1080, ProRes 422 HQ, master quality)
 *    - ProRes Master (preserves comp settings, ProRes 4444)
 *    - GIF Preview (480px wide, animated GIF)
 *
 *  USAGE:
 *    1. Select comps in the project panel (or run with none for active comp)
 *    2. Run script → pick a preset from the UI
 *    3. Script adds to render queue with correct settings
 *    4. Hit Render!
 *
 *  Author: Gelvan Neo | Bybit Livestream & Video
 *  Version: 1.0
 */

// ─── PRESET DEFINITIONS ─────────────────────────────────────
// NOTE: After Effects render settings use template names.
// These presets map to Output Module templates + Render Settings.
// You'll need to create matching Output Module templates in AE
// OR the script will use the closest built-in equivalent.

var PRESETS = {
    // ─── INSTAGRAM ───
    "Instagram Story": {
        description: "1080×1920 | H.264 | 9:16 vertical | Max 60s",
        width: 1080,
        height: 1920,
        fps: 30,
        quality: "Best",
        codec: "H.264",
        outputModule: "H.264 - Match Render Settings - 15 Mbps",
        fileExtension: ".mp4",
        maxDuration: 60,
        notes: "Keep under 60s. Use 15Mbps+ for quality."
    },
    "Instagram Reels": {
        description: "1080×1920 | H.264 | 9:16 vertical | Max 90s",
        width: 1080,
        height: 1920,
        fps: 30,
        quality: "Best",
        codec: "H.264",
        outputModule: "H.264 - Match Render Settings - 15 Mbps",
        fileExtension: ".mp4",
        maxDuration: 90,
        notes: "Optimal for Reels algorithm. First 3s are critical."
    },
    "Instagram Feed": {
        description: "1080×1080 | H.264 | 1:1 square | Max 60s",
        width: 1080,
        height: 1080,
        fps: 30,
        quality: "Best",
        codec: "H.264",
        outputModule: "H.264 - Match Render Settings - 15 Mbps",
        fileExtension: ".mp4",
        maxDuration: 60,
        notes: "Square format. Also works 1080×1350 (4:5) for more screen space."
    },

    // ─── YOUTUBE ───
    "YouTube 1080p": {
        description: "1920×1080 | H.264 | 16:9 | High bitrate",
        width: 1920,
        height: 1080,
        fps: 30,
        quality: "Best",
        codec: "H.264",
        outputModule: "H.264 - Match Render Settings - 40 Mbps",
        fileExtension: ".mp4",
        maxDuration: null,
        notes: "YouTube re-encodes everything. Upload at 40Mbps+ for best quality after compression."
    },
    "YouTube 4K": {
        description: "3840×2160 | H.264 | 16:9 | Maximum quality",
        width: 3840,
        height: 2160,
        fps: 30,
        quality: "Best",
        codec: "H.264",
        outputModule: "H.264 - Match Render Settings - 80 Mbps",
        fileExtension: ".mp4",
        maxDuration: null,
        notes: "4K upload gets VP9 codec on YouTube = better quality even for 1080p viewers."
    },
    "YouTube Shorts": {
        description: "1080×1920 | H.264 | 9:16 | Max 60s",
        width: 1080,
        height: 1920,
        fps: 30,
        quality: "Best",
        codec: "H.264",
        outputModule: "H.264 - Match Render Settings - 15 Mbps",
        fileExtension: ".mp4",
        maxDuration: 60,
        notes: "Must be under 60s to qualify as a Short."
    },

    // ─── LINKEDIN ───
    "LinkedIn Feed": {
        description: "1920×1080 | H.264 | 16:9 | Max 10min",
        width: 1920,
        height: 1080,
        fps: 30,
        quality: "Best",
        codec: "H.264",
        outputModule: "H.264 - Match Render Settings - 20 Mbps",
        fileExtension: ".mp4",
        maxDuration: 600,
        notes: "LinkedIn compresses heavily. Keep under 200MB. Add captions!"
    },
    "LinkedIn Square": {
        description: "1080×1080 | H.264 | 1:1 | Max 10min",
        width: 1080,
        height: 1080,
        fps: 30,
        quality: "Best",
        codec: "H.264",
        outputModule: "H.264 - Match Render Settings - 15 Mbps",
        fileExtension: ".mp4",
        maxDuration: 600,
        notes: "Square takes more feed space on LinkedIn mobile."
    },

    // ─── TWITTER/X ───
    "Twitter/X": {
        description: "1920×1080 | H.264 | 16:9 | Max 140s",
        width: 1920,
        height: 1080,
        fps: 30,
        quality: "Best",
        codec: "H.264",
        outputModule: "H.264 - Match Render Settings - 25 Mbps",
        fileExtension: ".mp4",
        maxDuration: 140,
        notes: "Max 512MB file size. Twitter compresses aggressively — upload high quality."
    },

    // ─── TIKTOK ───
    "TikTok": {
        description: "1080×1920 | H.264 | 9:16 | Max 10min",
        width: 1080,
        height: 1920,
        fps: 30,
        quality: "Best",
        codec: "H.264",
        outputModule: "H.264 - Match Render Settings - 15 Mbps",
        fileExtension: ".mp4",
        maxDuration: 600,
        notes: "Keep 15-60s for best algorithm performance. Max file 287.6MB."
    },

    // ─── FACEBOOK ───
    "Facebook Feed": {
        description: "1920×1080 | H.264 | 16:9 | High quality",
        width: 1920,
        height: 1080,
        fps: 30,
        quality: "Best",
        codec: "H.264",
        outputModule: "H.264 - Match Render Settings - 25 Mbps",
        fileExtension: ".mp4",
        maxDuration: null,
        notes: "Facebook supports up to 240min but compresses hard. Keep under 1GB."
    },

    // ─── MASTER/INTERNAL ───
    "Bybit Internal Master": {
        description: "1920×1080 | ProRes 422 HQ | 16:9 | Archive quality",
        width: 1920,
        height: 1080,
        fps: 30,
        quality: "Best",
        codec: "ProRes 422 HQ",
        outputModule: "Apple ProRes 422 HQ",
        fileExtension: ".mov",
        maxDuration: null,
        notes: "Internal distribution & archive. Large files — use for master copies."
    },
    "ProRes 4444 Master": {
        description: "Match comp | ProRes 4444 | Preserves alpha | Master",
        width: null,  // null = match comp
        height: null,
        fps: null,
        quality: "Best",
        codec: "ProRes 4444",
        outputModule: "Apple ProRes 4444",
        fileExtension: ".mov",
        maxDuration: null,
        notes: "Highest quality with alpha channel. Use for assets that need compositing."
    },

    // ─── GIF ───
    "GIF Preview": {
        description: "480px wide | Animated GIF | Quick preview",
        width: 480,
        height: null,  // auto-calculate from aspect ratio
        fps: 15,
        quality: "Best",
        codec: "Animated GIF",
        outputModule: "Animated GIF",
        fileExtension: ".gif",
        maxDuration: 15,
        notes: "Low-res preview for Slack/email. Keep under 10s for reasonable file size."
    }
};

// ─── UI PANEL ────────────────────────────────────────────────

function buildUI(thisObj) {
    var win = (thisObj instanceof Panel)
        ? thisObj
        : new Window("palette", "Smart Render Queue Manager", undefined, { resizeable: true });

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 8;
    win.margins = 12;

    // ─── Header
    var headerGroup = win.add("group");
    headerGroup.alignment = ["fill", "top"];
    var title = headerGroup.add("statictext", undefined, "🎬 Smart Render Queue Manager");
    title.alignment = ["center", "center"];

    // ─── Preset Selection
    var presetPanel = win.add("panel", undefined, "Platform Preset");
    presetPanel.alignChildren = ["fill", "top"];
    presetPanel.margins = 10;

    var presetNames = [];
    for (var key in PRESETS) {
        if (PRESETS.hasOwnProperty(key)) {
            presetNames.push(key);
        }
    }

    var presetDropdown = presetPanel.add("dropdownlist", undefined, presetNames);
    presetDropdown.selection = 0;

    var descText = presetPanel.add("statictext", undefined, "", { multiline: true });
    descText.preferredSize = [320, 40];

    var notesText = presetPanel.add("statictext", undefined, "", { multiline: true });
    notesText.preferredSize = [320, 30];

    // Update description on selection change
    function updateDescription() {
        var selected = presetDropdown.selection.text;
        var preset = PRESETS[selected];
        descText.text = preset.description;
        notesText.text = "💡 " + preset.notes;
    }
    presetDropdown.onChange = updateDescription;
    updateDescription();

    // ─── Options
    var optPanel = win.add("panel", undefined, "Options");
    optPanel.alignChildren = ["fill", "top"];
    optPanel.margins = 10;

    // Output path
    var pathGroup = optPanel.add("group");
    pathGroup.add("statictext", undefined, "Output:");
    var pathInput = pathGroup.add("edittext", undefined, "~/Desktop/Renders/");
    pathInput.preferredSize = [200, 25];
    var browseBtn = pathGroup.add("button", undefined, "Browse");

    browseBtn.onClick = function () {
        var folder = Folder.selectDialog("Select output folder");
        if (folder) pathInput.text = folder.fsName + "/";
    };

    // Filename pattern
    var nameGroup = optPanel.add("group");
    nameGroup.add("statictext", undefined, "Naming:");
    var nameInput = nameGroup.add("edittext", undefined, "{comp}_{preset}_{date}");
    nameInput.preferredSize = [200, 25];

    var nameHelp = optPanel.add("statictext", undefined, "  Tokens: {comp} {preset} {date} {time} {lang}");
    nameHelp.graphics.font = ScriptUI.newFont(nameHelp.graphics.font.name, "REGULAR", 10);

    // Duration warning checkbox
    var warnCheck = optPanel.add("checkbox", undefined, "Warn if comp exceeds platform max duration");
    warnCheck.value = true;

    // ─── Action Buttons
    var btnGroup = win.add("group");
    btnGroup.alignment = ["center", "top"];

    var addBtn = btnGroup.add("button", undefined, "Add to Render Queue");
    addBtn.preferredSize = [150, 35];

    var addAllBtn = btnGroup.add("button", undefined, "Add All Selected");
    addAllBtn.preferredSize = [150, 35];

    // ─── Status
    var statusText = win.add("statictext", undefined, "Ready. Select comps and choose a preset.");
    statusText.alignment = ["fill", "bottom"];

    // ─── BUTTON HANDLERS ─────────────────────────────────────

    addBtn.onClick = function () {
        var presetName = presetDropdown.selection.text;
        var preset = PRESETS[presetName];
        var outputPath = pathInput.text;
        var namePattern = nameInput.text;

        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("No active composition selected.\nPlease select a comp in the timeline or project panel.");
            return;
        }

        processComp(comp, preset, presetName, outputPath, namePattern, warnCheck.value);
        statusText.text = "✓ Added '" + comp.name + "' with " + presetName + " preset.";
    };

    addAllBtn.onClick = function () {
        var presetName = presetDropdown.selection.text;
        var preset = PRESETS[presetName];
        var outputPath = pathInput.text;
        var namePattern = nameInput.text;

        var selectedItems = app.project.selection;
        var compCount = 0;

        for (var i = 0; i < selectedItems.length; i++) {
            if (selectedItems[i] instanceof CompItem) {
                processComp(selectedItems[i], preset, presetName, outputPath, namePattern, warnCheck.value);
                compCount++;
            }
        }

        if (compCount === 0) {
            alert("No compositions selected.\nSelect one or more comps in the project panel.");
        } else {
            statusText.text = "✓ Added " + compCount + " comp(s) with " + presetName + " preset.";
        }
    };

    // Show window
    if (win instanceof Window) {
        win.center();
        win.show();
    } else {
        win.layout.layout(true);
    }

    return win;
}

// ─── CORE RENDER LOGIC ──────────────────────────────────────

function processComp(comp, preset, presetName, outputPath, namePattern, warnDuration) {
    // Duration check
    if (warnDuration && preset.maxDuration && comp.duration > preset.maxDuration) {
        var proceed = confirm(
            "⚠️ Duration Warning\n\n" +
            "Comp '" + comp.name + "' is " + Math.round(comp.duration) + "s long.\n" +
            presetName + " max is " + preset.maxDuration + "s.\n\n" +
            "The platform may reject or trim this video.\n" +
            "Add to render queue anyway?"
        );
        if (!proceed) return;
    }

    app.beginUndoGroup("Smart Render - " + presetName);

    // Add to render queue
    var rqItem = app.project.renderQueue.items.add(comp);

    // ─── Apply Render Settings
    // Use "Best Settings" as base, then customize
    rqItem.applyTemplate("Best Settings");

    // ─── Apply Output Module Settings
    var outputModule = rqItem.outputModule(1);

    // Try to apply the template; fall back to closest match
    try {
        outputModule.applyTemplate(preset.outputModule);
    } catch (e) {
        // Template doesn't exist — try common fallbacks
        $.writeln("[SmartRender] Template '" + preset.outputModule + "' not found. Using fallback.");

        var fallbacks = [
            "H.264 - Match Render Settings - 15 Mbps",
            "H.264",
            "Lossless",
            "Best Settings"
        ];

        if (preset.codec.indexOf("ProRes") >= 0) {
            fallbacks = ["Apple ProRes 422 HQ", "Apple ProRes 422", "Lossless"];
        }

        var applied = false;
        for (var f = 0; f < fallbacks.length; f++) {
            try {
                outputModule.applyTemplate(fallbacks[f]);
                $.writeln("[SmartRender] Applied fallback template: " + fallbacks[f]);
                applied = true;
                break;
            } catch (e2) {
                continue;
            }
        }

        if (!applied) {
            $.writeln("[SmartRender] WARNING: Could not apply any output template.");
        }
    }

    // ─── Set Output File Path
    var fileName = namePattern
        .replace("{comp}", comp.name)
        .replace("{preset}", presetName.replace(/[\/\\:*?"<>|]/g, "_"))
        .replace("{date}", getDateString())
        .replace("{time}", getTimeString())
        .replace("{lang}", "");

    // Clean filename
    fileName = fileName.replace(/[\/\\:*?"<>|]/g, "_");

    var outputFolder = new Folder(outputPath);
    if (!outputFolder.exists) outputFolder.create();

    var fullPath = outputPath + fileName + preset.fileExtension;
    outputModule.file = new File(fullPath);

    app.endUndoGroup();

    $.writeln("[SmartRender] Queued: " + comp.name + " → " + fullPath);
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────

function getDateString() {
    var d = new Date();
    return d.getFullYear() + "-" +
        padZero(d.getMonth() + 1) + "-" +
        padZero(d.getDate());
}

function getTimeString() {
    var d = new Date();
    return padZero(d.getHours()) +
        padZero(d.getMinutes());
}

function padZero(n) {
    return (n < 10 ? "0" : "") + n;
}

// ─── LAUNCH ──────────────────────────────────────────────────
buildUI(this);
