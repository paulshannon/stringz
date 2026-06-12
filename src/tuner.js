// Microphone pitch detection for the tuner, using time-domain autocorrelation.
// All processing is local — audio never leaves the browser.

// Detect the fundamental frequency (Hz) of a time-domain buffer, or -1 if the
// signal is too quiet / no clear pitch. Classic autocorrelation with parabolic
// interpolation around the peak.
function autoCorrelate(buf, sampleRate) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; // too quiet

  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  }

  const b = buf.slice(r1, r2);
  const size = b.length;
  const c = new Array(size).fill(0);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size - i; j++) c[i] += b[j] * b[j + i];
  }

  let d = 0;
  while (d < size - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < size; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  if (maxpos <= 0) return -1;

  let T0 = maxpos;
  const x1 = c[T0 - 1] ?? 0;
  const x2 = c[T0];
  const x3 = c[T0 + 1] ?? 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const bb = (x3 - x1) / 2;
  if (a) T0 -= bb / (2 * a);

  return sampleRate / T0;
}

// Create a tuner. Calls onPitch(freqOrNull) periodically while listening and
// onStatus('listening' | 'idle' | 'denied' | 'unsupported') on transitions.
export function createTuner({ onPitch, onStatus }) {
  let audioCtx = null;
  let analyser = null;
  let source = null;
  let stream = null;
  let raf = 0;
  let buf = null;
  let last = 0;

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || !(window.AudioContext || window.webkitAudioContext)) {
      onStatus('unsupported');
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false },
      });
    } catch {
      onStatus('denied');
      return;
    }
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    buf = new Float32Array(analyser.fftSize);
    source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    onStatus('listening');
    last = 0;
    loop(0);
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (t - last < 80) return; // ~12 readings/sec is plenty and keeps CPU low
    last = t;
    analyser.getFloatTimeDomainData(buf);
    const freq = autoCorrelate(buf, audioCtx.sampleRate);
    onPitch(freq > 0 ? freq : null);
  }

  function stop() {
    cancelAnimationFrame(raf);
    if (source) source.disconnect();
    if (stream) stream.getTracks().forEach((tr) => tr.stop());
    if (audioCtx) audioCtx.close();
    audioCtx = analyser = source = stream = buf = null;
    onStatus('idle');
  }

  return { start, stop };
}
