# Node-RED USB Relay Control

A Node-RED palette for controlling USB relay modules via serial communication. Based on the NOYITO 4-Channel USB Relay Module but compatible with similar CH340-based relay modules.

## Features

- Control up to 4 relays individually
- Support for on/off/toggle operations
- Dynamic relay control via input messages
- Compatible with CH340 USB-to-serial relay modules
- Cross-platform support (Windows, Linux, macOS)

## Installation

Install directly from the Node-RED palette manager or via npm:

```bash
npm install node-red-contrib-usb-relay
```

## Hardware Requirements

- USB relay module with CH340 USB-to-serial chip
- Appropriate drivers installed for your operating system
- Available USB port

### Driver Installation

**Windows:** Install CH340 drivers from the manufacturer
**Linux:** Usually works out of the box, may need to add user to dialout group
**macOS:** May require CH340 driver installation

## Usage

### USB Relay Node

The main control node for relay operations.

#### Configuration
- **Name**: Optional node name
- **Serial Port**: COM port where relay module is connected
- **Relay Number**: Which relay (1-4) to control
- **Action**: Default action (on/off/toggle)

#### Input Message Properties
- `msg.payload`: Action to perform ("on", "off", "toggle")
- `msg.relay`: Relay number to control (1-4)
- `msg.port`: Serial port to use (overrides node config)

#### Output Message
```javascript
{
  payload: {
    relay: 1,
    action: "on",
    timestamp: "2024-01-01T12:00:00.000Z"
  }
}
```

## Examples

### Basic Usage
1. Drag a USB Relay node onto your flow
2. Configure the serial port and relay number
3. Deploy and trigger with an inject node

### Dynamic Control
Send messages with different payloads:
- `{payload: "on", relay: 1}` - Turn on relay 1
- `{payload: "off", relay: 2}` - Turn off relay 2
- `{payload: "toggle", relay: 3}` - Toggle relay 3

## Troubleshooting

### Common Issues
1. **Permission denied**: Add user to dialout group on Linux
2. **Port not found**: Check device manager and drivers
3. **Connection timeout**: Verify correct port and baud rate

### Debug Steps
1. Check if device appears in system device list
2. Verify correct COM port in Node-RED configuration
3. Ensure no other applications are using the port
4. Check Node-RED debug tab for error messages

## License

MIT License - see LICENSE file for details.

## Contributing

Pull requests welcome! Please ensure compatibility with existing relay modules.