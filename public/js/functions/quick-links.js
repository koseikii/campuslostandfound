// ===================================================================
// QUICK LINKS MODULE - FAQ, Privacy Policy, Terms, Support, Help
// ===================================================================

/**
 * Opens FAQ & Help modal with comprehensive help information
 */
function openFAQModal() {
    const modal = document.getElementById('faqModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Closes FAQ & Help modal
 */
function closeFAQModal() {
    const modal = document.getElementById('faqModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

/**
 * Opens Privacy Policy modal
 */
function openPrivacyPolicyModal() {
    const modal = document.getElementById('privacyPolicyModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Closes Privacy Policy modal
 */
function closePrivacyPolicyModal() {
    const modal = document.getElementById('privacyPolicyModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

/**
 * Opens Terms & Conditions modal
 */
function openTermsModal() {
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Closes Terms & Conditions modal
 */
function closeTermsModal() {
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

/**
 * Opens Support & Feedback modal
 */
function openSupportModal() {
    const modal = document.getElementById('supportModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Reset form if it exists
        const form = document.getElementById('supportForm');
        if (form) {
            form.reset();
        }
    }
}

/**
 * Closes Support & Feedback modal
 */
function closeSupportModal() {
    const modal = document.getElementById('supportModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

/**
 * Toggles FAQ accordion items
 */
function toggleFAQItem(index) {
    const item = document.getElementById(`faqItem-${index}`);
    const answer = document.getElementById(`faqAnswer-${index}`);
    const icon = document.getElementById(`faqIcon-${index}`);

    if (item && answer && icon) {
        item.classList.toggle('active');
        if (item.classList.contains('active')) {
            answer.style.maxHeight = answer.scrollHeight + 'px';
            icon.style.transform = 'rotate(180deg)';
        } else {
            answer.style.maxHeight = '0px';
            icon.style.transform = 'rotate(0deg)';
        }
    }
}

/**
 * Handles support & feedback form submission
 */
function handleSupportSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('supportName').value.trim();
    const email = document.getElementById('supportEmail').value.trim();
    const subject = document.getElementById('supportSubject').value.trim();
    const message = document.getElementById('supportMessage').value.trim();

    // Validation
    if (!name || !email || !subject || !message) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    if (!email.includes('@')) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    if (message.length < 10) {
        showToast('Message must be at least 10 characters long', 'error');
        return;
    }

    // Create feedback object
    const feedback = {
        id: Date.now(),
        name: name,
        email: email,
        subject: subject,
        message: message,
        timestamp: new Date().toISOString(),
        status: 'new',
        userRole: currentUser.role,
        resolved: false
    };

    // Get existing feedback or create new array
    let feedbackList = JSON.parse(localStorage.getItem('supportFeedback')) || [];
    feedbackList.push(feedback);

    // Save to localStorage
    localStorage.setItem('supportFeedback', JSON.stringify(feedbackList));

    // Send confirmation email
    sendEmailNotification(
        email,
        'Support Request Received',
        `Hi ${name},\n\nWe received your support request with subject: "${subject}"\n\nOur team will get back to you as soon as possible.\n\nThank you for using Campus Lost & Found System!\n\nBest regards,\nSupport Team`
    );

    // Send notification to admin
    if (currentUser && currentUser.role === 'admin') {
        addNotification(`New support feedback: ${subject}`, null);
    }

    // Show success message
    showToast('Thank you! Your feedback has been submitted. We will review it shortly.', 'success');

    // Close modal after 2 seconds
    setTimeout(() => {
        closeSupportModal();
    }, 2000);
}

/**
 * Loads and displays all feedback in admin view
 */
function loadSupportFeedback() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Only admins can view support feedback', 'error');
        return;
    }

    const feedbackList = JSON.parse(localStorage.getItem('supportFeedback')) || [];
    const feedbackContainer = document.getElementById('feedbackContainer');

    if (!feedbackContainer) return;

    if (feedbackList.length === 0) {
        feedbackContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No feedback received yet</p>';
        return;
    }

    let html = '';
    feedbackList.forEach((feedback, index) => {
        const date = new Date(feedback.timestamp).toLocaleDateString();
        const statusBadge = feedback.resolved
            ? '<span style="background: #4caf50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Resolved</span>'
            : '<span style="background: #ff9800; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Pending</span>';

        html += `
            <div style="background: var(--card-bg); padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid var(--primary);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <div>
                        <h4 style="margin: 0 0 4px 0; color: var(--text-primary);">${feedback.subject}</h4>
                        <p style="margin: 0; font-size: 12px; color: var(--text-secondary);">
                            From: <strong>${feedback.name}</strong> (${feedback.email})
                        </p>
                    </div>
                    ${statusBadge}
                </div>
                <p style="margin: 8px 0; color: var(--text-secondary); font-size: 13px;">${feedback.message}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-muted); margin-top: 8px;">
                    <span>${date} - ${feedback.userRole}</span>
                    <div>
                        <button onclick="markFeedbackAsResolved(${feedback.id})" style="background: var(--primary); color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; margin-right: 4px; font-size: 12px;">
                            Mark Resolved
                        </button>
                        <button onclick="deleteFeedback(${feedback.id})" style="background: #f44336; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    feedbackContainer.innerHTML = html;
}

/**
 * Marks feedback as resolved
 */
function markFeedbackAsResolved(feedbackId) {
    let feedbackList = JSON.parse(localStorage.getItem('supportFeedback')) || [];
    const feedback = feedbackList.find(f => f.id === feedbackId);

    if (feedback) {
        feedback.resolved = true;
        localStorage.setItem('supportFeedback', JSON.stringify(feedbackList));
        showToast('Feedback marked as resolved', 'success');
        loadSupportFeedback(); // Refresh display
    }
}

/**
 * Deletes feedback
 */
function deleteFeedback(feedbackId) {
    if (confirm('Are you sure you want to delete this feedback?')) {
        let feedbackList = JSON.parse(localStorage.getItem('supportFeedback')) || [];
        feedbackList = feedbackList.filter(f => f.id !== feedbackId);
        localStorage.setItem('supportFeedback', JSON.stringify(feedbackList));
        showToast('Feedback deleted', 'success');
        loadSupportFeedback(); // Refresh display
    }
}

/**
 * Searches FAQ items
 */
function searchFAQ() {
    const searchTerm = document.getElementById('faqSearch').value.toLowerCase();
    const faqItems = document.querySelectorAll('[id^="faqItem-"]');

    faqItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

/**
 * Scrolls to specific FAQ category
 */
function scrollToFAQCategory(category) {
    const element = document.getElementById(`faq-${category}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Closes modals when clicking outside of them
 */
function setupQuickLinksEventListeners() {
    // Close FAQ modal when clicking outside
    const faqModal = document.getElementById('faqModal');
    if (faqModal) {
        faqModal.addEventListener('click', function (e) {
            if (e.target === this) {
                closeFAQModal();
            }
        });
    }

    // Close Privacy Policy modal when clicking outside
    const privacyModal = document.getElementById('privacyPolicyModal');
    if (privacyModal) {
        privacyModal.addEventListener('click', function (e) {
            if (e.target === this) {
                closePrivacyPolicyModal();
            }
        });
    }

    // Close Terms modal when clicking outside
    const termsModal = document.getElementById('termsModal');
    if (termsModal) {
        termsModal.addEventListener('click', function (e) {
            if (e.target === this) {
                closeTermsModal();
            }
        });
    }

    // Close Support modal when clicking outside
    const supportModal = document.getElementById('supportModal');
    if (supportModal) {
        supportModal.addEventListener('click', function (e) {
            if (e.target === this) {
                closeSupportModal();
            }
        });
    }

    // Support form submission
    const supportForm = document.getElementById('supportForm');
    if (supportForm) {
        supportForm.addEventListener('submit', handleSupportSubmit);
    }

    // FAQ search
    const faqSearch = document.getElementById('faqSearch');
    if (faqSearch) {
        faqSearch.addEventListener('input', searchFAQ);
    }
}

// Initialize quick links event listeners when page loads
document.addEventListener('DOMContentLoaded', setupQuickLinksEventListeners);
