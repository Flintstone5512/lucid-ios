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
    provisioningProfilePath: "certs/LucidShieldConfiguration.mobileprovision",
    infoPlist: buildInfoPlist(
      "com.apple.shieldconfiguration",
      "LucidShieldConfigurationExtension"
    ),
    frameworks: ["ManagedSettings", "ManagedSettingsUI", "UIKit"],
  },
  {
    name: "LucidShieldAction",
    bundleId: `${MAIN_BUNDLE_ID}.LucidShieldAction`,
    swiftFile: "LucidShieldActionExtension.swift",
    provisioningProfilePath: "certs/LucidShieldAction.mobileprovision",
    infoPlist: buildInfoPlist(
      "com.apple.shieldaction.remote",
      "LucidShieldActionExtension"
    ),
    frameworks: ["ManagedSettings", "UserNotifications"],
  },
];

function extractProfileInfo(profilePath) {
  if (!fs.existsSync(profilePath)) return null;
  const content = fs.readFileSync(profilePath, "binary");
  const start = content.indexOf("<?xml");
  const end = content.indexOf("</plist>") + "</plist>".length;
  if (start === -1 || end === -1) return null;
  const xml = content.slice(start, end);
  const uuidMatch = xml.match(/<key>UUID<\/key>\s*<string>([^<]+)<\/string>/);
  const nameMatch = xml.match(/<key>Name<\/key>\s*<string>([^<]+)<\/string>/);
  return {
    uuid: uuidMatch ? uuidMatch[1].trim() : null,
    name: nameMatch ? nameMatch[1].trim() : null,
  };
}

function buildInfoPlist(extensionPointId, principalClass) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>$(MARKETING_VERSION)</string>
    <key>CFBundleVersion</key>
    <string>$(CURRENT_PROJECT_VERSION)</string>
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
    <key>com.apple.developer.family-controls</key>
    <true/>
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

  for (const ext of EXTENSIONS) {
    // Idempotency — skip if already added
    const alreadyExists = Object.values(nativeTargets).some(
      (t) => t && !t._comment && t.name === `"${ext.name}"`
    );
    if (alreadyExists) continue;

    // addTarget:
    //  • creates PBXNativeTarget + product file reference
    //  • automatically adds product to the main target's "Copy Files" build phase
    const target = proj.addTarget(ext.name, "app_extension", ext.name, ext.bundleId);
    const targetUUID = target.uuid;

    // Build phases on the extension target
    proj.addBuildPhase(
      [`${ext.name}/${ext.swiftFile}`],
      "PBXSourcesBuildPhase",
      "Sources",
      targetUUID
    );
    proj.addBuildPhase([], "PBXFrameworksBuildPhase", "Frameworks", targetUUID);
    proj.addBuildPhase([], "PBXResourcesBuildPhase", "Resources", targetUUID);

    // System frameworks for this extension
    for (const fw of ext.frameworks) {
      proj.addFramework(`${fw}.framework`, {
        target: targetUUID,
        sourceTree: "SDKROOT",
        lastKnownFileType: "wrapper.framework",
        weak: false,
      });
    }

    // Build settings on both Debug + Release configurations
    const configListUUID = target.pbxNativeTarget.buildConfigurationList;
    const configList = proj.pbxXCConfigurationList()[configListUUID];
    const xcBuildConfigs = proj.pbxXCBuildConfigurationSection();

    // EXPO_APPLE_TEAM_ID must be set in EAS environment variables.
    // Without it, Xcode automatic signing fails with "requires a development team".
    const teamId = process.env.EXPO_APPLE_TEAM_ID || "";
    if (!teamId) {
      console.warn(
        "[withShieldExtensions] EXPO_APPLE_TEAM_ID env var is not set — " +
          "extension targets will fail code signing. Add it in your EAS project " +
          "environment variables (expo.dev → your project → Environment Variables)."
      );
    }

    const projectRoot = modConfig.modRequest.projectRoot;
    const profileAbsPath = path.join(projectRoot, ext.provisioningProfilePath);
    const profileInfo = extractProfileInfo(profileAbsPath);

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
      bs.TARGETED_DEVICE_FAMILY = '"1,2"';
      bs.ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES = "NO";
      if (teamId) {
        bs.DEVELOPMENT_TEAM = `"${teamId}"`;
      }
      if (profileInfo && profileInfo.uuid) {
        bs.CODE_SIGN_STYLE = "Manual";
        bs.CODE_SIGN_IDENTITY = '"iPhone Distribution"';
        bs.PROVISIONING_PROFILE = `"${profileInfo.uuid}"`;
        bs.PROVISIONING_PROFILE_SPECIFIER = `"${profileInfo.name}"`;
      } else {
        bs.CODE_SIGN_STYLE = "Automatic";
      }
    }

    // PBXTargetDependency so extension builds before main app
    addTargetDependency(proj, objects, mainTargetUUID, targetUUID, ext.name);
  }

  // Fix the "Copy Files" phase(s) that addTarget auto-created on the main target.
  // They embed the .appex files but need dstSubfolderSpec=13 (PlugIns folder)
  // and the RemoveHeadersOnCopy attribute to be treated as proper app extensions.
  fixCopyPhasesForExtensions(proj, objects, mainTargetUUID);

  return modConfig;
}

// ─── Fix the auto-created "Copy Files" phase ─────────────────────────────────
// addTarget() in the xcode package adds .appex products to the main target's
// "Copy Files" phase, but with wrong settings. We find those phases and fix them
// instead of creating a duplicate "Embed App Extensions" phase.

function fixCopyPhasesForExtensions(proj, objects, mainTargetUUID) {
  objects["PBXCopyFilesBuildPhase"] = objects["PBXCopyFilesBuildPhase"] || {};
  objects["PBXBuildFile"] = objects["PBXBuildFile"] || {};

  // Collect all .appex product file references in the project
  const appexFileRefs = new Set();
  const fileRefs = proj.pbxFileReferenceSection ? proj.pbxFileReferenceSection() : {};
  for (const [uuid, ref] of Object.entries(fileRefs)) {
    if (uuid.endsWith("_comment")) continue;
    const fileType = ref.explicitFileType || ref.lastKnownFileType || "";
    if (fileType.includes("app-extension")) {
      appexFileRefs.add(uuid);
    }
  }

  // Also collect from native targets' productReference
  for (const [uuid, target] of Object.entries(proj.pbxNativeTargetSection())) {
    if (uuid.endsWith("_comment")) continue;
    if (
      target.productType === '"com.apple.product-type.app-extension"' &&
      target.productReference
    ) {
      appexFileRefs.add(target.productReference);
    }
  }

  // Walk the main target's build phases, find any Copy Files phases with .appex products
  const mainTarget = proj.pbxNativeTargetSection()[mainTargetUUID];
  for (const { value: phaseUUID } of mainTarget.buildPhases || []) {
    const phase = objects["PBXCopyFilesBuildPhase"]?.[phaseUUID];
    if (!phase) continue;

    const appexBuildFiles = (phase.files || []).filter(({ value: bfUUID }) => {
      const bf = objects["PBXBuildFile"]?.[bfUUID];
      return bf && appexFileRefs.has(bf.fileRef);
    });

    if (appexBuildFiles.length === 0) continue;

    // Correct the phase so extensions embed properly
    phase.dstSubfolderSpec = 13; // PlugIns/extensions folder inside .app bundle
    phase.name = '"Embed App Extensions"';
    objects["PBXCopyFilesBuildPhase"][`${phaseUUID}_comment`] = "Embed App Extensions";

    // Ensure each .appex build file has the RemoveHeadersOnCopy attribute
    for (const { value: bfUUID } of appexBuildFiles) {
      const bf = objects["PBXBuildFile"][bfUUID];
      if (bf) {
        bf.settings = "{ ATTRIBUTES = (RemoveHeadersOnCopy, ); }";
      }
    }
  }
}

// ─── Target dependency (using raw objects — no broken helper methods) ─────────

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

// ─── Entry point ─────────────────────────────────────────────────────────────

module.exports = function withShieldExtensions(config) {
  config = withDangerousMod(config, ["ios", createExtensionFiles]);
  config = withXcodeProject(config, addExtensionTargets);
  return config;
};
