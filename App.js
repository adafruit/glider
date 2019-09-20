
import React, { useReducer, useState, useEffect } from 'react';

import DraggableView from './draggable-view';
import CodeEditor from './code-editor';
import Status, { StatusSummary} from './status';
import { useAppState } from 'react-native-hooks'

import { stringToBytes, bytesToString } from 'convert-string';
import {
    NativeEventEmitter,
    NativeModules,
    View
} from 'react-native';

import BleManager from 'react-native-ble-manager';
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

function peripheralReducer(state, action) {
    if (action.action == "add") {
        let peripheral = action.peripheral;
        //console.log(peripheral);
        if (state.has(peripheral.id)) {
            return state; // No state change
        }
        if (!peripheral.advertising.serviceUUIDs || peripheral.advertising.serviceUUIDs[0].toLowerCase() != 'adaf0100-4369-7263-7569-74507974686e') {
            return state;
        }
        console.log(peripheral);
        var newMap = new Map(state);
        newMap.set(peripheral.id, peripheral);
        return newMap;
    } else if (action.action == "scan") {
        BleManager.scan([], 3, true).then((results) => {
            console.log('Scanning...');
        });
    } else if (action.action == "clear") {
        state.clear();
    }
    return state;
}

const service = 'adaf0100-4369-7263-7569-74507974686e';
const contentsCharacteristic = 'adaf0201-4369-7263-7569-74507974686e';
const filenameCharacteristic = 'adaf0200-4369-7263-7569-74507974686e';
const versionCharacteristic = 'adaf0203-4369-7263-7569-74507974686e';
const lengthCharacteristic = 'adaf0202-4369-7263-7569-74507974686e';

export default function App() {
    const currentAppState = useAppState();
    const [bleState, setBleState] = useState("stopped");
    const [peripherals, changePeripherals] = useReducer(peripheralReducer, new Map());
    const [peripheral, setPeripheral] = useState(null);
    const [fileState, setFileState] = useState("unloaded");
    const [fileLength, setFileLength] = useState(-1);

    function saveCodeToDevice(code) {
      console.log("save", code);
    }

    function triggerSaveCodeToDevice(code) {
      console.log("save", code);
    }

    function codeReducer(state, action) {
      if (state.timer > -1) {
        clearTimeout(state.timer);
      }
      let newState = {timer:-1, code:state.code};
      if (action.type == "clear") {
        newState.code = "";
      } if (action.type == "read") {
          newState.code += action.data;
      } else if (action.type == "replaceAll") {
          console.log("TODO send data back to CP");
          newState.code = action.data;
          newState.timer = setTimeout(triggerSaveCodeToDevice, 500, newState.code);
      }
      return newState;
    }
    const [code, changeCode] = useReducer(codeReducer, {timer:-1, code:""});

    useEffect(() => {
        if (currentAppState === 'active') {
            console.log('App has come to the foreground!')
        } else {
            BleManager.disconnect(peripheral.id);
            setBleState("disconnected");
        }
    }, [currentAppState]);

    const handleUpdateValueForCharacteristic = (data) => {
        console.log(data);
        console.log('Received data from ' + data.peripheral + ' characteristic ' + data.characteristic, bytesToString(data.value));
        changeCode({"type": "read", "data": bytesToString(data.value)});
    }

    const handleStopScan = () => {
        console.log('Scan is stopped');
        setBleState('selectPeripheral');
    }

    const handleDiscoverPeripheral = (peripheral) => {
        //console.log('Got ble peripheral', peripheral);
        changePeripherals({"action": "add", "peripheral": peripheral});
    }

    const handleDisconnectedPeripheral = (data) => {
        // let peripherals = this.state.peripherals;
        // let peripheral = peripherals.get(data.peripheral);
        // if (peripheral) {
        //   peripheral.connected = false;
        //   peripherals.set(peripheral.id, peripheral);
        //   this.setState({peripherals});
        // }
        console.log('Disconnected from ' + data.peripheral);
      }

    function handleConnectPeripheral() {
      console.log("handle connect to", peripheral);
      BleManager.connect(peripheral.id).then(() => {
        setBleState("connected");
        setTimeout(() => {

          BleManager.retrieveServices(peripheral.id).then((peripheralInfo) => {
            console.log(peripheralInfo);

            setTimeout(() => {
              BleManager.startNotification(peripheral.id, service, contentsCharacteristic).then(() => {
                console.log('Started notification on ' + peripheral.id);
                setTimeout(() => {
                  BleManager.write(peripheral.id, service, filenameCharacteristic, stringToBytes("/code.py")).then(() => {
                    console.log('Wrote filename');
                    setFileState("nameSet");
                  });

                }, 500);
              }).catch((error) => {
                console.log('Notification error', error);
              });
            }, 200);
          });

        }, 900);
      }).catch((error) => {
        setBleState("disconnected");
        console.log('Connection error', error);
      });
    }
  
    useEffect(() => {
        if (fileState == "nameSet") {
          // Load the file length and then load it all.
          setTimeout(() => {
            BleManager.read(peripheral.id, service, lengthCharacteristic).then((readData) => {
              let length = readData[0] + (readData[1] << 8) + (readData[2] << 16) + (readData[3] << 24);
              console.log('fileLength', readData, length);
              changeCode({"type": "clear"});
              setFileLength(length);
              setFileState("loading");
            });

          }, 500);
        } else if (fileState == "loading") {
          let command = new Array(1);
          command[0] = 1;
          setTimeout(() => {
            BleManager.write(peripheral.id, service, contentsCharacteristic, command)
                      .catch((error) => {
                        console.log('Command error', error);
                      });
          }, 200);
        }
    }, [fileState]);

    useEffect(() => {
      console.log("loaded", code.code.length, fileLength);
      if (fileState == "loading" && code.code.length == fileLength) {
        setFileState("loaded");
      }
    }, [code, fileState, fileLength]);

    useEffect(() => {
        if (peripheral != null && bleState != "connected") {
            handleConnectPeripheral();
        }
    }, [peripheral, bleState]);

    useEffect(() => {
        console.log("new blestate", bleState);
        if (bleState == "permOk") {
            BleManager.getConnectedPeripherals([]).then((peripheralsArray) => {
              console.log('Connected peripherals: ' + peripheralsArray.length);
            });
            changePeripherals({"action": "clear"});
            changePeripherals({"action": "scan"});
        } else if (bleState == "disconnected") {
            // set a timeout and try to reconnect
        } else if (bleState == "selectPeripheral") {
            console.log(peripherals, peripherals.values());
            if (peripherals.size == 1) {
                let peripheral = [...peripherals][0][1];
                console.log("selecting", peripheral);
                setPeripheral(peripheral);
            }
          }
      }, [bleState]);

    useEffect(() => {
        BleManager.start({showAlert: false});
        setBleState("started");

        this.handlerDiscover = bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral );
        this.handlerStop = bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan );
        this.handlerDisconnect = bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral );
        this.handlerUpdate = bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic );

        if (Platform.OS === 'android' && Platform.Version >= 23) {
            setBleState("permCheck");
            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
                if (result) {
                  setBleState("permOk");
                } else {
                  PermissionsAndroid.requestPermission(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
                    if (result) {
                      setBleState("permOk");
                    } else {
                      setBleState("permNak");
                    }
                  });
                }
          });
        } else {
            setBleState("permOk");
        }

        return () => {
            this.handlerDiscover.remove();
            this.handlerStop.remove();
            this.handlerDisconnect.remove();
            this.handlerUpdate.remove();
        };
    }, []);

    // return (<CodeEditor code={code} changeCode={changeCode} />);
    return (<DraggableView 
        isInverseDirection={true}
        bgColor="red"
        initialDrawerSize={17}
        renderContainerView={() => (<View><StatusSummary bleState={bleState} /><CodeEditor code={code.code} changeCode={changeCode} fileState={fileState}/></View>)}
        renderDrawerView={() => (<Status bleState={bleState} peripherals={peripherals} setPeripheral={setPeripheral} />)}
        renderInitDrawerView={() => (<StatusSummary bleState={bleState} />)}
      />);
}