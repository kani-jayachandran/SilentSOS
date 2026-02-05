/**
 * SensorManager - Handles real device sensor data collection
 * Uses actual browser APIs for motion, audio, and activity detection
 */

export class SensorManager {
  constructor() {
    this.motionCallback = null;
    this.audioCallback = null;
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    
    // Motion tracking
    this.motionData = {
      acceleration: { x: 0, y: 0, z: 0 },
      rotationRate: { alpha: 0, beta: 0, gamma: 0 },
      lastUpdate: Date.now(),
      variance: 0,
      stillnessDuration: 0,
      lastMovement: Date.now()
    };
    
    // Audio tracking
    this.audioData = {
      averageAmplitude: 0,
      silenceDuration: 0,
      lastSoundTime: Date.now(),
      breathingPattern: [],
      distressIndicators: 0
    };
    
    this.isMotionActive = false;
    this.isAudioActive = false;
  }

  // Request DeviceMotion permission (iOS 13+)
  async requestMotionPermission() {
    try {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        const permission = await DeviceMotionEvent.requestPermission();
        return permission === 'granted';
      }
      
      // For Android and older iOS, check if DeviceMotionEvent is available
      return typeof DeviceMotionEvent !== 'undefined';
    } catch (error) {
      console.error('Motion permission error:', error);
      return false;
    }
  }

  // Request microphone permission
  async requestAudioPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Audio permission error:', error);
      return false;
    }
  }

  // Start motion monitoring using DeviceMotionEvent
  startMotionMonitoring(callback) {
    if (this.isMotionActive) return;
    
    this.motionCallback = callback;
    this.isMotionActive = true;
    
    const handleMotion = (event) => {
      if (!this.isMotionActive) return;
      
      const now = Date.now();
      const acceleration = event.acceleration || { x: 0, y: 0, z: 0 };
      const rotationRate = event.rotationRate || { alpha: 0, beta: 0, gamma: 0 };
      
      // Calculate motion magnitude
      const magnitude = Math.sqrt(
        acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2
      );
      
      // Detect sudden impacts (falls, accidents)
      const suddenImpact = magnitude > 15 ? { magnitude, timestamp: now } : null;
      
      // Calculate motion variance (for detecting irregular patterns)
      const timeDelta = now - this.motionData.lastUpdate;
      if (timeDelta > 100) { // Update every 100ms
        const prevMagnitude = Math.sqrt(
          this.motionData.acceleration.x ** 2 + 
          this.motionData.acceleration.y ** 2 + 
          this.motionData.acceleration.z ** 2
        );
        
        const variance = Math.abs(magnitude - prevMagnitude);
        this.motionData.variance = (this.motionData.variance * 0.9) + (variance * 0.1);
        
        // Track stillness
        if (magnitude < 2) { // Very little movement
          this.motionData.stillnessDuration += timeDelta;
        } else {
          this.motionData.stillnessDuration = 0;
          this.motionData.lastMovement = now;
        }
        
        this.motionData.acceleration = acceleration;
        this.motionData.rotationRate = rotationRate;
        this.motionData.lastUpdate = now;
        
        // Call callback with processed data
        if (this.motionCallback) {
          this.motionCallback({
            ...this.motionData,
            magnitude,
            suddenImpact,
            timestamp: now
          });
        }
      }
    };
    
    window.addEventListener('devicemotion', handleMotion);
    this.motionEventHandler = handleMotion;
    
    console.log('Motion monitoring started');
  }

  // Stop motion monitoring
  stopMotionMonitoring() {
    this.isMotionActive = false;
    if (this.motionEventHandler) {
      window.removeEventListener('devicemotion', this.motionEventHandler);
      this.motionEventHandler = null;
    }
    this.motionCallback = null;
    console.log('Motion monitoring stopped');
  }

  // Start audio monitoring using Web Audio API
  async startAudioMonitoring(callback) {
    if (this.isAudioActive) return;
    
    try {
      this.audioCallback = callback;
      this.isAudioActive = true;
      
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false, // We want to detect all sounds
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      
      // Configure analyser
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      
      this.microphone.connect(this.analyser);
      
      // Create data array for frequency analysis
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      // Start audio analysis loop
      this.analyzeAudio();
      
      console.log('Audio monitoring started');
      
    } catch (error) {
      console.error('Failed to start audio monitoring:', error);
      this.isAudioActive = false;
      throw error;
    }
  }

  // Analyze audio data in real-time
  analyzeAudio() {
    if (!this.isAudioActive || !this.analyser) return;
    
    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate average amplitude
    const sum = this.dataArray.reduce((a, b) => a + b, 0);
    const averageAmplitude = sum / this.dataArray.length / 255; // Normalize to 0-1
    
    const now = Date.now();
    
    // Detect silence
    const silenceThreshold = 0.02;
    if (averageAmplitude < silenceThreshold) {
      this.audioData.silenceDuration += 100; // Assuming 100ms intervals
    } else {
      this.audioData.silenceDuration = 0;
      this.audioData.lastSoundTime = now;
    }
    
    // Detect breathing patterns (low frequency, regular patterns)
    const breathingFrequency = this.detectBreathingPattern(this.dataArray);
    if (breathingFrequency > 0) {
      this.audioData.breathingPattern.push({
        frequency: breathingFrequency,
        amplitude: averageAmplitude,
        timestamp: now
      });
      
      // Keep only last 30 seconds of breathing data
      this.audioData.breathingPattern = this.audioData.breathingPattern.filter(
        pattern => now - pattern.timestamp < 30000
      );
    }
    
    // Detect distress sounds (sudden amplitude spikes, irregular patterns)
    const distressScore = this.detectDistressSounds(this.dataArray, averageAmplitude);
    
    this.audioData.averageAmplitude = averageAmplitude;
    this.audioData.distressIndicators = distressScore;
    
    // Calculate breathing irregularity
    const breathingIrregularity = this.calculateBreathingIrregularity();
    
    // Call callback with processed audio data
    if (this.audioCallback) {
      this.audioCallback({
        ...this.audioData,
        breathingIrregularity,
        distressSound: distressScore > 0.6 ? { confidence: distressScore } : null,
        amplitude: {
          current: averageAmplitude,
          suddenDrop: this.detectSuddenAmplitudeDrop(averageAmplitude)
        },
        timestamp: now
      });
    }
    
    // Continue analysis
    setTimeout(() => this.analyzeAudio(), 100); // 10 FPS
  }

  // Detect breathing patterns in audio frequency data
  detectBreathingPattern(frequencyData) {
    // Breathing typically occurs in 0.2-0.5 Hz range (12-30 breaths per minute)
    // We look for regular, low-frequency patterns
    
    const lowFreqSum = frequencyData.slice(0, 10).reduce((a, b) => a + b, 0);
    const totalSum = frequencyData.reduce((a, b) => a + b, 0);
    
    if (totalSum === 0) return 0;
    
    const lowFreqRatio = lowFreqSum / totalSum;
    
    // If low frequencies dominate and amplitude is moderate, likely breathing
    if (lowFreqRatio > 0.3 && this.audioData.averageAmplitude > 0.01 && this.audioData.averageAmplitude < 0.2) {
      return lowFreqRatio;
    }
    
    return 0;
  }

  // Detect distress sounds (screams, calls for help, irregular patterns)
  detectDistressSounds(frequencyData, amplitude) {
    let distressScore = 0;
    
    // High amplitude sudden spikes
    if (amplitude > 0.7) {
      distressScore += 0.3;
    }
    
    // High frequency content (screams, shouts)
    const highFreqSum = frequencyData.slice(frequencyData.length * 0.7).reduce((a, b) => a + b, 0);
    const totalSum = frequencyData.reduce((a, b) => a + b, 0);
    
    if (totalSum > 0) {
      const highFreqRatio = highFreqSum / totalSum;
      if (highFreqRatio > 0.4) {
        distressScore += 0.4;
      }
    }
    
    // Irregular amplitude patterns
    const amplitudeVariance = this.calculateAmplitudeVariance(amplitude);
    if (amplitudeVariance > 0.3) {
      distressScore += 0.3;
    }
    
    return Math.min(1, distressScore);
  }

  // Calculate breathing irregularity score
  calculateBreathingIrregularity() {
    if (this.audioData.breathingPattern.length < 5) return 0;
    
    const recentPatterns = this.audioData.breathingPattern.slice(-10);
    const frequencies = recentPatterns.map(p => p.frequency);
    
    // Calculate variance in breathing frequency
    const mean = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
    const variance = frequencies.reduce((sum, freq) => sum + Math.pow(freq - mean, 2), 0) / frequencies.length;
    
    // Normalize variance to 0-1 scale
    return Math.min(1, variance * 10);
  }

  // Detect sudden amplitude drops (person becoming unconscious)
  detectSuddenAmplitudeDrop(currentAmplitude) {
    const recentAmplitudes = this.recentAmplitudes || [];
    recentAmplitudes.push(currentAmplitude);
    
    // Keep only last 5 seconds of data
    if (recentAmplitudes.length > 50) {
      recentAmplitudes.shift();
    }
    
    this.recentAmplitudes = recentAmplitudes;
    
    if (recentAmplitudes.length < 20) return false;
    
    // Check if amplitude dropped significantly
    const recentAvg = recentAmplitudes.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const olderAvg = recentAmplitudes.slice(-20, -10).reduce((a, b) => a + b, 0) / 10;
    
    return olderAvg > 0.1 && recentAvg < olderAvg * 0.3; // 70% drop
  }

  // Calculate amplitude variance for distress detection
  calculateAmplitudeVariance(currentAmplitude) {
    const amplitudes = this.amplitudeHistory || [];
    amplitudes.push(currentAmplitude);
    
    if (amplitudes.length > 20) {
      amplitudes.shift();
    }
    
    this.amplitudeHistory = amplitudes;
    
    if (amplitudes.length < 10) return 0;
    
    const mean = amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length;
    const variance = amplitudes.reduce((sum, amp) => sum + Math.pow(amp - mean, 2), 0) / amplitudes.length;
    
    return Math.min(1, variance * 5);
  }

  // Stop audio monitoring
  stopAudioMonitoring() {
    this.isAudioActive = false;
    
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.dataArray = null;
    this.audioCallback = null;
    
    console.log('Audio monitoring stopped');
  }

  // Get current sensor status
  getStatus() {
    return {
      motion: {
        active: this.isMotionActive,
        supported: typeof DeviceMotionEvent !== 'undefined'
      },
      audio: {
        active: this.isAudioActive,
        supported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
      }
    };
  }
}