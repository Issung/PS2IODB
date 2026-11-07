"""
Animation maths shared by the importer and exporter. Nothing here depends on Blender.

A PS2 icon animates by blending between shapes (full copies of every vertex position). Each animation frame names a
shape and has keys giving its weight over time, linearly interpolated. The final position of a vertex is the weighted
average of its position in every frame's shape: sum(weight * position) / sum(weight).
Times are in 60ths of a second, and are divided by the animation's `animSpeed` when played.

Blender shape keys blend as basis + sum(value * (shape - basis)). That equals the PS2 result whenever the weights sum
to 1, so on import each weight is divided by the sum of all weights at that moment, and on export the basis gets the
leftover weight (1 - sum of the other shape key values).

See `website/src/components/ModelView/ModelViewRenderer.ts` (`animateV1`, `animateV2`) and
`website/src/utils/Animation.ts` for how the website plays animations, which this matches.
"""

from dataclasses import dataclass

TICKS_PER_SECOND = 60
# Version 1 .anim files have no usable key data, the website shows each frame for 0.15 seconds and blends to the next.
V1_TICKS_PER_FRAME = 0.15 * TICKS_PER_SECOND
# How close two weights have to be to be considered equal.
EPSILON = 1e-4
# Used to place a sample just before a key time, in ticks, to keep instant jumps (two keys at the same time, or the loop
# wrapping) sharp. The website only shows whole ticks so never sees the gap. Blender merges keyframes closer than 0.01
# frames, this stays above that down to 6 fps.
_JUST_BEFORE = 0.1


@dataclass
class ShapeTrack:
    # Flat [x1, y1, z1, x2, ...] positions in PS2 icon space.
    vertex_data: list
    # (time in ticks, weight) points, linearly interpolated. Times already have animSpeed applied.
    points: list


def evaluate(keys, time):
    """Evaluate a list of (time, value) keys the way the website's `Timeline` does."""
    if time <= keys[0][0]:
        return keys[0][1]
    if time >= keys[-1][0]:
        return keys[-1][1]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t0 <= time < t1:
            return v0 + (time - t0) / (t1 - t0) * (v1 - v0)
    raise AssertionError("Unreachable")


def simplify(points, tolerance=EPSILON):
    """Remove points that lie on the straight line between their neighbours."""
    if len(points) <= 2:
        return list(points)
    out = [points[0]]
    for i in range(1, len(points) - 1):
        (t0, v0), (t1, v1), (t2, v2) = out[-1], points[i], points[i + 1]
        expected = v0 + (t1 - t0) / (t2 - t0) * (v2 - v0) if t2 != t0 else v2
        if abs(expected - v1) > tolerance:
            out.append(points[i])
    out.append(points[-1])
    return out


def shape_tracks(anim: dict):
    """
    Convert parsed `.anim` JSON into per-shape weight tracks that sum to 1 at every point, plus the loop length in ticks.
    Frames that use the same shape (version 3 files record the shape id) are combined into one track.
    Returns ([], 0) if the animation never changes shape.
    """
    frames = anim['frames']
    if not frames:
        return [], 0

    if anim.get('version') is None:
        return _v1_tracks(frames)

    speed = anim.get('animSpeed') or 1.0
    length = anim['frameLength']
    frame_keys = [[(k['time'], k['value']) for k in f['keys']] or [(0, 1)] for f in frames]

    # Group frames by shape. Version 2 files don't record shape ids, each frame has its own copy of the vertex data.
    groups = {}
    for i, frame in enumerate(frames):
        groups.setdefault(frame.get('shapeId', i) if anim['version'] >= 3 else i, []).append(i)
    group_ids = list(groups)

    # Sample at every key time. Between two key times every weight is a straight line, so if the weights already sum to
    # 1 these samples are exact. If they don't, the normalised weights curve, so also sample every tick like the website.
    times = {0, max(0, length - _JUST_BEFORE), length}
    for keys in frame_keys:
        key_times = [t for t, _ in keys]
        for t in key_times:
            if 0 <= t <= length:
                times.add(t)
                if key_times.count(t) > 1 and t - _JUST_BEFORE >= 0:
                    times.add(t - _JUST_BEFORE)
    times = sorted(times)
    if any(abs(sum(evaluate(keys, t) for keys in frame_keys) - 1) > EPSILON for t in times):
        times = sorted(set(times) | set(range(0, int(length) + 1)))

    points = {g: [] for g in group_ids}
    for t in times:
        # The website plays time modulo the loop length, so the end of the loop shows the start, not the last keys.
        # Many icons end on a different pose than they start and jump back. Sampling just before the end too keeps that
        # jump sharp rather than showing the end pose for a frame (the Cycles modifier repeats from the last key).
        weights = [evaluate(keys, 0 if t == length else t) for keys in frame_keys]
        total = sum(weights)
        for g in group_ids:
            value = sum(weights[i] for i in groups[g]) / total if abs(total) > EPSILON else 0.0
            points[g].append((t / speed, value))

    # A tight tolerance, small weight errors are multiplied by the distance between shapes, which can be several units.
    tracks = [ShapeTrack(frames[groups[g][0]]['vertexData'], simplify(points[g], 1e-6)) for g in group_ids]
    return _unless_static(tracks, length / speed)


def _v1_tracks(frames):
    n = len(frames)
    step = V1_TICKS_PER_FRAME
    tracks = [ShapeTrack(f['vertexData'], loop_points(i, n, step)) for i, f in enumerate(frames)]
    return _unless_static(tracks, n * step)


def loop_points(index, count, step):
    """
    Weight points for shape `index` of `count` shapes shown one after another, `step` ticks apart, each blending into the
    next and the last blending back into the first so the animation loops.
    Every shape's points start at 0 and end at the loop length. Blender's Cycles modifier repeats a curve over the span
    of its own keys, so a shape keyed over less than the whole loop would repeat at the wrong rate.
    """
    length = count * step
    t = index * step
    if index == 0:
        points = [(0, 1.0), (step, 0.0)]
        if count > 2:
            points.append(((count - 1) * step, 0.0))
        points.append((length, 1.0))
        return points
    points = [(t - step, 0.0), (t, 1.0), (t + step, 0.0)]
    if t - step > 0:
        points.insert(0, (0, 0.0))
    if t + step < length:
        points.append((length, 0.0))
    return points


def _unless_static(tracks, length):
    """Return no tracks if every shape is identical, which some games do for icons that don't move."""
    first = tracks[0].vertex_data
    if all(_same_positions(first, track.vertex_data) for track in tracks[1:]):
        return [], 0
    return tracks, length


def _same_positions(a, b):
    return len(a) == len(b) and all(abs(x - y) < EPSILON for x, y in zip(a, b))


def weight_tracks_to_frames(samples, weights):
    """
    Turn sampled shape weights into PS2 animation frames.
    `samples` is a list of times in ticks and `weights[shape]` the weight of each shape at those times.
    Shapes whose weight is always 0 are dropped. Returns (kept shape indexes, [[(time, value), ...] per kept shape]).
    """
    kept = [s for s, values in enumerate(weights) if any(abs(v) > EPSILON for v in values)]
    keys = [simplify(list(zip(samples, weights[s]))) for s in kept]
    return kept, keys
