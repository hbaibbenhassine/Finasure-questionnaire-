"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const publicPages = [
  "index.html",
  "questionnaire.html",
  "resultats.html",
  "rapport-complet.html",
  "rendez-vous.html",
  "verification-email.html",
  "demande-rapport.html",
  "demande-rapport-confirmee.html"
];

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "js/i18n/ar.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "js/questionnaire-data.js"), "utf8"), context);

const catalog = context.window.FINASURE_I18N_CATALOGS.ar;
const data = context.window.FINASURE_ERM_DATA;

assert(catalog && Object.keys(catalog).length > 100, "Le catalogue arabe doit être chargé et suffisamment complet.");
assert.strictEqual(data.questions.length, 22, "Le questionnaire attendu contient 22 questions.");
data.questions.forEach((question) => {
  assert(catalog[question.text], `Traduction arabe manquante pour la question ${question.id}.`);
});
data.dimensions.forEach((dimension) => {
  assert(catalog[dimension.name], `Traduction arabe manquante pour la dimension ${dimension.id}.`);
});

publicPages.forEach((page) => {
  const html = fs.readFileSync(path.join(root, page), "utf8");
  const catalogPosition = html.indexOf("js/i18n/ar.js");
  const runtimePosition = html.indexOf("js/i18n.js");
  assert(catalogPosition >= 0, `${page}: catalogue arabe absent.`);
  assert(runtimePosition > catalogPosition, `${page}: le runtime i18n doit être chargé après le catalogue.`);
  assert(html.includes("css/style.css?v=20261026-1"), `${page}: version CSS i18n absente.`);
});

console.log(`i18n valide : ${publicPages.length} pages, ${data.questions.length} questions et ${data.dimensions.length} dimensions couvertes.`);
