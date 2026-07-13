const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// The What If simulator imports the depletion engine straight from the
// repo-level Algorithm/ package so the app and firmware share a single
// source of truth. Metro only watches the project root by default, so
// the Algorithm folder has to be added explicitly.
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '..', 'Algorithm')];

module.exports = config;
