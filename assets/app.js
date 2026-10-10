(function () {
  "use strict";

  var CFG = window.BOTTLE_CONFIG;
  // Separate key from the pump site, since both may live on the same github.io domain.
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
  function hms(totalSeconds) {
    return Math.floor(totalSeconds / 3600) + ":" +
      pad(Math.floor(totalSeconds / 60) % 60) + ":" + pad(totalSeconds % 60);
  }

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

    var empty = document.getElementById("empty");
    if (!log.feeds.length) {
      empty.hidden = false;
      empty.textContent = "Log the first feeding to see the schedule.";
    } else if (!upcoming.length) {
      empty.hidden = false;
      empty.textContent = "No more bottles before " + fmt(atTime(CFG.cutoff)) + ".";
    } else {
      empty.hidden = true;
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
    var times = schedule();
    var now = Date.now();
    var cd = document.getElementById("countdown");
    var label = document.getElementById("next-label");
    var nextTime = document.getElementById("next-time");
    var card = cd.parentElement;

    // A scheduled slot has passed without a newer feeding logged: show it as due.
    var missed = times.filter(function (t) { return t.getTime() <= now; }).pop();
    if (missed) {
      label.textContent = "Bottle due";
      cd.textContent = "+" + hms(Math.floor((now - missed.getTime()) / 1000));
      nextTime.textContent = "Was due at " + fmt(missed);
      card.classList.add("due");
      return;
    }

    var next = times.find(function (t) { return t.getTime() > now; });
    card.classList.remove("due");
    label.textContent = "Next bottle";
    if (!next) {
      cd.textContent = "--:--:--";
      nextTime.textContent = getLog().feeds.length ? "Done for today" : "";
      return;
    }
    cd.textContent = hms(Math.max(0, Math.floor((next.getTime() - now) / 1000)));
    nextTime.textContent = "at " + fmt(next);
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
  var lastDay = todayKey();
  setNow();
  render();
  setInterval(function () {
    if (todayKey() !== lastDay) { lastDay = todayKey(); render(); } else { tick(); }
  }, 1000);
})();
