const STORAGE_KEY = "calcaneal-case:v1";
const PRIVATE_STORAGE_KEY = "calcaneal-case:doctor-private:v1";
const ACCESS_STORAGE_KEY = "calcaneal-case:doctor-access:v1";

const defaultState = {
  activeCaseId: null,
  activeTab: "overview",
  cases: []
};

let state = loadState();
let privateState = loadPrivateState();
let accessState = loadAccessState();
let imageEditor = {
  img: null,
  imageId: null,
  sourceCanvas: document.createElement("canvas"),
  rotation: 0,
  crop: null
};
let measurePoints = [];
let perspectiveMode = false;
let perspectivePoints = [];
let draggedPerspectivePoint = null;
let introTimer = null;
let introStep = 0;
let introPlaying = false;

const introSteps = [
  ["术前 X 线", "先把脱敏后的 X 线和 CT 放进同一条病例时间线，后面才能讨论分型、复位和随访。"],
  ["CT 资料", "跟骨骨折病例非常依赖影像资料，上传后可以继续做裁剪、增强、归类和讨论。"],
  ["Böhler 角", "把常用角度放在同一页记录，便于术前评估、术后复盘和随访比较。"],
  ["Gissane 角", "角度测量先作为医生辅助记录，最终判断仍由医生结合影像和临床情况确认。"],
  ["解剖动画", "用公开教学素材做入口演示，正式病例区只放脱敏病例和经过授权的资料。"]
];

const tutorialGuides = {
  overview: ["Case Intake Guide", "如何录入一个跟骨骨折病例", "先完成病例编号、受伤机制、合并损伤和隐私检查。病例可见范围在左侧病例卡片中选择，字段变更会自动保存，也可以点“保存”手动确认。"],
  classify: ["Classification Guide", "如何完成分型记录", "Essex-Lopresti、Sanders 和 Zwipp 作为同等重要的记录入口填写，最后再补充骨折脱位型和特殊情况。"],
  images: ["Image Workspace Guide", "如何上传和处理影像", "批量上传后先分类，再按单张影像做裁剪、黑白滤镜、亮度、对比度、锐化和四点矫正。操作失误可后退、前进或恢复原始图。"],
  measure: ["Measurement Guide", "如何做角度测量", "选择影像后依次点击四个点，两点确定第一条线，两点确定第二条线，系统会计算夹角，医生确认后记录到对应角度。"],
  followup: ["Follow-up Guide", "如何安排随访", "先设默认随访间隔，再记录提醒日期、VAS、功能评分、负重状态和终极指标。随访结束后仍可保留关键结局。"],
  discussion: ["Discussion Guide", "如何组织病例讨论", "讨论区用于记录术前计划、复位策略、影像判断和术后复盘。公开前仍需确认病例已经充分去标识化。"]
};

const injuryKeys = ["spine", "lowerLimb", "pelvis", "foot", "other"];
const injuryLabels = {
  spine: "脊柱",
  lowerLimb: "下肢",
  pelvis: "骨盆",
  foot: "足部",
  other: "其他"
};

const defaultImageAdjustments = {
  brightness: 0,
  contrast: 20,
  sharpen: 1,
  blackWhite: false,
  displayMode: "fit"
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const els = {
  welcomeScreen: $("#welcomeScreen"),
  welcomeEnterTop: $("#welcomeEnterTop"),
  welcomeEnterMain: $("#welcomeEnterMain"),
  playIntro: $("#playIntro"),
  introToggle: $("#introToggle"),
  introToggleIcon: $("#introToggleIcon"),
  introStepTitle: $("#introStepTitle"),
  introStepText: $("#introStepText"),
  introProgress: $("#introProgress"),
  introTime: $("#introTime"),
  introMedia: $$(".intro-media"),
  introThumbs: $$(".media-thumb"),
  accessGate: $("#accessGate"),
  appShell: $("#appShell"),
  doctorAccessForm: $("#doctorAccessForm"),
  closeAccessGate: $("#closeAccessGate"),
  accessDoctorName: $("#accessDoctorName"),
  accessDisplayName: $("#accessDisplayName"),
  accessInstitution: $("#accessInstitution"),
  accessLicenseNumber: $("#accessLicenseNumber"),
  accessTitle: $("#accessTitle"),
  accessLicenseFile: $("#accessLicenseFile"),
  accessLicenseFileName: $("#accessLicenseFileName"),
  accessTitleFile: $("#accessTitleFile"),
  accessTitleFileName: $("#accessTitleFileName"),
  accessAgreement: $("#accessAgreement"),
  accessStatus: $("#accessStatus"),
  caseCount: $("#caseCount"),
  caseList: $("#caseList"),
  caseSearch: $("#caseSearch"),
  newCase: $("#newCase"),
  seedDemo: $("#seedDemo"),
  exportData: $("#exportData"),
  importData: $("#importData"),
  tutorialEyebrow: $("#tutorialEyebrow"),
  tutorialTitle: $("#tutorialTitle"),
  tutorialText: $("#tutorialText"),
  saveStatus: $("#saveStatus"),
  tempSave: $("#tempSave"),
  tabs: $$(".tab"),
  panels: {
    overview: $("#overviewPanel"),
    images: $("#imagesPanel"),
    measure: $("#measurePanel"),
    classify: $("#classifyPanel"),
    followup: $("#followupPanel"),
    discussion: $("#discussionPanel")
  },
  fields: {
    caseCode: $("#caseCode"),
    privacyLevel: $("#privacyLevel"),
    ageBand: $("#ageBand"),
    sex: $("#sex"),
    side: $("#side"),
    mechanismType: $("#mechanismType"),
    mechanismOther: $("#mechanismOther"),
    mechanismOtherWrap: $("#mechanismOtherWrap"),
    injurySpine: $("#injurySpine"),
    injurySpineDetail: $("#injurySpineDetail"),
    injuryLowerLimb: $("#injuryLowerLimb"),
    injuryLowerLimbDetail: $("#injuryLowerLimbDetail"),
    injuryPelvis: $("#injuryPelvis"),
    injuryPelvisDetail: $("#injuryPelvisDetail"),
    injuryFoot: $("#injuryFoot"),
    injuryFootDetail: $("#injuryFootDetail"),
    injuryOther: $("#injuryOther"),
    injuryOtherDetail: $("#injuryOtherDetail"),
    threeStepNotes: $("#threeStepNotes"),
    localPatientName: $("#localPatientName"),
    localPatientPhone: $("#localPatientPhone"),
    localPatientIdNumber: $("#localPatientIdNumber"),
    localPatientSex: $("#localPatientSex"),
    localPatientAge: $("#localPatientAge"),
    comorbCardio: $("#comorbCardio"),
    comorbDiabetes: $("#comorbDiabetes"),
    comorbSmoking: $("#comorbSmoking"),
    comorbFootHistory: $("#comorbFootHistory"),
    hideName: $("#hideName"),
    hideDates: $("#hideDates"),
    hideHospital: $("#hideHospital"),
    hideMetadata: $("#hideMetadata"),
    adminApplicationReason: $("#adminApplicationReason"),
    adminTeachingProfile: $("#adminTeachingProfile"),
    ethicsApprovalId: $("#ethicsApprovalId"),
    sanders: $("#sanders"),
    essex: $("#essex"),
    fractureDislocation: $("#fractureDislocation"),
    specialClassification: $("#specialClassification"),
    zwippPosteriorFacet: $("#zwippPosteriorFacet"),
    zwippMiddleFacet: $("#zwippMiddleFacet"),
    zwippCalcaneocuboid: $("#zwippCalcaneocuboid"),
    zwippTuberosity: $("#zwippTuberosity"),
    zwippDepressed: $("#zwippDepressed"),
    zwippSustentaculum: $("#zwippSustentaculum"),
    zwippAnterolateral: $("#zwippAnterolateral"),
    zwippAnteromedial: $("#zwippAnteromedial")
  },
  privacyPill: $("#privacyPill"),
  visibilityCards: $$("[data-visibility-card]"),
  adminPanel: $("#adminPanel"),
  researchPanel: $("#researchPanel"),
  ethicsApprovalFile: $("#ethicsApprovalFile"),
  ethicsApprovalFileName: $("#ethicsApprovalFileName"),
  credentialFile: $("#credentialFile"),
  credentialFileName: $("#credentialFileName"),
  imageUpload: $("#imageUpload"),
  cameraCapture: $("#cameraCapture"),
  imageSelect: $("#imageSelect"),
  imageList: $("#imageList"),
  imageCanvas: $("#imageCanvas"),
  autoCrop: $("#autoCrop"),
  squareCrop: $("#squareCrop"),
  perspectiveMode: $("#perspectiveMode"),
  applyPerspective: $("#applyPerspective"),
  resetPerspective: $("#resetPerspective"),
  rotateImage: $("#rotateImage"),
  undoImage: $("#undoImage"),
  redoImage: $("#redoImage"),
  resetOriginalImage: $("#resetOriginalImage"),
  imageDisplayMode: $("#imageDisplayMode"),
  saveImage: $("#saveImage"),
  blackWhiteMode: $("#blackWhiteMode"),
  brightness: $("#brightness"),
  contrast: $("#contrast"),
  sharpen: $("#sharpen"),
  measureCanvas: $("#measureCanvas"),
  angleValue: $("#angleValue"),
  resetPoints: $("#resetPoints"),
  measurementButtons: $$("[data-save-measurement]"),
  measurementList: $("#measurementList"),
  classificationSuggestion: $("#classificationSuggestion"),
  defaultFollowupInterval: $("#defaultFollowupInterval"),
  followupStage: $("#followupStage"),
  followupDueDate: $("#followupDueDate"),
  vasScore: $("#vasScore"),
  functionScore: $("#functionScore"),
  weightBearing: $("#weightBearing"),
  followupStatus: $("#followupStatus"),
  finalOutcome: $("#finalOutcome"),
  followupNotes: $("#followupNotes"),
  addFollowup: $("#addFollowup"),
  followupList: $("#followupList"),
  commentBody: $("#commentBody"),
  addComment: $("#addComment"),
  commentList: $("#commentList")
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : cloneDefaultState();
  } catch {
    return cloneDefaultState();
  }
}

function loadPrivateState() {
  try {
    const raw = localStorage.getItem(PRIVATE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { cases: {} };
  } catch {
    return { cases: {} };
  }
}

function loadAccessState() {
  try {
    const raw = localStorage.getItem(ACCESS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { approved: false };
  } catch {
    return { approved: false };
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  markSaved("已自动保存");
}

function persistPrivate() {
  localStorage.setItem(PRIVATE_STORAGE_KEY, JSON.stringify(privateState));
  markSaved("私密信息已本地保存");
}

function persistAccess() {
  localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(accessState));
}

function markSaved(prefix = "已自动保存") {
  if (!els?.saveStatus) return;
  const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  els.saveStatus.textContent = `${prefix} · ${time}`;
}

function renderAccessGate() {
  const approved = Boolean(accessState.approved);
  els.welcomeScreen.classList.toggle("hidden", approved);
  els.accessGate.classList.add("hidden");
  els.appShell.classList.toggle("locked", !approved);
  els.accessStatus.textContent = approved ? "已提交资质" : "未提交";
  if (!approved) return;
  els.accessDoctorName.value = accessState.doctorName || "";
  els.accessDisplayName.value = accessState.displayName || "";
  els.accessInstitution.value = accessState.institution || "";
  els.accessLicenseNumber.value = accessState.licenseNumber || "";
  els.accessTitle.value = accessState.title || "";
  els.accessLicenseFileName.textContent = accessState.licenseFileName || "未上传";
  els.accessTitleFileName.textContent = accessState.titleFileName || "未上传";
  els.accessAgreement.checked = Boolean(accessState.agreement);
}

function openAccessGate() {
  if (accessState.approved) {
    els.welcomeScreen.classList.add("hidden");
    els.accessGate.classList.add("hidden");
    els.appShell.classList.remove("locked");
    return;
  }
  els.accessGate.classList.remove("hidden");
  els.accessDoctorName.focus();
}

function closeAccessGate() {
  if (accessState.approved) return;
  els.accessGate.classList.add("hidden");
}

function setIntroStep(index) {
  introStep = (index + introSteps.length) % introSteps.length;
  const [title, text] = introSteps[introStep];
  els.introStepTitle.textContent = title;
  els.introStepText.textContent = text;
  els.introProgress.style.width = `${((introStep + 1) / introSteps.length) * 100}%`;
  els.introTime.textContent = `00:${String(introStep * 12).padStart(2, "0")}`;
  els.introMedia.forEach((media) => {
    media.classList.toggle("active", Number(media.dataset.introStep) === introStep);
  });
  els.introThumbs.forEach((thumb) => {
    thumb.classList.toggle("active", Number(thumb.dataset.introStep) === introStep);
  });
}

function startIntro() {
  stopIntro();
  introPlaying = true;
  els.introToggleIcon.textContent = "Ⅱ";
  introTimer = window.setInterval(() => setIntroStep(introStep + 1), 1800);
}

function stopIntro() {
  introPlaying = false;
  els.introToggleIcon.textContent = "▶";
  if (introTimer) window.clearInterval(introTimer);
  introTimer = null;
}

function toggleIntro() {
  if (introPlaying) stopIntro();
  else startIntro();
}

function renderTutorial(tabName = state.activeTab || "overview") {
  const guide = tutorialGuides[tabName] || tutorialGuides.overview;
  els.tutorialEyebrow.textContent = guide[0];
  els.tutorialTitle.textContent = guide[1];
  els.tutorialText.textContent = guide[2];
}

function syncActiveTab() {
  const tabName = state.activeTab || "overview";
  els.tabs.forEach((item) => item.classList.toggle("active", item.dataset.tab === tabName));
  Object.entries(els.panels).forEach(([key, panel]) => panel.classList.toggle("active", key === tabName));
}

function activeCase() {
  return state.cases.find((item) => item.id === state.activeCaseId) || null;
}

function activePrivateCase() {
  if (!state.activeCaseId) return {};
  privateState.cases[state.activeCaseId] ||= {
    patientName: "",
    patientPhone: "",
    patientIdNumber: "",
    patientSex: "",
    patientAge: ""
  };
  return privateState.cases[state.activeCaseId];
}

function updatePrivateCase(key, value) {
  const local = activePrivateCase();
  local[key] = value;
  persistPrivate();
}

function mechanismTypeFromValue(value = "") {
  if (!value) return "";
  const normalized = String(value).trim();
  if (["高处坠落伤", "交通伤", "扭伤"].includes(normalized)) return normalized;
  if (normalized === "高处坠落") return "高处坠落伤";
  return "其他";
}

function normalizeCombinedInjuries(value, legacyText = "") {
  const base = {};
  injuryKeys.forEach((key) => {
    base[key] = {
      checked: Boolean(value?.[key]?.checked),
      detail: value?.[key]?.detail || ""
    };
  });
  if (!value && legacyText) {
    base.other = { checked: true, detail: legacyText };
  }
  return base;
}

function combinedInjurySummary(item) {
  const combined = normalizeCombinedInjuries(item.combinedInjuries, item.combinedInjury);
  const parts = injuryKeys
    .filter((key) => combined[key]?.checked)
    .map((key) => {
      const detail = combined[key]?.detail?.trim();
      return detail ? `${injuryLabels[key]}：${detail}` : injuryLabels[key];
    });
  return parts.join("；");
}

function caseMechanismLabel(item) {
  if (!item) return "";
  const type = item.mechanismType || mechanismTypeFromValue(item.mechanism);
  if (type === "其他") return item.mechanismOther || item.mechanism || "其他";
  return type || item.mechanism || "";
}

function setMechanismOtherVisibility() {
  const isOther = els.fields.mechanismType.value === "其他";
  els.fields.mechanismOtherWrap.classList.toggle("hidden-field", !isOther);
}

function updateMechanismFromFields() {
  const type = els.fields.mechanismType.value;
  const other = els.fields.mechanismOther.value.trim();
  updateCase({
    mechanismType: type,
    mechanismOther: other,
    mechanism: type === "其他" ? other : type
  });
  setMechanismOtherVisibility();
}

function updateCombinedInjuryFromFields() {
  const combinedInjuries = {};
  injuryKeys.forEach((key) => {
    const checkbox = els.fields[`injury${injuryFieldName(key)}`];
    const detail = els.fields[`injury${injuryFieldName(key)}Detail`];
    combinedInjuries[key] = {
      checked: Boolean(checkbox.checked),
      detail: detail.value.trim()
    };
  });
  updateCase({
    combinedInjuries,
    combinedInjury: combinedInjurySummary({ combinedInjuries })
  });
}

function injuryFieldName(key) {
  return {
    spine: "Spine",
    lowerLimb: "LowerLimb",
    pelvis: "Pelvis",
    foot: "Foot",
    other: "Other"
  }[key];
}

function exactAgeValue(value = "") {
  const normalized = String(value ?? "").trim();
  if (!/^\d{1,3}$/.test(normalized)) return "";
  const age = Number(normalized);
  return age >= 0 && age <= 120 ? normalized : "";
}

function createCase(seed = {}) {
  const id = makeId();
  const mechanismType = seed.mechanismType || mechanismTypeFromValue(seed.mechanism || "");
  const mechanismOther = seed.mechanismOther || (mechanismType === "其他" ? seed.mechanism || "" : "");
  const next = {
    id,
    code: seed.code || `CF-${new Date().getFullYear()}-${String(state.cases.length + 1).padStart(3, "0")}`,
    privacyLevel: seed.privacyLevel || "private",
    ageBand: exactAgeValue(seed.age ?? seed.ageBand),
    sex: seed.sex || "",
    side: seed.side || "",
    mechanismType,
    mechanismOther,
    mechanism: mechanismType === "其他" ? mechanismOther : mechanismType,
    combinedInjury: seed.combinedInjury || "",
    combinedInjuries: normalizeCombinedInjuries(seed.combinedInjuries, seed.combinedInjury),
    comorbidities: {
      cardio: false,
      diabetes: false,
      smoking: false,
      footHistory: false,
      ...(seed.comorbidities || {})
    },
    threeStepNotes: seed.threeStepNotes || "",
    privacyChecks: {
      hideName: false,
      hideDates: false,
      hideHospital: false,
      hideMetadata: false,
      ...(seed.privacyChecks || {})
    },
    research: {
      ethicsApprovalId: "",
      ethicsApprovalFileName: "",
      credentialFileName: "",
      ...(seed.research || {})
    },
    adminApplication: {
      reason: "",
      teachingProfile: "",
      ...(seed.adminApplication || {})
    },
    classification: {
      sanders: "",
      essex: "",
      fractureDislocation: "",
      specialClassification: "",
      zwippPosteriorFacet: "",
      zwippMiddleFacet: "",
      zwippCalcaneocuboid: "",
      zwippTuberosity: false,
      zwippDepressed: false,
      zwippSustentaculum: false,
      zwippAnterolateral: false,
      zwippAnteromedial: false,
      ...(seed.classification || {})
    },
    images: seed.images || [],
    measurements: seed.measurements || [],
    followups: seed.followups || [],
    followupPlan: {
      defaultInterval: "2w-6w-3m-6m-12m",
      status: "ongoing",
      finalOutcome: "",
      ...(seed.followupPlan || {})
    },
    comments: seed.comments || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.cases.unshift(next);
  state.activeCaseId = id;
  persist();
  render();
}

function updateCase(patch) {
  const current = activeCase();
  if (!current) return;
  Object.assign(current, patch, { updatedAt: new Date().toISOString() });
  persist();
  renderCaseList();
}

function deleteCase(caseId) {
  const index = state.cases.findIndex((item) => item.id === caseId);
  if (index < 0) return;
  const item = state.cases[index];
  const confirmed = window.confirm(`确定删除病例 ${item.code} 吗？该操作会同时删除本机保存的私密随访信息。`);
  if (!confirmed) return;
  state.cases.splice(index, 1);
  privateState.cases ||= {};
  delete privateState.cases[caseId];
  if (state.activeCaseId === caseId) {
    const next = state.cases[Math.min(index, state.cases.length - 1)];
    state.activeCaseId = next?.id || null;
    imageEditor.imageId = null;
    measurePoints = [];
  }
  persist();
  persistPrivate();
  render();
  markSaved("已删除病例并保存");
}

function updateNestedCase(path, value) {
  const current = activeCase();
  if (!current) return;
  const [section, key] = path.split(".");
  current[section] ||= {};
  current[section][key] = value;
  current.updatedAt = new Date().toISOString();
  persist();
  renderCaseList();
}

function privacyLabel(value) {
  return {
    private: "私有",
    admin: "管理员可见",
    team: "圈内讨论",
    public: "公开教学",
    research: "多中心研究"
  }[value] || "私有";
}

function privacyOptions(selected = "private") {
  return [
    ["private", "私有"],
    ["admin", "管理员可见"],
    ["team", "圈内讨论"],
    ["public", "公开教学"],
    ["research", "多中心研究"]
  ].map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`).join("");
}

function syncVisibilityUi(value) {
  els.privacyPill.textContent = privacyLabel(value);
  els.adminPanel.classList.toggle("active", value === "admin");
  els.researchPanel.classList.toggle("active", value === "research");
  els.visibilityCards.forEach((card) => {
    card.classList.toggle("active", card.dataset.visibilityCard === value);
  });
}

function render() {
  renderCaseList();
  renderActiveCase();
  renderTutorial();
  renderImages();
  renderMeasurements();
  renderFollowups();
  renderComments();
  renderClassification();
}

function renderCaseList() {
  const query = els.caseSearch.value.trim().toLowerCase();
  const filtered = state.cases.filter((item) => {
    const haystack = [
      item.code,
      item.ageBand,
      item.side,
      caseMechanismLabel(item),
      combinedInjurySummary(item),
      item.research?.ethicsApprovalId,
      item.classification?.sanders,
      item.classification?.essex,
      item.classification?.fractureDislocation,
      item.classification?.specialClassification
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });

  els.caseCount.textContent = `${state.cases.length} 个病例`;
  els.caseList.innerHTML = filtered.map((item) => {
    const active = item.id === state.activeCaseId ? " active" : "";
    const tags = [
      item.side || "侧别未填",
      item.classification?.essex || (item.classification?.sanders ? `Sanders ${item.classification.sanders}` : "待分型")
    ];
    return `
      <article class="case-item${active}" data-case-id="${item.id}">
        <button class="case-open" type="button" data-case-open="${item.id}">
          <strong>${escapeHtml(item.code)}</strong>
          <span>${escapeHtml(caseMechanismLabel(item) || "受伤机制未填写")}</span>
          <span>${item.images.length} 张影像 · ${item.comments.length} 条讨论</span>
          <span class="case-tags">${tags.map((tag) => `<em>${escapeHtml(tag)}</em>`).join("")}</span>
        </button>
        <div class="case-controls">
          <label class="case-privacy-control">
            可见范围
            <select data-case-privacy="${item.id}" aria-label="${escapeHtml(item.code)} 可见范围">
              ${privacyOptions(item.privacyLevel)}
            </select>
          </label>
          <button class="case-delete" type="button" data-delete-case="${item.id}">删除病例</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderActiveCase() {
  const current = activeCase();
  if (!current) {
    const template = $("#emptyStateTemplate").content.cloneNode(true);
    $(".content").replaceChildren(template);
    $("[data-create-case]").addEventListener("click", () => createCase());
    return;
  }

  if (!$(".tabs")) window.location.reload();

  syncActiveTab();
  els.fields.caseCode.value = current.code;
  els.fields.privacyLevel.value = current.privacyLevel;
  current.ageBand = exactAgeValue(current.ageBand);
  els.fields.ageBand.value = current.ageBand;
  els.fields.sex.value = current.sex;
  els.fields.side.value = current.side;
  current.mechanismType ||= mechanismTypeFromValue(current.mechanism);
  current.mechanismOther ||= current.mechanismType === "其他" ? current.mechanism || "" : "";
  els.fields.mechanismType.value = current.mechanismType;
  els.fields.mechanismOther.value = current.mechanismOther || "";
  setMechanismOtherVisibility();
  current.combinedInjuries = normalizeCombinedInjuries(current.combinedInjuries, current.combinedInjury);
  injuryKeys.forEach((key) => {
    const fieldName = injuryFieldName(key);
    els.fields[`injury${fieldName}`].checked = Boolean(current.combinedInjuries[key]?.checked);
    els.fields[`injury${fieldName}Detail`].value = current.combinedInjuries[key]?.detail || "";
  });
  els.fields.threeStepNotes.value = current.threeStepNotes;
  const local = activePrivateCase();
  els.fields.localPatientName.value = local.patientName || "";
  els.fields.localPatientPhone.value = local.patientPhone || "";
  els.fields.localPatientIdNumber.value = local.patientIdNumber || "";
  els.fields.localPatientSex.value = local.patientSex || "";
  els.fields.localPatientAge.value = local.patientAge || "";
  current.comorbidities ||= {};
  els.fields.comorbCardio.checked = Boolean(current.comorbidities.cardio);
  els.fields.comorbDiabetes.checked = Boolean(current.comorbidities.diabetes);
  els.fields.comorbSmoking.checked = Boolean(current.comorbidities.smoking);
  els.fields.comorbFootHistory.checked = Boolean(current.comorbidities.footHistory);
  els.fields.hideName.checked = current.privacyChecks.hideName;
  els.fields.hideDates.checked = current.privacyChecks.hideDates;
  els.fields.hideHospital.checked = current.privacyChecks.hideHospital;
  els.fields.hideMetadata.checked = current.privacyChecks.hideMetadata;
  els.fields.adminApplicationReason.value = current.adminApplication?.reason || "";
  els.fields.adminTeachingProfile.value = current.adminApplication?.teachingProfile || "";
  els.fields.ethicsApprovalId.value = current.research?.ethicsApprovalId || "";
  els.ethicsApprovalFileName.textContent = current.research?.ethicsApprovalFileName || "未上传";
  els.credentialFileName.textContent = current.research?.credentialFileName || "未上传";
  els.fields.sanders.value = current.classification.sanders;
  els.fields.essex.value = current.classification.essex;
  els.fields.fractureDislocation.value = current.classification.fractureDislocation || "";
  els.fields.specialClassification.value = current.classification.specialClassification || "";
  els.fields.zwippPosteriorFacet.value = current.classification.zwippPosteriorFacet || "";
  els.fields.zwippMiddleFacet.value = current.classification.zwippMiddleFacet || "";
  els.fields.zwippCalcaneocuboid.value = current.classification.zwippCalcaneocuboid || "";
  els.fields.zwippTuberosity.checked = Boolean(current.classification.zwippTuberosity);
  els.fields.zwippDepressed.checked = Boolean(current.classification.zwippDepressed);
  els.fields.zwippSustentaculum.checked = Boolean(current.classification.zwippSustentaculum);
  els.fields.zwippAnterolateral.checked = Boolean(current.classification.zwippAnterolateral);
  els.fields.zwippAnteromedial.checked = Boolean(current.classification.zwippAnteromedial);
  current.followupPlan ||= {};
  els.defaultFollowupInterval.value = current.followupPlan.defaultInterval || "2w-6w-3m-6m-12m";
  els.followupStatus.value = current.followupPlan.status || "ongoing";
  els.finalOutcome.value = current.followupPlan.finalOutcome || "";
  syncVisibilityUi(current.privacyLevel);
}

function renderImages() {
  const current = activeCase();
  if (!current) return;

  els.imageSelect.innerHTML = current.images.length
    ? current.images.map((image) => `<option value="${image.id}">${escapeHtml(imageCategoryLabel(image.category))} · ${escapeHtml(image.name)}</option>`).join("")
    : `<option value="">暂无影像</option>`;

  els.imageList.innerHTML = current.images.length
    ? current.images.map((image) => `
        <article class="image-row" data-image-id="${image.id}">
          <button class="image-pick ${image.id === (imageEditor.imageId || current.images[0]?.id) ? "active" : ""}" data-pick-image="${image.id}">
            ${escapeHtml(image.name)}
          </button>
          <select data-image-category="${image.id}" aria-label="影像分类">
            ${imageCategoryOptions(image.category)}
          </select>
        </article>
      `).join("")
    : `<p class="helper-text">暂无影像。可批量上传后逐张设置分类。</p>`;

  const selected = current.images.find((image) => image.id === imageEditor.imageId) || current.images[0];
  if (selected) {
    els.imageSelect.value = selected.id;
    loadEditorImage(selected);
  } else {
    updateImageHistoryButtons(null);
    clearCanvas(els.imageCanvas, "上传影像后可进行裁剪、增强、保存");
    clearCanvas(els.measureCanvas, "上传并选择影像后可进行角度测量");
  }
}

function imageCategoryOptions(selected = "other") {
  return [
    ["preop-xray", "术前 X 线"],
    ["preop-ct", "术前 CT"],
    ["intraop", "术中图片"],
    ["postop-xray", "术后 X 线"],
    ["postop-ct", "术后 CT"],
    ["other", "其他影像资料"]
  ].map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`).join("");
}

function imageCategoryLabel(value = "other") {
  return {
    "preop-xray": "术前 X 线",
    "preop-ct": "术前 CT",
    intraop: "术中图片",
    "postop-xray": "术后 X 线",
    "postop-ct": "术后 CT",
    other: "其他影像资料"
  }[value] || "其他影像资料";
}

function inferImageCategory(fileName = "") {
  const name = fileName.toLowerCase();
  if (/术中|intra|op/.test(name)) return "intraop";
  if (/术后|post/.test(name) && /ct/.test(name)) return "postop-ct";
  if (/术后|post/.test(name)) return "postop-xray";
  if (/术前|pre/.test(name) && /ct/.test(name)) return "preop-ct";
  if (/术前|pre|xray|x-ray|dr|片/.test(name)) return "preop-xray";
  if (/ct/.test(name)) return "preop-ct";
  return "other";
}

function renderMeasurements() {
  const current = activeCase();
  if (!current) return;
  const types = ["bohler", "gissane", "hindfoot-varus", "custom"];
  els.measurementList.innerHTML = types.map((type) => {
    const records = current.measurements.filter((item) => item.type === type);
    const latest = records[0];
    return `
      <article class="record-card">
        <strong>${escapeHtml(labelForMeasurement(type))}</strong>
        ${latest ? `
          <span>${latest.angle.toFixed(1)}° · ${new Date(latest.createdAt).toLocaleString()}</span>
          <p>${escapeHtml(latest.imageName || "未绑定影像")}</p>
        ` : `<p>暂无记录</p>`}
      </article>
    `;
  }).join("");
}

function renderFollowups() {
  const current = activeCase();
  if (!current) return;
  els.followupList.innerHTML = current.followups.length
    ? current.followups.map(renderFollowupCard).join("")
    : `<p class="helper-text">暂无随访记录。</p>`;
}

function renderFollowupCard(item) {
  const reminder = reminderStatus(item.dueDate);
  const statusLabel = item.status === "completed" ? "随访结束" : "继续随访";
  const outcomeLabel = finalOutcomeLabel(item.finalOutcome);
  return `
    <article class="record-card">
      <strong>${escapeHtml(item.stage)} · VAS ${escapeHtml(item.vas || "-")}</strong>
      <span>功能评分 ${escapeHtml(item.functionScore || "-")} · ${escapeHtml(item.weightBearing)} · ${escapeHtml(statusLabel)}</span>
      <span class="reminder-badge ${reminder.className}">${escapeHtml(reminder.label)}</span>
      ${outcomeLabel ? `<span class="reminder-badge scheduled">终极指标：${escapeHtml(outcomeLabel)}</span>` : ""}
      <p>${escapeHtml(item.notes || "无特殊情况")}</p>
    </article>
  `;
}

function finalOutcomeLabel(value) {
  return {
    fusion: "融合",
    healed: "骨折愈合",
    "subtalar-arthritis": "距下关节炎",
    revision: "二次手术",
    lost: "失访"
  }[value] || "";
}

function reminderStatus(dueDate) {
  if (!dueDate) return { label: "未设提醒", className: "" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const diffDays = Math.round((due - today) / 86400000);
  if (diffDays < 0) return { label: `已逾期 ${Math.abs(diffDays)} 天`, className: "overdue" };
  if (diffDays === 0) return { label: "今天随访", className: "due" };
  if (diffDays <= 7) return { label: `${diffDays} 天后随访`, className: "due" };
  return { label: `${dueDate} 随访`, className: "scheduled" };
}

function renderComments() {
  const current = activeCase();
  if (!current) return;
  els.commentList.innerHTML = current.comments.length
    ? current.comments.map((item) => `
        <article class="comment-card">
          <span>${new Date(item.createdAt).toLocaleString()}</span>
          <p>${escapeHtml(item.body)}</p>
        </article>
      `).join("")
    : `<p class="helper-text">暂无讨论。可以先记录术前计划、复位策略或术后复盘。</p>`;
}

function renderClassification() {
  const current = activeCase();
  if (!current) return;
  const suggestion = suggestClassification(current.classification);
  els.classificationSuggestion.textContent = suggestion;
}

function suggestClassification(classification) {
  const zwippScore = zwippPoints(classification);
  if (!classification.essex && !classification.sanders && !zwippScore && !classification.fractureDislocation && !classification.specialClassification) {
    return "补充 Essex-Lopresti、Sanders、Zwipp、骨折脱位型或分型补充后生成建议。";
  }

  const essexText = classification.essex ? `Essex-Lopresti：${classification.essex}` : "Essex-Lopresti 待确认";
  const sandersText = classification.sanders ? `Sanders：${classification.sanders}` : "Sanders 待确认";
  const dislocationText = classification.fractureDislocation === "yes"
    ? "记录为骨折脱位型"
    : classification.fractureDislocation === "no"
      ? "未记录骨折脱位"
      : "骨折脱位型待确认";

  const zwippText = zwippScore
    ? `Zwipp 采集项已记录 ${zwippScore} 个受累/确认点`
    : "Zwipp 采集项待补充";

  const specialText = classification.specialClassification
    ? `分型补充：${classification.specialClassification}`
    : "无分型补充";

  return `${essexText}；${sandersText}；${dislocationText}；${zwippText}；${specialText}。这是教学和记录建议，需由医生确认。`;
}

function zwippPoints(classification) {
  const jointKeys = ["zwippPosteriorFacet", "zwippMiddleFacet", "zwippCalcaneocuboid"];
  const fragmentKeys = ["zwippTuberosity", "zwippDepressed", "zwippSustentaculum", "zwippAnterolateral", "zwippAnteromedial"];
  const jointPoints = jointKeys.filter((key) => classification[key] === "yes").length;
  const fragmentPoints = fragmentKeys.filter((key) => classification[key]).length;
  return jointPoints + fragmentPoints;
}

function labelForMeasurement(type) {
  return {
    bohler: "Böhler 角",
    gissane: "Gissane 角",
    "hindfoot-varus": "轴位内外翻",
    custom: "自定义角度"
  }[type] || "角度";
}

function loadEditorImage(record) {
  syncImageControls(record);
  if (!record || imageEditor.imageId === record.id && imageEditor.img) {
    drawEditor();
    drawMeasure();
    return;
  }

  const img = new Image();
  img.onload = () => {
    imageEditor.img = img;
    imageEditor.imageId = record.id;
    imageEditor.rotation = 0;
    imageEditor.crop = null;
    syncImageControls(record);
    drawEditor();
    drawMeasure();
  };
  img.src = record.dataUrl;
}

function drawEditor() {
  const canvas = els.imageCanvas;
  if (!imageEditor.img) {
    clearCanvas(canvas, "上传影像后可进行裁剪、增强、保存");
    return;
  }
  drawProcessedImage(canvas);
  if (perspectiveMode) drawPerspectiveOverlay(canvas);
}

function drawMeasure() {
  const canvas = els.measureCanvas;
  if (!imageEditor.img) {
    clearCanvas(canvas, "上传并选择影像后可进行角度测量");
    return;
  }
  drawProcessedImage(canvas);
  drawMeasureOverlay(canvas);
}

function drawProcessedImage(canvas) {
  const ctx = canvas.getContext("2d");
  const img = imageEditor.img;
  const crop = imageEditor.crop || { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };
  const rotated = imageEditor.rotation % 180 !== 0;
  const targetWidth = rotated ? crop.height : crop.width;
  const targetHeight = rotated ? crop.width : crop.height;
  const displayMode = ensureImageAdjustments(selectedImage()).displayMode || "fit";
  const ratio = displayMode === "cover"
    ? Math.max(canvas.width / targetWidth, canvas.height / targetHeight)
    : Math.min(canvas.width / targetWidth, canvas.height / targetHeight);
  const drawWidth = displayMode === "stretch" ? canvas.width : Math.max(1, Math.round(targetWidth * ratio));
  const drawHeight = displayMode === "stretch" ? canvas.height : Math.max(1, Math.round(targetHeight * ratio));
  const offsetX = Math.round((canvas.width - drawWidth) / 2);
  const offsetY = Math.round((canvas.height - drawHeight) / 2);
  const processBounds = displayMode === "fit"
    ? { x: offsetX, y: offsetY, width: drawWidth, height: drawHeight }
    : { x: 0, y: 0, width: canvas.width, height: canvas.height };

  ctx.fillStyle = "#111817";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((imageEditor.rotation * Math.PI) / 180);
  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );
  ctx.restore();

  applyEnhancement(canvas, processBounds.x, processBounds.y, processBounds.width, processBounds.height);
  canvas.dataset.imageBounds = JSON.stringify(processBounds);
}

function drawPerspectiveOverlay(canvas) {
  ensurePerspectivePoints();
  clampPerspectivePoints(canvas);
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#f7d154";
  ctx.fillStyle = "rgba(247, 209, 84, 0.18)";
  ctx.beginPath();
  perspectivePoints.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f7d154";
  ctx.font = "bold 14px system-ui";
  perspectivePoints.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111817";
    ctx.fillText(String(index + 1), point.x - 4, point.y + 5);
    ctx.fillStyle = "#f7d154";
  });
  ctx.restore();
}

function ensurePerspectivePoints() {
  if (perspectivePoints.length === 4) return;
  const bounds = imageBounds(els.imageCanvas);
  const padX = bounds.width * 0.08;
  const padY = bounds.height * 0.08;
  perspectivePoints = [
    { x: bounds.x + padX, y: bounds.y + padY },
    { x: bounds.x + bounds.width - padX, y: bounds.y + padY },
    { x: bounds.x + bounds.width - padX, y: bounds.y + bounds.height - padY },
    { x: bounds.x + padX, y: bounds.y + bounds.height - padY }
  ];
}

function imageBounds(canvas) {
  try {
    return JSON.parse(canvas.dataset.imageBounds);
  } catch {
    return { x: 0, y: 0, width: canvas.width, height: canvas.height };
  }
}

function clampToImageBounds(point, canvas = els.imageCanvas) {
  const bounds = imageBounds(canvas);
  return {
    x: Math.max(bounds.x, Math.min(bounds.x + bounds.width, point.x)),
    y: Math.max(bounds.y, Math.min(bounds.y + bounds.height, point.y))
  };
}

function clampPerspectivePoints(canvas = els.imageCanvas) {
  if (perspectivePoints.length !== 4) return;
  perspectivePoints = perspectivePoints.map((point) => clampToImageBounds(point, canvas));
}

function applyEnhancement(canvas, x, y, width, height) {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;
  const adjustments = ensureImageAdjustments(selectedImage());
  const brightness = Number(adjustments.brightness);
  const contrast = Number(adjustments.contrast);
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let index = 0; index < data.length; index += 4) {
    const red = clamp(factor * (data[index] - 128) + 128 + brightness);
    const green = clamp(factor * (data[index + 1] - 128) + 128 + brightness);
    const blue = clamp(factor * (data[index + 2] - 128) + 128 + brightness);
    if (adjustments.blackWhite) {
      const gray = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      data[index] = gray;
      data[index + 1] = gray;
      data[index + 2] = gray;
    } else {
      data[index] = red;
      data[index + 1] = green;
      data[index + 2] = blue;
    }
  }

  ctx.putImageData(imageData, x, y);

  const sharpen = Number(adjustments.sharpen);
  if (sharpen > 0) {
    const source = ctx.getImageData(x, y, width, height);
    const output = ctx.createImageData(width, height);
    const kernel = [0, -sharpen, 0, -sharpen, 1 + 4 * sharpen, -sharpen, 0, -sharpen, 0];
    convolve(source, output, width, height, kernel);
    ctx.putImageData(output, x, y);
  }
}

function convolve(source, output, width, height, kernel) {
  const src = source.data;
  const dst = output.data;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      for (let channel = 0; channel < 3; channel += 1) {
        let value = 0;
        for (let ky = -1; ky <= 1; ky += 1) {
          for (let kx = -1; kx <= 1; kx += 1) {
            const srcIndex = ((y + ky) * width + (x + kx)) * 4 + channel;
            const kernelIndex = (ky + 1) * 3 + (kx + 1);
            value += src[srcIndex] * kernel[kernelIndex];
          }
        }
        dst[(y * width + x) * 4 + channel] = clamp(value);
      }
      dst[(y * width + x) * 4 + 3] = 255;
    }
  }
}

function drawMeasureOverlay(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#f7d154";
  ctx.fillStyle = "#f7d154";

  measurePoints.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111817";
    ctx.fillText(String(index + 1), point.x - 3, point.y + 4);
    ctx.fillStyle = "#f7d154";
  });

  if (measurePoints.length >= 2) drawLine(ctx, measurePoints[0], measurePoints[1]);
  if (measurePoints.length >= 4) drawLine(ctx, measurePoints[2], measurePoints[3]);
  ctx.restore();

  const angle = currentAngle();
  els.angleValue.textContent = angle ? `${angle.toFixed(1)}°` : "--°";
}

function drawLine(ctx, start, end) {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}

function currentAngle() {
  if (measurePoints.length < 4) return null;
  const [a, b, c, d] = measurePoints;
  const vectorA = { x: b.x - a.x, y: b.y - a.y };
  const vectorB = { x: d.x - c.x, y: d.y - c.y };
  const dot = vectorA.x * vectorB.x + vectorA.y * vectorB.y;
  const lenA = Math.hypot(vectorA.x, vectorA.y);
  const lenB = Math.hypot(vectorB.x, vectorB.y);
  if (!lenA || !lenB) return null;
  const radians = Math.acos(Math.min(1, Math.max(-1, Math.abs(dot) / (lenA * lenB))));
  return radians * 180 / Math.PI;
}

function clearCanvas(canvas, text) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#111817";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#cfe1dd";
  ctx.font = "18px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

function clamp(value) {
  return Math.max(0, Math.min(255, value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addDemoCase() {
  createCase({
    code: "CF-DEMO-001",
    privacyLevel: "team",
    ageBand: "52",
    sex: "不公开",
    side: "右",
    mechanismType: "高处坠落伤",
    mechanism: "高处坠落伤",
    combinedInjury: "",
    combinedInjuries: normalizeCombinedInjuries(),
    comorbidities: {
      cardio: false,
      diabetes: false,
      smoking: false,
      footHistory: false
    },
    threeStepNotes: "术前评估后关节面塌陷、跟骨宽度和轴位力线。术中重点记录复位顺序、固定方式和关键透视结果。",
    privacyChecks: {
      hideName: true,
      hideDates: true,
      hideHospital: true,
      hideMetadata: true
    },
    classification: {
      sanders: "II",
      essex: "Joint depression type",
      fractureDislocation: "no",
      specialClassification: "",
      zwippPosteriorFacet: "yes",
      zwippMiddleFacet: "yes",
      zwippCalcaneocuboid: "no",
      zwippTuberosity: true,
      zwippDepressed: true,
      zwippSustentaculum: true,
      zwippAnterolateral: true,
      zwippAnteromedial: false
    },
    followups: [
      {
        id: makeId(),
        stage: "术后 6 周",
        dueDate: "",
        vas: "2",
        functionScore: "76",
        weightBearing: "部分负重",
        status: "ongoing",
        finalOutcome: "",
        notes: "切口愈合可，复查片内固定位置稳定。",
        createdAt: new Date().toISOString()
      }
    ],
    comments: [
      {
        id: makeId(),
        body: "术前重点观察后关节面塌陷与跟骨宽度，讨论复位顺序和轴位控制。",
        createdAt: new Date().toISOString()
      }
    ]
  });
}

function selectedImage() {
  const current = activeCase();
  if (!current) return null;
  return current.images.find((image) => image.id === els.imageSelect.value) || current.images[0] || null;
}

function ensureImageAdjustments(record) {
  if (!record) return { ...defaultImageAdjustments };
  record.adjustments = {
    ...defaultImageAdjustments,
    ...(record.adjustments || {})
  };
  return record.adjustments;
}

function ensureImageHistory(record) {
  if (!record) return;
  record.originalDataUrl ||= record.dataUrl;
  if (!Array.isArray(record.history) || !record.history.length) {
    record.history = record.dataUrl === record.originalDataUrl
      ? [record.originalDataUrl]
      : [record.originalDataUrl, record.dataUrl];
  }
  if (!Number.isInteger(record.historyIndex)) {
    const index = record.history.indexOf(record.dataUrl);
    record.historyIndex = index >= 0 ? index : record.history.length - 1;
  }
}

function syncImageControls(record) {
  const adjustments = ensureImageAdjustments(record);
  els.brightness.value = String(adjustments.brightness);
  els.contrast.value = String(adjustments.contrast);
  els.sharpen.value = String(adjustments.sharpen);
  els.blackWhiteMode.checked = Boolean(adjustments.blackWhite);
  els.imageDisplayMode.value = adjustments.displayMode || "fit";
  updateImageHistoryButtons(record);
}

function updateSelectedImageAdjustments() {
  const current = activeCase();
  const record = selectedImage();
  if (!current || !record) return;
  record.adjustments = {
    brightness: Number(els.brightness.value),
    contrast: Number(els.contrast.value),
    sharpen: Number(els.sharpen.value),
    blackWhite: Boolean(els.blackWhiteMode.checked),
    displayMode: els.imageDisplayMode.value
  };
  current.updatedAt = new Date().toISOString();
  persist();
  drawEditor();
  drawMeasure();
}

function updateImageHistoryButtons(record = selectedImage()) {
  if (!els.undoImage) return;
  if (!record) {
    els.undoImage.disabled = true;
    els.redoImage.disabled = true;
    els.resetOriginalImage.disabled = true;
    return;
  }
  ensureImageHistory(record);
  els.undoImage.disabled = record.historyIndex <= 0;
  els.redoImage.disabled = record.historyIndex >= record.history.length - 1;
  els.resetOriginalImage.disabled = record.dataUrl === record.originalDataUrl;
}

function commitImageVersion(record, dataUrl, suffix) {
  const current = activeCase();
  if (!current || !record || !dataUrl) return;
  ensureImageHistory(record);
  record.history = record.history.slice(0, record.historyIndex + 1);
  record.history.push(dataUrl);
  record.historyIndex = record.history.length - 1;
  record.dataUrl = dataUrl;
  record.name = `${record.name.replace(/ \((处理|矫正)\)$/, "")} (${suffix})`;
  record.updatedAt = new Date().toISOString();
  current.updatedAt = new Date().toISOString();
  imageEditor.imageId = record.id;
  imageEditor.img = null;
  persist();
  render();
}

function stepImageHistory(direction) {
  const current = activeCase();
  const record = selectedImage();
  if (!current || !record) return;
  ensureImageHistory(record);
  const nextIndex = record.historyIndex + direction;
  if (nextIndex < 0 || nextIndex >= record.history.length) return;
  record.historyIndex = nextIndex;
  record.dataUrl = record.history[nextIndex];
  record.updatedAt = new Date().toISOString();
  current.updatedAt = new Date().toISOString();
  imageEditor.img = null;
  persist();
  renderImages();
}

function resetImageToOriginal() {
  const current = activeCase();
  const record = selectedImage();
  if (!current || !record) return;
  ensureImageHistory(record);
  record.historyIndex = 0;
  record.dataUrl = record.originalDataUrl;
  record.updatedAt = new Date().toISOString();
  current.updatedAt = new Date().toISOString();
  imageEditor.img = null;
  persist();
  renderImages();
}

function rememberResearchFile(field, input, label) {
  const current = activeCase();
  const file = input.files?.[0];
  if (!current || !file) return;
  current.research ||= {};
  current.research[field] = file.name;
  current.updatedAt = new Date().toISOString();
  label.textContent = file.name;
  input.value = "";
  persist();
  renderCaseList();
}

function estimateCrop() {
  const img = imageEditor.img;
  if (!img) return null;

  const sample = imageEditor.sourceCanvas;
  const ctx = sample.getContext("2d");
  sample.width = Math.min(480, img.naturalWidth);
  sample.height = Math.round(sample.width * img.naturalHeight / img.naturalWidth);
  ctx.drawImage(img, 0, 0, sample.width, sample.height);
  const { data, width, height } = ctx.getImageData(0, 0, sample.width, sample.height);

  const cornerLum = [
    luminanceAt(data, width, 4, 4),
    luminanceAt(data, width, width - 5, 4),
    luminanceAt(data, width, 4, height - 5),
    luminanceAt(data, width, width - 5, height - 5)
  ].reduce((sum, item) => sum + item, 0) / 4;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  const threshold = 24;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const lum = luminanceAt(data, width, x, y);
      if (Math.abs(lum - cornerLum) > threshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX <= minX || maxY <= minY) return null;

  const scaleX = img.naturalWidth / width;
  const scaleY = img.naturalHeight / height;
  const pad = 12;
  return {
    x: Math.max(0, Math.round((minX - pad) * scaleX)),
    y: Math.max(0, Math.round((minY - pad) * scaleY)),
    width: Math.min(img.naturalWidth, Math.round((maxX - minX + pad * 2) * scaleX)),
    height: Math.min(img.naturalHeight, Math.round((maxY - minY + pad * 2) * scaleY))
  };
}

function makeSquareCrop(crop) {
  const img = imageEditor.img;
  if (!img) return null;
  const base = crop || imageEditor.crop || { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };
  const size = Math.min(base.width, base.height);
  const centerX = base.x + base.width / 2;
  const centerY = base.y + base.height / 2;
  let x = Math.round(centerX - size / 2);
  let y = Math.round(centerY - size / 2);
  x = Math.max(0, Math.min(x, img.naturalWidth - size));
  y = Math.max(0, Math.min(y, img.naturalHeight - size));
  return { x, y, width: size, height: size };
}

function applyPerspectiveCorrection() {
  const current = activeCase();
  const record = selectedImage();
  if (!current || !record || !imageEditor.img || perspectivePoints.length !== 4) return;

  const source = document.createElement("canvas");
  source.width = els.imageCanvas.width;
  source.height = els.imageCanvas.height;
  drawProcessedImage(source);
  const sourceCtx = source.getContext("2d");
  const sourceData = sourceCtx.getImageData(0, 0, source.width, source.height);
  const [topLeft, topRight, bottomRight, bottomLeft] = perspectivePoints;
  const topWidth = distance(topLeft, topRight);
  const bottomWidth = distance(bottomLeft, bottomRight);
  const leftHeight = distance(topLeft, bottomLeft);
  const rightHeight = distance(topRight, bottomRight);
  const targetWidth = Math.max(220, Math.min(1400, Math.round(Math.max(topWidth, bottomWidth))));
  const targetHeight = Math.max(220, Math.min(1400, Math.round(Math.max(leftHeight, rightHeight))));
  const output = document.createElement("canvas");
  output.width = targetWidth;
  output.height = targetHeight;
  const outputCtx = output.getContext("2d");
  const outputData = outputCtx.createImageData(targetWidth, targetHeight);

  for (let y = 0; y < targetHeight; y += 1) {
    const v = targetHeight <= 1 ? 0 : y / (targetHeight - 1);
    for (let x = 0; x < targetWidth; x += 1) {
      const u = targetWidth <= 1 ? 0 : x / (targetWidth - 1);
      const top = interpolate(topLeft, topRight, u);
      const bottom = interpolate(bottomLeft, bottomRight, u);
      const samplePoint = interpolate(top, bottom, v);
      const sampled = samplePixel(sourceData, source.width, source.height, samplePoint.x, samplePoint.y);
      const index = (y * targetWidth + x) * 4;
      outputData.data[index] = sampled[0];
      outputData.data[index + 1] = sampled[1];
      outputData.data[index + 2] = sampled[2];
      outputData.data[index + 3] = sampled[3];
    }
  }

  outputCtx.putImageData(outputData, 0, 0);
  perspectiveMode = false;
  perspectivePoints = [];
  commitImageVersion(record, output.toDataURL("image/png", 0.92), "矫正");
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function interpolate(a, b, amount) {
  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount
  };
}

function samplePixel(imageData, width, height, x, y) {
  const clampedX = Math.max(0, Math.min(width - 1, x));
  const clampedY = Math.max(0, Math.min(height - 1, y));
  const x0 = Math.floor(clampedX);
  const y0 = Math.floor(clampedY);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const dx = clampedX - x0;
  const dy = clampedY - y0;
  const top = mixPixels(pixelAt(imageData, width, x0, y0), pixelAt(imageData, width, x1, y0), dx);
  const bottom = mixPixels(pixelAt(imageData, width, x0, y1), pixelAt(imageData, width, x1, y1), dx);
  return mixPixels(top, bottom, dy);
}

function pixelAt(imageData, width, x, y) {
  const index = (y * width + x) * 4;
  return [
    imageData.data[index],
    imageData.data[index + 1],
    imageData.data[index + 2],
    imageData.data[index + 3]
  ];
}

function mixPixels(a, b, amount) {
  return [
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
    a[3] + (b[3] - a[3]) * amount
  ];
}

function luminanceAt(data, width, x, y) {
  const index = (y * width + x) * 4;
  return 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
}

function wireEvents() {
  els.welcomeEnterTop.addEventListener("click", openAccessGate);
  els.welcomeEnterMain.addEventListener("click", openAccessGate);
  els.closeAccessGate.addEventListener("click", closeAccessGate);
  els.accessGate.addEventListener("click", (event) => {
    if (event.target === els.accessGate) closeAccessGate();
  });
  els.playIntro.addEventListener("click", startIntro);
  els.introToggle.addEventListener("click", toggleIntro);
  els.introThumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => setIntroStep(Number(thumb.dataset.introStep)));
  });

  els.accessLicenseFile.addEventListener("change", () => {
    const file = els.accessLicenseFile.files?.[0];
    els.accessLicenseFileName.textContent = file?.name || "未上传";
  });

  els.accessTitleFile.addEventListener("change", () => {
    const file = els.accessTitleFile.files?.[0];
    els.accessTitleFileName.textContent = file?.name || "未上传";
  });

  els.doctorAccessForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const licenseFile = els.accessLicenseFile.files?.[0];
    const titleFile = els.accessTitleFile.files?.[0];
    if (!licenseFile || !titleFile || !els.accessAgreement.checked) {
      els.accessStatus.textContent = "请提交证件并确认告知";
      return;
    }
    accessState = {
      approved: true,
      doctorName: els.accessDoctorName.value.trim(),
      displayName: els.accessDisplayName.value.trim(),
      institution: els.accessInstitution.value.trim(),
      licenseNumber: els.accessLicenseNumber.value.trim(),
      title: els.accessTitle.value,
      licenseFileName: licenseFile.name,
      titleFileName: titleFile.name,
      agreement: true,
      submittedAt: new Date().toISOString()
    };
    persistAccess();
    renderAccessGate();
  });

  els.newCase.addEventListener("click", () => createCase());
  els.seedDemo.addEventListener("click", addDemoCase);
  els.caseSearch.addEventListener("input", renderCaseList);

  els.caseList.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-case]");
    if (deleteButton) {
      deleteCase(deleteButton.dataset.deleteCase);
      return;
    }
    const item = event.target.closest("[data-case-open]");
    if (!item) return;
    state.activeCaseId = item.dataset.caseOpen;
    persist();
    measurePoints = [];
    imageEditor.imageId = null;
    render();
  });

  els.caseList.addEventListener("change", (event) => {
    const select = event.target.closest("[data-case-privacy]");
    if (!select) return;
    const item = state.cases.find((caseItem) => caseItem.id === select.dataset.casePrivacy);
    if (!item) return;
    item.privacyLevel = select.value;
    item.updatedAt = new Date().toISOString();
    persist();
    if (item.id === state.activeCaseId) {
      els.fields.privacyLevel.value = select.value;
      syncVisibilityUi(select.value);
    }
    renderCaseList();
  });

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.tab;
      els.tabs.forEach((item) => item.classList.toggle("active", item === tab));
      Object.entries(els.panels).forEach(([key, panel]) => panel.classList.toggle("active", key === name));
      state.activeTab = name;
      persist();
      renderTutorial(name);
      if (name === "measure") drawMeasure();
    });
  });

  els.tempSave.addEventListener("click", () => {
    persist();
    persistPrivate();
    markSaved("已保存当前病例");
  });

  const directFields = ["caseCode", "ageBand", "sex", "side", "threeStepNotes"];
  directFields.forEach((key) => {
    els.fields[key].addEventListener("input", () => {
      const map = { caseCode: "code" };
      updateCase({ [map[key] || key]: els.fields[key].value });
      if (key === "privacyLevel") {
        syncVisibilityUi(els.fields[key].value);
      }
    });
  });

  els.fields.mechanismType.addEventListener("change", updateMechanismFromFields);
  els.fields.mechanismOther.addEventListener("input", updateMechanismFromFields);

  injuryKeys.forEach((key) => {
    const fieldName = injuryFieldName(key);
    els.fields[`injury${fieldName}`].addEventListener("change", updateCombinedInjuryFromFields);
    els.fields[`injury${fieldName}Detail`].addEventListener("input", updateCombinedInjuryFromFields);
  });

  els.fields.adminApplicationReason.addEventListener("input", () => {
    updateNestedCase("adminApplication.reason", els.fields.adminApplicationReason.value);
  });

  els.fields.adminTeachingProfile.addEventListener("input", () => {
    updateNestedCase("adminApplication.teachingProfile", els.fields.adminTeachingProfile.value);
  });

  [
    ["localPatientName", "patientName"],
    ["localPatientPhone", "patientPhone"],
    ["localPatientIdNumber", "patientIdNumber"],
    ["localPatientSex", "patientSex"],
    ["localPatientAge", "patientAge"]
  ].forEach(([field, key]) => {
    els.fields[field].addEventListener("input", () => updatePrivateCase(key, els.fields[field].value));
  });

  [
    ["comorbCardio", "cardio"],
    ["comorbDiabetes", "diabetes"],
    ["comorbSmoking", "smoking"],
    ["comorbFootHistory", "footHistory"]
  ].forEach(([field, key]) => {
    els.fields[field].addEventListener("change", () => updateNestedCase(`comorbidities.${key}`, els.fields[field].checked));
  });

  els.fields.ethicsApprovalId.addEventListener("input", () => {
    updateNestedCase("research.ethicsApprovalId", els.fields.ethicsApprovalId.value);
  });

  els.ethicsApprovalFile.addEventListener("change", () => {
    rememberResearchFile("ethicsApprovalFileName", els.ethicsApprovalFile, els.ethicsApprovalFileName);
  });

  els.credentialFile.addEventListener("change", () => {
    rememberResearchFile("credentialFileName", els.credentialFile, els.credentialFileName);
  });

  ["hideName", "hideDates", "hideHospital", "hideMetadata"].forEach((key) => {
    els.fields[key].addEventListener("change", () => updateNestedCase(`privacyChecks.${key}`, els.fields[key].checked));
  });

  ["sanders", "essex", "fractureDislocation", "specialClassification", "zwippPosteriorFacet", "zwippMiddleFacet", "zwippCalcaneocuboid"].forEach((key) => {
    els.fields[key].addEventListener("change", () => {
      updateNestedCase(`classification.${key}`, els.fields[key].value);
      renderClassification();
    });
  });

  ["zwippTuberosity", "zwippDepressed", "zwippSustentaculum", "zwippAnterolateral", "zwippAnteromedial"].forEach((key) => {
    els.fields[key].addEventListener("change", () => {
      updateNestedCase(`classification.${key}`, els.fields[key].checked);
      renderClassification();
    });
  });

  els.imageUpload.addEventListener("change", handleImageUpload);
  els.cameraCapture.addEventListener("change", handleImageUpload);
  els.imageSelect.addEventListener("change", () => {
    imageEditor.imageId = els.imageSelect.value;
    imageEditor.img = null;
    measurePoints = [];
    renderImages();
  });
  els.imageList.addEventListener("click", (event) => {
    const pick = event.target.closest("[data-pick-image]");
    if (!pick) return;
    imageEditor.imageId = pick.dataset.pickImage;
    imageEditor.img = null;
    perspectiveMode = false;
    perspectivePoints = [];
    measurePoints = [];
    renderImages();
  });
  els.imageList.addEventListener("change", (event) => {
    const select = event.target.closest("[data-image-category]");
    if (!select) return;
    const current = activeCase();
    const image = current?.images.find((item) => item.id === select.dataset.imageCategory);
    if (!current || !image) return;
    image.category = select.value;
    current.updatedAt = new Date().toISOString();
    persist();
    renderImages();
  });
  [els.brightness, els.contrast, els.sharpen, els.blackWhiteMode, els.imageDisplayMode].forEach((input) => {
    input.addEventListener("input", updateSelectedImageAdjustments);
    input.addEventListener("change", updateSelectedImageAdjustments);
  });

  els.autoCrop.addEventListener("click", () => {
    const crop = estimateCrop();
    if (crop) {
      imageEditor.crop = crop;
      drawEditor();
      drawMeasure();
    }
  });

  els.squareCrop.addEventListener("click", () => {
    const crop = makeSquareCrop(estimateCrop());
    if (crop) {
      imageEditor.crop = crop;
      drawEditor();
      drawMeasure();
    }
  });

  els.perspectiveMode.addEventListener("click", () => {
    perspectiveMode = !perspectiveMode;
    if (perspectiveMode) ensurePerspectivePoints();
    els.perspectiveMode.classList.toggle("active", perspectiveMode);
    drawEditor();
  });

  els.applyPerspective.addEventListener("click", applyPerspectiveCorrection);

  els.resetPerspective.addEventListener("click", () => {
    perspectivePoints = [];
    ensurePerspectivePoints();
    drawEditor();
  });

  els.undoImage.addEventListener("click", () => stepImageHistory(-1));
  els.redoImage.addEventListener("click", () => stepImageHistory(1));
  els.resetOriginalImage.addEventListener("click", resetImageToOriginal);

  els.rotateImage.addEventListener("click", () => {
    imageEditor.rotation = (imageEditor.rotation + 90) % 360;
    drawEditor();
    drawMeasure();
  });

  els.saveImage.addEventListener("click", saveProcessedImage);

  els.imageCanvas.addEventListener("pointerdown", handlePerspectivePointerDown);
  els.imageCanvas.addEventListener("pointermove", handlePerspectivePointerMove);
  els.imageCanvas.addEventListener("pointerup", handlePerspectivePointerUp);
  els.imageCanvas.addEventListener("pointerleave", handlePerspectivePointerUp);

  els.measureCanvas.addEventListener("click", (event) => {
    if (!imageEditor.img) return;
    const rect = els.measureCanvas.getBoundingClientRect();
    const scaleX = els.measureCanvas.width / rect.width;
    const scaleY = els.measureCanvas.height / rect.height;
    if (measurePoints.length >= 4) measurePoints = [];
    measurePoints.push({
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    });
    drawMeasure();
  });

  els.resetPoints.addEventListener("click", () => {
    measurePoints = [];
    drawMeasure();
  });

  els.measurementButtons.forEach((button) => {
    button.addEventListener("click", () => saveMeasurement(button.dataset.saveMeasurement));
  });
  els.defaultFollowupInterval.addEventListener("change", () => updateNestedCase("followupPlan.defaultInterval", els.defaultFollowupInterval.value));
  els.followupStatus.addEventListener("change", () => updateNestedCase("followupPlan.status", els.followupStatus.value));
  els.finalOutcome.addEventListener("change", () => updateNestedCase("followupPlan.finalOutcome", els.finalOutcome.value));
  els.addFollowup.addEventListener("click", addFollowup);
  els.addComment.addEventListener("click", addComment);
  els.exportData.addEventListener("click", exportData);
  els.importData.addEventListener("change", importData);
}

function handlePerspectivePointerDown(event) {
  if (!perspectiveMode || !imageEditor.img) return;
  const point = canvasPoint(els.imageCanvas, event);
  ensurePerspectivePoints();
  const index = perspectivePoints.findIndex((candidate) => distance(candidate, point) <= 22);
  if (index === -1) return;
  draggedPerspectivePoint = index;
  els.imageCanvas.setPointerCapture?.(event.pointerId);
}

function handlePerspectivePointerMove(event) {
  if (!perspectiveMode || draggedPerspectivePoint === null) return;
  const point = canvasPoint(els.imageCanvas, event);
  perspectivePoints[draggedPerspectivePoint] = clampToImageBounds(point);
  drawEditor();
}

function handlePerspectivePointerUp(event) {
  if (draggedPerspectivePoint === null) return;
  draggedPerspectivePoint = null;
  els.imageCanvas.releasePointerCapture?.(event.pointerId);
}

function canvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

async function handleImageUpload(event) {
  const current = activeCase();
  if (!current) return;
  const files = Array.from(event.target.files || []);
  for (const file of files) {
    const dataUrl = await readAndSanitizeImage(file);
    current.images.push({
      id: makeId(),
      name: file.name.replace(/\.[^.]+$/, "") || "影像",
      category: inferImageCategory(file.name),
      type: file.type || "image/png",
      dataUrl,
      originalDataUrl: dataUrl,
      history: [dataUrl],
      historyIndex: 0,
      adjustments: { ...defaultImageAdjustments },
      createdAt: new Date().toISOString()
    });
  }
  current.privacyChecks.hideMetadata = true;
  current.updatedAt = new Date().toISOString();
  event.target.value = "";
  persist();
  render();
}

function readAndSanitizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSide = 1600;
        const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = Math.round(img.naturalWidth * ratio);
        canvas.height = Math.round(img.naturalHeight * ratio);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png", 0.92));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function saveProcessedImage() {
  const current = activeCase();
  const record = selectedImage();
  if (!current || !record || !imageEditor.img) return;
  commitImageVersion(record, els.imageCanvas.toDataURL("image/png", 0.92), "处理");
}

function saveMeasurement(type) {
  const current = activeCase();
  const image = selectedImage();
  const angle = currentAngle();
  if (!current || !image || !angle || !type) return;
  current.measurements.unshift({
    id: makeId(),
    type,
    angle,
    points: measurePoints,
    imageId: image.id,
    imageName: image.name,
    createdAt: new Date().toISOString()
  });
  current.updatedAt = new Date().toISOString();
  persist();
  measurePoints = [];
  renderMeasurements();
  drawMeasure();
}

function addFollowup() {
  const current = activeCase();
  if (!current) return;
  current.followups.unshift({
    id: makeId(),
    stage: els.followupStage.value,
    dueDate: els.followupDueDate.value,
    vas: els.vasScore.value,
    functionScore: els.functionScore.value,
    weightBearing: els.weightBearing.value,
    status: els.followupStatus.value,
    finalOutcome: els.finalOutcome.value,
    notes: els.followupNotes.value,
    createdAt: new Date().toISOString()
  });
  els.vasScore.value = "";
  els.functionScore.value = "";
  els.followupDueDate.value = "";
  els.followupNotes.value = "";
  current.updatedAt = new Date().toISOString();
  persist();
  renderFollowups();
}

function addComment() {
  const current = activeCase();
  const body = els.commentBody.value.trim();
  if (!current || !body) return;
  current.comments.unshift({
    id: makeId(),
    body,
    createdAt: new Date().toISOString()
  });
  els.commentBody.value = "";
  current.updatedAt = new Date().toISOString();
  persist();
  renderCaseList();
  renderComments();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `calcaneal-case-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const incoming = JSON.parse(reader.result);
      if (!Array.isArray(incoming.cases)) throw new Error("Invalid data");
      state = {
        activeCaseId: incoming.activeCaseId || incoming.cases[0]?.id || null,
        activeTab: incoming.activeTab || "overview",
        cases: incoming.cases
      };
      persist();
      window.location.reload();
    } catch {
      alert("导入失败：文件不是有效的 Calcaneal Case JSON。");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

wireEvents();
if (!state.cases.length) createCase();
setIntroStep(0);
renderAccessGate();
render();
