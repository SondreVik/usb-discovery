const AUDIO_INTERFACE_CLASS = 0x01;
const PACKETS_PER_TRANSFER = 16;

export class UsbAudioStreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsbAudioStreamError';
  }
}

function findTargetAlternate(usbInterface: USBInterface, endpoint: USBEndpoint): USBAlternateInterface | undefined {
  return usbInterface.alternates.find(alt => alt.endpoints.includes(endpoint));
}

function isOkPacket(p: USBIsochronousInTransferPacket): p is USBIsochronousInTransferPacket & { data: DataView } {
  return p.status === 'ok' && p.data !== undefined && p.data.byteLength > 0;
}

export async function createUsbAudioStream(
  device: USBDevice,
  usbInterface: USBInterface,
  endpoint: USBEndpoint,
): Promise<ReadableStream<Uint8Array>> {
  if (!device.configurations.some(c => c.interfaces.some(i => i === usbInterface))) {
    throw new UsbAudioStreamError('Interface does not belong to the given device');
  }

  const targetAlternate = findTargetAlternate(usbInterface, endpoint);
  if (targetAlternate === undefined) {
    throw new UsbAudioStreamError('Endpoint does not belong to any alternate of the given interface');
  }

  if (targetAlternate.interfaceClass !== AUDIO_INTERFACE_CLASS) {
    throw new UsbAudioStreamError(`Interface class ${targetAlternate.interfaceClass} is not USB Audio (0x01)`);
  }

  if (endpoint.type !== 'isochronous' || endpoint.direction !== 'in') {
    throw new UsbAudioStreamError('Endpoint must be an isochronous IN endpoint');
  }

  if (!device.opened) await device.open();
  if (!usbInterface.claimed) await device.claimInterface(usbInterface.interfaceNumber);
  if (usbInterface.alternate.alternateSetting !== targetAlternate.alternateSetting) {
    await device.selectAlternateInterface(usbInterface.interfaceNumber, targetAlternate.alternateSetting);
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const packetLengths = Array.from({ length: PACKETS_PER_TRANSFER }, () => endpoint.packetSize);
        const result = await device.isochronousTransferIn(endpoint.endpointNumber, packetLengths);
        const okPackets = result.packets.filter(isOkPacket);
        const totalBytes = okPackets.reduce((sum, p) => sum + p.data.byteLength, 0);
        if (totalBytes > 0) {
          const merged = new Uint8Array(totalBytes);
          let offset = 0;
          for (const packet of okPackets) {
            merged.set(new Uint8Array(packet.data.buffer, packet.data.byteOffset, packet.data.byteLength), offset);
            offset += packet.data.byteLength;
          }
          controller.enqueue(merged);
        }
      } catch (err) {
        controller.error(err);
      }
    },
    async cancel() {
      try {
        await device.releaseInterface(usbInterface.interfaceNumber);
      } catch {
        // Device may be disconnected already
      }
    },
  });
}
