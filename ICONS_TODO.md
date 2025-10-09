# Icons TODO

The extension requires icon files in the `public/icons/` directory:
- icon16.png (16x16 pixels)
- icon32.png (32x32 pixels)  
- icon48.png (48x48 pixels)
- icon128.png (128x128 pixels)

## Temporary Solution

For development and testing, you can:
1. Use any 128x128 PNG image renamed as the icon files
2. Or temporarily comment out the icon references in `src/manifest.json`
3. Or use an online icon generator to create simple placeholder icons

## Production Icons

Before publishing, create proper icons that:
- Represent the LeetVision brand
- Use the theme colors (blue, green, orange)
- Are clear and recognizable at all sizes
- Follow browser extension icon guidelines

An SVG template has been created at `public/icons/icon.svg` that you can use as a starting point.

