import SwiftUI
import FamilyControls

@available(iOS 16, *)
struct ScreenTimePickerView: View {
  @State private var selection = FamilyActivitySelection()
  @Environment(\.dismiss) private var dismiss
  let onSave: (FamilyActivitySelection) -> Void
  let onCancel: () -> Void

  var body: some View {
    NavigationStack {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Choose Apps to Block")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button("Cancel") {
              onCancel()
              dismiss()
            }
          }
          ToolbarItem(placement: .confirmationAction) {
            Button("Done") {
              onSave(selection)
              dismiss()
            }
          }
        }
    }
  }
}
