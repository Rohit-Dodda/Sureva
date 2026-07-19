// expo-notifications' iOS config keeps adding the aps-environment
// entitlement even though it isn't listed in app.json's plugins array
// (some autolinking path applies it regardless) — that entitlement
// requires the Push Notifications capability, which a free/personal
// Apple Developer team's auto-generated provisioning profile can't
// support, and this app only ever uses LOCAL scheduled notifications,
// which don't need it at all. Listed last in plugins so it strips the
// key after anything else has had a chance to set it.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
};
