(function () {
  "use strict";

  var CFG = window.BOTTLE_CONFIG;
  var KEY_AUTH = "bottle.auth";
  var KEY_LOG = "bottle.log";

  // ---------- storage helpers (fail quietly in private mode) ----------
  function load(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  // ---------- date helpers ----------
  function todayKey(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function atTime(hhmm, base) {
    var parts = hhmm.split(":");
    var d = new Date(base || Date.now());
    d.setHours(+parts[0], +parts[1], 0, 0);
    return d;
  }
  function fmt(d) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  function pad(n) { return String(n).padStart(2, "0"); }

  // ---------- password ----------
  async function sha256(text) {
    var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
  }

  var lockEl = document.getElementById("lock");
  var appEl = document.getElementById("app");

  function unlock() {
    lockEl.hidden = true;
    appEl.hidden = false;
    render();
  }

  document.getElementById("lock-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var input = document.getElementById("password");
    var hash = await sha256(input.value.trim());
    if (hash === CFG.passwordHash) {
      save(KEY_AUTH, CFG.passwordHash);
      input.value = "";
      unlock();
    } else {
      document.getElementById("lock-error").hidden = false;
      input.select();
    }
  });

  document.getElementById("logout").addEventListener("click", function () {
    try { localStorage.removeItem(KEY_AUTH); } catch (e) {}
    appEl.hidden = true;
    lockEl.hidden = false;
  });

  // ---------- feeding log ----------
  // Stored as { day: "2026-10-10", feeds: [timestamp, ...] }
  function getLog() {
    var log = load(KEY_LOG, null);
    if (!log || log.day !== todayKey()) log = { day: todayKey(), feeds: [] };
    return log;
  }

  function addFeed(date) {
    var log = getLog();
    log.feeds.push(date.getTime());
    log.feeds.sort(function (a, b) { return a - b; });
    save(KEY_LOG, log);
    render();
  }

  function removeFeed(ts) {
    var log = getLog();
    log.feeds = log.feeds.filter(function (t) { return t !== ts; });
    save(KEY_LOG, log);
    render();
  }

  // Upcoming bottles: every N hours after the latest feeding, up to the cutoff.
  function schedule() {
    var feeds = getLog().feeds;
    if (!feeds.length) return [];
    var last = new Date(feeds[feeds.length - 1]);
    var cutoff = atTime(CFG.cutoff, last);
    var out = [];
    for (var i = 1; i < 24; i++) {
      var t = new Date(last.getTime() + i * CFG.intervalHours * 3600 * 1000);
      if (t > cutoff) break;
      out.push(t);
    }
    return out;
  }

  // ---------- rendering ----------
  function render() {
    var log = getLog();
    var upcoming = schedule();
    var now = Date.now();

    var sched = document.getElementById("schedule");
    sched.innerHTML = "";
    upcoming.forEach(function (t) {
      var li = document.createElement("li");
      li.textContent = fmt(t);
      if (t.getTime() < now) li.className = "past";
      sched.appendChild(li);
    });
    document.getElementById("empty").hidden = log.feeds.length > 0;
    if (log.feeds.length && !upcoming.length) {
      document.getElementById("empty").hidden = false;
      document.getElementById("empty").textContent = "No more bottles before " + fmt(atTime(CFG.cutoff)) + ".";
    } else {
      document.getElementById("empty").textContent = "Log the first feeding to see the schedule.";
    }

    var logEl = document.getElementById("log");
    logEl.innerHTML = "";
    log.feeds.forEach(function (ts) {
      var li = document.createElement("li");
      var span = document.createElement("span");
      span.textContent = fmt(new Date(ts));
      var del = document.createElement("button");
      del.className = "link danger";
      del.textContent = "Remove";
      del.addEventListener("click", function () { removeFeed(ts); });
      li.appendChild(span);
      li.appendChild(del);
      logEl.appendChild(li);
    });

    tick();
  }

  function tick() {
    var next = schedule().find(function (t) { return t.getTime() > Date.now(); });
    var cd = document.getElementById("countdown");
    var label = document.getElementById("next-label");
    var nextTime = document.getElementById("next-time");
    var card = cd.parentElement;

    if (!next) {
      var overdue = schedule().filter(function (t) { return t.getTime() <= Date.now(); }).pop();
      if (overdue) {
        var late = Math.floor((Date.now() - overdue.getTime()) / 1000);
        label.textContent = "Bottle due";
        cd.textContent = "+" + Math.floor(late / 3600) + ":" + pad(Math.floor(late / 60) % 60) + ":" + pad(late % 60);
        nextTime.textContent = "Was due at " + fmt(overdue);
        card.classList.add("due");
      } else {
        label.textContent = "Next bottle";
        cd.textContent = "--:--:--";
        nextTime.textContent = getLog().feeds.length ? "Done for today" : "";
        card.classList.remove("due");
      }
      return;
    }

    // If an earlier slot passed without a logged feeding, show it as due.
    var missed = schedule().filter(function (t) { return t.getTime() <= Date.now(); }).pop();
    if (missed) {
      var s2 = Math.floor((Date.now() - missed.getTime()) / 1000);
      label.textContent = "Bottle due";
      cd.textContent = "+" + Math.floor(s2 / 3600) + ":" + pad(Math.floor(s2 / 60) % 60) + ":" + pad(s2 % 60);
      nextTime.textContent = "Was due at " + fmt(missed);
      card.classList.add("due");
      return;
    }

    var s = Math.max(0, Math.floor((next.getTime() - Date.now()) / 1000));
    label.textContent = "Next bottle";
    cd.textContent = Math.floor(s / 3600) + ":" + pad(Math.floor(s / 60) % 60) + ":" + pad(s % 60);
    nextTime.textContent = "at " + fmt(next);
    card.classList.remove("due");
  }

  // ---------- form ----------
  var timeInput = document.getElementById("feed-time");
  function setNow() {
    var d = new Date();
    timeInput.value = pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  document.getElementById("now").addEventListener("click", setNow);

  document.getElementById("feed-form").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!timeInput.value) return;
    addFeed(atTime(timeInput.value));
    setNow();
  });

  document.getElementById("reset").addEventListener("click", function () {
    if (confirm("Clear all of today's feedings?")) {
      save(KEY_LOG, { day: todayKey(), feeds: [] });
      render();
    }
  });

  // ---------- start ----------
  setNow();
  setInterval(function () {
    if (appEl.hidden) return;
    if (getLog().day !== todayKey()) render(); else tick();
  }, 1000);

  if (load(KEY_AUTH, null) === CFG.passwordHash) unlock();
})();
