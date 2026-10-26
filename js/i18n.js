(function () {
  "use strict";

  const STORAGE_KEY = "finasureLanguage";
  const SUPPORTED = Object.freeze(["fr", "ar"]);
  const catalogs = window.FINASURE_I18N_CATALOGS || {};
  const queryLanguage = new URLSearchParams(location.search).get("lang");
  const storedLanguage = (() => {
    try { return localStorage.getItem(STORAGE_KEY); }
    catch { return null; }
  })();
  const browserLanguage = String(navigator.language || "fr").toLowerCase().startsWith("ar") ? "ar" : "fr";
  const locale = SUPPORTED.includes(queryLanguage)
    ? queryLanguage
    : SUPPORTED.includes(storedLanguage)
      ? storedLanguage
      : browserLanguage;

  function rememberLanguage(language) {
    try { localStorage.setItem(STORAGE_KEY, language); }
    catch { /* La langue reste active pour la page courante. */ }
  }

  rememberLanguage(locale);

  function dictionary() {
    return catalogs[locale] || {};
  }

  function interpolate(value, variables) {
    return String(value).replace(/\{(\w+)\}/g, (_, key) =>
      variables?.[key] === undefined ? `{${key}}` : String(variables[key])
    );
  }

  function dynamicTranslation(source) {
    if (locale !== "ar") return source;
    let match = source.match(/^Question (\d+)$/);
    if (match) return `السؤال ${match[1]}`;
    match = source.match(/^Étape (\d+) sur (\d+)$/);
    if (match) return `المرحلة ${match[1]} من ${match[2]}`;
    match = source.match(/^Étape (\d+)$/);
    if (match) return `المرحلة ${match[1]}`;
    match = source.match(/^(\d+) créneaux disponibles$/);
    if (match) return `${match[1]} فترات متاحة`;
    match = source.match(/^Votre score de (.+) sur 5 vous situe au niveau (.+)\.$/);
    if (match) return `نتيجتكم ${match[1]} من 5 تضعكم في مستوى ${translate(match[2])}.`;
    match = source.match(/^(.+) \/ 5 · (.+)$/);
    if (match) return `${match[1]} / 5 · ${translate(match[2])}`;
    match = source.match(/^Poids (.+) % · Indice (.+)$/);
    if (match) return `الوزن ${match[1]}٪ · المؤشر ${match[2]}`;
    match = source.match(/^Nouveau code disponible dans (\d+) s$/);
    if (match) return `يتوفر رمز جديد خلال ${match[1]} ثانية`;
    return source;
  }

  function translate(source, variables) {
    const normalized = String(source ?? "").replace(/\s+/g, " ").trim();
    if (!normalized || locale === "fr") return interpolate(normalized, variables);
    return interpolate(dictionary()[normalized] || dynamicTranslation(normalized), variables);
  }

  function translateTextNode(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest("script,style,textarea,[data-i18n-skip]")) return;
    const raw = node.nodeValue;
    const leading = raw.match(/^\s*/)?.[0] || "";
    const trailing = raw.match(/\s*$/)?.[0] || "";
    const source = raw.trim().replace(/\s+/g, " ");
    if (!source) return;
    const translated = translate(source);
    if (translated !== source) node.nodeValue = `${leading}${translated}${trailing}`;
  }

  function translateAttributes(root) {
    const elements = root.nodeType === Node.ELEMENT_NODE
      ? [root, ...root.querySelectorAll("*")]
      : [...document.querySelectorAll("*")];
    elements.forEach((element) => {
      ["placeholder", "title", "aria-label", "alt"].forEach((attribute) => {
        const value = element.getAttribute?.(attribute);
        if (!value) return;
        const translated = translate(value);
        if (translated !== value) element.setAttribute(attribute, translated);
      });
    });
  }

  function translateTree(root) {
    if (locale === "fr") return;
    const keyedElements = root.nodeType === Node.ELEMENT_NODE
      ? [root, ...root.querySelectorAll("[data-i18n]")]
      : [...document.querySelectorAll("[data-i18n]")];
    keyedElements.forEach((element) => {
      const key = element.getAttribute?.("data-i18n");
      if (key && dictionary()[key]) element.textContent = dictionary()[key];
    });
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateTextNode);
    translateAttributes(root);
    if (document.title) document.title = translate(document.title);
  }

  function localizedUrl(input, language = locale) {
    const url = new URL(input, location.href);
    if (url.origin !== location.origin || !/\.html$/.test(url.pathname)) return input;
    url.searchParams.set("lang", language);
    return `${url.pathname.split("/").pop()}${url.search}${url.hash}`;
  }

  function localizeLinks(root = document) {
    root.querySelectorAll?.("a[href]").forEach((link) => {
      link.href = localizedUrl(link.getAttribute("href"));
    });
  }

  function addSeoLinks() {
    const base = new URL(location.href);
    ["fr", "ar"].forEach((language) => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = language;
      const target = new URL(base);
      target.searchParams.set("lang", language);
      link.href = target.href;
      document.head.append(link);
    });
    const fallback = document.createElement("link");
    fallback.rel = "alternate";
    fallback.hreflang = "x-default";
    const target = new URL(base);
    target.searchParams.delete("lang");
    fallback.href = target.href;
    document.head.append(fallback);

    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = translate(description.content);
    let ogLocale = document.querySelector('meta[property="og:locale"]');
    if (!ogLocale) {
      ogLocale = document.createElement("meta");
      ogLocale.setAttribute("property", "og:locale");
      document.head.append(ogLocale);
    }
    ogLocale.content = locale === "ar" ? "ar_MA" : "fr_FR";
  }

  function addLanguageSwitcher() {
    const header = document.querySelector(".site-header");
    if (!header || header.querySelector(".language-switcher")) return;
    const switcher = document.createElement("div");
    switcher.className = "language-switcher";
    switcher.setAttribute("role", "group");
    switcher.setAttribute("aria-label", locale === "ar" ? "اختيار اللغة" : "Choisir la langue");
    [{ code: "fr", label: "FR" }, { code: "ar", label: "العربية" }].forEach(({ code, label }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.lang = code;
      button.textContent = label;
      button.className = code === locale ? "is-active" : "";
      button.setAttribute("aria-pressed", String(code === locale));
      button.addEventListener("click", () => {
        if (code === locale) return;
        rememberLanguage(code);
        const target = new URL(location.href);
        target.searchParams.set("lang", code);
        location.href = target.href;
      });
      switcher.append(button);
    });
    const nav = header.querySelector(".main-nav");
    header.insertBefore(switcher, nav || null);
  }

  function applyDocumentLanguage() {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.body?.classList.toggle("is-rtl", locale === "ar");
  }

  function formatDate(value, options) {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : "fr-FR", options).format(value);
  }

  function recommendation(dimensionId, fallback) {
    if (locale !== "ar") return fallback;
    return window.FINASURE_I18N_RECOMMENDATIONS_AR?.[dimensionId] || fallback;
  }

  function init() {
    applyDocumentLanguage();
    addLanguageSwitcher();
    translateTree(document.body);
    localizeLinks();
    addSeoLinks();
    const observer = new MutationObserver((mutations) => {
      observer.disconnect();
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
          if (node.nodeType === Node.ELEMENT_NODE) {
            translateTree(node);
            localizeLinks(node);
          }
        });
        if (mutation.type === "characterData") translateTextNode(mutation.target);
        if (mutation.type === "attributes") translateAttributes(mutation.target);
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "title", "aria-label", "alt"] });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "title", "aria-label", "alt"] });
    document.dispatchEvent(new CustomEvent("finasure:language-ready", { detail: { locale } }));
  }

  window.FinasureI18n = Object.freeze({
    locale,
    direction: locale === "ar" ? "rtl" : "ltr",
    isRtl: locale === "ar",
    t: translate,
    formatDate,
    recommendation,
    localizedUrl,
    translate: translateTree
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
