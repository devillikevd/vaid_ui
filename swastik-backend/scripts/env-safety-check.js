require('dotenv').config();

function verifySafeEnvironment() {
    console.log('Verifying environment safety...');
    
    // Explicitly block production environments
    if (process.env.NODE_ENV === 'production') {
        console.error('\x1b[31m[FATAL] REFUSING TO EXECUTE AGAINST PRODUCTION DATABASE.\x1b[0m');
        console.error('Environment NODE_ENV is set to "production".');
        process.exit(1);
    }

    // Explicitly block the known production Supabase project
    const prodProjectIds = [
        'fzbdticlmxbxeektckst.supabase.co'
    ];
    
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const isProdDb = prodProjectIds.some(prodId => supabaseUrl.includes(prodId));

    if (isProdDb) {
        console.error('\x1b[31m[FATAL] REFUSING TO EXECUTE AGAINST PRODUCTION DATABASE.\x1b[0m');
        console.error(`SUPABASE_URL matches known production project: ${supabaseUrl}`);
        process.exit(1);
    }

    if (!supabaseUrl) {
        console.error('\x1b[31m[ERROR] SUPABASE_URL is not set.\x1b[0m');
        process.exit(1);
    }

    console.log('\x1b[32mEnvironment check passed. Safe to proceed.\x1b[0m');
    return true;
}

module.exports = { verifySafeEnvironment };
