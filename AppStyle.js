import { StyleSheet } from 'react-native';
import { useColorScheme} from 'react-native-appearance';

export default StyleSheet.create({
    container: {
        flex: 1, 
        backgroundColor: scheme === 'dark' ? 'rgb(18,18,18)' : 'white'
    },
    title: {
      marginTop: 16,
      paddingVertical: 8,
      borderWidth: 4,
      borderColor: "#20232a",
      borderRadius: 6,
      backgroundColor: "#61dafb",
      color: "#20232a",
      textAlign: "center",
      fontSize: 30,
      fontWeight: "bold"
    },
    searchBar: {
      color: dark ? 'white' : 'rgb(18,18,18)',
      paddingLeft: 15,
      paddingRight: 15,
      paddingTop: 3,
      paddingBottom: 2,
      borderWidth: 1,
      borderRadius: 30,
      borderColor: dark ? 'white' : 'rgb(18,18,18)'
    },
    colorBar: {
      flexDirection: 'row',
      paddingTop: 2,
      paddingBottom: 3,
    },
    colorPicker: {
      backgroundColor: pickedColor,
      paddingLeft: 10,
      paddingRight: 5,
      paddingTop: 2,
      paddingBottom: 2,
      borderWidth: 1,
      borderRadius: 5,
      width: 140,
      height: 30,
    },
    copyButton: {
      backgroundColor: pickedColor,
      paddingLeft: 10,
      paddingRight: 5,
      paddingTop: 2,
      paddingBottom: 2,
      borderWidth: 1,
      borderRadius: 5,
      width: 140,
      height: 30,
    }
});