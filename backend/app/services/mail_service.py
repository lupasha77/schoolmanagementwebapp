from flask_mail import Message
from flask import current_app
import threading
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.WARNING)  # Suppress INFO logs
class EmailService:
    def __init__(self, mail, frontend_url):
        self.mail = mail
        self.frontend_url = frontend_url

    def send_verification_email(self, email, firstName, verification_token, password=None):
        verification_url = f"{self.frontend_url}/verify-email/{verification_token}"
        
        # Include password information if provided (for testing purposes)
        password_info = ""
        if password:
            password_info = f'''
            <div style="background-color: #f8f9fa; padding: 10px; margin: 15px 0; border-radius: 5px;">
                <p><strong>For testing purposes only:</strong></p>
                <p>Your temporary password is: <code>{password}</code></p>
                <p><em>You will be required to change this password after your first login.</em></p>
            </div>
            '''
        
        msg = Message(
            'Verify Your Email',
            recipients=[email],
            html=f'''
            <h2>Welcome {firstName}!</h2>
            <p>Please verify your email by clicking the link below:</p>
            <p><a href="{verification_url}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
            {password_info}
            <p>If you did not create this account, please ignore this email.</p>
            <p><small>This is an automated message. Please do not reply to this email.</small></p>
            '''
        )
        
        # Get the current app context and create a thread
        app = current_app._get_current_object()
        thread = threading.Thread(target=self._send_email, args=(app, msg))
        thread.daemon = True  # Set thread as daemon so it doesn't block app shutdown
        thread.start()
        
        logger.info(f"Verification email queued for: {email}")
        return True  # Indicate successful queuing

    @staticmethod
    def _send_email(app, msg):
        """Send email inside Flask's application context."""
        with app.app_context():
            try:
                app.mail.send(msg)  # Use app.mail directly
                logger.info(f"Email sent successfully to: {msg.recipients}")
            except Exception as e:
                logger.error(f"Failed to send email to {msg.recipients}: {e}", exc_info=True)
                return False
            return True