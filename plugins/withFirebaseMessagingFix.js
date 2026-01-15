// plugins/withFirebaseMessagingFix.js
// Expo config plugin to fix AndroidManifest merge conflict
// between expo-notifications and react-native-firebase-messaging

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withFirebaseMessagingFix = (config) => {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const manifestPath = path.join(
                config.modRequest.projectRoot,
                'android',
                'app',
                'src',
                'main',
                'AndroidManifest.xml'
            );

            if (fs.existsSync(manifestPath)) {
                let manifest = fs.readFileSync(manifestPath, 'utf-8');

                // Find the notification_color meta-data and add tools:replace
                // Pattern to match: <meta-data android:name="com.google.firebase.messaging.default_notification_color" android:resource="@color/notification_icon_color" />
                const pattern = /<meta-data\s+android:name="com\.google\.firebase\.messaging\.default_notification_color"\s+android:resource="@color\/notification_icon_color"\s*\/>/;

                const replacement = '<meta-data android:name="com.google.firebase.messaging.default_notification_color" android:resource="@color/notification_icon_color" tools:replace="android:resource" />';

                if (pattern.test(manifest)) {
                    manifest = manifest.replace(pattern, replacement);
                    fs.writeFileSync(manifestPath, manifest, 'utf-8');
                    console.log('[Firebase Fix] Added tools:replace to notification color meta-data');
                } else {
                    console.log('[Firebase Fix] Could not find notification color meta-data pattern');
                }
            } else {
                console.log('[Firebase Fix] AndroidManifest.xml not found at:', manifestPath);
            }

            return config;
        },
    ]);
};

module.exports = withFirebaseMessagingFix;
