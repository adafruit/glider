/**
 * @format
 */
import {AppRegistry} from 'react-native';
import App from './App';
import StubbedApp from './StubbedApp'
import {name as appName} from './app.json';

const readFromFile = true;
if (readFromFile){
  AppRegistry.registerComponent(appName, () => StubbedApp);
} else {
  AppRegistry.registerComponent(appName, () => App);
}
