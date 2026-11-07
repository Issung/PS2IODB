# PS2IODB Blender Add-on

A Blender extension (Blender 4.2+) that:

- **Imports** icons downloaded from [ps2iodb.com](https://ps2iodb.com) (the `ps2iodb_<code>.zip` from an icon's page, or its extracted files), including the `.anim` animation as keyframed shape keys.
- **Exports** meshes made in Blender to a new 8MB PS2 memory card image (`.ps2`) holding a save with the icon, for PCSX2 or SD card based memory cards like the SD2PSX and MemCard PRO2.

Users get it from the [FAQ page](https://ps2iodb.com/faq). The site builds it from this folder at build time (`website/scripts/vite-plugin-blender-addon.ts`), so there is nothing to rebuild or commit by hand.

## Releasing

The site is a [Blender extension repository](https://docs.blender.org/manual/en/latest/advanced/extensions/creating_repository/static_repository.html). Each build publishes:
- `/downloads/blender/ps2iodb-<version>.zip`
- `/downloads/blender/index.json`, the listing Blender reads, the same as `blender --command extension server-generate` writes.

Users who add `https://ps2iodb.com/downloads/blender/index.json` as a remote repository in Blender are told when a new version is out, and can update with one click. Blender only offers an update when the version number goes up. So to release a change:

1. Increase `version` in `ps2iodb/blender_manifest.toml`, following [semantic versioning](https://semver.org).
2. Add an entry to `CHANGELOG.md`.
3. Merge to `main`. The deploy publishes it, and the FAQ shows the new version.

CI enforces step 1. `website/scripts/check-blender-addon-version.ts` fails the build if the add-on's files differ from the version live on ps2iodb.com while the version number is the same.

## Layout

| Path | Purpose |
|---|---|
| `ps2iodb/blender_manifest.toml` | Extension manifest. |
| `ps2iodb/__init__.py` | Registration. |
| `ps2iodb/import_icon.py` | File > Import > PS2IODB Icon. |
| `ps2iodb/export_card.py` | File > Export > PS2 Memory Card. |
| `ps2iodb/properties.py`, `ui.py` | The save settings (`scene.ps2iodb`, written to `icon.sys`) and the *PS2 Icon* sidebar tab. |
| `ps2iodb/formats/` | Pure Python readers and writers, with no Blender dependency: PS2 icons, `icon.sys`, memory cards (with ECC), the `.anim` maths and PS2IODB's OBJ files. |
| `tests/test_formats.py` | Unit tests for `formats/`, run by CI. |
| `tests/blender_smoke.py` | End to end test inside Blender using real icons from `website/public/icons`. Not run by CI. |

## Testing

From the repository root:

```bash
python -m unittest discover blender/tests
blender --background --factory-startup --python blender/tests/blender_smoke.py
```

To try the add-on in Blender while developing, install `blender/ps2iodb` by linking it into your extensions folder, or run `npm start` in `website/` and install `http://localhost:3000/downloads/ps2iodb-blender-addon.zip` from disk.

## How it works

- **Coordinates**: PS2 icons have Y pointing down and face -Z. The add-on maps PS2 `(X, Y, Z)` to Blender `(X, Z, -Y)`, so icons stand on the origin facing Blender's front view. PS2IODB's OBJ files negate X and Y of positions but not normals (see `formats/obj.py`), which is why the add-on reads them itself instead of using Blender's OBJ importer.
- **Animation**: a PS2 icon blends between full copies of its mesh ("shapes"), averaging them by weight: `sum(w * shape) / sum(w)`. Blender shape keys add offsets to the basis: `basis + sum(w * (key - basis))`. The two are equal when the weights sum to 1, so the importer normalises the weights and the exporter gives the basis the leftover weight (`1 - sum`). Shapes whose weight never leaves 0 aren't exported. Timing is in 60ths of a second, and the loop length comes from the shape key action's frame range (which the importer sets) or else the scene's frame range.
- **Memory cards**: `formats/memcard.py` formats a card exactly as PCSX2 does (a test checks it byte for byte against `Documentation/Empty Memory Card.ps2`) and writes the save into it. The website's extractor reads these cards, which is a useful independent check.
