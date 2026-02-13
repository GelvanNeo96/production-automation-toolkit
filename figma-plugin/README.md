# Batch Localizer — Figma Plugin

Duplicates a selected frame for each language in a CSV and replaces text layers by matching layer names. Same CSV format as your After Effects script.

## Installation

1. Download this folder to your computer
2. Open the **Figma Desktop App** (plugins require the desktop app)
3. Go to **Plugins → Development → Import plugin from manifest...**
4. Select the `manifest.json` file from this folder
5. The plugin will appear under **Plugins → Development → Batch Localizer**

## Usage

1. **Design your EN master frame** in Figma
   - Name your text layers clearly (e.g., `Headline`, `Subheadline`, `CTA_Button`)
   - These names must match the `layer_name` column in your CSV

2. **Prepare your CSV** (same format as the AE script, minus comp_name):
   ```
   layer_name,type,en-US,zh-TW,ja-JP,ko-KR
   Headline,text,Welcome to Bybit,歡迎來到Bybit,Bybitへようこそ,...
   Subheadline,text,Trade Now,立即交易,今すぐ取引,...
   Speaker_Name,text,John Smith,約翰·史密斯,ジョン・スミス,...
   ```

3. **Select your master frame** on the canvas

4. **Run the plugin**: Plugins → Development → Batch Localizer

5. **Upload your CSV** (drag & drop or click to browse)

6. **Click "Generate Localized Versions"**

7. The plugin will:
   - Duplicate your frame once per language
   - Space them out horizontally on the canvas
   - Replace all text layers that match CSV layer names
   - Preserve all formatting (fonts, sizes, colors, styles)

## CSV Format

| Column | Required | Description |
|--------|----------|-------------|
| `layer_name` | Yes | Exact name of the Figma text layer |
| `type` | No | `text` (default). Image replacement not yet supported. |
| Language columns | Yes | One column per language (e.g., `en-US`, `zh-TW`, `ja-JP`) |

### Key differences from the AE script:
- **No `comp_name` column** — Figma uses the selected frame instead
- **Layer names are matched recursively** through all nested frames/groups/components
- **Fonts must be available** in your Figma file (the plugin loads them automatically)

## Tips

- Layers not in the CSV are left untouched (logos, icons, shapes all stay the same)
- Empty cells in the CSV are skipped (no replacement applied)
- The plugin handles mixed fonts within a single text layer
- Test with 2-3 languages first before running all 15

## Files

```
batch-localizer/
  ├── manifest.json    ← Plugin configuration (Figma reads this)
  ├── code.js          ← Plugin logic (duplication, text replacement)
  ├── ui.html          ← Plugin interface (CSV upload, preview)
  └── README.md        ← This file
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "No frame selected" | Click on a frame in the canvas before running |
| Text not replacing | Check that `layer_name` in CSV matches the Figma layer name exactly |
| Missing font error | Make sure all fonts used in the frame are available in Figma |
| Empty duplicates | The CSV might have encoding issues — save as UTF-8 CSV |

---

*Built by Gelvan Neo — Bybit Livestream & Video Strategy*
