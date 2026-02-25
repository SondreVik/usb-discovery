import { useState, useEffect } from 'react';
import './App.css';
import { DeviceDescriptor } from './DescriptorComponents';

function DeviceCard({ device }: { device: USBDevice, index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="device-card-wrapper">
       <div 
         className="device-summary" 
         onClick={() => setIsExpanded(!isExpanded)}
         title="Click to expand/collapse device details"
       >
          <div className="summary-header">
            <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
            <h2>{device.productName || 'Unknown Device'}</h2>
          </div>
          <span className="vid-pid">VID: {device.vendorId.toString(16).padStart(4, '0')} PID: {device.productId.toString(16).padStart(4, '0')}</span>
       </div>
       {isExpanded && (
         <div className="device-details-content">
           <DeviceDescriptor device={device} />
         </div>
       )}
    </div>
  );
}

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

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>WebUSB Descriptor Viewer</h1>
        <button className="connect-btn" onClick={requestDevice}>
          + Connect New Device
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="device-list">
        {devices.length === 0 ? (
          <div className="empty-state">
            <p>No devices connected.</p>
            <p>Click "Connect New Device" to explore USB descriptors.</p>
          </div>
        ) : (
          devices.map((device, index) => (
            <DeviceCard key={`${device.vendorId}-${device.productId}-${index}`} device={device} index={index} />
          ))
        )}
      </div>
    </div>
  );
}

export default App;
