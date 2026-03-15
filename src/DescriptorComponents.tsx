import React, { useState } from 'react';
import usbClassesData from './usb-classes.json';
import { createUsbAudioStream } from './UsbAudioStream';
import { playUsbAudioStream } from './UsbAudioPlayer';

// Helper to format numbers as hex
const toHex = (num: number, padding: number = 2) => `0x${num.toString(16).toUpperCase().padStart(padding, '0')}`;

// Helper to format BCD version
const toBCD = (major: number, minor: number, sub: number) => 
  `${major}.${minor}.${sub}`;

// Helper to lookup USB Class/Subclass/Protocol
const lookupUSBClass = (classId: number, subclassId?: number, protocolId?: number): string => {
  const hexClass = toHex(classId, 2).replace('0x', '') + 'h';
  const classObj = usbClassesData.usb_class_codes.find(c => c.base_class_id === hexClass);

  if (!classObj) return toHex(classId);

  let result = `${toHex(classId)} (${classObj.base_class_name})`;

  if (subclassId !== undefined) {
    const hexSubclass = toHex(subclassId, 2).replace('0x', '') + 'h';
    const subclassObj = classObj.subclasses.find(s => s.subclass_id === hexSubclass);
    
    if (subclassObj) {
        result += `, ${toHex(subclassId)} (${subclassObj.subclass_name})`;
        
        if (protocolId !== undefined && subclassObj.protocols) {
            // Check protocols if available in JSON (current JSON structure has empty protocols array mostly)
             // Simple fallback or lookup if protocols were populated
        }
    } else {
        result += `, ${toHex(subclassId)}`;
    }
  }

  return result;
};


const Field = ({ name, value, comment }: { name: string, value: string | number | React.ReactNode, comment?: string }) => (
  <div className="descriptor-field">
    <span className="field-name">{name}</span>
    <span className="field-value">{value}</span>
    {comment && <span className="field-comment">; {comment}</span>}
  </div>
);

// Collapsible Wrapper Component
const CollapsibleDescriptor = ({ title, children, defaultOpen = true, className = "" }: { title: string, children: React.ReactNode, defaultOpen?: boolean, className?: string }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`descriptor-block ${className}`}>
      <div 
        className="descriptor-header collapsible-header" 
        onClick={() => setIsOpen(!isOpen)}
        title="Click to toggle"
      >
        <span className="toggle-icon">{isOpen ? '▼' : '▶'}</span> {title}
      </div>
      {isOpen && <div className="descriptor-content">{children}</div>}
    </div>
  );
};

export const EndpointDescriptor = ({ endpoint, device, usbInterface, interfaceClass }: { endpoint: USBEndpoint; device: USBDevice; usbInterface: USBInterface; interfaceClass: number }) => {
  const directionBit = endpoint.direction === 'in' ? 0x80 : 0x00;
  const address = toHex(endpoint.endpointNumber | directionBit);
  const [phase, setPhase] = useState<'idle' | 'collecting' | 'playing'>('idle');
  const [error, setError] = useState<string | null>(null);

  const showPlayButton = endpoint.type === 'isochronous' && endpoint.direction === 'in' && interfaceClass === 0x01;

  async function handlePlay() {
    setError(null);
    const audioCtx = new AudioContext({ sampleRate: 48_000 });
    // Both initiated synchronously within the user-activation window (before any await):
    //   device.open() requires transient user activation — initiating it here guarantees that.
    //   requestDevice() shows the browser access prompt for explicit user confirmation.
    const openPromise = device.opened ? Promise.resolve() : device.open();
    // const devicePromise = navigator.usb.requestDevice({
    //   filters: [{ vendorId: device.vendorId, productId: device.productId }],
    // });
    setPhase('collecting');
    try {
      await Promise.all([openPromise, /* devicePromise */]);
      const stream = await createUsbAudioStream(device, usbInterface, endpoint);
      setPhase('playing');
      await playUsbAudioStream(stream, audioCtx);
    } catch (err) {
      console.error('USB audio playback failed:', err);
      setError(err instanceof Error ? err.message : String(err));
      await audioCtx.close().catch(() => {});
    } finally {
      setPhase('idle');
    }
  }

  const buttonLabel = phase === 'collecting' ? 'Collecting…' : phase === 'playing' ? 'Playing…' : 'Play Audio (5s)';

  // Endpoints are small, keeping them non-collapsible for now but wrapped in the block style
  return (
    <div className="descriptor-block endpoint-descriptor">
      <div className="descriptor-header">ENDPOINT DESCRIPTOR</div>
      <Field name="bLength" value="7" />
      <Field name="bDescriptorType" value="0x05" comment="ENDPOINT" />
      <Field name="bEndpointAddress" value={address} comment={`EP ${endpoint.endpointNumber} ${endpoint.direction.toUpperCase()}`} />
      <Field name="bmAttributes" value={endpoint.type} />
      <Field name="wMaxPacketSize" value={endpoint.packetSize} />
      <Field name="bInterval" value="-" comment="(Not available in WebUSB)" />
      {showPlayButton && (
        <>
          <button onClick={handlePlay} disabled={phase !== 'idle'}>{buttonLabel}</button>
          {error && <span className="field-comment" style={{ color: 'var(--error-color, #ff5252)' }}>{error}</span>}
        </>
      )}
    </div>
  );
};

export const InterfaceDescriptor = ({ iface, alternate, device }: { iface: USBInterface; alternate: USBAlternateInterface; device: USBDevice }) => {
  return (
    <CollapsibleDescriptor
      title={`INTERFACE DESCRIPTOR (${iface.interfaceNumber})`}
      className="interface-descriptor"
      defaultOpen={false}
    >
      <Field name="bLength" value="9" />
      <Field name="bDescriptorType" value="0x04" comment="INTERFACE" />
      <Field name="bInterfaceNumber" value={iface.interfaceNumber} />
      <Field name="bAlternateSetting" value={alternate.alternateSetting} />
      <Field name="bNumEndpoints" value={alternate.endpoints.length} />
      <Field name="bInterfaceClass" value={lookupUSBClass(alternate.interfaceClass)} />
      <Field name="bInterfaceSubClass" value={lookupUSBClass(alternate.interfaceClass, alternate.interfaceSubclass).split(', ')[1] || toHex(alternate.interfaceSubclass)} />
      <Field name="bInterfaceProtocol" value={toHex(alternate.interfaceProtocol)} />
      <Field name="iInterface" value={alternate.interfaceName || "N/A"} />

      <div className="nested-descriptors">
        {alternate.endpoints.map((ep, idx) => (
          <EndpointDescriptor key={idx} endpoint={ep} device={device} usbInterface={iface} interfaceClass={alternate.interfaceClass} />
        ))}
      </div>
    </CollapsibleDescriptor>
  );
};

export const ConfigurationDescriptor = ({ config, device }: { config: USBConfiguration; device: USBDevice }) => {
  return (
    <CollapsibleDescriptor
      title={`CONFIGURATION DESCRIPTOR (${config.configurationValue})`}
      className="config-descriptor"
      defaultOpen={false}
    >
      <Field name="bLength" value="9" />
      <Field name="bDescriptorType" value="0x02" comment="CONFIGURATION" />
      <Field name="wTotalLength" value="-" comment="(Calculated by Host)" />
      <Field name="bNumInterfaces" value={config.interfaces.length} />
      <Field name="bConfigurationValue" value={config.configurationValue} />
      <Field name="iConfiguration" value={config.configurationName || "N/A"} />
      <Field name="bmAttributes" value="-" comment="(Not exposed by WebUSB)" />
      <Field name="bMaxPower" value="-" comment="(Not exposed by WebUSB)" />

      <div className="nested-descriptors">
        {config.interfaces.map(iface => (
          <div key={iface.interfaceNumber}>
            {iface.alternates.map((alt, idx) => (
              <InterfaceDescriptor key={`${iface.interfaceNumber}-${idx}`} iface={iface} alternate={alt} device={device} />
            ))}
          </div>
        ))}
      </div>
    </CollapsibleDescriptor>
  );
};

export const DeviceDescriptor = ({ device }: { device: USBDevice }) => {
  return (
    <CollapsibleDescriptor 
      title="DEVICE DESCRIPTOR" 
      className="device-descriptor"
      defaultOpen={true}
    >
      <Field name="bLength" value="18" />
      <Field name="bDescriptorType" value="0x01" comment="DEVICE" />
      <Field name="bcdUSB" value={toBCD(device.usbVersionMajor, device.usbVersionMinor, device.usbVersionSubminor)} />
      <Field name="bDeviceClass" value={lookupUSBClass(device.deviceClass)} />
      <Field name="bDeviceSubClass" value={lookupUSBClass(device.deviceClass, device.deviceSubclass).split(', ')[1] || toHex(device.deviceSubclass)} />
      <Field name="bDeviceProtocol" value={toHex(device.deviceProtocol)} />
      <Field name="bMaxPacketSize0" value="-" comment="(Not exposed by WebUSB)" />
      <Field name="idVendor" value={toHex(device.vendorId, 4)} />
      <Field name="idProduct" value={toHex(device.productId, 4)} />
      <Field name="bcdDevice" value={toBCD(device.deviceVersionMajor, device.deviceVersionMinor, device.deviceVersionSubminor)} />
      <Field name="iManufacturer" value={device.manufacturerName || "N/A"} />
      <Field name="iProduct" value={device.productName || "N/A"} />
      <Field name="iSerialNumber" value={device.serialNumber || "N/A"} />
      <Field name="bNumConfigurations" value={device.configurations.length} />

      <div className="nested-descriptors">
        {device.configurations.map(config => (
          <ConfigurationDescriptor key={config.configurationValue} config={config} device={device} />
        ))}
      </div>
    </CollapsibleDescriptor>
  );
};
