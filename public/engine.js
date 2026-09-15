/* ScribbleEngine — snapshot interpolation for other doodles. */
const ScribbleEngine = {
  delay: 90,
  applySnap: function (others, myId, snap) {
    const t = Number(snap.t) || Date.now();
    const seen = new Set();
    for (const s of snap.players || []) {
      if (!s || s.id === myId) continue;
      seen.add(s.id);
      let p = others.get(s.id);
      if (!p) {
        p = { id: s.id, name: s.name || "Doodle", color: s.color || "#1b1b1b", hat: s.hat || "none", x: s.x, y: s.y, tx: s.x, ty: s.y, facing: s.facing || 1, walking: !!s.walking, pose: s.pose || "stand", chat: "", chatUntil: 0 };
        others.set(s.id, p);
      }
      p.fromX = p.x;
      p.fromY = p.y;
      p.toX = s.x;
      p.toY = s.y;
      p.fromT = p.toT || t;
      p.toT = t;
      p.facing = s.facing === -1 ? -1 : 1;
      p.walking = Boolean(s.walking);
      if (s.pose) p.pose = s.pose;
    }
    return seen;
  },
  sample: function (others, now) {
    const renderT = now - this.delay;
    for (const p of others.values()) {
      if (p.toX == null) continue;
      const span = Math.max(1, (p.toT || 0) - (p.fromT || 0));
      let u = (renderT - (p.fromT || 0)) / span;
      if (!Number.isFinite(u)) u = 1;
      u = Math.max(0, Math.min(1.12, u));
      const a = Math.min(1, u);
      p.x = (p.fromX ?? p.x) + ((p.toX ?? p.x) - (p.fromX ?? p.x)) * a;
      p.y = (p.fromY ?? p.y) + ((p.toY ?? p.y) - (p.fromY ?? p.y)) * a;
    }
  }
};
