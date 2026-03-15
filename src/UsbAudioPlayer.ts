const DURATION_MS = 5_000;
const DEFAULT_SAMPLE_RATE = 48_000;
const DEFAULT_NUM_CHANNELS = 2;
const BYTES_PER_SAMPLE = 2;

export async function playUsbAudioStream(
  stream: ReadableStream<Uint8Array>,
  { sampleRate = DEFAULT_SAMPLE_RATE, numChannels = DEFAULT_NUM_CHANNELS }: {
    sampleRate?: number;
    numChannels?: number;
  } = {},
): Promise<void> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  const deadline = Date.now() + DURATION_MS;

  try {
    while (Date.now() < deadline) {
      const remaining = deadline - Date.now();
      const timeout = new Promise<null>(r => setTimeout(() => r(null), remaining));
      const result = await Promise.race([reader.read(), timeout]);
      if (result === null || result.done) break;
      chunks.push(result.value);
    }
  } finally {
    reader.cancel();
  }

  const totalBytes = chunks.reduce((s, c) => s + c.byteLength, 0);
  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const numFrames = Math.floor(merged.byteLength / (numChannels * BYTES_PER_SAMPLE));
  const audioCtx = new AudioContext({ sampleRate });
  const buffer = audioCtx.createBuffer(numChannels, numFrames, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < numFrames; i++) {
      const byteOffset = (i * numChannels + ch) * BYTES_PER_SAMPLE;
      const raw = merged[byteOffset] | (merged[byteOffset + 1] << 8);
      channelData[i] = (raw > 0x7FFF ? raw - 0x10000 : raw) / 0x8000;
    }
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start();
  await new Promise<void>(resolve => { source.onended = () => resolve(); });
  await audioCtx.close();
}
