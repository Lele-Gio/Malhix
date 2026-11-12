/* ===========================================================
   MALHIX — INTERAÇÕES DO PORTAL (SEM DEPENDÊNCIAS EXTERNAS)
   Este é um protótipo para estudo. Leia e adapte antes de entregar.
   =========================================================== */
 
"use strict";
 
document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const body = document.body;
  const main = $("#conteudo-principal");
  const menu = $("#menu-lateral");
  const botaoMenu = $("#botao-menu");
  const menuFundo = $("#menu-fundo");
  const mobile = window.matchMedia("(max-width: 820px)");
  const paginaIds = new Set(["inicio", "conteudo", "atividades", "quizzes", "ia", "contato", "configuracoes"]);
 
  // Se o navegador não disponibilizar armazenamento local, o site continua funcionando.
  const store = {
    read(key, fallback = null) {
      try { const raw = localStorage.getItem("malhix-" + key); return raw === null ? fallback : JSON.parse(raw); }
      catch { return fallback; }
    },
    write(key, value) {
      try { localStorage.setItem("malhix-" + key, JSON.stringify(value)); return true; }
      catch { return false; }
    },
    erase(key) { try { localStorage.removeItem("malhix-" + key); } catch {} }
  };
 
  let toastTimeout;
  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { el.hidden = true; }, 3300);
  }
 
  // -----------------------------------------------------------
  // NAVEGAÇÃO: todas as seções pertencem à mesma página HTML.
  // -----------------------------------------------------------
  let activePage = "inicio";
  function pageFromHash() {
    const value = decodeURIComponent(location.hash.slice(1)).toLowerCase();
    return paginaIds.has(value) ? value : "inicio";
  }
  function updateMenuAccess() {
    const open = mobile.matches
      ? body.classList.contains("menu-mobile-aberto")
      : !body.classList.contains("menu-recolhido");
    botaoMenu.setAttribute("aria-expanded", String(open));
    botaoMenu.setAttribute("aria-label", open ? "Recolher menu" : "Expandir menu");
    menuFundo.hidden = !(mobile.matches && open);
    if (mobile.matches && !open) menu.setAttribute("inert", "");
    else menu.removeAttribute("inert");
  }
  function closeMobileMenu() { body.classList.remove("menu-mobile-aberto"); updateMenuAccess(); }
 
  function showPage(page, scrollToTop = true) {
    if (!paginaIds.has(page)) page = "inicio";
    activePage = page;
    $$("[data-panel]").forEach(panel => { panel.hidden = panel.dataset.panel !== page; });
    $$(".nav-button").forEach(button => {
      const isActive = button.dataset.page === page;
      button.classList.toggle("ativo", isActive);
      if (isActive) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    $$(".header-links [data-page]").forEach(button => {
      button.classList.toggle("selected", button.dataset.page === page);
    });
    closeMobileMenu();
    if (scrollToTop) main.scrollTo({ top: 0, behavior: "instant" });
  }
  function goTo(page) {
    const requested = paginaIds.has(page) ? page : "inicio";
    if (location.hash === "#" + requested) showPage(requested);
    else location.hash = requested; // permite retornar usando Voltar do navegador
  }
  window.addEventListener("hashchange", () => showPage(pageFromHash()));
  document.addEventListener("click", event => {
    const pageButton = event.target.closest("[data-page]");
    if (pageButton) { event.preventDefault(); goTo(pageButton.dataset.page); return; }
    const scrollButton = event.target.closest("[data-scroll]");
    if (scrollButton) {
      const target = document.getElementById(scrollButton.dataset.scroll);
      if (target) main.scrollTo({ top: target.offsetTop - $("#page-conteudo").offsetTop - 12, behavior: "smooth" });
    }
  });
  botaoMenu.addEventListener("click", () => {
    if (mobile.matches) body.classList.toggle("menu-mobile-aberto");
    else body.classList.toggle("menu-recolhido");
    updateMenuAccess();
  });
  menuFundo.addEventListener("click", closeMobileMenu);
  window.addEventListener("keydown", e => {
    if (e.key === "Escape" && mobile.matches && body.classList.contains("menu-mobile-aberto")) {
      closeMobileMenu(); botaoMenu.focus();
    }
  });
  mobile.addEventListener("change", closeMobileMenu);
  showPage(pageFromHash());
  updateMenuAccess();
 
  // -----------------------------------------------------------
  // ATIVIDADES — exibir resposta e salvar conclusão.
  // -----------------------------------------------------------
  const activityKeys = $$('[data-activity]').map(card => card.dataset.activity);
  let finished = store.read("atividades", []);
  if (!Array.isArray(finished)) finished = [];
  finished = finished.filter(key => activityKeys.includes(key));
 
  function updateProgress() {
    $$("[data-activity]").forEach(card => {
      const done = finished.includes(card.dataset.activity);
      card.classList.toggle("done", done);
      $(".activity-check", card).textContent = done ? "✓ Concluída" : "○ Pendente";
      const button = $(".mark-activity", card);
      button.textContent = done ? "Desmarcar conclusão" : "Marcar como concluída";
    });
    const n = finished.length;
    const total = activityKeys.length || 1;
    $("#atividades-contagem").textContent = `${n}/${total}`;
    $("#home-atividade-total").textContent = `${n}/${total}`;
    $("#atividades-progresso").style.width = `${(n / total) * 100}%`;
    const best = store.read("melhor-nota", null);
    $("#home-melhor-nota").textContent = typeof best === "number" ? `${best}%` : "—";
  }
  $("#page-atividades").addEventListener("click", e => {
    const reveal = e.target.closest(".reveal-answer");
    if (reveal) {
      const answer = $(".answer", reveal.closest("[data-activity]"));
      answer.hidden = !answer.hidden;
      reveal.setAttribute("aria-expanded", String(!answer.hidden));
      reveal.textContent = answer.hidden ? "Ver resolução" : "Ocultar resolução";
    }
    const mark = e.target.closest(".mark-activity");
    if (mark) {
      const key = mark.closest("[data-activity]").dataset.activity;
      finished = finished.includes(key) ? finished.filter(item => item !== key) : [...finished, key];
      store.write("atividades", finished);
      updateProgress();
      toast(finished.includes(key) ? "Atividade marcada como concluída!" : "Conclusão desmarcada.");
    }
  });
  updateProgress();
 
  // -----------------------------------------------------------
  // QUESTÕES — dados para o quiz rápido e o simulado.
  // -----------------------------------------------------------
  const questions = [
    { q: "Em um resistor de 5 Ω atravessado por corrente de 2 A, qual é a tensão?", options: ["2,5 V", "7 V", "10 V", "12 V"], correct: 2, why: "Pela Lei de Ohm, V = R · I = 5 · 2 = 10 V." },
    { q: "Qual componente armazena energia em campo elétrico?", options: ["Indutor", "Capacitor", "Diodo", "Relé"], correct: 1, why: "O capacitor armazena energia em um campo elétrico entre suas placas." },
    { q: "O indutor se opõe principalmente à variação de qual grandeza?", options: ["Temperatura", "Corrente elétrica", "Potência", "Resistência"], correct: 1, why: "O indutor reage a variações de corrente, gerando uma tensão induzida que se opõe à mudança." },
    { q: "Dois resistores de 3 Ω e 7 Ω em série têm resistência equivalente igual a:", options: ["10 Ω", "4 Ω", "21 Ω", "2,1 Ω"], correct: 0, why: "Em série, as resistências se somam: 3 + 7 = 10 Ω." },
    { q: "Qual é a principal função de um diodo retificador?", options: ["Armazenar energia", "Permitir condução preferencial em um sentido", "Aumentar resistência", "Medir frequência"], correct: 1, why: "O diodo é muito usado para retificação porque conduz principalmente em um único sentido." },
    { q: "Os transistores bipolares de junção podem atuar como:", options: ["Somente resistores", "Amplificadores e chaves", "Apenas fontes", "Somente fusíveis"], correct: 1, why: "TBJs são usados tanto para amplificação quanto para chaveamento eletrônico." },
    { q: "Qual alternativa descreve melhor a corrente alternada (CA)?", options: ["Mantém sempre o mesmo sentido", "Varia periodicamente de valor e sentido", "Não pode ser medida", "Existe só em baterias"], correct: 1, why: "Na corrente alternada, o valor e o sentido variam periodicamente." },
    { q: "A Lei dos Nós de Kirchhoff está ligada à conservação de:", options: ["Energia", "Carga elétrica", "Massa", "Frequência"], correct: 1, why: "A soma das correntes que entram e saem de um nó decorre da conservação da carga elétrica." },
    { q: "Se um equipamento opera com 10 V e 3 A, sua potência é:", options: ["3 W", "13 W", "30 W", "0,3 W"], correct: 2, why: "Potência elétrica: P = V · I = 10 · 3 = 30 W." },
    { q: "Em um divisor de tensão, a finalidade principal é:", options: ["Gerar frequência", "Obter uma tensão menor a partir de outra maior", "Retificar corrente", "Criar curto-circuito"], correct: 1, why: "Divisores de tensão são usados para reduzir e ajustar níveis de tensão." },
    { q: "Qual instrumento é mais usado para medir tensão, corrente e resistência?", options: ["Osciloscópio", "Multímetro", "Transformador", "Disjuntor"], correct: 1, why: "O multímetro é o instrumento básico para essas medições." },
    { q: "Fusíveis e disjuntores têm como objetivo principal:", options: ["Amplificar sinais", "Armazenar carga", "Proteger o circuito contra falhas", "Aumentar a frequência"], correct: 2, why: "Esses dispositivos interrompem ou limitam a corrente em condições anormais, protegendo o sistema." }
  ];
 
  // -----------------------------------------------------------
  // QUIZ RÁPIDO — uma pergunta por vez, com correção.
  // -----------------------------------------------------------
  const quizApp = $("#quiz-app");
  let quiz = null;
  const escapeHtml = str => String(str).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  function quizStart() { quiz = { index: 0, score: 0, selected: null, checked: false, list: questions.slice(0, 6) }; renderQuiz(); }
  function renderQuiz() {
    if (!quiz) return;
    if (quiz.index >= quiz.list.length) {
      const percent = Math.round(100 * quiz.score / quiz.list.length);
      saveBest(percent);
      quizApp.innerHTML = `<div class="start-state"><span class="test-emblem"><svg class="icon"><use href="#i-check"/></svg></span><h2>Quiz concluído!</h2><div class="result-score">${quiz.score}/${quiz.list.length}</div><p>Você acertou ${percent}% das perguntas. Revise as explicações e tente novamente para continuar aprendendo.</p><button class="btn btn-primary" type="button" data-quiz-action="restart">Refazer quiz <svg class="icon"><use href="#i-refresh"/></svg></button></div>`;
      return;
    }
    const question = quiz.list[quiz.index];
    const options = question.options.map((opt, idx) => {
      const classes = ["option"];
      if (quiz.selected === idx) classes.push("selected");
      if (quiz.checked && idx === question.correct) classes.push("correct");
      else if (quiz.checked && idx === quiz.selected && idx !== question.correct) classes.push("incorrect");
      return `<button type="button" class="${classes.join(" ")}" data-choice="${idx}" ${quiz.checked ? "disabled" : ""}><span class="option-marker">${"ABCD"[idx]}</span>${escapeHtml(opt)}</button>`;
    }).join("");
    const result = quiz.checked
      ? `<div class="feedback ${quiz.selected === question.correct ? "good" : ""}"><strong>${quiz.selected === question.correct ? "Muito bem!" : "Vamos entender."}</strong><br>${escapeHtml(question.why)}</div>`
      : "";
    quizApp.innerHTML = `<div class="question-head"><span>QUESTÃO ${quiz.index + 1} DE ${quiz.list.length}</span><span>${quiz.score} ponto(s)</span></div><div class="progress-track"><div class="progress-fill" style="width:${(quiz.index / quiz.list.length) * 100}%"></div></div><h2 class="question-title">${escapeHtml(question.q)}</h2><div class="options">${options}</div>${result}<div class="quiz-actions">${quiz.checked ? `<button type="button" class="btn btn-primary" data-quiz-action="next">${quiz.index === quiz.list.length - 1 ? "Ver resultado" : "Próxima questão"} →</button>` : `<button type="button" class="btn btn-primary" data-quiz-action="check" ${quiz.selected === null ? "disabled" : ""}>Conferir resposta</button>`}</div>`;
  }
  quizApp.addEventListener("click", e => {
    if (e.target.closest("#iniciar-quiz") || e.target.closest('[data-quiz-action="restart"]')) { quizStart(); return; }
    if (!quiz) return;
    const option = e.target.closest("[data-choice]");
    if (option && !quiz.checked) { quiz.selected = Number(option.dataset.choice); renderQuiz(); return; }
    const act = e.target.closest("[data-quiz-action]");
    if (!act) return;
    if (act.dataset.quizAction === "check" && quiz.selected !== null && !quiz.checked) {
      quiz.checked = true;
      if (quiz.selected === quiz.list[quiz.index].correct) quiz.score++;
      renderQuiz();
    } else if (act.dataset.quizAction === "next" && quiz.checked) {
      quiz.index++; quiz.selected = null; quiz.checked = false; renderQuiz();
    }
  });
  function saveBest(percent) {
    const prev = store.read("melhor-nota", null);
    if (typeof prev !== "number" || percent > prev) store.write("melhor-nota", percent);
    updateProgress();
  }
 
  // -----------------------------------------------------------
  // SIMULADO — oito questões com cronômetro, correção final.
  // -----------------------------------------------------------
  const simApp = $("#simulado-app");
  let simulation = null;
  let intervalId = null;
  function stopTimer() { if (intervalId !== null) clearInterval(intervalId); intervalId = null; }
  function simulationStart() {
    stopTimer();
    const selection = questions.slice(4, 12);
    simulation = { list: selection, endsAt: Date.now() + 10 * 60 * 1000, finished: false };
    simApp.innerHTML = `<div class="simulado-header"><div><span class="section-kicker">SIMULADO EM ANDAMENTO</span><h2>Fundamentos da Eletroeletrônica</h2></div><span class="timer" id="sim-timer" role="timer">10:00</span></div><p class="muted small">Selecione uma alternativa para cada questão. Você pode finalizar antes do tempo.</p><form id="sim-form">${selection.map((q, i) => `<fieldset class="sim-question" style="border-left:0;border-right:0;border-bottom:0;padding-left:0;padding-right:0"><legend class="sr-only">Questão ${i+1}</legend><h3>${i + 1}. ${escapeHtml(q.q)}</h3>${q.options.map((opt, j) => `<label><input type="radio" name="question${i}" value="${j}"> ${escapeHtml(opt)}</label>`).join("")}</fieldset>`).join("")}<button class="btn btn-primary" type="submit">Finalizar e corrigir</button></form>`;
    intervalId = setInterval(() => {
      if (!simulation || simulation.finished) { stopTimer(); return; }
      const left = Math.max(0, Math.ceil((simulation.endsAt - Date.now()) / 1000));
      const clock = $("#sim-timer");
      if (clock) clock.textContent = `${String(Math.floor(left / 60)).padStart(2,"0")}:${String(left % 60).padStart(2,"0")}`;
      if (left === 0) simulationFinish(true);
    }, 1000);
  }
  function simulationFinish(timeout = false) {
    if (!simulation || simulation.finished) return;
    simulation.finished = true; stopTimer();
    const form = $("#sim-form");
    const answers = simulation.list.map((q,i) => {
      const checked = form ? $(`input[name="question${i}"]:checked`, form) : null;
      return checked ? Number(checked.value) : -1;
    });
    const points = answers.filter((answer,i) => answer === simulation.list[i].correct).length;
    const percentage = Math.round(points * 100 / simulation.list.length);
    saveBest(percentage);
    simApp.innerHTML = `<div class="start-state"><span class="test-emblem"><svg class="icon"><use href="#i-check"/></svg></span><h2>${timeout ? "Tempo encerrado!" : "Simulado finalizado!"}</h2><div class="result-score">${points}/${simulation.list.length}</div><p>Resultado: ${percentage}% de acertos. Veja a correção abaixo.</p><button class="btn btn-primary" type="button" id="refazer-simulado">Fazer outro simulado <svg class="icon"><use href="#i-refresh"/></svg></button></div><div class="simulated-review">${simulation.list.map((q,i) => `<div class="sim-explanation"><strong>${i+1}. ${answers[i]===q.correct?"✓ Correta":"• Revisar"}</strong><br>${escapeHtml(q.q)}<br><strong>Resposta:</strong> ${escapeHtml(q.options[q.correct])}<br>${escapeHtml(q.why)}</div>`).join("")}</div>`;
  }
  simApp.addEventListener("click", e => {
    if (e.target.closest("#iniciar-simulado") || e.target.closest("#refazer-simulado")) simulationStart();
  });
  simApp.addEventListener("submit", e => { if (e.target.id === "sim-form") { e.preventDefault(); simulationFinish(false); } });
  $$("[data-mode]").forEach(button => button.addEventListener("click", () => {
    const selected = button.dataset.mode;
    $$("[data-mode]").forEach(b => { b.classList.toggle("active", b.dataset.mode === selected); b.setAttribute("aria-selected", String(b.dataset.mode === selected)); });
    $("#quiz-zone").hidden = selected !== "quiz";
    $("#simulado-zone").hidden = selected !== "simulado";
  }));
 
  // -----------------------------------------------------------
  // GUIA MALHIX — RESPOSTAS FIXAS LOCAIS, NÃO É UMA IA REAL.
  // -----------------------------------------------------------
  const chatMessages = $("#chat-messages");
  function appendChat(message, kind) {
    const bubble = document.createElement("div");
    bubble.className = "bubble " + kind;
    bubble.textContent = message; // nunca injeta HTML digitado pelo usuário
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  const normalize = text => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  function localAnswer(question) {
    const q = normalize(question);
    if (/ohm|resistor|resistencia/.test(q)) return "A Lei de Ohm relaciona tensão, corrente e resistência: V = R · I. Em um resistor, ela permite calcular qualquer uma dessas grandezas quando as outras duas são conhecidas.";
    if (/capacitor|capacit/.test(q)) return "O capacitor armazena energia em um campo elétrico. Ele é usado em filtros, temporização e suavização de tensão em fontes de alimentação.";
    if (/indutor|bobina|eletromagnet/.test(q)) return "O indutor armazena energia em campo magnético e se opõe a variações bruscas de corrente. Ele aparece em filtros, fontes e circuitos eletromagnéticos.";
    if (/diodo|retific/.test(q)) return "O diodo conduz principalmente em um sentido. Em retificação, ele ajuda a transformar corrente alternada em corrente contínua pulsante.";
    if (/transistor|tbj|bjt|mosfet/.test(q)) return "Transistores controlam a corrente elétrica. TBJs e MOSFETs podem atuar como chaves eletrônicas e também aparecem em circuitos de amplificação e controle.";
    if (/cc|ca|continua|alternada/.test(q)) return "Corrente contínua (CC) mantém o mesmo sentido de circulação. Corrente alternada (CA) varia periodicamente de valor e sentido. Baterias fornecem CC; a rede elétrica normalmente fornece CA.";
    if (/kirchhoff|malha|no\b|nos\b/.test(q)) return "As Leis de Kirchhoff ajudam a analisar circuitos: a Lei dos Nós afirma que a soma das correntes que entram em um nó é igual à soma das que saem; a Lei das Malhas diz que a soma algébrica das tensões em um percurso fechado é zero.";
    if (/potencia|joule|calor/.test(q)) return "A potência elétrica indica a taxa de transformação de energia: P = V · I. O efeito Joule mostra que parte da energia elétrica pode se transformar em calor.";
    if (/filtro|divisor|fonte|temporiza|rc|rl/.test(q)) return "Filtros RC e RL moldam sinais. Divisores de tensão e corrente distribuem grandezas pelo circuito. Fontes lineares alimentam circuitos, e a constante de tempo RC é importante em temporização.";
    if (/multimetro|medir|medicao|fusivel|disjuntor|rele|chave|protec/.test(q)) return "O multímetro mede grandezas como tensão, corrente e resistência. Já fusíveis, disjuntores, relés e chaves ajudam na proteção, controle e diagnóstico dos circuitos.";
    if (/atividade|quiz|simulado|estud/.test(q)) return "No Malhix, você pode estudar os módulos na área de conteúdo, praticar em atividades comentadas e revisar por meio de quizzes e simulados.";
    return "Ainda não tenho uma resposta pronta para essa pergunta. Experimente perguntar sobre Lei de Ohm, capacitores, indutores, diodos, CC e CA, Leis de Kirchhoff, multímetro ou proteção de circuitos.";
  }
  function askGuide(question) {
    const value = question.trim();
    if (!value) return;
    appendChat(value, "user");
    appendChat(localAnswer(value), "bot");
  }
  $("#chat-form").addEventListener("submit", e => {
    e.preventDefault(); const input = $("#chat-input"); askGuide(input.value); input.value = ""; input.focus();
  });
  $$("[data-question]").forEach(button => button.addEventListener("click", () => askGuide(button.dataset.question)));
 
  // -----------------------------------------------------------
  // CONTATO — rascunhos guardados localmente, sem envio falso.
  // -----------------------------------------------------------
  const contact = $("#contact-form");
  const draft = store.read("contato", null);
  if (draft && typeof draft === "object") {
    if (typeof draft.nome === "string") $("#contact-name").value = draft.nome;
    if (typeof draft.assunto === "string") $("#contact-subject").value = draft.assunto;
    if (typeof draft.mensagem === "string") $("#contact-message").value = draft.mensagem;
  }
  function getDraft() {
    return { nome: $("#contact-name").value.trim(), assunto: $("#contact-subject").value, mensagem: $("#contact-message").value.trim() };
  }
  function draftText() {
    const d = getDraft();
    return `Malhix — mensagem de contato\nNome: ${d.nome}\nAssunto: ${d.assunto}\n\n${d.mensagem}`;
  }
  $("#salvar-contato").addEventListener("click", () => {
    const ok = store.write("contato", getDraft());
    $("#contact-feedback").textContent = ok ? "Rascunho salvo neste navegador." : "Não foi possível salvar automaticamente neste navegador.";
    toast(ok ? "Rascunho salvo!" : "Não foi possível salvar o rascunho.");
  });
  $("#copiar-contato").addEventListener("click", async () => {
    if (!getDraft().mensagem) { $("#contact-feedback").textContent = "Escreva sua mensagem antes de copiar."; return; }
    try {
      await navigator.clipboard.writeText(draftText());
      $("#contact-feedback").textContent = "Mensagem copiada. Ela não foi enviada.";
      toast("Mensagem copiada para a área de transferência.");
    } catch {
      $("#contact-feedback").textContent = "A cópia automática não está disponível. Selecione o texto e copie manualmente.";
    }
  });
  contact.addEventListener("submit", e => e.preventDefault());
 
  // -----------------------------------------------------------
  // CONFIGURAÇÕES — preferências no navegador.
  // -----------------------------------------------------------
  let settings = store.read("config", { font: 100, contrast: false, motion: false });
  if (!settings || typeof settings !== "object") settings = { font: 100, contrast: false, motion: false };
  settings.font = Number.isFinite(settings.font) ? Math.min(120,Math.max(90,settings.font)) : 100;
  function applySettings() {
    document.documentElement.style.setProperty("--font-scale", String(settings.font / 100));
    $("#font-value").textContent = settings.font + "%";
    body.classList.toggle("high-contrast", Boolean(settings.contrast));
    body.classList.toggle("reduce-motion", Boolean(settings.motion));
    $("#contrast-toggle").checked = Boolean(settings.contrast);
    $("#motion-toggle").checked = Boolean(settings.motion);
  }
  function saveSettings() { store.write("config", settings); applySettings(); }
  $("#font-minus").addEventListener("click", () => { settings.font = Math.max(90, settings.font - 5); saveSettings(); });
  $("#font-plus").addEventListener("click", () => { settings.font = Math.min(120, settings.font + 5); saveSettings(); });
  $("#contrast-toggle").addEventListener("change", e => { settings.contrast = e.target.checked; saveSettings(); });
  $("#motion-toggle").addEventListener("change", e => { settings.motion = e.target.checked; saveSettings(); });
  $("#clear-progress").addEventListener("click", () => {
    if (!confirm("Limpar as atividades concluídas e a melhor nota guardada neste navegador?")) return;
    store.erase("atividades"); store.erase("melhor-nota"); finished = []; updateProgress();
    $("#settings-feedback").textContent = "Seu progresso foi reiniciado.";
    toast("Progresso reiniciado.");
  });
  applySettings();
});


