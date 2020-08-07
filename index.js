/**
 * @format
 */
import {AppRegistry} from 'react-native';
import App from './App';
import StubbedApp from './StubbedApp'
import {name as appName} from './app.json';

const readFromFile = false;
if (readFromFile){
  AppRegistry.registerComponent(appName, () => StubbedApp);
} else {
  AppRegistry.registerComponent(appName, () => App);
}
