const { withXcodeProject, withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

const MAIN_BUNDLE_ID = "com.yourapp.scrolltax";
const APP_GROUP = "group.com.yourapp.scrolltax";
const DEPLOYMENT_TARGET = "16.4";

const EXTENSIONS = [
  {
    name: "LucidShieldConfiguration",
    bundleId: `${MAIN_BUNDLE_ID}.LucidShieldConfiguration`,
    swiftFile: "LucidShieldConfigurationExtension.swift",
    infoPlist: buildInfoPlist(
      "com.apple.shieldconfiguration",
      "LucidShieldConfigurationExtension"
    ),
    frameworks: ["ShieldConfiguration", "ManagedSettings", "UIKit"],
  },
  {
    name: "LucidShieldAction",
    bundleId: `${MAIN_BUNDLE_ID}.LucidShieldAction`,
    swiftFile: "LucidShieldActionExtension.swift",
    infoPlist: buildInfoPlist(
      "com.apple.shieldaction.remote",
      "LucidShieldActionExtension"
    ),
    frameworks: ["ManagedSettings", "UserNotifications"],
  },
];

function buildInfoPlist(extensionPointId, principalClass) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>${extensionPointId}</string>
        <key>NSExtensionPrincipalClass</key>
        <string>$(PRODUCT_MODULE_NAME).${principalClass}</string>
    </dict>
</dict>
</plist>`;
}

const ENTITLEMENTS_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>${APP_GROUP}</string>
    </array>
</dict>
</plist>`;

// ─── Phase 1: write files into ios/ ──────────────────────────────────────────

function createExtensionFiles(modConfig) {
  const projectRoot = modConfig.modRequest.projectRoot;
  const iosRoot = path.join(projectRoot, "ios");

  for (const ext of EXTENSIONS) {
    const extDir = path.join(iosRoot, ext.name);
    fs.mkdirSync(extDir, { recursive: true });

    fs.copyFileSync(
      path.join(projectRoot, "ios-extensions", ext.name, ext.swiftFile),
      path.join(extDir, ext.swiftFile)
    );
    fs.writeFileSync(path.join(extDir, "Info.plist"), ext.infoPlist, "utf8");
    fs.writeFileSync(
      path.join(extDir, `${ext.name}.entitlements`),
      ENTITLEMENTS_PLIST,
      "utf8"
    );
  }

  return modConfig;
}

// ─── Phase 2: mutate xcodeproj ────────────────────────────────────────────────

function addExtensionTargets(modConfig) {
  const proj = modConfig.modResults;
  const objects = proj.hash.project.objects;

  // Find main app target UUID
  const nativeTargets = proj.pbxNativeTargetSection();
  let mainTargetUUID = null;
  for (const [uuid, target] of Object.entries(nativeTargets)) {
    if (uuid.endsWith("_comment")) continue;
    if (target.productType === '"com.apple.product-type.application"') {
      mainTargetUUID = uuid;
      break;
    }
  }

  if (!mainTargetUUID) {
    console.warn("[withShieldExtensions] Could not find main app target");
    return modConfig;
  }

  const addedExtensions = [];

  for (const ext of EXTENSIONS) {
    // Idempotency — skip if already added
    const alreadyExists = Object.values(nativeTargets).some(
      (t) => t && !t._comment && t.name === `"${ext.name}"`
    );
    if (alreadyExists) continue;

    // Add target (creates PBXNativeTarget + XCConfigurationList + Debug/Release configs)
    const target = proj.addTarget(ext.name, "app_extension", ext.name, ext.bundleId);
    const targetUUID = target.uuid;

    // Build phases
    proj.addBuildPhase(
      [`${ext.name}/${ext.swiftFile}`],
      "PBXSourcesBuildPhase",
      "Sources",
      targetUUID
    );
    proj.addBuildPhase([], "PBXFrameworksBuildPhase", "Frameworks", targetUUID);
    proj.addBuildPhase([], "PBXResourcesBuildPhase", "Resources", targetUUID);

    // System frameworks
    for (const fw of ext.frameworks) {
      proj.addFramework(`${fw}.framework`, {
        target: targetUUID,
        sourceTree: "SDKROOT",
        lastKnownFileType: "wrapper.framework",
        weak: false,
      });
    }

    // Build settings
    const configListUUID = target.pbxNativeTarget.buildConfigurationList;
    const configList = proj.pbxXCConfigurationList()[configListUUID];
    const xcBuildConfigs = proj.pbxXCBuildConfigurationSection();

    for (const { value: cfgUUID } of configList.buildConfigurations) {
      const bs = xcBuildConfigs[cfgUUID].buildSettings;
      bs.SWIFT_VERSION = "5.0";
      bs.IPHONEOS_DEPLOYMENT_TARGET = DEPLOYMENT_TARGET;
      bs.PRODUCT_BUNDLE_IDENTIFIER = `"${ext.bundleId}"`;
      bs.PRODUCT_NAME = '"$(TARGET_NAME)"';
      bs.INFOPLIST_FILE = `"${ext.name}/Info.plist"`;
      bs.CODE_SIGN_ENTITLEMENTS = `"${ext.name}/${ext.name}.entitlements"`;
      bs.SKIP_INSTALL = "YES";
      bs.ENABLE_BITCODE = "NO";
      bs.TARGETED_DEVICE_FAMILY = '"1"';
      bs.ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES = "NO";
      bs.CODE_SIGN_STYLE = "Automatic";
    }

    // Collect product ref for embed phase
    const extNativeTarget = nativeTargets[targetUUID];
    if (extNativeTarget && extNativeTarget.productReference) {
      addedExtensions.push({
        productRef: extNativeTarget.productReference,
        targetUUID,
        name: ext.name,
      });
    }

    // Target dependency on main app (direct objects manipulation — no broken helper)
    addTargetDependency(proj, objects, mainTargetUUID, targetUUID, ext.name);
  }

  if (addedExtensions.length > 0) {
    embedExtensions(proj, objects, mainTargetUUID, addedExtensions);
  }

  return modConfig;
}

function addTargetDependency(proj, objects, mainTargetUUID, extTargetUUID, extName) {
  objects["PBXContainerItemProxy"] = objects["PBXContainerItemProxy"] || {};
  objects["PBXTargetDependency"] = objects["PBXTargetDependency"] || {};

  const proxyUUID = proj.generateUuid();
  const depUUID = proj.generateUuid();
  const projectUUID = proj.getFirstProject().uuid;

  objects["PBXContainerItemProxy"][proxyUUID] = {
    isa: "PBXContainerItemProxy",
    containerPortal: projectUUID,
    proxyType: 1,
    remoteGlobalIDString: extTargetUUID,
    remoteInfo: `"${extName}"`,
  };
  objects["PBXContainerItemProxy"][`${proxyUUID}_comment`] = "PBXContainerItemProxy";

  objects["PBXTargetDependency"][depUUID] = {
    isa: "PBXTargetDependency",
    target: extTargetUUID,
    targetProxy: proxyUUID,
  };
  objects["PBXTargetDependency"][`${depUUID}_comment`] = "PBXTargetDependency";

  const mainTarget = proj.pbxNativeTargetSection()[mainTargetUUID];
  if (mainTarget) {
    mainTarget.dependencies = mainTarget.dependencies || [];
    mainTarget.dependencies.push({ value: depUUID, comment: "PBXTargetDependency" });
  }
}

function embedExtensions(proj, objects, mainTargetUUID, extensions) {
  objects["PBXCopyFilesBuildPhase"] = objects["PBXCopyFilesBuildPhase"] || {};
  objects["PBXBuildFile"] = objects["PBXBuildFile"] || {};

  const mainTarget = proj.pbxNativeTargetSection()[mainTargetUUID];
  const buildPhases = mainTarget.buildPhases || [];

  // Find existing "Embed App Extensions" copy phase (dstSubfolderSpec 13 = PlugIns)
  let embedPhaseUUID = null;
  let embedPhase = null;

  for (const { value: phaseUUID } of buildPhases) {
    const phase = objects["PBXCopyFilesBuildPhase"][phaseUUID];
    if (phase && phase.dstSubfolderSpec === 13) {
      embedPhaseUUID = phaseUUID;
      embedPhase = phase;
      break;
    }
  }

  if (!embedPhase) {
    embedPhaseUUID = proj.generateUuid();
    embedPhase = {
      isa: "PBXCopyFilesBuildPhase",
      buildActionMask: 2147483647,
      dstPath: '""',
      dstSubfolderSpec: 13,
      files: [],
      name: '"Embed App Extensions"',
      runOnlyForDeploymentPostprocessing: 0,
    };
    objects["PBXCopyFilesBuildPhase"][embedPhaseUUID] = embedPhase;
    objects["PBXCopyFilesBuildPhase"][`${embedPhaseUUID}_comment`] =
      "Embed App Extensions";

    mainTarget.buildPhases.push({
      value: embedPhaseUUID,
      comment: "Embed App Extensions",
    });
  }

  for (const { productRef, name } of extensions) {
    // Skip if already in the phase
    const alreadyAdded = (embedPhase.files || []).some(
      (f) => f.value === productRef
    );
    if (alreadyAdded) continue;

    const bfUUID = proj.generateUuid();
    objects["PBXBuildFile"][bfUUID] = {
      isa: "PBXBuildFile",
      fileRef: productRef,
      settings: "{ ATTRIBUTES = (RemoveHeadersOnCopy, ); }",
    };
    objects["PBXBuildFile"][`${bfUUID}_comment`] =
      `${name}.appex in Embed App Extensions`;

    embedPhase.files.push({
      value: bfUUID,
      comment: `${name}.appex in Embed App Extensions`,
    });
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

module.exports = function withShieldExtensions(config) {
  config = withDangerousMod(config, ["ios", createExtensionFiles]);
  config = withXcodeProject(config, addExtensionTargets);
  return config;
};
