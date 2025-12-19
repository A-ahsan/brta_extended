/**
 * Notification Sound Utility
 * Plays sounds for notifications even when tab is not active
 * Similar to WhatsApp, Telegram, Messenger
 */

class NotificationSound {
  constructor() {
    this.sounds = {
      // Different sounds for different notification types
      default: '/sounds/notification.mp3',
      success: '/sounds/success.mp3',
      warning: '/sounds/warning.mp3',
      message: '/sounds/message.mp3'
    };
    
    this.audioContext = null;
    this.audioBuffers = {};
    this.enabled = this.getSoundPreference();
    
    // Initialize on user interaction (required by browsers)
    this.initialized = false;
  }

  // Initialize Audio Context (call after user interaction)
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Create AudioContext for better browser compatibility
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      
      // Preload notification sounds
      await this.preloadSounds();
      
      this.initialized = true;
      console.log('✅ Notification sounds initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification sounds:', error);
    }
  }

  // Preload sounds for instant playback
  async preloadSounds() {
    try {
      // Load default notification sound from data URL (embedded sound)
      // This is a short, pleasant notification tone
      const defaultSound = await this.createDefaultSound();
      this.audioBuffers.default = defaultSound;
      
      console.log('✅ Notification sounds preloaded');
    } catch (error) {
      console.error('❌ Failed to preload sounds:', error);
    }
  }

  // Create a default notification sound using Web Audio API
  async createDefaultSound() {
    if (!this.audioContext) return null;

    // Create a simple pleasant notification sound (like WhatsApp)
    const duration = 0.3;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const channel = buffer.getChannelData(0);

    // Generate a two-tone notification sound (like a bell)
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      // First tone: 800Hz
      const tone1 = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 8);
      // Second tone: 1000Hz (slightly delayed)
      const tone2 = Math.sin(2 * Math.PI * 1000 * (t - 0.05)) * Math.exp(-(t - 0.05) * 8);
      
      channel[i] = (tone1 * 0.3 + (t > 0.05 ? tone2 * 0.3 : 0));
    }

    return buffer;
  }

  // Play notification sound
  async play(type = 'default') {
    // Check if sound is enabled
    if (!this.enabled) {
      console.log('🔇 Notification sounds disabled by user');
      return;
    }

    // Initialize if not already done
    if (!this.initialized) {
      await this.initialize();
    }

    // Resume AudioContext if suspended (browser autoplay policy)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    try {
      const buffer = this.audioBuffers[type] || this.audioBuffers.default;
      if (!buffer) {
        console.warn('⚠️ No audio buffer available');
        return;
      }

      // Create source and connect to output
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      
      // Add gain node for volume control
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0.5; // 50% volume
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Play the sound
      source.start(0);
      
      console.log('🔔 Notification sound played');
    } catch (error) {
      console.error('❌ Failed to play notification sound:', error);
    }
  }

  // Enable/disable sounds
  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem('brta_notification_sound', enabled ? 'true' : 'false');
    console.log(enabled ? '🔔 Notification sounds enabled' : '🔇 Notification sounds disabled');
  }

  // Get sound preference from localStorage
  getSoundPreference() {
    const saved = localStorage.getItem('brta_notification_sound');
    return saved === null ? true : saved === 'true'; // Enabled by default
  }

  // Check if sounds are enabled
  isEnabled() {
    return this.enabled;
  }

  // Play specific notification types
  playSuccess() {
    this.play('success');
  }

  playWarning() {
    this.play('warning');
  }

  playMessage() {
    this.play('message');
  }
}

// Create singleton instance
const notificationSound = new NotificationSound();

// Export functions
export const initializeNotificationSound = () => notificationSound.initialize();
export const playNotificationSound = (type) => notificationSound.play(type);
export const setNotificationSoundEnabled = (enabled) => notificationSound.setEnabled(enabled);
export const isNotificationSoundEnabled = () => notificationSound.isEnabled();

export default notificationSound;
