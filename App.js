import React, { useReducer, useState, useEffect } from 'react';
import 'react-native-gesture-handler';
import {Alert, TextInput, Text} from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { AppearanceProvider, useColorScheme} from 'react-native-appearance';
import DraggableView from './draggable-view';
import CodeEditor from './code-editor';
import Status, { StatusSummary} from './status';
import { useAppState } from 'react-native-hooks'
import { stringToBytes, bytesToString } from 'convert-string';
import * as encoding from 'text-encoding';
import {
    NativeEventEmitter,
    NativeModules,
    PermissionsAndroid,
    Platform,
    View,
    SafeAreaView
} from 'react-native';

import loadLocalResource from 'react-native-local-resource'
import stubbedCode from './stubbed.py'
import BleManager from 'react-native-ble-manager';
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);


export default function App() {
    const scheme = useColorScheme();
    var dark = false;
    if (scheme == 'dark'){
      dark = true;
    }
    const currentAppState = useAppState();
    const [isLoading, setIsLoading] = useState("loading");
    const [code, setCode] = useState("hi");


    loadLocalResource(stubbedCode).then((stubbedCodeContent) => {
            console.log("stubbed was loaded: " + stubbedCodeContent)
            setCode(stubbedCodeContent)
            console.log("waddup")
            console.log(code)
            setIsLoading("loaded")
            console.log("waddup2")
            console.log(isLoading)

        }
    )

    function changeCode(props) {
        // You can use Hooks here!
      console.log("yip")
      console.log(props)

    }
    return (
      <AppearanceProvider><NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaView style={{flex:1, backgroundColor: scheme === 'light' ? 'white' : 'rgb(18,18,18)'}}>
      <DraggableView
        isInverseDirection={true}
        bgColor={scheme === 'light' ? 'white' : 'rgb(18,18,18)'}
        initialDrawerSize={17}
        renderContainerView={() => (
        <View>
            <StatusSummary bleState={"nope"} />
            <Text></Text>
            <TextInput

              style={{
                color: dark ? 'white' : 'rgb(18,18,18)',
                paddingLeft: 15,
                paddingRight: 15,
                paddingTop: 10,
                paddingBottom: 10,
                borderWidth: 1,
                borderRadius: 30,
                borderColor: dark ? 'white' : 'rgb(18,18,18)'}}

              onChangeText={search => setSearch(search)}
              underlineColorAndroid="black"
              placeholder="Search through the code ..."
              placeholderTextColor={scheme === 'dark' ? 'white' : 'rgb(18,18,18)'}
              keyboardType="default"
              clearButtonMode="while-editing"
            />
            <Text></Text>
            <CodeEditor
              searchBar={""}
              code={code}
              changeCode={changeCode}
              fileState={isLoading}
              fileName="/code.py"
              fileVersion={1.0}
            />
        </View>)}


      />
      </SafeAreaView>
      </NavigationContainer></AppearanceProvider>
    );

}
