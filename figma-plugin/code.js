/**
 * ============================================================
 *  BATCH LOCALIZER — Figma Plugin
 *  Duplicates a selected frame for each language in a CSV
 *  and replaces text layers by matching layer names.
 * ============================================================
 *
 *  CSV FORMAT (same as your AE script):
 *    layer_name,type,en-US,zh-TW,zh-MY,ja-JP,...
 *    Headline,text,Welcome,歡迎,...
 *    Subheadline,text,Trade Now,立即交易,...
 *    Speaker_Name,text,John Smith,約翰·史密斯,...
 *
 *  NOTE: No "comp_name" column needed — Figma uses the selected
 *  frame as the master. Layer names are matched recursively
 *  through all nested frames/groups.
 *
 *  Author: Gelvan Neo | Bybit Livestream & Video
 *  Version: 1.0
 */

// Show the UI panel
figma.showUI(__html__, { width: 380, height: 520 });

// ─── LISTEN FOR MESSAGES FROM UI ────────────────────────────

figma.ui.onmessage = async (msg) => {
  if (msg.type === "run-localization") {
    await runLocalization(msg.rows, msg.languages);
  }
};

// ─── MAIN LOCALIZATION FUNCTION ─────────────────────────────

async function runLocalization(rows, languages) {
  // Validate selection
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({ type: "error", message: "No frame selected. Please select a frame first." });
    return;
  }

  if (selection.length > 1) {
    figma.ui.postMessage({ type: "error", message: "Please select only one frame (your EN master)." });
    return;
  }

  const masterFrame = selection[0];

  if (masterFrame.type !== "FRAME" && masterFrame.type !== "COMPONENT" && masterFrame.type !== "INSTANCE") {
    figma.ui.postMessage({ type: "error", message: "Selected item is not a frame. Please select a frame." });
    return;
  }

  const stats = { languages: languages.length, success: 0, skipped: 0, errors: 0 };
  const errorLog = [];

  // Build a lookup of layer_name → row data for quick matching
  const layerMap = {};
  for (const row of rows) {
    const name = row["layer_name"];
    if (name) {
      layerMap[name] = row;
    }
  }

  // Process each language
  for (let i = 0; i < languages.length; i++) {
    const lang = languages[i];

    // Report progress
    const percent = Math.round(((i + 1) / languages.length) * 90) + 10;
    figma.ui.postMessage({ type: "progress", percent });

    // 1. Duplicate the master frame
    const clone = masterFrame.clone();

    // 2. Position it next to the previous frame (spaced out)
    clone.x = masterFrame.x + (masterFrame.width + 80) * (i + 1);
    clone.y = masterFrame.y;

    // 3. Rename the frame
    clone.name = masterFrame.name + " — " + lang;

    // 4. Find and replace all text layers
    const textNodes = findAllTextNodes(clone);

    for (const textNode of textNodes) {
      const layerName = textNode.name;
      const rowData = layerMap[layerName];

      if (!rowData) {
        // No mapping for this layer — skip silently
        // (not every text layer needs to be in the CSV)
        continue;
      }

      const newValue = rowData[lang];

      if (!newValue || newValue === "") {
        stats.skipped++;
        continue;
      }

      const type = (rowData["type"] || "text").toLowerCase();

      if (type === "text") {
        try {
          // Load all fonts used in this text node
          await loadAllFonts(textNode);

          // Replace the text (preserves formatting)
          textNode.characters = newValue;
          stats.success++;

        } catch (err) {
          const errMsg = `[${lang}] Failed to set text on '${layerName}': ${err.message || err}`;
          if (errorLog.length < 20) errorLog.push(errMsg);
          stats.errors++;
        }

      } else if (type === "image" || type === "footage") {
        // Image replacement is not directly supported via CSV file paths in Figma
        // You'd need to use image URLs or the plugin API's createImageAsync
        const errMsg = `[${lang}] Image replacement not yet supported for '${layerName}'. Use text type only.`;
        if (errorLog.length < 20) errorLog.push(errMsg);
        stats.errors++;

      } else {
        // Default to text
        try {
          await loadAllFonts(textNode);
          textNode.characters = newValue;
          stats.success++;
        } catch (err) {
          stats.errors++;
        }
      }
    }
  }

  // Reselect the master frame
  figma.currentPage.selection = [masterFrame];

  // Zoom to fit all the new frames
  const allNodes = [masterFrame];
  for (let i = 0; i < languages.length; i++) {
    // The clones are on the same page
    const cloneName = masterFrame.name + " — " + languages[i];
    const found = figma.currentPage.findOne(n => n.name === cloneName);
    if (found) allNodes.push(found);
  }
  figma.viewport.scrollAndZoomIntoView(allNodes);

  // Report completion
  figma.ui.postMessage({
    type: "complete",
    stats,
    errorLog
  });
}

// ─── HELPER: Find all text nodes recursively ────────────────

function findAllTextNodes(node) {
  const result = [];

  if (node.type === "TEXT") {
    result.push(node);
  }

  // Recurse into children (frames, groups, components, instances)
  if ("children" in node) {
    for (const child of node.children) {
      result.push(...findAllTextNodes(child));
    }
  }

  return result;
}

// ─── HELPER: Load all fonts in a text node ──────────────────
// A text node can have multiple fonts (e.g., mixed bold/regular).
// We need to load ALL of them before we can set .characters.

async function loadAllFonts(textNode) {
  if (textNode.hasMissingFont) {
    throw new Error("Missing font on layer '" + textNode.name + "'");
  }

  const len = textNode.characters.length;

  if (len === 0) {
    // Empty text node — load the default font
    const fontName = textNode.fontName;
    if (fontName !== figma.mixed) {
      await figma.loadFontAsync(fontName);
    }
    return;
  }

  // Collect unique fonts used across the text
  const fonts = [];
  const seen = new Set();

  for (let i = 0; i < len; i++) {
    const fontName = textNode.getRangeFontName(i, i + 1);
    if (fontName === figma.mixed) continue;

    const key = fontName.family + "|" + fontName.style;
    if (!seen.has(key)) {
      seen.add(key);
      fonts.push(fontName);
    }
  }

  // Load all fonts in parallel
  await Promise.all(fonts.map(f => figma.loadFontAsync(f)));
}
