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
  "本页教学视频",
  "病例可见范围在左侧病例卡片中选择",
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
  "申请成为管理员",
  "是否为多中心",
  "申请加入多中心研究",
  "垃圾箱",
  "医生本地私密随访信息",
  "年龄（岁）",
  "当前设备和浏览器",
  "不进入普通病例导出",
  "正式联网部署前",
  "合并损伤",
  "高处坠落伤",
  "交通伤",
  "扭伤",
  "脊柱",
  "下肢",
  "骨盆",
  "足部",
  "软组织损伤",
  "水泡",
  "血泡",
  "肿胀",
  "开放伤",
  "骨筋膜室综合征",
  "心脑血管疾病",
  "多中心研究",
  "伦理审批文件",
  "影像上传、处理与测量",
  "cameraCapture",
  "imageUploadStatus",
  "批量归类为",
  "应用到勾选影像",
  "术中 X 线",
  "术中透视",
  "黑白滤镜",
  "四点矫正",
  "当前图片实际显示边界",
  "恢复原始",
  "后退一步",
  "前进一步",
  "自动拉伸大小",
  "其他图片",
  "当前影像测量",
  "跟骨侧位",
  "跟骨轴位",
  "CT 层面",
  "台阶 / 间隙",
  "关节面塌陷程度（mm）",
  "分型建议",
  "骨折脱位型",
  "分型补充",
  "Zwipp 分型采集",
  "后跟距关节面骨折",
  "随访提醒与关键指标",
  "打开评分表",
  "AOFAS 足踝-后足评分",
  "Maryland 足部评分",
  "SF-36 生活质量评分",
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
  "measurementView",
  "saveCtDepression",
  "deleteImage",
  "删除图像",
  "applyBulkImageCategory",
  "normalizeImageCategory",
  "snapshotDataUrl",
  "measurementSnapshotDataUrl",
  "posterior-facet-depression",
  "zwippPoints",
  "PRIVATE_STORAGE_KEY",
  "ACCESS_STORAGE_KEY",
  "renderAccessGate",
  "openAccessGate",
  "toggleIntro",
  "data-case-privacy",
  "deleteCase",
  "restoreCase",
  "purgeCase",
  "删除病例",
  "editFollowup",
  "deleteFollowup",
  "保存修改",
  "修改",
  "softTissueLabels",
  "normalizePrivacyLevel",
  "normalizeActiveTab",
  "normalizeResearch",
  "scoreConfigs",
  "openScoreDialog",
  "applyScoreDraft",
  "step-off",
  "gap",
  "exactAgeValue",
  "clampToImageBounds",
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
