
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
import loadLocalResource from 'react-native-local-resource'
import stubbedCode from './stubbed.py'
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);


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

function stubber () {
  loadLocalResource(stubbedCode).then((stubbedCodeContent) => {
          console.log("stubbed was loaded: " + stubbedCodeContent)
          return stubbedCodeContent
      }
  )
}
export default function App() {
    const scheme = useColorScheme();
    const [code, changeCode] = useReducer(codeReducer, {code:"", version:0, peripheral_id: null});

    return (
      <AppearanceProvider><NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaView style={{flex:1, backgroundColor: scheme === 'light' ? 'white' : 'rgb(18,18,18)'}}>
      <DraggableView
        isInverseDirection={true}
        bgColor={scheme === 'light' ? 'white' : 'rgb(18,18,18)'}
        initialDrawerSize={17}
        renderContainerView={() => (
        <View>
            <StatusSummary bleState={"stubbed"} />
            <CodeEditor
              code={await stubber()}
              changeCode={changeCode}
              fileState="loaded"
              fileName="/code.py"
              fileVersion={"1"}
            />
        </View>)}
        renderDrawerView={() => (<Status bleState={"stubbed"} />)}
        renderInitDrawerView={() => (<StatusSummary bleState={"stubbed"}/>)}
      />
      </SafeAreaView>
      </NavigationContainer></AppearanceProvider>
    );



}
