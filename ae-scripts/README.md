# After Effects Scripts

## Batch Asset Replacer v2.1

CSV-driven text and footage replacement across compositions with automatic sub-comp handling at unlimited nesting depth.

**Key features:**
- Just put the master comp name in the CSV — script recursively finds layers at any depth
- Duplicates the entire comp tree per language, relinks sub-comps automatically
- Clean output: only master comps in language folders, sub-comps hidden in `_PRECOMPS`
- Pre-checks layer names before running and warns about mismatches
- Full undo support (Ctrl+Z undoes everything)
- Detailed error reporting in the completion dialog

**CSV format:**
```csv
comp_name,layer_name,type,en-US,zh-TW,ja-JP
Main_Comp,Headline,text,Welcome,歡迎,ようこそ
Main_Comp,Speaker_Name,text,John,約翰,ジョン
```

## Smart Render Queue Manager

Dockable panel with 14 platform presets:
- Instagram (Story / Reels / Feed)
- YouTube (1080p / 4K / Shorts)
- LinkedIn, Twitter/X, TikTok, Facebook
- Bybit Internal (ProRes 422 HQ)
- ProRes 4444 Master, GIF Preview

## Project Cleanup Tool

Dockable panel with 5 functions:
1. Scan Project (stats overview)
2. Remove Unused Footage
3. Consolidate Duplicates
4. Report Missing Footage
5. Organize Project Folders

## Installation

Copy `.jsx` files to:
- **Mac**: `/Applications/Adobe After Effects [version]/Scripts/`
- **Windows**: `C:\Program Files\Adobe\Adobe After Effects [version]\Support Files\Scripts\`

Or for dockable panels (Smart Render Queue, Project Cleanup):
- Put in the `ScriptUI Panels` subfolder inside the Scripts folder
- Access via Window menu in AE

Enable: **Edit → Preferences → Scripting & Expressions → Allow Scripts to Write Files**
