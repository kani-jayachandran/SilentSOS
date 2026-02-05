/**
 * Real Sensor Manager - ONLY REAL BROWSER API DATA
 * Removes all fake/simulated metrics and impossible calculations
 */

export class RealSensorManager {
  constructor() {
    this.motionCallback = null;
    this.audioCallback = null;
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    
    // Motion tracking - REAL DATA ONLY
    this.motionHistory = [];
    this.lastMotionUpdate = Date.now();
    
    // Audio tracking - REAL DATA ONLY
    this.audioHistory = [];
    this.lastAudioUpdate = Date.now();
    
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
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
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

  // Start motion monitoring - REAL DeviceMotionEvent ONLY
  startMotionMonitoring(callback) {
    if (this.isMotionActive) return;
    
    this.motionCallback = callback;
    this.isMotionActive = true;
    this.motionHistory = [];
    
    const handleMotion = (event) => {
      if (!this.isMotionActive) return;
      
      const now = Date.now();
      
      // Get REAL acceleration data from browser API
      const acceleration = event.acceleration || { x: 0, y: 0, z: 0 };
      const accelerationIncludingGravity = event.accelerationIncludingGravity || { x: 0, y: 0, z: 0 };
      const rotationRate = event.rotationRate || { alpha: 0, beta: 0, gamma: 0 };
      
      // Calculate REAL motion magnitude using physics formula
      const magnitude = Math.sqrt(
        acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2
      );
      
      // Store motion history for variance calculation (last 2 seconds)
      this.motionHistory.push({ magnitude, timestamp: now });
      this.motionHistory = this.motionHistory.filter(entry => now - entry.timestamp <= 2000);
      
      // Calculate REAL variance from actual motion data
      let variance = 0;
      if (this.motionHistory.length > 1) {
        const magnitudes = this.motionHistory.map(entry => entry.magnitude);
        const mean = magnitudes.reduce((sum, val) => sum + val, 0) / magnitudes.length;
        variance = magnitudes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / magnitudes.length;
      }
      
      // Calculate REAL inactivity duration
      const inactivityThreshold = 1.0; // m/s²
      let inactivityDuration = 0;
      
      // Find last significant movement
      for (let i = this.motionHistory.length - 1; i >= 0; i--) {
        if (this.motionHistory[i].magnitude > inactivityThreshold) {
          break;
        }
        inactivityDuration = now - this.motionHistory[i].timestamp;
      }
      
      // Update every 250ms as specified
      if (now - this.lastMotionUpdate >= 250) {
        this.lastMotionUpdate = now;
        
        if (this.motionCallback) {
          this.motionCallback({
            // RAW BROWSER DATA
            acceleration,
            accelerationIncludingGravity,
            rotationRate,
            
            // CALCULATED FROM REAL DATA
            magnitude: parseFloat(magnitude.toFixed(3)),
            variance: parseFloat(variance.toFixed(3)),
            inactivityDuration: Math.round(inactivityDuration),
            
            // METADATA
            timestamp: now,
            interval: event.interval || 16, // Browser-provided interval
            
            // TRANSPARENCY LABELS
            dataSource: 'DeviceMotionEvent API',
            note: 'Derived from real device sensors'
          });
        }
      }
    };
    
    window.addEventListener('devicemotion', handleMotion);
    this.motionEventHandler = handleMotion;
    
    console.log('Real motion monitoring started - DeviceMotionEvent API');
  }

  // Stop motion monitoring
  stopMotionMonitoring() {
    this.isMotionActive = false;
    if (this.motionEventHandler) {
      window.removeEventListener('devicemotion', this.motionEventHandler);
      this.motionEventHandler = null;
    }
    this.motionCallback = null;
    this.motionHistory = [];
    console.log('Motion monitoring stopped');
  }

  // Start audio monitoring - REAL Web Audio API ONLY
  async startAudioMonitoring(callback) {
    if (this.isAudioActive) return;
    
    try {
      this.audioCallback = callback;
      this.isAudioActive = true;
      this.audioHistory = [];
      
      // Get REAL microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        } 
      });
      
      // Create REAL audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      
      // Configure analyser for REAL frequency analysis
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.3;
      
      this.microphone.connect(this.analyser);
      
      // Create data array for REAL frequency data
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      // Start REAL audio analysis loop
      this.analyzeRealAudio();
      
      console.log('Real audio monitoring started - Web Audio API');
      
    } catch (error) {
      console.error('Failed to start audio monitoring:', error);
      this.isAudioActive = false;
      throw error;
    }
  }

  // Analyze REAL audio data only
  analyzeRealAudio() {
    if (!this.isAudioActive || !this.analyser) return;
    
    const now = Date.now();
    
    // Get REAL frequency data from Web Audio API
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate REAL RMS amplitude
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i] * this.dataArray[i];
    }
    const rms = Math.sqrt(sum / this.dataArray.length) / 255; // Normalize to 0-1
    
    // Store audio history for silence tracking
    this.audioHistory.push({ rms, timestamp: now });
    this.audioHistory = this.audioHistory.filter(entry => now - entry.timestamp <= 10000); // Keep 10 seconds
    
    // Calculate REAL silence duration
    const silenceThreshold = 0.01; // Very low threshold for actual silence
    let silenceDuration = 0;
    
    // Find last non-silent moment
    for (let i = this.audioHistory.length - 1; i >= 0; i--) {
      if (this.audioHistory[i].rms > silenceThreshold) {
        break;
      }
      silenceDuration = now - this.audioHistory[i].timestamp;
    }
    
    // Update callback with REAL data only
    if (this.audioCallback && now - this.lastAudioUpdate >= 250) {
      this.lastAudioUpdate = now;
      
      this.audioCallback({
        // REAL AUDIO METRICS
        rmsAmplitude: parseFloat(rms.toFixed(4)),
        silenceDuration: Math.round(silenceDuration),
        
        // RAW FREQUENCY DATA (for transparency)
        frequencyData: Array.from(this.dataArray.slice(0, 32)), // First 32 bins for display
        
        // AUDIO CONTEXT INFO
        sampleRate: this.audioContext.sampleRate,
        
        // METADATA
        timestamp: now,
        dataSource: 'Web Audio API',
        note: 'Browser-limited inference'
      });
    }
    
    // Continue analysis at ~60fps
    setTimeout(() => this.analyzeRealAudio(), 16);
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
    this.audioHistory = [];
    
    console.log('Audio monitoring stopped');
  }

  // Get current sensor status
  getStatus() {
    return {
      motion: {
        active: this.isMotionActive,
        supported: typeof DeviceMotionEvent !== 'undefined',
        api: 'DeviceMotionEvent'
      },
      audio: {
        active: this.isAudioActive,
        supported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        api: 'Web Audio API'
      }
    };
  }

  // Get real-time sensor capabilities (for transparency)
  getSensorCapabilities() {
    return {
      motion: {
        available: typeof DeviceMotionEvent !== 'undefined',
        requiresPermission: typeof DeviceMotionEvent !== 'undefined' && 
                           typeof DeviceMotionEvent.requestPermission === 'function',
        metrics: ['acceleration', 'rotationRate', 'magnitude', 'variance', 'inactivity'],
        updateRate: '250ms',
        note: 'Real device accelerometer and gyroscope data'
      },
      audio: {
        available: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        requiresPermission: true,
        metrics: ['rmsAmplitude', 'silenceDuration', 'frequencyData'],
        updateRate: '250ms',
        note: 'Real microphone input analysis'
      }
    };
  }
}