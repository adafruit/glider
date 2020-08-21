![Glider word logo](logo.png)

Glider is a portable mobile app aimed at making wireless editing of Python code really easy and fun.

## Installation
```
git clone --recursive https://github.com/adafruit/glider.git
```
If pyright fails to install, run:
```
cd glider
rm -rf pyright
git clone https://github.com/adafruit/pyright
```

In the glider folder, run:
```
npm install
```

### iOS
From the /ios folder, run:
```
pod install
```
Open XCode and run on your device, it should ask for bluetooth permissions once loaded. Additionaly, the bundle identifiers may need to be changed for the code signing to work.

### Android
1) Build the gradle project by opening `glider/android` folder in Android Studio. Gradle should automatically start building and notify you when project is built via logs or Build tab. 
2) If the `debug.keystore` file does not exist already in `glider/android/app`, then copy it from `glider/node_modules/react-native/template/android/app` or search for where this file exists in your glider folder and paste it to `glider/android/app`.
3) Connect your android device to your computer. **NOTE:** app must be run on physical device (not an Android Simulator) due to bluetooth limitations. 
4) In VS Code, run:
```
npx react-native run-android
```

### Adafruit board
Ensure your board is running a BLE-allowed version of Circuit Python to allow your board to connect to glider.

To revert back to version of Circuit Python with BLE enabled: 
```
git clone https://github.com/adafruit/circuitpython.git
cd circuitpython
git checkout aca53aa1a2c21ff46b609cfc270134ee6ee024f2
```

Then rebuild Circuit Python onto your board following [these directions](https://learn.adafruit.com/building-circuitpython/build-circuitpython#build-circuitpython-2986723-5), replacing the last step with BLE flag:
```
cd ports/{insert_board_type_folder}
make BOARD={insert_board_name} CIRCUITPY_BLE_FILE_SERVICE = 1
``` 

Then run your build following [these directions](https://learn.adafruit.com/building-circuitpython/build-circuitpython#run-your-build-2987858-9) and ensure `code.py` is actively running code to allow BLE detection. (Eg, [this](https://learn.adafruit.com/welcome-to-circuitpython/creating-and-editing-code#exploring-your-first-circuitpython-program-2977748-20) led sample code). 

*Optional:* To check whether BLE-allowed version of Circuit Python was installed correctly or not, download the [Adafruit Bluefruit LE Connect app](https://learn.adafruit.com/bluefruit-le-connect/ios-setup) and check that your board is detected. 

Upon refresh of glider app, your board should be automatically detected and connected. **NOTE:** may need to refresh glider more than once or may need to click reset button on board



## Usage
Glider can run using code from either your BLE enabled CircuitPython device, or from a local file.

To allow it to run on your CircuitPython device, you must first build CircuitPython using this commit (run git checkout followed by this hash): ```aca53aa1a2c21ff46b609cfc270134ee6ee024f2```
Use the instructions from [here](https://learn.adafruit.com/building-circuitpython) to build the code and upload it to your device.

To test code from your local machine, put your code in stubbed.py and change the false value to true from this line in index.js:
```
const readFromFile = false;
```

## :bookmark: License

This project is [MIT](LICENSE) licensed.
