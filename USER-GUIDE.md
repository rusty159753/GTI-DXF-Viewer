# GTI DXF Viewer — User Guide

This guide is for glass cutters and shop floor staff. No technical experience required.

---

## Getting Started

The DXF Viewer is a single folder called **dist**. You do not need to install anything. It runs in the web browser that is already on your PC (Edge, Chrome, or Firefox).

### How to Open the Viewer

1. Find the **dist** folder (on your USB drive, shared network drive, or desktop — wherever your supervisor placed it)
2. Open the **dist** folder
3. Double-click the file called **index.html**
4. The viewer will open in your web browser

That's it. No passwords, no accounts, no internet connection needed.

---

## Loading a DXF File

You have two options:

**Option A — Drag and Drop**
1. Find your `.dxf` file in File Explorer
2. Drag it onto the viewer window and release

**Option B — File Picker**
1. Click the **Open DXF File** button in the left panel
2. Browse to your `.dxf` file and click Open

Your drawing will appear on screen.

---

## Moving Around the Drawing

| Action | How To |
|--------|--------|
| **Pan (move around)** | Hold the **mouse scroll wheel** down and drag. Or click the **Pan** button in the toolbar, then click and drag. |
| **Zoom in/out** | Roll the **mouse scroll wheel** up or down |
| **Zoom to fit** | Click the **Zoom to Fit** button to see the entire drawing |
| **Zoom In / Zoom Out buttons** | Use these if you don't have a scroll wheel |

The bottom of the left panel shows your current **X / Y coordinates** as you move the mouse.

---

## Turning Layers On and Off

The **Layers** section in the left panel lists every layer in the DXF file. Each layer has a colored dot showing its color.

- Click a layer name to **hide** it (it will dim out)
- Click it again to **show** it

This is useful when a drawing has too many details and you want to focus on specific parts.

---

## Adding a Text Note

Use this to place your own notes anywhere on the drawing (e.g., "Check this edge" or "Customer wants bevel here").

1. Click the **Add Text** button in the toolbar
2. Click anywhere on the drawing where you want the note
3. A box will pop up — type your note and press **Enter** (or click OK)
4. Your note appears on the drawing as green text with a green dot

---

## Adding a Dimension Override

Use this to mark a measurement that the glass cutter needs to follow, even if the DXF shows something different.

1. Click the **Dim Override** button in the toolbar
2. Click the spot on the drawing where the override applies
3. A box will pop up — type the dimension (e.g., "24.5 in") and press **Enter**
4. Your override appears on the drawing as orange text with an orange diamond

---

## Managing Your Notes and Overrides

All your notes and overrides are listed in the **Annotations** section of the left panel.

- Click the **X** next to any annotation to delete it
- Click **Clear All** to remove all annotations at once

---

## Exporting to PDF

When your drawing is ready (with any notes or overrides you've added):

1. Click the green **Export to PDF** button at the bottom of the left panel
2. A PDF file will automatically download to your computer (usually to your Downloads folder)
3. The PDF is A4 landscape size and includes the drawing plus all your annotations

### Printing

1. Export to PDF (see above)
2. Open the downloaded PDF
3. Press **Ctrl + P** to print
4. Choose your printer and paper size, then click Print

---

## Tips

- You can only have **one DXF file open at a time**. To open a different file, just drag a new one onto the viewer or use the Open button again.
- Your notes and overrides are **not saved** if you close the browser. Export to PDF before closing if you need to keep them.
- If the drawing looks blank after loading, try clicking **Zoom to Fit** — the drawing may be very small or very large.
- The viewer works completely **offline**. No internet connection is needed.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Double-clicking index.html opens a text editor instead of the browser | Right-click the file, choose **Open with**, and select **Microsoft Edge** or **Google Chrome** |
| The drawing doesn't appear after loading a file | Click **Zoom to Fit**. If it still doesn't show, the file may be a binary DXF — the viewer only supports ASCII DXF files. Ask the engineer to re-export as ASCII DXF. |
| Colors look wrong or lines are invisible | Some layers may be hidden. Check the Layers panel and make sure all layers are turned on. |
| PDF export looks too dark or colors are inverted | This is normal — the PDF converts the dark background to white for printing. Lines and shapes will appear dark on a white background. |
| Nothing happens when I drag a file onto the viewer | Make sure the file ends in `.dxf` (not `.dwg` or `.pdf`). Only DXF files are supported. |
