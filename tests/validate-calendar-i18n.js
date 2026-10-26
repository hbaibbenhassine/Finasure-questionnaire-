"use strict";

const assert = require("assert");

const expectedArabicMonths = [
  "جانفي",
  "فيفري",
  "مارس",
  "أفريل",
  "ماي",
  "جوان",
  "جويلية",
  "أوت",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر"
];

const formatter = new Intl.DateTimeFormat("ar-TN", { month: "long" });
const actualArabicMonths = Array.from({ length: 12 }, (_, month) =>
  formatter.format(new Date(2026, month, 1))
);

assert.deepStrictEqual(actualArabicMonths, expectedArabicMonths, "Les 12 mois arabes tunisiens doivent être dans le bon ordre.");
assert.strictEqual(new Set(actualArabicMonths).size, 12, "Chaque mois doit avoir un libellé distinct.");

for (let month = 0; month < 12; month += 1) {
  const firstDay = new Date(2026, month, 1);
  const leadingMondayCells = (firstDay.getDay() + 6) % 7;
  const numberOfDays = new Date(2026, month + 1, 0).getDate();
  assert(leadingMondayCells >= 0 && leadingMondayCells <= 6, `Décalage invalide pour le mois ${month + 1}.`);
  assert(leadingMondayCells + numberOfDays <= 42, `Grille invalide pour le mois ${month + 1}.`);
}

console.log("Calendrier valide : 12 mois ar-TN et alignement lundi-dimanche contrôlés.");
