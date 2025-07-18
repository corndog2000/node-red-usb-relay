const { SerialPort } = require('serialport');

module.exports = function(RED) {
    
    // USB Relay Control Node
    function USBRelayNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        
        node.port = config.port;
        node.relay = parseInt(config.relay) || 1;
        node.action = config.action || 'on';
        
        // Command definitions for all 4 relays
        const COMMANDS = {
            1: { on: Buffer.from([0xA0, 0x01, 0x01, 0xA2]), off: Buffer.from([0xA0, 0x01, 0x00, 0xA1]) },
            2: { on: Buffer.from([0xA0, 0x02, 0x01, 0xA3]), off: Buffer.from([0xA0, 0x02, 0x00, 0xA2]) },
            3: { on: Buffer.from([0xA0, 0x03, 0x01, 0xA4]), off: Buffer.from([0xA0, 0x03, 0x00, 0xA3]) },
            4: { on: Buffer.from([0xA0, 0x04, 0x01, 0xA5]), off: Buffer.from([0xA0, 0x04, 0x00, 0xA4]) }
        };
        
        // Persistent connection variables
        let serialPort = null;
        let connectionTimeout = null;
        let commandQueue = [];
        let isProcessing = false;
        
        // Function to establish connection
        function ensureConnection(portName, callback) {
            if (serialPort && serialPort.isOpen) {
                callback(null);
                return;
            }
            
            if (serialPort) {
                serialPort.close();
            }
            
            serialPort = new SerialPort({
                path: portName,
                baudRate: 9600,
                autoOpen: false
            });
            
            serialPort.open((err) => {
                if (err) {
                    callback(err);
                    return;
                }
                
                // Set up connection timeout to close after inactivity
                resetConnectionTimeout();
                callback(null);
            });
            
            serialPort.on('error', (err) => {
                node.error('Serial port error: ' + err.message);
                node.status({ fill: 'red', shape: 'dot', text: 'Port error' });
                closeConnection();
            });
        }
        
        // Function to reset connection timeout
        function resetConnectionTimeout() {
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
            }
            connectionTimeout = setTimeout(() => {
                closeConnection();
            }, 10000); // Close after 10 seconds of inactivity
        }
        
        // Function to close connection
        function closeConnection() {
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
                connectionTimeout = null;
            }
            if (serialPort && serialPort.isOpen) {
                serialPort.close();
            }
            serialPort = null;
        }
        
        // Function to process command queue
        function processCommandQueue() {
            if (isProcessing || commandQueue.length === 0) {
                return;
            }
            
            isProcessing = true;
            const { command, msg, relayNum, action } = commandQueue.shift();
            
            serialPort.write(command, (err) => {
                if (err) {
                    node.error('Failed to write command: ' + err.message);
                    node.status({ fill: 'red', shape: 'dot', text: 'Write error' });
                } else {
                    node.status({ fill: 'green', shape: 'dot', text: `Relay ${relayNum} ${action}` });
                    
                    // Send output message
                    msg.payload = {
                        relay: relayNum,
                        action: action,
                        timestamp: new Date().toISOString()
                    };
                    node.send(msg);
                }
                
                // Reset connection timeout and process next command
                resetConnectionTimeout();
                isProcessing = false;
                
                // Process next command after short delay
                setTimeout(() => {
                    processCommandQueue();
                }, 50);
            });
        }
        
        node.on('input', function(msg) {
            try {
                // Get relay number from message or config
                const relayNum = msg.relay || node.relay;
                // Get action from message or config
                const action = msg.payload || node.action;
                
                // Validate relay number
                if (relayNum < 1 || relayNum > 4) {
                    node.error('Relay number must be between 1 and 4');
                    return;
                }
                
                // Validate action
                if (!['on', 'off', 'toggle'].includes(action)) {
                    node.error('Action must be "on", "off", or "toggle"');
                    return;
                }
                
                // Get port from message or config
                const portName = msg.port || node.port;
                if (!portName) {
                    node.error('No serial port specified');
                    return;
                }
                
                let command;
                if (action === 'toggle') {
                    // For toggle, we'll default to 'on' - you might want to track state
                    command = COMMANDS[relayNum].on;
                } else {
                    command = COMMANDS[relayNum][action];
                }
                
                // Ensure connection and queue command
                ensureConnection(portName, (err) => {
                    if (err) {
                        node.error('Failed to open port: ' + err.message);
                        node.status({ fill: 'red', shape: 'dot', text: 'Connection failed' });
                        return;
                    }
                    
                    // Add command to queue
                    commandQueue.push({ command, msg, relayNum, action });
                    processCommandQueue();
                });
                
            } catch (error) {
                node.error('Error: ' + error.message);
            }
        });
        
        node.on('close', function() {
            closeConnection();
            node.status({});
        });
    }
    
    // USB Relay Config Node
    function USBRelayConfigNode(config) {
        RED.nodes.createNode(this, config);
        this.port = config.port;
        this.name = config.name;
    }
    
    // HTTP endpoint to list available serial ports
    RED.httpAdmin.get('/usb-relay/ports', function(req, res) {
        SerialPort.list().then(ports => {
            res.json(ports.map(port => ({
                path: port.path,
                manufacturer: port.manufacturer || 'Unknown'
            })));
        }).catch(err => {
            res.status(500).json({ error: err.message });
        });
    });

    // Register the nodes
    RED.nodes.registerType('usb-relay', USBRelayNode);
    RED.nodes.registerType('usb-relay-config', USBRelayConfigNode);
}