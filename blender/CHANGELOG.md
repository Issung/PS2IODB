# Changelog

All notable changes to the PS2IODB Blender add-on. Versions follow [semantic versioning](https://semver.org): bump the
patch number for fixes, the minor number for new features and the major number for changes that break existing use.

## 1.0.0

- Import icons downloaded from PS2IODB (the `.zip` from an icon's page, or its extracted files), with their texture,
  vertex colours, normals and animation as keyframed shape keys.
- Preview the normal, copy and delete states from the PS2 Icon sidebar tab, which also sets the timeline to that
  state's animation loop.
- Export icons to a new 8MB PS2 memory card image (`.ps2`), for PCSX2 or SD card based memory cards. Animation comes
  from shape keys, or is baked from armatures and modifiers.
