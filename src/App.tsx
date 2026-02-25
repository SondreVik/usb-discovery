import { useState, useEffect } from 'react';
import './App.css';

// Removed manual interface definitions to rely on @types/w3c-web-usb

function App() {
  const [devices, setDevices] = useState<USBDevice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if WebUSB is supported
    if (!navigator.usb) {
      setError("WebUSB API is not supported in this browser.");
      return;
    }

    // Get already paired devices
    navigator.usb.getDevices().then((initialDevices) => {
      setDevices(initialDevices);
    }).catch(err => {
      console.error("Error getting devices:", err);
      setError("Failed to get devices: " + err.message);
    });

    // Handle device connection/disconnection
    const handleConnect = (event: USBConnectionEvent) => {
      console.log("Device connected:", event.device);
      setDevices((prevDevices) => {
        // Prevent duplicates
        if (prevDevices.find(d => d.serialNumber === event.device.serialNumber && d.productId === event.device.productId && d.vendorId === event.device.vendorId)) {
            return prevDevices;
        }
        return [...prevDevices, event.device];
      });
    };

    const handleDisconnect = (event: USBConnectionEvent) => {
      console.log("Device disconnected:", event.device);
      setDevices((prevDevices) => prevDevices.filter(d => d !== event.device));
    };

    navigator.usb.addEventListener('connect', handleConnect);
    navigator.usb.addEventListener('disconnect', handleDisconnect);

    return () => {
      if (navigator.usb) {
        navigator.usb.removeEventListener('connect', handleConnect);
        navigator.usb.removeEventListener('disconnect', handleDisconnect);
      }
    };
  }, []);

  const requestDevice = async () => {
    try {
      // Request access to a new device
      // filters: [] allows selecting any device
      await navigator.usb.requestDevice({ filters: [] });
      
      // Update the list manually just in case the event doesn't fire immediately or race conditions
      const currentDevices = await navigator.usb.getDevices();
      setDevices(currentDevices);
    } catch (err: any) {
      console.error("Error requesting device:", err);
      // Don't show error if user cancelled (NotFoundError or 'No device selected.')
      if (err.name !== 'NotFoundError' && err.message !== 'No device selected.') {
         setError("Failed to request device: " + err.message);
      }
    }
  };

  const renderEndpoint = (ep: USBEndpoint) => (
    <div key={ep.endpointNumber} className="endpoint-info">
      <span className="label">Endpoint {ep.endpointNumber}:</span>
      <span className="value">{ep.direction} {ep.type} (Packet Size: {ep.packetSize})</span>
    </div>
  );

  const renderInterface = (iface: USBInterface) => (
    <div key={iface.interfaceNumber} className="interface-info">
      <h5>Interface {iface.interfaceNumber} (Claimed: {iface.claimed ? 'Yes' : 'No'})</h5>
      {iface.alternates.map((alt, idx) => (
        <div key={idx} className="alternate-info">
          <div className="alternate-header">
            <strong>Alternate {alt.alternateSetting}</strong>
            <span className="details">Class {alt.interfaceClass}, Sub {alt.interfaceSubclass}, Proto {alt.interfaceProtocol}</span>
            {alt.interfaceName && <span className="name">Name: {alt.interfaceName}</span>}
          </div>
          {alt.endpoints.length > 0 && (
            <div className="endpoints-list">
              {alt.endpoints.map(renderEndpoint)}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderConfiguration = (config: USBConfiguration) => (
    <div key={config.configurationValue} className="config-info">
      <h4>Configuration {config.configurationValue}: {config.configurationName || 'Unnamed'}</h4>
      <div className="interfaces-list">
        {config.interfaces.map(renderInterface)}
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>WebUSB Discovery Tool</h1>
        <button className="connect-btn" onClick={requestDevice}>
          + Connect New Device
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="device-grid">
        {devices.length === 0 ? (
          <div className="empty-state">
            <p>No devices connected.</p>
            <p>Click "Connect New Device" to start exploring.</p>
          </div>
        ) : (
          devices.map((device, index) => (
            <div key={`${device.vendorId}-${device.productId}-${index}`} className="device-card">
              <div className="device-header">
                <h2>{device.productName || 'Unknown Device'}</h2>
                <div className="device-id">
                  <span>VID: 0x{device.vendorId.toString(16).padStart(4, '0')}</span>
                  <span>PID: 0x{device.productId.toString(16).padStart(4, '0')}</span>
                </div>
              </div>

              <div className="device-body">
                <div className="info-group">
                  <h3>Basic Information</h3>
                  <div className="info-row">
                    <span className="label">Manufacturer:</span>
                    <span className="value">{device.manufacturerName || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Serial Number:</span>
                    <span className="value">{device.serialNumber || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">USB Version:</span>
                    <span className="value">{device.usbVersionMajor}.{device.usbVersionMinor}.{device.usbVersionSubminor}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Device Version:</span>
                    <span className="value">{device.deviceVersionMajor}.{device.deviceVersionMinor}.{device.deviceVersionSubminor}</span>
                  </div>
                </div>

                <div className="info-group">
                  <h3>Classification</h3>
                  <div className="info-row">
                    <span className="label">Class:</span>
                    <span className="value">0x{device.deviceClass.toString(16).padStart(2, '0')}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Subclass:</span>
                    <span className="value">0x{device.deviceSubclass.toString(16).padStart(2, '0')}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Protocol:</span>
                    <span className="value">0x{device.deviceProtocol.toString(16).padStart(2, '0')}</span>
                  </div>
                </div>

                {device.configurations && device.configurations.length > 0 && (
                  <div className="info-group configurations">
                    <h3>Configurations ({device.configurations.length})</h3>
                    {device.configurations.map(renderConfiguration)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
