// ========== EMAIL NOTIFICATIONS ==========

function sendEmailNotification(email, subject, message) {
    const user = users.find(u => u.email === email);
    if (user && user.emailNotifications) {
        // Log email attempt
        const emailLog = {
            to: email,
            subject: subject,
            message: message,
            timestamp: Date.now(),
            status: 'sent'
        };
        const emailLogs = JSON.parse(localStorage.getItem('emailLogs')) || [];
        emailLogs.push(emailLog);
        localStorage.setItem('emailLogs', JSON.stringify(emailLogs));

        // Try to send via EmailJS if configured
        sendViaEmailJS(email, subject, message);
    }
}

function sendViaEmailJS(email, subject, message) {
    try {
        // Initialize EmailJS (replace with your public key)
        if (typeof emailjs !== 'undefined') {
            emailjs.init('YOUR_EMAILJS_PUBLIC_KEY');

            const templateParams = {
                to_email: email,
                subject: subject,
                message: message,
                from_name: 'Campus Lost & Found System'
            };

            emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams)
                .then(function (response) {
                    console.log('Email sent:', response);
                }, function (error) {
                    console.log('Email sending failed:', error);
                });
        }
    } catch (error) {
        console.log('EmailJS not configured:', error);
    }
}
