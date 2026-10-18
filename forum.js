// The SnapOS forum, read only: topics come from the forum repo's Discussions,
// copied as plain text. Everything a writer sent goes in with textContent.
(function () {
  "use strict";
  // the API serves the newest copy (60 s cache); raw.githubusercontent.com is the fallback
  var API = "https://api.github.com/repos/snapos-distro/forum/contents/forum.json?ref=forum-data";
  var RAW = "https://raw.githubusercontent.com/snapos-distro/forum/forum-data/forum.json";
  var GH = "https://github.com/snapos-distro/forum/discussions";
  var LOGIN = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
  var AVATAR = /^https:\/\/avatars\.githubusercontent\.com\//;
  var root = document.getElementById("forum");
  var data = null;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    return e;
  }
  function link(href, text, cls) {
    var a = el("a", cls, text);
    if (/^https:\/\//.test(href) || /^#/.test(href)) a.href = href;
    if (/^https:\/\//.test(href)) a.rel = "noopener nofollow";
    return a;
  }
  function ago(stamp) {
    var t = Date.parse(stamp);
    if (!t) return "";
    var s = Math.max(0, (Date.now() - t) / 1000);
    var units = [[31536000, "year"], [2592000, "month"], [86400, "day"], [3600, "hour"], [60, "minute"]];
    for (var i = 0; i < units.length; i++) {
      var n = Math.floor(s / units[i][0]);
      if (n >= 1) return n + " " + units[i][1] + (n > 1 ? "s" : "") + " ago";
    }
    return "just now";
  }
  function person(p) {
    var box = el("span", "who");
    var login = p && LOGIN.test(p.login) ? p.login : "ghost";
    if (p && AVATAR.test(p.avatar || "")) {
      var img = el("img");
      img.src = p.avatar;
      img.alt = "";
      img.loading = "lazy";
      box.appendChild(img);
    }
    box.appendChild(link("https://github.com/" + login, login));
    return box;
  }
  // plain text with its line breaks; web addresses become links, nothing else
  function body(text) {
    var div = el("div", "post-text");
    String(text || "").split(/(https?:\/\/[^\s<>"']+)/).forEach(function (part, i) {
      if (i % 2) div.appendChild(link(part.replace(/^http:/, "https:"), part));
      else div.appendChild(document.createTextNode(part));
    });
    return div;
  }
  function categoryName(slug) {
    var c = (data.categories || []).filter(function (x) { return x.slug === slug; })[0];
    return c ? c.name : "";
  }
  function bar() {
    var b = el("div", "forum-bar");
    b.appendChild(link(GH + "/new/choose", "New topic", "btn"));
    b.appendChild(link(GH, "Open on GitHub", "btn ghost"));
    return b;
  }

  function list(filter) {
    root.textContent = "";
    root.appendChild(bar());
    var tabs = el("div", "forum-tabs");
    tabs.appendChild(link("#", "All", filter ? "" : "on"));
    (data.categories || []).forEach(function (c) {
      tabs.appendChild(link("#c/" + c.slug, c.name, filter === c.slug ? "on" : ""));
    });
    root.appendChild(tabs);
    var topics = (data.topics || []).filter(function (t) { return !filter || t.category === filter; });
    if (!topics.length) {
      var empty = el("p", "forum-empty", "No topics here yet. ");
      empty.appendChild(link(GH + "/new/choose", "Start one on GitHub"));
      root.appendChild(empty);
      return;
    }
    var table = el("div", "forum-list");
    topics.forEach(function (t) {
      var row = el("div", "topic");
      var main = el("div", "topic-main");
      main.appendChild(link("#t/" + t.number, t.title, "topic-title"));
      var meta = el("div", "topic-meta");
      var cat = categoryName(t.category);
      if (cat) meta.appendChild(el("span", "tag", cat));
      if (t.answered) meta.appendChild(el("span", "tag ok", "Answered"));
      meta.appendChild(person(t.author));
      meta.appendChild(el("span", "", "· " + ago(t.updated)));
      main.appendChild(meta);
      row.appendChild(main);
      row.appendChild(el("div", "topic-count", t.replies + (t.replies === 1 ? " reply" : " replies")));
      table.appendChild(row);
    });
    root.appendChild(table);
  }

  function post(p, cls) {
    var box = el("div", "post " + (cls || ""));
    var head = el("div", "post-head");
    head.appendChild(person(p.author));
    head.appendChild(el("span", "", "· " + ago(p.at || p.created)));
    if (p.answer) head.appendChild(el("span", "tag ok", "Answer"));
    box.appendChild(head);
    box.appendChild(body(p.text));
    return box;
  }

  function topic(number) {
    var t = (data.topics || []).filter(function (x) { return x.number === number; })[0];
    root.textContent = "";
    root.appendChild(link("#", "← All topics", "back"));
    if (!t) { root.appendChild(el("p", "forum-empty", "This topic is not here (yet).")); return; }
    root.appendChild(el("h2", "topic-h", t.title));
    var cat = categoryName(t.category);
    if (cat) root.appendChild(el("span", "tag", cat));
    root.appendChild(post(t, "first"));
    (t.comments || []).forEach(function (c) {
      root.appendChild(post(c));
      (c.replies || []).forEach(function (r) { root.appendChild(post(r, "reply")); });
    });
    var write = el("div", "forum-bar");
    write.appendChild(link(GH + "/" + t.number, "Reply on GitHub", "btn"));
    root.appendChild(write);
  }

  function route() {
    if (!data) return;
    var h = location.hash;
    var m = /^#t\/(\d{1,9})$/.exec(h);
    if (m) return topic(parseInt(m[1], 10));
    m = /^#c\/([a-z0-9-]{1,60})$/.exec(h);
    list(m ? m[1] : "");
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", route);
  function get(url, headers) {
    return fetch(url, { headers: headers || {}, cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  get(API, { Accept: "application/vnd.github.raw+json" })
    .catch(function () { return get(RAW); })
    .then(function (d) { data = d && typeof d === "object" ? d : { topics: [] }; route(); })
    .catch(function () {
      root.textContent = "";
      root.appendChild(bar());
      root.appendChild(el("p", "forum-empty", "The forum could not be loaded right now. It is on GitHub too."));
    });
})();
