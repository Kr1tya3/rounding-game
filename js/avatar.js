// Avatar look, shop catalogue and drawing. Pure logic (returns SVG strings), no DOM,
// so it can be tested in Node.
(function (root) {
  "use strict";

  var SLOTS = [
    { id: "skin", name: "Skin", icon: "🎨", optional: false },
    { id: "jersey", name: "Jersey", icon: "👕", optional: false },
    { id: "hat", name: "Hats", icon: "🧢", optional: true },
    { id: "glasses", name: "Glasses", icon: "🕶️", optional: true },
    { id: "shoes", name: "Shoes", icon: "👟", optional: false },
    { id: "extra", name: "Extras", icon: "✨", optional: true }
  ];

  // Price tiers, from easy to hard to get. A perfect round pays roughly
  // 100 gold on level 1 and 800 on level 8 (baskets + gold medal bonus).
  var TIERS = [
    { id: "starter", name: "Starter", max: 0 },
    { id: "rookie", name: "Rookie", max: 250 },
    { id: "pro", name: "Pro", max: 900 },
    { id: "allstar", name: "All-Star", max: 3000 },
    { id: "legend", name: "Legend", max: Infinity }
  ];

  function tierFor(it) {
    for (var i = 0; i < TIERS.length; i++) if (it.price <= TIERS[i].max) return TIERS[i];
    return TIERS[TIERS.length - 1];
  }

  // price 0 = free and owned from the start.
  var ITEMS = [
    { id: "skin-1", slot: "skin", name: "Tone 1", price: 0, color: "#f6d3b3" },
    { id: "skin-2", slot: "skin", name: "Tone 2", price: 0, color: "#e0a87c" },
    { id: "skin-3", slot: "skin", name: "Tone 3", price: 0, color: "#b5764a" },
    { id: "skin-4", slot: "skin", name: "Tone 4", price: 0, color: "#7a4a2a" },

    { id: "jersey-orange", slot: "jersey", name: "Orange", price: 0, color: "#e8590c", trim: "#fff" },
    { id: "jersey-blue", slot: "jersey", name: "Blue", price: 150, color: "#1c7ed6", trim: "#fff" },
    { id: "jersey-green", slot: "jersey", name: "Green", price: 150, color: "#2b8a3e", trim: "#fff" },
    { id: "jersey-purple", slot: "jersey", name: "Purple", price: 500, color: "#7048e8", trim: "#ffd43b" },
    { id: "jersey-black", slot: "jersey", name: "Night", price: 900, color: "#212529", trim: "#ff6b6b" },
    { id: "jersey-gold", slot: "jersey", name: "Gold", price: 3000, color: "#f2b705", trim: "#7a4a00" },

    { id: "hat-headband", slot: "hat", name: "Headband", price: 100 },
    { id: "hat-cap", slot: "hat", name: "Cap", price: 250 },
    { id: "hat-backwards", slot: "hat", name: "Snapback", price: 400 },
    { id: "hat-beanie", slot: "hat", name: "Beanie", price: 700 },
    { id: "hat-crown", slot: "hat", name: "Crown", price: 10000 },

    { id: "glasses-sport", slot: "glasses", name: "Sport goggles", price: 450 },
    { id: "glasses-sun", slot: "glasses", name: "Sunglasses", price: 600 },
    { id: "glasses-star", slot: "glasses", name: "Star glasses", price: 1500 },

    { id: "shoes-white", slot: "shoes", name: "White", price: 0, color: "#f1f3f5" },
    { id: "shoes-red", slot: "shoes", name: "Red", price: 200, color: "#e03131" },
    { id: "shoes-neon", slot: "shoes", name: "Neon", price: 800, color: "#94d82d" },
    { id: "shoes-gold", slot: "shoes", name: "Gold", price: 5000, color: "#f2b705" },

    { id: "extra-wristbands", slot: "extra", name: "Wristbands", price: 120 },
    { id: "extra-whistle", slot: "extra", name: "Whistle", price: 500 },
    { id: "extra-chain", slot: "extra", name: "Gold chain", price: 2500 },
    { id: "extra-cape", slot: "extra", name: "Hero cape", price: 7500 }
  ];

  var DEFAULT_LOOK = { skin: "skin-2", jersey: "jersey-orange", hat: null, glasses: null, shoes: "shoes-white", extra: null };

  function item(id) {
    for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
    return null;
  }

  // Items of one slot, cheapest first.
  function itemsFor(slot) {
    return ITEMS.filter(function (it) { return it.slot === slot; })
      .sort(function (a, b) { return a.price - b.price; });
  }

  // Make sure saved avatar data is complete and valid.
  function normalise(avatar) {
    avatar = avatar || {};
    var owned = Array.isArray(avatar.owned) ? avatar.owned.filter(item) : [];
    ITEMS.forEach(function (it) { if (it.price === 0 && owned.indexOf(it.id) === -1) owned.push(it.id); });
    var look = {};
    SLOTS.forEach(function (s) {
      var id = avatar.look ? avatar.look[s.id] : undefined;
      var it = id ? item(id) : null;
      if (it && it.slot === s.id && owned.indexOf(id) !== -1) look[s.id] = id;
      else look[s.id] = s.optional && id === null ? null : DEFAULT_LOOK[s.id];
    });
    return { owned: owned, look: look };
  }

  function owns(avatar, id) { return avatar.owned.indexOf(id) !== -1; }

  // Buy an item with the player's gold. Returns { ok, reason }.
  function buy(progress, id) {
    var it = item(id);
    if (!it) return { ok: false, reason: "unknown" };
    if (owns(progress.avatar, id)) return { ok: false, reason: "owned" };
    if ((progress.gold || 0) < it.price) return { ok: false, reason: "gold" };
    progress.gold -= it.price;
    progress.avatar.owned.push(id);
    progress.avatar.look[it.slot] = id;
    return { ok: true };
  }

  // Wear an owned item, or pass null to take off an optional slot.
  function equip(avatar, slot, id) {
    var s = SLOTS.filter(function (x) { return x.id === slot; })[0];
    if (!s) return false;
    if (id === null) {
      if (!s.optional) return false;
      avatar.look[slot] = null;
      return true;
    }
    var it = item(id);
    if (!it || it.slot !== slot || !owns(avatar, id)) return false;
    avatar.look[slot] = id;
    return true;
  }

  // ---------- Drawing ----------
  function c(id, key, fallback) { var it = item(id); return (it && it[key]) || fallback; }

  function hatSvg(id) {
    switch (id) {
      case "hat-headband":
        return '<rect x="31" y="26" width="38" height="7" rx="3" fill="#e03131"/><rect x="31" y="28" width="38" height="2" fill="#fff"/>';
      case "hat-cap":
        return '<path d="M30 30 Q30 10 50 10 Q70 10 70 30 Z" fill="#1c7ed6"/><path d="M62 28 Q78 27 82 32 L66 33 Z" fill="#1864ab"/><circle cx="50" cy="11" r="2.5" fill="#1864ab"/>';
      case "hat-backwards":
        return '<path d="M30 30 Q30 10 50 10 Q70 10 70 30 Z" fill="#e03131"/><path d="M38 28 Q22 27 18 32 L34 33 Z" fill="#c92a2a"/><rect x="44" y="22" width="12" height="5" rx="2" fill="#fff" opacity="0.9"/>';
      case "hat-beanie":
        return '<path d="M30 30 Q30 8 50 8 Q70 8 70 30 Z" fill="#7048e8"/><rect x="29" y="26" width="42" height="7" rx="3" fill="#5f3dc4"/><circle cx="50" cy="7" r="5" fill="#ffd43b"/>';
      case "hat-crown":
        return '<path d="M33 24 L36 8 L44 18 L50 5 L56 18 L64 8 L67 24 Z" fill="#f2b705" stroke="#b37400" stroke-width="1.5"/>' +
          '<circle cx="50" cy="16" r="2.5" fill="#e03131"/><circle cx="41" cy="20" r="2" fill="#1c7ed6"/><circle cx="59" cy="20" r="2" fill="#2b8a3e"/>';
      default: return "";
    }
  }

  function glassesSvg(id) {
    switch (id) {
      case "glasses-sport":
        return '<rect x="34" y="33" width="32" height="10" rx="5" fill="#74c0fc" fill-opacity="0.75" stroke="#1971c2" stroke-width="2"/>';
      case "glasses-sun":
        return '<rect x="35" y="33" width="13" height="9" rx="3" fill="#212529"/><rect x="52" y="33" width="13" height="9" rx="3" fill="#212529"/>' +
          '<rect x="47" y="35" width="6" height="2" fill="#212529"/><rect x="37" y="34" width="4" height="2" fill="#fff" opacity="0.5"/>';
      case "glasses-star":
        return star(41.5, 38, 8, "#f783ac") + star(58.5, 38, 8, "#f783ac") + '<rect x="47" y="36.5" width="6" height="2" fill="#d6336c"/>';
      default: return "";
    }
  }

  function star(cx, cy, r, fill) {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      pts.push((cx + rr * Math.cos(a)).toFixed(1) + "," + (cy - rr * Math.sin(a)).toFixed(1));
    }
    return '<polygon points="' + pts.join(" ") + '" fill="' + fill + '" stroke="#a61e4d" stroke-width="1"/>';
  }

  function extraFront(id, skin) {
    switch (id) {
      case "extra-wristbands":
        return '<rect x="17" y="80" width="9" height="6" rx="2" fill="#fff" stroke="#ced4da"/><rect x="74" y="80" width="9" height="6" rx="2" fill="#fff" stroke="#ced4da"/>';
      case "extra-whistle":
        return '<path d="M42 54 Q50 70 58 54" fill="none" stroke="#495057" stroke-width="1.5"/><rect x="47" y="66" width="7" height="5" rx="2" fill="#adb5bd"/>';
      case "extra-chain":
        return '<path d="M40 54 Q50 72 60 54" fill="none" stroke="#f2b705" stroke-width="3" stroke-dasharray="3 1.5"/><circle cx="50" cy="66" r="4" fill="#f2b705" stroke="#b37400"/>';
      default: return "";
    }
  }

  // Full avatar as an SVG string. viewBox is 100 x 140.
  function svg(look, opts) {
    look = look || DEFAULT_LOOK;
    opts = opts || {};
    var skin = c(look.skin, "color", "#e0a87c");
    var jersey = c(look.jersey, "color", "#e8590c");
    var trim = c(look.jersey, "trim", "#fff");
    var shoes = c(look.shoes, "color", "#f1f3f5");
    var cape = look.extra === "extra-cape"
      ? '<path d="M34 52 L22 118 Q50 126 78 118 L66 52 Z" fill="#c92a2a"/><path d="M34 52 L28 116" stroke="#a51111" stroke-width="2"/>'
      : "";
    return (
      '<svg viewBox="' + (opts.viewBox || "0 0 100 140") + '" xmlns="http://www.w3.org/2000/svg"' +
      (opts.className ? ' class="' + opts.className + '"' : "") + ' role="img" aria-label="Your player">' +
      cape +
      // legs and shorts
      '<rect x="38" y="92" width="9" height="30" rx="4" fill="' + skin + '"/>' +
      '<rect x="53" y="92" width="9" height="30" rx="4" fill="' + skin + '"/>' +
      '<path d="M34 84 H66 L64 102 H52 L50 96 L48 102 H36 Z" fill="' + jersey + '" stroke="' + trim + '" stroke-width="1.5"/>' +
      // shoes
      '<path d="M33 121 H48 Q50 121 50 125 V128 H31 Q30 123 33 121 Z" fill="' + shoes + '" stroke="#495057" stroke-width="1.5"/>' +
      '<path d="M52 121 H67 Q70 123 69 128 H50 V125 Q50 121 52 121 Z" fill="' + shoes + '" stroke="#495057" stroke-width="1.5"/>' +
      // arms
      '<rect x="18" y="56" width="9" height="30" rx="4.5" fill="' + skin + '"/>' +
      '<rect x="73" y="56" width="9" height="30" rx="4.5" fill="' + skin + '"/>' +
      // jersey
      '<path d="M30 52 Q50 46 70 52 L74 62 L68 64 L66 88 H34 L32 64 L26 62 Z" fill="' + jersey + '" stroke="' + trim + '" stroke-width="1.5"/>' +
      '<path d="M42 50 Q50 60 58 50" fill="none" stroke="' + trim + '" stroke-width="2"/>' +
      '<text x="50" y="80" text-anchor="middle" font-family="Trebuchet MS, sans-serif" font-weight="900" font-size="15" fill="' + trim + '">10</text>' +
      extraFront(look.extra) +
      // neck and head
      '<rect x="45" y="44" width="10" height="8" fill="' + skin + '"/>' +
      '<circle cx="50" cy="32" r="18" fill="' + skin + '"/>' +
      '<path d="M32 30 Q33 13 50 13 Q67 13 68 30 Q60 21 50 22 Q40 21 32 30 Z" fill="#3b2a20"/>' +
      '<circle cx="43" cy="37" r="2.2" fill="#212529"/><circle cx="57" cy="37" r="2.2" fill="#212529"/>' +
      '<path d="M44 43 Q50 48 56 43" fill="none" stroke="#212529" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="39" cy="42" r="2.5" fill="#ff8787" opacity="0.35"/><circle cx="61" cy="42" r="2.5" fill="#ff8787" opacity="0.35"/>' +
      glassesSvg(look.glasses) +
      hatSvg(look.hat) +
      "</svg>"
    );
  }

  // A small picture of one item for the shop card.
  function itemPreview(it) {
    if (it.slot === "skin") return '<span class="swatch" style="background:' + it.color + '"></span>';
    var look = { skin: "skin-2", jersey: "jersey-orange", shoes: "shoes-white", hat: null, glasses: null, extra: null };
    look[it.slot] = it.id;
    var views = { hat: "20 0 60 52", glasses: "24 14 52 40", shoes: "26 104 48 28", jersey: "14 40 72 70", extra: "10 40 80 90" };
    return svg(look, { className: "item-svg", viewBox: views[it.slot] });
  }

  var api = {
    SLOTS: SLOTS, ITEMS: ITEMS, TIERS: TIERS, tierFor: tierFor, DEFAULT_LOOK: DEFAULT_LOOK,
    item: item, itemsFor: itemsFor, normalise: normalise, owns: owns,
    buy: buy, equip: equip, svg: svg, itemPreview: itemPreview
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Avatar = api;
})(this);
