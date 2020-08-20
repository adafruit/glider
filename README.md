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
TODO

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
