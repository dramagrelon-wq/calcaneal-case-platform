const STORAGE_KEY = "calcaneal-case:v1";
const PRIVATE_STORAGE_KEY = "calcaneal-case:doctor-private:v1";
const ACCESS_STORAGE_KEY = "calcaneal-case:doctor-access:v1";
const LOCAL_DATABASE_NAME = "calcaneal-case-local-data";
const LOCAL_DATABASE_VERSION = 1;
const LOCAL_RECORD_STORE = "records";
const LOCAL_STORAGE_SOFT_LIMIT = 3_500_000;
const LARGE_STORAGE_KEYS = {
  state: "state:v1",
  private: "doctor-private:v1",
  access: "doctor-access:v1"
};

const defaultState = {
  activeCaseId: null,
  activeTab: "overview",
  cases: [],
  trash: [],
  discussionReads: {}
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
let editingMeasurementId = null;
let editingFollowupId = null;
let activeScoreDraft = null;
let imageOrganizeMode = false;
let selectedImageIds = new Set();
let activeMeasurementType = null;
let draggedMeasurePointIndex = null;
let suppressNextMeasureClick = false;
let perspectiveMode = false;
let perspectivePoints = [];
let draggedPerspectivePoint = null;
let maskMode = false;
let maskStartPoint = null;
let maskPreviewPoint = null;
let maskRectangles = [];
let activeMaskRectangleId = null;
let maskDragState = null;
let gestureAdjustMode = true;
let gestureStart = null;
let introTimer = null;
let introStep = 0;
let introPlaying = false;
let largeStorageWarningShown = false;
let largeStorageWriteQueues = {};

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
  images: ["Image Workspace Guide", "如何上传、整理和阅片", "影像默认按术前、术中、术后即刻和随访排列。点击缩略图只是在中间看片；需要归类或删除时点左侧“整理”，需要测量时再主动选择测量项目。"],
  measure: ["Measurement Guide", "如何做影像测量", "测量已经合并到影像页。默认是阅片模式，只有选择 Böhler 角、Gissane 角、轴位内外翻或自定义角度后，点击影像才会记录测量点。"],
  followup: ["Follow-up Guide", "如何安排随访", "先设默认随访间隔，再记录提醒日期、VAS、功能评分、负重状态和终极指标。随访结束后仍可保留关键结局。"],
  discussion: ["Discussion Guide", "如何组织病例讨论", "讨论区用于记录术前计划、复位策略、影像判断和术后复盘。公开前仍需确认病例已经充分去标识化。"]
};

const injuryKeys = ["softTissue", "spine", "lowerLimb", "pelvis", "foot", "other"];
const injuryLabels = {
  spine: "脊柱",
  lowerLimb: "下肢",
  pelvis: "骨盆",
  foot: "足部",
  softTissue: "软组织损伤",
  other: "其他"
};

const softTissueKeys = ["swelling", "waterBlister", "bloodBlister", "openWound", "compartment", "other"];
const softTissueLabels = {
  waterBlister: "水泡",
  bloodBlister: "血泡",
  openWound: "开放性骨折",
  swelling: "明显肿胀",
  compartment: "骨筋膜室综合征",
  other: "其他软组织损伤"
};
const softTissueFieldMap = {
  swelling: ["softTissueSwelling", "softTissueSwellingDetail"],
  waterBlister: ["softTissueWaterBlister", "softTissueWaterBlisterDetail"],
  bloodBlister: ["softTissueBloodBlister", "softTissueBloodBlisterDetail"],
  openWound: ["softTissueOpenWound", "softTissueOpenWoundDetail"],
  compartment: ["softTissueCompartment", "softTissueCompartmentDetail"],
  other: ["softTissueOther", "softTissueOtherDetail"]
};

const measurementDistanceTypes = [];

const scoreConfigs = {
  aofas: {
    label: "AOFAS 足踝-后足评分",
    items: [
      { key: "pain", label: "疼痛", max: 40, step: 5 },
      { key: "function", label: "功能", max: 50, step: 5 },
      { key: "alignment", label: "力线", max: 10, step: 5 }
    ]
  },
  maryland: {
    label: "Maryland 足部评分",
    items: [
      { key: "pain", label: "疼痛", max: 45, step: 5 },
      { key: "function", label: "功能", max: 50, step: 5 },
      { key: "cosmesis", label: "外观", max: 5, step: 5 }
    ]
  },
  sf36: {
    label: "SF-36 生活质量评分",
    items: [
      { key: "physicalFunction", label: "躯体功能", max: 100, step: 10 },
      { key: "pain", label: "疼痛影响", max: 100, step: 10 },
      { key: "generalHealth", label: "总体健康", max: 100, step: 10 }
    ],
    average: true
  }
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

function normalizeActiveTab(value = "overview") {
  if (value === "measure") return "images";
  return ["overview", "classify", "images", "followup", "discussion"].includes(value) ? value : "overview";
}

function normalizeState(value) {
  const next = {
    ...cloneDefaultState(),
    ...(value || {})
  };
  next.cases = Array.isArray(next.cases) ? next.cases : [];
  next.trash = Array.isArray(next.trash) ? next.trash : [];
  next.discussionReads = next.discussionReads && typeof next.discussionReads === "object" ? next.discussionReads : {};
  next.activeTab = normalizeActiveTab(next.activeTab);
  next.activeCaseId = next.cases.some((item) => item.id === next.activeCaseId)
    ? next.activeCaseId
    : next.cases[0]?.id || null;
  return next;
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
  trashCount: $("#trashCount"),
  trashList: $("#trashList"),
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
    admissionDate: $("#admissionDate"),
    surgeryDate: $("#surgeryDate"),
    dischargeDate: $("#dischargeDate"),
    surgeryWaitDays: $("#surgeryWaitDays"),
    hospitalStayDays: $("#hospitalStayDays"),
    surgeryMethod: $("#surgeryMethod"),
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
    softTissueSwelling: $("#softTissueSwelling"),
    softTissueSwellingDetail: $("#softTissueSwellingDetail"),
    softTissueWaterBlister: $("#softTissueWaterBlister"),
    softTissueWaterBlisterDetail: $("#softTissueWaterBlisterDetail"),
    softTissueBloodBlister: $("#softTissueBloodBlister"),
    softTissueBloodBlisterDetail: $("#softTissueBloodBlisterDetail"),
    softTissueOpenWound: $("#softTissueOpenWound"),
    softTissueOpenWoundDetail: $("#softTissueOpenWoundDetail"),
    softTissueCompartment: $("#softTissueCompartment"),
    softTissueCompartmentDetail: $("#softTissueCompartmentDetail"),
    softTissueOther: $("#softTissueOther"),
    softTissueOtherDetail: $("#softTissueOtherDetail"),
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
    privacyConfirmed: $("#privacyConfirmed"),
    adminApplicationReason: $("#adminApplicationReason"),
    adminTeachingProfile: $("#adminTeachingProfile"),
    isMulticenterCase: $("#isMulticenterCase"),
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
  applyResearchAccess: $("#applyResearchAccess"),
  researchAccessStatus: $("#researchAccessStatus"),
  ethicsApprovalFile: $("#ethicsApprovalFile"),
  ethicsApprovalFileName: $("#ethicsApprovalFileName"),
  credentialFile: $("#credentialFile"),
  credentialFileName: $("#credentialFileName"),
  imageUpload: $("#imageUpload"),
  cameraCapture: $("#cameraCapture"),
  imageSelect: $("#imageSelect"),
  imageList: $("#imageList"),
  toggleImageOrganize: $("#toggleImageOrganize"),
  imageOrganizeBar: $("#imageOrganizeBar"),
  imageSelectionCount: $("#imageSelectionCount"),
  openImageClassify: $("#openImageClassify"),
  deleteSelectedImages: $("#deleteSelectedImages"),
  cancelImageOrganize: $("#cancelImageOrganize"),
  imageClassifyDialog: $("#imageClassifyDialog"),
  closeImageClassify: $("#closeImageClassify"),
  followupTimepointWrap: $("#followupTimepointWrap"),
  followupTimepointInput: $("#followupTimepointInput"),
  imageCanvas: $("#imageCanvas"),
  bulkImageCategory: $("#bulkImageCategory"),
  applyBulkImageCategory: $("#applyBulkImageCategory"),
  autoCrop: $("#autoCrop"),
  squareCrop: $("#squareCrop"),
  perspectiveMode: $("#perspectiveMode"),
  perspectiveHelp: $("#perspectiveHelp"),
  applyPerspective: $("#applyPerspective"),
  resetPerspective: $("#resetPerspective"),
  rotateImage: $("#rotateImage"),
  imageUploadStatus: $("#imageUploadStatus"),
  undoImage: $("#undoImage"),
  redoImage: $("#redoImage"),
  resetOriginalImage: $("#resetOriginalImage"),
  imageDisplayMode: $("#imageDisplayMode"),
  saveImage: $("#saveImage"),
  maskMode: $("#maskMode"),
  maskFill: $("#maskFill"),
  applyMaskRectangles: $("#applyMaskRectangles"),
  deleteMaskRectangle: $("#deleteMaskRectangle"),
  clearMaskRectangles: $("#clearMaskRectangles"),
  captureHideReflection: $("#captureHideReflection"),
  captureHidePatientInfo: $("#captureHidePatientInfo"),
  captureReadyForClassify: $("#captureReadyForClassify"),
  gestureAdjustMode: $("#gestureAdjustMode"),
  blackWhiteMode: $("#blackWhiteMode"),
  brightness: $("#brightness"),
  contrast: $("#contrast"),
  sharpen: $("#sharpen"),
  measureCanvas: $("#imageCanvas"),
  measurementView: $("#measurementView"),
  measurementImageSelect: $("#measurementImageSelect"),
  measurementReadoutLabel: $("#measurementReadoutLabel"),
  angleValue: $("#angleValue"),
  resetPoints: $("#resetPoints"),
  measurementButtons: $$("[data-start-measurement]"),
  saveActiveMeasurement: $("#saveActiveMeasurement"),
  deleteActiveMeasurement: $("#deleteActiveMeasurement"),
  exitMeasurementMode: $("#exitMeasurementMode"),
  ctMeasurementPanel: $("#ctMeasurementPanel"),
  ctDepressionValue: $("#ctDepressionValue"),
  saveCtDepression: $("#saveCtDepression"),
  measurementHelp: $("#measurementHelp"),
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
  openScoreDialog: $("#openScoreDialog"),
  scoreDialog: $("#scoreDialog"),
  closeScoreDialog: $("#closeScoreDialog"),
  scoreScale: $("#scoreScale"),
  scoreItems: $("#scoreItems"),
  scoreTotal: $("#scoreTotal"),
  clearScoreDraft: $("#clearScoreDraft"),
  applyScoreDraft: $("#applyScoreDraft"),
  commentBody: $("#commentBody"),
  addComment: $("#addComment"),
  discussionBoard: $("#discussionBoard"),
  caseReadingView: $("#caseReadingView"),
  commentList: $("#commentList")
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeState(raw ? JSON.parse(raw) : cloneDefaultState());
  } catch {
    return cloneDefaultState();
  }
}

function normalizePrivateState(value) {
  return {
    cases: value?.cases || {},
    trash: value?.trash || {}
  };
}

function isEmptyPrivateState(value) {
  return !Object.keys(value?.cases || {}).length && !Object.keys(value?.trash || {}).length;
}

function loadPrivateState() {
  try {
    const raw = localStorage.getItem(PRIVATE_STORAGE_KEY);
    return normalizePrivateState(raw ? JSON.parse(raw) : null);
  } catch {
    return { cases: {}, trash: {} };
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

function openLocalDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(LOCAL_DATABASE_NAME, LOCAL_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LOCAL_RECORD_STORE)) {
        db.createObjectStore(LOCAL_RECORD_STORE, { keyPath: "key" });
      }
    };
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
    request.onsuccess = () => resolve(request.result);
  });
}

async function readLargeRecord(key) {
  const db = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LOCAL_RECORD_STORE, "readonly");
    const request = tx.objectStore(LOCAL_RECORD_STORE).get(key);
    request.onerror = () => reject(request.error || new Error("Failed to read local record"));
    request.onsuccess = () => resolve(request.result?.data || null);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("Failed to read local record"));
    };
  });
}

async function writeLargeRecord(key, data) {
  const db = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LOCAL_RECORD_STORE, "readwrite");
    const request = tx.objectStore(LOCAL_RECORD_STORE).put({
      key,
      data,
      savedAt: new Date().toISOString()
    });
    request.onerror = () => reject(request.error || new Error("Failed to write local record"));
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("Failed to write local record"));
    };
  });
}

function latestStateTime(value) {
  const items = [...(value?.cases || []), ...(value?.trash || [])];
  return items.reduce((latest, item) => {
    const candidates = [item.updatedAt, item.createdAt, item.deletedAt].filter(Boolean);
    const stamp = Math.max(0, ...candidates.map((date) => new Date(date).getTime() || 0));
    return Math.max(latest, stamp);
  }, 0);
}

function shouldUseLargeState(largeState, currentState) {
  const largeCount = (largeState?.cases?.length || 0) + (largeState?.trash?.length || 0);
  if (!largeCount) return false;
  const currentCount = (currentState?.cases?.length || 0) + (currentState?.trash?.length || 0);
  if (!currentCount) return true;
  return latestStateTime(largeState) >= latestStateTime(currentState);
}

async function hydrateFromLargeLocalStorage() {
  try {
    const [largeState, largePrivateState, largeAccessState] = await Promise.all([
      readLargeRecord(LARGE_STORAGE_KEYS.state).catch(() => null),
      readLargeRecord(LARGE_STORAGE_KEYS.private).catch(() => null),
      readLargeRecord(LARGE_STORAGE_KEYS.access).catch(() => null)
    ]);
    const normalizedLargeState = largeState ? normalizeState(largeState) : null;
    if (normalizedLargeState && shouldUseLargeState(normalizedLargeState, state)) {
      state = normalizedLargeState;
    }
    if (largePrivateState && isEmptyPrivateState(privateState)) {
      privateState = normalizePrivateState(largePrivateState);
    }
    if (largeAccessState && !accessState.approved) accessState = largeAccessState;
  } catch {
    // localStorage remains the fallback in browsers that block IndexedDB.
  }
}

function snapshotForStorage(data) {
  try {
    return structuredClone(data);
  } catch {
    return JSON.parse(JSON.stringify(data));
  }
}

function writeLargeRecordQuietly(key, data, successMessage = "") {
  const snapshot = snapshotForStorage(data);
  largeStorageWriteQueues[key] = (largeStorageWriteQueues[key] || Promise.resolve())
    .catch(() => {})
    .then(() => writeLargeRecord(key, snapshot));
  const write = largeStorageWriteQueues[key]
    .then(() => {
      if (successMessage) markSaved(successMessage);
    })
    .catch(() => {
      warnLargeStorageFailure();
    });
  return write;
}

function warnLargeStorageFailure() {
  const message = "本地大容量保存失败，请先导出 JSON 备份";
  setUploadStatus(message);
  markSaved(message);
  if (!largeStorageWarningShown) {
    largeStorageWarningShown = true;
    console.warn("Calcaneal Case local persistence failed. Export a JSON backup before refreshing.");
  }
}

function persist() {
  const largeWrite = writeLargeRecordQuietly(LARGE_STORAGE_KEYS.state, state);
  try {
    const serialized = JSON.stringify(state);
    if (serialized.length > LOCAL_STORAGE_SOFT_LIMIT) {
      throw new Error("State is too large for localStorage mirror");
    }
    localStorage.setItem(STORAGE_KEY, serialized);
    markSaved("已自动保存");
  } catch {
    markSaved("影像较多，已保存到浏览器大容量本地存储");
  }
  return largeWrite;
}

function persistPrivate() {
  const largeWrite = writeLargeRecordQuietly(LARGE_STORAGE_KEYS.private, privateState);
  try {
    localStorage.setItem(PRIVATE_STORAGE_KEY, JSON.stringify(privateState));
    markSaved("私密信息已本地保存");
  } catch {
    markSaved("私密信息已保存到浏览器大容量本地存储");
  }
  return largeWrite;
}

function persistAccess() {
  const largeWrite = writeLargeRecordQuietly(LARGE_STORAGE_KEYS.access, accessState);
  try {
    localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(accessState));
  } catch {
    warnLargeStorageFailure();
  }
  return largeWrite;
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
  const tabName = normalizeActiveTab(state.activeTab || "overview");
  state.activeTab = tabName;
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
    const findings = { ...(value?.[key]?.findings || {}) };
    if (key === "softTissue" && findings.blister) {
      findings.waterBlister ??= true;
      findings.bloodBlister ??= true;
    }
    base[key] = {
      checked: Boolean(value?.[key]?.checked),
      detail: value?.[key]?.detail || "",
      findings,
      findingDetails: { ...(value?.[key]?.findingDetails || value?.[key]?.details || {}) }
    };
  });
  if (!value && legacyText) {
    base.other = { checked: true, detail: legacyText };
  }
  return base;
}

function normalizeResearch(value = {}) {
  return {
    isMulticenterCase: false,
    accessApproved: false,
    accessApplicationStatus: "",
    ethicsApprovalId: "",
    ethicsApprovalFileName: "",
    credentialFileName: "",
    ...(value || {})
  };
}

function combinedInjurySummary(item) {
  const combined = normalizeCombinedInjuries(item.combinedInjuries, item.combinedInjury);
  const parts = injuryKeys
    .filter((key) => combined[key]?.checked)
    .map((key) => {
      const detail = combined[key]?.detail?.trim();
      const findings = key === "softTissue"
        ? softTissueKeys
            .filter((item) => combined[key]?.findings?.[item])
            .map((item) => {
              const findingDetail = combined[key]?.findingDetails?.[item]?.trim();
              return findingDetail ? `${softTissueLabels[item]}（${findingDetail}）` : softTissueLabels[item];
            })
        : [];
      const text = [findings.join("、"), detail].filter(Boolean).join("；");
      return text ? `${injuryLabels[key]}：${text}` : injuryLabels[key];
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

function daysBetweenDates(startValue, endValue) {
  if (!startValue || !endValue) return "";
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return "";
  return String(Math.round((end - start) / 86400000));
}

function updateClinicalTimelineFromFields({ autoCalculate = true } = {}) {
  const admissionDate = els.fields.admissionDate.value;
  const surgeryDate = els.fields.surgeryDate.value;
  const dischargeDate = els.fields.dischargeDate.value;
  if (autoCalculate) {
    const waitDays = daysBetweenDates(admissionDate, surgeryDate);
    const stayDays = daysBetweenDates(admissionDate, dischargeDate);
    if (waitDays) els.fields.surgeryWaitDays.value = waitDays;
    if (stayDays) els.fields.hospitalStayDays.value = stayDays;
  }
  updateCase({
    admissionDate,
    surgeryDate,
    dischargeDate,
    surgeryWaitDays: els.fields.surgeryWaitDays.value,
    hospitalStayDays: els.fields.hospitalStayDays.value,
    surgeryMethod: els.fields.surgeryMethod.value
  });
}

function updateCombinedInjuryFromFields() {
  const combinedInjuries = {};
  injuryKeys.forEach((key) => {
    const checkbox = els.fields[`injury${injuryFieldName(key)}`];
    const detail = els.fields[`injury${injuryFieldName(key)}Detail`];
    const softFindings = {};
    const softFindingDetails = {};
    if (key === "softTissue") {
      softTissueKeys.forEach((item) => {
        const [checkboxKey, detailKey] = softTissueFieldMap[item];
        const detailText = els.fields[detailKey]?.value.trim() || "";
        softFindings[item] = Boolean(els.fields[checkboxKey]?.checked || detailText);
        softFindingDetails[item] = detailText;
      });
    }
    const softChecked = key === "softTissue"
      && (Object.values(softFindings).some(Boolean) || Object.values(softFindingDetails).some(Boolean));
    combinedInjuries[key] = {
      checked: key === "softTissue" ? Boolean(softChecked) : Boolean(checkbox.checked),
      detail: key === "softTissue" ? "" : detail.value.trim(),
      findings: softFindings,
      findingDetails: softFindingDetails
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
    softTissue: "SoftTissue",
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
    privacyLevel: normalizePrivacyLevel(seed.privacyLevel),
    ageBand: exactAgeValue(seed.age ?? seed.ageBand),
    sex: seed.sex || "",
    side: seed.side || "",
    admissionDate: seed.admissionDate || "",
    surgeryDate: seed.surgeryDate || "",
    dischargeDate: seed.dischargeDate || "",
    surgeryWaitDays: seed.surgeryWaitDays || "",
    hospitalStayDays: seed.hospitalStayDays || "",
    surgeryMethod: seed.surgeryMethod || "",
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
      deidentified: false,
      ...(seed.privacyChecks || {})
    },
    research: normalizeResearch(seed.research),
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
  const confirmed = window.confirm(`确定将病例 ${item.code} 移入垃圾箱吗？病例会保留 30 天，期间可以恢复。`);
  if (!confirmed) return;
  privateState.cases ||= {};
  privateState.trash ||= {};
  const privateData = privateState.cases[caseId] ? { ...privateState.cases[caseId] } : null;
  const deletedAt = new Date();
  const expiresAt = new Date(deletedAt.getTime() + 30 * 86400000);
  state.trash ||= [];
  state.trash.unshift({
    ...JSON.parse(JSON.stringify(item)),
    deletedAt: deletedAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  });
  if (privateData) privateState.trash[caseId] = privateData;
  state.cases.splice(index, 1);
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
  markSaved("已移入垃圾箱");
}

function restoreCase(caseId) {
  state.trash ||= [];
  const index = state.trash.findIndex((item) => item.id === caseId);
  if (index < 0) return;
  const restored = { ...state.trash[index] };
  privateState.trash ||= {};
  const privateData = privateState.trash[caseId] ? { ...privateState.trash[caseId] } : null;
  delete restored.deletedAt;
  delete restored.expiresAt;
  restored.updatedAt = new Date().toISOString();
  state.trash.splice(index, 1);
  state.cases.unshift(restored);
  state.activeCaseId = restored.id;
  if (privateData) {
    privateState.cases ||= {};
    privateState.cases[restored.id] = privateData;
  }
  delete privateState.trash[restored.id];
  persist();
  persistPrivate();
  render();
  markSaved("已恢复病例");
}

function purgeCase(caseId) {
  state.trash ||= [];
  const index = state.trash.findIndex((item) => item.id === caseId);
  if (index < 0) return;
  const item = state.trash[index];
  const confirmed = window.confirm(`确定彻底删除病例 ${item.code || ""} 吗？彻底删除后不能从垃圾箱恢复。`);
  if (!confirmed) return;
  state.trash.splice(index, 1);
  privateState.trash ||= {};
  delete privateState.trash[caseId];
  persist();
  persistPrivate();
  renderTrash();
  markSaved("已彻底删除病例");
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
    public: "公开教学"
  }[value] || "私有";
}

function normalizePrivacyLevel(value = "private") {
  return ["private", "admin", "team", "public"].includes(value) ? value : "private";
}

function privacyOptions(selected = "private") {
  const normalized = normalizePrivacyLevel(selected);
  return [
    ["private", "私有"],
    ["admin", "管理员可见"],
    ["team", "圈内讨论"],
    ["public", "公开教学"]
  ].map(([value, label]) => `<option value="${value}" ${value === normalized ? "selected" : ""}>${label}</option>`).join("");
}

function syncVisibilityUi(value) {
  const normalized = normalizePrivacyLevel(value);
  els.privacyPill.textContent = privacyLabel(normalized);
  els.visibilityCards.forEach((card) => {
    card.classList.toggle("active", card.dataset.visibilityCard === normalized);
  });
}

function researchStatusText(research = {}) {
  if (research.accessApproved) return "已准入";
  if (research.accessApplicationStatus === "pending") return "已提交申请";
  return "未加入";
}

function syncResearchUi(current = activeCase()) {
  if (!current?.research) return;
  current.research = normalizeResearch(current.research);
  const canSelect = Boolean(current.research.accessApproved);
  if (!canSelect) current.research.isMulticenterCase = false;
  els.fields.isMulticenterCase.disabled = !canSelect;
  els.fields.isMulticenterCase.checked = Boolean(canSelect && current.research.isMulticenterCase);
  els.researchAccessStatus.textContent = researchStatusText(current.research);
  els.applyResearchAccess.textContent = current.research.accessApplicationStatus === "pending"
    ? "多中心申请已保存"
    : "申请加入多中心研究";
}

function render() {
  renderCaseList();
  renderTrash();
  renderActiveCase();
  renderTutorial();
  renderImages();
  renderMeasurements();
  renderFollowups();
  renderComments();
  renderClassification();
}

function trashExpiryText(item) {
  if (!item.expiresAt) return "保留 30 天";
  const expires = new Date(item.expiresAt);
  if (Number.isNaN(expires.getTime())) return "保留 30 天";
  return `${expires.toLocaleDateString()} 前可恢复`;
}

function renderTrash() {
  if (!els.trashList || !els.trashCount) return;
  state.trash ||= [];
  els.trashCount.textContent = String(state.trash.length);
  els.trashList.innerHTML = state.trash.length
    ? state.trash.map((item) => `
        <article class="trash-item">
          <div>
            <strong>${escapeHtml(item.code || "未命名病例")}</strong>
            <span>${escapeHtml(trashExpiryText(item))}</span>
          </div>
          <div class="trash-actions">
            <button class="tool-button" type="button" data-restore-case="${item.id}">恢复</button>
            <button class="danger-button" type="button" data-purge-case="${item.id}">彻底删除</button>
          </div>
        </article>
      `).join("")
    : `<p class="helper-text">暂无删除病例。</p>`;
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
    const unread = unreadComments(item);
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
          ${unread ? `<span class="discussion-badge">${unread}</span>` : ""}
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
  current.privacyLevel = normalizePrivacyLevel(current.privacyLevel);
  els.fields.caseCode.value = current.code;
  els.fields.privacyLevel.value = current.privacyLevel;
  current.ageBand = exactAgeValue(current.ageBand);
  els.fields.ageBand.value = current.ageBand;
  els.fields.sex.value = current.sex;
  els.fields.side.value = current.side;
  els.fields.admissionDate.value = current.admissionDate || "";
  els.fields.surgeryDate.value = current.surgeryDate || "";
  els.fields.dischargeDate.value = current.dischargeDate || "";
  els.fields.surgeryWaitDays.value = current.surgeryWaitDays || "";
  els.fields.hospitalStayDays.value = current.hospitalStayDays || "";
  els.fields.surgeryMethod.value = current.surgeryMethod || "";
  current.mechanismType ||= mechanismTypeFromValue(current.mechanism);
  current.mechanismOther ||= current.mechanismType === "其他" ? current.mechanism || "" : "";
  els.fields.mechanismType.value = current.mechanismType;
  els.fields.mechanismOther.value = current.mechanismOther || "";
  setMechanismOtherVisibility();
  current.combinedInjuries = normalizeCombinedInjuries(current.combinedInjuries, current.combinedInjury);
  injuryKeys.forEach((key) => {
    const fieldName = injuryFieldName(key);
    if (key !== "softTissue") {
      els.fields[`injury${fieldName}`].checked = Boolean(current.combinedInjuries[key]?.checked);
      els.fields[`injury${fieldName}Detail`].value = current.combinedInjuries[key]?.detail || "";
    }
  });
  const softFindings = current.combinedInjuries.softTissue?.findings || {};
  const softFindingDetails = current.combinedInjuries.softTissue?.findingDetails || {};
  softTissueKeys.forEach((item) => {
    const [checkboxKey, detailKey] = softTissueFieldMap[item];
    els.fields[checkboxKey].checked = Boolean(softFindings[item] || (item === "waterBlister" && softFindings.blister));
    els.fields[detailKey].value = softFindingDetails[item] || "";
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
  els.fields.privacyConfirmed.checked = Boolean(current.privacyChecks.deidentified);
  els.fields.adminApplicationReason.value = current.adminApplication?.reason || "";
  els.fields.adminTeachingProfile.value = current.adminApplication?.teachingProfile || "";
  current.research = normalizeResearch(current.research);
  syncResearchUi(current);
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
  const defaultInterval = current.followupPlan.defaultInterval || "immediate-4w-8w-3m-6m-12m-24m";
  els.defaultFollowupInterval.value = ["immediate-4w-8w-3m-6m-12m-24m", "4w-8w-3m-6m-12m", "custom"].includes(defaultInterval)
    ? defaultInterval
    : "immediate-4w-8w-3m-6m-12m-24m";
  els.followupStatus.value = current.followupPlan.status || "ongoing";
  els.finalOutcome.value = current.followupPlan.finalOutcome || "";
  syncVisibilityUi(current.privacyLevel);
}

function renderImages() {
  const current = activeCase();
  if (!current) return;
  current.images.forEach(normalizeImageMetadata);
  const orderedImages = [...current.images].sort(compareImagesByClinicalOrder);
  selectedImageIds = new Set([...selectedImageIds].filter((id) => current.images.some((image) => image.id === id)));

  els.imageSelect.innerHTML = current.images.length
    ? current.images.map((image) => `<option value="${image.id}">${escapeHtml(imageCategoryLabel(image.category))} · ${escapeHtml(image.name)}</option>`).join("")
    : `<option value="">暂无影像</option>`;

  els.imageList.classList.toggle("organizing", imageOrganizeMode);
  els.imageList.innerHTML = orderedImages.length
    ? renderImageGroups(orderedImages)
    : `<p class="helper-text">暂无影像。可先批量上传，之后点“整理”统一归类。</p>`;
  updateImageOrganizeUi();

  const selected = current.images.find((image) => image.id === imageEditor.imageId) || current.images[0];
  if (selected) {
    els.imageSelect.value = selected.id;
    loadEditorImage(selected);
  } else {
    updateImageHistoryButtons(null);
    clearCanvas(els.imageCanvas, "上传影像后可进行裁剪、增强、保存");
    if (els.measureCanvas !== els.imageCanvas) {
      clearCanvas(els.measureCanvas, "上传并选择影像后可进行角度测量");
    }
  }
}

function resetPendingMasks() {
  maskRectangles = [];
  activeMaskRectangleId = null;
  maskDragState = null;
  maskStartPoint = null;
  maskPreviewPoint = null;
}

function renderImageGroups(images) {
  return groupImagesForFilmstrip(images).map((stage) => `
    <section class="image-stage-group">
      <header>
        <strong>${escapeHtml(stage.label)}</strong>
        <span>${stage.count} 张</span>
      </header>
      ${stage.groups.map((group) => `
        <div class="image-type-group">
          <p>${escapeHtml(group.label)}</p>
          ${group.images.map(renderImageRow).join("")}
        </div>
      `).join("")}
    </section>
  `).join("");
}

function renderImageRow(image) {
  const selected = selectedImageIds.has(image.id);
  const active = image.id === (imageEditor.imageId || activeCase()?.images?.[0]?.id);
  return `
    <article class="image-row ${selected ? "selected" : ""}" data-image-id="${image.id}">
      <button class="image-select-dot ${selected ? "selected" : ""}" type="button" data-toggle-image-selection="${image.id}" aria-label="选择 ${escapeHtml(image.name)}">${selected ? "✓" : ""}</button>
      <button class="image-pick ${active ? "active" : ""}" data-pick-image="${image.id}" type="button">
        <img src="${escapeHtml(image.dataUrl)}" alt="">
        <span>${escapeHtml(image.name)}</span>
        <em>${escapeHtml(imageCategoryLabel(image.category))}${image.phase === "followup" ? ` · ${escapeHtml(imageTimepointLabel(image.timepoint))}` : ""}</em>
      </button>
    </article>
  `;
}

function groupImagesForFilmstrip(images) {
  const stages = [];
  images.forEach((image) => {
    const stageKey = imageStageKey(image);
    const stageLabel = imageStageLabel(stageKey);
    const groupKey = imageGroupKey(image, stageKey);
    const groupLabel = imageGroupLabel(image, stageKey);
    let stage = stages.find((item) => item.key === stageKey);
    if (!stage) {
      stage = { key: stageKey, label: stageLabel, count: 0, groups: [] };
      stages.push(stage);
    }
    let group = stage.groups.find((item) => item.key === groupKey);
    if (!group) {
      group = { key: groupKey, label: groupLabel, images: [] };
      stage.groups.push(group);
    }
    group.images.push(image);
    stage.count += 1;
  });
  return stages.sort((a, b) => imageStageOrder(a.key) - imageStageOrder(b.key));
}

function imageStageKey(image) {
  normalizeImageMetadata(image);
  if (image.category === "unclassified" || image.phase === "unclassified") return "unclassified";
  if (image.phase === "preop") return "preop";
  if (image.phase === "intraop") return "intraop";
  if (image.phase === "postop") return "postop-immediate";
  if (image.phase === "followup") return "followup";
  return "other";
}

function imageStageLabel(key) {
  return {
    unclassified: "待归类",
    preop: "术前",
    intraop: "术中",
    "postop-immediate": "术后即刻",
    followup: "随访",
    other: "其他"
  }[key] || "其他";
}

function imageStageOrder(key) {
  return {
    unclassified: 0,
    preop: 1,
    intraop: 2,
    "postop-immediate": 3,
    followup: 4,
    other: 5
  }[key] ?? 9;
}

function imageGroupKey(image, stageKey) {
  if (stageKey === "followup") return `${image.timepoint || "followup"}:${image.modality || "other"}`;
  return image.modality || "other";
}

function imageGroupLabel(image, stageKey) {
  const modality = imageModalityLabel(image.modality);
  if (stageKey === "followup") return `${imageTimepointLabel(image.timepoint)} · ${modality}`;
  return modality;
}

function imageModalityLabel(value = "other") {
  return {
    xray: "X 线",
    ct: "CT",
    fluoro: "透视",
    appearance: "足部外观",
    rom: "活动度照片",
    incision: "切口/软组织照片",
    photo: "普通照片",
    other: "其他图片"
  }[value] || "其他图片";
}

function compareImagesByClinicalOrder(a, b) {
  const stageDiff = imageStageOrder(imageStageKey(a)) - imageStageOrder(imageStageKey(b));
  if (stageDiff) return stageDiff;
  const timeDiff = imageTimepointOrder(a.timepoint) - imageTimepointOrder(b.timepoint);
  if (timeDiff) return timeDiff;
  const modalityDiff = imageModalityOrder(a.modality) - imageModalityOrder(b.modality);
  if (modalityDiff) return modalityDiff;
  return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
}

function imageTimepointOrder(value = "") {
  const normalized = String(value || "").trim();
  const fixed = {
    "": 0,
    preop: 0,
    intraop: 0,
    "postop-immediate": 0,
    followup: 50,
    "4 周": 4,
    "8 周": 8,
    "3 月": 12,
    "6 月": 24,
    "12 月": 52,
    "24 月": 104
  };
  if (Object.hasOwn(fixed, normalized)) return fixed[normalized];
  const week = normalized.match(/(\d+(?:\.\d+)?)\s*(周|w|week)/i);
  if (week) return Number(week[1]);
  const month = normalized.match(/(\d+(?:\.\d+)?)\s*(月|m|month)/i);
  if (month) return Number(month[1]) * 4;
  return 999;
}

function imageModalityOrder(value = "") {
  return {
    xray: 1,
    ct: 2,
    fluoro: 3,
    appearance: 4,
    rom: 5,
    incision: 6,
    photo: 7,
    other: 8
  }[value] || 9;
}

function setImageOrganizeMode(enabled) {
  imageOrganizeMode = enabled;
  if (!enabled) selectedImageIds.clear();
  els.toggleImageOrganize?.classList.toggle("active", imageOrganizeMode);
  els.toggleImageOrganize.textContent = imageOrganizeMode ? "完成" : "整理";
  renderImages();
}

function updateImageOrganizeUi() {
  if (!els.imageOrganizeBar) return;
  const count = selectedImageIds.size;
  els.imageOrganizeBar.classList.toggle("hidden-field", !imageOrganizeMode);
  els.imageSelectionCount.textContent = `已选 ${count} 张`;
  els.openImageClassify.disabled = count === 0;
  els.deleteSelectedImages.disabled = count === 0;
}

function toggleImageSelection(imageId) {
  if (selectedImageIds.has(imageId)) selectedImageIds.delete(imageId);
  else selectedImageIds.add(imageId);
  updateImageOrganizeUi();
  renderImages();
}

function deleteImage(imageId) {
  const current = activeCase();
  if (!current) return;
  const index = current.images.findIndex((image) => image.id === imageId);
  if (index < 0) return;
  const image = current.images[index];
  const confirmed = window.confirm(`确定删除影像「${image.name}」吗？已保存的测量截图会保留。`);
  if (!confirmed) return;
  current.images.splice(index, 1);
  if (imageEditor.imageId === imageId) {
    const next = current.images[Math.min(index, current.images.length - 1)];
    imageEditor.imageId = next?.id || null;
    imageEditor.img = null;
    imageEditor.crop = null;
    measurePoints = [];
    setPerspectiveMode(false);
    perspectivePoints = [];
  }
  current.updatedAt = new Date().toISOString();
  persist();
  renderImages();
  renderMeasurements();
  markSaved("已删除影像");
}

function checkedImageIds() {
  return [...selectedImageIds];
}

function deleteSelectedImages() {
  const current = activeCase();
  const ids = checkedImageIds();
  if (!current || !ids.length) {
    setUploadStatus("请先在整理模式中选择影像");
    return;
  }
  const confirmed = window.confirm(`确定删除选中的 ${ids.length} 张影像吗？已保存的测量记录和测量截图会保留。`);
  if (!confirmed) return;
  current.images = current.images.filter((image) => !ids.includes(image.id));
  if (ids.includes(imageEditor.imageId)) {
    imageEditor.imageId = current.images[0]?.id || null;
    imageEditor.img = null;
    imageEditor.crop = null;
    measurePoints = [];
    activeMeasurementType = null;
  }
  selectedImageIds.clear();
  imageOrganizeMode = false;
  if (els.toggleImageOrganize) {
    els.toggleImageOrganize.classList.remove("active");
    els.toggleImageOrganize.textContent = "整理";
  }
  current.updatedAt = new Date().toISOString();
  persist();
  renderImages();
  renderMeasurements();
  setUploadStatus(`已删除 ${ids.length} 张影像`);
}

function applyBulkImageCategory() {
  const current = activeCase();
  const ids = checkedImageIds();
  if (!current || !ids.length) {
    setUploadStatus("请先勾选要归类的影像");
    return;
  }
  const category = els.bulkImageCategory.value;
  if (!category || category === "unclassified") {
    setUploadStatus("请先选择一个具体影像分类");
    return;
  }
  const followupTimepoint = els.followupTimepointInput?.value.trim();
  const changedImages = [];
  current.images.forEach((image) => {
    if (!ids.includes(image.id)) return;
    applyImageCategory(image, category, followupTimepoint);
    changedImages.push(image);
  });
  current.updatedAt = new Date().toISOString();
  if (changedImages[0]) {
    imageEditor.imageId = changedImages[0].id;
    imageEditor.img = null;
  }
  persist();
  selectedImageIds.clear();
  imageOrganizeMode = false;
  if (els.toggleImageOrganize) {
    els.toggleImageOrganize.classList.remove("active");
    els.toggleImageOrganize.textContent = "整理";
  }
  if (els.bulkImageCategory) els.bulkImageCategory.value = "unclassified";
  if (els.followupTimepointInput) els.followupTimepointInput.value = "";
  syncFollowupTimepointUi();
  closeDialog(els.imageClassifyDialog);
  renderImages();
  renderMeasurements();
  setUploadStatus(`已将 ${ids.length} 张影像归类为：${imageCategoryLabel(category)}`);
}

function closeDialog(dialog) {
  if (!dialog || !dialog.open) return;
  dialog.close();
}

function setPerspectiveMode(value) {
  perspectiveMode = Boolean(value);
  els.perspectiveMode?.classList.toggle("active", perspectiveMode);
  els.perspectiveHelp?.classList.toggle("hidden-field", !perspectiveMode);
}

function syncFollowupTimepointUi() {
  const category = els.bulkImageCategory?.value || "";
  const isFollowup = imageCategoryMetadata(category).phase === "followup";
  els.followupTimepointWrap?.classList.toggle("hidden-field", !isFollowup);
  if (!isFollowup && els.followupTimepointInput) els.followupTimepointInput.value = "";
}

function imageCategoryOptions(selected = "unclassified") {
  const normalized = normalizeImageCategory(selected);
  return [
    ["unclassified", "待归类"],
    ["preop-xray", "术前 X 线"],
    ["intraop-xray", "术中 X 线"],
    ["intraop-fluoro", "术中透视"],
    ["postop-xray", "术后 X 线"],
    ["preop-ct", "术前 CT"],
    ["postop-ct", "术后 CT"],
    ["followup-xray", "随访 X 线"],
    ["followup-ct", "随访 CT"],
    ["foot-appearance", "足部外观"],
    ["rom-photo", "活动度照片"],
    ["incision-photo", "切口/软组织照片"],
    ["intraop-other", "术中其他图片"],
    ["other", "其他图片"]
  ].map(([value, label]) => `<option value="${value}" ${value === normalized ? "selected" : ""}>${label}</option>`).join("");
}

function imageCategoryLabel(value = "unclassified") {
  return {
    unclassified: "待归类",
    "preop-lateral-xray": "术前侧位 X 线",
    "preop-axial-xray": "术前轴位 X 线",
    "preop-xray": "术前 X 线",
    "intraop-xray": "术中 X 线",
    "intraop-fluoro": "术中透视",
    "preop-ct": "术前 CT",
    intraop: "术中其他图片",
    "intraop-other": "术中其他图片",
    "postop-lateral-xray": "术后侧位 X 线",
    "postop-axial-xray": "术后轴位 X 线",
    "postop-xray": "术后 X 线",
    "postop-ct": "术后 CT",
    "followup-xray": "随访 X 线",
    "followup-ct": "随访 CT",
    "foot-appearance": "足部外观",
    "rom-photo": "活动度照片",
    "incision-photo": "切口/软组织照片",
    other: "其他图片"
  }[value] || "待归类";
}

function normalizeImageCategory(value = "unclassified") {
  return {
    "preop-lateral-xray": "preop-xray",
    "preop-axial-xray": "preop-xray",
    "postop-lateral-xray": "postop-xray",
    "postop-axial-xray": "postop-xray",
    intraop: "intraop-other"
  }[value] || value || "unclassified";
}

function imageTimepointLabel(value = "") {
  return {
    "pre-injury": "伤前/既往",
    "injury-day": "受伤当天",
    preop: "术前",
    intraop: "术中",
    "postop-immediate": "术后即刻",
    "postop-4w": "术后 4 周",
    "postop-8w": "术后 8 周",
    "postop-3m": "术后 3 个月",
    "postop-6m": "术后 6 个月",
    "postop-12m": "术后 12 个月",
    followup: "随访",
    custom: "自定义时间点",
    "": "未设时间点"
  }[value] || value || "未设时间点";
}

function imageCategoryMetadata(category = "unclassified") {
  const normalized = normalizeImageCategory(category);
  return {
    unclassified: { phase: "unclassified", modality: "other", timepoint: "", source: "upload" },
    "preop-xray": { phase: "preop", modality: "xray", timepoint: "preop", source: "upload" },
    "intraop-xray": { phase: "intraop", modality: "xray", timepoint: "intraop", source: "upload" },
    "intraop-fluoro": { phase: "intraop", modality: "fluoro", timepoint: "intraop", source: "upload" },
    "postop-xray": { phase: "postop", modality: "xray", timepoint: "postop-immediate", source: "upload" },
    "preop-ct": { phase: "preop", modality: "ct", timepoint: "preop", source: "upload" },
    "postop-ct": { phase: "postop", modality: "ct", timepoint: "postop-immediate", source: "upload" },
    "followup-xray": { phase: "followup", modality: "xray", timepoint: "followup", source: "followup" },
    "followup-ct": { phase: "followup", modality: "ct", timepoint: "followup", source: "followup" },
    "foot-appearance": { phase: "followup", modality: "appearance", timepoint: "followup", source: "followup" },
    "rom-photo": { phase: "followup", modality: "rom", timepoint: "followup", source: "followup" },
    "incision-photo": { phase: "followup", modality: "incision", timepoint: "followup", source: "followup" },
    "intraop-other": { phase: "intraop", modality: "other", timepoint: "intraop", source: "upload" },
    other: { phase: "", modality: "other", timepoint: "", source: "upload" }
  }[normalized] || { phase: "", modality: "other", timepoint: "", source: "upload" };
}

function applyImageCategory(image, category, followupTimepoint = "") {
  const normalized = normalizeImageCategory(category);
  const metadata = imageCategoryMetadata(normalized);
  image.category = normalized;
  image.phase = metadata.phase;
  image.modality = metadata.modality;
  image.timepoint = metadata.phase === "followup" ? (followupTimepoint || metadata.timepoint) : metadata.timepoint;
  image.source = metadata.source;
}

function normalizeImageMetadata(image) {
  if (!image) return image;
  const normalized = normalizeImageCategory(image.category);
  const metadata = imageCategoryMetadata(normalized);
  image.category = normalized;
  image.phase ||= metadata.phase;
  image.modality ||= metadata.modality;
  image.timepoint ||= metadata.timepoint;
  image.source ||= metadata.source;
  return image;
}

function inferImageCategory(fileName = "") {
  const name = fileName.toLowerCase();
  if (/随访|follow|复查/.test(name) && /ct/.test(name)) return "followup-ct";
  if (/随访|follow|复查/.test(name) && /活动|rom|range/.test(name)) return "rom-photo";
  if (/随访|follow|复查/.test(name) && /外观|appearance|足/.test(name)) return "foot-appearance";
  if (/随访|follow|复查/.test(name)) return "followup-xray";
  if (/切口|伤口|软组织|incision|wound|skin/.test(name)) return "incision-photo";
  if (/术中|intra|op/.test(name) && /透视|fluoro|c-arm|carm/.test(name)) return "intraop-fluoro";
  if (/术中|intra|op/.test(name) && /xray|x-ray|dr|片|正位|侧位|轴位|axial|lateral|lat|harris/.test(name)) return "intraop-xray";
  if (/术中|intra|op/.test(name)) return "intraop-other";
  if (/术后|post/.test(name) && /ct/.test(name)) return "postop-ct";
  if (/术后|post/.test(name)) return "postop-xray";
  if (/术前|pre/.test(name) && /ct/.test(name)) return "preop-ct";
  if (/术前|pre|xray|x-ray|dr|片/.test(name)) return "preop-xray";
  if (/ct/.test(name)) return "preop-ct";
  return "unclassified";
}

function activeMeasurementView() {
  return els.measurementView?.value || "lateral";
}

function measurementCategoriesForView(view = activeMeasurementView()) {
  return {
    lateral: ["preop-xray", "intraop-xray", "intraop-fluoro", "postop-xray", "followup-xray", "preop-lateral-xray", "postop-lateral-xray"],
    axial: ["preop-xray", "intraop-xray", "intraop-fluoro", "postop-xray", "followup-xray", "preop-ct", "postop-ct", "followup-ct", "preop-axial-xray", "postop-axial-xray"]
  }[view] || [];
}

function measurementHelpText(view = activeMeasurementView()) {
  if (!activeMeasurementType) return "默认是阅片模式。点击某个测量项目后，再在中间影像上依次点 4 个点，保存后自动回到阅片模式。";
  return {
    lateral: "跟骨侧位用于 Böhler 角和 Gissane 角：依次点击 4 个点，两点一条线，系统计算两线夹角。",
    axial: "跟骨轴位或 CT 可用于内外翻/轴线测量：资料缺失时允许选择可用的 X 线、透视或 CT 图像，依次点击 4 个点形成两条参考线。"
  }[view] || "依次点击 4 个点，两点一条线，系统计算两线夹角。";
}

function isDistanceMeasurementMode(type = "") {
  return measurementDistanceTypes.includes(type);
}

function measurementImagesForView(current, view = activeMeasurementView()) {
  if (!current?.images?.length) return [];
  const categories = measurementCategoriesForView(view);
  const matched = current.images.filter((image) => categories.includes(image.category));
  return matched.length ? matched : current.images;
}

function syncMeasurementUi(current = activeCase()) {
  if (!els.measurementView || !els.measurementImageSelect) return;
  const view = activeMeasurementView();
  const images = measurementImagesForView(current, view);
  els.measurementImageSelect.innerHTML = images.length
    ? images.map((image) => `<option value="${image.id}">${escapeHtml(imageCategoryLabel(image.category))} · ${escapeHtml(image.name)}</option>`).join("")
    : `<option value="">暂无当前场景影像</option>`;
  const hasSelected = images.some((image) => image.id === imageEditor.imageId);
  if (!hasSelected) {
    imageEditor.imageId = images[0]?.id || current?.images?.[0]?.id || null;
    imageEditor.img = null;
  }
  if (imageEditor.imageId) els.measurementImageSelect.value = imageEditor.imageId;
  els.measurementButtons.forEach((button) => {
    const views = (button.dataset.measurementView || "").split(" ");
    button.classList.toggle("hidden-field", !views.includes(view));
    button.classList.toggle("active", button.dataset.startMeasurement === activeMeasurementType);
  });
  els.ctMeasurementPanel?.classList.toggle("hidden-field", true);
  els.measurementReadoutLabel.textContent = activeMeasurementType ? `当前测量：${labelForMeasurement(activeMeasurementType)}` : "阅片模式";
  els.measurementHelp.textContent = measurementHelpText(view);
  els.saveActiveMeasurement.disabled = !activeMeasurementType;
  els.deleteActiveMeasurement.disabled = !activeMeasurementType && !editingMeasurementId;
  els.exitMeasurementMode.disabled = !activeMeasurementType;
}

function renderMeasurements() {
  const current = activeCase();
  if (!current) return;
  syncMeasurementUi(current);
  els.measurementList.innerHTML = current.measurements.length
    ? current.measurements.map((record) => `
      <article class="record-card measurement-record ${record.id === editingMeasurementId ? "editing" : ""}">
        <strong>${escapeHtml(labelForMeasurement(record.type))}</strong>
        <span>${escapeHtml(measurementValueText(record))} · ${new Date(record.updatedAt || record.createdAt).toLocaleString()}</span>
        <p>${escapeHtml(record.imageName || "未绑定影像")}</p>
        ${record.snapshotDataUrl ? `<img class="measurement-snapshot" src="${escapeHtml(record.snapshotDataUrl)}" alt="${escapeHtml(labelForMeasurement(record.type))}测量截图">` : ""}
        <div class="record-actions">
          <button class="tool-button" type="button" data-edit-measurement="${record.id}">修改</button>
          <button class="danger-button" type="button" data-delete-measurement="${record.id}">删除</button>
        </div>
      </article>
    `).join("")
    : `<p class="helper-text">暂无测量记录。选择测量小类后，在中间影像上点位并保存。</p>`;
}

function measurementValueText(record) {
  if (!record) return "";
  if (record.type === "posterior-facet-depression") return `${Number(record.valueMm).toFixed(1)} mm`;
  if (measurementDistanceTypes.includes(record.type) || record.valuePx) return `${Number(record.valuePx || record.distancePx || 0).toFixed(0)} px`;
  return `${Number(record.angle).toFixed(1)}°`;
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
  const scoreLabel = item.score?.scale ? `${scoreConfigs[item.score.scale]?.label || item.score.scale} ${item.score.total}` : "";
  return `
    <article class="record-card">
      <strong>${escapeHtml(item.stage)} · VAS ${escapeHtml(item.vas || "-")}</strong>
      <span>功能评分 ${escapeHtml(item.functionScore || "-")} · ${escapeHtml(item.weightBearing)} · ${escapeHtml(statusLabel)}</span>
      ${scoreLabel ? `<span class="reminder-badge scheduled">${escapeHtml(scoreLabel)}</span>` : ""}
      <span class="reminder-badge ${reminder.className}">${escapeHtml(reminder.label)}</span>
      ${outcomeLabel ? `<span class="reminder-badge scheduled">终极指标：${escapeHtml(outcomeLabel)}</span>` : ""}
      <p>${escapeHtml(item.notes || "无特殊情况")}</p>
      <div class="record-actions">
        <button class="tool-button" type="button" data-edit-followup="${item.id}">修改</button>
        <button class="danger-button" type="button" data-delete-followup="${item.id}">删除</button>
      </div>
    </article>
  `;
}

function scoreOptions(max, step) {
  const values = [];
  for (let value = 0; value <= max; value += step) values.push(value);
  if (!values.includes(max)) values.push(max);
  return values.map((value) => `<option value="${value}">${value}</option>`).join("");
}

function renderScoreDialog(seed = activeScoreDraft) {
  const scale = els.scoreScale.value || "aofas";
  const config = scoreConfigs[scale] || scoreConfigs.aofas;
  const seedItems = seed?.scale === scale ? seed.items || {} : {};
  els.scoreItems.innerHTML = config.items.map((item) => `
    <label>
      ${escapeHtml(item.label)}（0-${item.max}）
      <select data-score-item="${item.key}">
        ${scoreOptions(item.max, item.step)}
      </select>
    </label>
  `).join("");
  $$("[data-score-item]").forEach((select) => {
    select.value = String(seedItems[select.dataset.scoreItem] ?? 0);
    select.addEventListener("change", updateScoreTotal);
  });
  updateScoreTotal();
}

function scoreDraftFromDialog() {
  const scale = els.scoreScale.value || "aofas";
  const config = scoreConfigs[scale] || scoreConfigs.aofas;
  const items = {};
  $$("[data-score-item]").forEach((select) => {
    items[select.dataset.scoreItem] = Number(select.value);
  });
  const rawTotal = Object.values(items).reduce((sum, value) => sum + Number(value || 0), 0);
  const total = config.average ? Math.round(rawTotal / Math.max(1, config.items.length)) : rawTotal;
  return {
    scale,
    label: config.label,
    items,
    total
  };
}

function updateScoreTotal() {
  const draft = scoreDraftFromDialog();
  els.scoreTotal.textContent = String(draft.total);
  return draft;
}

function openScoreDialog() {
  els.scoreScale.value = activeScoreDraft?.scale || "aofas";
  renderScoreDialog(activeScoreDraft);
  if (typeof els.scoreDialog.showModal === "function") els.scoreDialog.showModal();
  else els.scoreDialog.setAttribute("open", "");
}

function closeScoreDialog() {
  if (typeof els.scoreDialog.close === "function") els.scoreDialog.close();
  else els.scoreDialog.removeAttribute("open");
}

function applyScoreDraft() {
  activeScoreDraft = updateScoreTotal();
  els.functionScore.value = String(activeScoreDraft.total);
  closeScoreDialog();
  markSaved("已写入功能评分");
}

function clearScoreDraft() {
  activeScoreDraft = null;
  els.functionScore.value = "";
  closeScoreDialog();
  markSaved("已取消评分表");
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
  if (state.activeTab === "discussion") {
    markDiscussionRead(current.id, false);
    renderCaseList();
  }
  renderDiscussionBoard();
  renderCaseReadingView(current);
  els.commentList.innerHTML = current.comments.length
    ? current.comments.map((item) => `
        <article class="comment-card">
          <span>${new Date(item.createdAt).toLocaleString()}</span>
          <p>${escapeHtml(item.body)}</p>
        </article>
      `).join("")
    : `<p class="helper-text">暂无讨论。可以先记录术前计划、复位策略或术后复盘。</p>`;
}

function discussionVisibleCases() {
  return state.cases.filter((item) => item.privacyLevel !== "private" || item.id === state.activeCaseId);
}

function unreadComments(item) {
  const readAt = state.discussionReads?.[item.id] ? new Date(state.discussionReads[item.id]).getTime() : 0;
  return (item.comments || []).filter((comment) => new Date(comment.createdAt).getTime() > readAt).length;
}

function markDiscussionRead(caseId, rerender = true) {
  if (!caseId) return;
  state.discussionReads ||= {};
  state.discussionReads[caseId] = new Date().toISOString();
  persist();
  if (rerender) {
    renderCaseList();
    renderDiscussionBoard();
  }
}

function renderDiscussionBoard() {
  if (!els.discussionBoard) return;
  const cases = discussionVisibleCases();
  els.discussionBoard.innerHTML = cases.length
    ? cases.map((item) => {
        const unread = unreadComments(item);
        return `
          <button class="forum-case-card ${item.id === state.activeCaseId ? "active" : ""}" type="button" data-open-discussion-case="${item.id}">
            <strong>${escapeHtml(item.code)}</strong>
            <span>${escapeHtml(privacyLabel(item.privacyLevel))} · ${item.images.length} 张影像 · ${item.comments.length} 条讨论</span>
            <em>${escapeHtml(caseMechanismLabel(item) || "受伤机制未填写")}</em>
            ${unread ? `<b>${unread}</b>` : ""}
          </button>
        `;
      }).join("")
    : `<p class="helper-text">暂无可讨论病例。将病例设为管理员可见、圈内教学或公开教学后，会进入讨论区。</p>`;
}

function renderCaseReadingView(current) {
  if (!els.caseReadingView || !current) return;
  const latestMeasurement = current.measurements?.[0];
  const latestFollowup = current.followups?.[0];
  const imagePreview = current.images?.slice(0, 4).map((image) => `
    <figure>
      <img src="${escapeHtml(image.dataUrl)}" alt="${escapeHtml(image.name)}">
      <figcaption>${escapeHtml(imageCategoryLabel(image.category))}</figcaption>
    </figure>
  `).join("");
  els.caseReadingView.innerHTML = `
    <div class="reading-header">
      <div>
        <p class="eyebrow">Standard Case View</p>
        <h3>${escapeHtml(current.code)}</h3>
      </div>
      <span class="status-pill">${escapeHtml(privacyLabel(current.privacyLevel))}</span>
    </div>
    <div class="reading-grid">
      <span>年龄/性别：${escapeHtml(current.ageBand || "-")} 岁 · ${escapeHtml(current.sex || "-")}</span>
      <span>侧别：${escapeHtml(current.side || "-")}</span>
      <span>受伤机制：${escapeHtml(caseMechanismLabel(current) || "-")}</span>
      <span>合并损伤：${escapeHtml(combinedInjurySummary(current) || "无/未填")}</span>
      <span>分型：${escapeHtml(current.classification?.essex || "Essex 待确认")} / ${escapeHtml(current.classification?.sanders || "Sanders 待确认")}</span>
      <span>Zwipp：${escapeHtml(zwippPoints(current.classification || {}) ? `${zwippPoints(current.classification)} 个确认点` : "待补充")}</span>
      <span>最新测量：${latestMeasurement ? `${labelForMeasurement(latestMeasurement.type)} ${measurementValueText(latestMeasurement)}` : "暂无"}</span>
      <span>最新随访：${latestFollowup ? `${latestFollowup.stage} · ${latestFollowup.status === "completed" ? "结束" : "继续"}` : "暂无"}</span>
    </div>
    ${imagePreview ? `<div class="reading-images">${imagePreview}</div>` : `<p class="helper-text">暂无影像。上传影像后这里会自动生成阅读预览。</p>`}
  `;
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
    "step-off": "台阶",
    gap: "间隙",
    "posterior-facet-depression": "CT 关节面塌陷程度",
    custom: "自定义"
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
  if (maskMode) drawMaskRectanglesOverlay(canvas);
}

function drawMeasure() {
  const canvas = els.measureCanvas;
  if (!imageEditor.img) {
    clearCanvas(canvas, "上传并选择影像后可进行角度测量");
    return;
  }
  drawProcessedImage(canvas);
  drawMeasureOverlay(canvas);
  if (maskMode) drawMaskRectanglesOverlay(canvas);
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

function drawMaskOverlay(canvas, start, end) {
  if (!start || !end) return;
  const ctx = canvas.getContext("2d");
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  ctx.save();
  ctx.fillStyle = "rgba(5, 8, 7, 0.36)";
  ctx.strokeStyle = "#f7d154";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
  ctx.restore();
}

function drawMaskRectanglesOverlay(canvas) {
  if (!maskRectangles.length) return;
  const ctx = canvas.getContext("2d");
  ctx.save();
  maskRectangles.forEach((rect) => {
    const active = rect.id === activeMaskRectangleId;
    ctx.fillStyle = "rgba(5, 8, 7, 0.55)";
    ctx.strokeStyle = active ? "#f7d154" : "rgba(247, 209, 84, 0.58)";
    ctx.lineWidth = active ? 3 : 2;
    ctx.setLineDash(active ? [] : [7, 5]);
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    if (active) {
      ctx.setLineDash([]);
      maskHandlePoints(rect).forEach((point) => {
        ctx.fillStyle = "#f7d154";
        ctx.fillRect(point.x - 5, point.y - 5, 10, 10);
      });
    }
  });
  ctx.restore();
}

function maskHandlePoints(rect) {
  return [
    { key: "nw", x: rect.x, y: rect.y },
    { key: "ne", x: rect.x + rect.width, y: rect.y },
    { key: "sw", x: rect.x, y: rect.y + rect.height },
    { key: "se", x: rect.x + rect.width, y: rect.y + rect.height }
  ];
}

function maskHitTest(point) {
  for (const rect of [...maskRectangles].reverse()) {
    const handle = maskHandlePoints(rect).find((item) => Math.abs(point.x - item.x) <= 12 && Math.abs(point.y - item.y) <= 12);
    if (handle) return { rect, action: handle.key };
    if (point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height) {
      return { rect, action: "move" };
    }
  }
  return null;
}

function normalizeMaskRect(rect) {
  const bounds = imageBounds(els.imageCanvas);
  let x = rect.x;
  let y = rect.y;
  let width = rect.width;
  let height = rect.height;
  if (width < 0) {
    x += width;
    width = Math.abs(width);
  }
  if (height < 0) {
    y += height;
    height = Math.abs(height);
  }
  x = Math.max(bounds.x, Math.min(bounds.x + bounds.width - width, x));
  y = Math.max(bounds.y, Math.min(bounds.y + bounds.height - height, y));
  width = Math.max(1, Math.min(width, bounds.x + bounds.width - x));
  height = Math.max(1, Math.min(height, bounds.y + bounds.height - y));
  return { ...rect, x, y, width, height };
}

function updateMaskDrag(point) {
  if (!maskDragState) return;
  const rect = maskRectangles.find((item) => item.id === maskDragState.id);
  if (!rect) return;
  const dx = point.x - maskDragState.start.x;
  const dy = point.y - maskDragState.start.y;
  const original = maskDragState.original;
  if (maskDragState.action === "draw") {
    Object.assign(rect, normalizeMaskRect({
      ...rect,
      x: original.x,
      y: original.y,
      width: dx,
      height: dy
    }));
  } else if (maskDragState.action === "move") {
    Object.assign(rect, normalizeMaskRect({
      ...rect,
      x: original.x + dx,
      y: original.y + dy,
      width: original.width,
      height: original.height
    }));
  } else {
    const next = { ...original };
    if (maskDragState.action.includes("n")) {
      next.y = original.y + dy;
      next.height = original.height - dy;
    }
    if (maskDragState.action.includes("s")) next.height = original.height + dy;
    if (maskDragState.action.includes("w")) {
      next.x = original.x + dx;
      next.width = original.width - dx;
    }
    if (maskDragState.action.includes("e")) next.width = original.width + dx;
    Object.assign(rect, normalizeMaskRect({ ...rect, ...next }));
  }
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
  const view = activeMeasurementView();
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
  if (!isDistanceMeasurementMode() && measurePoints.length >= 4) drawLine(ctx, measurePoints[2], measurePoints[3]);
  ctx.restore();

  if (isDistanceMeasurementMode()) {
    const distance = currentDistance();
    els.angleValue.textContent = distance ? `${distance.toFixed(0)} px` : "--";
    return;
  }
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

function currentDistance() {
  if (measurePoints.length < 2) return null;
  return distance(measurePoints[0], measurePoints[1]);
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

function clampRange(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
      deidentified: true
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
        stage: "术后 8 周",
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
  const preferredId = imageEditor.imageId || els.measurementImageSelect?.value || els.imageSelect?.value;
  return current.images.find((image) => image.id === preferredId) || current.images[0] || null;
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
  record.name = `${record.name.replace(/ \((处理|矫正|遮挡)\)$/, "")} (${suffix})`;
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
  setPerspectiveMode(false);
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

  els.trashList.addEventListener("click", (event) => {
    const restoreButton = event.target.closest("[data-restore-case]");
    if (restoreButton) {
      restoreCase(restoreButton.dataset.restoreCase);
      return;
    }
    const purgeButton = event.target.closest("[data-purge-case]");
    if (purgeButton) purgeCase(purgeButton.dataset.purgeCase);
  });

  els.caseList.addEventListener("change", (event) => {
    const select = event.target.closest("[data-case-privacy]");
    if (!select) return;
    const item = state.cases.find((caseItem) => caseItem.id === select.dataset.casePrivacy);
    if (!item) return;
    const nextPrivacy = normalizePrivacyLevel(select.value);
    if (nextPrivacy !== "private" && item.privacyLevel === "private") {
      const confirmed = window.confirm("病例即将进入管理员可见、圈内教学或公开范围。请确认已经去除患者姓名、电话、身份证号、住院号、检查号、二维码等可识别信息。");
      if (!confirmed) {
        select.value = item.privacyLevel;
        return;
      }
      item.privacyChecks ||= {};
      item.privacyChecks.deidentified = true;
    }
    item.privacyLevel = nextPrivacy;
    item.updatedAt = new Date().toISOString();
    persist();
    if (item.id === state.activeCaseId) {
      els.fields.privacyLevel.value = item.privacyLevel;
      syncVisibilityUi(item.privacyLevel);
    }
    renderCaseList();
  });

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = normalizeActiveTab(tab.dataset.tab);
      els.tabs.forEach((item) => item.classList.toggle("active", item === tab));
      Object.entries(els.panels).forEach(([key, panel]) => panel.classList.toggle("active", key === name));
      state.activeTab = name;
      persist();
      renderTutorial(name);
      if (name === "images") {
        syncMeasurementUi();
        const image = selectedImage();
        if (image) loadEditorImage(image);
        else drawMeasure();
      } else if (name === "discussion") {
        markDiscussionRead(state.activeCaseId, false);
        renderCaseList();
        renderComments();
      }
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
  ["admissionDate", "surgeryDate", "dischargeDate", "surgeryMethod"].forEach((key) => {
    els.fields[key].addEventListener("change", () => updateClinicalTimelineFromFields());
  });
  ["surgeryWaitDays", "hospitalStayDays"].forEach((key) => {
    els.fields[key].addEventListener("input", () => updateClinicalTimelineFromFields({ autoCalculate: false }));
  });

  injuryKeys.forEach((key) => {
    const fieldName = injuryFieldName(key);
    if (key !== "softTissue") {
      els.fields[`injury${fieldName}`].addEventListener("change", updateCombinedInjuryFromFields);
      els.fields[`injury${fieldName}Detail`].addEventListener("input", updateCombinedInjuryFromFields);
    }
  });

  softTissueKeys.forEach((item) => {
    const [checkboxKey, detailKey] = softTissueFieldMap[item];
    els.fields[checkboxKey].addEventListener("change", updateCombinedInjuryFromFields);
    els.fields[detailKey].addEventListener("input", updateCombinedInjuryFromFields);
  });

  els.fields.adminApplicationReason.addEventListener("input", () => {
    updateNestedCase("adminApplication.reason", els.fields.adminApplicationReason.value);
  });

  els.fields.adminTeachingProfile.addEventListener("input", () => {
    updateNestedCase("adminApplication.teachingProfile", els.fields.adminTeachingProfile.value);
  });

  els.fields.isMulticenterCase.addEventListener("change", () => {
    const current = activeCase();
    if (!current) return;
    current.research = normalizeResearch(current.research);
    if (!current.research.accessApproved) {
      current.research.isMulticenterCase = false;
      syncResearchUi(current);
      markSaved("需先通过多中心准入");
      return;
    }
    updateNestedCase("research.isMulticenterCase", els.fields.isMulticenterCase.checked);
  });

  els.applyResearchAccess.addEventListener("click", () => {
    const current = activeCase();
    if (!current) return;
    current.research = normalizeResearch(current.research);
    current.research.accessApplicationStatus = "pending";
    current.updatedAt = new Date().toISOString();
    persist();
    syncResearchUi(current);
    markSaved("多中心加入申请已保存");
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

  els.fields.privacyConfirmed.addEventListener("change", () => updateNestedCase("privacyChecks.deidentified", els.fields.privacyConfirmed.checked));

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
    renderMeasurements();
  });
  els.toggleImageOrganize?.addEventListener("click", () => setImageOrganizeMode(!imageOrganizeMode));
  els.cancelImageOrganize?.addEventListener("click", () => setImageOrganizeMode(false));
  els.openImageClassify?.addEventListener("click", () => {
    if (!selectedImageIds.size) {
      setUploadStatus("请先选择要归类的影像");
      return;
    }
    syncFollowupTimepointUi();
    els.imageClassifyDialog?.showModal();
  });
  els.closeImageClassify?.addEventListener("click", () => closeDialog(els.imageClassifyDialog));
  els.bulkImageCategory?.addEventListener("change", syncFollowupTimepointUi);
  els.deleteSelectedImages?.addEventListener("click", deleteSelectedImages);
  els.imageList.addEventListener("click", (event) => {
    const selectionToggle = event.target.closest("[data-toggle-image-selection]");
    if (selectionToggle) {
      imageEditor.imageId = selectionToggle.dataset.toggleImageSelection;
      imageEditor.img = null;
      toggleImageSelection(selectionToggle.dataset.toggleImageSelection);
      return;
    }
    const pick = event.target.closest("[data-pick-image]");
    if (!pick) return;
    imageEditor.imageId = pick.dataset.pickImage;
    imageEditor.img = null;
    resetPendingMasks();
    setPerspectiveMode(false);
    perspectivePoints = [];
    measurePoints = [];
    activeMeasurementType = null;
    if (imageOrganizeMode) {
      if (selectedImageIds.has(pick.dataset.pickImage)) selectedImageIds.delete(pick.dataset.pickImage);
      else selectedImageIds.add(pick.dataset.pickImage);
    }
    renderImages();
    renderMeasurements();
  });

  els.applyBulkImageCategory.addEventListener("click", applyBulkImageCategory);
  els.maskMode?.addEventListener("change", () => {
    maskMode = els.maskMode.checked;
    if (maskMode) {
      setPerspectiveMode(false);
      gestureAdjustMode = false;
      if (els.gestureAdjustMode) els.gestureAdjustMode.checked = false;
      drawEditor();
    }
  });
  els.applyMaskRectangles?.addEventListener("click", applyMaskRectangles);
  els.deleteMaskRectangle?.addEventListener("click", deleteActiveMaskRectangle);
  els.clearMaskRectangles?.addEventListener("click", clearMaskRectangles);
  els.gestureAdjustMode?.addEventListener("change", () => {
    gestureAdjustMode = els.gestureAdjustMode.checked;
    if (gestureAdjustMode) {
      setPerspectiveMode(false);
      maskMode = false;
      if (els.maskMode) els.maskMode.checked = false;
      drawEditor();
    }
  });
  [els.captureHideReflection, els.captureHidePatientInfo, els.captureReadyForClassify].forEach((input) => {
    input?.addEventListener("change", () => setUploadStatus("采集清理检查已更新"));
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
    setPerspectiveMode(!perspectiveMode);
    if (perspectiveMode) {
      gestureAdjustMode = false;
      maskMode = false;
      if (els.gestureAdjustMode) els.gestureAdjustMode.checked = false;
      if (els.maskMode) els.maskMode.checked = false;
      activeMeasurementType = null;
      ensurePerspectivePoints();
    }
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

  els.measurementView.addEventListener("change", () => {
    measurePoints = [];
    activeMeasurementType = null;
    syncMeasurementUi();
    const image = selectedImage();
    if (image) loadEditorImage(image);
    renderMeasurements();
    drawMeasure();
  });

  els.measurementImageSelect.addEventListener("change", () => {
    imageEditor.imageId = els.measurementImageSelect.value;
    imageEditor.img = null;
    resetPendingMasks();
    measurePoints = [];
    activeMeasurementType = null;
    const image = selectedImage();
    if (image) loadEditorImage(image);
    renderMeasurements();
  });

  els.saveCtDepression?.addEventListener("click", saveCtDepression);

  els.imageCanvas.addEventListener("pointerdown", handlePerspectivePointerDown);
  els.imageCanvas.addEventListener("pointermove", handlePerspectivePointerMove);
  els.imageCanvas.addEventListener("pointerup", handlePerspectivePointerUp);
  els.imageCanvas.addEventListener("pointerleave", handlePerspectivePointerUp);

  els.measureCanvas.addEventListener("click", (event) => {
    if (!imageEditor.img || perspectiveMode || maskMode || gestureAdjustMode || !activeMeasurementType) return;
    if (suppressNextMeasureClick) {
      suppressNextMeasureClick = false;
      return;
    }
    const rect = els.measureCanvas.getBoundingClientRect();
    const scaleX = els.measureCanvas.width / rect.width;
    const scaleY = els.measureCanvas.height / rect.height;
    const maxPoints = 4;
    if (measurePoints.length >= maxPoints) measurePoints = [];
    measurePoints.push(clampToImageBounds({
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    }));
    drawMeasure();
  });

  els.resetPoints.addEventListener("click", () => {
    measurePoints = [];
    drawMeasure();
  });

  els.measurementButtons.forEach((button) => {
    button.addEventListener("click", () => startMeasurement(button.dataset.startMeasurement, button.dataset.measurementView));
  });
  els.saveActiveMeasurement?.addEventListener("click", () => saveMeasurement(activeMeasurementType));
  els.deleteActiveMeasurement?.addEventListener("click", deleteActiveMeasurementRecord);
  els.exitMeasurementMode?.addEventListener("click", () => exitMeasurementMode());
  els.measurementList.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-measurement]");
    if (editButton) {
      editMeasurement(editButton.dataset.editMeasurement);
      return;
    }
    const deleteButton = event.target.closest("[data-delete-measurement]");
    if (deleteButton) deleteMeasurement(deleteButton.dataset.deleteMeasurement);
  });
  els.defaultFollowupInterval.addEventListener("change", () => updateNestedCase("followupPlan.defaultInterval", els.defaultFollowupInterval.value));
  els.followupStatus.addEventListener("change", () => updateNestedCase("followupPlan.status", els.followupStatus.value));
  els.finalOutcome.addEventListener("change", () => updateNestedCase("followupPlan.finalOutcome", els.finalOutcome.value));
  els.addFollowup.addEventListener("click", addFollowup);
  els.openScoreDialog.addEventListener("click", openScoreDialog);
  els.closeScoreDialog.addEventListener("click", closeScoreDialog);
  els.scoreScale.addEventListener("change", () => renderScoreDialog());
  els.applyScoreDraft.addEventListener("click", applyScoreDraft);
  els.clearScoreDraft.addEventListener("click", clearScoreDraft);
  els.functionScore.addEventListener("input", () => {
    activeScoreDraft = null;
  });
  els.followupList.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-followup]");
    if (editButton) {
      editFollowup(editButton.dataset.editFollowup);
      return;
    }
    const deleteButton = event.target.closest("[data-delete-followup]");
    if (deleteButton) deleteFollowup(deleteButton.dataset.deleteFollowup);
  });
  els.addComment.addEventListener("click", addComment);
  els.discussionBoard.addEventListener("click", (event) => {
    const item = event.target.closest("[data-open-discussion-case]");
    if (!item) return;
    state.activeCaseId = item.dataset.openDiscussionCase;
    state.activeTab = "discussion";
    imageEditor.imageId = null;
    measurePoints = [];
    markDiscussionRead(state.activeCaseId, false);
    persist();
    render();
  });
  els.exportData.addEventListener("click", exportData);
  els.importData.addEventListener("change", importData);
}

function handlePerspectivePointerDown(event) {
  if (!imageEditor.img) return;
  const point = canvasPoint(els.imageCanvas, event);
  if (maskMode) {
    const clamped = clampToImageBounds(point);
    const hit = maskHitTest(clamped);
    if (hit) {
      activeMaskRectangleId = hit.rect.id;
      maskDragState = {
        id: hit.rect.id,
        action: hit.action,
        start: clamped,
        original: { ...hit.rect }
      };
    } else {
      const rect = { id: makeId(), x: clamped.x, y: clamped.y, width: 1, height: 1 };
      maskRectangles.push(rect);
      activeMaskRectangleId = rect.id;
      maskDragState = {
        id: rect.id,
        action: "draw",
        start: clamped,
        original: { ...rect }
      };
    }
    els.imageCanvas.setPointerCapture?.(event.pointerId);
    drawMeasure();
    return;
  }
  if (gestureAdjustMode) {
    gestureStart = {
      point,
      brightness: Number(els.brightness.value),
      contrast: Number(els.contrast.value)
    };
    els.imageCanvas.setPointerCapture?.(event.pointerId);
    return;
  }
  if (activeMeasurementType) {
    const index = measurePoints.findIndex((candidate) => distance(candidate, point) <= 16);
    if (index >= 0) {
      draggedMeasurePointIndex = index;
      els.imageCanvas.setPointerCapture?.(event.pointerId);
      return;
    }
  }
  if (!perspectiveMode) return;
  ensurePerspectivePoints();
  const index = perspectivePoints.findIndex((candidate) => distance(candidate, point) <= 22);
  if (index === -1) return;
  draggedPerspectivePoint = index;
  els.imageCanvas.setPointerCapture?.(event.pointerId);
}

function handlePerspectivePointerMove(event) {
  const point = canvasPoint(els.imageCanvas, event);
  if (maskDragState) {
    updateMaskDrag(clampToImageBounds(point));
    drawMeasure();
    return;
  }
  if (gestureStart) {
    updateGestureAdjustments(point);
    return;
  }
  if (draggedMeasurePointIndex !== null) {
    measurePoints[draggedMeasurePointIndex] = clampToImageBounds(point);
    suppressNextMeasureClick = true;
    drawMeasure();
    return;
  }
  if (!perspectiveMode || draggedPerspectivePoint === null) return;
  perspectivePoints[draggedPerspectivePoint] = clampToImageBounds(point);
  drawEditor();
}

function handlePerspectivePointerUp(event) {
  if (maskDragState) {
    const rect = maskRectangles.find((item) => item.id === maskDragState.id);
    if (rect && (rect.width < 8 || rect.height < 8)) {
      maskRectangles = maskRectangles.filter((item) => item.id !== rect.id);
      activeMaskRectangleId = null;
    }
    maskDragState = null;
    els.imageCanvas.releasePointerCapture?.(event.pointerId);
    drawMeasure();
    return;
  }
  if (gestureStart) {
    gestureStart = null;
    els.imageCanvas.releasePointerCapture?.(event.pointerId);
    const current = activeCase();
    if (current) {
      current.updatedAt = new Date().toISOString();
      persist();
    }
    return;
  }
  if (draggedMeasurePointIndex !== null) {
    draggedMeasurePointIndex = null;
    els.imageCanvas.releasePointerCapture?.(event.pointerId);
    drawMeasure();
    return;
  }
  if (draggedPerspectivePoint === null) return;
  draggedPerspectivePoint = null;
  els.imageCanvas.releasePointerCapture?.(event.pointerId);
}

function updateGestureAdjustments(point) {
  const record = selectedImage();
  if (!record || !gestureStart) return;
  const dx = point.x - gestureStart.point.x;
  const dy = point.y - gestureStart.point.y;
  const brightness = clampRange(Math.round(gestureStart.brightness - dy / 5), -50, 50);
  const contrast = clampRange(Math.round(gestureStart.contrast + dx / 5), -50, 80);
  els.brightness.value = String(brightness);
  els.contrast.value = String(contrast);
  const adjustments = ensureImageAdjustments(record);
  adjustments.brightness = brightness;
  adjustments.contrast = contrast;
  drawEditor();
  drawMeasure();
}

function commitMaskRectangle(start, end) {
  const record = selectedImage();
  if (!record || !imageEditor.img) return;
  const x = Math.round(Math.min(start.x, end.x));
  const y = Math.round(Math.min(start.y, end.y));
  const width = Math.round(Math.abs(end.x - start.x));
  const height = Math.round(Math.abs(end.y - start.y));
  if (width < 8 || height < 8) {
    drawEditor();
    drawMeasure();
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = els.imageCanvas.width;
  canvas.height = els.imageCanvas.height;
  drawProcessedImage(canvas);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = els.maskFill?.value === "white" ? "#fff" : "#050807";
  ctx.fillRect(x, y, width, height);
  commitImageVersion(record, canvas.toDataURL("image/png", 0.92), "遮挡");
}

function applyMaskRectangles() {
  const record = selectedImage();
  if (!record || !imageEditor.img || !maskRectangles.length) {
    setUploadStatus("请先添加遮挡框");
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = els.imageCanvas.width;
  canvas.height = els.imageCanvas.height;
  drawProcessedImage(canvas);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = els.maskFill?.value === "white" ? "#fff" : "#050807";
  maskRectangles.forEach((rect) => {
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  });
  resetPendingMasks();
  maskMode = false;
  if (els.maskMode) els.maskMode.checked = false;
  commitImageVersion(record, canvas.toDataURL("image/png", 0.92), "遮挡");
}

function deleteActiveMaskRectangle() {
  if (!activeMaskRectangleId) {
    setUploadStatus("请先选中一个遮挡框");
    return;
  }
  maskRectangles = maskRectangles.filter((rect) => rect.id !== activeMaskRectangleId);
  activeMaskRectangleId = maskRectangles[0]?.id || null;
  drawMeasure();
}

function clearMaskRectangles() {
  resetPendingMasks();
  drawMeasure();
}

function canvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function setUploadStatus(text) {
  if (els.imageUploadStatus) els.imageUploadStatus.textContent = text;
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function handleImageUpload(event) {
  const current = activeCase();
  if (!current) return;
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  const startCount = current.images.length;
  let uploadedCount = 0;
  let failedCount = 0;
  setUploadStatus(`正在处理 0/${files.length} 张影像`);
  for (const [index, file] of files.entries()) {
    setUploadStatus(`正在处理 ${index + 1}/${files.length}：${file.name}`);
    await nextFrame();
    try {
      const dataUrl = await readAndSanitizeImage(file);
      const inferredCategory = inferImageCategory(file.name);
      const metadata = imageCategoryMetadata(inferredCategory);
      const image = {
        id: makeId(),
        name: file.name.replace(/\.[^.]+$/, "") || "影像",
        category: inferredCategory,
        phase: metadata.phase,
        modality: metadata.modality,
        timepoint: metadata.timepoint,
        source: metadata.source,
        type: "image/jpeg",
        dataUrl,
        originalDataUrl: dataUrl,
        history: [dataUrl],
        historyIndex: 0,
        adjustments: { ...defaultImageAdjustments },
        createdAt: new Date().toISOString()
      };
      current.images.push(image);
      if (!imageEditor.imageId || current.images.length === startCount + 1) {
        imageEditor.imageId = image.id;
        imageEditor.img = null;
      }
      renderImages();
      uploadedCount += 1;
      setUploadStatus(`已加入 ${uploadedCount}/${files.length} 张影像`);
    } catch {
      failedCount += 1;
      setUploadStatus(`有影像处理失败：${file.name}`);
    }
  }
  current.privacyChecks.deidentified ||= false;
  current.updatedAt = new Date().toISOString();
  event.target.value = "";
  await persist();
  render();
  setUploadStatus(failedCount
    ? `已完成 ${uploadedCount} 张，失败 ${failedCount} 张`
    : `已完成上传 ${uploadedCount} 张影像`);
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
        resolve(canvas.toDataURL("image/jpeg", 0.9));
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
  commitImageVersion(record, processedImageDataUrl(), "处理");
}

function processedImageDataUrl() {
  const canvas = document.createElement("canvas");
  canvas.width = els.imageCanvas.width;
  canvas.height = els.imageCanvas.height;
  drawProcessedImage(canvas);
  return canvas.toDataURL("image/png", 0.92);
}

function measurementSnapshotDataUrl() {
  try {
    return els.measureCanvas.toDataURL("image/jpeg", 0.86);
  } catch {
    return "";
  }
}

function copyMeasurePoints(limit = measurePoints.length) {
  return measurePoints.slice(0, limit).map((point) => ({ x: point.x, y: point.y }));
}

function startMeasurement(type, views = "") {
  if (!type) return;
  activeMeasurementType = type;
  const allowedViews = views.split(" ").filter(Boolean);
  if (allowedViews.length && !allowedViews.includes(activeMeasurementView())) {
    els.measurementView.value = allowedViews[0];
  }
  gestureAdjustMode = false;
  maskMode = false;
  setPerspectiveMode(false);
  if (els.gestureAdjustMode) els.gestureAdjustMode.checked = false;
  if (els.maskMode) els.maskMode.checked = false;
  measurePoints = [];
  syncMeasurementUi();
  drawMeasure();
}

function exitMeasurementMode({ keepPoints = false } = {}) {
  activeMeasurementType = null;
  editingMeasurementId = null;
  if (!keepPoints) measurePoints = [];
  gestureAdjustMode = true;
  if (els.gestureAdjustMode) els.gestureAdjustMode.checked = true;
  syncMeasurementUi();
  drawMeasure();
}

function saveMeasurement(type) {
  const current = activeCase();
  const image = selectedImage();
  if (!current || !image || !type) return;
  const angle = currentAngle();
  if (!angle || measurePoints.length < 4) {
    setUploadStatus("请先完成 4 个测量点");
    return;
  }
  const snapshotDataUrl = measurementSnapshotDataUrl();
  const payload = {
    type,
    view: activeMeasurementView(),
    angle,
    points: copyMeasurePoints(4),
    snapshotDataUrl,
    imageId: image.id,
    imageName: image.name,
    updatedAt: new Date().toISOString()
  };
  const existing = editingMeasurementId
    ? current.measurements.find((item) => item.id === editingMeasurementId)
    : null;
  if (existing) {
    Object.assign(existing, payload);
  } else {
    current.measurements.unshift({
      id: makeId(),
      ...payload,
      createdAt: new Date().toISOString()
    });
  }
  current.updatedAt = new Date().toISOString();
  persist();
  activeMeasurementType = null;
  editingMeasurementId = null;
  renderMeasurements();
  exitMeasurementMode();
  drawMeasure();
}

function deleteActiveMeasurementRecord() {
  if (editingMeasurementId) {
    deleteMeasurement(editingMeasurementId);
    activeMeasurementType = null;
    editingMeasurementId = null;
    measurePoints = [];
    syncMeasurementUi();
    drawMeasure();
    return;
  }
  measurePoints = [];
  activeMeasurementType = null;
  syncMeasurementUi();
  drawMeasure();
}

function saveCtDepression() {
  const current = activeCase();
  const image = selectedImage();
  const rawValue = els.ctDepressionValue.value.trim();
  const valueMm = Number(rawValue);
  if (!current || !image || !rawValue || !Number.isFinite(valueMm) || valueMm < 0) return;
  const snapshotDataUrl = measurementSnapshotDataUrl();
  const payload = {
    type: "posterior-facet-depression",
    view: "ct",
    valueMm,
    points: copyMeasurePoints(2),
    snapshotDataUrl,
    imageId: image.id,
    imageName: image.name,
    updatedAt: new Date().toISOString()
  };
  const existing = editingMeasurementId
    ? current.measurements.find((item) => item.id === editingMeasurementId)
    : null;
  if (existing) {
    Object.assign(existing, payload);
  } else {
    current.measurements.unshift({
      id: makeId(),
      ...payload,
      createdAt: new Date().toISOString()
    });
  }
  current.updatedAt = new Date().toISOString();
  els.ctDepressionValue.value = "";
  persist();
  measurePoints = [];
  editingMeasurementId = null;
  renderMeasurements();
  drawMeasure();
}

function viewForMeasurementRecord(record) {
  if (record.view === "axial") return "axial";
  if (record.type === "hindfoot-varus") return "axial";
  return "lateral";
}

function editMeasurement(id) {
  const current = activeCase();
  const record = current?.measurements.find((item) => item.id === id);
  if (!current || !record) return;
  editingMeasurementId = id;
  activeMeasurementType = ["bohler", "gissane", "hindfoot-varus", "custom"].includes(record.type) ? record.type : "custom";
  els.measurementView.value = viewForMeasurementRecord(record);
  imageEditor.imageId = record.imageId || imageEditor.imageId;
  imageEditor.img = null;
  measurePoints = Array.isArray(record.points)
    ? record.points.map((point) => ({ x: Number(point.x), y: Number(point.y) }))
    : [];
  gestureAdjustMode = false;
  if (els.gestureAdjustMode) els.gestureAdjustMode.checked = false;
  syncMeasurementUi(current);
  const image = selectedImage();
  if (image) loadEditorImage(image);
  else drawMeasure();
  renderMeasurements();
  markSaved("已载入测量记录，可调整点位后重新保存");
}

function deleteMeasurement(id) {
  const current = activeCase();
  if (!current) return;
  const index = current.measurements.findIndex((item) => item.id === id);
  if (index < 0) return;
  const record = current.measurements[index];
  const confirmed = window.confirm(`确定删除「${labelForMeasurement(record.type)}」这条测量记录吗？`);
  if (!confirmed) return;
  current.measurements.splice(index, 1);
  if (editingMeasurementId === id) {
    editingMeasurementId = null;
    measurePoints = [];
  }
  current.updatedAt = new Date().toISOString();
  persist();
  renderMeasurements();
  drawMeasure();
  markSaved("已删除测量记录");
}

function addFollowup() {
  const current = activeCase();
  if (!current) return;
  const payload = {
    stage: els.followupStage.value,
    dueDate: els.followupDueDate.value,
    vas: els.vasScore.value,
    functionScore: els.functionScore.value,
    score: activeScoreDraft ? { ...activeScoreDraft, items: { ...activeScoreDraft.items } } : null,
    weightBearing: els.weightBearing.value,
    status: els.followupStatus.value,
    finalOutcome: els.finalOutcome.value,
    notes: els.followupNotes.value,
    updatedAt: new Date().toISOString()
  };
  if (editingFollowupId) {
    const existing = current.followups.find((item) => item.id === editingFollowupId);
    if (existing) Object.assign(existing, payload);
  } else {
    current.followups.unshift({
      id: makeId(),
      ...payload,
      createdAt: new Date().toISOString()
    });
  }
  resetFollowupForm();
  current.updatedAt = new Date().toISOString();
  persist();
  renderFollowups();
}

function editFollowup(id) {
  const current = activeCase();
  const item = current?.followups.find((entry) => entry.id === id);
  if (!item) return;
  editingFollowupId = id;
  els.followupStage.value = item.stage || "术后 4 周";
  els.followupDueDate.value = item.dueDate || "";
  els.vasScore.value = item.vas || "";
  els.functionScore.value = item.functionScore || "";
  activeScoreDraft = item.score ? { ...item.score, items: { ...(item.score.items || {}) } } : null;
  els.weightBearing.value = item.weightBearing || "未记录";
  els.followupStatus.value = item.status || "ongoing";
  els.finalOutcome.value = item.finalOutcome || "";
  els.followupNotes.value = item.notes || "";
  els.addFollowup.textContent = "保存修改";
}

function deleteFollowup(id) {
  const current = activeCase();
  if (!current) return;
  const index = current.followups.findIndex((item) => item.id === id);
  if (index < 0) return;
  const confirmed = window.confirm("确定删除这条随访记录吗？");
  if (!confirmed) return;
  current.followups.splice(index, 1);
  if (editingFollowupId === id) resetFollowupForm();
  current.updatedAt = new Date().toISOString();
  persist();
  renderFollowups();
}

function resetFollowupForm() {
  editingFollowupId = null;
  activeScoreDraft = null;
  els.vasScore.value = "";
  els.functionScore.value = "";
  els.followupDueDate.value = "";
  els.followupNotes.value = "";
  els.addFollowup.textContent = "添加随访";
}

function addComment() {
  const current = activeCase();
  const body = els.commentBody.value.trim();
  if (!current || !body) return;
  if (current.privacyLevel !== "private" && !privacyReviewAllowsDiscussion(current, body)) return;
  current.comments.unshift({
    id: makeId(),
    body,
    createdAt: new Date().toISOString()
  });
  state.discussionReads ||= {};
  state.discussionReads[current.id] = new Date().toISOString();
  els.commentBody.value = "";
  current.updatedAt = new Date().toISOString();
  persist();
  renderCaseList();
  renderComments();
}

function privacyReviewAllowsDiscussion(current, draftText = "") {
  const review = runMediumPrivacyReview(current, draftText);
  if (review.level === "block") {
    alert(`发布前隐私审核未通过：${review.messages.join("；")}。请先处理敏感信息。`);
    return false;
  }
  if (review.level === "confirm") {
    return window.confirm(`系统提示可能存在隐私风险：${review.messages.join("；")}。如果你已完成脱敏，可以继续发布；否则请先返回处理。`);
  }
  return true;
}

function runMediumPrivacyReview(current, draftText = "") {
  const text = [
    current.code,
    current.mechanism,
    current.combinedInjury,
    current.threeStepNotes,
    draftText,
    ...(current.images || []).map((image) => image.name)
  ].filter(Boolean).join(" ");
  const messages = [];
  const blockPatterns = [
    [/1[3-9]\d{9}/, "疑似电话号码"],
    [/\d{17}[\dXx]/, "疑似身份证号"],
    [/(姓名|患者|身份证|手机号|电话|住院号|病历号|检查号|二维码)[:：]?\S{1,18}/, "疑似患者身份字段"]
  ];
  blockPatterns.forEach(([pattern, message]) => {
    if (pattern.test(text)) messages.push(message);
  });
  if (messages.length) return { level: "block", messages };
  const confirmMessages = [];
  if (!current.privacyChecks?.deidentified) confirmMessages.push("未勾选发布前去标识化确认");
  if (/(患者|住院|检查|医院|PACS|ID|MRN|条码|barcode|qrcode)/i.test(text)) {
    confirmMessages.push("文本或影像名称中出现敏感关键词");
  }
  return confirmMessages.length
    ? { level: "confirm", messages: confirmMessages }
    : { level: "pass", messages: [] };
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
      state = normalizeState(incoming);
      persist();
      window.location.reload();
    } catch {
      alert("导入失败：文件不是有效的 Calcaneal Case JSON。");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

async function bootApp() {
  await hydrateFromLargeLocalStorage();
  wireEvents();
  gestureAdjustMode = true;
  if (els.gestureAdjustMode) els.gestureAdjustMode.checked = true;
  if (!state.cases.length) {
    createCase();
  } else {
    writeLargeRecordQuietly(LARGE_STORAGE_KEYS.state, state);
    if (!isEmptyPrivateState(privateState)) writeLargeRecordQuietly(LARGE_STORAGE_KEYS.private, privateState);
    if (accessState.approved) writeLargeRecordQuietly(LARGE_STORAGE_KEYS.access, accessState);
  }
  setIntroStep(0);
  renderAccessGate();
  render();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

bootApp();
