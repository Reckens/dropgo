// Script para generar hash de contraseña con bcrypt
const bcrypt = require('bcryptjs');

const password = 'admin123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log('\n=== HASH GENERADO ===');
    console.log('Contraseña:', password);
    console.log('Hash:', hash);
    console.log('\n=== SQL PARA ACTUALIZAR ===');
    console.log(`UPDATE admins SET password_hash = '${hash}' WHERE username = 'admin';`);
    console.log('\n');
});
