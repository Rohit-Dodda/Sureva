module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // three.js (used by the onboarding 3D device viewer) ships static
    // class blocks in its build output — babel-preset-expo's default
    // target doesn't transform that syntax on its own, so Metro fails to
    // bundle it without this plugin explicitly enabled.
    plugins: ['@babel/plugin-transform-class-static-block'],
  };
};
