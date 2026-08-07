#!/usr/bin/env node
"use strict";

const { execSync } = require("node:child_process");
const { writeFileSync } = require("node:fs");
const path = require("node:path");

function git(format) {
  return execSync(`git log -1 --format=${format}`, { encoding: "utf8" }).trim();
}

const hash = git("%H");
const shortHash = git("%h");
const message = git("%s").replace(/`/g, "'");
const date = git("%cI");

const info = { hash, shortHash, message, date };

const out = `window.ToplaCommit = ${JSON.stringify(info)};\n`;

writeFileSync(path.join(__dirname, "..", "public", "js", "commit-info.js"), out);
console.log(`public/js/commit-info.js généré (${shortHash})`);
