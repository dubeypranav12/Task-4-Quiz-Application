const API_URL = "https://opentdb.com/api.php?amount=10&type=multiple";

const quizForm = document.querySelector("#quizForm");
const questionList = document.querySelector("#questionList");
const statusPanel = document.querySelector("#statusPanel");
const statusMessage = document.querySelector("#statusMessage");
const answeredCount = document.querySelector("#answeredCount");
const progressTrack = document.querySelector(".progress-track");
const progressBar = document.querySelector("#progressBar");
const formMessage = document.querySelector("#formMessage");
const resultPanel = document.querySelector("#resultPanel");
const scoreText = document.querySelector("#scoreText");
const resultCopy = document.querySelector("#resultCopy");
const restartButton = document.querySelector("#restartButton");
const themeButton = document.querySelector("#themeButton");
const themeLabel = document.querySelector(".theme-label");

let questions = [];
let submitted = false; 

function decodeText(value) {
  const decoder = document.createElement("textarea");
  decoder.innerHTML = value;
  return decoder.value;
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function prepareQuestions(apiQuestions) {
  return apiQuestions.map((item) => {
    const correctAnswer = decodeText(item.correct_answer);
    const incorrectAnswers = item.incorrect_answers.map(decodeText);
    return {
      question: decodeText(item.question),
      correctAnswer,
      answers: shuffle([correctAnswer, ...incorrectAnswers]),
    };
  });
}

function setLoading(message) {
  statusPanel.hidden = false;
  statusPanel.classList.remove("error");
  statusMessage.textContent = message;
  quizForm.hidden = true;
  resultPanel.hidden = true;
}

function showError() {
  statusPanel.hidden = false;
  statusPanel.classList.add("error");
  statusMessage.innerHTML = "We could not load the quiz. Check your connection, then <button class=\"text-button\" type=\"button\" id=\"retryButton\">try again</button>.";
  document.querySelector("#retryButton").addEventListener("click", loadQuiz);
}

function createOption(answer, questionIndex, optionIndex) {
  const label = document.createElement("label");
  label.className = "option";
  label.dataset.answer = answer;

  const input = document.createElement("input");
  input.type = "radio";
  input.name = `question-${questionIndex}`;
  input.value = answer;
  input.id = `question-${questionIndex}-option-${optionIndex}`;

  const content = document.createElement("span");
  content.className = "option-content";
  content.textContent = answer;

  label.append(input, content);
  return label;
}

function renderQuestions() {
  questionList.replaceChildren();

  questions.forEach((item, questionIndex) => {
    const card = document.createElement("article");
    card.className = "question-card";
    card.dataset.questionIndex = questionIndex;

    const number = document.createElement("p");
    number.className = "question-number";
    number.textContent = `Question ${questionIndex + 1}`;

    const title = document.createElement("h2");
    title.id = `question-title-${questionIndex}`;
    title.textContent = item.question;

    const options = document.createElement("div");
    options.className = "options";
    options.setAttribute("role", "radiogroup");
    options.setAttribute("aria-labelledby", title.id);

    item.answers.forEach((answer, optionIndex) => {
      options.append(createOption(answer, questionIndex, optionIndex));
    });

    card.append(number, title, options);
    questionList.append(card);
  });

  statusPanel.hidden = true;
  quizForm.hidden = false;
  updateProgress();
}

function updateProgress() {
  const answered = new Set(
    [...quizForm.querySelectorAll("input:checked")].map((input) => input.name),
  ).size;
  const total = questions.length || 10;
  const percentage = Math.round((answered / total) * 100);
  answeredCount.textContent = `${answered} of ${total} answered`;
  progressBar.style.width = `${percentage}%`;
  progressTrack.setAttribute("aria-valuemax", total);
  progressTrack.setAttribute("aria-valuenow", answered);
}

function addFeedback(card, message, isCorrect) {
  const feedback = document.createElement("p");
  feedback.className = `answer-feedback ${isCorrect ? "correct" : "incorrect"}`;
  feedback.textContent = message;
  card.append(feedback);
}

function markQuestion(questionIndex, selectedAnswer) {
  const question = questions[questionIndex];
  const card = questionList.querySelector(`[data-question-index="${questionIndex}"]`);
  const options = [...card.querySelectorAll(".option")];
  const isCorrect = selectedAnswer === question.correctAnswer;

  options.forEach((option) => {
    const input = option.querySelector("input");
    input.disabled = true;
    if (option.dataset.answer === question.correctAnswer) option.classList.add("correct");
    if (input.checked && !isCorrect) option.classList.add("incorrect");
  });

  const message = isCorrect
    ? "Correct answer."
    : `Correct answer: ${question.correctAnswer}`;
  addFeedback(card, message, isCorrect);
  return isCorrect;
}

function submitQuiz(event) {
  if (event) event.preventDefault();
  if (submitted || questions.length === 0) return;

  let score = 0;
  questions.forEach((question, questionIndex) => {
    const selected = quizForm.querySelector(`input[name="question-${questionIndex}"]:checked`);
    if (markQuestion(questionIndex, selected?.value)) score += 1;
  });

  submitted = true;
  formMessage.textContent = "";
  document.querySelector("#submitButton").hidden = true;
  const percentage = Math.round((score / questions.length) * 100);
  scoreText.textContent = `${score} / ${questions.length} · ${percentage}%`;
  resultCopy.textContent = score >= 8
    ? "Strong result. You know your way around a trivia board."
    : score >= 5
      ? "A solid round. Review the marked answers and try another set."
      : "Good start. Review the answers below, then try a fresh set.";
  resultPanel.hidden = false;
  resultPanel.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function loadQuiz() {
  setLoading("Loading your questions…");
  submitted = false;
  questions = [];
  formMessage.textContent = "";
  document.querySelector("#submitButton").hidden = false;
  answeredCount.textContent = "0 of 10 answered";
  progressBar.style.width = "0%";

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    const data = await response.json();
    if (data.response_code !== 0 || data.results.length !== 10) {
      throw new Error("The quiz service returned an incomplete set.");
    }
    questions = prepareQuestions(data.results);
    renderQuestions();
  } catch (error) {
    console.error("Quiz loading error:", error);
    showError();
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  themeButton.setAttribute("aria-pressed", String(isDark));
  themeButton.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} theme`);
  themeLabel.textContent = isDark ? "Light" : "Dark";
}

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const tools = [
    {
      name: "get_quiz_status",
      title: "Get quiz status",
      description: "Read the number of answered questions and whether the quiz has been submitted.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => ({
        answered: quizForm.querySelectorAll("input:checked").length,
        total: questions.length,
        submitted,
      }),
    },
    {
      name: "restart_quiz",
      title: "Restart quiz",
      description: "Fetch a fresh set of ten questions and reset the visible quiz.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async () => {
        await loadQuiz();
        return { loaded: questions.length === 10, total: questions.length };
      },
    },
  ];
  tools.forEach((tool) => {
    try { void Promise.resolve(context.registerTool(tool)).catch(console.error); }
    catch (error) { console.error("WebMCP registration error:", error); }
  });
}

quizForm.addEventListener("change", updateProgress);
quizForm.addEventListener("submit", submitQuiz);
restartButton.addEventListener("click", loadQuiz);
themeButton.addEventListener("click", toggleTheme);

registerWebMcpTools();
loadQuiz();
