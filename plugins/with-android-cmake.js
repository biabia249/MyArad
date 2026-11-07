const { withProjectBuildGradle } = require('expo/config-plugins');

const marker = '// MyArad Windows native build tools';
module.exports = function withAndroidCmake(config) {
  // This override solves Windows path/toolchain issues. EAS and Linux builds
  // must use the CMake version supplied by their Expo/Android build image.
  if (process.platform !== 'win32') return config;
  return withProjectBuildGradle(config, (config) => {
    const block = `
${marker}
subprojects { nativeProject ->
  ['com.android.library', 'com.android.application'].each { pluginId ->
    nativeProject.plugins.withId(pluginId) {
      def androidExtension = nativeProject.extensions.getByName('android')
      androidExtension.externalNativeBuild.cmake.version = '3.31.1'
      androidExtension.defaultConfig.externalNativeBuild.cmake.arguments.add('-DCMAKE_OBJECT_PATH_MAX=180')
    }
  }
}
// End MyArad Windows native build tools
`;
    // React Native's root plugin evaluates Android subprojects immediately.
    // Register callbacks before applying it, while each Android DSL is mutable.
    const contents = config.modResults.contents.replace(
      /(?:\r?\n)+\/\/ MyArad Windows native build tools\r?\n[\s\S]*?(?:\/\/ End MyArad Windows native build tools(?:\r?\n)*|$(?![\s\S]))/,
      '\n'
    );
    const anchor = /^apply plugin: ["']expo-root-project["']/m;
    if (!anchor.test(contents)) throw new Error('Cannot find the Expo root plugin in android/build.gradle');
    config.modResults.contents = contents.replace(anchor, (match) => `${block}\n${match}`);
    return config;
  });
};
