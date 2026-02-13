/**
 * ============================================================
 *  BATCH ASSET REPLACER FOR AFTER EFFECTS  v2.1
 *  Single CSV · Unlimited depth · Clean folder output
 * ============================================================
 *
 *  YOUR SETUP (any depth of nesting):
 *
 *    Main_Comp
 *      └── [Sub_Comp_A]
 *              └── [Sub_Comp_B]
 *                      ├── Headline (text)
 *                      ├── Subheadline (text)
 *                      └── CTA_Button (text)
 *
 *  CSV FORMAT:
 *    comp_name,layer_name,type,en-US,zh-TW,ja-JP,...
 *    Main_Comp,Headline,text,Welcome,歡迎,...
 *    Main_Comp,Subheadline,text,Trade Now,立即交易,...
 *
 *  OUTPUT (clean folders):
 *    Localized_Versions/
 *      EN-US/
 *        Main_Comp_en_us          ← only the main comp here
 *      ZH-TW/
 *        Main_Comp_zh_tw
 *      ...
 *      _PRECOMPS/                 ← sub-comps hidden here
 *        Sub_Comp_A_en_us
 *        Sub_Comp_B_en_us
 *        Sub_Comp_A_zh_tw
 *        Sub_Comp_B_zh_tw
 *        ...
 *
 *  Author: Gelvan Neo | Bybit Livestream & Video
 *  Version: 2.1
 */

// ─── CONFIGURATION ──────────────────────────────────────────
var CONFIG = {
    reservedColumns: ["comp_name", "layer_name", "type"],
    outputFolderName: "Localized_Versions",
    precompFolderName: "_PRECOMPS",
    verbose: true
};

// ─── UTILITIES ──────────────────────────────────────────────

function log(msg) {
    if (CONFIG.verbose) $.writeln("[BatchReplacer] " + msg);
}

function trim(str) {
    return str.replace(/^\s+|\s+$/g, "");
}

// ─── CSV PARSING ────────────────────────────────────────────

function parseCSVLine(line) {
    var result = [];
    var current = "";
    var inQuotes = false;

    for (var i = 0; i < line.length; i++) {
        var ch = line.charAt(i);
        if (ch === '"') {
            if (inQuotes && i + 1 < line.length && line.charAt(i + 1) === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = "";
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

function parseCSV(csvString) {
    var lines = csvString.split(/\r?\n/);
    var headers = parseCSVLine(lines[0]);
    for (var h = 0; h < headers.length; h++) headers[h] = trim(headers[h]);

    var rows = [];
    for (var i = 1; i < lines.length; i++) {
        var line = trim(lines[i]);
        if (line === "") continue;
        var values = parseCSVLine(line);
        var row = {};
        for (var j = 0; j < headers.length; j++) {
            row[headers[j]] = (j < values.length) ? trim(values[j]) : "";
        }
        rows.push(row);
    }

    return { headers: headers, rows: rows };
}

function detectLanguages(headers) {
    var langs = [];
    for (var i = 0; i < headers.length; i++) {
        var h = headers[i].toLowerCase();
        var isReserved = false;
        for (var r = 0; r < CONFIG.reservedColumns.length; r++) {
            if (h === CONFIG.reservedColumns[r]) { isReserved = true; break; }
        }
        if (!isReserved && headers[i] !== "") langs.push(headers[i]);
    }
    return langs;
}

// ─── PROJECT HELPERS ────────────────────────────────────────

function findComp(name) {
    for (var i = 1; i <= app.project.numItems; i++) {
        if (app.project.item(i) instanceof CompItem && app.project.item(i).name === name)
            return app.project.item(i);
    }
    return null;
}

function findOrCreateFolder(name, parent) {
    var searchIn = parent || app.project.rootFolder;
    for (var i = 1; i <= searchIn.numItems; i++) {
        if (searchIn.item(i) instanceof FolderItem && searchIn.item(i).name === name)
            return searchIn.item(i);
    }
    var folder = app.project.items.addFolder(name);
    if (parent) folder.parentFolder = parent;
    return folder;
}

// ─── DEEP LAYER SEARCH ─────────────────────────────────────

function findLayerDeep(comp, layerName) {
    for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);
        if (layer.name === layerName) {
            return { layer: layer, comp: comp };
        }
    }

    for (var j = 1; j <= comp.numLayers; j++) {
        var layer2 = comp.layer(j);
        if (layer2.source && layer2.source instanceof CompItem) {
            var result = findLayerDeep(layer2.source, layerName);
            if (result) return result;
        }
    }

    return null;
}

// ─── COMP TREE DISCOVERY ────────────────────────────────────

function discoverAllSubComps(comp, collected) {
    if (!collected) collected = [];

    for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);
        if (layer.source && layer.source instanceof CompItem) {
            var subComp = layer.source;

            var alreadyFound = false;
            for (var c = 0; c < collected.length; c++) {
                if (collected[c] === subComp) { alreadyFound = true; break; }
            }

            if (!alreadyFound) {
                collected.push(subComp);
                discoverAllSubComps(subComp, collected);
            }
        }
    }

    return collected;
}

// ─── REPLACEMENT ────────────────────────────────────────────

function replaceText(layer, newText) {
    if (!(layer instanceof TextLayer)) {
        log("  WARNING: '" + layer.name + "' is not a text layer.");
        return false;
    }
    var textProp = layer.property("Source Text");
    var textDoc = textProp.value;
    textDoc.text = newText;
    textProp.setValue(textDoc);
    log("  ✓ Text → '" + newText.substring(0, 50) + (newText.length > 50 ? "..." : "") + "'");
    return true;
}

function replaceFootage(layer, filePath) {
    var file = new File(filePath);
    if (!file.exists) { log("  WARNING: File not found: " + filePath); return false; }
    try {
        var newFootage = app.project.importFile(new ImportOptions(file));
        layer.replaceSource(newFootage, false);
        log("  ✓ Footage → " + filePath);
        return true;
    } catch (e) { log("  ERROR: " + e.toString()); return false; }
}

// ─── DUPLICATION ENGINE ─────────────────────────────────────
//
// Duplicates all sub-comps (into _PRECOMPS folder) and the
// master comp (into the language folder). Relinks everything.
// Only the master comp appears in the clean language folder.

function duplicateFullTree(masterComp, langSuffix, langFolder, precompFolder) {
    var dupeMap = {};

    // 1. Discover all sub-comps
    var allSubComps = discoverAllSubComps(masterComp);
    log("  Found " + allSubComps.length + " sub-comp(s) in tree");

    // 2. Topological sort: bottom-up (deepest first)
    var processed = {};
    var sortedComps = [];
    var maxIterations = allSubComps.length * allSubComps.length + 1;
    var iterations = 0;

    while (sortedComps.length < allSubComps.length && iterations < maxIterations) {
        iterations++;
        for (var i = 0; i < allSubComps.length; i++) {
            var sc = allSubComps[i];
            if (processed[sc.name]) continue;

            var allChildrenDone = true;
            for (var l = 1; l <= sc.numLayers; l++) {
                var src = sc.layer(l).source;
                if (src && src instanceof CompItem) {
                    var isInTree = false;
                    for (var t = 0; t < allSubComps.length; t++) {
                        if (allSubComps[t] === src) { isInTree = true; break; }
                    }
                    if (isInTree && !processed[src.name]) {
                        allChildrenDone = false;
                        break;
                    }
                }
            }

            if (allChildrenDone) {
                sortedComps.push(sc);
                processed[sc.name] = true;
            }
        }
    }

    // 3. Duplicate sub-comps → _PRECOMPS folder (hidden)
    for (var d = 0; d < sortedComps.length; d++) {
        var original = sortedComps[d];
        var dupe = original.duplicate();
        dupe.name = original.name + "_" + langSuffix;
        dupe.parentFolder = precompFolder;  // ← hidden in _PRECOMPS
        dupeMap[original.name] = dupe;

        // Relink children inside this dupe
        for (var rl = 1; rl <= dupe.numLayers; rl++) {
            var rlSrc = dupe.layer(rl).source;
            if (rlSrc && rlSrc instanceof CompItem && dupeMap[rlSrc.name]) {
                dupe.layer(rl).replaceSource(dupeMap[rlSrc.name], false);
            }
        }
    }

    // 4. Duplicate master comp → language folder (visible)
    var newMaster = masterComp.duplicate();
    newMaster.name = masterComp.name + "_" + langSuffix;
    newMaster.parentFolder = langFolder;  // ← clean language folder
    dupeMap[masterComp.name] = newMaster;

    // 5. Relink sub-comps in master
    for (var ml = 1; ml <= newMaster.numLayers; ml++) {
        var mlSrc = newMaster.layer(ml).source;
        if (mlSrc && mlSrc instanceof CompItem && dupeMap[mlSrc.name]) {
            newMaster.layer(ml).replaceSource(dupeMap[mlSrc.name], false);
        }
    }

    return dupeMap;
}

// ─── MAIN ───────────────────────────────────────────────────

function main() {
    if (!app.project) { alert("No After Effects project is open."); return; }

    var csvFile = File.openDialog("Select CSV file for batch replacement", "CSV Files:*.csv,All Files:*.*");
    if (!csvFile) return;

    csvFile.open("r");
    var csvContent = csvFile.read();
    csvFile.close();

    var data = parseCSV(csvContent);
    var languages = detectLanguages(data.headers);

    log("Rows: " + data.rows.length + " | Languages: " + languages.join(", "));

    if (languages.length === 0) {
        alert("No language columns found.\nExpected headers beyond: " + CONFIG.reservedColumns.join(", "));
        return;
    }

    // Collect unique master comp names
    var masterCompNames = {};
    for (var i = 0; i < data.rows.length; i++) {
        masterCompNames[data.rows[i]["comp_name"]] = true;
    }

    var masterList = [];
    for (var name in masterCompNames) {
        if (masterCompNames.hasOwnProperty(name)) masterList.push(name);
    }

    // Validate and discover
    var compInfo = {};
    var totalSubComps = 0;
    for (var ci = 0; ci < masterList.length; ci++) {
        var comp = findComp(masterList[ci]);
        if (!comp) {
            alert("Comp '" + masterList[ci] + "' not found in project.\nCheck the comp_name column in your CSV.");
            return;
        }
        var subComps = discoverAllSubComps(comp);
        compInfo[masterList[ci]] = { comp: comp, subComps: subComps };
        totalSubComps += subComps.length;
    }

    // Pre-check layer names
    var layerCheck = [];
    for (var lc = 0; lc < data.rows.length; lc++) {
        var checkRow = data.rows[lc];
        var checkComp = compInfo[checkRow["comp_name"]].comp;
        var found = findLayerDeep(checkComp, checkRow["layer_name"]);
        if (!found) {
            layerCheck.push("'" + checkRow["layer_name"] + "' not found in '" + checkRow["comp_name"] + "' tree");
        }
    }

    // Confirmation
    var msg = "Batch Asset Replacer v2.1\n\n";
    msg += "Rows: " + data.rows.length + "\n";
    msg += "Languages: " + languages.join(", ") + " (" + languages.length + ")\n\n";
    msg += "Master comps: " + masterList.join(", ") + "\n";
    msg += "Sub-comps discovered: " + totalSubComps + "\n";

    if (totalSubComps > 0) {
        msg += "\n✓ Sub-comps duplicated behind the scenes\n";
        msg += "  Only master comps appear in language folders\n";
        msg += "  Sub-comps stored in '" + CONFIG.precompFolderName + "' folder\n";
    }

    if (layerCheck.length > 0) {
        msg += "\n⚠ WARNING — Layers not found:\n";
        for (var w = 0; w < Math.min(layerCheck.length, 5); w++) {
            msg += "  • " + layerCheck[w] + "\n";
        }
        if (layerCheck.length > 5) msg += "  ... and " + (layerCheck.length - 5) + " more\n";
    }

    var totalNewComps = 0;
    for (var tc = 0; tc < masterList.length; tc++) {
        totalNewComps += (1 + compInfo[masterList[tc]].subComps.length) * languages.length;
    }
    msg += "\nWill create " + totalNewComps + " comps total.";
    msg += "\n(" + (masterList.length * languages.length) + " in language folders + " + (totalSubComps * languages.length) + " in " + CONFIG.precompFolderName + ")";
    msg += "\n\nProceed?";

    if (!confirm(msg)) return;

    // ─── Execute ───
    app.beginUndoGroup("Batch Asset Replacer v2.1");

    var outputFolder = findOrCreateFolder(CONFIG.outputFolderName);
    var precompFolder = findOrCreateFolder(CONFIG.precompFolderName, outputFolder);
    var stats = { success: 0, skipped: 0, errors: 0 };
    var errorLog = [];

    for (var li = 0; li < languages.length; li++) {
        var lang = languages[li];
        var langSuffix = lang.toLowerCase().replace(/[^a-z0-9]/g, "_");
        var langLabel = lang.toUpperCase().replace(/[^A-Z0-9\-]/g, "_");

        log("\n═══ " + lang + " ═══");

        var langFolder = findOrCreateFolder(langLabel, outputFolder);

        // Duplicate trees
        var allDupes = {};
        for (var m = 0; m < masterList.length; m++) {
            var mComp = compInfo[masterList[m]].comp;
            var dupeMap = duplicateFullTree(mComp, langSuffix, langFolder, precompFolder);
            for (var key in dupeMap) {
                if (dupeMap.hasOwnProperty(key)) allDupes[key] = dupeMap[key];
            }
        }

        // Apply replacements via deep search on duplicated tree
        for (var r = 0; r < data.rows.length; r++) {
            var row = data.rows[r];
            var compName = row["comp_name"];
            var layerName = row["layer_name"];
            var type = (row["type"] || "text").toLowerCase();
            var value = row[lang];

            if (!value || value === "") { stats.skipped++; continue; }

            var dupeMaster = allDupes[compName];
            if (!dupeMaster) {
                log("  ERROR: No duped comp for '" + compName + "'");
                if (errorLog.length < 20) errorLog.push("[" + lang + "] Comp not found: '" + compName + "'");
                stats.errors++; continue;
            }

            // Deep search — finds the layer even 3 sub-comps deep
            var foundResult = findLayerDeep(dupeMaster, layerName);
            if (!foundResult) {
                log("  ERROR: Layer '" + layerName + "' not found in '" + dupeMaster.name + "' tree");
                if (errorLog.length < 20) errorLog.push("[" + lang + "] Layer '" + layerName + "' not found in tree");
                stats.errors++; continue;
            }

            log("  [" + foundResult.comp.name + "] " + layerName);

            var ok = false;
            if (type === "footage" || type === "image") ok = replaceFootage(foundResult.layer, value);
            else ok = replaceText(foundResult.layer, value);

            if (ok) stats.success++;
            else {
                if (errorLog.length < 20) errorLog.push("[" + lang + "] Failed: '" + layerName + "' in '" + foundResult.comp.name + "' (" + type + ")");
                stats.errors++;
            }
        }
    }

    app.endUndoGroup();

    // ─── Summary ───
    var summary = "✓ Complete!\n\n";
    summary += "Languages: " + languages.length + "\n";
    summary += "Successful: " + stats.success + "\n";
    summary += "Skipped: " + stats.skipped + "\n";
    summary += "Errors: " + stats.errors + "\n";

    if (errorLog.length > 0) {
        summary += "\n── Error Details ──\n";
        for (var e = 0; e < errorLog.length; e++) {
            summary += errorLog[e] + "\n";
        }
        if (stats.errors > errorLog.length) {
            summary += "... and " + (stats.errors - errorLog.length) + " more\n";
        }
    }

    summary += "\nCheck '" + CONFIG.outputFolderName + "' folder.";
    alert(summary);
}

main();
