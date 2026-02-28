const fs = require('fs');
const path = require('path');

console.log('--- Push Notification Config Verification ---');

// 1. Check app.json
try {
    const appJsonPath = path.join(process.cwd(), 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const expo = appJson.expo;

    console.log('✅ app.json found');

    const pkgName = expo.android.package;
    console.log(`- Package Name: ${pkgName}`);

    const googleServicesFile = expo.android.googleServicesFile;
    console.log(`- googleServicesFile path: ${googleServicesFile}`);

    const projectId = expo.extra?.eas?.projectId;
    console.log(`- EAS Project ID: ${projectId || 'MISSING'}`);

    if (!googleServicesFile) {
        console.error('❌ ERROR: googleServicesFile is not defined in app.json under expo.android');
    }
    if (!pkgName) {
        console.error('❌ ERROR: package name is not defined in app.json under expo.android');
    }
    if (!projectId) {
        console.warn('⚠️ WARNING: eas.projectId is missing. Token retrieval might fail.');
    }

    // 2. Check google-services.json
    if (googleServicesFile) {
        const gsPath = path.resolve(process.cwd(), googleServicesFile);
        if (fs.existsSync(gsPath)) {
            console.log('✅ google-services.json exists');
            const gsContent = JSON.parse(fs.readFileSync(gsPath, 'utf8'));
            const client = gsContent.client[0];
            const gsPkgName = client.client_info.android_client_info.package_name;

            console.log(`- Package Name in google-services.json: ${gsPkgName}`);

            if (pkgName && gsPkgName && pkgName !== gsPkgName) {
                console.error(`❌ ERROR: Package name mismatch! app.json (${pkgName}) vs google-services.json (${gsPkgName})`);
            } else {
                console.log('✅ Package names match');
            }
        } else {
            console.error(`❌ ERROR: google-services.json not found at ${gsPath}`);
        }
    }

} catch (e) {
    console.error('❌ Error reading config files:', e.message);
}

console.log('\n--- Build Status Conclusion ---');
console.log('If you see "Default FirebaseApp is not initialized" in your app, but this script says "✅ Package names match", it is 100% a native build issue.');
console.log('Since you just added googleServicesFile to app.json, your current app on the phone DOES NOT HAVE the Firebase SDK initialized yet.');
console.log('Running "npx expo run:android" is the required fix.');
