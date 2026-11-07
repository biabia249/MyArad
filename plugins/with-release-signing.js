const { withAppBuildGradle } = require('expo/config-plugins');
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, config => {
    const marker = '// MyArad private release signing';
    if (config.modResults.contents.includes(marker)) return config;
    config.modResults.contents += `
${marker}
if (System.getenv('MYARAD_RELEASE_STORE_FILE')) {
    android.signingConfigs.create('myaradRelease') {
        storeFile file(System.getenv('MYARAD_RELEASE_STORE_FILE'))
        storePassword System.getenv('MYARAD_RELEASE_STORE_PASSWORD')
        keyAlias System.getenv('MYARAD_RELEASE_KEY_ALIAS')
        keyPassword System.getenv('MYARAD_RELEASE_KEY_PASSWORD')
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.myaradRelease
}
`;
    return config;
  });
};
