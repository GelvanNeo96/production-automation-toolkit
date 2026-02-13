# Production Automation Toolkit

Automation scripts and plugins for video production localization workflows. Built for After Effects and Figma to handle multi-language asset generation at scale.

## What This Solves

Producing video and design assets in 15+ languages manually means duplicating comps, copying translations, and praying nothing breaks. These tools automate that entire pipeline — one CSV drives everything.

## Tools

### After Effects Scripts

| Script | What It Does |
|--------|-------------|
| [Batch Asset Replacer](ae-scripts/batch-asset-replacer.jsx) | CSV-driven localization — duplicates comps for each language and replaces text/footage. Handles unlimited sub-comp nesting depth automatically. |
| [Smart Render Queue](ae-scripts/smart-render-queue.jsx) | Dockable panel with 14 platform presets (IG Story, YouTube 4K, TikTok, etc.). Auto-applies resolution, codec, and bitrate. |
| [Project Cleanup Tool](ae-scripts/project-cleanup-tool.jsx) | Removes unused footage, consolidates duplicates, reports missing files, organizes project folders. |

### Figma Plugin

| Plugin | What It Does |
|--------|-------------|
| [Batch Localizer](figma-plugin/) | Same CSV workflow in Figma — select a frame, upload CSV, generates localized versions with text replaced by layer name matching. |

## Batch Asset Replacer — Quick Start

### 1. Name your text layers in AE
Make sure the text layers you want to translate have clear names (`Headline`, `CTA_Button`, etc.). Layers can be nested inside sub-comps at any depth.

### 2. Prepare your CSV
```csv
comp_name,layer_name,type,en-US,zh-TW,ja-JP
Main_Comp,Headline,text,Welcome to Bybit,歡迎來到Bybit,Bybitへようこそ
Main_Comp,Subheadline,text,Trade Now,立即交易,今すぐ取引
Main_Comp,Speaker_Name,text,John Smith,約翰·史密斯,ジョン・スミス
```

- `comp_name`: Your master comp name (put this for every row — the script searches sub-comps automatically)
- `layer_name`: Exact layer name in AE (case-sensitive)
- `type`: `text` or `footage`
- Language columns: One per language, use any language codes

### 3. Run the script
File → Scripts → Run Script File → select `batch-asset-replacer.jsx`

### Output
```
Localized_Versions/
  EN-US/
    Main_Comp_en_us       ← render-ready
  ZH-TW/
    Main_Comp_zh_tw
  JA-JP/
    Main_Comp_ja_jp
  _PRECOMPS/              ← sub-comps (auto-managed)
```

## Installation

### After Effects
1. Copy `.jsx` files to your AE Scripts folder, or run via File → Scripts → Run Script File
2. Enable **Preferences → Scripting → Allow Scripts to Write Files**

### Figma
1. Download the `figma-plugin/` folder
2. Figma Desktop → Plugins → Development → Import plugin from manifest
3. Select `manifest.json`

## Compatibility

- After Effects CC 2019+ (Mac/Windows)
- Figma Desktop App (plugin development requires desktop)

## Tech Stack

- **After Effects**: ExtendScript (ES3-compatible JavaScript)
- **Figma**: JavaScript (Figma Plugin API)

---

*Built by Gelvan Neo — Bybit Livestream & Video Strategy*
