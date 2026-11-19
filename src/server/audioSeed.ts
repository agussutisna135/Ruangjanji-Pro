import fs from 'fs';
import path from 'path';

function writeWavFile(filePath: string, chords: number[][], bpm: number) {
  const sampleRate = 22050;
  const beatDur = 60 / bpm;
  const chordDur = beatDur * 4;
  const totalSec = chords.length * chordDur;
  const numSamples = Math.floor(sampleRate * totalSec);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // WAV Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const chordIdx = Math.min(Math.floor(t / chordDur), chords.length - 1);
    const localT = t - chordIdx * chordDur;
    const chord = chords[chordIdx];

    let sample = 0;
    // Soft warm piano/harp arpeggiated pad
    for (let n = 0; n < chord.length; n++) {
      const noteDelay = n * 0.22;
      if (localT >= noteDelay) {
        const nt = localT - noteDelay;
        const env = Math.min(1, nt / 0.04) * Math.exp(-nt * 0.72);
        const freq = chord[n];
        sample += (Math.sin(2 * Math.PI * freq * nt) * 0.65 + Math.sin(4 * Math.PI * freq * nt) * 0.14) * env;
      }
    }

    // Gentle global fade in/out for seamless looping
    const loopFade = Math.min(1, t / 0.6, (totalSec - t) / 0.6);
    const val = Math.max(-1, Math.min(1, sample * 0.24 * loopFade));
    buffer.writeInt16LE(Math.round(val * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

export function ensureBuiltinAudioTracks(audioDir: string) {
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  const tracks: Array<{ filename: string; bpm: number; chords: number[][] }> = [
    {
      filename: 'eternal-vow.wav',
      bpm: 72,
      // Cmaj9 -> Am9 -> Fmaj7 -> G6
      chords: [
        [261.63, 329.63, 392.0, 493.88, 587.33],
        [220.0, 261.63, 329.63, 493.88, 523.25],
        [174.61, 220.0, 261.63, 329.63, 440.0],
        [196.0, 246.94, 293.66, 329.63, 392.0],
      ],
    },
    {
      filename: 'ivory-morning.wav',
      bpm: 66,
      // Dmaj7 -> Bm7 -> Gmaj7 -> A6
      chords: [
        [293.66, 369.99, 440.0, 554.37],
        [246.94, 293.66, 369.99, 440.0],
        [196.0, 246.94, 293.66, 369.99],
        [220.0, 277.18, 329.63, 369.99],
      ],
    },
    {
      filename: 'emerald-garden.wav',
      bpm: 78,
      // Fmaj7 -> Dm7 -> Bbmaj7 -> C6
      chords: [
        [174.61, 220.0, 261.63, 329.63, 440.0],
        [146.83, 220.0, 261.63, 349.23, 440.0],
        [233.08, 293.66, 349.23, 440.0, 523.25],
        [261.63, 329.63, 392.0, 440.0, 523.25],
      ],
    },
  ];

  for (const t of tracks) {
    const full = path.join(audioDir, t.filename);
    if (!fs.existsSync(full)) {
      writeWavFile(full, t.chords, t.bpm);
    }
  }
}
