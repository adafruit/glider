
import React, { useReducer, useState, useEffect } from 'react';
import 'react-native-gesture-handler';
import {Alert} from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { AppearanceProvider, useColorScheme} from 'react-native-appearance';
import DraggableView from './draggable-view';
import CodeEditor from './code-editor';
import Status, { StatusSummary} from './status';
import { useAppState } from 'react-native-hooks'
import { stringToBytes, bytesToString } from 'convert-string';
import {
    NativeEventEmitter,
    NativeModules,
    PermissionsAndroid,
    Platform,
    View,
    SafeAreaView
} from 'react-native';

import BleManager from 'react-native-ble-manager';
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);


function peripheralReducer(state, action) {
    if (action.action == "add") {
        let peripheral = action.peripheral;
        console.log(peripheral);
        if (state.has(peripheral.id)) {
            return state; // No state change
        }
        if (!peripheral.advertising.serviceUUIDs || peripheral.advertising.serviceUUIDs.length == 0 || peripheral.advertising.serviceUUIDs[0].toLowerCase() != 'adaf0100-4369-7263-7569-74507974686e') {
            return state;
        }
        console.log(peripheral);
        var newMap = new Map(state);
        newMap.set(peripheral.id, peripheral);
        return newMap;
    } else if (action.action == "scan") {
        BleManager.scan([], 3).then((results) => {
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

function codeReducer(state, action) {
  let newState = {code: state.code, peripheral_id: state.peripheral_id, queue: state.queue, version: state.version + 1};
  if (action.type == "clear") {
    newState.code = "";
  } else if (action.type == "connect") {
    newState.peripheral_id = action.peripheral_id;
    if (state.queue && state.queue.length > 0) {
      console.log("missed patches", state.queue);
    }
  } else if (action.type == "disconnect") {
    newState.peripheral_id = null;
    newState.queue = new Array();
  } else if (action.type == "read") {
      newState.code += action.data;
  } else if (action.type == "patch") {
    console.log("TODO send data back to CP");
    console.log(state, action);
    let encoder = new TextEncoder();
    let encodedInsert = encoder.encode(action.newValue);
    let totalLength = 2 + 2 + 4 + 4 + 4 + encodedInsert.length
    let patch = new ArrayBuffer(totalLength);
    let view = new DataView(patch);
    view.setUint16(0, totalLength, true);
    view.setUint16(2, 2, true);
    view.setUint32(4, action.offset, true);
    view.setUint32(8, action.oldValue.length, true);
    view.setUint32(12, encodedInsert.length, true);
    let byteView = new Uint8Array(patch, 16, encodedInsert.length);
    byteView.set(encodedInsert);

    // React native bridging can't handle Uint8Array so copy into a normal array.
    let finalPatch = Array.from(new Uint8Array(patch));
    if (state.peripheral_id) {
      console.log("writing patch", finalPatch, patch);
      BleManager.write(state.peripheral_id, service, contentsCharacteristic, finalPatch).then(() => {
        console.log('Wrote patch to device');
      });
    } else {
      console.log("no peripheral", newState.queue);
      newState.queue.push(patch);
    }

    console.log("merging together", action, state.code);
    newState.code = state.code.substring(0, action.offset) + action.newValue + state.code.substring(action.offset + action.oldValue.length, state.code.length);
  }

  console.log("new code state", newState);
  return newState;
}

export default function App() {
    const scheme = useColorScheme();
    const currentAppState = useAppState();
    const [bleState, setBleState] = useState("stopped");
    const [peripherals, changePeripherals] = useReducer(peripheralReducer, new Map());
    const [peripheral, setPeripheral] = useState(null);
    const [fileState, setFileState] = useState("unloaded");
    const [fileLength, setFileLength] = useState(-1);

    const [code, changeCode] = useReducer(codeReducer, {code:"", version:0, peripheral_id: null});

    useEffect(() => {
        if (currentAppState === 'active') {
          console.log('App has come to the foreground!', bleState);
          BleManager.start({showAlert: true});
          BleManager.checkState();
        } else {
            if (peripheral) {
              changeCode({"type": "disconnect", "peripheral_id": peripheral.id});
              BleManager.disconnect(peripheral.id);
            }

            setBleState("disconnected");
        }
    }, [currentAppState]);

    const handleUpdateValueForCharacteristic = (data) => {
        console.log(data);
        console.log('Received data from ' + data.peripheral + ' characteristic ' + data.characteristic, bytesToString(data.value));
        changeCode({"type": "read", "data": bytesToString(data.value)});
    }

    const handleUpdateState = (data) => {
      console.log("update state", data);
      if (data.state == "on") {
        console.log("started");
        setBleState("started");
      }
    }

    const handleStopScan = () => {
        console.log('Scan is stopped');
        setBleState('selectPeripheral');
    }

    const handleDiscoverPeripheral = (peripheral) => {
        console.log('Got ble peripheral', peripheral);
        peripheral.connected = false;
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
        setBleState("disconnected");
        
        Alert.alert(
          "Device Disconnected",
          "You have lost connection with your device",
          [
            {
              text: "Dismiss",
            }
          ],
          { cancelable: false }
        );
        console.log('Disconnected from ' + data.peripheral);
      }

    function handleConnectPeripheral() {
      console.log("handle connect to", peripheral);
      BleManager.connect(peripheral.id).then(() => {
        setBleState("connected");
        changeCode({"type": "connect", "peripheral_id": peripheral.id});
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
          let command = new Array(4);
          command.fill(0);
          command[0] = 4;
          command[2] = 1;
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
        } else if (bleState == "started") {
            changePeripherals({"action": "clear"});
            BleManager.getConnectedPeripherals([]).then((peripheralsArray) => {
              for (p of peripheralsArray) {
                console.log(p);
                p.connected = true;
                BleManager.connect(p.id).then(() => {
                BleManager.retrieveServices(p.id).then((peripheralInfo) => {
                  console.log(peripheralInfo);
                  p.advertising.serviceUUIDs = [peripheralInfo.services[2].uuid];
                  changePeripherals({"action": "add", "peripheral": p});
                });
              });
              }
              console.log('Connected peripherals: ' + peripheralsArray.length);
            });
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
        const handlerDiscover = bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral );
        const handlerStop = bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan );
        const handlerDisconnect = bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral );
        const handlerUpdate = bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic );
        const handlerUpdateState = bleManagerEmitter.addListener('BleManagerDidUpdateState', handleUpdateState);

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
            handlerDiscover.remove();
            handlerStop.remove();
            handlerDisconnect.remove();
            handlerUpdate.remove();
            handlerUpdateState.remove();
        };
    }, []);

    return (
      <AppearanceProvider><NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaView style={{flex:1, backgroundColor: scheme === 'light' ? 'white' : 'rgb(18,18,18)'}}>
      <DraggableView
        isInverseDirection={true}
        bgColor={scheme === 'light' ? 'white' : 'rgb(18,18,18)'}
        initialDrawerSize={17}
        renderContainerView={() => (
        <View>
            <StatusSummary bleState={bleState} />
            <CodeEditor 
              code={code.code} 
              changeCode={changeCode} 
              fileState={fileState} 
              fileName="/code.py" 
              fileVersion={code.version}
            /> 
        </View>)}
        renderDrawerView={() => (<Status bleState={bleState} peripherals={peripherals} setPeripheral={setPeripheral} />)}
        renderInitDrawerView={() => (<StatusSummary bleState={bleState}/>)}
        
      />
      </SafeAreaView>
      </NavigationContainer></AppearanceProvider>
    );

}
       

