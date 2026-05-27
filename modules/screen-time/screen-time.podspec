Pod::Spec.new do |s|
  s.name           = 'screen-time'
  s.version        = '1.0.0'
  s.summary        = 'Local Expo module for iOS Screen Time / FamilyControls'
  s.author         = ''
  s.homepage       = 'https://github.com'
  s.platforms      = { :ios => '16.0' }
  s.source         = { :path => '.' }
  s.source_files   = 'ios/**/*.swift'
  s.dependency     'ExpoModulesCore'
  s.frameworks     = 'FamilyControls', 'ManagedSettings', 'DeviceActivity', 'UIKit', 'SwiftUI'
end
