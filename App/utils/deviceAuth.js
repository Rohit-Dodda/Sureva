import * as LocalAuthentication from 'expo-local-authentication';

// Gates a sensitive action behind Face ID/Touch ID, falling back to the
// device passcode automatically if biometrics fail (disableDeviceFallback:
// false). If the device has no biometric hardware or nothing enrolled at
// all, there's nothing to gate behind, so this resolves true rather than
// blocking the action outright.
export async function authenticateWithDevice(promptMessage) {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hasHardware || !isEnrolled) return true;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: false,
  });
  return result.success;
}
