export function triggerHaptic(type: 'success' | 'warning' = 'success') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) {
    return;
  }

  try {
    if (type === 'success') {
      // Crisp 45ms physical click pulse
      navigator.vibrate(45);
    } else {
      // Double tap warning
      navigator.vibrate([30, 40, 30]);
    }
  } catch {
    // Vibrate blocked by browser policy
  }
}
