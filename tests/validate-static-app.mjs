import { readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "service-worker.js",
  "docs/ROADMAP.md",
  "docs/DATA_MODEL.md",
  "docs/MOBILE_APP.md",
  "docs/LEGAL_NOTICES.md",
  "docs/MEDIA_ATTRIBUTIONS.md",
  "docs/CODEX_OSS_APPLICATION.md",
  "docs/GITHUB_OWNER_SETUP.md",
  "docs/INSTRUCTOR_ONBOARDING_GUIDE.md",
  "docs/MAINTENANCE_SCHEDULE.md",
  "docs/SELF_MAINTENANCE_GUIDE.md",
  "CONTRIBUTING.md",
  "GOVERNANCE.md",
  "SECURITY.md",
  ".github/ISSUE_TEMPLATE/teaching_case.yml",
  ".github/ISSUE_TEMPLATE/clinical_field.yml",
  ".github/ISSUE_TEMPLATE/product_feedback.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  "sample-data/cases.csv"
];

for (const file of requiredFiles) {
  const content = await readFile(file, "utf8");
  if (!content.trim()) {
    throw new Error(`${file} is empty`);
  }
}

const html = await readFile("index.html", "utf8");
const app = await readFile("app.js", "utf8");
const manifest = JSON.parse(await readFile("manifest.webmanifest", "utf8"));

const htmlChecks = [
  "跟骨骨折病例平台介绍",
  "播放介绍",
  "进入病例系统",
  "平台怎么用",
  "公开影像素材",
  "Böhler 角公开教学图",
  "项目怎么一起维护",
  "项目负责人每周在 GitHub Issues 发一个小主题",
  "实名制注册与医生准入审核",
  "执业医师证",
  "职称证",
  "违规追责",
  "平台使用范围与医疗服务边界",
  "多中心研究与伦理审批",
  "病例录入与隐私控制",
  "病例可见范围说明",
  "管理员可见",
  "圈内教学",
  "公开教学",
  "管理员教学申请",
  "多中心研究申请",
  "医生本地私密随访信息",
  "合并损伤",
  "心脑血管疾病",
  "多中心研究",
  "伦理审批文件",
  "影像上传、裁剪与增强",
  "cameraCapture",
  "纯黑白对比",
  "四点矫正",
  "其他影像资料",
  "角度半自动测量",
  "分型建议",
  "骨折脱位型",
  "分型补充",
  "Zwipp 分型采集",
  "后跟距关节面骨折",
  "随访提醒与关键指标",
  "默认随访间隔",
  "随访结束",
  "终极指标",
  "followupDueDate",
  "病例讨论"
];

for (const check of htmlChecks) {
  if (!html.includes(check)) {
    throw new Error(`Missing UI section: ${check}`);
  }
}

const appChecks = [
  "readAndSanitizeImage",
  "estimateCrop",
  "makeSquareCrop",
  "applyPerspectiveCorrection",
  "currentAngle",
  "zwippPoints",
  "PRIVATE_STORAGE_KEY",
  "ACCESS_STORAGE_KEY",
  "renderAccessGate",
  "openAccessGate",
  "toggleIntro",
  "suggestClassification",
  "exportData",
  "importData"
];

for (const check of appChecks) {
  if (!app.includes(check)) {
    throw new Error(`Missing app capability: ${check}`);
  }
}

if (manifest.display !== "standalone") {
  throw new Error("PWA manifest must use standalone display");
}

console.log("Static app validation passed.");
