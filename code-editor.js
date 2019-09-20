
import React from 'react';
import {ActivityIndicator, Platform, TextInput, KeyboardAvoidingView} from 'react-native';

export default function CodeEditor(props) {
    let editor;
    if (props.fileState == "loading") {
        editor = (<ActivityIndicator size="large" color="#00ff00" />);
    } else if (props.fileState == "loaded") {
        editor = (<TextInput value={props.code}
                                editable={true}
                                multiline={true}
                                onChangeText={ (newText) => props.changeCode({"type": "replaceAll", "data": newText })}
                />);
    }
    return (<KeyboardAvoidingView behavior="padding" enabled>
                {editor}
            </KeyboardAvoidingView>);
}