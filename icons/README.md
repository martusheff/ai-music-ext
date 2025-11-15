# Extension Icons

This folder should contain the following icon files:

- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels  
- `icon128.png` - 128x128 pixels

## Quick Setup

You can create simple placeholder icons using any image editor or online tool:

1. Create a simple colored square or use a music note icon
2. Export in three sizes: 16x16, 48x48, and 128x128
3. Save as PNG files with the names above

## Online Icon Generators

- https://www.favicon-generator.org/
- https://realfavicongenerator.net/
- https://www.flaticon.com/ (search for "music" or "upload")

## Temporary Workaround

If you want to test the extension immediately without icons, you can:

1. Create simple colored PNG files using any image editor
2. Or use the command line (requires ImageMagick):

```bash
convert -size 16x16 xc:#1a73e8 icon16.png
convert -size 48x48 xc:#1a73e8 icon48.png
convert -size 128x128 xc:#1a73e8 icon128.png
```

The extension will work without icons, but Chrome may show warnings.
