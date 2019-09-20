import React from 'react';
import {
    StyleSheet, Text, View} from 'react-native';

export default function Status(props) {

    return (<View style={styles.drawer}>
        <Text>Status</Text>
    </View>);
}

export function StatusSummary(props) {
    return (<View>
        <Text 
                                style={styles.red}>{props.bleState}</Text>
    </View>);
}

var styles = StyleSheet.create({
    viewport: {
        flex: 1
    },
    drawer: {
        flex: 1
    },
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        right: 0
    },
    red: {
      color: 'red',
    },
});