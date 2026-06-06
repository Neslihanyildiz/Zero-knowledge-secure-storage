const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { validatePassword } = require('../utils/passwordValidator');

// PUT /api/users/change-password  (authenticated)
// The client has already re-wrapped the private key with the new password before
// calling this endpoint. We verify the current password server-side, then persist
// the new hash + new wrapped key in one atomic Supabase update.
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, newEncryptedKey, newSalt } = req.body;

        if (!currentPassword || !newPassword || !newEncryptedKey || !newSalt) {
            return res.status(400).json({ error: 'Tüm alanlar zorunludur.' });
        }

        // 1. Fetch current password hash
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('password_hash')
            .eq('id', req.user.id)
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }

        // 2. Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Mevcut şifre hatalı.' });
        }

        // 3. Validate new password strength
        const errors = validatePassword(newPassword);
        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Yeni şifre güvenlik gereksinimlerini karşılamıyor.',
                requirements: errors,
            });
        }

        // 4. Hash the new password
        const newHash = await bcrypt.hash(newPassword, 12);

        // 5. Single atomic update: new hash + new wrapped key + new salt
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash:         newHash,
                encrypted_private_key: newEncryptedKey,
                key_salt:              newSalt,
            })
            .eq('id', req.user.id);

        if (updateError) throw updateError;

        // 6. Audit log
        await supabase.from('activity_logs').insert({
            user_id:    req.user.id,
            action:     'PASSWORD_CHANGE',
            details:    `${req.user.username} şifresini değiştirdi.`,
            ip_address: req.ip,
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Şifre değiştirme sırasında hata oluştu.', details: error.message });
    }
};
