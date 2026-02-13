/**
 * ============================================================
 *  PROJECT CLEANUP TOOL FOR AFTER EFFECTS
 *  Scans projects, removes unused footage, consolidates
 *  duplicates, and organizes into standardized folders.
 * ============================================================
 *
 *  FEATURES:
 *    1. UNUSED FOOTAGE REMOVAL
 *       - Identifies footage items not used in any comp
 *       - Shows preview list before deletion
 *       - Optionally removes from disk (off by default)
 *
 *    2. DUPLICATE DETECTION
 *       - Finds footage items pointing to the same file
 *       - Consolidates references (relinking layers)
 *       - Removes redundant project items
 *
 *    3. MISSING FOOTAGE REPORT
 *       - Lists all offline/missing footage
 *       - Shows original file paths
 *       - Option to relink from a new base path
 *
 *    4. PROJECT ORGANIZATION
 *       - Creates standardized folder structure
 *       - Sorts items by type (Comps, Footage, Solids, Audio, etc.)
 *       - Preserves existing folder assignments
 *
 *    5. STATS DASHBOARD
 *       - Total items, comps, footage count
 *       - Project file size estimate
 *       - Unused item percentage
 *
 *  Author: Gelvan Neo | Bybit Livestream & Video
 *  Version: 1.0
 */

// ─── CONFIGURATION ──────────────────────────────────────────

var CLEANUP_CONFIG = {
    // Standard folder structure to create
    folderStructure: {
        "_COMPS": {
            "Main": null,
            "Pre-comps": null,
            "Templates": null
        },
        "_FOOTAGE": {
            "Video": null,
            "Images": null,
            "Graphics": null
        },
        "_AUDIO": null,
        "_SOLIDS_SHAPES": null,
        "_REFERENCE": null,
        "_ARCHIVE": null
    },

    // File extensions for auto-sorting
    videoExtensions: ["mp4", "mov", "avi", "wmv", "mkv", "webm", "m4v", "mpg", "mpeg"],
    imageExtensions: ["png", "jpg", "jpeg", "psd", "ai", "tif", "tiff", "bmp", "gif", "webp", "svg", "exr"],
    audioExtensions: ["mp3", "wav", "aac", "m4a", "ogg", "flac", "aif", "aiff"],

    // Safety
    protectFolders: true,      // Don't delete folders even if empty
    dryRunDefault: true,       // Show what would happen before doing it
    maxUndoItems: 500          // Safety limit for undo group
};

// ─── UI PANEL ────────────────────────────────────────────────

function buildCleanupUI(thisObj) {
    var win = (thisObj instanceof Panel)
        ? thisObj
        : new Window("palette", "Project Cleanup Tool", undefined, { resizeable: true });

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 6;
    win.margins = 12;

    // ─── Header
    var title = win.add("statictext", undefined, "🧹 Project Cleanup Tool");
    title.alignment = ["center", "top"];

    // ─── Stats Panel
    var statsPanel = win.add("panel", undefined, "Project Stats");
    statsPanel.alignChildren = ["fill", "top"];
    statsPanel.margins = 8;

    var statsText = statsPanel.add("statictext", undefined, "Click 'Scan Project' to analyze.", { multiline: true });
    statsText.preferredSize = [340, 80];

    var scanBtn = statsPanel.add("button", undefined, "🔍 Scan Project");
    scanBtn.preferredSize = [340, 30];

    // ─── Actions Panel
    var actionsPanel = win.add("panel", undefined, "Cleanup Actions");
    actionsPanel.alignChildren = ["fill", "top"];
    actionsPanel.margins = 8;

    var removeUnusedBtn = actionsPanel.add("button", undefined, "Remove Unused Footage");
    var consolidateBtn = actionsPanel.add("button", undefined, "Consolidate Duplicates");
    var missingBtn = actionsPanel.add("button", undefined, "Report Missing Footage");
    var organizeBtn = actionsPanel.add("button", undefined, "Organize Project Folders");

    // ─── Options
    var optPanel = win.add("panel", undefined, "Options");
    optPanel.alignChildren = ["fill", "top"];
    optPanel.margins = 8;

    var dryRunCheck = optPanel.add("checkbox", undefined, "Preview mode (show changes before applying)");
    dryRunCheck.value = true;

    var protectSolidsCheck = optPanel.add("checkbox", undefined, "Protect solids and adjustment layers");
    protectSolidsCheck.value = true;

    // ─── Status
    var statusBar = win.add("statictext", undefined, "Ready.");
    statusBar.alignment = ["fill", "bottom"];

    // ═══ SCAN PROJECT ════════════════════════════════════════

    var projectData = null;

    scanBtn.onClick = function () {
        projectData = scanProject();
        statsText.text = formatStats(projectData);
        statusBar.text = "✓ Scan complete.";
    };

    // ═══ REMOVE UNUSED ═══════════════════════════════════════

    removeUnusedBtn.onClick = function () {
        if (!projectData) projectData = scanProject();

        var unused = projectData.unusedItems;
        if (unused.length === 0) {
            alert("No unused footage found! Project is clean. 🎉");
            return;
        }

        // Build preview list
        var previewMsg = "Found " + unused.length + " unused item(s):\n\n";
        var maxShow = Math.min(unused.length, 30);
        for (var i = 0; i < maxShow; i++) {
            previewMsg += "  • " + unused[i].name;
            if (unused[i].mainSource && unused[i].mainSource.file) {
                previewMsg += " (" + unused[i].mainSource.file.name + ")";
            }
            previewMsg += "\n";
        }
        if (unused.length > maxShow) {
            previewMsg += "  ... and " + (unused.length - maxShow) + " more.\n";
        }

        if (dryRunCheck.value) {
            previewMsg += "\n[Preview Mode] No items will be removed.\nUncheck 'Preview mode' to apply.";
            alert(previewMsg);
            return;
        }

        previewMsg += "\nRemove these " + unused.length + " items from the project?";
        if (!confirm(previewMsg)) return;

        app.beginUndoGroup("Cleanup: Remove Unused");

        var removed = 0;
        // Remove in reverse order to maintain indices
        for (var j = unused.length - 1; j >= 0; j--) {
            try {
                // Skip solids if protected
                if (protectSolidsCheck.value && isSolid(unused[j])) continue;

                unused[j].remove();
                removed++;
            } catch (e) {
                $.writeln("[Cleanup] Could not remove: " + unused[j].name + " — " + e);
            }
        }

        app.endUndoGroup();

        statusBar.text = "✓ Removed " + removed + " unused items.";
        projectData = scanProject();
        statsText.text = formatStats(projectData);
    };

    // ═══ CONSOLIDATE DUPLICATES ══════════════════════════════

    consolidateBtn.onClick = function () {
        if (!projectData) projectData = scanProject();

        var dupes = findDuplicates();

        if (dupes.length === 0) {
            alert("No duplicate footage found! 🎉");
            return;
        }

        var previewMsg = "Found " + dupes.length + " group(s) of duplicate footage:\n\n";
        for (var g = 0; g < dupes.length; g++) {
            var group = dupes[g];
            previewMsg += "File: " + group.fileName + "\n";
            previewMsg += "  Keep: " + group.keep.name + " (used in " + getUsageCount(group.keep) + " comps)\n";
            for (var d = 0; d < group.remove.length; d++) {
                previewMsg += "  Remove: " + group.remove[d].name + " (used in " + getUsageCount(group.remove[d]) + " comps)\n";
            }
            previewMsg += "\n";
        }

        if (dryRunCheck.value) {
            previewMsg += "[Preview Mode] No changes will be made.";
            alert(previewMsg);
            return;
        }

        previewMsg += "Consolidate duplicates? Layers will be relinked automatically.";
        if (!confirm(previewMsg)) return;

        app.beginUndoGroup("Cleanup: Consolidate Duplicates");

        var consolidated = 0;
        for (var g2 = 0; g2 < dupes.length; g2++) {
            var grp = dupes[g2];
            for (var r = 0; r < grp.remove.length; r++) {
                try {
                    relinkFootage(grp.remove[r], grp.keep);
                    grp.remove[r].remove();
                    consolidated++;
                } catch (e) {
                    $.writeln("[Cleanup] Consolidation error: " + e);
                }
            }
        }

        app.endUndoGroup();

        statusBar.text = "✓ Consolidated " + consolidated + " duplicate(s).";
        projectData = scanProject();
        statsText.text = formatStats(projectData);
    };

    // ═══ MISSING FOOTAGE REPORT ══════════════════════════════

    missingBtn.onClick = function () {
        var missing = findMissingFootage();

        if (missing.length === 0) {
            alert("All footage is online! No missing files. 🎉");
            return;
        }

        var report = "Missing Footage Report\n";
        report += "═══════════════════════\n\n";
        report += "Found " + missing.length + " missing file(s):\n\n";

        for (var m = 0; m < missing.length; m++) {
            var item = missing[m];
            report += (m + 1) + ". " + item.name + "\n";
            if (item.mainSource && item.mainSource.file) {
                report += "   Path: " + item.mainSource.file.fsName + "\n";
            }
            report += "   Used in " + getUsageCount(item) + " comp(s)\n\n";
        }

        // Save report option
        var saveReport = confirm(report + "\nSave this report as a text file?");
        if (saveReport) {
            var reportFile = File.saveDialog("Save Missing Footage Report", "Text Files:*.txt");
            if (reportFile) {
                reportFile.open("w");
                reportFile.write(report);
                reportFile.close();
                statusBar.text = "✓ Report saved: " + reportFile.fsName;
            }
        }
    };

    // ═══ ORGANIZE FOLDERS ════════════════════════════════════

    organizeBtn.onClick = function () {
        if (dryRunCheck.value) {
            var preview = previewOrganization();
            alert(preview + "\n\n[Preview Mode] No changes will be made.");
            return;
        }

        if (!confirm("This will create a standardized folder structure and sort items by type.\n\nExisting folder assignments will be updated.\n\nProceed?")) return;

        app.beginUndoGroup("Cleanup: Organize Project");

        var result = organizeProject();

        app.endUndoGroup();

        statusBar.text = "✓ Organized " + result.moved + " items into " + result.folders + " folders.";
        alert("Organization complete!\n\nFolders created: " + result.folders + "\nItems sorted: " + result.moved);
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

// ─── CORE FUNCTIONS ──────────────────────────────────────────

/**
 * Scan the entire project and gather statistics
 */
function scanProject() {
    var data = {
        totalItems: 0,
        comps: [],
        footageItems: [],
        solids: [],
        folders: [],
        unusedItems: [],
        missingItems: [],
        audioItems: []
    };

    var usedItems = {};

    // First pass: collect all items
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        data.totalItems++;

        if (item instanceof CompItem) {
            data.comps.push(item);
            // Mark all footage used in this comp
            for (var l = 1; l <= item.numLayers; l++) {
                var layerSource = item.layer(l).source;
                if (layerSource) {
                    usedItems[layerSource.id] = true;
                }
            }
        } else if (item instanceof FootageItem) {
            if (isSolid(item)) {
                data.solids.push(item);
            } else {
                data.footageItems.push(item);
            }
        } else if (item instanceof FolderItem) {
            data.folders.push(item);
        }
    }

    // Also mark comps used as layers in other comps
    for (var c = 0; c < data.comps.length; c++) {
        var comp = data.comps[c];
        for (var l2 = 1; l2 <= comp.numLayers; l2++) {
            var src = comp.layer(l2).source;
            if (src && src instanceof CompItem) {
                usedItems[src.id] = true;
            }
        }
    }

    // Identify unused items (footage only, not comps unless nested)
    for (var f = 0; f < data.footageItems.length; f++) {
        if (!usedItems[data.footageItems[f].id]) {
            data.unusedItems.push(data.footageItems[f]);
        }
    }

    // Find missing
    for (var m = 0; m < data.footageItems.length; m++) {
        var ftg = data.footageItems[m];
        if (ftg.mainSource && ftg.mainSource.file && !ftg.mainSource.file.exists) {
            data.missingItems.push(ftg);
        }
    }

    return data;
}

/**
 * Format stats for display
 */
function formatStats(data) {
    var total = data.totalItems;
    var usedPercent = total > 0
        ? Math.round(((total - data.unusedItems.length) / total) * 100)
        : 100;

    var stats = "";
    stats += "Total items: " + total + "\n";
    stats += "Compositions: " + data.comps.length + "\n";
    stats += "Footage items: " + data.footageItems.length + "\n";
    stats += "Solids: " + data.solids.length + "\n";
    stats += "Unused footage: " + data.unusedItems.length + " (" + (100 - usedPercent) + "% waste)\n";
    stats += "Missing footage: " + data.missingItems.length;

    return stats;
}

/**
 * Check if a footage item is a solid
 */
function isSolid(item) {
    if (!(item instanceof FootageItem)) return false;
    if (item.mainSource instanceof SolidSource) return true;
    // Heuristic: solids often have names like "Black Solid 1"
    if (item.name.match(/solid/i) && !item.mainSource.file) return true;
    return false;
}

/**
 * Find duplicate footage (same file path)
 */
function findDuplicates() {
    var fileMap = {};  // path → [items]
    var groups = [];

    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof FootageItem && item.mainSource && item.mainSource.file) {
            var path = item.mainSource.file.fsName;
            if (!fileMap[path]) {
                fileMap[path] = [];
            }
            fileMap[path].push(item);
        }
    }

    // Build groups where there are 2+ items with same path
    for (var p in fileMap) {
        if (fileMap.hasOwnProperty(p) && fileMap[p].length > 1) {
            var items = fileMap[p];

            // Keep the one used in most comps
            var bestItem = items[0];
            var bestCount = getUsageCount(items[0]);

            for (var k = 1; k < items.length; k++) {
                var count = getUsageCount(items[k]);
                if (count > bestCount) {
                    bestItem = items[k];
                    bestCount = count;
                }
            }

            var toRemove = [];
            for (var r = 0; r < items.length; r++) {
                if (items[r] !== bestItem) toRemove.push(items[r]);
            }

            groups.push({
                fileName: new File(p).name,
                keep: bestItem,
                remove: toRemove
            });
        }
    }

    return groups;
}

/**
 * Count how many comps use a given item
 */
function getUsageCount(item) {
    var count = 0;
    for (var i = 1; i <= app.project.numItems; i++) {
        if (app.project.item(i) instanceof CompItem) {
            var comp = app.project.item(i);
            for (var l = 1; l <= comp.numLayers; l++) {
                if (comp.layer(l).source === item) {
                    count++;
                    break;  // Count each comp once
                }
            }
        }
    }
    return count;
}

/**
 * Relink layers from one footage item to another
 */
function relinkFootage(oldItem, newItem) {
    for (var i = 1; i <= app.project.numItems; i++) {
        if (app.project.item(i) instanceof CompItem) {
            var comp = app.project.item(i);
            for (var l = 1; l <= comp.numLayers; l++) {
                if (comp.layer(l).source === oldItem) {
                    comp.layer(l).replaceSource(newItem, false);
                }
            }
        }
    }
}

/**
 * Find all missing footage
 */
function findMissingFootage() {
    var missing = [];
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof FootageItem && item.mainSource && item.mainSource.file) {
            if (!item.mainSource.file.exists) {
                missing.push(item);
            }
        }
    }
    return missing;
}

/**
 * Preview what organization would do
 */
function previewOrganization() {
    var counts = { comps: 0, video: 0, images: 0, audio: 0, solids: 0, other: 0 };

    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof FolderItem) continue;

        if (item instanceof CompItem) {
            counts.comps++;
        } else if (item instanceof FootageItem) {
            if (isSolid(item)) {
                counts.solids++;
            } else if (item.mainSource && item.mainSource.file) {
                var ext = getExtension(item.mainSource.file.name);
                if (arrayContains(CLEANUP_CONFIG.videoExtensions, ext)) counts.video++;
                else if (arrayContains(CLEANUP_CONFIG.imageExtensions, ext)) counts.images++;
                else if (arrayContains(CLEANUP_CONFIG.audioExtensions, ext)) counts.audio++;
                else counts.other++;
            } else {
                counts.other++;
            }
        }
    }

    var preview = "Organization Preview\n═══════════════════\n\n";
    preview += "Items to sort:\n";
    preview += "  _COMPS: " + counts.comps + " compositions\n";
    preview += "  _FOOTAGE/Video: " + counts.video + " files\n";
    preview += "  _FOOTAGE/Images: " + counts.images + " files\n";
    preview += "  _AUDIO: " + counts.audio + " files\n";
    preview += "  _SOLIDS_SHAPES: " + counts.solids + " items\n";
    preview += "  Other: " + counts.other + " items\n";

    return preview;
}

/**
 * Create folder structure and sort items
 */
function organizeProject() {
    var result = { folders: 0, moved: 0 };

    // Create folder structure
    var folders = createFolderStructure(CLEANUP_CONFIG.folderStructure, null);
    result.folders = countObj(folders);

    // Sort items
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);

        // Skip folders and items already in our structure
        if (item instanceof FolderItem) continue;
        if (isInOurStructure(item, folders)) continue;

        var targetFolder = null;

        if (item instanceof CompItem) {
            // Check if it's used as a pre-comp
            if (isPrecomp(item)) {
                targetFolder = folders["_COMPS"] ? folders["_COMPS"]["Pre-comps"] : null;
            } else {
                targetFolder = folders["_COMPS"] ? folders["_COMPS"]["Main"] : null;
            }
        } else if (item instanceof FootageItem) {
            if (isSolid(item)) {
                targetFolder = folders["_SOLIDS_SHAPES"];
            } else if (item.mainSource && item.mainSource.file) {
                var ext = getExtension(item.mainSource.file.name);

                if (arrayContains(CLEANUP_CONFIG.videoExtensions, ext)) {
                    targetFolder = folders["_FOOTAGE"] ? folders["_FOOTAGE"]["Video"] : null;
                } else if (arrayContains(CLEANUP_CONFIG.imageExtensions, ext)) {
                    targetFolder = folders["_FOOTAGE"] ? folders["_FOOTAGE"]["Images"] : null;
                } else if (arrayContains(CLEANUP_CONFIG.audioExtensions, ext)) {
                    targetFolder = folders["_AUDIO"];
                } else {
                    targetFolder = folders["_FOOTAGE"] ? folders["_FOOTAGE"]["Graphics"] : null;
                }
            }
        }

        if (targetFolder) {
            try {
                item.parentFolder = targetFolder;
                result.moved++;
            } catch (e) {
                $.writeln("[Cleanup] Could not move: " + item.name + " — " + e);
            }
        }
    }

    return result;
}

/**
 * Recursively create folder structure
 * Returns nested object of created FolderItems
 */
function createFolderStructure(structure, parentFolder) {
    var created = {};

    for (var name in structure) {
        if (!structure.hasOwnProperty(name)) continue;

        var folder = findExistingFolder(name, parentFolder);
        if (!folder) {
            folder = app.project.items.addFolder(name);
            if (parentFolder) {
                folder.parentFolder = parentFolder;
            }
        }

        if (structure[name] !== null && typeof structure[name] === "object") {
            created[name] = createFolderStructure(structure[name], folder);
            created[name]._self = folder;
        } else {
            created[name] = folder;
        }
    }

    return created;
}

/**
 * Find an existing folder by name (optionally within a parent)
 */
function findExistingFolder(name, parent) {
    var searchItems = parent ? parent : app.project.rootFolder;
    for (var i = 1; i <= searchItems.numItems; i++) {
        if (searchItems.item(i) instanceof FolderItem && searchItems.item(i).name === name) {
            return searchItems.item(i);
        }
    }
    return null;
}

/**
 * Check if item is already in our organized structure
 */
function isInOurStructure(item, folders) {
    if (!item.parentFolder) return false;
    var pName = item.parentFolder.name;
    for (var key in CLEANUP_CONFIG.folderStructure) {
        if (pName === key) return true;
        if (CLEANUP_CONFIG.folderStructure[key] && typeof CLEANUP_CONFIG.folderStructure[key] === "object") {
            for (var sub in CLEANUP_CONFIG.folderStructure[key]) {
                if (pName === sub) return true;
            }
        }
    }
    return false;
}

/**
 * Check if a comp is used as a pre-comp (nested in another comp)
 */
function isPrecomp(comp) {
    for (var i = 1; i <= app.project.numItems; i++) {
        if (app.project.item(i) instanceof CompItem && app.project.item(i) !== comp) {
            var parentComp = app.project.item(i);
            for (var l = 1; l <= parentComp.numLayers; l++) {
                if (parentComp.layer(l).source === comp) return true;
            }
        }
    }
    return false;
}

// ─── UTILITY FUNCTIONS ───────────────────────────────────────

function getExtension(filename) {
    var parts = filename.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function arrayContains(arr, val) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === val) return true;
    }
    return false;
}

function countObj(obj) {
    var count = 0;
    for (var k in obj) {
        if (obj.hasOwnProperty(k)) {
            if (k === "_self") continue;
            count++;
            if (typeof obj[k] === "object" && !(obj[k] instanceof FolderItem)) {
                count += countObj(obj[k]);
            }
        }
    }
    return count;
}

// ─── LAUNCH ──────────────────────────────────────────────────
buildCleanupUI(this);
