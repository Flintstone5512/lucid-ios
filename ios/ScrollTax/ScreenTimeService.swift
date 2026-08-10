import Foundation
import FamilyControls
import ManagedSettings

private let appGroupSuite = "group.com.yourapp.scrolltax"
private let selectionKey = "selectedAppsData"
private let unlockKey = "unlockUntil"

class ScreenTimeService {
  static let shared = ScreenTimeService()
  private init() {}

  private var sharedDefaults: UserDefaults? {
    UserDefaults(suiteName: appGroupSuite)
  }

  // MARK: - Selection persistence

  @available(iOS 16, *)
  func saveSelection(_ selection: FamilyActivitySelection) throws {
    let data = try PropertyListEncoder().encode(selection)
    sharedDefaults?.set(data, forKey: selectionKey)
  }

  @available(iOS 16, *)
  func loadSelection() -> FamilyActivitySelection? {
    guard let data = sharedDefaults?.data(forKey: selectionKey) else { return nil }
    return try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data)
  }

  func hasSelection() -> Bool {
    sharedDefaults?.data(forKey: selectionKey) != nil
  }

  // MARK: - Shield control

  func applyShield() {
    guard !isUnlocked() else { return }
    if #available(iOS 16, *) {
      let store = ManagedSettingsStore()
      if let selection = loadSelection() {
        store.shield.applications = selection.applicationTokens
      }
    }
  }

  func clearShield() {
    let store = ManagedSettingsStore()
    store.shield.applications = nil
    store.shield.applicationCategories = nil
  }

  // MARK: - Unlock window

  func grantUnlock(until epochMs: Double) {
    sharedDefaults?.set(epochMs, forKey: unlockKey)
    clearShield()
  }

  func isUnlocked() -> Bool {
    let expiresAt = sharedDefaults?.double(forKey: unlockKey) ?? 0
    return Date().timeIntervalSince1970 * 1000 < expiresAt
  }

  func unlockStatus() -> [String: Any] {
    let expiresAt = sharedDefaults?.double(forKey: unlockKey) ?? 0
    let unlocked = Date().timeIntervalSince1970 * 1000 < expiresAt
    return ["unlocked": unlocked, "expiresAt": expiresAt]
  }
}
