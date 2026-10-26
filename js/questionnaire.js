(function () {
  "use strict";

  const data = window.FINASURE_ERM_DATA;
  const i18n = window.FinasureI18n;
  const t = (value) => i18n?.t(value) || value;
  const state = FinasureStorage.load();
  const list = document.querySelector("#questions-list");
  const form = document.querySelector("#questions-form");
  const message = document.querySelector("#validation-message");
  const previous = document.querySelector("#previous-button");
  const next = document.querySelector("#next-button");
  const actions = document.querySelector(".questionnaire-actions");
  const totalQuestions = data?.questions?.length || 0;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const categoryDetails = Object.freeze({
    "strategie": {
      number: 1,
      title: "Stratégie ",
      description: "Cette catégorie évalue la manière dont les risques sont intégrés dans la définition de la stratégie, des objectifs annuels et dans les décisions budgétaires et d’investissement."
    },
    "gouvernance": {
      number: 2,
      title: "Gouvernance ",
      description: "Cette catégorie porte sur l’organisation de la gouvernance des risques, la fréquence des instances et la clarté des rôles, responsabilités et délégations."
    },
    "culture": {
      number: 3,
      title: "Culture ",
      description: "Cette catégorie évalue l’implication de la direction et la capacité des collaborateurs à faire remonter les risques et alertes dans un environnement approprié."
    },
    "identification-des-risques": {
      number: 4,
      title: "Identification ",
      description: "Cette catégorie examine la capacité de l’organisation à identifier régulièrement ses risques selon une méthode commune et à anticiper les risques émergents."
    },
    "analyse-et-evaluation-des-risques": {
      number: 5,
      title: "Analyse et évaluation des risques",
      description: "Cette catégorie porte sur la méthodologie d’évaluation des risques, l’homogénéité des échelles utilisées et la distinction entre risque brut et risque résiduel."
    },
    "traitement-des-risques": {
      number: 6,
      title: "Traitement des risques",
      description: "Cette catégorie évalue la capacité à définir, financer, suivre et tester les plans de traitement des risques significatifs."
    },
    "revue-et-revision": {
      number: 7,
      title: "Revue et révision",
      description: "Cette catégorie examine la capacité de l’organisation à revoir périodiquement l’efficacité de son dispositif et à intégrer les enseignements tirés des incidents et interruptions."
    },
    "information-et-reporting": {
      number: 8,
      title: "Information et reporting ",
      description: "Cette catégorie évalue la qualité des indicateurs de risque et la capacité à faire remonter l’information critique aux instances de décision dans les délais appropriés."
    },
    "continuite-d-activite-pca-pra": {
      number: 9,
      title: "Continuité d’activité",
      description: "Cette catégorie porte sur la capacité de l’organisation à maintenir ou reprendre ses activités critiques en cas d’interruption, notamment à travers le BIA, les RTO/RPO et les tests."
    },
    "gestion-de-crise-pgc": {
      number: 10,
      title: " gestion de crise",
      description: "Cette catégorie évalue le niveau de préparation de l’organisation à faire face à une crise grâce à un dispositif formalisé, des mécanismes d’alerte et des exercices réguliers."
    },
    "resilience-organisationnelle": {
      number: 11,
      title: "Résilience organisationnelle",
      description: "Cette catégorie examine la capacité de l’organisation à identifier ses dépendances critiques, à anticiper les points de défaillance et à intégrer la résilience dans les décisions structurantes."
    }
  });
  let isTransitioning = false;
  let transitionTimer = null;

  if (!data?.questions || totalQuestions !== 22 || data.steps.length !== 4) {
    showError("Les données du questionnaire sont absentes ou incomplètes.");
    return;
  }

  if (state.questionnaireVersion !== data.version) {
    state.questionnaireVersion = data.version;
    state.currentStep = 1;
    state.answers = {};
    state.comments = {};
    state.results = FinasureStorage.empty().results;
    state.questionnaireCompleted = false;
    state.completedAt = "";
    state.syncKey = "";
    state.syncStatus = "local";
    state.remoteAssessmentId = "";
    state.remoteAccessToken = "";
    FinasureStorage.save(state);
  }

  let step = Math.min(data.steps.length - 1, Math.max(0, state.currentStep - 1));
  const notice = sessionStorage.getItem("finasureNotice");
  if (notice) {
    sessionStorage.removeItem("finasureNotice");
    showError(notice);
  }
  state.startedAt = state.startedAt || new Date().toISOString();

  function createElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function persist() {
    if (!FinasureStorage.save(state)) {
      showError("Impossible d’enregistrer vos réponses pour le moment.");
    }
  }

  function dimensionName(id) {
    return data.dimensions.find((item) => item.id === id)?.name || "Dimension non définie";
  }

  function createQuestionCard(question) {
    const card = createElement("article", "question-card");
    card.dataset.question = String(question.id);

    const meta = createElement(
      "p",
      "question-meta",
      `Question ${question.id}`
    );
    const title = createElement("h2", "question-title", question.text);
    title.id = `question-${question.id}`;

    const group = createElement("fieldset", "answer-grid");
    const legend = createElement(
      "legend",
      "sr-only",
      `Choisissez une réponse pour la question ${question.id}`
    );
    group.append(legend);

    question.answers.forEach((answer) => {
      const wrapper = createElement("div", "answer-option");
      const input = createElement("input");
      const label = createElement("label");
      const answerName = createElement("strong", "answer-name", answer.name);
      const description = createElement(
        "span",
        "answer-description",
        answer.description
      );

      input.type = "radio";
      input.name = `question-${question.id}`;
      input.id = `q${question.id}-${answer.code}`;
      input.value = String(answer.score);
      input.checked = Number(state.answers[question.id]) === answer.score;
      label.htmlFor = input.id;
      label.append(answerName, description);
      wrapper.append(input, label);
      group.append(wrapper);
    });

    card.append(meta, title, group);
    return card;
  }

  function createCategoryHeading(dimensionId) {
    const details = categoryDetails[dimensionId] || {
      number: "",
      title: dimensionName(dimensionId),
      description: ""
    };
    const section = createElement("section", "question-category");
    section.dataset.dimension = dimensionId;
    const heading = createElement("h2", "question-category-title");
    const number = createElement("span", "question-category-number", `${details.number}.`);
    const title = createElement("span", "question-category-name", t(details.title.trim()));
    heading.append(number, document.createTextNode(" "), title);
    const description = createElement(
      "p",
      "question-category-description",
      t(details.description)
    );
    section.append(heading, description);
    return section;
  }

  function render() {
    const [start, end] = data.steps[step];
    const questions = data.questions.filter(
      (question) => question.id >= start && question.id <= end
    );

    document.querySelector("#step-label").textContent =
      `Étape ${step + 1} sur ${data.steps.length}`;

    const indicator = document.querySelector("#step-indicator");
    indicator.replaceChildren(
      ...data.steps.map((_, index) => {
        const stateClass =
          index < step ? "completed" : index === step ? "active" : "future";
        const item = createElement("li", stateClass);
        const marker = createElement(
          "span",
          "step-marker",
          index < step ? "✓" : String(index + 1)
        );
        const label = createElement(
          "span",
          "step-short-label",
          `Étape ${index + 1}`
        );
        marker.setAttribute("aria-hidden", "true");
        item.append(marker, label);
        item.setAttribute("aria-label", `${t(`Étape ${index + 1}`)}, ${t(index < step ? "terminée" : index === step ? "en cours" : "à venir")}`);
        if (index === step) item.setAttribute("aria-current", "step");
        return item;
      })
    );

    const fragment = document.createDocumentFragment();
    let currentDimension = "";
    questions.forEach((question) => {
      if (question.dimensionId !== currentDimension) {
        currentDimension = question.dimensionId;
        fragment.append(createCategoryHeading(currentDimension));
      }
      fragment.append(createQuestionCard(question));
    });
    list.replaceChildren(fragment);

    previous.hidden = false;
    previous.disabled = step === 0;
    previous.setAttribute("aria-disabled", String(step === 0));
    const isFinalStep = step === data.steps.length - 1;
    next.hidden = false;
    next.textContent = isFinalStep ? "Vos résultats →" : "Suivant →";
    actions.hidden = false;
    state.currentStep = step + 1;
    persist();
    updateProgress();
    message.hidden = true;
  }

  function updateProgress() {
    const completed = data.questions.filter((question) => {
      const answer = Number(state.answers[question.id]);
      return answer >= 1 && answer <= 5;
    }).length;
    const percent = Math.round((completed / totalQuestions) * 100);

    document.querySelector("#progress-percent").textContent = `${percent} %`;
    document.querySelector("#progress-bar").style.width = `${percent}%`;
    document
      .querySelector(".progress-track")
      .setAttribute("aria-valuenow", String(completed));
  }

  function scrollToTarget(target) {
    if (!target) return;
    requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "start"
      });
    });
  }

  function releaseTransition() {
    window.setTimeout(() => {
      isTransitioning = false;
    }, reducedMotion.matches ? 0 : 400);
  }

  function cancelTransition() {
    window.clearTimeout(transitionTimer);
    transitionTimer = null;
    isTransitioning = false;
  }

  function handleAnswerSelection(questionId) {
    if (window.matchMedia("(min-width: 801px)").matches) return;
    if (isTransitioning) return;

    const [start, end] = data.steps[step];
    if (questionId < start || questionId > end) return;

    isTransitioning = true;
    window.clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(() => {
      if (questionId < end) {
        scrollToTarget(
          document.querySelector(`[data-question="${questionId + 1}"]`)
        );
        releaseTransition();
        return;
      }

      if (step < data.steps.length - 1) {
        const stepComplete = data.questions
          .filter((question) => question.id >= start && question.id <= end)
          .every((question) => {
            const answer = Number(state.answers[question.id]);
            return answer >= 1 && answer <= 5;
          });

        if (stepComplete) {
          step += 1;
          render();
          scrollToTarget(list.querySelector(".question-category"));
        }
        releaseTransition();
        return;
      }

      // La dernière réponse reste soumise par l’action finale existante.
      scrollToTarget(document.querySelector(".questionnaire-actions"));
      releaseTransition();
    }, reducedMotion.matches ? 0 : 250);
  }

  function showError(text) {
    const box = document.querySelector("#app-error");
    box.textContent = text;
    box.hidden = false;
  }

  form.addEventListener("change", (event) => {
    if (!event.target.matches('input[type="radio"]')) return;
    const id = event.target.name.replace("question-", "");
    state.answers[id] = Number(event.target.value);
    event.target.closest(".question-card").classList.remove("unanswered");
    persist();
    updateProgress();
    handleAnswerSelection(Number(id));
  });

  previous.addEventListener("click", () => {
    cancelTransition();
    if (step > 0) {
      step -= 1;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    cancelTransition();
    const [start, end] = data.steps[step];
    const missing = [];

    for (let id = start; id <= end; id += 1) {
      if (!state.answers[id]) missing.push(id);
    }

    document.querySelectorAll(".question-card").forEach((card) => {
      card.classList.toggle(
        "unanswered",
        missing.includes(Number(card.dataset.question))
      );
    });

    if (missing.length) {
      message.hidden = false;
      document
        .querySelector(`[data-question="${missing[0]}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (step < data.steps.length - 1) {
      step += 1;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      state.results = FinasureCalcul.calculate(data, state.answers);
      state.questionnaireCompleted = true;
      state.completedAt = new Date().toISOString();
      persist();
      location.href = i18n?.localizedUrl("resultats.html") || "resultats.html";
    } catch (error) {
      showError(error.message);
    }
  });

  render();
})();
