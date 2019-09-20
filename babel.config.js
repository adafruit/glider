const rnb_preset = require('metro-react-native-babel-preset');
module.exports = (babel) => {
  babel.cache.forever();
  preset = rnb_preset.getPreset(null);
  // Patch the preset to allow namespaces.
  let typescript_plugins = preset.overrides[2].plugins;
  typescript_plugins[0][1].allowNamespaces = true;
  // Prepend the const-enum plugin to strip them before the transform.
  typescript_plugins.unshift(["const-enum", {}]);
  return preset;
};
